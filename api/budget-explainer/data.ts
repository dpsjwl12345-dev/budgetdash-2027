import { getSupabaseAdmin } from "../../shared/supabase";

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
