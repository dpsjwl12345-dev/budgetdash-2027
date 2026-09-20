import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

const SUBSIDY_CONFIRMED_STORAGE_KEY = "subsidyEvaluationConfirmed";
const SUBSIDY_MEMO_STORAGE_KEY = "subsidyEvaluationMemo";
const INVESTMENT_CONFIRMED_STORAGE_KEY = "investmentProjectConfirmed";
const EVENT_CONFIRMED_STORAGE_KEY = "eventProjectConfirmed";
const EVENT_INSTITUTION_CONFIRMED_STORAGE_KEY = "eventInstitutionProjectConfirmed";

type TabKey = "보조금 운용평가" | "주요 재정사업 평가";
type FiscalProjectSubTabKey = "투자사업" | "행사성사업" | "행사성사업(출연기관)";

const TABS: { key: TabKey; label: string }[] = [
  { key: "보조금 운용평가", label: "보조금 운용평가" },
  { key: "주요 재정사업 평가", label: "주요 재정사업 평가" },
];

const FISCAL_PROJECT_SUB_TABS: { key: FiscalProjectSubTabKey; label: string }[] = [
  { key: "투자사업", label: "투자사업" },
  { key: "행사성사업", label: "행사성사업" },
  { key: "행사성사업(출연기관)", label: "행사성사업(출연기관)" },
];

type SubsidyEvaluationRow = {
  department: string;
  projectName: string;
  detailName: string;
  statisticsItem: string;
  evaluation: "미흡" | "매우미흡";
  budget25: string;
  budget26: string;
  reflection: string;
};

