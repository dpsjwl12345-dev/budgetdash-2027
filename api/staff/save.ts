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

    const staffData = data && typeof data === 'object' ? data : {};
    const rows = Object.entries(staffData).map(([department, value]: [string, any]) => ({
      department,
      capacity: value?.capacity ?? '',
      current_count: value?.current ?? '',
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      res.status(200).json({ success: true, message: "저장할 데이터가 없습니다." });
      return;
    }

    const supabase = createClient(url, key);
    const { error: upsertError } = await supabase
      .from('department_staff')
      .upsert(rows, { onConflict: 'department' });

    if (upsertError) {
      res.status(200).json({
        success: false,
        message: "저장 실패. 기존 데이터는 유지했습니다.",
        error: upsertError.message,
      });
      return;
    }

    res.status(200).json({ success: true, message: "저장 완료" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), message: "저장 중 오류가 발생했으며 기존 데이터는 유지했습니다." });
  }
}
