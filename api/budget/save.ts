import { saveToKV } from "../../shared/kv";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const { data } = req.body ?? {};
    const success = await saveToKV('budgetRows', data);

    res.status(200).json({
      success,
      message: success ? '저장 완료' : '저장 실패 (로컬만 사용)',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
