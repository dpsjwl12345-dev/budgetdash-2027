import { Fragment, useState } from "react";
import { CITYWIDE_OVERVIEW_2027, type CitywideAmountGroup } from "../data/citywideBudgetOverview2027";

// 부서를 아직 고르지 않은 "부서예산요구" 초기 화면에 보여주는 시 전체 세입세출 요구 현황 대시보드.
// 부서별 예산요구서(budgetRows)와 달리, 이 화면의 수치는 그 데이터를 합산한 것이 아니라
// 예산재정과가 보고한 시 전체 스냅샷(CITYWIDE_OVERVIEW_2027, 출처는 그 파일 상단 주석 참고)이다.
// 이 앱이 다루는 부서(문화예술과 등 9개)는 시 전체 예산의 아주 일부이기 때문에, budgetRows를
// 합산한 값을 "시 전체"라고 보여주면 실제보다 훨씬 작은 숫자가 나와 틀린 정보가 된다.

// 카테고리 색(고정 순서, 검증된 다크 팔레트의 1~3번 슬롯). 차트마다 독립된 범례를 갖고 있어
// 두 구성비 차트가 같은 슬롯 순서를 재사용해도 의미가 섞이지 않는다.
const CAT_COLORS = ["#3987e5", "#d95926", "#199e70"] as const;
// "이전 -> 이후"(2026 -> 2027) 비교는 한 색상의 두 단계로 표현한다.
const YEAR_COLORS = { y2026: "#6da7ec", y2027: "#3987e5" } as const;

function fmt(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

// 원본 데이터는 백만원 단위. 억원 단위로 바꿔 보여줄 때 쓴다(1억원 = 100백만원).
function fmtEok(millionWon: number) {
  return fmt(Math.round(millionWon / 100));
}

// 원본 보고서 표기 그대로 부호를 살린다: 감소는 "△", 증감 없음은 "-", 증가는 그대로 숫자.
function fmtDiff(y2026: number, y2027: number) {
  const diff = y2027 - y2026;
  if (diff === 0) return "-";
  return diff > 0 ? `+${fmt(diff)}` : `△${fmt(Math.abs(diff))}`;
}

function groupTotal(group: CitywideAmountGroup, year: "y2026" | "y2027") {
  if (group.subtotal) return group.subtotal[year];
  return group.items.reduce((sum, item) => sum + item[year], 0);
}

function groupLabel(group: CitywideAmountGroup) {
  return group.group || group.items[0]?.name || "";
}

type TooltipState = { x: number; y: number; title: string; lines: { label: string; value: string; color?: string }[] } | null;

function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return (
    <div className="cw-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="status">
      <div className="cw-tooltip-title">{tooltip.title}</div>
      {tooltip.lines.map((line) => (
        <div className="cw-tooltip-row" key={line.label}>
          {line.color && <span className="cw-tooltip-key" style={{ background: line.color }} />}
          <span className="cw-tooltip-label">{line.label}</span>
          <strong className="cw-tooltip-value">{line.value}</strong>
        </div>
      ))}
    </div>
  );
}

type CompositionSegment = { label: string; value: number; prevValue?: number };

function groupsToSegments(groups: readonly CitywideAmountGroup[], year: "y2026" | "y2027" = "y2027"): CompositionSegment[] {
  return groups.map((g) => ({ label: groupLabel(g), value: groupTotal(g, year), prevValue: groupTotal(g, "y2026") }));
}

