import { CITYWIDE_OVERVIEW_2027 } from "../data/citywideBudgetOverview2027";

// 부서를 아직 고르지 않은 "부서예산요구" 초기 화면에 보여주는 시 전체 세입세출 요구 현황 대시보드.
// 부서별 예산요구서(budgetRows)와 달리, 이 화면의 수치는 그 데이터를 합산한 것이 아니라
// 예산재정과가 보고한 시 전체 스냅샷(CITYWIDE_OVERVIEW_2027, 출처는 그 파일 상단 주석 참고)이다.
// 이 앱이 다루는 부서(문화예술과 등 9개)는 시 전체 예산의 아주 일부이기 때문에, budgetRows를
// 합산한 값을 "시 전체"라고 보여주면 실제보다 훨씬 작은 숫자가 나와 틀린 정보가 된다.

function fmt(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

// 원본 보고서 표기 그대로 부호를 살린다: 감소는 "△", 증감 없음은 "-", 증가는 그대로 숫자.
function fmtDiff(y2026: number, y2027: number) {
  const diff = y2027 - y2026;
  if (diff === 0) return "-";
  return diff > 0 ? `+${fmt(diff)}` : `△${fmt(Math.abs(diff))}`;
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
            <>
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
            </>
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

  return (
    <div className="citywide-overview">
      <div className="citywide-overview__head">
        <h1>2027년 화성시 세입세출 요구 현황</h1>
        <p>{data.asOf} · {data.reportedAt}</p>
      </div>

      <div className="citywide-overview__cards">
        {data.totalsByAccount.map((row) => (
          <article className="metric-card" style={{ "--tint": row.name === "합계" ? "#5b9bf0" : "#e8b84b" } as React.CSSProperties} key={row.name}>
            <div className="metric-header">
              <div className="metric-top"><span>{row.name}</span></div>
            </div>
            <strong style={{ fontSize: "calc(1rem + 2px)" }}>
              세입 {fmt(row.revenue)}<span className="metric-unit">백만원</span>
            </strong>
            <strong style={{ fontSize: "calc(1rem + 2px)", marginTop: "2px" }}>
              세출 {fmt(row.expenditure)}<span className="metric-unit">백만원</span>
            </strong>
            <div className="citywide-overview__diff">
              세입-세출 {fmt(row.diff)}백만원{row.note ? ` · ${row.note}` : ""}
            </div>
          </article>
        ))}
      </div>

      <div className="citywide-panels">
        <AmountTable title="세입요구 현황 (일반회계)" groups={data.revenueGroups} total={data.revenueTotal} />
        <AmountTable title="세출요구 현황 (일반회계)" groups={data.expenditureGroups} total={data.expenditureTotal} />
      </div>

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
