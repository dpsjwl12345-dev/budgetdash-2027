import { createClient } from '@supabase/supabase-js';

export default async function handler(_req: any, res: any) {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      res.status(200).json({ data: null });
      return;
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('department_staff')
      .select('*');

    if (error) {
      res.status(200).json({ data: null });
      return;
    }

    const staffData: Record<string, { capacity: string; current: string }> = {};
    (data || []).forEach((row: any) => {
      staffData[row.department] = {
        capacity: row.capacity ?? '',
        current: row.current_count ?? '',
      };
    });

    res.status(200).json({ data: staffData });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
