import { Fragment, useMemo, useState } from "react";

// 편성 부서 "전체": 국별로 묶어(국마다 행 바탕색을 옅게 달리 칠한다) 부서마다 2027 요구액을 2026 본예산(예산서 기정액)·3추와 견준다.
// 지방채 상환은 2027년에 처음 부서별로 나눠 넣은 항목이라 "지방채 빼면" 칸을 따로 둔다.
type HierarchyRow = { id: string; level: string; label: string; budget?: number; previous?: number; statisticsCode?: string; description?: string };

const BUREAUS = [
  { name: "문화관광국", departments: ["문화예술과", "문화유산과", "독립기념관", "관광진흥과"], tint: "rgba(232, 89, 12, 0.07)", headTint: "rgba(232, 89, 12, 0.16)" },
  { name: "교육체육국", departments: ["교육지원과", "평생학습과", "도서관정책과", "체육진흥과", "전국체전추진단"], tint: "rgba(18, 140, 90, 0.07)", headTint: "rgba(18, 140, 90, 0.16)" },
];
const DEBT_PROGRAM = "지방채 상환";

// 홍보 관련 예산: 부기명(○ 산출근거 줄) 이름에 아래 말이 들어간 줄만 모은다.
// 홍보 성격이 있어도 이름에 표시가 없는 줄(기념품·영상제작·행사 등)은 넣지 않는다.
const PROMO_PATTERN = /홍보|SNS|광고|현수막|리플렛|리플릿|팸플릿|포스터|브로슈어|배너|굿즈|캐릭터|(?<![A-Za-z])BI(?![A-Za-z])/;
// 산출근거 칸 "40,000,000원 = 40,000"에서 "=" 뒤의 천원 금액을 읽는다.
const readThousand = (description?: string) => {
  const match = String(description ?? "").match(/=\s*([\d,]+)\s*$/);
  return match ? Number(match[1].replace(/,/g, "")) || 0 : 0;
};
type PromoLine = { note: string; amount: number; stat: string };
type PromoProgram = { name: string; lines: PromoLine[]; total: number };
type PromoDepartment = { name: string; programs: PromoProgram[]; total: number; count: number };

type DeptSummary = {
  name: string;
  budget: number;
  previous: number;
  supp3: number | null;
  debt: number;
  newCount: number;
  drivers: { label: string; budget: number; previous: number }[];
};

