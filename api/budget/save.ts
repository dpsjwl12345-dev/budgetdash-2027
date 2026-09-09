import { createClient } from '@supabase/supabase-js';

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
      res.status(200).json({ success: false, message: "저장 실패 (환경 변수 누락)" });
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      // 빈 배열을 저장할 때 기존 데이터를 먼저 지우지 않는다.
      res.status(200).json({ success: false, message: "저장할 데이터가 없습니다. 기존 데이터는 유지했습니다." });
      return;
    }

    const supabase = createClient(url, key);

    // 기존 데이터를 먼저 삭제하지 않고 upsert한다. upsert가 실패하면 기존 데이터가 보존된다.
    const { error: upsertError } = await supabase
      .from('budget_rows')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) {
      res.status(200).json({
        success: false,
        message: "저장 실패. 기존 데이터는 유지했습니다.",
        error: upsertError.message,
      });
      return;
    }

    // upsert 성공 후에만 현재 스냅샷에 없는 행을 정리한다.
    // 이 단계가 실패해도 새로 저장된 데이터와 기존 데이터는 모두 보존된다.
    const ids = rows
      .map((row: any) => Number(row?.id))
      .filter((id: number) => Number.isFinite(id));
    let cleanupWarning: string | undefined;

    if (ids.length > 0) {
      const { error: cleanupError } = await supabase
        .from('budget_rows')
        .delete()
        .not('id', 'in', `(${ids.join(',')})`);
      if (cleanupError) cleanupWarning = cleanupError.message;
    }

    res.status(200).json({
      success: true,
      message: cleanupWarning ? "저장 완료 (이전 삭제 항목 정리는 보류됨)" : "저장 완료",
      warning: cleanupWarning,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), message: "저장 중 오류가 발생했으며 기존 데이터는 유지했습니다." });
  }
}
