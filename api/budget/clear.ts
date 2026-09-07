export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      res.status(200).json({ success: false, message: "클라우드 환경 변수 누락" });
      return;
    }

    const kvResponse = await fetch(`${url}/del/budgetRows`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    res.status(200).json({
      success: kvResponse.ok,
      message: kvResponse.ok ? "데이터 삭제 완료" : "삭제 실패",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
