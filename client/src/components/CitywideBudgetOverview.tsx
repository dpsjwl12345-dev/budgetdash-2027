import { Fragment, useState } from "react";
import { CITYWIDE_OVERVIEW_2027 } from "../data/citywideBudgetOverview2027";

// 부서를 아직 고르지 않은 "부서예산요구" 초기 화면에 보여주는 시 전체 세입세출 요구 현황 대시보드.
// 부서별 예산요구서(budgetRows)와 달리, 이 화면의 수치는 그 데이터를 합산한 것이 아니라
// 예산재정과가 보고한 시 전체 스냅샷(CITYWIDE_OVERVIEW_2027, 출처는 그 파일 상단 주석 참고)이다.
// 이 앱이 다루는 부서(문화예술과 등 9개)는 시 전체 예산의 아주 일부이기 때문에, budgetRows를
// 합산한 값을 "시 전체"라고 보여주면 실제보다 훨씬 작은 숫자가 나와 틀린 정보가 된다.

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
        return (
          <>
            <div className="cw-hero-card__head">
              <span className="cw-hero-asof">기준일 2026. 9. 9.</span>
              <span className="cw-structure-note">일반회계 + 특별회계(공기업 2 + 특별회계 11)</span>
            </div>
            <div className="cw-hero-section">
              <div className="cw-hero-box">
                <span className="cw-hero-label">세입요구(예산규모)</span>
                <strong className="cw-hero-value">{fmtEok(total.revenue)}<span className="cw-hero-unit">억원</span></strong>
                <span className="cw-hero-split">일반 56,520억원 · 특별 5,330억원</span>
              </div>
              <span className="cw-hero-equals">=</span>
              <div className="cw-flow-box">
                <span className="cw-hero-label">세출요구액</span>
                <strong className="cw-hero-value">56,510<span className="cw-hero-unit">억원</span></strong>
                <span className="cw-hero-split">일반 51,180억원 · 특별 5,330억원</span>
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
          </>
        );
      })()}

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
