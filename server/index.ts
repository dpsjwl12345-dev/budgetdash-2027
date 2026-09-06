import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as XLSX from "xlsx";
import { saveToKV, loadFromKV } from "../shared/kv";
import { initializeDB, getDB } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // 데이터베이스 초기화
  try {
    await initializeDB();
  } catch (error) {
    console.error('Database initialization failed:', error);
  }

  // CORS 활성화
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // JSON 파싱 미들웨어
  app.use(express.json({ limit: '10mb' }));

  // 파일 업로드 설정
  const upload = multer({ storage: multer.memoryStorage() });

  // API 엔드포인트
  app.post('/api/budget/save', async (req, res) => {
    try {
      const { data } = req.body;
      const success = await saveToKV('budgetRows', data);

      res.json({
        success,
        message: success ? '저장 완료' : '저장 실패 (로컬만 사용)'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/budget/load', async (_req, res) => {
    try {
      const data = await loadFromKV('budgetRows');
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 부서별 예산설명자료 (PDF 텍스트 + 세부사업 목록) 저장/로드
  app.post('/api/budget-explainer/save', async (req, res) => {
    try {
      const { department, text, fileName, sections } = req.body;
      if (!department) {
        res.status(400).json({ success: false, error: '부서를 선택해주세요' });
        return;
      }
      const success = await saveToKV(`explainer:${department}`, {
        text,
        fileName,
        sections,
        uploadedAt: new Date().toISOString(),
      });
      res.json({ success, message: success ? '저장 완료' : '저장 실패 (로컬만 사용)' });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/budget-explainer/load', async (req, res) => {
    try {
      const department = String(req.query.department || '');
      if (!department) {
        res.status(400).json({ error: '부서를 선택해주세요' });
        return;
      }
      const data = await loadFromKV(`explainer:${department}`);
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 2026 예산집행 데이터 로드
  app.get('/api/budget-execution-2026/load', (_req, res) => {
    try {
      const db = getDB();
      db.all('SELECT * FROM budget_execution_2026 ORDER BY department', (err, rows) => {
        if (err) {
          res.status(500).json({ error: String(err) });
        } else {
          res.json({ data: rows || [] });
        }
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 2026 예산집행 데이터 저장
  app.post('/api/budget-execution-2026/save', (_req, res) => {
    try {
      const { data } = _req.body;
      const db = getDB();

      db.serialize(() => {
        db.run('DELETE FROM budget_execution_2026', (err) => {
          if (err) {
            res.status(500).json({ success: false, error: String(err) });
            return;
          }

          const stmt = db.prepare(`
            INSERT INTO budget_execution_2026 (id, department, policy_name, program_name, unit_name, statistics_code, original, supplementary, pre_establishment, reserve, carryover, budget, executed, execution_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          let count = 0;
          for (const row of data) {
            stmt.run(
              row.id,
              row.department,
              row.policyName,
              row.programName,
              row.unitName,
              row.statisticsCode,
              row.original,
              row.supplementary,
              row.preEstablishment,
              row.reserve,
              row.carryover,
              row.budget,
              row.executed,
              row.executionRate
            );
            count++;
          }
          stmt.finalize();

          res.json({ success: true, message: '저장 완료', count });
        });
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 설명자료 데이터 로드 (부서별) - 계층 구조로 변환
  app.get('/api/budget-explainer/data', (req, res) => {
    try {
      const department = String(req.query.department || '');
      if (!department) {
        res.status(400).json({ error: '부서를 선택해주세요' });
        return;
      }

      const db = getDB();
      db.all(
        'SELECT * FROM budget_explainer_data WHERE department = ? ORDER BY policy, unit, detail',
        [department],
        (err, rows) => {
          if (err) {
            res.status(500).json({ error: String(err) });
            return;
          }

          // 계층 구조로 변환
          const policyMap = new Map();
          (rows || []).forEach((row: any) => {
            if (!policyMap.has(row.policy)) {
              policyMap.set(row.policy, {
                title: row.policy,
                level: '정책사업',
                children: new Map(),
              });
            }

            const policyNode = policyMap.get(row.policy);
            if (!policyNode.children.has(row.unit)) {
              policyNode.children.set(row.unit, {
                title: row.unit,
                level: '단위사업',
                children: [],
              });
            }

            const unitNode = policyNode.children.get(row.unit);
            unitNode.children.push({
              id: row.id,
              title: row.detail,
              name: row.detail_name,
              level: '세부사업',
              children: [],
            });
          });

          // Map을 배열로 변환
          const policies = Array.from(policyMap.values()).map((policy) => ({
            ...policy,
            children: Array.from(policy.children.values()),
          }));

          // 부서명을 최상위 노드로 감싸기
          const tree = [{
            title: department,
            level: '부서',
            children: policies,
          }];

          res.json({ data: tree || [] });
        }
      );
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 설명자료 텍스트 저장 (세부사업별) - JSON 또는 파일 업로드
  app.post('/api/budget-explainer/save-material', upload.single('file'), async (req, res) => {
    try {
      const { department, policy, unit, detail, level, explanation_text, sections_json, file_name } = req.body;
      console.log('📥 Received form data:', { department, policy, unit, detail, level, file_name, has_sections_json: !!sections_json });
      let fileName = file_name || null;

      if (req.file) {
        fileName = req.file.originalname;
      }

      if (!department || !policy || !unit || !detail || !level) {
        console.warn('❌ Missing required fields:', { department: !!department, policy: !!policy, unit: !!unit, detail: !!detail, level: !!level });
        return res.status(400).json({ success: false, error: '필수 정보가 부족합니다' });
      }

      const db = getDB();
      const values = [department, policy, unit, detail, level, explanation_text || null, fileName, sections_json || null];
      console.log('💾 Saving to database:', {
        department, policy, unit, detail, level,
        has_sections_json: !!sections_json,
        sections_json_length: sections_json?.length,
        values_count: values.length
      });

      db.run(
        `INSERT OR REPLACE INTO budget_explainer_materials
         (department, policy, unit, detail, level, explanation_text, file_name, sections_json, uploaded_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        values,
        function(err) {
          if (err) {
            console.error('❌ Database error:', err);
            res.status(500).json({ success: false, error: String(err) });
          } else {
            console.log(`✅ Successfully saved (ID: ${this.lastID}, Changes: ${this.changes})`);
            res.json({ success: true, message: '설명자료를 저장했습니다' });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 설명자료 텍스트 조회 (세부사업별)
  app.get('/api/budget-explainer/get-material', (req, res) => {
    try {
      const { department, policy, unit, detail } = req.query;

      if (!department || !policy || !unit || !detail) {
        return res.status(400).json({ error: '필수 정보가 부족합니다' });
      }

      const db = getDB();
      db.get(
        `SELECT * FROM budget_explainer_materials
         WHERE department = ? AND policy = ? AND unit = ? AND detail = ?`,
        [department, policy, unit, detail],
        (err, row) => {
          if (err) {
            res.status(500).json({ error: String(err) });
          } else {
            res.json({ data: row || null });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 설명자료 데이터 동기화
  app.post('/api/budget-explainer/sync', async (req, res) => {
    try {
      // 로컬 test.csv 파일 읽기
      const fs = await import('fs');
      const fsPromises = fs.promises;
      const testFilePath = path.join(__dirname, '../client/public/test.csv');

      let csv: string;
      try {
        csv = await fsPromises.readFile(testFilePath, 'utf-8');
      } catch (fileError) {
        return res.status(500).json({ success: false, error: `File read error: ${String(fileError)}` });
      }

      // CSV 파싱
      const lines = csv.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: `CSV 데이터가 없습니다 (lines: ${lines.length}, csv length: ${csv.length})` });
      }

      // 헤더 파싱
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        headerMap[h] = i;
      });

      // 필수 컬럼 확인 (부서명 또는 부서, 정책, 단위, 세부 또는 세부사업)
      const departmentCol = headerMap['부서명'] !== undefined ? '부서명' : '부서';
      const detailCol = headerMap['세부'] !== undefined ? '세부' : '세부사업';

      if (!(departmentCol in headerMap) || !('정책' in headerMap) || !('단위' in headerMap) || !(detailCol in headerMap)) {
        return res.status(400).json({ error: `필수 컬럼이 없습니다. 필요한 컬럼: ${departmentCol}, 정책, 단위, ${detailCol}` });
      }

      const db = getDB();
      db.serialize(() => {
        db.run('DELETE FROM budget_explainer_data', (err) => {
          if (err) {
            res.status(500).json({ success: false, error: String(err) });
            return;
          }

          const stmt = db.prepare(`
            INSERT INTO budget_explainer_data (department, policy, unit, detail, detail_name)
            VALUES (?, ?, ?, ?, ?)
          `);

          let count = 0;
          const seen = new Set<string>();

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // CSV 파싱 (간단한 버전 - 따옴표 처리 기본)
            const parts = line.split(',').map((p) => p.trim().replace(/"/g, ''));

            const department = parts[headerMap[departmentCol]] || '';
            const policy = parts[headerMap['정책']] || '';
            const unit = parts[headerMap['단위']] || '';
            const detail = parts[headerMap[detailCol]] || '';
            const detailName = parts[headerMap['부기명']] || '';

            if (!department || !policy || !unit || !detail) continue;

            // 중복 제거 (같은 정책/단위/세부 조합)
            const key = `${department}|${policy}|${unit}|${detail}`;
            if (seen.has(key)) continue;
            seen.add(key);

            stmt.run(department, policy, unit, detail, detailName);
            count++;
          }

          stmt.finalize();
          res.json({
            success: true,
            message: `${count}개 항목을 동기화했습니다`,
            count,
          });
        });
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 2026 예산집행 엑셀 업로드
  app.post('/api/budget-execution-2026/upload', upload.single('file'), (_req, res) => {
    try {
      if (!_req.file) {
        return res.status(400).json({ error: '파일을 선택해주세요' });
      }

      const workbook = XLSX.read(_req.file.buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

      const parseNumber = (value: unknown): number => {
        if (typeof value === "number") return value;
        const parsed = parseInt(String(value || "0").replace(/[^0-9]/g, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
      };

      const db = getDB();
      db.serialize(() => {
        db.run('DELETE FROM budget_execution_2026', (err) => {
          if (err) {
            res.status(500).json({ success: false, error: String(err) });
            return;
          }

          const stmt = db.prepare(`
            INSERT INTO budget_execution_2026 (id, department, policy_name, program_name, unit_name, statistics_code, original, supplementary, pre_establishment, reserve, carryover, budget, executed, execution_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          let count = 0;
          for (const record of imported) {
            const budgetAmount = parseNumber(record["예산현액"]);
            const executedAmount = parseNumber(record["집행액"]);

            stmt.run(
              Date.now() + count,
              String(record["부서명"]) || "미분류",
              String(record["정책사업명"]) || "",
              String(record["단위사업명"]) || "",
              String(record["세부사업명"]) || "",
              String(record["통계목"]) || "",
              parseNumber(record["본예산"]),
              parseNumber(record["추경"]),
              parseNumber(record["성립전"]),
              parseNumber(record["예비비"]),
              parseNumber(record["이월액계"]),
              budgetAmount,
              executedAmount,
              budgetAmount > 0 ? (executedAmount / budgetAmount) * 100 : 0
            );
            count++;
          }
          stmt.finalize();

          res.json({
            success: true,
            message: `${count}개 부서 예산집행 현황을 업로드했습니다`,
            count,
          });
        });
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const publicDir = path.join(__dirname, 'public');
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  } else {
    // API 요청에 대해서는 404 반환
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  const port = process.env.PORT || 3002;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
