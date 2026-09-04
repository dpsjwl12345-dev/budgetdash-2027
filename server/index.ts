import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vercel KV 초기화
const initKV = () => {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn('⚠️  KV 환경 변수 누락 - 로컬 스토리지만 사용됩니다');
    return null;
  }

  return { url, token };
};

// KV에 데이터 저장
const saveToKV = async (key: string, data: any): Promise<boolean> => {
  const kv = initKV();
  if (!kv) return false;

  try {
    const response = await fetch(`${kv.url}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.ok;
  } catch (error) {
    console.error('KV 저장 실패:', error);
    return false;
  }
};

// KV에서 데이터 로드
const loadFromKV = async (key: string): Promise<any | null> => {
  const kv = initKV();
  if (!kv) return null;

  try {
    const response = await fetch(`${kv.url}/get/${key}`, {
      headers: {
        'Authorization': `Bearer ${kv.token}`,
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('KV 로드 실패:', error);
    return null;
  }
};

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

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
