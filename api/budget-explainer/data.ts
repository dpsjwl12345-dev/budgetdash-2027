import { createClient } from "@supabase/supabase-js";

// Vercel의 Node 함수 번들러는 api/ 밖의 상대경로 import(shared/*)를 포함시키지 않으므로
// (ERR_MODULE_NOT_FOUND) 각 함수 파일에 자기 완결적으로 둔다.
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: any, res: any) {
  try {
    const department = String(req.query?.department || "");
    if (!department) {
      res.status(400).json({ error: "부서를 선택해주세요" });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("budget_explainer_materials")
      .select("policy, unit, detail")
      .eq("department", department)
      .order("policy")
      .order("unit")
      .order("detail");

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const policyMap = new Map<string, any>();
    (rows || []).forEach((row: any) => {
      if (!policyMap.has(row.policy)) {
        policyMap.set(row.policy, {
          title: row.policy,
          level: "정책사업",
          children: new Map<string, any>(),
        });
      }

      const policyNode = policyMap.get(row.policy);
      if (!policyNode.children.has(row.unit)) {
        policyNode.children.set(row.unit, {
          title: row.unit,
          level: "단위사업",
          children: [],
        });
      }

      const unitNode = policyNode.children.get(row.unit);
      unitNode.children.push({
        title: row.detail,
        level: "세부사업",
        children: [],
      });
    });

    const policies = Array.from(policyMap.values()).map((policy) => ({
      ...policy,
      children: Array.from(policy.children.values()),
    }));

    const tree = [
      {
        title: department,
        level: "부서",
        children: policies,
      },
    ];

    res.status(200).json({ data: tree });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
