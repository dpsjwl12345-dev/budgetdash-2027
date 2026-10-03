import { Fragment, useMemo, useState } from "react";

// 편성 부서 "전체": 국별로 묶어 부서마다 2027 요구액을 2026 본예산(예산서 기정액)·3추와 견준다.
// 지방채 상환은 2027년에 처음 부서별로 나눠 넣은 항목이라 "지방채 빼면" 칸을 따로 둔다.
type HierarchyRow = { id: string; level: string; label: string; budget?: number; previous?: number };

const BUREAUS = [
  { name: "문화관광국", departments: ["문화예술과", "문화유산과", "관광진흥과", "독립기념관"] },
  { name: "교육체육국", departments: ["체육진흥과", "교육지원과", "도서관정책과", "평생학습과", "전국체전추진단"] },
];
const DEBT_PROGRAM = "지방채 상환";

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
const TOP_BUDGET: React.CSSProperties = { color: "#ffffff", background: "#2f6fd6" };
const TOP_INCREASE: React.CSSProperties = { color: "#ffffff", background: "#d9480f", fontWeight: 700 };
const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #dde3ea", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
const head: React.CSSProperties = { padding: "11px 12px", color: "#ffffff", fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.15)" };

export default function AllDepartmentsOverview({ rows, supp3ByDepartment }: { rows: HierarchyRow[]; supp3ByDepartment: Record<string, number | null> }) {
  const [openDepartment, setOpenDepartment] = useState<string | null>("문화예술과");

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

  const sumOf = (list: DeptSummary[]) => list.reduce(
    (total, item) => ({ budget: total.budget + item.budget, previous: total.previous + item.previous, supp3: total.supp3 + (item.supp3 ?? 0), debt: total.debt + item.debt }),
    { budget: 0, previous: 0, supp3: 0, debt: 0 },
  );
  const bureaus = BUREAUS.map((bureau) => {
    const list = bureau.departments.map((name) => summaries.get(name)).filter((item): item is DeptSummary => !!item)
      .sort((a, b) => (b.budget - (b.supp3 ?? b.previous)) - (a.budget - (a.supp3 ?? a.previous)));
    return { ...bureau, list, total: sumOf(list) };
  });
  const grand = sumOf(bureaus.flatMap((bureau) => bureau.list));
  const grandIncrease = grand.budget - grand.supp3;
  // 부서 가운데 2027 요구액이 가장 큰 곳과 3추 대비 증감액이 가장 큰 곳은 칸 색을 따로 칠한다.
  const allDepartments = bureaus.flatMap((bureau) => bureau.list);
  const increaseOf = (item: DeptSummary) => item.budget - (item.supp3 ?? item.previous);
  const topBudget = allDepartments.reduce<DeptSummary | undefined>((top, item) => (!top || item.budget > top.budget ? item : top), undefined)?.name;
  const topIncrease = allDepartments.reduce<DeptSummary | undefined>((top, item) => (!top || increaseOf(item) > increaseOf(top) ? item : top), undefined)?.name;

  const amountCells = (total: { budget: number; previous: number; supp3: number | null; debt: number }, strong = false, mark: { budget?: boolean; increase?: boolean } = {}) => {
    const increase = total.supp3 === null ? null : total.budget - total.supp3;
    const tone = (value: number | null) => (value !== null && value < 0 ? "#c0392b" : undefined);
    const weight = strong ? 700 : 500;
    return (
      <>
        <td style={{ ...cell, fontWeight: 700, ...(mark.budget ? TOP_BUDGET : { color: "#0f4c9e", background: "rgba(47, 111, 214, 0.10)" }) }} title={mark.budget ? "요구액이 가장 큰 부서" : undefined}>{toMillion(total.budget)}</td>
        <td style={cell}>{toMillion(total.previous)}</td>
        <td style={{ ...cell, fontWeight: 600 }}>{percent(total.budget, total.previous)}</td>
        <td style={cell}>{total.supp3 === null ? "-" : toMillion(total.supp3)}</td>
        <td style={{ ...cell, fontWeight: 700, color: tone(increase) }}>{percent(total.budget, total.supp3)}</td>
        <td style={{ ...cell, fontWeight: weight, color: tone(increase), ...(mark.increase ? TOP_INCREASE : {}) }} title={mark.increase ? "3추 대비 증감액이 가장 큰 부서" : undefined}>{increase === null ? "-" : signedMillion(increase)}</td>
        <td style={cell}>{total.debt ? toMillion(total.debt) : "-"}</td>
        <td style={{ ...cell, fontWeight: 600, color: tone(increase === null ? null : increase - total.debt) }}>{percent(total.budget - total.debt, total.supp3)}</td>
      </>
    );
  };

  return (
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
              <th style={{ ...head, background: "#2f6fd6" }}>2027 요구액</th>
              <th style={head}>기정액(본)</th>
              <th style={head}>본 대비</th>
              <th style={head}>2026 3추</th>
              <th style={head}>3추 대비</th>
              <th style={head}>3추 대비 증감액</th>
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
                <tr style={{ background: "#e3e9f1" }}>
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
                        style={{ cursor: "pointer", background: open ? "#f4f7fb" : undefined }}
                        title="눌러서 증가 요인 세부사업 보기"
                      >
                        <td style={{ ...cell, textAlign: "left", paddingLeft: "26px", fontWeight: 600 }}>{open ? "▾" : "▸"} {dept.name}</td>
                        {amountCells(dept, false, { budget: dept.name === topBudget, increase: dept.name === topIncrease })}
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={9} style={{ padding: "8px 16px 14px 44px", borderBottom: "1px solid #dde3ea", background: "#f4f7fb", fontSize: "14px" }}>
                            <div style={{ color: "#4b5563", marginBottom: "6px" }}>기정액(본) 대비 증가가 큰 세부사업 · 신규 세부사업 {dept.newCount}개</div>
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
      <p style={{ margin: "8px 0 0", color: "#c3cdd9", fontSize: "13px" }}>
        <span style={{ display: "inline-block", padding: "0 6px", marginRight: "4px", borderRadius: "3px", ...TOP_BUDGET }}>요구액 최대</span>
        <span style={{ display: "inline-block", padding: "0 6px", marginRight: "10px", borderRadius: "3px", ...TOP_INCREASE }}>증감액 최대</span>
        ※ 3추는 부서별 2026 예산액 설정값(세출예산서). 지방채 상환은 2026년에 없던 항목으로 시 전체 지방채 원금 상환을 부서에 나눈 것이라 "지방채 빼면"을 따로 계산.
      </p>
    </section>
  );
}
