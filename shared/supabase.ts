import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수가 설정되지 않았습니다 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
