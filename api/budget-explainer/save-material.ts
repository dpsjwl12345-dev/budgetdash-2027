import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDB } from '../../server/db';
import { initializeDB } from '../../server/db';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await initializeDB();
    const { department, policy, unit, detail, level, explanation_text, sections_json, file_name } = req.body;

    if (!department || !policy || !unit || !detail || !level) {
      return res.status(400).json({ success: false, error: '필수 정보가 부족합니다' });
    }

    const db = getDB();
    const values = [department, policy, unit, detail, level, explanation_text || null, file_name || null, sections_json || null];

    db.run(
      `INSERT OR REPLACE INTO budget_explainer_materials
       (department, policy, unit, detail, level, explanation_text, file_name, sections_json, uploaded_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      values,
      function(err: any) {
        if (err) {
          res.status(500).json({ success: false, error: String(err) });
        } else {
          res.json({ success: true, message: '설명자료를 저장했습니다' });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