const SUBSIDY_EVALUATION_DATA: SubsidyEvaluationRow[] = [
  { department: "문화예술과", projectName: "예술단체 지원", detailName: "전국가요제", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "33,250", budget26: "33,250", reflection: "예산 동결" },
  { department: "문화예술과", projectName: "예술단체 지원", detailName: "사진공모전", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "20,900", budget26: "20,000", reflection: "예산 동결" },
  { department: "문화예술과", projectName: "예술단체 지원", detailName: "공동예술사업", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "50,000", budget26: "50,000", reflection: "예산 동결" },
  { department: "문화예술과", projectName: "예술단체 활성화 지원", detailName: "화성두레농악 활성화", statisticsItem: "민간행사사업보조", evaluation: "매우미흡", budget25: "-", budget26: "-", reflection: "예산 삭감" },
  { department: "문화예술과", projectName: "문화예술활동 지원", detailName: "청소년 전통문화예술 육성", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "65,280", budget26: "-", reflection: "예산 삭감" },
  { department: "문화예술과", projectName: "문화예술활동 지원", detailName: "문화예술 전시공간 조성", statisticsItem: "민간자본사업보조", evaluation: "매우미흡", budget25: "50,000", budget26: "-", reflection: "예산 삭감" },
  { department: "문화유산과", projectName: "화성문화원 운영 지원", detailName: "예절관 사무가구 구입", statisticsItem: "민간자본사업보조", evaluation: "매우미흡", budget25: "4,640", budget26: "-", reflection: "예산 삭감" },
  { department: "문화유산과", projectName: "전통문화계승 및 보존사업 지원", detailName: "화성문화원 60년사 발간", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "40,000", budget26: "-", reflection: "예산 삭감" },
  { department: "문화유산과", projectName: "전통문화계승 및 보존사업 지원", detailName: "화성문화원 아카이브 운영", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "2,000", budget26: "-", reflection: "예산 삭감" },
  { department: "독립기념관", projectName: "화성독립운동 주요지역 활성화 사업", detailName: "화성독립운동 주요지역 활성화 공모사업", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "20,000", budget26: "-", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "화성시 체육회 운영", detailName: "화성시체육회 워크숍 개최 지원", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "30,000", budget26: "30,000", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "화성시 체육회 운영", detailName: "화성시체육회 사무용품 구입", statisticsItem: "민간자본사업보조", evaluation: "미흡", budget25: "12,020", budget26: "-", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "의장기 체육대회 개최", detailName: "화성시의회 의장기 생활체육 족구대회", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "8,000", budget26: "8,000", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "도 단위급 이상 종목별 엘리트 대회 출전", detailName: "독립야구 경기도리그 출전 지원", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "18,000", budget26: "20,000", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "생활체육 클럽 육성", detailName: "족구단 지원", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "7,200", budget26: "7,200", reflection: "예산 삭감" },
  { department: "체육진흥과", projectName: "생활체육 클럽 육성", detailName: "농구단 지원", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "8,800", budget26: "8,800", reflection: "예산 삭감" },
  { department: "체육진흥과", projectName: "화성시장애인체육회 워크숍", detailName: "화성시장애인체육회 임직원 및 종목단체 통합 워크숍", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "15,000", budget26: "10,000", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "체육진흥사업 추진", detailName: "각종 체육대회 격려 및 지원", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "192,500", budget26: "225,500", reflection: "예산 동결" },
  { department: "체육진흥과", projectName: "체육진흥사업 추진", detailName: "기타 대회 격려 및 지원", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "90,400", budget26: "60,000", reflection: "예산 동결" },
  { department: "문화예술과", projectName: "예술단체 지원", detailName: "민예총 화성시지부 운영비", statisticsItem: "민간단체법정운영비보조", evaluation: "미흡", budget25: "46,660", budget26: "46,660", reflection: "보조금심의 통해 사업유지" },
  { department: "문화예술과", projectName: "예술단체 활성화 지원", detailName: "하모니카 공연", statisticsItem: "민간행사사업보조", evaluation: "매우미흡", budget25: "7,600", budget26: "7,600", reflection: "사업 폐지" },
  { department: "문화유산과", projectName: "종교문화 활동지원", detailName: "종교문화 행사지원(한글날 기념 문화음악회)", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "20,000", budget26: "20,000", reflection: "보조금심의 통해 사업유지" },
  { department: "문화유산과", projectName: "전통문화 계승지원", detailName: "남양향교 행사지원(남양향교 분향례 지원)", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "6,300", budget26: "7,800", reflection: "보조금심의 통해 사업유지" },
  { department: "문화유산과", projectName: "전통문화 계승지원", detailName: "남양향교 행사지원(남양향교 기로연 지원)", statisticsItem: "민간행사사업보조", evaluation: "매우미흡", budget25: "5,000", budget26: "5,000", reflection: "사업 폐지" },
  { department: "문화유산과", projectName: "지정 무형유산 전승 지원", detailName: "화성팔탄민요(도 무형유산) 행사 지원", statisticsItem: "민간행사사업보조", evaluation: "미흡", budget25: "66,200", budget26: "76,600", reflection: "보조금심의 통해 사업유지" },
  { department: "평생학습과", projectName: "근거리평생학습센터 지정 운영", detailName: "근거리평생학습센터'이루리' 운영 지원", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "100,000", budget26: "130,000", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "체육인 체육대회 개최 지원", detailName: "체육인 체육대회 개최 지원", statisticsItem: "민간행사사업보조", evaluation: "매우미흡", budget25: "22,800", budget26: "22,000", reflection: "사업 폐지" },
  { department: "체육진흥과", projectName: "도 단위 및 전국단위 생활체육대회 출전", detailName: "도 단위 및 전국단위 생활체육대회 출전", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "23,085", budget26: "23,085", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "도지사기 및 도의장기 생활체육대회 출전", detailName: "도지사기 및 도의장기 생활체육대회 출전", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "75,000", budget26: "84,920", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "스포츠 데이", detailName: "스포츠 스탬프투어", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "60,000", budget26: "-", reflection: "사업 폐지" },
  { department: "체육진흥과", projectName: "생활체육지도자 배치(자체)", detailName: "생활체육지도자 복리후생비", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "161,232", budget26: "161,232", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "생활체육지도자 배치(자체)", detailName: "생활체육지도 수업용품비", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "4,000", budget26: "4,000", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "생활체육 클럽 육성", detailName: "여성축구단 지원", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "15,000", budget26: "16,740", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "생활체육 클럽 육성", detailName: "축구단 지원", statisticsItem: "민간경상사업보조", evaluation: "미흡", budget25: "54,700", budget26: "59,700", reflection: "보조금심의 통해 사업유지" },
  { department: "체육진흥과", projectName: "전국 및 국제 규모 스포츠 대회 개최 및 출전", detailName: "전국 및 국제 규모 스포츠 대회 출전", statisticsItem: "민간경상사업보조", evaluation: "매우미흡", budget25: "3,832", budget26: "5,000", reflection: "사업 폐지" },
  { department: "체육진흥과", projectName: "유청소년 축구단 운영지원", detailName: "유청소년축구대회 개최", statisticsItem: "민간행사사업보조", evaluation: "매우미흡", budget25: "-", budget26: "-", reflection: "사업 폐지" },
];

