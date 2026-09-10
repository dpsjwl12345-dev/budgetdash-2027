import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      res.status(200).json({ success: false, message: "클라우드 환경 변수 누락" });
      return;
    }

    const supabase = createClient(url, key);
    const { error } = await supabase.from('budget_rows').delete().not('id', 'is', null);

    res.status(200).json({
      success: !error,
      message: error ? "삭제 실패" : "데이터 삭제 완료",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
