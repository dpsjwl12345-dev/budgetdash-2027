import { createClient } from "@supabase/supabase-js";

// Vercel의 Node 함수 번들러는 api/ 밖의 상대경로 import(shared/*)를 포함시키지 않으므로
// (ERR_MODULE_NOT_FOUND) 각 함수 파일에 자기 완결적으로 둔다.
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

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
