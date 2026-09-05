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

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
