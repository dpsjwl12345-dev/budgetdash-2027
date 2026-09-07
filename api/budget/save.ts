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

    const supabase = createClient(url, key);
    // 클라이언트가 보낸 배열을 현재 화면의 전체 스냅샷으로 취급한다.
    // upsert만 사용하면 화면에서 삭제한 행이 Supabase에 남아 새로고침 때 다시 나타난다.
    const { error: deleteError } = await supabase
      .from('budget_rows')
      .delete()
      .neq('id', -1);
    if (deleteError) {
      res.status(200).json({ success: false, message: "기존 데이터 삭제 실패", error: deleteError.message });
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    const { error } = rows.length
      ? await supabase.from('budget_rows').insert(rows)
      : { error: null };

    res.status(200).json({
      success: !error,
      message: error ? "저장 실패" : "저장 완료",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
