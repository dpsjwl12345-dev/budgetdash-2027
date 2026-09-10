import { createClient } from '@supabase/supabase-js';
import { loadFromKV, saveToKV } from '../shared/kv';

// Vercel 서버리스 함수 개수 제한 때문에, 예산 편성 시트(hierarchy)와 부서별
// 정원·현원(staff) 클라우드 저장을 별도 파일 대신 이 파일 하나로 합쳐서 처리한다.
// GET/POST /api/cloud-sync?type=hierarchy|staff

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function loadHierarchy(res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ data: null });
    return;
  }
  const { data, error } = await supabase
    .from('budget_hierarchy_rows')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    res.status(200).json({ data: null });
    return;
  }

  const rows = (data || []).map((row: any) => ({
    id: row.id,
    level: row.level,
    label: row.label,
    budget: row.budget ?? undefined,
    previous: row.previous ?? undefined,
    difference: row.difference ?? undefined,
    statisticsCode: row.statistics_code ?? undefined,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? undefined,
    colSpan: row.col_span ?? undefined,
  }));

  res.status(200).json({ data: rows });
}

async function saveHierarchy(req: any, res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ success: false, message: "저장 실패 (환경 변수 누락)" });
    return;
  }

  const rows = Array.isArray(req.body?.data) ? req.body.data : [];
  if (rows.length === 0) {
    res.status(200).json({ success: false, message: "저장할 데이터가 없습니다. 기존 데이터는 유지했습니다." });
    return;
  }

  const dbRows = rows.map((row: any, index: number) => ({
    id: String(row.id),
    level: row.level,
    label: row.label ?? '',
    budget: row.budget ?? null,
    previous: row.previous ?? null,
    difference: row.difference ?? null,
    statistics_code: row.statisticsCode ?? null,
    description: row.description ?? null,
    parent_id: row.parentId ?? null,
    col_span: row.colSpan ?? null,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('budget_hierarchy_rows')
    .upsert(dbRows, { onConflict: 'id' });

  if (upsertError) {
    res.status(200).json({ success: false, message: "저장 실패. 기존 데이터는 유지했습니다.", error: upsertError.message });
    return;
  }

  const ids = dbRows.map((row: any) => row.id);
  let cleanupWarning: string | undefined;
  if (ids.length > 0) {
    const { error: cleanupError } = await supabase
      .from('budget_hierarchy_rows')
      .delete()
      .not('id', 'in', `(${ids.map((id: string) => `"${id}"`).join(',')})`);
    if (cleanupError) cleanupWarning = cleanupError.message;
  }

  res.status(200).json({ success: true, message: cleanupWarning ? "저장 완료 (이전 삭제 항목 정리는 보류됨)" : "저장 완료", warning: cleanupWarning });
}

async function loadStaff(res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ data: null });
    return;
  }
  const { data, error } = await supabase.from('department_staff').select('*');
  if (error) {
    res.status(200).json({ data: null });
    return;
  }
  const staffData: Record<string, { capacity: string; current: string }> = {};
  (data || []).forEach((row: any) => {
    staffData[row.department] = { capacity: row.capacity ?? '', current: row.current_count ?? '' };
  });
  res.status(200).json({ data: staffData });
}

async function saveStaff(req: any, res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ success: false, message: "저장 실패 (환경 변수 누락)" });
    return;
  }
  const staffData = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
  const rows = Object.entries(staffData).map(([department, value]: [string, any]) => ({
    department,
    capacity: value?.capacity ?? '',
    current_count: value?.current ?? '',
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) {
    res.status(200).json({ success: true, message: "저장할 데이터가 없습니다." });
    return;
  }

  const { error: upsertError } = await supabase.from('department_staff').upsert(rows, { onConflict: 'department' });
  if (upsertError) {
    res.status(200).json({ success: false, message: "저장 실패. 기존 데이터는 유지했습니다.", error: upsertError.message });
    return;
  }
  res.status(200).json({ success: true, message: "저장 완료" });
}

async function loadIssues(res: any) {
  const data = await loadFromKV('departmentIssues');
  res.status(200).json({ data });
}

async function saveIssues(req: any, res: any) {
  const data = req.body?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    res.status(400).json({ success: false, error: "유효한 쟁점사항 데이터가 필요합니다." });
    return;
  }
  const success = await saveToKV('departmentIssues', data);
  res.status(200).json({ success, message: success ? "쟁점사항이 클라우드에 저장되었습니다." : "클라우드 저장에 실패했습니다." });
}

export default async function handler(req: any, res: any) {
  try {
    const type = req.query?.type;

    if (req.method === 'GET') {
      if (type === 'staff') return await loadStaff(res);
      if (type === 'issues') return await loadIssues(res);
      return await loadHierarchy(res);
    }

    if (req.method === 'POST') {
      if (type === 'staff') return await saveStaff(req, res);
      if (type === 'issues') return await saveIssues(req, res);
      return await saveHierarchy(req, res);
    }

    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), message: "처리 중 오류가 발생했습니다." });
  }
}
