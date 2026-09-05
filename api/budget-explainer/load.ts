export default async function handler(req: any, res: any) {
  try {
    const department = String(req.query?.department || "");
    if (!department) {
      res.status(400).json({ error: "부서를 선택해주세요" });
      return;
    }

    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      res.status(200).json({ data: null });
      return;
    }

    const kvResponse = await fetch(`${url}/get/explainer:${encodeURIComponent(department)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!kvResponse.ok) {
      res.status(200).json({ data: null });
      return;
    }

    const body = await kvResponse.json();
    const data = body?.result ? JSON.parse(body.result) : null;
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
