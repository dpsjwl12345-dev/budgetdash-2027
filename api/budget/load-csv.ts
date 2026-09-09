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
      .from('budget_hierarchy_rows')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      res.status(200).json({ data: null });
      return;
    }

    const rows = (data || []).map((row: any) => ({
      id: row.id,
      level: row.level,
      label: row.label,
      budget: row.budget ?? undefined,
      previous: row.previous ?? undefined,
      difference: row.difference ?? undefined,
      statisticsCode: row.statistics_code ?? undefined,
      description: row.description ?? undefined,
      parentId: row.parent_id ?? undefined,
      colSpan: row.col_span ?? undefined,
    }));

    res.status(200).json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
