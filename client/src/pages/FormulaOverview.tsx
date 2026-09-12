import { useMemo, useState } from "react";
import Layout from "@/components/Layout";

// 이 페이지는 "사전절차"와 "세출 통계목별 상세" 두 가이드 페이지 안에 흩어져 있는
// 모든 산출식(단가×인원×기간 형태의 계산 공식)을 한 화면에 모아 보여주기만 한다.
// 두 가이드 본문의 산출식이 맞는지 틀린지는 여기서 판단하지 않는다 - 사용자가 직접 하나씩
// 검토할 수 있도록 "지금 코드에 어떤 산출식이 박혀 있는지"를 빠짐없이 노출하는 것이 유일한 목적이다.

type FormulaEntry = {
  category: string;
  code: string;
  title: string;
  item: string;
  condition?: string;
  formula: string;
  duplicatedInEstablishmentGuide: boolean;
};

const FORMULA_ENTRIES: FormulaEntry[] = [
  {
    category: "인건비(100)",
    code: "101-04",
    title: "기간제근로자등 보수",
    item: "기본급",
    condition: "일일단가(2027 생활임금 적용 직종 기준 일급 102,000원) × 근로일수",
    formula: "일일단가(원) × 인원(명) × 근로일수(일)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "인건비(100)",
    code: "101-04",
    title: "기간제근로자등 보수",
    item: "주휴수당",
    condition: "일요일 및 근로자의 날 기준, 일일단가(생활임금 직종 일급 102,000원)",
    formula: "일일단가(원) × 인원(명) × 휴일일수(일)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "인건비(100)",
    code: "101-04",
    title: "기간제근로자등 보수",
    item: "연차수당",
    condition: "미사용 연차 기준, 일일단가(생활임금 직종 일급 102,000원)",
    formula: "일일단가(원) × 인원(명) × 미사용 연차 일수(일)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "인건비(100)",
    code: "101-04",
    title: "기간제근로자등 보수",
    item: "공정수당",
    condition: "보상지급액은 당해 연도 화성시 생활임금 확정 고시 후 산정",
    formula: "기간제근로자 인원수(명) × 구간별 보상지급액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "인건비(100)",
    code: "101-04",
    title: "기간제근로자등 보수",
    item: "기본급·주휴수당·연차수당 통합 산출식",
    condition: "월 평균 기준일수(주휴일 포함) 27일 적용 (예: 생활임금 직종 6개월 고용 = 일급 102,000원 × 162일 = 16,524,000원)",
    formula: "기준단가(원) × 인원(명) × 근무일수(일)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "인건비(100)",
    code: "101-04",
    title: "기간제근로자등 보수",
    item: "4대 보험료 (기관 부담금)",
    condition: "국민연금 사업주 부담 4.75%→5% 인상 반영",
    formula: "임금 총액(원) × 12% (또는 11.75%, 원 단위까지 정확히 입력)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "201-01",
    title: "사무관리비",
    item: "일반수용비",
    condition: "공무원 정원 1인당 연 750,000원 (2026.10 기준 정원 적용)",
    formula: "750,000원 × 부서 공무원 정원(명) = 총요구액(원)",
    duplicatedInEstablishmentGuide: true,
  },
  {
    category: "물건비(200)",
    code: "201-01",
    title: "사무관리비",
    item: "급식비 (특근매식비)",
    condition: "공무원 정원 1인당 연 600,000원",
    formula: "600,000원 × 부서 공무원 정원(명) = 총요구액(원)",
    duplicatedInEstablishmentGuide: true,
  },
  {
    category: "물건비(200)",
    code: "201-01",
    title: "사무관리비",
    item: "위원회 대면 심의 수당",
    condition: "1회당 100,000원 (회의 2시간 초과 시 50,000원 추가)",
    formula: "100,000원(또는 150,000원) × 참석 위원 수(명) × 회의 횟수(회)",
    duplicatedInEstablishmentGuide: true,
  },
  {
    category: "물건비(200)",
    code: "201-01",
    title: "사무관리비",
    item: "위원회 서면 심의 수당",
    condition: "1회당 50,000원",
    formula: "50,000원 × 심의 위원 수(명) × 심의 횟수(회)",
    duplicatedInEstablishmentGuide: true,
  },
  {
    category: "물건비(200)",
    code: "201-01",
    title: "사무관리비",
    item: "일·숙직 수당",
    condition: "일직·숙직 60,000원 / 재택당직 30,000원",
    formula: "60,000원(또는 30,000원) × 근무 인원(명) × 365일",
    duplicatedInEstablishmentGuide: true,
  },
  {
    category: "물건비(200)",
    code: "202-01",
    title: "국내여비",
    item: "① 일상업무 추진 관내여비 (현원 기준)",
    condition: "월 9일 기준(1일 20,000원), 공무원 현원(임기제 포함) 기준",
    formula: "20,000원 × 공무원 현원(명) × 9일 × 12월 = 총요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "202-01",
    title: "국내여비",
    item: "② 월액여비 (상시출장자 지정)",
    condition: "부서별 내부검토 결재로 지정된 상시출장 대상자",
    formula: "225,000원 × 상시출장 지정 대상자 수(명) × 12월 = 총요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "202-01",
    title: "국내여비",
    item: "③ 사업추진 관외여비 (정책사업 반영)",
    condition: "개별 정책 사업 수행을 위한 관외 출장",
    formula: "20,000원 × 출장 인원(명) × 출장 일수(일) × 출장 횟수(회) = 총요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "202-02",
    title: "국외업무여비",
    item: "업무수행 국외출장",
    condition: "조사·확인·점검·구매검사, MOU 체결, 국제회의 참석 등",
    formula: "공무원 여비 규정 단가(원) × 출장 인원(명) × 출장 일수(일) = 총요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "202-02",
    title: "국외업무여비",
    item: "공무원이 아닌 자의 국외여비",
    condition: "청원경찰 등 공무원이 아닌 자의 동행·수행",
    formula: "여비 규정 준용 단가(원) × 대상 인원(명) × 출장 일수(일) = 총요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "202-02",
    title: "국외업무여비",
    item: "현지 차량 임차료 (사무관리비 201-01로 별도 편성)",
    condition: "해외출장 부대비용 - 여비(202) 목에 포함 불가",
    formula: "현지 차량 임차 단가(원) × 임차 일수(일) = 차량 임차비 요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "202-02",
    title: "국외업무여비",
    item: "통역비 (사무관리비 201-01로 별도 편성)",
    condition: "해외출장 부대비용 - 여비(202) 목에 포함 불가",
    formula: "통역 수당 단가(원) × 통역 횟수 또는 일수 = 통역비 요구액(원)",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "203-02",
    title: "정원가산업무추진비",
    item: "적용 예시 - 본청 소속 120명",
    condition: "본청: 100명까지 1인당 80,000원 / 101~300명 1인당 60,000원 (구간별 누적 합산)",
    formula: "(100명 × 80,000원) + (20명 × 60,000원) = 9,200,000원",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "203-02",
    title: "정원가산업무추진비",
    item: "적용 예시 - 사업소 소속 150명",
    condition: "사업소: 100명까지 1인당 40,000원 / 101~400명 1인당 30,000원 (구간별 누적 합산)",
    formula: "(100명 × 40,000원) + (50명 × 30,000원) = 5,500,000원",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "203-04",
    title: "부서운영업무추진비",
    item: "적용 예시 - 30인 이하 (정원 18명)",
    condition: "부서 정원 5인 단위 구간별 월 기준액표 적용",
    formula: "300,000원 × 12월 = 3,600,000원",
    duplicatedInEstablishmentGuide: false,
  },
  {
    category: "물건비(200)",
    code: "203-04",
    title: "부서운영업무추진비",
    item: "적용 예시 - 31인 이상 (정원 35명)",
    condition: "31인 이상: 월 400,000원 + 30인 초과 1인당 월 5,000원",
    formula: "[400,000원 + (5명 × 5,000원)] × 12월 = 5,100,000원",
    duplicatedInEstablishmentGuide: false,
  },
];