function evaluationColor(evaluation: SubsidyEvaluationRow["evaluation"]): string {
  return evaluation === "매우미흡" ? "#ff6b7d" : "#d9ad52";
}

function reflectionColor(reflection: string): string {
  if (reflection.includes("폐지")) return "#ff6b7d";
  if (reflection.includes("삭감")) return "#d9ad52";
  if (reflection.includes("사업유지")) return "#7ee787";
  return "var(--text-muted)";
}

type Grade = "매우 우수" | "우수" | "보통" | "미흡";

function gradeColor(grade: Grade): string {
  switch (grade) {
    case "매우 우수":
      return "#7ee787";
    case "우수":
      return "#52c4d9";
    case "보통":
      return "#d9ad52";
    case "미흡":
      return "#ff6b7d";
  }
}

type InvestmentProjectRow = {
  department: string;
  projectName: string;
  budget: string;
  selfEval: Grade;
  deepEval: Grade;
  finalGrade: Grade;
};

const INVESTMENT_PROJECT_DATA: InvestmentProjectRow[] = [
  { department: "문화유산과", projectName: "만년제 주변 정비사업", budget: "260,000", selfEval: "우수", deepEval: "보통", finalGrade: "보통" },
  { department: "문화예술과", projectName: "수장·연구시설 건립", budget: "1,270,000", selfEval: "보통", deepEval: "보통", finalGrade: "보통" },
  { department: "관광진흥과", projectName: "제부지역 관광 인프라 확충", budget: "945,902", selfEval: "보통", deepEval: "미흡", finalGrade: "미흡" },
  { department: "도서관정책과", projectName: "(가칭)화성시 독서문화공간 조성", budget: "6,955,000", selfEval: "매우 우수", deepEval: "보통", finalGrade: "보통" },
  { department: "체육진흥과", projectName: "화성시 전역 체육시설물 정비", budget: "700,000", selfEval: "매우 우수", deepEval: "보통", finalGrade: "보통" },
  { department: "독립기념관", projectName: "화성시독립운동기념관 건립", budget: "1,290,000", selfEval: "우수", deepEval: "보통", finalGrade: "보통" },
];

type EventProjectRow = {
  department: string;
  eventName: string;
  detailName: string;
  budget: string;
  selfEval: Grade;
  deepEval: Grade;
  finalGrade: Grade;
};

