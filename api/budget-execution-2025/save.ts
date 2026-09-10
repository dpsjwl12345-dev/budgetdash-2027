import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }
  try {
    const { data } = req.body ?? {};
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      res.status(200).json({ success: false, message: "저장 실패 (클라우드 환경 변수 누락)" });
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    const supabase = createClient(url, key);

    const dbRows = rows.map((row: any) => ({
      id: Number(row.id),
      department: row.department,
      policy_name: row.policyName ?? null,
      program_name: row.programName ?? null,
      unit_name: row.unitName ?? null,
      statistics_code: row.statisticsCode ?? null,
      original: row.original ?? 0,
      supplementary: row.supplementary ?? 0,
      pre_establishment: row.preEstablishment ?? 0,
      reserve: row.reserve ?? 0,
      carryover: row.carryover ?? 0,
      budget: row.budget ?? 0,
      executed: row.executed ?? 0,
      execution_rate: row.executionRate ?? 0,
    }));

    // 업로드는 항상 해당 연도 전체를 교체하는 것을 전제로 한다 (BudgetExecution2026.tsx UI 안내 문구 참고).
    const { error: deleteError } = await supabase
      .from("budget_execution_2025")
      .delete()
      .not("id", "is", null);
    if (deleteError) {
      res.status(200).json({ success: false, message: "저장 실패 (기존 데이터 삭제 실패)", error: deleteError.message });
      return;
    }

    if (dbRows.length > 0) {
      const { error: insertError } = await supabase.from("budget_execution_2025").insert(dbRows);
      if (insertError) {
        res.status(200).json({ success: false, message: "저장 실패", error: insertError.message });
        return;
      }
    }

    res.status(200).json({ success: true, message: "저장 완료", count: dbRows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
