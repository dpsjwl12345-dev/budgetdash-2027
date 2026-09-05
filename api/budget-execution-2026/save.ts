export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const { data } = req.body ?? {};
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      res.status(200).json({ success: false, message: "저장 실패 (클라우드 환경 변수 누락)" });
      return;
    }

    const kvResponse = await fetch(`${url}/set/budgetExecution2026Rows`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data ?? []),
    });

    res.status(200).json({
      success: kvResponse.ok,
      message: kvResponse.ok ? "저장 완료" : "저장 실패 (로컬만 사용)",
      count: Array.isArray(data) ? data.length : 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