const toMillion = (value: number) => Math.round(value / 1000).toLocaleString("ko-KR");
const signedMillion = (value: number) => `${value > 0 ? "+" : value < 0 ? "△" : ""}${toMillion(Math.abs(value))}`;
const percent = (amount: number, base: number | null) => {
  if (!base) return "-";
  const value = (amount / base - 1) * 100;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const NAVY = "#1e3a5f";
const TOP_BUDGET: React.CSSProperties = { color: "#e8590c", fontWeight: 800 };
const TOP_INCREASE: React.CSSProperties = { color: "#7048e8", fontWeight: 800 };
const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #dde3ea", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
const head: React.CSSProperties = { padding: "11px 12px", color: "#ffffff", fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.15)" };

export default function AllDepartmentsOverview({ rows, supp3ByDepartment }: { rows: HierarchyRow[]; supp3ByDepartment: Record<string, number | null> }) {
  const [openDepartment, setOpenDepartment] = useState<string | null>("문화예술과");
  // 홍보 관련 예산 표: 표 전체와 부서별로 접고 펼친다(처음에는 모두 펼쳐 둔다).
  const [promoOpen, setPromoOpen] = useState(true);
  const [collapsedPromoDepartments, setCollapsedPromoDepartments] = useState<Set<string>>(new Set());
  const togglePromoDepartment = (name: string) => setCollapsedPromoDepartments((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const summaries = useMemo(() => {
    const map = new Map<string, DeptSummary>();
    let current: DeptSummary | undefined;
    for (const row of rows) {
      if (row.level === "dept") {
        current = map.get(row.label) ?? { name: row.label, budget: 0, previous: 0, supp3: supp3ByDepartment[row.label] ?? null, debt: 0, newCount: 0, drivers: [] };
        current.budget += row.budget ?? 0;
        current.previous += row.previous ?? 0;
        map.set(row.label, current);
      } else if (row.level === "program" && current) {
        const budget = row.budget ?? 0;
        const previous = row.previous ?? 0;
        if (row.label === DEBT_PROGRAM) current.debt += budget;
        if (!previous && budget > 0) current.newCount += 1;
        current.drivers.push({ label: row.label, budget, previous });
      }
    }
    map.forEach((summary) => summary.drivers.sort((a, b) => (b.budget - b.previous) - (a.budget - a.previous)).splice(5));
    return map;
  }, [rows, supp3ByDepartment]);

  // 부서 → 세부사업 → 홍보 관련 부기명. ○ 줄 아래의 ㅇ 세부 줄은 ○ 줄 금액에 이미 들어 있으므로
  // ○ 줄이 홍보 줄이면 세부 줄은 세지 않고, ○ 줄이 아닌데 세부 줄만 해당하면 그 줄을 센다.
  const promo = useMemo(() => {
    const names = new Set(BUREAUS.flatMap((bureau) => bureau.departments));
    const byDepartment = new Map<string, Map<string, PromoLine[]>>();
    let department = "";
    let program = "";
    let stat = "";
    let parentCounted = false;
    for (const row of rows) {
      if (row.level === "dept") { department = row.label; program = ""; stat = ""; parentCounted = false; }
      else if (row.level === "program") { program = row.label; stat = ""; parentCounted = false; }
      else if (row.level === "item") { stat = (row.statisticsCode ?? "").replace(/^\s*\d+\s*/, ""); parentCounted = false; }
      else if (row.level === "note" && names.has(department) && program) {
        const text = (row.statisticsCode ?? "").trim();
        const isParent = text.startsWith("○");
        const matched = PROMO_PATTERN.test(text);
        if (isParent) parentCounted = matched;
        if (!matched || (!isParent && parentCounted)) continue;
        const programs = byDepartment.get(department) ?? new Map<string, PromoLine[]>();
        const lines = programs.get(program) ?? [];
        lines.push({ note: text.replace(/^[○ㅇ\s]+/, ""), amount: readThousand(row.description), stat });
        programs.set(program, lines);
        byDepartment.set(department, programs);
      }
    }
    const departments: PromoDepartment[] = [];
    BUREAUS.forEach((bureau) => bureau.departments.forEach((name) => {
      const programs = byDepartment.get(name);
      if (!programs) return;
      const list: PromoProgram[] = Array.from(programs, ([programName, lines]) => ({ name: programName, lines, total: lines.reduce((sum, line) => sum + line.amount, 0) }));
      departments.push({ name, programs: list, total: list.reduce((sum, item) => sum + item.total, 0), count: list.reduce((sum, item) => sum + item.lines.length, 0) });
    }));
    return { departments, total: departments.reduce((sum, item) => sum + item.total, 0), count: departments.reduce((sum, item) => sum + item.count, 0) };
  }, [rows]);

  const sumOf = (list: DeptSummary[]) => list.reduce(
    (total, item) => ({ budget: total.budget + item.budget, previous: total.previous + item.previous, supp3: total.supp3 + (item.supp3 ?? 0), debt: total.debt + item.debt }),
    { budget: 0, previous: 0, supp3: 0, debt: 0 },
  );
  const bureaus = BUREAUS.map((bureau) => {
    // 부서 순서는 편성 부서 선택 목록과 같은 고정 순서.
    const list = bureau.departments.map((name) => summaries.get(name)).filter((item): item is DeptSummary => !!item);
    return { ...bureau, list, total: sumOf(list) };
  });
  const grand = sumOf(bureaus.flatMap((bureau) => bureau.list));
  const grandIncrease = grand.budget - grand.supp3;
  // 부서 가운데 2027 요구액이 가장 큰 곳과 3추 대비 증감액이 가장 큰 곳은 칸 색을 따로 칠한다.
  const allDepartments = bureaus.flatMap((bureau) => bureau.list);
  const increaseOf = (item: DeptSummary) => item.budget / (item.supp3 || item.previous || 1);
  const topBudget = allDepartments.reduce<DeptSummary | undefined>((top, item) => (!top || item.budget > top.budget ? item : top), undefined)?.name;
  const topIncrease = allDepartments.reduce<DeptSummary | undefined>((top, item) => (!top || increaseOf(item) > increaseOf(top) ? item : top), undefined)?.name;

  const amountCells = (total: { budget: number; previous: number; supp3: number | null; debt: number }, strong = false, mark: { budget?: boolean; increase?: boolean } = {}) => {
    const increase = total.supp3 === null ? null : total.budget - total.supp3;
    const tone = (value: number | null) => (value !== null && value < 0 ? "#c0392b" : undefined);
    return (
      <>
        <td style={{ ...cell, fontWeight: 700, ...(mark.budget ? TOP_BUDGET : { color: "#0f4c9e" }) }} title={mark.budget ? "요구액이 가장 큰 부서" : undefined}>{toMillion(total.budget)}</td>
        <td style={cell}>{toMillion(total.previous)}</td>
        <td style={{ ...cell, fontWeight: 600 }}>{percent(total.budget, total.previous)}</td>
        <td style={cell}>{total.supp3 === null ? "-" : toMillion(total.supp3)}</td>
        <td style={{ ...cell, fontWeight: 700, color: tone(increase), ...(mark.increase ? TOP_INCREASE : {}) }} title={mark.increase ? "3추 대비 증가율이 가장 큰 부서" : undefined}>{percent(total.budget, total.supp3)}</td>
        <td style={cell}>{total.debt ? toMillion(total.debt) : "-"}</td>
        <td style={{ ...cell, fontWeight: 600, color: tone(increase === null ? null : increase - total.debt) }}>{percent(total.budget - total.debt, total.supp3)}</td>
      </>
    );
  };

  return (
    <>
    <section className="table-section" style={{ marginTop: "18px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", alignItems: "baseline", marginBottom: "10px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", color: "#e8eef6" }}>부서별 2027 요구 증감</h2>
        <span style={{ color: "#c3cdd9", fontSize: "14px" }}>
          9개 부서 합계 {toMillion(grand.budget)} · 3추 대비 {signedMillion(grandIncrease)} ({percent(grand.budget, grand.supp3)}) · 지방채 상환 {toMillion(grand.debt)} 빼면 {percent(grand.budget - grand.debt, grand.supp3)}
        </span>
        <span style={{ marginLeft: "auto", color: "#c3cdd9", fontSize: "13px" }}>[단위: 백만원]</span>
      </div>
      <div className="table-scroll ledger-scrollbar" style={{ overflowX: "auto", border: "1px solid #b7c2cf" }}>
        <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse", background: "#ffffff", color: "#1a2129", fontSize: "15px" }}>
          <thead>
            <tr style={{ background: NAVY }}>
              <th style={{ ...head, width: "190px" }}>국 · 부서</th>
              <th style={head}>2027 요구액</th>
              <th style={head}>본예산</th>
              <th style={head}>본 증감</th>
              <th style={head}>3추 예산</th>
              <th style={head}>3추 증감</th>
              <th style={head}>지방채 상환</th>
              <th style={{ ...head, borderRight: "none" }}>지방채 빼면</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#eef1f5" }}>
              <td style={{ ...cell, textAlign: "left", fontWeight: 700 }}>합계</td>
              {amountCells(grand, true)}
            </tr>
            {bureaus.map((bureau) => (
              <Fragment key={bureau.name}>
                <tr style={{ background: bureau.headTint }}>
                  <td style={{ ...cell, textAlign: "left", fontWeight: 700, color: NAVY }}>{bureau.name}</td>
                  {amountCells(bureau.total, true)}
                </tr>
                {bureau.list.map((dept) => {
                  const open = openDepartment === dept.name;
                  return (
                    <Fragment key={dept.name}>
                      <tr
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => setOpenDepartment(open ? null : dept.name)}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenDepartment(open ? null : dept.name); } }}
                        style={{ cursor: "pointer", background: open ? bureau.headTint : bureau.tint }}
                        title="눌러서 증가 요인 세부사업 보기"
                      >
                        <td style={{ ...cell, textAlign: "left", paddingLeft: "26px", fontWeight: 600 }}>{open ? "▾" : "▸"} {dept.name}</td>
                        {amountCells(dept, false, { budget: dept.name === topBudget, increase: dept.name === topIncrease })}
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} style={{ padding: "8px 16px 14px 44px", borderBottom: "1px solid #dde3ea", background: bureau.tint, fontSize: "14px" }}>
                            <div style={{ color: "#4b5563", marginBottom: "6px" }}>본예산 대비 증가가 큰 세부사업 · 신규 세부사업 {dept.newCount}개</div>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: "4px 24px", maxWidth: "900px" }}>
                              {dept.drivers.map((driver) => (
                                <Fragment key={driver.label}>
                                  <span>{driver.label}</span>
                                  <span style={{ color: "#6b7280", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{driver.previous ? `${toMillion(driver.previous)} → ${toMillion(driver.budget)}` : `신규 ${toMillion(driver.budget)}`}</span>
                                  <strong style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{signedMillion(driver.budget - driver.previous)}</strong>
                                </Fragment>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {promo.departments.length > 0 && (
      <section className="table-section" style={{ marginTop: "26px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", alignItems: "baseline", marginBottom: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#e8eef6" }}>
            <button
              type="button"
              onClick={() => setPromoOpen((open) => !open)}
              aria-expanded={promoOpen}
              title={promoOpen ? "눌러서 표 접기" : "눌러서 표 펼치기"}
              style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <span style={{ display: "inline-block", width: "1em", fontSize: "0.85em" }}>{promoOpen ? "▾" : "▸"}</span>홍보 관련 예산
            </button>
          </h2>
          <span style={{ color: "#c3cdd9", fontSize: "14px" }}>
            {promo.departments.length}개 부서 {promo.count}줄 · 합계 {promo.total.toLocaleString("ko-KR")}천원 (약 {(promo.total / 100000).toFixed(1)}억 원)
          </span>
          <span style={{ marginLeft: "auto", color: "#c3cdd9", fontSize: "13px" }}>[단위: 천원 · 부기명에 홍보·SNS·광고·현수막·리플렛·BI·굿즈·캐릭터가 들어간 줄]</span>
        </div>
        {promoOpen && (
        <div className="table-scroll ledger-scrollbar" style={{ overflowX: "auto", border: "1px solid #b7c2cf" }}>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", background: "#ffffff", color: "#1a2129", fontSize: "15px" }}>
            <thead>
              <tr style={{ background: NAVY }}>
                <th style={{ ...head, width: "180px" }}>부서</th>
                <th style={{ ...head, textAlign: "left" }}>세부사업</th>
                <th style={{ ...head, textAlign: "left" }}>홍보 관련 부기명</th>
                <th style={{ ...head, width: "120px" }}>금액</th>
                <th style={{ ...head, width: "120px", borderRight: "none" }}>소계</th>
              </tr>
            </thead>
            <tbody>
              {promo.departments.map((dept) => {
                const bureau = BUREAUS.find((item) => item.departments.includes(dept.name));
                const collapsed = collapsedPromoDepartments.has(dept.name);
                return (
                  <Fragment key={dept.name}>
                    <tr
                      tabIndex={0}
                      aria-expanded={!collapsed}
                      onClick={() => togglePromoDepartment(dept.name)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); togglePromoDepartment(dept.name); } }}
                      style={{ background: bureau?.headTint, cursor: "pointer" }}
                      title={collapsed ? "눌러서 펼치기" : "눌러서 접기"}
                    >
                      <td colSpan={3} style={{ ...cell, textAlign: "left", fontWeight: 700, color: NAVY }}>{collapsed ? "▸" : "▾"} {dept.name} <span style={{ fontWeight: 500, color: "#4b5563", fontSize: "13px" }}>· {dept.count}줄</span></td>
                      <td style={cell} />
                      <td style={{ ...cell, fontWeight: 800, color: NAVY }}>{dept.total.toLocaleString("ko-KR")}</td>
                    </tr>
                    {!collapsed && dept.programs.map((program) => (
                      <Fragment key={program.name}>
                        {program.lines.map((line, index) => (
                          <tr key={`${program.name}-${index}`} style={{ background: bureau?.tint }}>
                            <td style={cell} />
                            <td style={{ ...cell, textAlign: "left", whiteSpace: "normal", fontWeight: 600 }}>{index === 0 ? program.name : ""}</td>
                            <td style={{ ...cell, textAlign: "left", whiteSpace: "normal" }}>{line.note}{line.stat ? <span style={{ color: "#6b7280", fontSize: "12px" }}> · {line.stat}</span> : null}</td>
                            <td style={cell}>{line.amount ? line.amount.toLocaleString("ko-KR") : "-"}</td>
                            <td style={{ ...cell, fontWeight: 700 }}>{index === program.lines.length - 1 ? program.total.toLocaleString("ko-KR") : ""}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>
    )}
    </>
  );
}
