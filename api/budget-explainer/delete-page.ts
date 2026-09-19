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

// 부서 PDF 자동 분할이 다음 세부사업 페이지까지 꼬리를 물고 들어온 경우처럼, 잘못 섞인
// 페이지 한 장을 사용자가 직접 지울 수 있게 한다. field는 sections_json.images(부서
// 설명자료) 또는 sections_json.orgImages(기관 설명자료) 중 하나의 배열에서 index 위치를
// 제거한다.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { department, policy, unit, detail, field, index } = req.body ?? {};

    if (
      !department ||
      !policy ||
      !unit ||
      !detail ||
      (field !== "images" && field !== "orgImages") ||
      typeof index !== "number" ||
      index < 0
    ) {
      res.status(400).json({ success: false, error: "부서, 세부사업, field, index가 필요합니다" });
      return;
    }

    const supabase = getSupabaseAdmin();
    const key = { department: String(department), policy: String(policy), unit: String(unit), detail: String(detail) };
    const { data: current, error: readError } = await supabase
      .from("budget_explainer_materials")
      .select("sections_json")
      .match(key)
      .maybeSingle();
    if (readError) {
      res.status(500).json({ success: false, error: readError.message });
      return;
    }

    const sections = current?.sections_json && typeof current.sections_json === "object" ? current.sections_json : {};
    const images = Array.isArray((sections as any)[field]) ? [...(sections as any)[field]] : [];
    if (index >= images.length) {
      res.status(400).json({ success: false, error: "삭제할 페이지를 찾지 못했습니다" });
      return;
    }
    images.splice(index, 1);

    const { error: saveError } = await supabase
      .from("budget_explainer_materials")
      .upsert(
        { ...key, sections_json: { ...sections, [field]: images }, updated_at: new Date().toISOString() },
        { onConflict: "department,policy,unit,detail" },
      );
    if (saveError) {
      res.status(500).json({ success: false, error: saveError.message });
      return;
    }

    res.status(200).json({ success: true, count: images.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
