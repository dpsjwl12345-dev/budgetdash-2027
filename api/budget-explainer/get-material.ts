import { getSupabaseAdmin } from "../../shared/supabase";

export default async function handler(req: any, res: any) {
  try {
    const { department, policy, unit, detail } = req.query ?? {};

    if (!department || !policy || !unit || !detail) {
      res.status(400).json({ error: "필수 정보가 부족합니다" });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("budget_explainer_materials")
      .select("*")
      .eq("department", String(department))
      .eq("policy", String(policy))
      .eq("unit", String(unit))
      .eq("detail", String(detail))
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ data: data ?? null });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
