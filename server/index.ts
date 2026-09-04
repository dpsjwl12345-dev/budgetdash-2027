import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { saveToKV, loadFromKV } from "../shared/kv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // JSON 파싱 미들웨어
  app.use(express.json());

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

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
