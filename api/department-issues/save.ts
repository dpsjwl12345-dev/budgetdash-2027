import { saveToKV } from "../../shared/kv";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const data = req.body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      res.status(400).json({ success: false, error: "유효한 쟁점사항 데이터가 필요합니다." });
      return;
    }
    const success = await saveToKV("departmentIssues", data);
    res.status(200).json({ success, message: success ? "쟁점사항이 클라우드에 저장되었습니다." : "클라우드 저장에 실패했습니다." });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