const EVENT_PROJECT_DATA: EventProjectRow[] = [
  { department: "문화예술과", eventName: "투나빛축제 개최", detailName: "지역문화축제 추진", budget: "275,500", selfEval: "우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
  { department: "문화유산과", eventName: "기증·기탁자의 날 행사 운영", detailName: "유물구입 및 기증·기탁관리", budget: "10,000", selfEval: "우수", deepEval: "우수", finalGrade: "우수" },
  { department: "관광진흥과", eventName: "유아대상 교육프로그램 운영", detailName: "매향리 평화기념관 교육 프로그램 운영", budget: "40,000", selfEval: "우수", deepEval: "보통", finalGrade: "보통" },
  { department: "도서관정책과", eventName: "도서관 북스타트 프로그램", detailName: "생애주기별 독서 운동 지원", budget: "34,200", selfEval: "매우 우수", deepEval: "우수", finalGrade: "우수" },
  { department: "체육진흥과", eventName: "직장운동경기부 홍보", detailName: "직장운동부 운영", budget: "19,000", selfEval: "우수", deepEval: "보통", finalGrade: "보통" },
  { department: "전국체전추진단", eventName: "시민추진단 운영", detailName: "2027년 전국체육대회 기획 및 운영", budget: "23,000", selfEval: "매우 우수", deepEval: "미흡", finalGrade: "미흡" },
  { department: "독립기념관", eventName: "3.1절 기념식 개최", detailName: "기념식 및 추모제 개최", budget: "30,000", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
];

type EventInstitutionRow = {
  institution: string;
  eventName: string;
  budget: string;
  selfEval: Grade;
  deepEval: Grade;
  finalGrade: Grade;
};

const EVENT_INSTITUTION_DATA: EventInstitutionRow[] = [
  { institution: "화성시문화관광재단", eventName: "2025 화성특례시민의 날 콘서트", budget: "18,000", selfEval: "매우 우수", deepEval: "우수", finalGrade: "우수" },
  { institution: "화성시문화관광재단", eventName: "화성특례시 출범 특별한 콘서트", budget: "600,000", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
  { institution: "화성시문화관광재단", eventName: "권역별 콘서트(북부권 가족사랑 통합)", budget: "180,000", selfEval: "매우 우수", deepEval: "우수", finalGrade: "우수" },
  { institution: "화성시문화관광재단", eventName: "권역별 콘서트(서부권 새솔동)", budget: "100,000", selfEval: "매우 우수", deepEval: "우수", finalGrade: "우수" },
  { institution: "화성시문화관광재단", eventName: "권역별 콘서트(남부권 향남)", budget: "180,000", selfEval: "매우 우수", deepEval: "우수", finalGrade: "우수" },
  { institution: "화성시여성가족청소년재단", eventName: "2025 병점문화축제", budget: "69,300", selfEval: "우수", deepEval: "우수", finalGrade: "우수" },
  { institution: "화성시여성가족청소년재단", eventName: "화성시청소년축제", budget: "99,400", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
  { institution: "화성시인재육성재단", eventName: "2026년도 대학입학정보박람회", budget: "95,500", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
  { institution: "화성시인재육성재단", eventName: "2025 화성 학생동아리 축제", budget: "193,000", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
  { institution: "화성시인재육성재단", eventName: "2025년 이음터 연합축제(가칭)", budget: "10,000", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
  { institution: "(재)화성FC", eventName: "화성FC K리그2 출정식", budget: "38,040", selfEval: "매우 우수", deepEval: "매우 우수", finalGrade: "매우 우수" },
];

// 행 순서가 코드에 고정돼 있어 인덱스를 키로 써서 체크 상태를 저장한다.
function useConfirmedRows(storageKey: string) {
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setConfirmed(JSON.parse(saved));
    } catch {
      // 저장된 값이 없거나 읽기 실패하면 전부 미확인 상태로 시작한다.
    }
  }, [storageKey]);

  const toggle = (index: number) => {
    setConfirmed((prev) => {
      const next = { ...prev, [index]: !prev[index] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // 저장 실패해도 화면 상태는 유지한다.
      }
      return next;
    });
  };

  return [confirmed, toggle] as const;
}

// 행별 메모(자유 텍스트)도 체크 상태와 같은 방식으로 인덱스를 키로 저장한다.
function useRowMemos(storageKey: string) {
  const [memos, setMemos] = useState<Record<number, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setMemos(JSON.parse(saved));
    } catch {
      // 저장된 값이 없거나 읽기 실패하면 빈 메모로 시작한다.
    }
  }, [storageKey]);

  const update = (index: number, value: string) => {
    setMemos((prev) => {
      const next = { ...prev, [index]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // 저장 실패해도 화면 상태는 유지한다.
      }
      return next;
    });
  };

  return [memos, update] as const;
}

// 같은 기관명이 연속으로 이어지는 첫 행에서만 몇 줄을 합칠지(rowSpan) 계산한다.
function groupRowSpans(rows: { institution: string }[]): (number | null)[] {
  const spans: (number | null)[] = new Array(rows.length).fill(null);
  let groupStart = 0;
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i].institution !== rows[groupStart].institution) {
      spans[groupStart] = i - groupStart;
      groupStart = i;
    }
  }
  return spans;
}

