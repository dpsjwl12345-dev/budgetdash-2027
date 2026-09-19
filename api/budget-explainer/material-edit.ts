import { createClient } from "@supabase/supabase-js";

// Vercel의 Node 함수 번들러는 api/ 밖의 상대경로 import(shared/*)를 포함시키지 않으므로
// (ERR_MODULE_NOT_FOUND) 각 함수 파일에 자기 완결적으로 둔다.
//
// Hobby 플랜은 배포당 서버리스 함수를 최대 12개까지만 허용한다. 세부사업의
// 기관 설명자료 저장/페이지 삭제를 각각 별도 파일로 두면 한도를 넘기므로,
// action으로 분기하는 파일 하나에 합쳐 둔다.
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readSections(supabase: ReturnType<typeof getSupabaseAdmin>, key: Record<string, string>) {
  const { data, error } = await supabase
    .from("budget_explainer_materials")
    .select("sections_json")
    .match(key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.sections_json && typeof data.sections_json === "object" ? data.sections_json : {};
}

// 재단·공사 등 기관이 세부사업 단위로 개별 제출한 PDF를, 부서 설명자료(sections_json.images)와
// 별도로 sections_json.orgImages에 저장한다.
async function saveOrg(req: any, res: any) {
  const { department, policy, unit, detail, fileName, images } = req.body ?? {};
  if (!department || !policy || !unit || !detail || !Array.isArray(images) || images.length === 0) {
    res.status(400).json({ success: false, error: "부서, 세부사업, 이미지 목록이 필요합니다" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const key = { department: String(department), policy: String(policy), unit: String(unit), detail: String(detail) };
  const sections = await readSections(supabase, key);
  const { error } = await supabase
    .from("budget_explainer_materials")
    .upsert(
      { ...key, sections_json: { ...sections, orgImages: images, orgFileName: fileName || null }, updated_at: new Date().toISOString() },
      { onConflict: "department,policy,unit,detail" },
    );
  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
  res.status(200).json({ success: true, count: images.length });
}

// 부서 PDF 자동 분할이 다음 세부사업 페이지까지 꼬리를 물고 들어온 경우처럼, 잘못
// 섞인 페이지 한 장을 지운다. field는 sections_json.images(부서 설명자료) 또는
// sections_json.orgImages(기관 설명자료) 중 하나의 배열에서 index 위치를 제거한다.
async function deletePage(req: any, res: any) {
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
  const sections = await readSections(supabase, key);
  const images = Array.isArray((sections as any)[field]) ? [...(sections as any)[field]] : [];
  if (index >= images.length) {
    res.status(400).json({ success: false, error: "삭제할 페이지를 찾지 못했습니다" });
    return;
  }
  images.splice(index, 1);

  const { error } = await supabase
    .from("budget_explainer_materials")
    .upsert(
      { ...key, sections_json: { ...sections, [field]: images }, updated_at: new Date().toISOString() },
      { onConflict: "department,policy,unit,detail" },
    );
  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
  res.status(200).json({ success: true, count: images.length });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { action } = req.body ?? {};
    if (action === "saveOrg") {
      await saveOrg(req, res);
    } else if (action === "deletePage") {
      await deletePage(req, res);
    } else {
      res.status(400).json({ success: false, error: "알 수 없는 action입니다" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
