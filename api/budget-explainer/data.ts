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

    // .select(...)는 최대 1000행까지만 오니(PostgREST 기본 제한) .range()로 끝까지 받아온다.
    async function fetchAllRows(build: (from: number, to: number) => any): Promise<{ data: any[]; error: any }> {
      const pageSize = 1000;
      let from = 0;
      let all: any[] = [];
      while (true) {
        const { data: page, error } = await build(from, from + pageSize - 1);
        if (error) return { data: [], error };
        if (!page || page.length === 0) break;
        all = all.concat(page);
        if (page.length < pageSize) break;
        from += pageSize;
      }
      return { data: all, error: null };
    }

    const { data: materialRows, error } = await fetchAllRows((from, to) =>
      supabase
        .from("budget_explainer_materials")
        .select("policy, unit, detail")
        .eq("department", department)
        .order("policy")
        .order("unit")
        .order("detail")
        .range(from, to)
    );

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // 설명자료 PDF를 아직 올리지 않은 부서도 예산편성시트의
    // 정책·단위·세부사업 계층을 바로 탐색할 수 있도록 병합한다.
    // budget_rows는 "부서·정책·단위·세부·과목" 계층형 업로드에서는 전혀 채워지지 않는
    // 별도 테이블이라, 그걸 기준으로 삼으면 최신 업로드와 어긋나 전부 "미분류 정책"으로
    // 떨어진다. 실제로 업로드가 계속 갱신하는 budget_hierarchy_rows를 기준으로 삼는다.
    const { data: hierarchyRows, error: hierarchyError } = await fetchAllRows((from, to) =>
      supabase
        .from("budget_hierarchy_rows")
        .select("level, label")
        .eq("department", department)
        .order("sort_order", { ascending: true })
        .range(from, to)
    );
    if (hierarchyError) {
      res.status(500).json({ error: hierarchyError.message });
      return;
    }

    // budget_hierarchy_rows에는 부서/정책/단위/세부사업/통계목 행이 원본 순서 그대로
    // 평평하게 들어있고, 각 행이 어느 정책·단위 밑인지는 parent_id가 아니라 "그 행 앞에
    // 마지막으로 나온 policy/unit 행"으로 정해진다(업로드 파서가 순서 기반으로 만들기
    // 때문). 그래서 순서대로 훑으며 마지막 policy/unit을 추적해 세부사업(level: program)
    // 이 나올 때마다 그 경로를 기록한다.
    const budgetTreeRows: { policy: string; unit: string; detail: string }[] = [];
    let currentPolicy = "미분류 정책";
    let currentUnit = "단위사업 미지정";
    for (const row of hierarchyRows || []) {
      if (row.level === "policy") { currentPolicy = row.label || "미분류 정책"; currentUnit = "단위사업 미지정"; }
      else if (row.level === "unit") { currentUnit = row.label || "단위사업 미지정"; }
      else if (row.level === "program") {
        budgetTreeRows.push({ policy: currentPolicy, unit: currentUnit, detail: row.label || "미입력 사업" });
      }
    }
    const materialTreeRows = (materialRows || []).map((row: any) => ({
      policy: String(row.policy || "미분류 정책"),
      unit: String(row.unit || "단위사업 미지정"),
      detail: String(row.detail || "미입력 사업"),
    }));
    const rowMap = new Map<string, { policy: string; unit: string; detail: string }>();
    [...budgetTreeRows, ...materialTreeRows].forEach((row) => {
      rowMap.set(`${row.policy}\u001f${row.unit}\u001f${row.detail}`, row);
    });
    const rows = Array.from(rowMap.values());

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
