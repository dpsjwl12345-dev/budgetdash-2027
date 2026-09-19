import { createClient } from "@supabase/supabase-js";

// Vercel의 Node 함수 번들러는 api/ 밖의 상대경로 import(shared/*)를 포함시키지 않으므로
// (ERR_MODULE_NOT_FOUND) 각 함수 파일에 자기 완결적으로 둔다.
//
// Hobby 플랜은 배포당 서버리스 함수를 최대 12개까지만 허용한다. 부서 설명자료 페이지
// 삭제와 기관(재단·공사) 설명자료 저장/삭제를 각각 별도 파일로 두면 한도를 넘기므로,
// action으로 분기하는 파일 하나에 합쳐 둔다.
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// 부서 PDF 자동 분할이 다음 세부사업 페이지까지 꼬리를 물고 들어온 경우처럼, 잘못
// 섞인 페이지 한 장을 지운다 (sections_json.images에서 index 위치 제거).
async function deletePage(req: any, res: any) {
  const { department, policy, unit, detail, index } = req.body ?? {};
  if (!department || !policy || !unit || !detail || typeof index !== "number" || index < 0) {
    res.status(400).json({ success: false, error: "부서, 세부사업, index가 필요합니다" });
    return;
  }

  const supabase = getSupabaseAdmin();
  // 트리가 보여주는 정책/단위는 편성시트 계층 기준이고 저장된 행은 설명자료 PDF 기준일
  // 수 있다. 정확히 일치하는 행을 먼저 찾고 없으면 부서+세부사업으로 찾은 뒤, 새 행을
  // 만들지 않도록 항상 그 행의 id로 수정한다.
  const { data: exact, error: readError } = await supabase
    .from("budget_explainer_materials")
    .select("id, sections_json")
    .eq("department", String(department))
    .eq("policy", String(policy))
    .eq("unit", String(unit))
    .eq("detail", String(detail))
    .maybeSingle();
  if (readError) {
    res.status(500).json({ success: false, error: readError.message });
    return;
  }

  let target = exact;
  if (!target) {
    const { data: byDetail, error: byDetailError } = await supabase
      .from("budget_explainer_materials")
      .select("id, sections_json")
      .eq("department", String(department))
      .eq("detail", String(detail))
      .order("id")
      .limit(1);
    if (byDetailError) {
      res.status(500).json({ success: false, error: byDetailError.message });
      return;
    }
    target = byDetail?.[0] ?? null;
  }
  if (!target) {
    res.status(404).json({ success: false, error: "해당 세부사업의 설명자료를 찾지 못했습니다" });
    return;
  }

  const sections = target.sections_json && typeof target.sections_json === "object" ? target.sections_json : {};
  const images = Array.isArray((sections as any).images) ? [...(sections as any).images] : [];
  if (index >= images.length) {
    res.status(400).json({ success: false, error: "삭제할 페이지를 찾지 못했습니다" });
    return;
  }
  images.splice(index, 1);

  const { error } = await supabase
    .from("budget_explainer_materials")
    .update({ sections_json: { ...sections, images }, updated_at: new Date().toISOString() })
    .eq("id", target.id);
  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
  res.status(200).json({ success: true, count: images.length });
}

// 재단·공사 등 기관이 세부사업 트리와 무관하게 통째로 제출한 PDF를 기관 하나 단위로
// 저장한다. institution 이름은 화면에서 자유 텍스트로 만들어 붙인다(고정 목록 아님).
// images가 빈 배열이면 "이름만 먼저 만들어두기"에 해당한다.
async function saveInstitution(req: any, res: any) {
  const { department, institution, fileName, images } = req.body ?? {};
  if (!department || !institution || !Array.isArray(images)) {
    res.status(400).json({ success: false, error: "부서, 기관명, 이미지 목록이 필요합니다" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const key = { department: String(department), institution: String(institution) };
  const { error } = await supabase
    .from("institution_materials")
    .upsert(
      { ...key, images, file_name: fileName || null, uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "department,institution" },
    );
  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
  res.status(200).json({ success: true, count: images.length });
}

// 기관 설명자료도 부서 설명자료와 동일하게 페이지 한 장을 지울 수 있게 한다.
async function deleteInstitutionPage(req: any, res: any) {
  const { department, institution, index } = req.body ?? {};
  if (!department || !institution || typeof index !== "number" || index < 0) {
    res.status(400).json({ success: false, error: "부서, 기관명, index가 필요합니다" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const key = { department: String(department), institution: String(institution) };
  const { data: current, error: readError } = await supabase
    .from("institution_materials")
    .select("images")
    .match(key)
    .maybeSingle();
  if (readError) {
    res.status(500).json({ success: false, error: readError.message });
    return;
  }
  const images = Array.isArray(current?.images) ? [...current.images] : [];
  if (index >= images.length) {
    res.status(400).json({ success: false, error: "삭제할 페이지를 찾지 못했습니다" });
    return;
  }
  images.splice(index, 1);

  const { error } = await supabase
    .from("institution_materials")
    .upsert({ ...key, images, updated_at: new Date().toISOString() }, { onConflict: "department,institution" });
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
    if (action === "deletePage") {
      await deletePage(req, res);
    } else if (action === "saveInstitution") {
      await saveInstitution(req, res);
    } else if (action === "deleteInstitutionPage") {
      await deleteInstitutionPage(req, res);
    } else {
      res.status(400).json({ success: false, error: "알 수 없는 action입니다" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
