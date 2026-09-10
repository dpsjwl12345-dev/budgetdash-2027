import { createClient } from "@supabase/supabase-js";

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
      .from("budget_execution_2025")
      .select("*")
      .order("department");

    if (error) {
      res.status(200).json({ data: null });
      return;
    }

    const rows = (data || []).map((row: any) => ({
      id: row.id,
      department: row.department,
      policyName: row.policy_name ?? undefined,
      programName: row.program_name ?? undefined,
      unitName: row.unit_name ?? undefined,
      statisticsCode: row.statistics_code ?? undefined,
      original: row.original ?? 0,
      supplementary: row.supplementary ?? 0,
      preEstablishment: row.pre_establishment ?? 0,
      reserve: row.reserve ?? 0,
      carryover: row.carryover ?? 0,
      budget: row.budget ?? 0,
      executed: row.executed ?? 0,
      executionRate: row.execution_rate ?? 0,
    }));

    res.status(200).json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
