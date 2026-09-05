export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const { department, text, fileName, sections } = req.body ?? {};
    if (!department) {
      res.status(400).json({ success: false, error: "부서를 선택해주세요" });
      return;
    }

    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      res.status(200).json({ success: false, message: "저장 실패 (클라우드 환경 변수 누락)" });
      return;
    }

    const payload = JSON.stringify({
      text,
      fileName,
      sections,
      uploadedAt: new Date().toISOString(),
    });

    const kvResponse = await fetch(`${url}/set/explainer:${encodeURIComponent(department)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    });

    res.status(200).json({
      success: kvResponse.ok,
      message: kvResponse.ok ? "저장 완료" : "저장 실패 (로컬만 사용)",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
