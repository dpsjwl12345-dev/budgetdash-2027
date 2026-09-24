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

// 전년 대비 증감액(억원 단위). 원본 표기 그대로 부호를 살린다: 감소는 "△", 증감 없음은 "-".
function fmtEokDiff(y2026: number, y2027: number) {
  const diffEok = Math.round((y2027 - y2026) / 100);
  if (diffEok === 0) return "-";
  return diffEok > 0 ? `+${fmt(diffEok)}` : `△${fmt(Math.abs(diffEok))}`;
}

type BudgetGroup = {
  group: string;
  items: readonly { name: string; y2026: number; y2027: number; note?: string }[];
};

// 세입요구/세출요구 총계 카드 - 증권 앱의 "보유 종목" 리스트 스타일. 세입·세출 둘 다
// 구조가 같아(총계 헤더 + 그룹별 항목 리스트) 하나의 컴포넌트로 재사용한다.
function BudgetListCard({
  scope,
  title,
  total,
  groups,
}: {
  scope: string;
  title: string;
  total: { y2026: number; y2027: number };
  groups: readonly BudgetGroup[];
}) {
  return (
    <div className="cw-income-card">
      <div className="cw-income-head">
        <span className="cw-income-scope">{scope}</span>
        <span className="cw-income-title">{title}</span>
        <strong className="cw-income-total">
          {fmtEok(total.y2027)}<span className="cw-hero-unit">억원</span>
          <span className="cw-income-total-diff">({fmtEokDiff(total.y2026, total.y2027)}억원)</span>
        </strong>
      </div>
      <div className="cw-income-list">
        {groups.map((g) =>
          g.items.map((item, i) => {
            const diffEok = Math.round((item.y2027 - item.y2026) / 100);
            const diffDir = diffEok > 0 ? "up" : diffEok < 0 ? "down" : "flat";
            const isLastInGroup = i === g.items.length - 1;
            const badgeLabel = (g.group || g.items[0]?.name || "").slice(0, 2);
            return (
              <div className={`cw-income-row ${isLastInGroup ? "cw-income-row--group-end" : ""}`} key={item.name}>
                <span className="cw-income-badge">{badgeLabel}</span>
                <span className="cw-income-name-text">
                  {item.name}
                  {item.note && <span className="cw-income-note">{item.note}</span>}
                </span>
                <span className="cw-income-figures">
                  <span className="cw-income-amount">{fmtEok(item.y2027)}<span className="cw-hero-unit">억원</span></span>
                  <span className={`cw-income-diff cw-income-diff--${diffDir}`}>({fmtEokDiff(item.y2026, item.y2027)})</span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function CitywideBudgetOverview() {
  const data = CITYWIDE_OVERVIEW_2027;

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
            <div className="cw-hero-card__head">
              <span className="cw-hero-asof">기준일 2026. 9. 9.</span>
              <span className="cw-structure-note">일반회계 + 특별회계(공기업 2 + 특별회계 11)</span>
            </div>
            <div className="cw-hero-section">
              <div className="cw-hero-box">
                <span className="cw-hero-label">세입요구(예산규모)</span>
                <strong className="cw-hero-value">{fmtEok(total.revenue)}<span className="cw-hero-unit">억원</span></strong>
                <div className="cw-hero-split-row">
                  <span className="cw-hero-split cw-hero-split--general">일반 {fmtEok(general.revenue)}억원</span>
                  <span className="cw-hero-split">특별 {fmtEok(special.revenue)}억원</span>
                </div>
              </div>
              <span className="cw-hero-equals">=</span>
              <div className="cw-flow-box">
                <span className="cw-hero-label">세출요구액</span>
                <strong className="cw-hero-value">56,510<span className="cw-hero-unit">억원</span></strong>
                <div className="cw-hero-split-row">
                  <span className="cw-hero-split cw-hero-split--general">일반 {fmtEok(general.expenditure)}억원</span>
                  <span className="cw-hero-split">특별 {fmtEok(special.expenditure)}억원</span>
                </div>
              </div>
              <div className="cw-flow-box cw-flow-box--center">
                <span className="cw-hero-label">기금조성</span>
                <strong className="cw-hero-value">9,500<span className="cw-hero-unit">억원</span></strong>
              </div>
              <span className="cw-hero-equals">→</span>
              <div className="cw-flow-box cw-flow-box--center">
                <span className="cw-hero-label">조정액</span>
                <strong className="cw-hero-value">4,500<span className="cw-hero-unit">억원 +α</span></strong>
              </div>
            </div>
          </>
        );
      })()}

      <div className="cw-income-section">
        <BudgetListCard scope="일반회계" title="세입요구 총계" total={data.revenueTotal} groups={data.revenueGroups} />
        <BudgetListCard scope="일반회계" title="세출요구 총계" total={data.expenditureTotal} groups={data.expenditureGroups} />
      </div>
    </div>
  );
}