function FiscalProjectNotice() {
  return (
    <div className="perf-notice">
      <p className="perf-notice-title">※ 주요 재정사업 평가 결과 2027년 본예산 편성 반영</p>
      <ul>
        <li>○ 우수 이상: 예산 증액 또는 유지 원칙</li>
        <li>○ 보통: 평가 지표의 특성 및 평가 결과를 감안한 제도개선 권고</li>
        <li>○ 미흡 이하: 예산 10% 이상 삭감 원칙</li>
        <li>○ 매우 미흡: 성과개선 대책 검토 후 일몰 가능</li>
      </ul>
      <p className="perf-notice-footnote">
        단, 사업특성(의무지출사업 및 연도별지출소요가 확정된 사업 등) 및 평가지표별 특성을 종합적으로 고려하여 평가결과 탄력적 예산안 반영
      </p>
    </div>
  );
}

export default function PerformanceEvaluation() {
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0].key);
  const [fiscalProjectSubTab, setFiscalProjectSubTab] = useState<FiscalProjectSubTabKey>(
    FISCAL_PROJECT_SUB_TABS[0].key
  );
  const [confirmedRows, toggleConfirmedRow] = useConfirmedRows(SUBSIDY_CONFIRMED_STORAGE_KEY);
  const [subsidyMemos, updateSubsidyMemo] = useRowMemos(SUBSIDY_MEMO_STORAGE_KEY);
  const [investmentConfirmedRows, toggleInvestmentConfirmedRow] = useConfirmedRows(INVESTMENT_CONFIRMED_STORAGE_KEY);
  const [eventConfirmedRows, toggleEventConfirmedRow] = useConfirmedRows(EVENT_CONFIRMED_STORAGE_KEY);
  const [eventInstitutionConfirmedRows, toggleEventInstitutionConfirmedRow] = useConfirmedRows(
    EVENT_INSTITUTION_CONFIRMED_STORAGE_KEY
  );
  const institutionRowSpans = groupRowSpans(EVENT_INSTITUTION_DATA);

  return (
    <Layout highlightScope={activeTab}>
      <div className="page-content">
        <section className="page-heading" style={{ marginBottom: "12px" }}>
          <div className="title-area">
            <div className="title-wrapper" style={{ flexDirection: "row", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--text-faint)",
                  letterSpacing: "0.02em",
                }}
              >
                2027 본예산
              </span>
              <h1>성과평가반영</h1>
            </div>
          </div>
        </section>

        <section className="perf-section">
          <div className="perf-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`perf-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="perf-content">
            {activeTab === "보조금 운용평가" && (
              <div className="subsidy-table-wrap">
                <table className="subsidy-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>부서명</th>
                      <th rowSpan={2} className="subsidy-project-narrow">사업명 (세부사업명/부기명)</th>
                      <th rowSpan={2}>통계목명</th>
                      <th rowSpan={2}>평가결과</th>
                      <th colSpan={2}>예산현황</th>
                      <th rowSpan={2} className="subsidy-reflection-cell">반영결과</th>
                      <th rowSpan={2}>메모</th>
                      <th rowSpan={2}>반영 여부 확인</th>
                    </tr>
                    <tr>
                      <th>&apos;25년</th>
                      <th>&apos;26년</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUBSIDY_EVALUATION_DATA.map((row, i) => (
                      <tr key={i}>
                        <td>{row.department}</td>
                        <td className="subsidy-project-cell subsidy-project-narrow">
                          {row.projectName} <span className="subsidy-detail-name">({row.detailName})</span>
                        </td>
                        <td>{row.statisticsItem}</td>
                        <td style={{ color: evaluationColor(row.evaluation), fontWeight: 600 }}>{row.evaluation}</td>
                        <td className="subsidy-num">{row.budget25}</td>
                        <td className="subsidy-num">{row.budget26}</td>
                        <td className="subsidy-reflection-cell" style={{ color: reflectionColor(row.reflection), fontWeight: 600 }}>{row.reflection}</td>
                        <td>
                          <input
                            type="text"
                            className="subsidy-memo-input"
                            value={subsidyMemos[i] ?? ""}
                            onChange={(e) => updateSubsidyMemo(i, e.target.value)}
                            placeholder="메모"
                            aria-label={`${row.projectName} 메모`}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            className="subsidy-check"
                            checked={!!confirmedRows[i]}
                            onChange={() => toggleConfirmedRow(i)}
                            aria-label={`${row.projectName} 반영 여부 확인`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === "주요 재정사업 평가" && (
              <>
                <div className="perf-subtabs">
                  {FISCAL_PROJECT_SUB_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      className={`perf-subtab ${fiscalProjectSubTab === tab.key ? "active" : ""}`}
                      onClick={() => setFiscalProjectSubTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {fiscalProjectSubTab === "투자사업" && (
                  <>
                    <FiscalProjectNotice />
                    <div className="subsidy-table-wrap">
                    <table className="subsidy-table">
                      <thead>
                        <tr>
                          <th>부서명</th>
                          <th>평가대상 사업명(세부사업명)</th>
                          <th>2025년 최종 예산액(천원)</th>
                          <th>자체평가</th>
                          <th>1차 심층평가</th>
                          <th>최종평가</th>
                          <th>반영 여부 확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INVESTMENT_PROJECT_DATA.map((row, i) => (
                          <tr key={i}>
                            <td>{row.department}</td>
                            <td className="subsidy-project-cell">{row.projectName}</td>
                            <td className="subsidy-num">{row.budget}</td>
                            <td>{row.selfEval}</td>
                            <td>{row.deepEval}</td>
                            <td className="perf-final-grade" style={{ color: gradeColor(row.finalGrade) }}>{row.finalGrade}</td>
                            <td>
                              <input
                                type="checkbox"
                                className="subsidy-check"
                                checked={!!investmentConfirmedRows[i]}
                                onChange={() => toggleInvestmentConfirmedRow(i)}
                                aria-label={`${row.projectName} 반영 여부 확인`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}

                {fiscalProjectSubTab === "행사성사업" && (
                  <>
                    <FiscalProjectNotice />
                    <div className="subsidy-table-wrap">
                    <table className="subsidy-table">
                      <thead>
                        <tr>
                          <th>부서명</th>
                          <th>평가대상 행사명(부기명)</th>
                          <th>(참고)세부사업명</th>
                          <th>2025년 최종 예산액(천원)</th>
                          <th>자체평가</th>
                          <th>1차 심층평가</th>
                          <th>최종평가</th>
                          <th>반영 여부 확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EVENT_PROJECT_DATA.map((row, i) => (
                          <tr key={i}>
                            <td>{row.department}</td>
                            <td className="subsidy-project-cell">{row.eventName}</td>
                            <td className="subsidy-project-cell">{row.detailName}</td>
                            <td className="subsidy-num">{row.budget}</td>
                            <td>{row.selfEval}</td>
                            <td>{row.deepEval}</td>
                            <td className="perf-final-grade" style={{ color: gradeColor(row.finalGrade) }}>{row.finalGrade}</td>
                            <td>
                              <input
                                type="checkbox"
                                className="subsidy-check"
                                checked={!!eventConfirmedRows[i]}
                                onChange={() => toggleEventConfirmedRow(i)}
                                aria-label={`${row.eventName} 반영 여부 확인`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}

                {fiscalProjectSubTab === "행사성사업(출연기관)" && (
                  <>
                    <FiscalProjectNotice />
                    <div className="subsidy-table-wrap">
                    <table className="subsidy-table">
                      <thead>
                        <tr>
                          <th>기관명</th>
                          <th>평가대상 행사명</th>
                          <th>2025년 최종 예산액(천원)</th>
                          <th>자체평가</th>
                          <th>1차 심층평가</th>
                          <th>최종평가</th>
                          <th>반영 여부 확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EVENT_INSTITUTION_DATA.map((row, i) => (
                          <tr key={i}>
                            {institutionRowSpans[i] && (
                              <td rowSpan={institutionRowSpans[i] as number}>{row.institution}</td>
                            )}
                            <td className="subsidy-project-cell">{row.eventName}</td>
                            <td className="subsidy-num">{row.budget}</td>
                            <td>{row.selfEval}</td>
                            <td>{row.deepEval}</td>
                            <td className="perf-final-grade" style={{ color: gradeColor(row.finalGrade) }}>{row.finalGrade}</td>
                            <td>
                              <input
                                type="checkbox"
                                className="subsidy-check"
                                checked={!!eventInstitutionConfirmedRows[i]}
                                onChange={() => toggleEventInstitutionConfirmedRow(i)}
                                aria-label={`${row.eventName} 반영 여부 확인`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .perf-section {
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .perf-tabs {
          display: flex;
          gap: 0;
          background: var(--bg-elevated);
          border-bottom: 2px solid var(--border);
          overflow-x: auto;
          padding: 0;
          flex-wrap: wrap;
        }

        .perf-tab {
          flex-shrink: 0;
          padding: 16px 32px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--text-muted);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          line-height: 1.4;
        }

        .perf-tab:hover {
          color: var(--text);
          background: rgba(118, 157, 194, 0.08);
        }

        .perf-tab.active {
          color: #5b9bf0;
          border-bottom-color: #5b9bf0;
          font-weight: 700;
        }

        .perf-content {
          padding: 40px;
          min-height: 500px;
          background: var(--bg-surface);
        }

        .perf-subtabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .perf-subtab {
          flex-shrink: 0;
          padding: 8px 18px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .perf-subtab:hover {
          color: var(--text);
          background: rgba(118, 157, 194, 0.08);
        }

        .perf-subtab.active {
          color: #fff;
          background: #5b9bf0;
          border-color: #5b9bf0;
        }

        .subsidy-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 6px;
        }

        .subsidy-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          font-size: 13px;
        }

        .subsidy-table th,
        .subsidy-table td {
          border: 1px solid var(--border);
          padding: 10px 12px;
          text-align: center;
          vertical-align: middle;
        }

        .subsidy-table td:first-child {
          white-space: nowrap;
        }

        .subsidy-table thead th {
          background: rgba(126, 231, 187, 0.16);
          color: var(--text);
          font-size: 15px;
          font-weight: 400;
          white-space: nowrap;
        }

        .subsidy-table td.subsidy-project-cell {
          text-align: left;
          min-width: 220px;
        }

        .subsidy-table th.subsidy-project-narrow,
        .subsidy-table td.subsidy-project-narrow {
          min-width: 160px;
          max-width: 200px;
        }

        .subsidy-detail-name {
          font-size: 12px;
          color: var(--text-muted);
        }

        .subsidy-table th.subsidy-reflection-cell,
        .subsidy-table td.subsidy-reflection-cell {
          min-width: 90px;
          max-width: 110px;
          white-space: normal;
        }

        .subsidy-memo-input {
          width: 100%;
          min-width: 110px;
          padding: 4px 6px;
          font-size: 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text);
        }

        .subsidy-table td.subsidy-num {
          text-align: right;
          white-space: nowrap;
        }

        .subsidy-table tbody tr:nth-child(even) {
          background: rgba(118, 157, 194, 0.04);
        }

        .subsidy-check {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #5b9bf0;
        }

        .perf-final-grade {
          font-weight: 700;
          background: rgba(217, 173, 82, 0.12);
          border-left: 2px solid #ff6b7d !important;
          border-right: 2px solid #ff6b7d !important;
        }

        .perf-notice {
          border: 1px solid rgba(217, 173, 82, 0.35);
          border-left: 3px solid #d9ad52;
          border-radius: 6px;
          background: rgba(217, 173, 82, 0.06);
          padding: 16px 20px;
          margin-bottom: 24px;
          font-size: 13px;
          color: var(--text);
          line-height: 1.7;
        }

        .perf-notice-title {
          margin: 0 0 8px;
          font-weight: 700;
          color: var(--text);
        }

        .perf-notice ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .perf-notice li {
          margin: 2px 0;
        }

        .perf-notice-footnote {
          margin: 10px 0 0;
          color: var(--text-muted);
          font-size: 12px;
        }
      `}</style>
    </Layout>
  );
}
