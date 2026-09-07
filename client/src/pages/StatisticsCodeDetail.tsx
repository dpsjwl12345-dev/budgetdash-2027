import { useState } from "react";
import Layout from "@/components/Layout";
import { ChevronDown } from "lucide-react";

type TabKey = "인건비" | "물건비" | "경상이전" | "자본지출" | "보전·반환";

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  content: string[];
}

const TABS: { key: TabKey; label: string; description: string }[] = [
  { key: "인건비", label: "인건비", description: "소속 직원의 급여 및 수당, 기간제 인부임 산정 탭" },
  { key: "물건비", label: "물건비", description: "부서 운영 소모품비, 수당, 여비 및 행사 경비 탭" },
  { key: "경상이전", label: "경상이전", description: "민간 지원금, 사회복지 수혜금 및 민간 위탁금 탭" },
  { key: "자본지출", label: "자본지출", description: "토지 매입, 자산 취득 및 주요 시설공사 예산 탭" },
  { key: "보전·반환", label: "보전·반환", description: "차입금 상환 및 국고보조금 정산 잔액 반납 탭" },
];

const ACCORDION_DATA: Record<TabKey, AccordionItem[]> = {
  인건비: [
    {
      id: "101-01",
      title: "101-01. 보수 (공무원)",
      content: [
        "정원 기준",
        "대우공무원수당(4.1%)",
        "명절휴가비(120%)",
        "시간외수당(월 35시간) 단가표",
      ],
    },
    {
      id: "101-03",
      title: "101-03. 공무직근로자보수",
      content: [
        "임금협약 기준단가",
        "명절휴가비(120%)",
        "여비 통합 편성 규칙",
      ],
    },
    {
      id: "101-04",
      title: "101-04. 기간제근로자등 보수",
      subtitle: "🌟 [가장 많이 찾는 페이지]",
      content: [
        "2027년도 화성시 생활임금 단가",
        "4대 보험 사업주 부담금(12%)",
        "직종별 고정단가표",
        "주휴·연차수당 계산기 링크",
      ],
    },
  ],
  물건비: [
    {
      id: "201-01",
      title: "201-01. 사무관리비",
      subtitle: "🌟 [기본경비 집중 안내]",
      content: [
        "일반수용비(정원당 75만 원) 및 특근급식비(정원당 60만 원) 배분 한도",
        "위원회 참석수당(대면 10만 원/서면 5만 원)",
        "일·숙직비(6만 원)",
        "행사 차출 공무원 실비보상(반일 6만 원/1일 12만 원)",
        "구내식당 및 출동 매식비 기준",
      ],
    },
    {
      id: "201-03",
      title: "201-03. 행사운영비",
      content: [
        "[중요] 폐지된 행사관련시설비(401-04) 통합 안내",
        "임시 구조물 설치비 편성 규칙",
      ],
    },
    {
      id: "202-01",
      title: "202-01. 국내여비",
      content: [
        "관내출장 수식 (2만 원 × 현원 × 9일)",
        "월액여비 한도(22.5만 원)",
        "국제화여비 통합 안내",
      ],
    },
    {
      id: "203",
      title: "203. 업무추진비 (정원가산 / 부서운영)",
      content: [
        "정원 구간별 가산 기준액",
        "부서 인원대별 월정액 한도 요약표",
      ],
    },
    {
      id: "204-03",
      title: "204-03. 특정업무경비",
      content: [
        "대민활동비(5만 원)",
        "특사경(20만 원)",
        "아동학대대응비(10만 원으로 인상) 등 직무 수당 단가표",
      ],
    },
  ],
  경상이전: [
    {
      id: "301-01",
      title: "301-01. 사회보장적수혜금",
      content: [
        "재원별 3개 통계목 통합 안내",
        "현금성 복지경비 편성 기준",
      ],
    },
    {
      id: "301-08",
      title: "301-08. 민간인 국외여비",
      content: [
        "포상성·관행적 국외연수 편성 금지 등 강력 규제 가이드",
      ],
    },
    {
      id: "301-14",
      title: "301-14. 기타보상금 (자원봉사 실비)",
      content: [
        "자원봉사자 실비보상 단가(교통비 4천 원/급식비 1만 원, 4시간 이상 활동 시)",
      ],
    },
    {
      id: "304-04",
      title: "304-04. 보험료 부담금 등",
      content: [
        "청원경찰 고용보험료 부담금 명기 개정 사항",
      ],
    },
    {
      id: "307",
      title: "307. 민간보조금 (경상 / 법정운영 / 행사)",
      content: [
        "법정운영비 용도 제한(인건비, 임차료 등)",
        "보조금 총 한도액(1,094억 원) 연계 안내",
      ],
    },
    {
      id: "308-13",
      title: "308-13. 공기관등에 대한 경상적 위탁사업비",
      content: [
        "출연기관 위탁사업 시 출연금과의 분리 편성 의무 룰",
      ],
    },
  ],
  자본지출: [
    {
      id: "401-01",
      title: "401-01. 시설공사 보상비",
      subtitle: "🌟 [2027년 신설 탭]",
      content: [
        "토지 매입 대금",
        "지장물 및 손실보상금",
        "감정평가 및 등기수수료 등 적용 범위 안내",
      ],
    },
    {
      id: "401-02",
      title: "401-02. 시설비",
      subtitle: "🌟 [2027년 개정 탭]",
      content: [
        "설계비, 순공사비, 대체비 범위 표출",
        "이월 방지를 위한 단계별 편성 원칙(설계 ➔ 보상 ➔ 공사) 안내",
      ],
    },
    {
      id: "402-01",
      title: "402-01. 민간자본사업보조",
      content: [
        "자체/이전재원 무관 통합 안내",
        "자본 형성적 사업 지원 기준",
      ],
    },
    {
      id: "405",
      title: "405. 자산및물품취득비",
      content: [
        "정수배정 대상 59종 물품 사전 승인제",
        "컴퓨터/노트북/프린터 표준 조달 단가표",
        "공용차량 친환경차(100%) 의무 도입 가이드",
      ],
    },
  ],
  "보전·반환": [
    {
      id: "601-01",
      title: "601-01. 국내차입금상환",
      content: [
        "7개 통계목에서 1개로 통폐합된 채무 원금 상환 기준",
      ],
    },
    {
      id: "802-01",
      title: "802-01. 국고보조금 반환금",
      content: [
        "정산 완료 시 고지서 발부 전 예산 선제적 계상 허용 규칙",
      ],
    },
  ],
};

