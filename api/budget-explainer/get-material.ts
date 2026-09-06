import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDB } from '../../server/db';
import { initializeDB } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeDB();
    const { department, policy, unit, detail } = req.query;

    if (!department || !policy || !unit || !detail) {
      return res.status(400).json({ error: '필수 정보가 부족합니다' });
    }

    const db = getDB();
    db.get(
      `SELECT * FROM budget_explainer_materials
       WHERE department = ? AND policy = ? AND unit = ? AND detail = ?`,
      [department, policy, unit, detail],
      (err: any, row: any) => {
        if (err) {
          res.status(500).json({ error: String(err) });
        } else {
          res.json({ data: row || null });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
