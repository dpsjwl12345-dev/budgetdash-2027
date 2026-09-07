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
    const { data: materialRows, error } = await supabase
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

    // 설명자료 PDF를 아직 올리지 않은 부서도 예산요구서의
    // 정책·단위·세부사업 계층을 바로 탐색할 수 있도록 병합한다.
    const { data: budgetRows, error: budgetError } = await supabase
      .from("budget_rows")
      .select("policy, program, department")
      .eq("department", department);
    if (budgetError) {
      res.status(500).json({ error: budgetError.message });
      return;
    }

    // 계층의 기준은 부서별 예산요구서로 고정한다.
    // 설명자료 테이블에 잘못된 부서로 저장된 자료가 있어도 다른 부서의
    // 정책·사업이 구조에 섞이지 않도록 한다.
    const rows = (budgetRows || []).map((row: any) => {
        const parts = String(row.program || "")
          .split("\n")
          .map((part) => part.trim())
          .filter(Boolean);
        return {
          policy: String(row.policy || "미분류 정책"),
          unit: parts.length > 1 ? parts[0] : "단위사업 미지정",
          detail: parts[parts.length - 1] || "미입력 사업",
        };
      });

    const policyMap = new Map<string, any>();
    rows.forEach((row: any) => {
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
          children: new Map<string, any>(),
        });
      }

      const unitNode = policyNode.children.get(row.unit);
      if (!unitNode.children.has(row.detail)) {
        unitNode.children.set(row.detail, {
          title: row.detail,
          level: "세부사업",
          children: [],
        });
      }
    });

    const policies = Array.from(policyMap.values()).map((policy) => ({
      ...policy,
      children: Array.from(policy.children.values()).map((unit: any) => ({
        ...unit,
        children: Array.from(unit.children.values()),
      })),
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