export default function StatisticsCodeDetail() {
  const [activeTab, setActiveTab] = useState<TabKey>("인건비");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleAccordion = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const currentItems = ACCORDION_DATA[activeTab];
  const currentTab = TABS.find((t) => t.key === activeTab);

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>세출 통계목별 상세</h1>
        </section>

        <section className="guide-section">
          <div className="tabs-with-dropdown">
            <div className="guide-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`guide-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setExpandedItems(new Set());
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {currentTab && (
              <div className="tab-description">
                {currentTab.description}
              </div>
            )}
          </div>

          <div className="guide-content">
            <div className="accordion-container">
              {currentItems.map((item) => (
                <div key={item.id} className="accordion-item">
                  <button
                    className="accordion-header"
                    onClick={() => toggleAccordion(item.id)}
                  >
                    <ChevronDown
                      size={18}
                      style={{
                        transform: expandedItems.has(item.id)
                          ? "rotate(0deg)"
                          : "rotate(-90deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                    <div className="accordion-title-wrapper">
                      <span className="accordion-title">{item.title}</span>
                      {item.subtitle && (
                        <span className="accordion-subtitle">{item.subtitle}</span>
                      )}
                    </div>
                  </button>
                  {expandedItems.has(item.id) && (
                    <div className="accordion-content">
                      <ul>
                        {item.content.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .tabs-with-dropdown {
          border-bottom: 2px solid var(--border);
          background: var(--bg-elevated);
        }

        .guide-tabs {
          display: flex;
          gap: 0;
          padding: 0;
          flex-wrap: wrap;
          border-bottom: none;
          background: var(--bg-elevated);
        }

        .guide-tab {
          flex: 1;
          min-width: 120px;
          padding: 16px 12px !important;
          font-size: 16px !important;
          font-weight: 500 !important;
          text-align: center;
          white-space: nowrap;
          color: var(--text-muted) !important;
          background: none !important;
          border: none !important;
          border-bottom: 3px solid transparent !important;
          cursor: pointer;
          transition: all 0.2s;
        }

        .guide-tab:hover {
          background: rgba(118, 157, 194, 0.08) !important;
          color: var(--text) !important;
        }

        .guide-tab.active {
          color: #5b9bf0 !important;
          border-bottom-color: #5b9bf0 !important;
          font-weight: 600 !important;
        }

        .tab-description {
          padding: 12px 16px;
          background: rgba(118, 157, 194, 0.05);
          font-size: 13px;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
        }

        .accordion-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .accordion-item {
          border: 1px solid rgba(118, 157, 194, 0.2);
          border-radius: 6px;
          overflow: hidden;
        }

        .accordion-header {
          width: 100%;
          padding: 14px 16px;
          background: rgba(118, 157, 194, 0.08);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: background 0.2s ease;
          text-align: left;
        }

        .accordion-header:hover {
          background: rgba(118, 157, 194, 0.12);
        }

        .accordion-title-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .accordion-title {
          font-size: 15px;
          font-weight: 600;
          color: #5b9bf0;
        }

        .accordion-subtitle {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
        }

        .accordion-content {
          padding: 16px;
          background: var(--bg-surface);
          border-top: 1px solid rgba(118, 157, 194, 0.1);
        }

        .accordion-content ul {
          margin: 0;
          padding-left: 20px;
          list-style: disc;
        }

        .accordion-content li {
          margin: 8px 0;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .accordion-content li:first-child {
          margin-top: 0;
        }

        .accordion-content li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </Layout>
  );
}