// 부분-전체(part-to-whole) 구성비 차트. 여러 색을 쓰는 파이/도넛 대신 가로 스택 막대를 쓴다 -
// 항목이 몇 개뿐이라도 막대 하나로 "합쳐서 100%"라는 관계가 파이보다 눈에 더 잘 들어온다.
function CompositionChart({ title, segments, compact = false }: { title: string; segments: CompositionSegment[]; compact?: boolean }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const totals = segments;
  const grandTotal = totals.reduce((sum, t) => sum + t.value, 0) || 1;

  return (
    <div className={compact ? "" : "cw-chart-card"}>
      {title && <h3>{title}</h3>}
      <div
        className="cw-stack-bar"
        onMouseLeave={() => setTooltip(null)}
      >
        {totals.map((t, i) => {
          const pct = (t.value / grandTotal) * 100;
          const showInlineLabel = pct >= 14;
          return (
            <div
              key={t.label}
              className="cw-stack-seg"
              style={{
                flexBasis: `${pct}%`,
                background: CAT_COLORS[i % CAT_COLORS.length],
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === totals.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === totals.length - 1 ? 4 : 0,
              }}
              tabIndex={0}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.closest(".cw-stack-bar") as HTMLElement).getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left,
                  y: -8,
                  title: t.label,
                  lines: [
                    { label: "2027년 요구", value: `${fmt(t.value)} 백만원 (${pct.toFixed(1)}%)`, color: CAT_COLORS[i % CAT_COLORS.length] },
                    ...(t.prevValue !== undefined ? [{ label: "전년 대비", value: fmtDiff(t.prevValue, t.value) }] : []),
                  ],
                });
              }}
              onFocus={() =>
                setTooltip({
                  x: 0,
                  y: -8,
                  title: t.label,
                  lines: [{ label: "2027년 요구", value: `${fmt(t.value)} 백만원 (${pct.toFixed(1)}%)`, color: CAT_COLORS[i % CAT_COLORS.length] }],
                })
              }
              onBlur={() => setTooltip(null)}
              aria-label={`${t.label} ${fmt(t.value)}백만원, ${pct.toFixed(1)}퍼센트`}
            >
              {showInlineLabel && <span className="cw-stack-seg-label">{t.label}</span>}
            </div>
          );
        })}
        <ChartTooltip tooltip={tooltip} />
      </div>
      <ul className="cw-legend">
        {totals.map((t, i) => (
          <li key={t.label}>
            <span className="cw-legend-swatch" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
            <span className="cw-legend-label">{t.label}</span>
            <span className="cw-legend-value">{fmt(t.value)}<span className="cw-legend-unit">백만원</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 히어로 카드 전용 회계별 구성 막대. 아래쪽 "세입/세출 구성" 카드(CompositionChart)와는
// 레이아웃을 따로 가져간다 - 이 막대는 2단(막대+범례)뿐인 훨씬 작은 구성 요소라
// 카드 껍데기·제목 크기 등을 공유하면 오히려 히어로 카드 안에서 어색해진다.
function HeroBreakdownBar({ label, segments }: { label: string; segments: { label: string; value: number }[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const grandTotal = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <div className="cw-hero-bar-block">
      <h4 className="cw-hero-bar-title">{label}</h4>
      <div className="cw-hero-bar" onMouseLeave={() => setTooltip(null)}>
        {segments.map((s, i) => {
          const pct = (s.value / grandTotal) * 100;
          return (
            <div
              key={s.label}
              className="cw-hero-bar-seg"
              style={{
                flexBasis: `${pct}%`,
                background: CAT_COLORS[i % CAT_COLORS.length],
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === segments.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === segments.length - 1 ? 4 : 0,
              }}
              tabIndex={0}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.closest(".cw-hero-bar") as HTMLElement).getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left,
                  y: -8,
                  title: s.label,
                  lines: [{ label: "2027년 요구", value: `${fmtEok(s.value)} 억원 (${pct.toFixed(1)}%)`, color: CAT_COLORS[i % CAT_COLORS.length] }],
                });
              }}
              onFocus={() =>
                setTooltip({
                  x: 0,
                  y: -8,
                  title: s.label,
                  lines: [{ label: "2027년 요구", value: `${fmtEok(s.value)} 억원 (${pct.toFixed(1)}%)`, color: CAT_COLORS[i % CAT_COLORS.length] }],
                })
              }
              onBlur={() => setTooltip(null)}
              aria-label={`${s.label} ${fmtEok(s.value)}억원, ${pct.toFixed(1)}퍼센트`}
            />
          );
        })}
        <ChartTooltip tooltip={tooltip} />
      </div>
      <div className="cw-hero-bar-legend">
        {segments.map((s, i) => (
          <span key={s.label}>
            <i className="cw-hero-bar-swatch" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
            {s.label} <b>{fmtEok(s.value)}</b>억원
          </span>
        ))}
      </div>
    </div>
  );
}

