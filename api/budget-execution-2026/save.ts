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

    if (dbRows.length === 0) {
      res.status(200).json({ success: false, message: "저장할 데이터가 없습니다." });
      return;
    }

    // 부서 단위로 업로드하는 화면이므로, 이번에 업로드된 부서의 기존 행만 새 데이터로
    // 교체한다. 테이블 전체를 지우면 이번 업로드에 없는 다른 부서 데이터까지 사라진다.
    const uploadedDepartments = Array.from(new Set(dbRows.map((row) => row.department)));

    const { error: upsertError } = await supabase
      .from("budget_execution_2026")
      .upsert(dbRows, { onConflict: "id" });
    if (upsertError) {
      res.status(200).json({ success: false, message: "저장 실패. 기존 데이터는 유지했습니다.", error: upsertError.message });
      return;
    }

    const ids = dbRows.map((row) => row.id);
    let cleanupWarning: string | undefined;
    if (ids.length > 0) {
      const { error: cleanupError } = await supabase
        .from("budget_execution_2026")
        .delete()
        .in("department", uploadedDepartments)
        .not("id", "in", `(${ids.join(",")})`);
      if (cleanupError) cleanupWarning = cleanupError.message;
    }

    res.status(200).json({
      success: true,
      message: cleanupWarning ? "저장 완료 (이전 삭제 항목 정리는 보류됨)" : "저장 완료",
      warning: cleanupWarning,
      count: dbRows.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
