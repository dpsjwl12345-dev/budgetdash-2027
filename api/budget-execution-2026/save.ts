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

    const incoming = Array.isArray(data) ? data : [];
    const incomingYears = new Set(
      incoming.map((row: any) => String(row?.year ?? "2026")),
    );
    const currentResponse = await fetch(`${url}/get/budgetExecution2026Rows`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!currentResponse.ok) {
      res.status(200).json({ success: false, message: "기존 집행현황 조회 실패로 저장을 중단했습니다" });
      return;
    }
    let current: any[] = [];
    const body = await currentResponse.json();
    const parsed = body?.result ? JSON.parse(body.result) : [];
    current = Array.isArray(parsed) ? parsed : [];
    // 업로드에 포함된 연도만 교체하고, 다른 연도의 기존 자료는 유지한다.
    const preserved = current.filter(
      (row: any) => !incomingYears.has(String(row?.year ?? "2026")),
    );
    const merged = [...preserved, ...incoming];

    const kvResponse = await fetch(`${url}/set/budgetExecution2026Rows`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(merged),
    });

    res.status(200).json({
      success: kvResponse.ok,
      message: kvResponse.ok ? "저장 완료" : "저장 실패 (로컬만 사용)",
      count: incoming.length,
      totalCount: merged.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
