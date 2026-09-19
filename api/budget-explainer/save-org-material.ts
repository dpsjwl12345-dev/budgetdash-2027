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

// 부서 설명자료(sections_json.images)와 별개로, 세부사업 하나에 개별 업로드하는
// 기관 자체 설명자료(sections_json.orgImages)를 저장한다. 재단·공사 등 기관이 딸린
// 세부사업에만 선택적으로 채워지고, 나머지 세부사업은 이 값이 없어 탭이 비어 보인다.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { department, policy, unit, detail, fileName, images } = req.body ?? {};

    if (!department || !policy || !unit || !detail || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ success: false, error: "부서, 세부사업, 이미지 목록이 필요합니다" });
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
    const { error: saveError } = await supabase
      .from("budget_explainer_materials")
      .upsert(
        {
          ...key,
          sections_json: { ...sections, orgImages: images, orgFileName: fileName || null },
          updated_at: new Date().toISOString(),
        },
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