// "이전 -> 이후"(2026년 본예산 -> 2027년 본예산 요구) 총액 비교. 세입/세출 두 범주 × 두 연도.
function ComparisonChart({
  rows,
}: {
  rows: { label: string; y2026: number; y2027: number }[];
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const max = Math.max(...rows.flatMap((r) => [r.y2026, r.y2027]));
  // 눈금은 0 / 절반 / 최댓값을 깔끔한 수로 반올림해 3개만 둔다.
  const niceMax = Math.ceil(max / 1000000) * 1000000;
  const ticks = [0, niceMax / 2, niceMax];
  const barHeight = (value: number) => `${(value / niceMax) * 100}%`;

  return (
    <div className="cw-chart-card cw-comparison-card">
      <h3>세입·세출 총액 비교 (일반회계, 2026년 본예산 → 2027년 본예산 요구)</h3>
      <div className="cw-legend cw-legend--inline">
        <span><span className="cw-legend-swatch" style={{ background: YEAR_COLORS.y2026 }} />2026년 본예산</span>
        <span><span className="cw-legend-swatch" style={{ background: YEAR_COLORS.y2027 }} />2027년 본예산(요구)</span>
      </div>
      <div className="cw-bars" onMouseLeave={() => setTooltip(null)}>
        <div className="cw-bars-scale">
          {ticks.map((tick) => (
            <div className="cw-bars-gridline" key={tick} style={{ top: `${100 - (tick / niceMax) * 100}%` }}>
              <span className="cw-bars-tick-label">{fmt(tick / 1000)}십억</span>
            </div>
          ))}
        </div>
        <div className="cw-bars-plot">
          {rows.map((row) => (
            <div className="cw-bar-group" key={row.label}>
              {(["y2026", "y2027"] as const).map((year) => {
                const value = row[year];
                return (
                  <div className="cw-bar-track" key={year}>
                    <div
                      className="cw-bar"
                      style={{ height: barHeight(value), background: YEAR_COLORS[year] }}
                      tabIndex={0}
                      onMouseMove={(e) => {
                        const rect = (e.currentTarget.closest(".cw-bars") as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top - 40,
                          title: row.label,
                          lines: [{ label: year === "y2026" ? "2026년 본예산" : "2027년 본예산(요구)", value: `${fmt(value)} 백만원`, color: YEAR_COLORS[year] }],
                        });
                      }}
                      onFocus={(e) => {
                        const rect = (e.currentTarget.closest(".cw-bars") as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          x: rect.width / 2,
                          y: 0,
                          title: row.label,
                          lines: [{ label: year === "y2026" ? "2026년 본예산" : "2027년 본예산(요구)", value: `${fmt(value)} 백만원`, color: YEAR_COLORS[year] }],
                        });
                      }}
                      onBlur={() => setTooltip(null)}
                      aria-label={`${row.label} ${year === "y2026" ? "2026년" : "2027년"} ${fmt(value)}백만원`}
                    >
                      {/* 두 막대가 붙어 있어 둘 다 값을 적으면 라벨이 겹친다. 이야기의 중심인
                          2027년(요구) 막대만 직접 라벨을 달고, 2026년 값은 범례·툴팁으로 충분하다. */}
                      {year === "y2027" && <span className="cw-bar-cap-label">{fmt(value)}</span>}
                    </div>
                  </div>
                );
              })}
              <span className="cw-bar-group-label">{row.label}</span>
            </div>
          ))}
        </div>
        <ChartTooltip tooltip={tooltip} />
      </div>
    </div>
  );
}

