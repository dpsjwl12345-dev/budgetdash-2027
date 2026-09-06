import { getSupabaseAdmin } from "../../shared/supabase";

type MaterialInput = {
  policy: string;
  unit: string;
  detail: string;
  sections: Record<string, string>;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { department, fileName, materials } = req.body ?? {};

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
        sections_json: m.sections,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: "저장할 세부사업을 찾지 못했습니다" });
      return;
    }

    const supabase = getSupabaseAdmin();
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
