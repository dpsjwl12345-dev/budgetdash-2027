import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type EvidenceInput = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    const { department, policy, unit, detail, evidence } = req.body ?? {};
    if (!department || !policy || !unit || !detail || !evidence?.name || !evidence?.dataUrl) {
      res.status(400).json({ success: false, error: "부서, 세부사업, 증빙자료가 필요합니다" });
      return;
    }

    const item: EvidenceInput = {
      name: String(evidence.name),
      type: String(evidence.type || "application/octet-stream"),
      size: Number(evidence.size || 0),
      dataUrl: String(evidence.dataUrl),
    };
    if (item.size <= 0 || item.size > 2 * 1024 * 1024) {
      res.status(400).json({ success: false, error: "증빙자료는 2MB 이하만 등록할 수 있습니다" });
      return;
    }
    if (!item.dataUrl.startsWith("data:")) {
      res.status(400).json({ success: false, error: "올바른 파일 데이터가 아닙니다" });
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
    const evidenceList = Array.isArray((sections as any).evidence) ? (sections as any).evidence : [];
    const nextEvidence = [...evidenceList.filter((entry: EvidenceInput) => entry.name !== item.name), item].slice(-10);
    const { error: saveError } = await supabase
      .from("budget_explainer_materials")
      .upsert(
        { ...key, sections_json: { ...sections, evidence: nextEvidence }, updated_at: new Date().toISOString() },
        { onConflict: "department,policy,unit,detail" },
      );
    if (saveError) {
      res.status(500).json({ success: false, error: saveError.message });
      return;
    }

    res.status(200).json({ success: true, count: nextEvidence.length });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
}