function AmountTable({
  title,
  groups,
  total,
}: {
  title: string;
  groups: readonly { group: string; items: readonly { name: string; y2026: number; y2027: number; note?: string }[]; subtotal?: { y2026: number; y2027: number } }[];
  total: { y2026: number; y2027: number };
}) {
  return (
    <div className="citywide-panel">
      <h2>{title}</h2>
      <table className="citywide-table">
        <thead>
          <tr>
            <th>구분</th>
            <th>2026년 본예산</th>
            <th>2027년 본예산(요구)</th>
            <th>증감</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.group || g.items[0]?.name}>
              {g.group && (
                <tr className="group-row" key={`${g.group}-head`}>
                  <td colSpan={4}>{g.group}</td>
                </tr>
              )}
              {g.items.map((row) => (
                <tr key={row.name}>
                  <td>
                    {row.name}
                    {row.note && <span className="cw-note">{row.note}</span>}
                  </td>
                  <td>{fmt(row.y2026)}</td>
                  <td>{fmt(row.y2027)}</td>
                  <td>{fmtDiff(row.y2026, row.y2027)}</td>
                </tr>
              ))}
              {g.subtotal && (
                <tr className="subtotal-row" key={`${g.group}-sub`}>
                  <td>{g.group} 소계</td>
                  <td>{fmt(g.subtotal.y2026)}</td>
                  <td>{fmt(g.subtotal.y2027)}</td>
                  <td>{fmtDiff(g.subtotal.y2026, g.subtotal.y2027)}</td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>합계</td>
            <td>{fmt(total.y2026)}</td>
            <td>{fmt(total.y2027)}</td>
            <td>{fmtDiff(total.y2026, total.y2027)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function CitywideBudgetOverview() {
  const data = CITYWIDE_OVERVIEW_2027;
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="citywide-overview">
      <div className="citywide-overview__head">
        <h1>2027년 화성시<br />세입세출 요구현황</h1>
      </div>

      {(() => {
        const total = data.totalsByAccount.find((r) => r.name === "합계")!;
        const general = data.totalsByAccount.find((r) => r.name === "일반회계")!;
        const special = data.totalsByAccount.find((r) => r.name === "특별회계")!;
        return (
          <>
            <div className="cw-hero-section">
              <div className="cw-hero-card">
                <div className="cw-hero-card__head">
                  <span className="cw-hero-asof">기준일 2026. 9. 9.</span>
                </div>
                <div className="cw-hero-row">
                  <div className="cw-hero-box">
                    <span className="cw-hero-label">세입요구(예산규모)</span>
                    <strong className="cw-hero-value">{fmtEok(total.revenue)}<span className="cw-hero-unit">억원</span></strong>
                  </div>
                </div>
                <p className="cw-structure-note">일반회계 + 특별회계(공기업 2 + 특별회계 11)</p>
              </div>
              <span className="cw-hero-equals">=</span>
              <div className="cw-flow-box">
                <span className="cw-hero-label">세출요구액</span>
                <strong className="cw-hero-value">42,520<span className="cw-hero-unit">억원</span></strong>
              </div>
              <div className="cw-flow-box">
                <span className="cw-hero-label">기금조성</span>
                <strong className="cw-hero-value">9,500<span className="cw-hero-unit">억원</span></strong>
              </div>
              <span className="cw-hero-equals">→</span>
              <div className="cw-flow-box">
                <span className="cw-hero-label">조정액</span>
                <strong className="cw-hero-value">4,500<span className="cw-hero-unit">억원 +α</span></strong>
              </div>
            </div>
            <div className="cw-breakdown-card">
              <HeroBreakdownBar
                label="세입 회계별 구성"
                segments={[
                  { label: "일반회계", value: general.revenue },
                  { label: "특별회계", value: special.revenue },
                ]}
              />
              <HeroBreakdownBar
                label="세출 회계별 구성"
                segments={[
                  { label: "일반회계", value: general.expenditure },
                  { label: "특별회계", value: special.expenditure },
                ]}
              />
            </div>
          </>
        );
      })()}

      <div className="cw-charts-grid">
        <CompositionChart title="세입 구성 (2027년 요구 기준, 일반회계)" segments={groupsToSegments(data.revenueGroups)} />
        <CompositionChart title="세출 구성 (2027년 요구 기준, 일반회계)" segments={groupsToSegments(data.expenditureGroups)} />
      </div>

      <ComparisonChart
        rows={[
          { label: "세입", y2026: data.revenueTotal.y2026, y2027: data.revenueTotal.y2027 },
          { label: "세출", y2026: data.expenditureTotal.y2026, y2027: data.expenditureTotal.y2027 },
        ]}
      />

      <button type="button" className="cw-detail-toggle" onClick={() => setShowDetail((v) => !v)} aria-expanded={showDetail}>
        {showDetail ? "항목별 상세 표 닫기" : "항목별 상세 표 보기"}
      </button>

      {showDetail && (
        <div className="citywide-panels">
          <AmountTable title="세입요구 현황 (일반회계)" groups={data.revenueGroups} total={data.revenueTotal} />
          <AmountTable title="세출요구 현황 (일반회계)" groups={data.expenditureGroups} total={data.expenditureTotal} />
        </div>
      )}

      <div className="citywide-panel citywide-outlook">
        <h2>향후 계획</h2>
        <ul>
          {data.outlook.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
