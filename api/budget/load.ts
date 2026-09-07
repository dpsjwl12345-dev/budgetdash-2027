const { createClient } = require('@supabase/supabase-js');

export default async function handler(_req: any, res: any) {
  try {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      res.status(200).json({ data: null });
      return;
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('budget_rows')
      .select('*');

    if (error) {
      res.status(200).json({ data: null });
      return;
    }

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