// 산출식(계산 공식)은 아니지만, 사용자가 "출연금에 보조금이 걸려있다"고 지적한 것과 가장 가까운
// 부분으로 보이는 편성 구분 기준 원문. 계산식이 아니라 "어느 통계목으로 분류할지"의 규칙이라
// 위 표와 분리해서 그대로 보여준다.
const CLASSIFICATION_NOTE = {
  code: "308-13",
  title: "공기관등에 대한 경상적 위탁사업비",
  quote:
    "출연기관(도시공사, 문화관광재단 등)의 기본 운영경비가 아닌 특정 사업 대행 시에는 출연금이 아닌 위탁사업비 목으로 철저히 구분 편성합니다.",
  rule: "출연금 = 기관의 기본 운영경비 / 위탁사업비 = 특정 사업 대행 경비",
};

export default function FormulaOverview() {
  const [search, setSearch] = useState("");
  const [codeFilter, setCodeFilter] = useState<string | null>(null);

  const codeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    FORMULA_ENTRIES.forEach((entry) => {
      if (!seen.has(entry.code)) seen.set(entry.code, entry.title);
    });
    return Array.from(seen.entries());
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return FORMULA_ENTRIES.filter((entry) => {
      if (codeFilter && entry.code !== codeFilter) return false;
      if (!term) return true;
      return [entry.category, entry.code, entry.title, entry.item, entry.condition ?? "", entry.formula]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, codeFilter]);

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>산출식(함수) 전체 목록</h1>
        </section>

        <section className="guide-section">
          <div className="guide-content">
            <p className="intro-text">
              "사전절차"와 "세출 통계목별 상세" 두 가이드 안에 흩어져 있는 산출식을
              전부 이 표 하나로 모았습니다. 계산식이 맞는지는 판단하지 않았으니, 아래 내용을
              직접 확인해주세요. "중복" 표시가 있는 항목은 두 가이드 페이지에 같은 내용이 그대로
              복사되어 있는 항목입니다.
            </p>

            <div className="classification-note">
              <strong>
                {CLASSIFICATION_NOTE.code}. {CLASSIFICATION_NOTE.title} — 참고(계산식 아님, 분류 기준)
              </strong>
              <p>“{CLASSIFICATION_NOTE.quote}”</p>
              <p className="classification-rule">{CLASSIFICATION_NOTE.rule}</p>
            </div>

            <div className="code-filter-row">
              <button
                type="button"
                className={`code-filter-chip ${codeFilter === null ? "active" : ""}`}
                onClick={() => setCodeFilter(null)}
              >
                전체
              </button>
              {codeOptions.map(([code, title]) => (
                <button
                  key={code}
                  type="button"
                  className={`code-filter-chip ${codeFilter === code ? "active" : ""}`}
                  onClick={() => setCodeFilter(codeFilter === code ? null : code)}
                >
                  {code} · {title}
                </button>
              ))}
            </div>

            <input
              className="formula-search"
              type="text"
              placeholder="통계목 코드, 항목명, 산출식으로 검색..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <table className="content-table formula-table">
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>통계목</th>
                  <th style={{ width: "160px" }}>항목</th>
                  <th style={{ width: "220px" }}>기준</th>
                  <th>산출식</th>
                  <th style={{ width: "90px" }}>중복</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, index) => (
                  <tr key={`${entry.code}-${index}`}>
                    <td>
                      <div className="formula-code">{entry.code}</div>
                      <div className="formula-code-title">{entry.title}</div>
                    </td>
                    <td>{entry.item}</td>
                    <td>{entry.condition ?? "-"}</td>
                    <td>
                      <code className="formula-code-text">{entry.formula}</code>
                    </td>
                    <td>
                      {entry.duplicatedInEstablishmentGuide ? (
                        <span className="dup-flag">중복</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="formula-empty">
                      검색어와 일치하는 산출식이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="formula-footer">
              총 {FORMULA_ENTRIES.length}건 (출처: 세출 통계목별 상세 - 물건비 탭 전부. 사전절차의
              산출식 5건은 전부 여기 있는 항목의 완전한 복사본이라 별도로 목록에 추가하지
              않고 "중복" 표시로만 남겼습니다.)
            </p>
          </div>
        </section>
      </div>

      <style>{`
        .guide-section {
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .guide-content {
          padding: 40px;
          background: var(--bg-surface);
        }

        .intro-text {
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.7;
          margin: 0 0 20px 0;
        }

        .classification-note {
          margin: 0 0 24px 0;
          padding: 16px;
          background: rgba(230, 126, 34, 0.1);
          border: 1px solid rgba(230, 126, 34, 0.3);
          border-radius: 4px;
        }

        .classification-note strong {
          color: #e67e22;
          font-size: 14px;
        }

        .classification-note p {
          margin: 10px 0 0 0;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.6;
        }

        .classification-rule {
          font-weight: 600;
          color: var(--text) !important;
        }

        .code-filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }

        .code-filter-chip {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-muted);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 150ms ease-out;
        }

        .code-filter-chip:hover {
          border-color: rgba(91, 155, 240, 0.5);
          color: var(--text);
        }

        .code-filter-chip.active {
          background: rgba(91, 155, 240, 0.18);
          border-color: #5b9bf0;
          color: #5b9bf0;
          font-weight: 700;
        }

        .formula-search {
          width: 100%;
          max-width: 420px;
          padding: 10px 14px;
          margin-bottom: 20px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text);
          font-size: 14px;
        }

        .formula-search:focus {
          outline: none;
          border-color: #5b9bf0;
        }

        .content-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
          border: 1px solid var(--border);
        }

        .content-table th {
          background: rgba(118, 157, 194, 0.1);
          color: var(--text);
          font-weight: 600;
          padding: 12px;
          text-align: left;
          border: 1px solid var(--border);
          font-size: 13px;
        }

        .content-table td {
          padding: 12px;
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 13px;
          vertical-align: top;
        }

        .content-table tr:hover td {
          background: rgba(118, 157, 194, 0.05);
        }

        .formula-code {
          font-weight: 700;
          color: #5b9bf0;
          font-size: 13px;
        }

        .formula-code-title {
          margin-top: 2px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .formula-code-text {
          display: inline-block;
          background: rgba(118, 157, 194, 0.12);
          color: var(--text);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12.5px;
          line-height: 1.6;
        }

        .dup-flag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(230, 126, 34, 0.15);
          color: #e67e22;
          font-size: 11px;
          font-weight: 600;
        }

        .formula-empty {
          text-align: center;
          padding: 32px;
          color: var(--text-muted);
        }

        .formula-footer {
          margin-top: 16px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
      `}</style>
    </Layout>
  );
}
