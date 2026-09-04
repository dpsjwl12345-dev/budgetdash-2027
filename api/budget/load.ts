import { loadFromKV } from "../../shared/kv";

export default async function handler(_req: any, res: any) {
  try {
    const data = await loadFromKV('budgetRows');
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
