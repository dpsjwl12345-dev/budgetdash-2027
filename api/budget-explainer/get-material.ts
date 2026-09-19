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
    const { department, policy, unit, detail, institution } = req.query ?? {};

    if (!department) {
      res.status(400).json({ error: "필수 정보가 부족합니다" });
      return;
    }

    const supabase = getSupabaseAdmin();

    // institution이 있으면 세부사업 트리와 무관한 기관(재단·공사 등) 단위 설명자료 조회.
    // 페이지가 많은 문서를 한 번에 다 보내면 함수 시간·메모리 한도에 걸리므로
    // offset/limit으로 나눠서 내려주고, 클라이언트가 이어서 받아 채운다.
    if (institution) {
      const offset = Number(req.query?.offset ?? 0) || 0;
      const limit = Math.min(Number(req.query?.limit ?? 10) || 10, 30);

      const { data: meta, error: metaError } = await supabase
        .from("institution_materials")
        .select("file_name, uploaded_at")
        .eq("department", String(department))
        .eq("institution", String(institution))
        .maybeSingle();
      if (metaError) {
        res.status(500).json({ error: metaError.message });
        return;
      }

      const { count, error: countError } = await supabase
        .from("institution_material_pages")
        .select("page_no", { count: "exact", head: true })
        .eq("department", String(department))
        .eq("institution", String(institution));
      if (countError) {
        res.status(500).json({ error: countError.message });
        return;
      }

      const { data: pages, error: pagesError } = await supabase
        .from("institution_material_pages")
        .select("page_no, image")
        .eq("department", String(department))
        .eq("institution", String(institution))
        .order("page_no")
        .range(offset, offset + limit - 1);
      if (pagesError) {
        res.status(500).json({ error: pagesError.message });
        return;
      }

      res.status(200).json({
        data: {
          file_name: meta?.file_name ?? null,
          uploaded_at: meta?.uploaded_at ?? null,
          images: (pages || []).map((row: any) => row.image),
          offset,
          total: count ?? 0,
        },
      });
      return;
    }

    if (!policy || !unit || !detail) {
      res.status(400).json({ error: "필수 정보가 부족합니다" });
      return;
    }

    // 트리는 편성시트 계층의 정책/단위를 보여주지만 저장된 행은 설명자료 PDF에 적힌
    // 정책/단위를 갖고 있을 수 있다(같은 세부사업인데 단위사업 이름이 다른 경우가 많다).
    // 그래서 정확히 일치하는 행을 먼저 찾고, 없으면 부서+세부사업으로 다시 찾는다.
    const { data: exact, error } = await supabase
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
    if (exact) {
      res.status(200).json({ data: exact });
      return;
    }

    const { data: byDetail, error: byDetailError } = await supabase
      .from("budget_explainer_materials")
      .select("*")
      .eq("department", String(department))
      .eq("detail", String(detail))
      .order("id")
      .limit(1);
    if (byDetailError) {
      res.status(500).json({ error: byDetailError.message });
      return;
    }

    res.status(200).json({ data: byDetail?.[0] ?? null });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
}
