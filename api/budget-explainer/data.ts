import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDB } from '../../server/db';
import { initializeDB } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeDB();
    const department = String(req.query.department || '');
    if (!department) {
      res.status(400).json({ error: '부서를 선택해주세요' });
      return;
    }

    const db = getDB();
    db.all(
      'SELECT * FROM budget_explainer_data WHERE department = ? ORDER BY policy, unit, detail',
      [department],
      (err: any, rows: any) => {
        if (err) {
          res.status(500).json({ error: String(err) });
          return;
        }

        // 계층 구조로 변환
        const policyMap = new Map();
        (rows || []).forEach((row: any) => {
          if (!policyMap.has(row.policy)) {
            policyMap.set(row.policy, {
              title: row.policy,
              level: '정책사업',
              children: new Map(),
            });
          }

          const policyNode = policyMap.get(row.policy);
          if (!policyNode.children.has(row.unit)) {
            policyNode.children.set(row.unit, {
              title: row.unit,
              level: '단위사업',
              children: [],
            });
          }

          const unitNode = policyNode.children.get(row.unit);
          unitNode.children.push({
            id: row.id,
            title: row.detail,
            name: row.detail_name,
            level: '세부사업',
            children: [],
          });
        });

        // Map을 배열로 변환
        const policies = Array.from(policyMap.values()).map((policy: any) => ({
          ...policy,
          children: Array.from(policy.children.values()),
        }));

        // 부서명을 최상위 노드로 감싸기
        const tree = [{
          title: department,
          level: '부서',
          children: policies,
        }];

        res.json({ data: tree || [] });
      }
    );
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
