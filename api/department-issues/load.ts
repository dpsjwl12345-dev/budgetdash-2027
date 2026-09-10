import { loadFromKV } from "../../shared/kv";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const data = await loadFromKV("departmentIssues");
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
