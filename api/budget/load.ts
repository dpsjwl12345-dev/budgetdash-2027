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

    // PostgREST/Supabase는 .select('*')만 쓰면 기본적으로 한 번에 최대 1000행까지만 돌려준다.
    // budget_rows가 1000행을 넘어가면 나머지가 조용히 잘려서, 부서/기기마다 어떤 행이
    // 보이고 안 보이는지가 달라지는 것처럼 보였다 - .range()로 끝까지 페이지네이션해서 가져온다.
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('budget_rows')
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        res.status(200).json({ data: null });
        return;
      }
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    res.status(200).json({ data: allRows });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
