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

  // .select('*')는 한 번에 최대 1000행까지만 반환된다(PostgREST 기본값). budget_hierarchy_rows는
  // 전체가 9,000행을 훌쩍 넘고, 부서 지정 없이 부르면(department 없이) 한 부서 크기도 쉽게
  // 넘어갈 수 있어 .range()로 끝까지 페이지네이션한다.
  const pageSize = 1000;
  let from = 0;
  let data: any[] = [];
  let queryError: any = null;
  while (true) {
    let query = supabase
      .from('budget_hierarchy_rows')
      .select('*')
      .order('sort_order', { ascending: true })
      .range(from, from + pageSize - 1);
    if (department) query = query.eq('department', department);

    const { data: page, error } = await query;
    if (error) { queryError = error; break; }
    if (!page || page.length === 0) break;
    data = data.concat(page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  const error = queryError;
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

  // 이전에는 "새 행 upsert → id NOT IN (새 id 목록)으로 옛 행 삭제" 순서였는데,
  // 부서 행 수가 많아지면 NOT IN 필터에 수백 개 id를 다 나열한 URL이 너무 길어져
  // 삭제 요청 자체가 조용히 실패했다. 업로드할 때마다 새 id가 매번 새로 생성되므로
  // (upload-<timestamp>-<index>) 어차피 이전 행과 겹치는 id가 없어 "부분 정리"는
  // 애초에 의미가 없었다 — 그래서 부서 전체를 먼저 지우고 새로 넣는 방식으로 바꿔
  // 옛 업로드 회차가 계속 누적/혼합되는 문제를 근본적으로 없앤다.
  const { error: deleteError } = await supabase
    .from('budget_hierarchy_rows')
    .delete()
    .eq('department', department);
  if (deleteError) {
    res.status(200).json({ success: false, message: "저장 실패(기존 데이터 정리 실패)", error: deleteError.message });
    return;
  }

  const { error: insertError } = await supabase
    .from('budget_hierarchy_rows')
    .insert(dbRows);

  if (insertError) {
    res.status(200).json({ success: false, message: "저장 실패", error: insertError.message });
    return;
  }

  res.status(200).json({ success: true, message: "저장 완료" });
}

async function loadMemos(req: any, res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ data: null });
    return;
  }

  const department = req.query?.department;
  let query = supabase.from('budget_program_memos').select('*');
  if (department) query = query.eq('department', department);

  const { data, error } = await query;
  if (error) {
    res.status(200).json({ data: null });
    return;
  }

  const programMemos: Record<string, string> = {};
  const hiddenMemoIds: string[] = [];
  (data || []).forEach((row: any) => {
    if (row.memo) programMemos[row.id] = row.memo;
    if (row.hidden) hiddenMemoIds.push(row.id);
  });

  res.status(200).json({ data: { programMemos, hiddenMemoIds } });
}

async function saveMemos(req: any, res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ success: false, message: "저장 실패 (환경 변수 누락)" });
    return;
  }

  const programMemos = req.body?.programMemos && typeof req.body.programMemos === 'object' ? req.body.programMemos : {};
  const hiddenMemoIds: string[] = Array.isArray(req.body?.hiddenMemoIds) ? req.body.hiddenMemoIds : [];
  const keys = Array.from(new Set([...Object.keys(programMemos), ...hiddenMemoIds]));

  if (keys.length === 0) {
    res.status(200).json({ success: true, message: "저장할 메모가 없습니다." });
    return;
  }

  // 메모 키는 "부서::세부사업명" 형태(department::programLabel)라 부서명을 직접 뽑아낼 수 있다.
  const rows = keys.map((key) => ({
    id: key,
    department: key.split('::')[0] || '미분류',
    memo: programMemos[key] ?? null,
    hidden: hiddenMemoIds.includes(key),
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase.from('budget_program_memos').upsert(rows, { onConflict: 'id' });
  if (upsertError) {
    res.status(200).json({ success: false, message: "저장 실패", error: upsertError.message });
    return;
  }

  res.status(200).json({ success: true, message: "저장 완료" });
}

async function loadIssues(res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ data: null });
    return;
  }
  const { data, error } = await supabase.from('department_issues').select('*');
  if (error) {
    res.status(200).json({ data: null });
    return;
  }
  const issues: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    try {
      issues[row.department] = row.issues ? JSON.parse(row.issues) : { memos: [] };
    } catch {
      issues[row.department] = { memos: [] };
    }
  });
  res.status(200).json({ data: issues });
}

async function saveIssues(req: any, res: any) {
  const supabase = getClient();
  if (!supabase) {
    res.status(200).json({ success: false, message: "저장 실패 (환경 변수 누락)" });
    return;
  }
  const issuesData = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
  const rows = Object.entries(issuesData).map(([department, value]) => ({
    department,
    issues: JSON.stringify(value),
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) {
    res.status(200).json({ success: true, message: "저장할 쟁점사항이 없습니다." });
    return;
  }

  const { error: upsertError } = await supabase.from('department_issues').upsert(rows, { onConflict: 'department' });
  if (upsertError) {
    res.status(200).json({ success: false, message: "저장 실패", error: upsertError.message });
    return;
  }

  res.status(200).json({ success: true, message: "저장 완료" });
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
      if (type === 'memos') return await loadMemos(req, res);
      if (type === 'issues') return await loadIssues(res);
      return await loadHierarchy(req, res);
    }

    if (req.method === 'POST') {
      if (type === 'staff') return await saveStaff(req, res);
      if (type === 'memos') return await saveMemos(req, res);
      if (type === 'issues') return await saveIssues(req, res);
      return await saveHierarchy(req, res);
    }

    res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), message: "처리 중 오류가 발생했습니다." });
  }
}
