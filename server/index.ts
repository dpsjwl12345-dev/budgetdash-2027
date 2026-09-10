import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import { saveToKV, loadFromKV, deleteFromKV } from "../shared/kv";
import { initializeDB, getDB } from "./db";
import explainerDataHandler from "../api/budget-explainer/data";
import explainerGetMaterialHandler from "../api/budget-explainer/get-material";
import explainerBulkSaveHandler from "../api/budget-explainer/bulk-save";
import cloudSyncHandler from "../api/cloud-sync";

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

  // 테스트
  app.get('/test', (req, res) => res.json({ ok: true }));

  // API 엔드포인트
  app.post('/api/budget/save', async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) {
        res.status(400).json({ success: false, error: '빈 예산 데이터는 저장할 수 없습니다.' });
        return;
      }

      // 로컬은 localStorage 폴백만 사용 (Supabase는 프로덕션에서)
      try {
        // 로컬에서도 Supabase 테스트 시도
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { error } = await supabase
            .from('budget_rows')
            .upsert(data ?? [], { onConflict: 'id' });

          if (!error) {
            res.json({ success: true, message: '클라우드에 저장되었습니다' });
            return;
          }
        }
      } catch (supabaseError) {
        console.log('Supabase 저장 시도 실패, 로컬 폴백:', supabaseError);
      }

      // Supabase 실패 시 로컬 폴백
      const success = await saveToKV('budgetRows', data);
      res.json({
        success,
        message: success ? '로컬에 저장되었습니다' : '저장 실패 (로컬만 사용)'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/budget/load', async (_req, res) => {
    try {
      // Supabase 시도
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('budget_rows')
          .select('*');

        if (!error && data) {
          res.json({ data });
          return;
        }
      }

      // Supabase 실패 시 로컬 폴백
      const data = await loadFromKV('budgetRows');
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // 부서별 주요 쟁점사항 저장/로드
  app.post('/api/department-issues/save', async (req, res) => {
    try {
      const { data } = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.status(400).json({ success: false, error: '유효한 쟁점사항 데이터가 필요합니다.' });
        return;
      }
      const success = await saveToKV('departmentIssues', data);
      res.json({ success, message: success ? '쟁점사항이 서버에 저장되었습니다.' : '서버 저장에 실패했습니다.' });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/api/department-issues/load', async (_req, res) => {
    try {
      const data = await loadFromKV('departmentIssues');
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete('/api/budget/clear', async (_req, res) => {
    try {
      const success = await deleteFromKV('budgetRows');
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // CSV 파일에서 계층형 예산 데이터 로드
  app.get('/api/budget/load-csv', (req, res) => {
    try {
      const filename = String(req.query.file || '관광진흥과.csv');
      const csvPath = `C:\\Users\\user\\Desktop\\${filename}`;
      if (!fs.existsSync(csvPath)) {
        return res.status(404).json({ error: 'CSV 파일을 찾을 수 없습니다' });
      }

      const content = fs.readFileSync(csvPath, 'utf-8');
      const rows = content.split('\n');
      const hierarchyData: any[] = [];
      let id = 1;

      rows.forEach((line, idx) => {
        if (idx < 2 || !line.trim()) return;

        const commaMatch = line.match(/^,*/);
        const indent = (commaMatch?.[0] || '').length;
        const cells = line.split(',');
        let cellIndex = indent;

        const label = cells[cellIndex]?.replace(/^"+|"+$/g, '').trim() || '';
        const budget = parseInt(cells[indent + 5]?.replace(/[^0-9]/g, '') || '0') || undefined;
        const previous = parseInt(cells[indent + 6]?.replace(/[^0-9]/g, '') || '0') || undefined;
        const difference = parseInt(cells[indent + 7]?.replace(/[^0-9]/g, '') || '0') || undefined;
        const statisticsCode = cells[indent + 8]?.replace(/^"+|"+$/g, '').trim() || '';
        const description = cells[indent + 9]?.replace(/^"+|"+$/g, '').trim() || '';

        if (!label) return;

        let level = 'item';
        if (indent === 0) level = 'dept';
        else if (indent === 1) level = 'policy';
        else if (indent === 2) level = 'unit';
        else if (indent === 3) level = 'program';
        else if (indent === 4) level = 'account';

        hierarchyData.push({
          id: `row-${id++}`,
          level,
          label,
          budget: budget || undefined,
          previous: previous || undefined,
          difference: difference || undefined,
          statisticsCode: statisticsCode || undefined,
          description: description || undefined
        });
      });

      res.json({ data: hierarchyData });
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

  const parseHierarchyData = (matrix: any[]): any[] => {
    const hierarchyData: any[] = [];
    let id = 1;

    const secondRowLabel = (matrix[1]?.[0] || "").toString().replace(/\s/g, "");
    const startIdx = secondRowLabel === "총계" ? 2 : 1;

    for (let idx = startIdx; idx < matrix.length; idx++) {
      const cells = (matrix[idx] || []).map((c: any) => (c ?? "").toString().replace(/^"+|"+$/g, "").trim());
      if (!cells.some(c => c)) continue;

      const hierIndent = [0, 1, 2, 3, 4].findIndex(i => cells[i]);
      if (hierIndent === -1) continue;

      const levels = ["dept", "policy", "unit", "program", "account"];
      hierarchyData.push({
        id: `row-${id++}`,
        level: levels[hierIndent],
        label: cells[hierIndent],
        budget: parseInt(cells[5]?.replace(/[^0-9]/g, '') || '0') || undefined,
        previous: parseInt(cells[6]?.replace(/[^0-9]/g, '') || '0') || undefined,
        difference: parseInt(cells[7]?.replace(/[^0-9]/g, '') || '0') || undefined,
        statisticsCode: cells[8] || undefined,
        description: cells[9] || undefined,
      });
    }
    return hierarchyData;
  };

  // 샘플 데이터 로드 (개발용)
  app.get('/api/hierarchy/sample', (req, res) => {
    try {
      const filePath = "C:\\Users\\user\\Desktop\\본예산요구액(0904)\\0910 요구액\\문화예술과.xls";
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
      const hierarchyData = parseHierarchyData(matrix);
      res.json({ success: true, data: hierarchyData, count: hierarchyData.length });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 예산 편성 시트 업로드 처리
  app.post('/api/hierarchy/upload', upload.single('file'), async (_req, res) => {
    try {
      if (!_req.file) {
        return res.status(400).json({ error: '파일을 선택해주세요' });
      }

      const workbook = XLSX.read(_req.file.buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
      const hierarchyData = parseHierarchyData(matrix);

      res.json({ success: true, data: hierarchyData, count: hierarchyData.length });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 파일 경로에서 예산 편성 시트 데이터 로드
  app.post('/api/hierarchy/load-file', (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        return res.status(400).json({ error: '파일 경로를 제공해주세요' });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
      const hierarchyData = parseHierarchyData(matrix);

      res.json({ success: true, data: hierarchyData, count: hierarchyData.length });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // 설명자료 API - Supabase 기반 (api/budget-explainer/*.ts 와 동일 핸들러 공유)
  // 로컬 개발(Express)과 Vercel 프로덕션(서버리스)이 같은 로직을 타도록 위임한다.
  app.get('/api/budget-explainer/data', (req, res) => explainerDataHandler(req, res));
  app.get('/api/budget-explainer/get-material', (req, res) => explainerGetMaterialHandler(req, res));
  app.post('/api/budget-explainer/bulk-save', (req, res) => explainerBulkSaveHandler(req, res));

  // 예산 편성 시트(hierarchy) · 정원·현원(staff) 클라우드 동기화 - 같은 이유로 위임
  app.get('/api/cloud-sync', (req, res) => cloudSyncHandler(req, res));
  app.post('/api/cloud-sync', (req, res) => cloudSyncHandler(req, res));

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

  // API 요청에 대해서는 404 반환
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const port = 3002;

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
