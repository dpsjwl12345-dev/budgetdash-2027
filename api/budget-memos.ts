import { loadFromKV, saveToKV } from "../shared/kv";

const KEY = "budgetProgramMemos";

type MemoPayload = {
  programMemos?: Record<string, string>;
  hiddenMemoIds?: string[];
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const data = await loadFromKV(KEY);
      res.status(200).json({ data: data ?? { programMemos: {}, hiddenMemoIds: [] } });
      return;
    }
    if (req.method === "POST") {
      const body = (req.body ?? {}) as MemoPayload;
      const data = {
        programMemos: body.programMemos && typeof body.programMemos === "object" ? body.programMemos : {},
        hiddenMemoIds: Array.isArray(body.hiddenMemoIds) ? body.hiddenMemoIds : [],
        updatedAt: new Date().toISOString(),
      };
      const success = await saveToKV(KEY, data);
      res.status(200).json({ success, data, message: success ? "메모가 클라우드에 저장되었습니다." : "클라우드 저장에 실패했습니다." });
      return;
    }
    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
