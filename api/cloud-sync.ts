import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function loadHierarchy(req: any, res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ data: null });
    return;
  }

  const department = req.query?.department;
  let query = supabase
    .from('budget_hierarchy_rows')
    .select('*');

  if (department) {
    query = query.eq('department', department);
  }

  const { data, error } = await query.order('sort_order', { ascending: true });
  console.log(`[loadHierarchy] dept=${department}, rows=${data?.length || 0}, error=${error?.message}`);

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

  const department = req.body?.department;
  if (!department) {
    res.status(200).json({ success: false, message: "부서 정보가 필요합니다" });
    return;
  }

  const rows = Array.isArray(req.body?.data) ? req.body.data : [];
  if (rows.length === 0) {
    res.status(200).json({ success: false, message: "저장할 데이터가 없습니다." });
    return;
  }

  const dbRows = rows.map((row: any, index: number) => ({
    id: String(row.id),
    department: department,
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
    res.status(200).json({ success: false, message: "저장 실패", error: upsertError.message });
    return;
  }

  const ids = dbRows.map((row: any) => row.id);
  let cleanupWarning: string | undefined;
  if (ids.length > 0) {
    const { error: cleanupError } = await supabase
      .from('budget_hierarchy_rows')
      .delete()
      .eq('department', department)
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
    res.status(200).json({ success: false, message: "저장 실패", error: upsertError.message });
    return;
  }
  res.status(200).json({ success: true, message: "저장 완료" });
}

export default async function handler(req: any, res: any) {
  try {
    const type = req.query?.type;

    if (req.method === 'GET') {
      if (type === 'staff') return await loadStaff(res);
      return await loadHierarchy(req, res);
    }

    if (req.method === 'POST') {
      if (type === 'staff') return await saveStaff(req, res);
      return await saveHierarchy(req, res);
    }

    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), message: "처리 중 오류가 발생했습니다." });
  }
}
