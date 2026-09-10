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

    // 설명자료 PDF를 아직 올리지 않은 부서도 예산요구서의
    // 정책·단위·세부사업 계층을 바로 탐색할 수 있도록 병합한다.
    // id는 업로드 시 원본 엑셀 행 순서대로 증가하는 값이라, id로 정렬하면
    // 예산서에 적힌 순서 그대로 트리가 구성된다.
    const { data: budgetRows, error: budgetError } = await fetchAllRows((from, to) =>
      supabase
        .from("budget_rows")
        .select("id, policy, program, department")
        .eq("department", department)
        .order("id", { ascending: true })
        .range(from, to)
    );
    if (budgetError) {
      res.status(500).json({ error: budgetError.message });
      return;
    }

    // 예산요구서와 설명자료의 계층을 병합한다. 예산요구서를 다시 업로드해
    // budget_rows의 사업 구성이 바뀌거나 잠시 비어 있어도 기존 설명자료의
    // 연결 경로가 사라지지 않도록 한다.
    const budgetTreeRows = (budgetRows || []).map((row: any) => {
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
