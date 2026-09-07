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

type MaterialInput = {
  policy: string;
  unit: string;
  detail: string;
  images: string[];
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { department, fileName, materials, replaceExisting } = req.body ?? {};

    if (!department || !Array.isArray(materials) || materials.length === 0) {
      res.status(400).json({ success: false, error: "부서와 설명자료 목록이 필요합니다" });
      return;
    }

    const rows = (materials as MaterialInput[])
      .filter((m) => m.policy && m.unit && m.detail)
      .map((m) => ({
        department: String(department),
        policy: m.policy,
        unit: m.unit,
        detail: m.detail,
        file_name: fileName || null,
        sections_json: { images: m.images ?? [] },
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: "저장할 세부사업을 찾지 못했습니다" });
      return;
    }

    const supabase = getSupabaseAdmin();
    const preservedEvidence = new Map<string, any>();
    if (replaceExisting) {
      const { data: existingRows, error: existingError } = await supabase
        .from("budget_explainer_materials")
        .select("policy, unit, detail, sections_json")
        .eq("department", String(department));
      if (existingError) {
        res.status(500).json({ success: false, error: existingError.message });
        return;
      }
      (existingRows || []).forEach((row: any) => {
        const evidence = row.sections_json?.evidence;
        if (Array.isArray(evidence) && evidence.length > 0) {
          preservedEvidence.set(`${row.policy}\u001f${row.unit}\u001f${row.detail}`, evidence);
        }
      });
      const { error: deleteError } = await supabase
        .from("budget_explainer_materials")
        .delete()
        .eq("department", String(department));
      if (deleteError) {
        res.status(500).json({ success: false, error: deleteError.message });
        return;
      }
    }
    rows.forEach((row: any) => {
      const evidence = preservedEvidence.get(`${row.policy}\u001f${row.unit}\u001f${row.detail}`);
      if (evidence) row.sections_json.evidence = evidence;
    });
    const { error } = await supabase
      .from("budget_explainer_materials")
      .upsert(rows, { onConflict: "department,policy,unit,detail" });

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(200).json({ success: true, count: rows.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
