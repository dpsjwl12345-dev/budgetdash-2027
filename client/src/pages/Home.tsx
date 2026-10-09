/*
 * Civic Ledger 스타일 기준: 사용자가 제공한 참조 대시보드의 어두운 네이비 행정 업무 화면을 보존한다.
 * 이번 수정 범위는 데스크톱 전체 가독성 향상이며, 정보 구조와 상태 체계는 유지하고 타이포그래피만 한 단계 크게 잡는다.
 */
import { Fragment, useMemo, useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";
import { normalizeSupplementaryName, normalizeSupplementaryStat, readSupplementaryFile, type SupplementaryReport } from "@/lib/supplementaryBudget";

type BudgetExecution = {
  id: number;
  department: string;
  policyName: string;
  programName: string;
  unitName: string;
  statisticsCode: string;
  original: number;
  supplementary: number;
  preEstablishment: number;
  reserve: number;
  carryover: number;
  budget: number;
  executed: number;
  executionRate: number;
};
import Pagination from "@/components/Pagination";
import {
  AlertCircle,
  FilePlus2,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  Filter,
  Gauge,
  History,
  LayoutDashboard,
  ListFilter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Upload,
  UsersRound,
  X,
  Database,
  Landmark,
  Calculator,
  Network,
  StickyNote,
} from "lucide-react";
import { CHEJEON_ESTIMATES, CHEJEON_CONF_LABEL } from "@/lib/chejeonEstimates";
import { CHEJEON_ORG } from "@/lib/chejeonOrg";
import AllDepartmentsOverview from "@/components/AllDepartmentsOverview";

type Status = "정상" | "오류" | "주의" | "사전";

type BudgetRow = {
  id: number;
  policy: string;
  program: string;
  code: string;
  account: string;
  detail: string;
  amount: number;
  city: number;
  national: number;
  province: number;
  other: number;
  previous: number;
  status: Status;
  note?: string;
  department?: string;
  procedures?: number[];
  formulaErrors?: string[];
};

type HierarchyLevel = "dept" | "policy" | "unit" | "program" | "account" | "item" | "note" | "formula" | "opinion";

type BudgetHierarchyRow = {
  id: string;
  level: HierarchyLevel;
  label: string;
  budget?: number;
  previous?: number;
  difference?: number;
  statisticsCode?: string;
  description?: string;
  parentId?: string;
  colSpan?: number;
};


// 부기명 강조 색. 색만 칠하면 나중에 왜 칠했는지 잊으므로 뜻을 붙여 둔다.
const ROW_MARK_COLORS = [
  { color: '#ffe45c', label: '확인 필요' },
  { color: '#ffb3c1', label: '감액 검토' },
  { color: '#a8e6a3', label: '확인 완료' },
] as const;

const PROCEDURE_NAMES: Record<number, string> = {
  1: "재정합의",
  2: "투자심사",
  3: "중기재정계획",
  4: "재정영향평가",
  5: "보조금심의",
  6: "용역심의",
  7: "출연금",
  8: "정보화",
  9: "기간제",
  10: "국외여비",
  11: "공유재산",
  12: "물품정수",
  13: "축제심의",
  14: "교육경비",
  15: "사회보장",
  16: "재난안전"
};

// 5번 "보조금심의"(보조금관리위원회 심의 대상) 통계목 코드 - 예산요구서 화면(getApplicableProcedures)과
// 편성 시트 배너(HIERARCHY_PROCEDURE_BADGES)가 서로 다른 기준으로 "보조금"을 판정하지 않도록
// 하나로 모아 공유한다.
const SUBSIDY_REVIEW_CODES = ["307-02", "307-03", "307-04", "307-09", "307-10", "307-11", "402-01", "308-01", "308-08", "308-09", "308-12", "403-01", "403-03", "403-04"];

const yearOptions = [
  { value: "2027", label: "2027년" },
  { value: "2026", label: "2026년" },
];

const departmentOptions = [
  { value: "", label: "선택" },
  // "전체"를 고르면 부서 예산서 대신 국별·부서별 증감 비교 표를 보여 준다.
  { value: "전체", label: "전체" },
  { value: "문화예술과", label: "문화예술과" },
  { value: "문화유산과", label: "문화유산과" },
  { value: "독립기념관", label: "독립기념관" },
  { value: "관광진흥과", label: "관광진흥과" },
  { value: "교육지원과", label: "교육지원과" },
  { value: "평생학습과", label: "평생학습과" },
  { value: "도서관정책과", label: "도서관정책과" },
  { value: "체육진흥과", label: "체육진흥과" },
  { value: "전국체전추진단", label: "전국체전추진단" },
];

// 화성시 주요투자사업 대시보드(https://hwaseong-major-investment-dashboard.vercel.app/)에 등록된
// 부서별 관리사업(세부사업) 명단. 예산 편성 시트의 세부사업명이 여기 있으면 "주요" 배지를 붙이고,
// "2027년 주요투자사업 예산액" 카드 집계에도 포함한다. 이름이 같아도 부서가 다르면 다른 사업으로
// 취급하므로 부서별로 분리해서 관리한다.
const MAJOR_INVESTMENT_PROGRAMS: Record<string, string[]> = {
  문화예술과: [
    "동탄복합문화센터 공간개선",
    "화성예술의전당 소공연장 조성",
    "화성 시립미술관 건립",
    "농수산대학 유휴부지 공연장 건립",
    "석우동 51번지 복합문화시설 건립",
    "화성남양 문화예술공간 조성",
    "효행구 대규모 공연장 건립",
    "정남면 복합문화센터 건립",
    "화성시 공룡과학센터 건립",
    "화성시 테마 어린이 과학관 건립",
    "병점 복합문화센터 조성",
    "아트큐브 예술숲 건립",
    // 2027 예산서 세부사업명이 주요투자사업 대시보드 사업명과 달라 따로 넣는다(2027 요구액으로 대응 확인).
    "시립미술관 건립", // = 화성 시립미술관 건립
    "화성시 테마(어린이)과학관 건립", // = 화성시 테마 어린이 과학관 건립
    "수장·연구시설 건립", // = 화성시 공룡과학센터 건립
    "화성시 정남면 복합문화센터 건립", // = 정남면 복합문화센터 건립
  ],
  문화유산과: [
    "화성시역사박물관 건립",
    "만년제 복원 및 정비",
    // 예산서 세부사업명(주요투자사업 대시보드 2027 요구액으로 대응 확인)
    "역사박물관 확충 건립", // = 화성시역사박물관 건립
    "만년제 정비(전환사업)", // = 만년제 복원 및 정비
    "만년제 주변 정비사업", // = 만년제 복원 및 정비
  ],
  독립기념관: [
    "화성독립운동역사문화공원 조성",
    "쌍봉산 기념탑 조성",
  ],
  관광진흥과: [
    "서해안 관광벨트 주차장 및 도로 조성",
    "제부도 도시계획도로 중로2 3호선 외 3개소 개설",
    "고렴산 해상공원 조성",
    "국화도 해안데크 정비",
    "궁평 종합관광지 조성",
    "제부지역 관광 인프라 확충",
    "도서지역 레저선박 계류시설 설치",
    "국화도 해안데크 정비사업", // = 국화도 해안데크 정비
    "제부도 도시계획도로 중로2-3호선 외 3개소 개설", // = 제부도 도시계획도로 중로2 3호선 외 3개소 개설
    "서해안 황금해안길 조성",
  ],
  도서관정책과: [
    "화성시 독서문화공간 조성",
    "반월도서관 건립",
    "다올공원도서관 건립",
    "둥지나래어린이도서관 리모델링(시그니처 종합형)",
    "(가칭)반월도서관 건립", // = 반월도서관 건립
    "(가칭)반월도서관 내부시설 구축", // = 반월도서관 건립
    "(가칭)화성시 독서문화공간 조성(전환사업)", // = 화성시 독서문화공간 조성
    "(가칭)화성시 독서문화공간 조성 내부시설 구축", // = 화성시 독서문화공간 조성
    "26년 공공건축물 그린리모델링사업(화성시-시그니처 종합형-도서관)", // = 둥지나래어린이도서관 리모델링
  ],
  체육진흥과: [
    "화성 동부 반다비체육센터 건립",
    "비봉 다목적체육관 건립",
    "남양 체육복합센터 조성",
    "장안 다목적복합센터 건립",
    "비봉체육공원 야구장 개선",
    "비봉체육공원 실내야구연습장 개축",
    "봉담 생태체육공원 테니스장 설치",
    "화성 파크골프장 조성",
    "화성FC 기반시설 확충",
    "화성 돔야구장 건립",
    "서해선 교량하부 체육시설 조성",
    "오음공원 테니스장 조성",
    "화성 돔구장 및 복합체육센터 건립",
    "축구전용경기장 건립사업", // = 축구전용경기장 건립(동탄여울공원)
    "서해선 교량하부 체육시설 조성공사", // = 서해선 교량하부 체육시설 조성
  ],
  전국체전추진단: [
    "롤러스포츠 경기장 건립",
    "석우동 축구장 건립",
    "2027년 전국체육대회 경기장 개보수",
  ],
};

function isMajorInvestmentProgram(department: string, label: string): boolean {
  return MAJOR_INVESTMENT_PROGRAMS[department]?.includes(label) ?? false;
}

// "요구사항 반영" 메뉴의 시의원 요구·민선9기 공약·시장/부시장 지시사항·당정협의회가 예산서에 실려 있으면
// 그 줄(부기명, 없으면 세부사업)에 배지를 단다. 이름은 공백·괄호·"○"·끝의 "공사"를 빼고 비교한다.
type RequestRecord = { requestType: string; memberName: string; electoralDistrict?: string; department: string; content: string; budgetItemName: string; requestedAmount: string; status: string };
type RequestBadge = { label: string; tone: "council" | "pledge" | "mayor" | "party"; title: string };
const REQUEST_BADGE_STYLES: Record<RequestBadge["tone"], { background: string; color: string }> = {
  council: { background: "rgba(144, 133, 233, 0.18)", color: "#6b5fd3" },
  pledge: { background: "rgba(25, 158, 112, 0.16)", color: "#13805a" },
  mayor: { background: "rgba(217, 89, 38, 0.15)", color: "#c24a1a" },
  party: { background: "rgba(37, 99, 235, 0.13)", color: "#1d4ed8" },
};
const normalizeBudgetName = (text: string) => text.replace(/^[○◦·\-\s]+/, "").replace(/[\s()·,\[\]]/g, "").replace(/공사$/, "");

function requestBadge(request: RequestRecord): RequestBadge | null {
  const title = [request.requestType, request.content.replace(/\n/g, " "), request.requestedAmount, request.status].filter(Boolean).join(" · ");
  // 당정협의회는 "당정 병"처럼 국회의원 지역구(갑~정)로 단다("화성갑"으로 적힌 건도 "갑"만).
  if (request.requestType === "당정협의회") {
    const district = (request.electoralDistrict || "").trim().replace(/^화성시?\s*/, "");
    return { label: /^(갑|을|병|정)$/.test(district) ? `당정 ${district}` : "당정", tone: "party", title };
  }
  if (request.requestType === "정책간담회") return { label: "정책간담회", tone: "council", title };
  // 시의원 요구는 요구한 시의원 이름으로 배지를 단다.
  if (request.requestType === "시의원" && request.memberName) return { label: `${request.memberName} 의원`, tone: "council", title };
  if (request.requestType === "민선9기공약") return { label: "공약", tone: "pledge", title };
  if (request.requestType === "시장") return { label: "시장", tone: "mayor", title };
  if (request.requestType === "부시장") return { label: (request.memberName || "부시장").replace(/^제/, ""), tone: "mayor", title };
  return null;
}

// 이름만으로는 예산서 줄을 찾을 수 없는 요구사항을 어느 세부사업에 붙일지 정해 둔 표(사용자 확인).
// match는 요구 내용·항목명에 들어 있는 말, target은 예산서 세부사업명.
const REQUEST_TARGETS: { department: string; match: string; target: string }[] = [
  { department: "체육진흥과", match: "파크골프장확대", target: "오산천 파크골프장 조성사업" },
  { department: "도서관정책과", match: "지역도서관추가건립", target: "(가칭)반월도서관 건립" },
  { department: "도서관정책과", match: "지역도서관추가건립", target: "(가칭)화성시 독서문화공간 조성(전환사업)" },
];

// 요구사항이 다른 부서로 잘못 등록됐거나 예산서 부기명과 이름이 달라 자동으로 못 찾는 경우,
// 특정 부서·세부사업·부기명 줄에 직접 붙인다(사용자 확인). match는 요구 내용에 들어 있는 말.
const REQUEST_NOTE_TARGETS: { match: string; department: string; program: string; note: string }[] = [
  { match: "매향리평화기념관관광조형물", department: "관광진흥과", program: "매향리평화기념관 시설운영", note: "기념관 시설조성비" },
  { match: "영재교육원확대", department: "교육지원과", program: "인재육성재단 운영지원", note: "영재교육원 운영" },
  { match: "핫플레이스선정플랫폼", department: "관광진흥과", program: "관광브랜드 강화", note: "AI기반 데이터 활용 관광플랫폼 구축" },
  { match: "선셋콘서트", department: "관광진흥과", program: "화성시문화관광재단 관광진흥본부 지원", note: "화성시문화관광재단 관광진흥본부 지원" },
  { match: "테크노폴해외연수", department: "교육지원과", program: "인재육성재단 운영지원", note: "경영기획본부 운영" },
  { match: "화성형교육혁신", department: "교육지원과", program: "화성형 교육혁신 프로그램 운영", note: "화성형 교육혁신 프로그램 운영 지원" },
  { match: "봉담권예술의전당", department: "문화예술과", program: "문화예술타운 효행아트홀 건립", note: "기본구상 및 타당성조사 용역" },
  { match: "국제음악제", department: "문화예술과", program: "화성시문화관광재단 지원", note: "화성시문화관광재단 지원" },
];

// 요구사항에서 예산서 이름과 맞춰 볼 후보들: 예산 항목명·내용의 각 줄, 괄호 안쪽 이름.
function requestKeys(request: RequestRecord): string[] {
  const texts = [request.budgetItemName, ...request.content.split("\n")].flatMap((text) => text.split(/[()]/));
  return Array.from(new Set(texts.map(normalizeBudgetName).filter((key) => key.length >= 4)));
}

const columns = [
  ["policy", "정책 · 단위 · 세부사업"],
  ["account", "편성목·통계목"],
  ["detail", "산출내역"],
  ["amount", "요구액"],
  ["city", "시비"],
  ["national", "국비"],
  ["province", "도비"],
  ["other", "기타"],
  ["previous", "전년도"],
  ["status", "상태"],
] as const;

type ColumnKey = (typeof columns)[number][0];

function formatAmount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatMillion(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value / 1000));
}

// 사용자가 콤마(예: "61,509")를 섞어 입력해도 깨지지 않도록 숫자만 남기고 변환한다.
function parseBudgetInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// 2027 요구액 카드의 "본예산대비"/"3추대비" 증감률. 기준값이 없거나 0이면 비교 자체가
// 의미 없으므로 null을 반환해 배지를 숨긴다. 부호 표기는 시 전체 현황 카드와 통일
// (증가 "+", 감소 "△").
function formatYoyPercent(current: number, base: number | null): string | null {
  if (!base) return null;
  const pct = Math.round(((current - base) / base) * 1000) / 10;
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct.toFixed(1)}%` : `△${Math.abs(pct).toFixed(1)}%`;
}

// row.program은 엑셀 업로드 시 "단위사업명\n세부사업명"으로 합쳐져 저장되므로,
// 필터 드롭다운에는 세부사업명(마지막 줄)만 보여준다.
function getDetailName(program: string) {
  const lines = program.split("\n");
  return lines[lines.length - 1] || program;
}

function getApplicableProcedures(row: BudgetRow): number[] {
  const applicable: number[] = [];
  const text = `${row.policy} ${row.program} ${row.account} ${row.detail}`.toLowerCase();
  const amount = row.amount;

  // 1번 재정합의 - 모든 사업
  applicable.push(1);

  // 2번 투자심사 - 2000 백만원(20억) 이상
  if (amount >= 2000) applicable.push(2);

  // 3번 중기재정계획 - 모든 사업
  applicable.push(3);

  // 4번 재정영향평가 - 축제/경기대회/공연 또는 공모사업
  if (text.includes("축제") || text.includes("경기대회") || text.includes("공연")) {
    if (amount >= 1000) applicable.push(4);
  } else if (text.includes("공모")) {
    if (amount >= 10000) applicable.push(4);
  }

  // 5번 보조금심의 - 통계목 코드, 또는 신규(전년도 예산 없음) 행사운영비 사업(민간 행사대행·보조 성격이 섞여 있어 함께 심의)
  const isNewEventOperationExpense = text.includes("행사운영비") && !row.previous;
  if (SUBSIDY_REVIEW_CODES.some(code => row.account.includes(code)) || isNewEventOperationExpense) applicable.push(5);

  // 6번 용역심의 - 용역 + 10 백만원(1천만원) 이상
  if (text.includes("용역") && amount >= 10) applicable.push(6);

  // 7번 출연금 - 출연/출자/위탁
  if (text.includes("출연") || text.includes("출자") || text.includes("위탁")) applicable.push(7);

  // 8번 정보화 - 정보화/정보시스템/소프트웨어/전산개발비
  if (text.includes("정보화") || text.includes("정보시스템") || text.includes("소프트웨어") || text.includes("db") || text.includes("전산")) applicable.push(8);

  // 9번 기간제근로자 - 기간제/임시직
  if (text.includes("기간제") || text.includes("임시직")) applicable.push(9);

  // 10번 국외여비 - 국외/여비/출장/국제
  if (text.includes("국외") || text.includes("여비") || text.includes("출장") || text.includes("국제")) applicable.push(10);

  // 11번 공유재산 - 공유재산 + 10000 백만원(100억) 이상
  if (text.includes("공유재산") && amount >= 10000) applicable.push(11);

  // 12번 물품정수 - 물품/차량/구매
  if (text.includes("물품") || text.includes("차량") || text.includes("구매")) applicable.push(12);

  // 13번 축제심의 - 축제 + 100 백만원(1억) 이상
  if (text.includes("축제") && amount >= 100) applicable.push(13);

  // 14번 교육경비 - 교육
  if (text.includes("교육")) applicable.push(14);

  // 15번 사회보장 - 사회보장/복지/보조/지원
  if (text.includes("사회보장") || text.includes("복지")) applicable.push(15);

  // 16번 재난안전 - 재난/안전/방재
  if (text.includes("재난") || text.includes("안전")) applicable.push(16);

  return applicable;
}

function getFormulaErrors(row: BudgetRow, staffData: Record<string, { capacity: string; current: string }>): string[] {
  const errors: string[] = [];
  const accountText = `${row.account}`.toLowerCase();
  const department = row.department || "";
  const currentStaff = parseInt(staffData[department]?.current || "0");
  const capacity = parseInt(staffData[department]?.capacity || "0");

  // 국내여비: 현원 × 20,000 × 9 × 12 (국외여비 제외)
  // 이 기준액은 상한이고, 실제 출장 빈도에 따라 부서 재량으로 그 아래로 편성할 수 있다
  // (고정 비율이 없다) - 기준을 초과했을 때만 오류로 표시한다.
  if ((accountText.includes("국내여비") && !accountText.includes("국외여비")) || accountText.includes("202-01")) {
    const expectedAmount = currentStaff * 20000 * 9 * 12;
    if (row.amount - expectedAmount > 1000) {
      errors.push(`국내여비: 현원 ${currentStaff} × 20,000 × 9 × 12 = ${expectedAmount.toLocaleString()}원 (상한 초과)`);
    }
  }

  // 급식비: 정원 × 600,000
  if (accountText.includes("급식비")) {
    const expectedAmount = capacity * 600000;
    if (Math.abs(row.amount - expectedAmount) > 1000) {
      errors.push(`급식비: 정원 ${capacity} × 600,000 = ${expectedAmount.toLocaleString()}원`);
    }
  }

  // 일반수용비: 정원 × 750,000
  if (accountText.includes("일반수용비")) {
    const expectedAmount = capacity * 750000;
    if (Math.abs(row.amount - expectedAmount) > 1000) {
      errors.push(`일반수용비: 정원 ${capacity} × 750,000 = ${expectedAmount.toLocaleString()}원`);
    }
  }

  return errors;
}

// 재정전략 가이드의 "[비목 및 규모별 사무전결 및 재정합의 기준]" 표를 그대로 코드로 옮긴 결재선 판정.
// 일반 사업은 4단계(시장/부시장/국장/과장), 축제·행사성 사업은 기준표에 3단계만 있어
// (1억 초과=시장, 5천만~1억=부시장) 그 아래 구간은 일반 기준의 최하단(과장)과 동일하게 취급한다.
// "국장"은 기준표의 "실·국·소·단장 전결"을 줄여 쓴 것이다.
// 기준표는 "시비" 금액 기준인데, 편성 시트 트리뷰(BudgetHierarchyRow)에는 시비/국비/도비가 갈라진
// 컬럼이 없고 총 요구액(budget)만 있어 부득이 총 요구액으로 판정한다 - 국비·도비 매칭 비중이 큰
// 사업은 실제 시비 기준보다 한 단계 높은 결재선으로 뜰 수 있으니 참고용으로만 쓸 것.
// 금액 단위는 이 트리뷰 전체와 동일하게 천원(row.budget) 기준이다.
// 10억=1,000,000 / 5억=500,000 / 1억=100,000 / 5천만=50,000 (모두 천원)
function getApprovalLine(requestAmount: number, isFestival: boolean): string {
  if (isFestival) {
    if (requestAmount > 100000) return "시장";
    if (requestAmount > 50000) return "부시장";
    return "과장";
  }
  if (requestAmount > 1000000) return "시장";
  if (requestAmount > 500000) return "부시장";
  if (requestAmount > 100000) return "국장";
  return "과장";
}

// 세출예산내역서(편성 시트)의 편성목(item) 행이 사전절차 대상인지 판단한다.
// 상위 통계목(account) 코드와 편성목명·세부사업명 텍스트로 판단하며, 판단 근거가
// 있는 항목만 편성목 행 바로 위에 배너로 표시한다 (금액 등은 원본 문서를 벗어나지 않는다).
type HierarchyBadgeCtx = { accountCode: string; fullCode: string; itemText: string; programText: string; amount: number };
const HIERARCHY_PROCEDURE_BADGES: {
  label: string | ((ctx: HierarchyBadgeCtx) => string);
  test: (ctx: HierarchyBadgeCtx) => boolean;
}[] = [
  // 재정합의는 모든 사업에 예외 없이 적용되므로(사전절차 체크리스트 01번, "편성 원천 불가") 항상 뜨되,
  // 금액 구간에 따라 실제 결재선을 라벨에 그대로 표시한다.
  {
    label: (ctx) => {
      const isFestival = /행사|축제|경기대회|공연/.test(`${ctx.itemText} ${ctx.programText}`);
      return getApprovalLine(ctx.amount, isFestival);
    },
    test: () => true,
  },
  { label: "투심", test: ({ amount }) => amount >= 2000000 },
  // 306(출연금)은 307/308(민간이전·자치단체등이전, 실제 "보조금" 성격) 및 402/403(자본이전)과는
  // 다른 계정이라 "보조금"으로 같이 묶으면 출연금 항목이 잘못된 뱃지를 달게 된다 - 따로 분리한다.
  { label: "출연금", test: ({ accountCode }) => /^306/.test(accountCode) },
  // 보조금관리위원회 심의 대상 여부는 "307/402/403/308 전체"처럼 대분류로 뭉뚱그리면 안 되고
  // 실제 심의 대상 통계목(SUBSIDY_REVIEW_CODES, getApplicableProcedures 5번과 동일한 기준)에
  // 편성액이 있을 때만 떠야 한다 - 이전에는 accountCode가 3자리 대분류로만 잘려 들어와
  // "308-13 제외" 같은 세부 코드 조건이 애초에 걸리지도 않는 채 대분류 전체가 다 걸렸었다.
  { label: "보조금", test: ({ fullCode, amount }) => SUBSIDY_REVIEW_CODES.includes(fullCode) && amount > 0 },
  { label: "행사", test: ({ itemText, programText }) => /행사|축제|경기대회|공연/.test(`${itemText} ${programText}`) },
  { label: "자산", test: ({ accountCode }) => /^405/.test(accountCode) },
  // 기간제근로자등 보수(101-04) - 코드 기준으로 먼저 잡고, 통계목명이 다르게 적힌 경우를 대비해
  // "기간제/임시직" 텍스트 매칭도 그대로 남겨둔다(둘 중 하나만 맞아도 뜬다).
  { label: "기간제", test: ({ fullCode, itemText }) => fullCode === "101-04" || /기간제|임시직/.test(itemText) },
  // 06. 용역과제 심의 - "1,000만 원 이상 학술·기술 용역 대상. 단, '시설비 및 부대비'(401) 비목의
  // 설계비·감리비는 심의 제외 대상"(가이드 원문). 401 코드는 명시적으로 제외한다.
  {
    label: "용역",
    test: ({ itemText, accountCode, amount }) =>
      /용역/.test(itemText) && amount >= 10000 && !/^401/.test(accountCode),
  },
  // 14. 교육경비 보조금 심의 - "교육경비 보조금 심의, 교육청 협의 및 편성 불가"(가이드 원문).
  // "교육"만으로 잡으면 직원 역량교육 같은 운영성 경비까지 잘못 걸리므로 "교육경비"로 좁힌다.
  { label: "교육", test: ({ itemText, programText }) => /교육경비/.test(`${itemText} ${programText}`) },
  // 10. 공무국외출장 사전 협의 - 국외업무여비 통계목(202-02) 또는 국외·해외출장 텍스트 기준.
  { label: "국외", test: ({ accountCode, itemText, programText }) => /^202-02/.test(accountCode) || /국외출장|해외출장/.test(`${itemText} ${programText}`) },
  // 15. 사회보장제도 복지부 사전 협의 - 사회보장적수혜금 통계목(301-01) 또는 사회보장 텍스트 기준.
  { label: "복지", test: ({ accountCode, itemText, programText }) => /^301-01/.test(accountCode) || /사회보장/.test(`${itemText} ${programText}`) },
];

function getHierarchyItemBadges(row: BudgetHierarchyRow, accountLabel: string, programLabel: string): string[] {
  const accountCode = accountLabel.match(/^\d+/)?.[0] ?? "";
  const itemCode = row.statisticsCode?.match(/^\d+/)?.[0] ?? "";
  const fullCode = accountCode && itemCode ? `${accountCode}-${itemCode}` : "";
  const itemText = `${row.statisticsCode ?? ""} ${row.description ?? ""}`;
  const amount = row.budget || 0;
  const ctx: HierarchyBadgeCtx = { accountCode, fullCode, itemText, programText: programLabel, amount };
  return HIERARCHY_PROCEDURE_BADGES.filter((rule) => rule.test(ctx)).map((rule) =>
    typeof rule.label === "function" ? rule.label(ctx) : rule.label
  );
}

// "세출 통계목별 상세" 가이드의 표준 산출식 중 이 앱에 등록된 정원·현원(staffData)만으로
// 실제 계산값을 내서 검증할 수 있는 것(국내여비/일반수용비/급식비)은 등록값과 다를 때만
// 표시한다. "수당"류(위원회수당·당직수당·심사수당 등)는 회의·근무 횟수처럼 이 앱에 없는
// 입력이 필요해 정확한 계산은 못 하지만, 산출식 오류가 잦은 항목이라 무조건 표시해
// 사람이 직접 산출근거를 확인하게 한다.
type HierarchyFormulaCheck = { name: string; message: string };

// 부기명 설명("18,750,000원 = 18,750", "750,000원*15명 = 11,250")에서 "=" 뒤의 최종 결과값을
// 뽑아 원 단위로 환산한다. 이 표는 값이 천원 단위로 저장되어 있다.
function parseTrailingAmountWon(text: string): number | null {
  const tail = text.split("=").pop() ?? "";
  const digits = tail.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return parseInt(digits, 10) * 1000;
}

// 정원가산업무추진비(203-02) 본청 기준 - 현원 구간별 누적 단가 합산.
// 화성시 부서는 전부 본청 소속이라 본청 단가표만 적용한다.
function calcStaffProportionalExpense203_02(current: number): number {
  const tiers = [
    { upTo: 100, rate: 80000 },
    { upTo: 300, rate: 60000 },
    { upTo: 600, rate: 45000 },
    { upTo: 800, rate: 30000 },
    { upTo: Infinity, rate: 15000 },
  ];
  let remaining = current;
  let prevCap = 0;
  let total = 0;
  for (const tier of tiers) {
    if (remaining <= 0) break;
    const countInTier = Math.min(remaining, tier.upTo - prevCap);
    total += countInTier * tier.rate;
    remaining -= countInTier;
    prevCap = tier.upTo;
  }
  return total;
}

// 부서운영업무추진비(203-04) - 현원 구간별 월정 기준액 × 12월.
function calcDepartmentOperatingExpense203_04(current: number): number {
  let monthly: number;
  if (current <= 5) monthly = 100000;
  else if (current <= 10) monthly = 175000;
  else if (current <= 15) monthly = 250000;
  else if (current <= 20) monthly = 300000;
  else if (current <= 25) monthly = 350000;
  else if (current <= 30) monthly = 400000;
  else monthly = 400000 + (current - 30) * 5000;
  return monthly * 12;
}

// 부기명(note) 줄들 안에서 keyword가 적힌 줄(예: "○일반수용비")을 찾은 뒤, 그 줄부터 다음
// 다른 keyword(예: "○급식비")가 나오기 전까지 범위 안에서 "=" 있는 첫 금액을 찾는다. 라벨과
// 계산식이 같은 줄에 있을 수도, 라벨 줄 다음에 계산식 줄이 따로 이어질 수도 있어 이렇게 찾아야
// 한다 - 라벨 줄에서만 찾으면 계산식이 다음 줄에 있는 경우 못 찾고, 전체를 합친 문자열에서
// 찾으면 다른 항목(급식비 등)의 금액을 잘못 가져오게 된다.
function findNoteAmountForKeyword(noteLines: string[], keyword: RegExp, otherKeywords: RegExp[]): number | null {
  const startIdx = noteLines.findIndex((line) => keyword.test(line));
  if (startIdx === -1) return null;
  for (let i = startIdx; i < noteLines.length; i++) {
    if (i > startIdx && otherKeywords.some((other) => other.test(noteLines[i]))) break;
    // "=" 없는 줄(라벨만 있는 줄 등)은 통계목 코드 숫자 같은 걸 금액으로 잘못 집을 수 있어 건너뛴다.
    if (!noteLines[i].includes("=")) continue;
    const amount = parseTrailingAmountWon(noteLines[i]);
    if (amount !== null) return amount;
  }
  return null;
}

// 한 편성목(item) 아래 일반수용비·급식비처럼 표준 산출식이 여러 개 걸려 있을 수 있어,
// 첫 번째로 어긋난 항목만 찾고 멈추면 나머지 항목의 산출식 오류가 화면에서 사라진다
// (예: 일반수용비와 급식비가 둘 다 정원 기준과 다르면 급식비 쪽 배지가 통째로 안 뜸).
// 그래서 배열로 전부 모아서 돌려주고, 화면에서는 사전절차 배지처럼 여러 개를 합쳐서 보여준다.
function getHierarchyFormulaChecks(
  row: BudgetHierarchyRow,
  accountLabel: string,
  noteLines: string[],
  staff: { capacity: string; current: string } | undefined
): HierarchyFormulaCheck[] {
  if (row.level !== "item") return [];
  const accountCode = accountLabel.match(/^\d+/)?.[0] ?? "";
  const itemCode = row.statisticsCode?.match(/^\d+/)?.[0] ?? "";
  const capacity = parseInt(staff?.capacity || "0", 10);
  const current = parseInt(staff?.current || "0", 10);
  const nearbyText = noteLines.join(" ");
  const results: HierarchyFormulaCheck[] = [];

  if (accountCode === "202" && itemCode === "01") {
    const actual = (row.budget || 0) * 1000;
    const expected = current * 20000 * 9 * 12;
    // 국내여비는 "20,000원×현원×9일×12월"이 상한 기준이고, 실제 출장 빈도(부서 재량, 고정 비율 없음)에
    // 따라 그 아래로도 정상 편성될 수 있다 - 그래서 "다르다=오류"로 단정하지 않고, 기준값과
    // 등록값이 다를 때마다 참고용으로 계속 띄워서 사람이 직접 근거를 확인하게 한다.
    if (Math.abs(actual - expected) > 1000) {
      results.push({ name: "국내여비", message: `국내여비: 기준(상한) ${expected.toLocaleString()}원 / 등록 ${actual.toLocaleString()}원 - 참고(부서 재량으로 낮을 수 있음)` });
    }
  }
  if (accountCode === "201" && itemCode === "01") {
    // 한 편성목(item) 아래 일반수용비·급식비 부기가 같이 있을 수 있고, 라벨 줄("○일반수용비")과
    // 계산식 줄("750,000원×15명=11,250,000원")이 따로 나뉘어 있을 수도 있다 - 라벨이 적힌 줄부터
    // 다음 다른 항목이 나오기 전까지 범위에서 "=" 있는 첫 금액을 찾는다.
    const generalActual = findNoteAmountForKeyword(noteLines, /일반수용비/, [/급식비/]);
    if (generalActual !== null) {
      const expected = capacity * 750000;
      if (Math.abs(generalActual - expected) > 1000) {
        results.push({ name: "일반수용비", message: `일반수용비: 기준 ${expected.toLocaleString()}원 / 등록 ${generalActual.toLocaleString()}원` });
      }
    }
    const mealActual = findNoteAmountForKeyword(noteLines, /급식비/, [/일반수용비/]);
    if (mealActual !== null) {
      const expected = capacity * 600000;
      if (Math.abs(mealActual - expected) > 1000) {
        results.push({ name: "급식비", message: `급식비: 기준 ${expected.toLocaleString()}원 / 등록 ${mealActual.toLocaleString()}원` });
      }
    }
  }
  // 정원가산업무추진비 - 현원 구간별 누적 단가 합산(본청 기준).
  if (accountCode === "203" && itemCode === "02") {
    const actual = (row.budget || 0) * 1000;
    const expected = calcStaffProportionalExpense203_02(current);
    if (Math.abs(actual - expected) > 1000) {
      results.push({ name: "정원가산업무추진비", message: `정원가산업무추진비: 기준 ${expected.toLocaleString()}원 / 등록 ${actual.toLocaleString()}원 (현원 ${current}명, 본청 기준)` });
    }
  }
  // 부서운영업무추진비 - 현원 구간별 월정 기준액 × 12월.
  if (accountCode === "203" && itemCode === "04") {
    const actual = (row.budget || 0) * 1000;
    const expected = calcDepartmentOperatingExpense203_04(current);
    if (Math.abs(actual - expected) > 1000) {
      results.push({ name: "부서운영업무추진비", message: `부서운영업무추진비: 기준 ${expected.toLocaleString()}원 / 등록 ${actual.toLocaleString()}원 (현원 ${current}명)` });
    }
  }

  if (results.length === 0) {
    const combinedText = `${row.statisticsCode ?? ""} ${row.description ?? ""} ${nearbyText}`;
    if (/수당/.test(combinedText)) {
      results.push({ name: "수당", message: "수당 항목 - 산출근거 직접 확인 필요" });
    }
  }

  return results;
}

function trapTabKey(event: React.KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const focusables = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function Dropdown({
  value,
  options,
  onChange,
  label,
  placeholder = "선택",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = options.find((option) => option.value === value);

  return (
    <div className="dropdown-container" ref={containerRef}>
      <button
        type="button"
        id={`dropdown-${label}`}
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="dropdown-value">{current?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`dropdown-icon ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="dropdown-menu" role="listbox">
          <div className="dropdown-options">
            {options.map((option) => (
              <button
                type="button"
                key={option.value || "__empty"}
                role="option"
                aria-selected={option.value === value}
                className={`dropdown-option ${option.value === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="option-text">{option.label}</span>
                {option.value === value && <Check size={14} className="option-check" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 세부사업/통계목 헤더 필터: 여러 값을 동시에 고를 수 있다(다중 선택). "전체"만 선택을 초기화하며
// 닫고, 나머지 항목은 눌러도 드롭다운이 안 닫혀서 이어서 여러 개를 계속 고를 수 있다 - 닫으려면
// 바깥을 클릭하거나 Esc를 누른다(기존 열림/닫힘 로직 그대로).
function HeaderFilterDropdown({
  label,
  value,
  options,
  onChange,
  align = "left",
}: {
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    searchRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()));
  const toggleOption = (option: string) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };
  const triggerLabel = value.length === 0 ? label : value.length === 1 ? value[0] : `${value[0]} 외 ${value.length - 1}개`;

  return (
    <div className="th-filter" ref={containerRef}>
      <button
        type="button"
        className="th-filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} 필터`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="th-filter-label" title={value.join(', ') || undefined}>{triggerLabel}</span>
        <ChevronDown size={14} className={`th-filter-icon ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className={`dropdown-menu th-filter-menu ${align === "right" ? "align-right" : ""}`} role="listbox">
          <input
            ref={searchRef}
            className="dropdown-search"
            placeholder={`${label} 검색`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="dropdown-options">
            <button
              type="button"
              role="option"
              aria-selected={value.length === 0}
              className={`dropdown-option ${value.length === 0 ? "selected" : ""}`}
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
            >
              <span className="option-text">전체</span>
              {value.length === 0 && <Check size={14} className="option-check" />}
            </button>
            {filtered.length === 0 && <div className="dropdown-empty">일치하는 항목이 없습니다</div>}
            {filtered.map((option) => {
              const isSelected = value.includes(option);
              return (
                <button
                  type="button"
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  className={`dropdown-option ${isSelected ? "selected" : ""}`}
                  onClick={() => toggleOption(option)}
                >
                  <span className="option-text">{option}</span>
                  {isSelected && <Check size={14} className="option-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const icon = status === "정상" ? <Check size={14} strokeWidth={2.5} /> : <AlertCircle size={14} />;
  return <span className={`status-badge status-${status}`}>{icon}{status}</span>;
}

function AppButton({
  children,
  variant = "ghost",
  onClick,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "ghost" | "outline" | "primary" | "danger";
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button className={`app-button button-${variant} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>(() => {
    const saved = localStorage.getItem('budgetRows');
    return saved ? JSON.parse(saved) : [];
  });
  // 세출예산내역서 / 세입예산내역서 - 같은 화면·같은 업로드·편집 구조를 그대로 쓰되
  // 데이터만 갈라 보관한다. 서버에는 새 테이블을 만들지 않고, 세입 쪽 부서 블록의
  // dept 행 label 앞에 "세입::" 접두어를 붙여 같은 budget_hierarchy_rows 테이블에
  // 같이 저장한다(요청사항 반영 화면의 "부서::세부사업" 키 관행과 동일한 방식).
  const REVENUE_DEPT_PREFIX = "세입::";
  const [statementView, setStatementView] = useState<"expenditure" | "revenue">("expenditure");
  const [expenditureHierarchyRows, setExpenditureHierarchyRows] = useState<BudgetHierarchyRow[]>([]);
  const [revenueHierarchyRows, setRevenueHierarchyRows] = useState<BudgetHierarchyRow[]>([]);
  // 아래부터는 전부 이 이름으로 읽고 쓴다 - statementView가 바뀌면 가리키는 실제
  // 저장소만 바뀌고, 필터링·검색·업로드·편집 로직은 손대지 않아도 그대로 동작한다.
  const budgetHierarchyRows = statementView === "expenditure" ? expenditureHierarchyRows : revenueHierarchyRows;
  const setBudgetHierarchyRows = statementView === "expenditure" ? setExpenditureHierarchyRows : setRevenueHierarchyRows;
  const [programMemos, setProgramMemos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('budgetProgramMemos');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  // 부기명 강조 표시. 키는 "부서::세부사업::통계목::부기명".
  const [rowMarks, setRowMarks] = useState<Record<string, string>>({});
  const [markPickerKey, setMarkPickerKey] = useState<string | null>(null);
  // 부기명 줄에 다는 한두 단어짜리 메모. 저장 위치는 강조 표시와 같은 행이다.
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({});
  const [editingRowNoteKey, setEditingRowNoteKey] = useState<string | null>(null);
  // 부기명 메모는 왼쪽 넓은 칸과 오른쪽 좁은 칸 두 군데서 적을 수 있는데, 입력칸은 클릭한 쪽에만 띄운다
  // (둘 다 띄우면 autoFocus끼리 포커스를 뺏어 곧바로 blur로 편집이 닫혀 버린다).
  const [editingRowNoteSide, setEditingRowNoteSide] = useState<'left' | 'right'>('left');
  const [rowNoteDraft, setRowNoteDraft] = useState("");
  // X(숨기기)를 누른 직후 "정말 숨길까요?"를 묻는 동안의 대상. 연필(수정) 버튼과 22px 간격이라
  // 잘못 눌리기 쉬운데, 예전엔 그 한 번으로 메모 줄이 모든 기기에서 영구히 사라졌다.
  const [pendingHideId, setPendingHideId] = useState<string | null>(null);
  const [hiddenMemoIds, setHiddenMemoIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('budgetHiddenMemoIds');
    return saved ? JSON.parse(saved) : [];
  });
  // "검토" 열의 사전/산출식 버튼을 각각 "확인함" 처리한 편성목(item) row id 목록. 사전절차와
  // 산출식은 서로 다른 확인 대상이라 목록을 따로 관리한다. 이 앱을 쓰는 이 브라우저에서만 유지되는
  // 확인 표시라, 다른 컴퓨터나 다른 검토자에게는 공유되지 않는다.
  const [confirmedProcedureIds, setConfirmedProcedureIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('budgetConfirmedProcedureIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [confirmedFormulaIds, setConfirmedFormulaIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('budgetConfirmedFormulaIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [confirmingBadge, setConfirmingBadge] = useState<{ rowId: string; type: 'procedure' | 'formula'; detail: string } | null>(null);
  const [executionData, setExecutionData] = useState<BudgetExecution[]>(() => {
    const saved = localStorage.getItem('budgetExecution2026Rows');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingRow, setEditingRow] = useState<BudgetRow | null>(null);
  const [year, setYear] = useState("2027");
  const [department, setDepartment] = useState(() => {
    const saved = localStorage.getItem('selectedDepartment');
    return saved || '';
  });
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"전체" | Status>("전체");
  const [search, setSearch] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(columns.map(([key]) => key));
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffData, setStaffData] = useState<Record<string, { capacity: string; current: string }>>(() => {
    const saved = localStorage.getItem('staffData');
    return saved ? JSON.parse(saved) : {};
  });
  // 정현원 옆 "부서 메모" — "부서별 주요 쟁점사항"(department_issues)과는 별개의 저장소(department_memos).
  const [showDeptMemoModal, setShowDeptMemoModal] = useState(false);
  const [requestRecords, setRequestRecords] = useState<RequestRecord[]>([]);
  const [deptMemos, setDeptMemos] = useState<Record<string, { memos: { id?: string; text: string; date: string }[] }>>({});
  const [deptMemoDraft, setDeptMemoDraft] = useState("");
  // 2026 본예산액·3추 기준 예산액 — 부서별로 직접 입력해 편집하는 값(천원).
  const [showBudget2026Modal, setShowBudget2026Modal] = useState(false);
  const [budget2026Data, setBudget2026Data] = useState<Record<string, { base2026: string; supp3: string }>>({});
  const [toast, setToast] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hierarchyPage, setHierarchyPage] = useState(1);
  const HIERARCHY_ROWS_PER_PAGE = 30;
  // PDF 인쇄 중에는 현재 페이지 30행만이 아니라 필터링된 전체 행을 보여줘야 하므로,
  // 인쇄가 시작되면 잠깐 페이지네이션을 끄고 전체 행을 렌더링한 뒤 인쇄 대화상자를 띄운다.
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [hierarchySearch, setHierarchySearch] = useState("");
  // 전국체전 소요 검토 패널. 세출예산내역서 옆 버튼으로 연다.
  const [showChejeon, setShowChejeon] = useState(false);
  const [chejeonConf, setChejeonConf] = useState<"" | "A" | "B" | "C">("");
  // 전국체전 본부 조직도 패널.
  const [showChejeonOrg, setShowChejeonOrg] = useState(false);
  const [chejeonOrgOpen, setChejeonOrgOpen] = useState<number | null>(null);
  // 다중 선택 가능(배열). 예산설명자료 화면에서 "돌아가기"로 넘어올 때는 항상 세부사업 하나만
  // 지정해서 돌아오므로 그 하나를 담은 배열로 시작한다.
  const [hierarchyProgramFilter, setHierarchyProgramFilter] = useState<string[]>(() => {
    const returned = localStorage.getItem('returnToHierarchyProgram');
    return returned ? [returned] : [];
  });
  const [hierarchyItemFilter, setHierarchyItemFilter] = useState<string[]>([]);
  const [rowSpacing, setRowSpacing] = useState(4);
  const [programFilter, setProgramFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('columnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  const [resizingColumn, setResizingColumn] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const DEFAULT_HIERARCHY_COLUMN_WIDTHS: Record<string, number> = {
    label: 210, budget: 120, previous: 120, difference: 120, statisticsCode: 152, description: 310, review: 90,
  };
  const getHierarchyColumnWidth = (key: string) => columnWidths[key] ?? DEFAULT_HIERARCHY_COLUMN_WIDTHS[key];
  const staffModalRef = useRef<HTMLDivElement>(null);
  const deptMemoModalRef = useRef<HTMLDivElement>(null);
  const budget2026ModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const badgeConfirmModalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 설명자료 화면에서 "편성 시트로 돌아가기"로 넘어온 경우, 다음에 이 페이지를
  // 다시 방문했을 때 필터가 그대로 남아있지 않도록 한 번 쓰고 지운다.
  useEffect(() => {
    if (localStorage.getItem('returnToHierarchyProgram')) {
      localStorage.removeItem('returnToHierarchyProgram');
    }
  }, []);

  // Esc로 모달 닫기
  useEffect(() => {
    if (!showStaffModal && !showDeptMemoModal && !showBudget2026Modal && !editingRow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowStaffModal(false);
        setShowDeptMemoModal(false);
        setShowBudget2026Modal(false);
        setEditingRow(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showStaffModal, showDeptMemoModal, showBudget2026Modal, editingRow]);

  // 모달 열림/닫힘 시 포커스 이동 (열릴 때 모달 안으로, 닫힐 때 트리거로 복귀)
  useEffect(() => {
    if (showStaffModal) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      staffModalRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [href]")?.focus();
    } else {
      lastFocusedRef.current?.focus();
    }
  }, [showStaffModal]);

  useEffect(() => {
    if (showDeptMemoModal) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      deptMemoModalRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [href]")?.focus();
    } else {
      setDeptMemoDraft("");
      lastFocusedRef.current?.focus();
    }
  }, [showDeptMemoModal]);

  useEffect(() => {
    if (showBudget2026Modal) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      budget2026ModalRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [href]")?.focus();
    } else {
      lastFocusedRef.current?.focus();
    }
  }, [showBudget2026Modal]);

  useEffect(() => {
    if (editingRow) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      editModalRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [href]")?.focus();
    } else {
      lastFocusedRef.current?.focus();
    }
  }, [Boolean(editingRow)]);

  // 아래 넷은 부서와 무관한 전체 데이터다(예산행 246KB, 계층 CSV 453KB 등). 예전에는 department가
  // 의존성에 들어 있어서 부서를 바꿀 때마다 이걸 통째로 다시 받느라 매번 3초씩 걸렸다. 최초 1회만 받는다.
  useEffect(() => {
    fetch('/api/cloud-sync?type=council-requests')
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (Array.isArray(result?.data)) setRequestRecords(result.data); })
      .catch((error) => console.log('요구사항 로드 실패:', error));
    loadDataFromServer();
    loadExecutionDataFromServer();
    loadCsvData();
    loadStaffDataFromServer();
    loadDeptMemosFromServer();
    loadBudget2026FromServer();
    loadSupplementaryFromServer();
  }, []);

  // 부서가 실제로 영향을 주는 건 메모와 부기명 강조 표시뿐이다.
  useEffect(() => {
    loadProgramMemosFromServer(department);
    loadRowMarksFromServer(department);
  }, [department]);

  const loadStaffDataFromServer = async () => {
    try {
      const response = await fetch('/api/cloud-sync?type=staff');
      if (response.ok) {
        const { data } = await response.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setStaffData(data);
        }
      }
    } catch (error) {
      console.log('정원·현원 클라우드 로드 실패:', error);
    }
  };

  const loadBudget2026FromServer = async () => {
    try {
      const response = await fetch('/api/cloud-sync?type=budget-2026');
      if (response.ok) {
        const { data } = await response.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setBudget2026Data(data);
        }
      }
    } catch (error) {
      console.log('2026 예산액 클라우드 로드 실패:', error);
    }
  };

  // ── 추경 세출예산내역서 ──────────────────────────────────────────────────────
  // 부서·회차(1회, 3회…)별로 올린 추경 내역서. 각 항목의 3추 금액은 "그 항목이 실려 있는 가장 최근
  // 회차의 예산액"이고, 어느 회차에도 없으면 추경에서 바뀌지 않은 것이라 본예산(전년도 열)을 쓴다.
  type SupplementaryRecord = { department: string; round: number; fileName: string; data: SupplementaryReport };
  const [supplementaryRecords, setSupplementaryRecords] = useState<SupplementaryRecord[]>([]);
  const [supplementaryResult, setSupplementaryResult] = useState<{ department: string; round: number; fileName: string; programCount: number; itemCount: number; unmatched: string[]; error?: string } | null>(null);
  const supplementaryInputRef = useRef<HTMLInputElement>(null);

  const loadSupplementaryFromServer = async () => {
    try {
      const response = await fetch('/api/cloud-sync?type=supplementary');
      if (!response.ok) return;
      const { data } = await response.json();
      if (Array.isArray(data)) {
        setSupplementaryRecords(data.map((row: any) => ({
          department: row.department,
          round: Number(row.round),
          fileName: row.file_name || '',
          data: row.data as SupplementaryReport,
        })));
      }
    } catch (error) {
      console.log('추경 자료 클라우드 로드 실패:', error);
    }
  };

  // 부서·회차가 파일에 적혀 있지 않은 내역서는 올릴 때 직접 고르게 한다.
  const [supplementaryPending, setSupplementaryPending] = useState<{ report: SupplementaryReport; fileName: string; department: string; round: string } | null>(null);

  const showSupplementaryError = (fileName: string, error: string, department = '') => {
    setSupplementaryResult({ department, round: 0, fileName, programCount: 0, itemCount: 0, unmatched: [], error });
  };

  const commitSupplementary = async (report: SupplementaryReport, fileName: string) => {
    try {
      const response = await fetch('/api/cloud-sync?type=supplementary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: report.department, round: report.round, fileName, data: report }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || result.message || '서버 저장 실패');
      }
      setSupplementaryRecords((prev) => [
        ...prev.filter((record) => !(record.department === report.department && record.round === report.round)),
        { department: report.department, round: report.round, fileName, data: report },
      ]);

      // 현재 예산서에 같은 이름의 세부사업이 없어 붙지 못한 항목을 알려준다.
      const programKeys = new Set<string>();
      let currentDept = '';
      for (const row of expenditureHierarchyRows) {
        if (row.level === 'dept') currentDept = row.label;
        else if (row.level === 'program' && currentDept === report.department) programKeys.add(normalizeSupplementaryName(row.label));
      }
      const unmatched = report.programs.filter((program) => !programKeys.has(normalizeSupplementaryName(program.name))).map((program) => program.name);
      setSupplementaryResult({
        department: report.department,
        round: report.round,
        fileName,
        programCount: report.programs.length,
        itemCount: report.items.length,
        unmatched,
      });
      showToast(`${report.department} 추경 ${report.round}회 내역서를 반영했습니다.`);
    } catch (error) {
      console.warn('추경 자료 저장 실패:', error);
      showSupplementaryError(fileName, `추경 자료를 저장하지 못했습니다. (${error instanceof Error ? error.message : String(error)}) 잠시 후 다시 시도하고, 계속 안 되면 이 문구를 알려주세요.`);
    }
  };

  const handleSupplementaryUpload = async (file: File) => {
    try {
      const report = await readSupplementaryFile(file);
      if (report.programs.length === 0) {
        // 무엇을 읽었고 무엇을 못 읽었는지 화면에 남겨 원인을 알 수 있게 한다.
        showSupplementaryError(
          file.name,
          '추경 세출예산내역서 형식으로 읽지 못했습니다. 세부사업 금액 줄을 찾지 못했습니다. "예산액 / 기정 예산액 / 비교증감" 열이 있는 추경 세출예산내역서 엑셀을 올려주세요.',
        );
        return;
      }
      if (!report.department || !report.round) {
        // 부서나 회차가 파일에 없으면 읽은 내용은 그대로 두고 어느 부서·몇 회인지만 물어본다.
        setSupplementaryPending({
          report,
          fileName: file.name,
          department: report.department || department || '',
          round: report.round ? String(report.round) : '',
        });
        return;
      }
      await commitSupplementary(report, file.name);
    } catch (error) {
      console.warn('추경 자료 읽기 실패:', error);
      showSupplementaryError(file.name, `엑셀 파일을 읽지 못했습니다. (${error instanceof Error ? error.message : String(error)}) 파일이 손상되었거나 엑셀 형식이 아닐 수 있습니다.`);
    } finally {
      if (supplementaryInputRef.current) supplementaryInputRef.current.value = '';
    }
  };

  const saveBudget2026 = async () => {
    setShowBudget2026Modal(false);
    try {
      const response = await fetch('/api/cloud-sync?type=budget-2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: budget2026Data }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(result.message || '서버 저장 실패');
      }
      showToast('서버에 2026 예산액이 저장되었습니다.');
    } catch (error) {
      console.warn('2026 예산액 클라우드 저장 실패:', error);
      showToast('2026 예산액을 이 기기에만 저장했습니다 (클라우드 저장 실패).');
    }
  };

  const loadDeptMemosFromServer = async () => {
    try {
      const response = await fetch('/api/cloud-sync?type=dept-memos');
      if (!response.ok) return;
      const { data } = await response.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setDeptMemos(data);
      }
    } catch (error) {
      console.log('부서 메모 클라우드 로드 실패:', error);
    }
  };

  const saveDeptMemo = async () => {
    if (!deptMemoDraft.trim()) return;
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const existing = deptMemos[department] || { memos: [] };
    const updated = {
      ...deptMemos,
      [department]: {
        memos: [...existing.memos, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: deptMemoDraft.trim(), date: today }],
      },
    };
    setDeptMemos(updated);
    setDeptMemoDraft("");
    try {
      await fetch('/api/cloud-sync?type=dept-memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updated }),
      });
    } catch (error) {
      console.warn('부서 메모 저장 실패:', error);
      showToast('저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 부서 메모: 부서 전체 사항을 자유롭게 적어두는 한 칸짜리 메모장. 기존 "메모 추가" 방식으로 쌓인
  // 메모가 있으면 줄바꿈으로 이어 붙여 그대로 보여주고, 저장할 때 하나의 메모로 합쳐 보관한다.
  const [deptNote, setDeptNote] = useState("");
  const deptNoteDirty = useRef(false);
  const deptNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (deptNoteDirty.current) return;
    setDeptNote((deptMemos[department]?.memos ?? []).map((memo) => memo.text).join("\n\n"));
  }, [department, deptMemos]);

  const persistDeptNote = async (dept: string, text: string) => {
    deptNoteDirty.current = false;
    if (!dept) return;
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const updated = {
      ...deptMemos,
      [dept]: { memos: text.trim() ? [{ id: `note-${dept}`, text, date: today }] : [] },
    };
    setDeptMemos(updated);
    try {
      await fetch('/api/cloud-sync?type=dept-memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updated }),
      });
    } catch (error) {
      console.warn('부서 메모 저장 실패:', error);
      showToast('메모를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const onDeptNoteChange = (text: string) => {
    setDeptNote(text);
    deptNoteDirty.current = true;
    if (deptNoteTimer.current) clearTimeout(deptNoteTimer.current);
    const dept = department;
    deptNoteTimer.current = setTimeout(() => persistDeptNote(dept, text), 1200);
  };

  const flushDeptNote = () => {
    if (!deptNoteDirty.current) return;
    if (deptNoteTimer.current) clearTimeout(deptNoteTimer.current);
    persistDeptNote(department, deptNote);
  };

  const deleteDeptMemo = async (memoIndex: number) => {
    const existing = deptMemos[department] || { memos: [] };
    const updated = {
      ...deptMemos,
      [department]: { memos: existing.memos.filter((_, index) => index !== memoIndex) },
    };
    setDeptMemos(updated);
    try {
      await fetch('/api/cloud-sync?type=dept-memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updated }),
      });
    } catch (error) {
      console.warn('부서 메모 삭제 실패:', error);
      showToast('삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const loadProgramMemosFromServer = async (dept: string) => {
    try {
      const url = dept ? `/api/cloud-sync?type=memos&department=${encodeURIComponent(dept)}` : '/api/cloud-sync?type=memos';
      const response = await fetch(url);
      if (!response.ok) return;
      const { data } = await response.json();
      if (!data) return;
      if (data.programMemos && typeof data.programMemos === 'object') {
        setProgramMemos((prev) => ({ ...prev, ...data.programMemos }));
      }
      if (Array.isArray(data.hiddenMemoIds) && data.hiddenMemoIds.length > 0) {
        setHiddenMemoIds((prev) => Array.from(new Set([...prev, ...data.hiddenMemoIds])));
      }
    } catch (error) {
      console.log('메모 클라우드 로드 실패:', error);
    }
  };

  const loadRowMarksFromServer = async (dept: string) => {
    try {
      const url = dept ? `/api/cloud-sync?type=marks&department=${encodeURIComponent(dept)}` : '/api/cloud-sync?type=marks';
      const response = await fetch(url);
      if (!response.ok) return;
      const { data } = await response.json();
      if (data?.rowMarks && typeof data.rowMarks === 'object') {
        setRowMarks((prev) => ({ ...prev, ...data.rowMarks }));
      }
      if (data?.rowNotes && typeof data.rowNotes === 'object') {
        setRowNotes((prev) => ({ ...prev, ...data.rowNotes }));
      }
    } catch (error) {
      console.log('부기명 강조 표시 로드 실패:', error);
    }
  };

  // 형광펜과 달리 서버에 바로 올리고, 실패하면 화면을 원래대로 돌리고 알린다.
  // 저장됐다고 믿고 검토를 계속하다 전부 잃는 일이 없어야 한다.
  // 색과 단어 메모는 같은 행에 저장되므로 언제나 두 값을 함께 보낸다.
  const saveRowAnnotation = async (key: string, color: string, memo: string) => {
    const prevColor = rowMarks[key] ?? '';
    const prevMemo = rowNotes[key] ?? '';
    const put = (target: Record<string, string>, value: string) => {
      const next = { ...target };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    };
    setRowMarks((prev) => put(prev, color));
    setRowNotes((prev) => put(prev, memo));
    try {
      const response = await fetch('/api/cloud-sync?type=marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, color, memo }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.message || '서버 저장 실패');
    } catch (error) {
      console.warn('부기명 표시 저장 실패:', error);
      setRowMarks((prev) => put(prev, prevColor));
      setRowNotes((prev) => put(prev, prevMemo));
      showToast('저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const setRowMark = (key: string, color: string) => {
    setMarkPickerKey(null);
    return saveRowAnnotation(key, color, rowNotes[key] ?? '');
  };

  const setRowNote = (key: string, memo: string) => {
    setEditingRowNoteKey(null);
    setRowNoteDraft("");
    if ((rowNotes[key] ?? '') === memo.trim()) return;
    return saveRowAnnotation(key, rowMarks[key] ?? '', memo.trim());
  };

  const loadCsvData = async () => {
    try {
      const response = await fetch('/api/cloud-sync');
      if (response.ok) {
        const { data } = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          // 부서 블록(level:'dept' 행으로 시작) 단위로 세입/세출을 가른다 - "세입::" 접두어가
          // 붙은 블록은 세입, 나머지는 전부 세출이다.
          const expenditure: BudgetHierarchyRow[] = [];
          const revenue: BudgetHierarchyRow[] = [];
          let isRevenueBlock = false;
          for (const row of data as BudgetHierarchyRow[]) {
            if (row.level === 'dept') isRevenueBlock = row.label.startsWith(REVENUE_DEPT_PREFIX);
            if (isRevenueBlock) {
              revenue.push(row.level === 'dept' ? { ...row, label: row.label.slice(REVENUE_DEPT_PREFIX.length) } : row);
            } else {
              expenditure.push(row);
            }
          }
          setExpenditureHierarchyRows(expenditure);
          setRevenueHierarchyRows(revenue);
        }
      }
    } catch (error) {
      console.log('CSV 로드 실패:', error);
    }
  };

  // 업로드/로드로 행 수가 바뀌어 현재 페이지가 범위를 벗어나면 마지막 페이지로 당겨준다.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(budgetHierarchyRows.length / HIERARCHY_ROWS_PER_PAGE));
    setHierarchyPage((prev) => Math.min(prev, totalPages));
  }, [budgetHierarchyRows.length]);

  // localStorage에 budgetRows 저장
  useEffect(() => {
    try {
      localStorage.setItem('budgetRows', JSON.stringify(budgetRows));
    } catch (error) {
      console.warn('localStorage 저장 실패:', error);
    }
  }, [budgetRows]);

  // localStorage에 staffData 저장
  useEffect(() => {
    try {
      localStorage.setItem('staffData', JSON.stringify(staffData));
    } catch (error) {
      console.warn('localStorage 저장 실패:', error);
    }
  }, [staffData]);

  // 다른 탭에서 정원·현원을 수정한 경우, 오래된 탭이 최신 데이터를 덮어쓰지 않도록 동기화한다.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'staffData' || !event.newValue) return;
      try {
        setStaffData(JSON.parse(event.newValue));
      } catch (error) {
        console.warn('정원·현원 동기화 실패:', error);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // columnWidths 저장
  useEffect(() => {
    try {
      localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
    } catch (error) {
      console.warn('columnWidths 저장 실패:', error);
    }
  }, [columnWidths]);

  // 컬럼 리사이저 이벤트
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizingColumn.startX;
      const newWidth = Math.max(60, resizingColumn.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.key]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  const renderHierarchyResizeHandle = (colKey: string) => (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumn({ key: colKey, startX: e.clientX, startWidth: getHierarchyColumnWidth(colKey) });
      }}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: '6px',
        cursor: 'col-resize',
        zIndex: 4,
        background: resizingColumn?.key === colKey ? 'rgba(91, 155, 240, 0.5)' : 'transparent',
      }}
    />
  );

  // 서버 API 함수들
  const loadDataFromServer = async () => {
    try {
      const response = await fetch('/api/budget/load');
      if (!response.ok) throw new Error('서버 로드 실패');
      const { data } = await response.json();
      if (data && Array.isArray(data)) {
        setBudgetRows(data);
        localStorage.setItem('budgetRows', JSON.stringify(data));
        return;
      }
      const saved = localStorage.getItem('budgetRows');
      if (saved) setBudgetRows(JSON.parse(saved));
    } catch (error) {
      console.warn('서버에서 데이터 로드 실패:', error);
      const saved = localStorage.getItem('budgetRows');
      if (saved) {
        try {
          setBudgetRows(JSON.parse(saved));
        } catch (localError) {
          console.warn('localStorage 데이터 로드 실패:', localError);
        }
      }
    }
  };

  const loadExecutionDataFromServer = async () => {
    try {
      const response = await fetch('/api/budget-execution-2026/load');
      if (response.ok) {
        const { data } = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: BudgetExecution[] = data.map((row: any) => ({
            id: row.id,
            department: row.department,
            policyName: row.policyName ?? row.policy_name ?? '',
            programName: row.programName ?? row.program_name ?? '',
            unitName: row.unitName ?? row.unit_name ?? '',
            statisticsCode: row.statisticsCode ?? row.statistics_code ?? '',
            original: row.original ?? 0,
            supplementary: row.supplementary ?? 0,
            preEstablishment: row.preEstablishment ?? row.pre_establishment ?? 0,
            reserve: row.reserve ?? 0,
            carryover: row.carryover ?? 0,
            budget: row.budget ?? 0,
            executed: row.executed ?? 0,
            executionRate: row.executionRate ?? row.execution_rate ?? 0,
          }));
          setExecutionData(mapped);
          try {
            localStorage.setItem('budgetExecution2026Rows', JSON.stringify(mapped));
          } catch (error) {
            console.warn('localStorage 저장 실패:', error);
          }
          return;
        }
      }
    } catch (error) {
      console.warn('2026 예산집행현황 서버 로드 실패:', error);
    }

    // 서버 로드 실패/빈 응답 시 이 기기에 남아있는 마지막 데이터로 폴백한다.
    const saved = localStorage.getItem('budgetExecution2026Rows');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && Array.isArray(data)) {
          setExecutionData(data);
        }
      } catch (error) {
        console.warn('localStorage에서 데이터 로드 실패:', error);
      }
    }
  };

  const saveDataToServer = async (rows: BudgetRow[]) => {
    try {
      // Supabase 서비스 키는 브라우저에 노출하지 않고 Vercel API에서만 사용한다.
      const response = await fetch('/api/budget/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rows }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showToast('클라우드에 저장되었습니다. ☁️');
      } else {
        console.error('클라우드 저장 실패:', result);
        showToast('로컬에만 저장되었습니다. 💾');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      showToast('로컬에만 저장되었습니다. 💾');
    }
  };

  const filteredRows = useMemo(() => {
    const filtered = budgetRows.map((row) => {
      const applicable = getApplicableProcedures(row);
      const errors = getFormulaErrors(row, staffData);
      return {
        ...row,
        procedures: applicable,
        formulaErrors: errors
      };
    }).filter((row) => {
      const searchable = `${row.policy} ${row.program} ${row.account} ${row.detail}`;
      const matchesSearch = searchable.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "전체" || (statusFilter === "사전" ? (row.procedures && row.procedures.length > 0) : row.status === statusFilter);
      const matchesProgram = !programFilter || getDetailName(row.program) === programFilter;
      const matchesAccount = !accountFilter || row.account === accountFilter;
      // 부서를 선택하기 전에는 어떤 부서의 예산도 기본으로 노출하지 않는다.
      const matchesDepartment = Boolean(department) && row.department === department;
      return matchesSearch && matchesStatus && matchesProgram && matchesAccount && matchesDepartment;
    });
    return filtered;
  }, [budgetRows, search, statusFilter, programFilter, accountFilter, department]);

  const departmentRows = useMemo(
    () => department ? budgetRows.filter((row) => row.department === department) : [],
    [budgetRows, department],
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, programFilter, accountFilter, department]);

  const uniquePrograms = useMemo(() => {
    const seen = new Set();
    return departmentRows.map(r => getDetailName(r.program)).filter(program => {
      if (!program || seen.has(program)) return false;
      seen.add(program);
      return true;
    });
  }, [departmentRows]);

  const uniqueAccounts = useMemo(() => {
    const accounts = new Set(departmentRows.map(r => r.account).filter(Boolean));
    return Array.from(accounts).sort();
  }, [departmentRows]);

  const totals = useMemo(() => filteredRows.reduce((sum, row) => ({ amount: sum.amount + row.amount, city: sum.city + row.city, national: sum.national + row.national, province: sum.province + row.province, other: sum.other + row.other, previous: sum.previous + row.previous }), { amount: 0, city: 0, national: 0, province: 0, other: 0, previous: 0 }), [filteredRows]);

  // 상단 카드는 업로드된 예산 편성 시트(부서별 합계)를 기준으로 집계한다.
  const hierarchyTotals = useMemo(() => {
    if (!department) return { amount: 0, previous: 0 };
    return budgetHierarchyRows
      .filter((row) => row.level === 'dept' && row.label === department)
      .reduce((sum, row) => ({ amount: sum.amount + (row.budget || 0), previous: sum.previous + (row.previous || 0) }), { amount: 0, previous: 0 });
  }, [budgetHierarchyRows, department]);

  // 2027 신규 사업 예산액 = 현재 선택된 부서에서, 전년도 예산이 0인 세부사업(program)들의 예산액 합계.
  // budgetHierarchyRows는 여러 부서가 한 배열에 섞여 있고 program 행 자체엔 소속 부서 정보가 없어서
  // (부모 참조 없이 순서로만 계층을 아는 구조), 가장 가까운 이전 dept 행을 따라가며 부서를 구분해야 한다.
  // 이걸 안 하면 다른 부서의 신규사업까지 다 합쳐져서, 이 카드가 "2027 요구액"보다 커지는 오류가 난다.
  const newProjectTotal = useMemo(() => {
    if (!department) return 0;
    let currentDept: string | undefined;
    let sum = 0;
    for (const row of budgetHierarchyRows) {
      if (row.level === 'dept') currentDept = row.label;
      else if (row.level === 'program' && currentDept === department && !(row.previous || 0)) {
        sum += row.budget || 0;
      }
    }
    return sum;
  }, [budgetHierarchyRows, department]);

  // 2027년 주요투자사업 예산액 = 현재 선택된 부서에서, 화성시 주요투자사업 대시보드에 등록된
  // 세부사업(MAJOR_INVESTMENT_PROGRAMS)들의 예산액 합계. newProjectTotal과 같은 방식으로
  // 가장 가까운 이전 dept 행을 따라가며 부서를 구분한다.
  const majorInvestmentTotal = useMemo(() => {
    if (!department) return 0;
    let currentDept: string | undefined;
    let sum = 0;
    for (const row of budgetHierarchyRows) {
      if (row.level === 'dept') currentDept = row.label;
      else if (row.level === 'program' && currentDept === department && isMajorInvestmentProgram(department, row.label)) {
        sum += row.budget || 0;
      }
    }
    return sum;
  }, [budgetHierarchyRows, department]);

  // 세출예산내역서 표의 각 행에 대해 가장 가까운 상위 계층(부서/정책/단위/세부사업/편성목/통계목) 행을 찾아둔다.
  // 검색·필터 드롭다운이 "이 행의 조상이 조건에 맞으면 전체 하위행도 같이 보여준다" 식으로 동작하는 데 쓰인다.
  // 편성 부서 "전체" 화면에서 쓰는 부서별 3추 금액(2026 예산액 설정값, 천원).
  const supp3ByDepartment = useMemo(() => Object.fromEntries(
    Object.entries(budget2026Data).map(([name, value]) => [name, value?.supp3 ? parseBudgetInput(value.supp3) : null]),
  ), [budget2026Data]);

  const hierarchyAncestors = useMemo(() => {
    const map = new Map<string, {
      deptRow?: BudgetHierarchyRow; policyRow?: BudgetHierarchyRow; unitRow?: BudgetHierarchyRow;
      programRow?: BudgetHierarchyRow; accountRow?: BudgetHierarchyRow; itemRow?: BudgetHierarchyRow;
    }>();
    let deptRow: BudgetHierarchyRow | undefined;
    let policyRow: BudgetHierarchyRow | undefined;
    let unitRow: BudgetHierarchyRow | undefined;
    let programRow: BudgetHierarchyRow | undefined;
    let accountRow: BudgetHierarchyRow | undefined;
    let itemRow: BudgetHierarchyRow | undefined;
    for (const row of budgetHierarchyRows) {
      if (row.level === 'dept') { deptRow = row; policyRow = unitRow = programRow = accountRow = itemRow = undefined; }
      else if (row.level === 'policy') { policyRow = row; unitRow = programRow = accountRow = itemRow = undefined; }
      else if (row.level === 'unit') { unitRow = row; programRow = accountRow = itemRow = undefined; }
      else if (row.level === 'program') { programRow = row; accountRow = itemRow = undefined; }
      else if (row.level === 'account') { accountRow = row; itemRow = undefined; }
      else if (row.level === 'item') { itemRow = row; }
      map.set(row.id, { deptRow, policyRow, unitRow, programRow, accountRow, itemRow });
    }
    return map;
  }, [budgetHierarchyRows]);

  const requestBadgesByRow = useMemo(() => {
    const map = new Map<string, RequestBadge[]>();
    if (!department) return map;
    const rows = budgetHierarchyRows.filter((row) => hierarchyAncestors.get(row.id)?.deptRow?.label === department);
    const notes = rows.filter((row) => row.level === 'note' && row.statisticsCode).map((row) => ({ row, name: normalizeBudgetName(row.statisticsCode ?? '') }));
    const programs = rows.filter((row) => row.level === 'program').map((row) => ({ row, name: normalizeBudgetName(row.label) }));
    const matches = (name: string, key: string) => name === key || (key.length >= 6 && name.includes(key)) || (name.length >= 6 && key.includes(name));
    const add = (rowId: string, badge: RequestBadge) => {
      const list = map.get(rowId) ?? [];
      if (!list.some((existing) => existing.label === badge.label)) list.push(badge);
      map.set(rowId, list);
    };
    // 부서와 상관없이 지정해 둔 부기명에 붙이는 요구사항 (REQUEST_NOTE_TARGETS).
    const pinnedRequests = new Set<RequestRecord>();
    requestRecords.forEach((request) => {
      const badge = requestBadge(request);
      if (!badge) return;
      const keys = requestKeys(request);
      REQUEST_NOTE_TARGETS.filter((entry) => entry.department === department && keys.some((key) => key.includes(entry.match))).forEach((entry) => {
        pinnedRequests.add(request);
        notes
          .filter((note) => note.name === normalizeBudgetName(entry.note) && hierarchyAncestors.get(note.row.id)?.programRow?.label === entry.program)
          .forEach((note) => add(note.row.id, badge));
      });
    });
    requestRecords.filter((request) => request.department === department && !pinnedRequests.has(request)).forEach((request) => {
      const badge = requestBadge(request);
      if (!badge) return;
      const keys = requestKeys(request);
      const targets = REQUEST_TARGETS.filter((entry) => entry.department === department && keys.some((key) => key.includes(entry.match)));
      if (targets.length) {
        const targetNames = targets.map((target) => normalizeBudgetName(target.target));
        programs.filter((program) => targetNames.includes(program.name)).forEach((program) => add(program.row.id, badge));
        return;
      }
      const noteHits = notes.filter((note) => keys.some((key) => matches(note.name, key)));
      if (noteHits.length) { noteHits.forEach((note) => add(note.row.id, badge)); return; }
      programs.filter((program) => keys.some((key) => matches(program.name, key))).forEach((program) => add(program.row.id, badge));
    });
    return map;
  }, [budgetHierarchyRows, hierarchyAncestors, requestRecords, department]);

  // 선택한 부서에 올라온 추경 회차들 (큰 회차부터).
  const supplementaryRounds = useMemo(
    () => supplementaryRecords.filter((record) => record.department === department).sort((a, b) => b.round - a.round),
    [supplementaryRecords, department],
  );

  // 행마다 3추 기준 금액: 세부사업·통계목은 가장 최근 회차에 실린 예산액, 없으면 본예산(전년도 열).
  // 편성목·단위·정책·부서는 아래 세부사업/통계목 값을 더해서 만든다. 세출예산내역서에서만 계산한다.
  const supplementaryValues = useMemo(() => {
    const values = new Map<string, number>();
    if (!department || statementView !== 'expenditure' || supplementaryRounds.length === 0) return values;
    const programMaps = supplementaryRounds.map((record) => new Map<string, number>(record.data.programs.map((program) => [normalizeSupplementaryName(program.name), program.amount] as [string, number])));
    const itemMaps = supplementaryRounds.map((record) => new Map<string, number>(record.data.items.map((item) => [`${normalizeSupplementaryName(item.program)}|${normalizeSupplementaryStat(item.stat)}`, item.amount] as [string, number])));
    const addTo = (target: BudgetHierarchyRow | undefined, amount: number) => {
      if (target) values.set(target.id, (values.get(target.id) ?? 0) + amount);
    };
    for (const row of budgetHierarchyRows) {
      const ancestors = hierarchyAncestors.get(row.id);
      if (ancestors?.deptRow?.label !== department) continue;
      if (row.level === 'program') {
        const key = normalizeSupplementaryName(row.label);
        const hit = programMaps.map((map) => map.get(key)).find((amount) => amount !== undefined);
        const amount = hit ?? row.previous ?? 0;
        values.set(row.id, amount);
        addTo(ancestors.unitRow, amount);
        addTo(ancestors.policyRow, amount);
        addTo(ancestors.deptRow, amount);
      } else if (row.level === 'item') {
        const key = `${normalizeSupplementaryName(ancestors.programRow?.label ?? '')}|${normalizeSupplementaryStat(row.statisticsCode ?? '')}`;
        const hit = itemMaps.map((map) => map.get(key)).find((amount) => amount !== undefined);
        const amount = hit ?? row.previous ?? 0;
        values.set(row.id, amount);
        addTo(ancestors.accountRow, amount);
      }
    }
    return values;
  }, [department, statementView, supplementaryRounds, budgetHierarchyRows, hierarchyAncestors]);

  // 세부사업 드롭다운 필터 값 목록 (세부사업명만, 중복 제거).
  // budgetHierarchyRows는 모든 부서의 행이 한 배열에 섞여 있는데, 부서 필터링 없이 돌면
  // 지금 선택된 부서와 무관한 다른 부서 세부사업까지 목록에 다 섞여 나온다 - 반드시
  // hierarchyAncestors로 각 행의 소속 부서를 확인해서, 현재 선택된 department 소속인
  // 행만 목록에 넣는다.
  const uniqueHierarchyPrograms = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const row of budgetHierarchyRows) {
      if (row.level !== 'program' || !row.label) continue;
      if (department && hierarchyAncestors.get(row.id)?.deptRow?.label !== department) continue;
      if (!seen.has(row.label)) { seen.add(row.label); list.push(row.label); }
    }
    return list;
  }, [budgetHierarchyRows, hierarchyAncestors, department]);

  // 통계목 드롭다운 필터 값 목록 (통계목만, 중복 제거) - 위와 같은 이유로 부서 범위 안에서만 모은다.
  const uniqueHierarchyItems = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const row of budgetHierarchyRows) {
      if (row.level !== 'item' || !row.statisticsCode) continue;
      if (department && hierarchyAncestors.get(row.id)?.deptRow?.label !== department) continue;
      if (!seen.has(row.statisticsCode)) { seen.add(row.statisticsCode); list.push(row.statisticsCode); }
    }
    return list;
  }, [budgetHierarchyRows, hierarchyAncestors, department]);

  // 조건에 맞는 행(직접 매치)을 찾은 뒤, 그 행의 조상(문맥 표시용)과 자손(하위 내역) 전체를
  // 함께 "표시할 행"으로 넓혀준다. 조상은 직접 매치 집합에 섞으면 안 된다 — 섞으면 같은 조상을
  // 공유하는 무관한 다른 세부사업들까지 전부 딸려 나오게 된다.
  const expandHierarchyMatches = (
    rows: BudgetHierarchyRow[],
    ancestors: typeof hierarchyAncestors,
    isMatch: (row: BudgetHierarchyRow) => boolean,
  ): Set<string> => {
    const directMatches = new Set<string>();
    for (const row of rows) {
      if (isMatch(row)) directMatches.add(row.id);
    }

    // 직접 매치된 행의 조상(부서/정책/단위/세부사업/편성목/통계목) 헤더 행은 문맥 표시를 위해 그대로 둔다.
    const ancestorContext = new Set<string>();
    directMatches.forEach((id) => {
      const a = ancestors.get(id);
      if (a?.deptRow) ancestorContext.add(a.deptRow.id);
      if (a?.policyRow) ancestorContext.add(a.policyRow.id);
      if (a?.unitRow) ancestorContext.add(a.unitRow.id);
      if (a?.programRow) ancestorContext.add(a.programRow.id);
      if (a?.accountRow) ancestorContext.add(a.accountRow.id);
      if (a?.itemRow) ancestorContext.add(a.itemRow.id);
    });

    const keep = new Set<string>();
    for (const row of rows) {
      if (directMatches.has(row.id) || ancestorContext.has(row.id)) {
        keep.add(row.id);
        continue;
      }
      // 직접 매치된 행의 자손(하위 편성목·통계목·부기·산출식 등)인지 확인한다.
      const a = ancestors.get(row.id);
      if (
        (a?.deptRow && directMatches.has(a.deptRow.id)) ||
        (a?.policyRow && directMatches.has(a.policyRow.id)) ||
        (a?.unitRow && directMatches.has(a.unitRow.id)) ||
        (a?.programRow && directMatches.has(a.programRow.id)) ||
        (a?.accountRow && directMatches.has(a.accountRow.id)) ||
        (a?.itemRow && directMatches.has(a.itemRow.id))
      ) keep.add(row.id);
    }
    return keep;
  };

  // 편성 부서 / 검색어 / 세부사업 필터 / 통계목 필터를 모두 통과하는 행만 남긴다 (각 조건은 AND).
  const filteredHierarchyRows = useMemo(() => {
    const term = hierarchySearch.trim().toLowerCase();
    // 부서를 선택하지 않은 초기 상태에서는 전체 부서 자료를 보여주지 않는다.
    if (!department) return [];

    let keep: Set<string> | null = null;
    const intersect = (next: Set<string>) => {
      keep = keep ? new Set(Array.from(keep).filter((id) => next.has(id))) : next;
    };

    // 클라우드에 저장된 세출예산내역서는 여러 부서 데이터가 한 목록에 섞여 있을 수 있어,
    // 상단 "편성 부서" 드롭다운으로 선택한 부서(dept 레벨 행)의 하위 행만 남긴다.
    if (department) {
      intersect(expandHierarchyMatches(budgetHierarchyRows, hierarchyAncestors, (row) =>
        row.level === 'dept' && row.label === department));
    }
    if (term) {
      intersect(expandHierarchyMatches(budgetHierarchyRows, hierarchyAncestors, (row) => {
        const text = `${row.label} ${row.statisticsCode ?? ''} ${row.description ?? ''}`.toLowerCase();
        return text.includes(term);
      }));
    }
    // 다중 선택된 값들은 서로 OR로 묶는다(세부사업 A 또는 B) - 다른 필터 종류끼리는 그대로 AND.
    if (hierarchyProgramFilter.length > 0) {
      intersect(expandHierarchyMatches(budgetHierarchyRows, hierarchyAncestors, (row) =>
        row.level === 'program' && hierarchyProgramFilter.includes(row.label)));
    }
    if (hierarchyItemFilter.length > 0) {
      intersect(expandHierarchyMatches(budgetHierarchyRows, hierarchyAncestors, (row) =>
        row.level === 'item' && !!row.statisticsCode && hierarchyItemFilter.includes(row.statisticsCode)));
    }

    return budgetHierarchyRows.filter((row) => keep!.has(row.id));
  }, [budgetHierarchyRows, hierarchyAncestors, department, hierarchySearch, hierarchyProgramFilter, hierarchyItemFilter]);

  useEffect(() => {
    setHierarchyPage(1);
  }, [department, hierarchySearch, hierarchyProgramFilter, hierarchyItemFilter]);


  const counts: Record<string, number> = {
    전체: departmentRows.length,
    오류: departmentRows.filter((row) => row.status === "오류").length,
    주의: departmentRows.filter((row) => row.status === "주의").length,
    정상: departmentRows.filter((row) => row.status === "정상").length,
    사전: departmentRows.filter((row) => {
      const applicable = getApplicableProcedures(row);
      return applicable.length > 0;
    }).length,
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((currentColumns) =>
      currentColumns.includes(key) ? currentColumns.filter((item) => item !== key) : [...currentColumns, key],
    );
  };

  const saveStaff = async () => {
    setShowStaffModal(false);
    try {
      const response = await fetch('/api/cloud-sync?type=staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: staffData }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) {
        throw new Error(result.message || '서버 저장 실패');
      }
      showToast('서버에 부서별 정원·현원이 저장되었습니다.');
    } catch (error) {
      console.warn('정원·현원 클라우드 저장 실패:', error);
      showToast('정원·현원을 이 기기에만 저장했습니다 (클라우드 저장 실패).');
    }
  };

  // syncKeys: 메모 본문도 없고 숨김도 아닌 키는 어느 목록에도 안 들어가 서버까지 전달되지 않는다.
  // 숨김을 해제할 때 그 키를 여기에 실어 서버 쪽 표시도 확실히 풀어준다.
  const saveProgramMemosToServer = (nextMemos: Record<string, string>, nextHiddenMemoIds: string[], syncKeys: string[] = []) => {
    fetch('/api/cloud-sync?type=memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programMemos: nextMemos, hiddenMemoIds: nextHiddenMemoIds, syncKeys }),
    }).catch((error) => console.warn('예산 메모 클라우드 저장 실패:', error));
  };
  const updateProgramMemo = (rowId: string, value: string) => {
    setProgramMemos((prev) => {
      const next = { ...prev, [rowId]: value };
      try {
        localStorage.setItem('budgetProgramMemos', JSON.stringify(next));
      } catch (error) {
        console.warn('메모 저장 실패:', error);
      }
      saveProgramMemosToServer(next, hiddenMemoIds);
      return next;
    });
  };

  const hideMemoRow = (rowId: string) => {
    setHiddenMemoIds((prev) => {
      if (prev.includes(rowId)) return prev;
      const next = [...prev, rowId];
      try {
        localStorage.setItem('budgetHiddenMemoIds', JSON.stringify(next));
      } catch (error) {
        console.warn('메모 줄 숨김 저장 실패:', error);
      }
      saveProgramMemosToServer(programMemos, next);
      return next;
    });
  };

  const confirmBadge = (rowId: string, type: 'procedure' | 'formula') => {
    const setIds = type === 'procedure' ? setConfirmedProcedureIds : setConfirmedFormulaIds;
    const storageKey = type === 'procedure' ? 'budgetConfirmedProcedureIds' : 'budgetConfirmedFormulaIds';
    setIds((prev) => {
      if (prev.includes(rowId)) return prev;
      const next = [...prev, rowId];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (error) {
        console.warn('검토 확인 저장 실패:', error);
      }
      return next;
    });
    setConfirmingBadge(null);
  };

  // 숨긴 메모 줄은 반드시 되돌릴 수 있어야 한다. 숨김 목록은 클라우드에 저장되고 불러올 때
  // 합집합으로만 커지기 때문에(loadProgramMemosFromServer 참고), 되돌리는 수단이 없으면
  // 실수로 누른 X 하나가 모든 기기에서 영구히 유지된다. 메모 본문은 서버에 그대로 남아 있는데
  // 화면에만 안 나오니 사용자에게는 "써둔 메모가 사라졌다"로 보인다.
  const unhideMemoRows = (ids: string[]) => {
    if (ids.length === 0) return;
    setHiddenMemoIds((prev) => {
      const next = prev.filter((id) => !ids.includes(id));
      try {
        localStorage.setItem('budgetHiddenMemoIds', JSON.stringify(next));
      } catch (error) {
        console.warn('메모 줄 숨김 해제 저장 실패:', error);
      }
      saveProgramMemosToServer(programMemos, next, ids);
      return next;
    });
  };

  // 감액은 엑셀에서 "△1,000"(또는 "-1,000", "(1,000)")으로 적는다. 숫자 외의 글자를 전부 지우면
  // △가 사라져 감액이 증액(+1,000)으로 바뀌므로, 부호는 따로 먼저 읽어 음수로 만든다.
  const parseNumber = (value: unknown) => {
    const text = String(value ?? "0").trim();
    const negative = /^[△▽▼−-]/.test(text) || /^\(.*\)$/.test(text);
    const amount = Number(text.replace(/[^0-9.]/g, "")) || 0;
    return negative && amount ? -amount : amount;
  };
  // 엑셀 헤더에 공백이 섞여 있으면("정책 사업명", "정책사업명 " 등) 완전 일치 검색이
  // 항상 실패해 모든 행이 기본값("미분류 정책" 등)으로 떨어진다. 모든 공백을 지운 뒤
  // 비교해 이런 표기 차이를 흡수한다.
  const normalizeKey = (key: string) => key.replace(/\s+/g, "");
  const pick = (record: Record<string, unknown>, keys: string[]) => {
    const targets = keys.map(normalizeKey);
    const recordKey = Object.keys(record).find((candidate) => targets.includes(normalizeKey(candidate)));
    return recordKey ? record[recordKey] : "";
  };

  const HIERARCHY_LEVELS: HierarchyLevel[] = ["dept", "policy", "unit", "program", "account"];

  // 부서/정책/단위/세부/과목(0~4열) · 예산액/전년도/증감(5~7열) · 산출근거(8~9열, 12열) 고정 서식을
  // 행 배열로 받아 계층형 데이터로 변환한다. CSV와 "부서 통합" 엑셀 서식이 이 함수를 공유한다.
  const buildHierarchyFromRows = (cellRows: string[][]): BudgetHierarchyRow[] => {
    const hierarchyData: BudgetHierarchyRow[] = [];
    let id = 1;

    // 0행은 헤더. 원본 "국" 단위 파일은 1행에 전체 "총 계" 행이 하나 더 있지만,
    // 부서 하나만 담긴 분할 파일은 1행부터 바로 그 부서 데이터라 총계 행이 없다.
    // 총계 행이 실제로 있을 때만 건너뛰도록 내용을 보고 판단한다.
    const secondRowLabel = (cellRows[1]?.[0] || "").replace(/\s/g, "");
    const startIdx = secondRowLabel === "총계" ? 2 : 1;

    // "비교증감" 열 위치로 뒤따르는 통계목코드/산출식 열을 찾는다. 세출예산내역서는 이 열이
    // 7번인데, 세입예산내역서는 그 앞에 빈 칸이 하나 더 있어 8번에 온다 - 위치를 고정하는
    // 대신 헤더 텍스트에서 찾아 두 서식 모두 대응한다(못 찾으면 세출 기준인 7번으로 둔다).
    const headerRow = (cellRows[0] || []).map((cell) => (cell ?? "").trim());
    const diffColIdx = headerRow.findIndex((cell) => cell.includes("증감"));
    const DIFF_COL = diffColIdx !== -1 ? diffColIdx : 7;
    const CODE_COL = DIFF_COL + 1;
    const FORMULA_COL = DIFF_COL + 2;

    for (let idx = startIdx; idx < cellRows.length; idx++) {
      const cleanCells = (cellRows[idx] || []).map((cell) => (cell ?? "").replace(/^"+|"+$/g, "").trim());
      if (!cleanCells.some((cell) => cell)) continue;

      const hierIndent = [0, 1, 2, 3, 4].findIndex((i) => cleanCells[i]);
      const budget = parseNumber(cleanCells[5]);
      const previous = parseNumber(cleanCells[6]);
      const difference = parseNumber(cleanCells[DIFF_COL]);
      const col8 = cleanCells[CODE_COL] || "";
      const col9 = cleanCells[FORMULA_COL] || "";
      const col12 = cleanCells[12] || "";

      let level: HierarchyLevel;
      let label: string;
      let statisticsCode = "";
      let description = "";
      let colSpan: number | undefined;

      if (hierIndent !== -1) {
        // 부서/정책/단위/세부사업/통계목 레벨의 계층 라벨 행
        level = HIERARCHY_LEVELS[hierIndent];
        label = cleanCells[hierIndent];
        statisticsCode = col8;
      } else if (col8.includes("○") || col8.includes("ㅇ")) {
        // 산출근거 설명 (예: "○화성시문화관광재단 지원", 하위 항목은 "ㅇ유지관리 용역"처럼
        // 자음 "ㅇ"(이응)으로 표기됨 — 원 기호 "○"와 다른 문자라 별도로 걸러줘야 한다) —
        // 통계목 칸에 넣고, 산출식(9열)+결과값(12열)은 그대로 산출근거 칸에 둔다.
        level = "note";
        label = "";
        statisticsCode = col8;
        description = col9 && col12 ? `${col9} ${col12}` : col9;
      } else if (col8 && (budget || previous || difference)) {
        // 편성목 코드 + 금액 반복 행 (예: "01 출연금") — 통계목 칸에 넣고,
        // 통계목별 합산액(12열)은 같은 행 산출근거 칸 끝에 적는다.
        level = "item";
        label = "";
        statisticsCode = col8;
        description = col12;
      } else if (col9.includes("=")) {
        // 산출식 (예: "18,689,524,000원 =")
        level = "formula";
        label = "";
        description = col9 && col12 ? `${col9} ${col12}` : col9;
      } else if (col8) {
        level = "opinion";
        label = "";
        statisticsCode = col8;
      } else if (col12.startsWith("[")) {
        // 재원 내역 ([국 000] [도 000] [시 000])
        level = "note";
        label = "";
        description = col12;
      } else {
        continue;
      }

      if (!label && !budget && !previous && !difference && !description && !statisticsCode) continue;

      // 부서~통계목(hierIndent) 행과 편성목(item) 행은 5~7열이 실제 금액을 나타내므로
      // 0원도 "0"으로 그대로 보여준다. 부기명·산출식·재원내역처럼 금액이 다른 칸(설명)에
      // 들어가는 행은 5~7열이 원래 비어있는 게 정상이라 undefined로 남겨 빈칸으로 둔다.
      const hasOwnAmount = hierIndent !== -1 || level === "item";

      hierarchyData.push({
        id: `row-${id++}`,
        level,
        label,
        budget: hasOwnAmount ? budget : (budget || undefined),
        previous: hasOwnAmount ? previous : (previous || undefined),
        difference: hasOwnAmount ? difference : (difference || undefined),
        statisticsCode: statisticsCode || undefined,
        description: description || undefined,
        colSpan,
      });
    }

    // 원본 예산서의 행 구조를 그대로 유지한다 — 통계목·편성목·부기명·산출식 모두
    // 합치거나 지우지 않고 원본과 동일한 순서로 각자 자기 줄에 그대로 표시한다.
    return hierarchyData;
  };

  // "편성 부서"를 선택한 상태로 업로드하면, 파일 안에 여러 부서가 섞여 있어도
  // 선택한 부서의 데이터만 인식한다.
  const filterHierarchyByDepartment = (rows: BudgetHierarchyRow[], deptName: string) => {
    const filtered: BudgetHierarchyRow[] = [];
    let keeping = false;
    for (const row of rows) {
      if (row.level === 'dept') {
        keeping = row.label === deptName;
      }
      if (keeping) filtered.push(row);
    }
    return filtered;
  };

  // 부서별로 파일을 하나씩 업로드할 때, 기존에 저장된 다른 부서의 행은 그대로 두고
  // 이번에 업로드한 부서(들)의 기존 행만 새 데이터로 교체한다.
  const mergeHierarchyByDepartment = (existingRows: BudgetHierarchyRow[], newRows: BudgetHierarchyRow[]) => {
    const newDeptNames = new Set(newRows.filter((row) => row.level === 'dept').map((row) => row.label));
    if (newDeptNames.size === 0) return [...existingRows, ...newRows];

    const kept: BudgetHierarchyRow[] = [];
    let skipping = false;
    for (const row of existingRows) {
      if (row.level === 'dept') {
        skipping = newDeptNames.has(row.label);
      }
      if (!skipping) kept.push(row);
    }
    return [...kept, ...newRows];
  };

  const namespaceHierarchyRows = (rows: BudgetHierarchyRow[], namespace: string) => {
    const idMap = new Map<string, string>();
    rows.forEach((row, index) => idMap.set(row.id, `${namespace}-${index + 1}`));
    return rows.map((row) => ({
      ...row,
      id: idMap.get(row.id) ?? row.id,
      parentId: row.parentId ? (idMap.get(row.parentId) ?? row.parentId) : undefined,
    }));
  };

  // budgetHierarchyRows는 화면에 로드된 "모든" 부서가 한 배열에 평평하게 들어있고
  // (level:'dept' 행이 부서 경계, 그 뒤로 자식 행들이 이어지는 블록 구조), 개별 행에는
  // 소속 부서를 알 수 있는 필드가 없다. 예전에는 저장할 때마다 이 배열 전체를 한 번의
  // 요청으로 보내면서 서버 쪽에서 "현재 선택된 부서" 이름표 하나를 모든 행에 강제로
  // 붙였는데, 그러면 부서가 여러 개 쌓일수록 요청 크기가 계속 커지고 다른 부서 행들이
  // 방금 저장한 부서 이름으로 잘못 뒤바뀌는 충돌이 생겼다. 부서 블록 단위로 쪼개
  // 각자 자기 부서 이름으로만 저장하면 두 문제 다 사라진다(요청 크기는 그 부서 크기로
  // 고정되고, 다른 부서 행은 애초에 같이 보내지 않으니 뒤바뀔 일이 없다).
  const groupRowsByDepartment = (rows: BudgetHierarchyRow[]) => {
    const blocks: { department: string; rows: BudgetHierarchyRow[] }[] = [];
    let current: { department: string; rows: BudgetHierarchyRow[] } | null = null;
    for (const row of rows) {
      if (row.level === 'dept') {
        current = { department: row.label, rows: [] };
        blocks.push(current);
      }
      if (current) current.rows.push(row);
    }
    return blocks.filter((block) => block.department && block.rows.length > 0);
  };

  const saveHierarchyToServer = async (rows: BudgetHierarchyRow[]) => {
    localStorage.setItem(statementView === 'revenue' ? 'revenueBudgetHierarchyRows' : 'budgetHierarchyRows', JSON.stringify(rows));
    // 세입일 때만, 저장 나갈 때 dept 행 label 앞에 접두어를 붙인다(화면에 보이는 rows/state는 그대로 둔다).
    const rowsForSave = statementView === 'revenue'
      ? rows.map((row) => (row.level === 'dept' ? { ...row, label: REVENUE_DEPT_PREFIX + row.label } : row))
      : rows;
    const blocks = groupRowsByDepartment(rowsForSave);
    if (blocks.length === 0) return true;
    try {
      const results = await Promise.all(blocks.map(async (block) => {
        const response = await fetch('/api/cloud-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: block.rows, department: block.department }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success !== true) throw new Error(result.message || '서버 저장 실패');
        return true;
      }));
      return results.every(Boolean);
    } catch (error) {
      console.warn('클라우드 저장 시도 실패 (로컬 저장됨):', error);
      return false;
    }
  };

  const handleExcelUpload = async (file?: File) => {
    if (!file) return;

    // CSV 파일인 경우
    if (file.name.endsWith('.csv')) {
      try {
        const text = await file.text();
        const lines = text.split('\n');

        // CSV 파싱: 따옴표를 고려하여 분리
        const cellRows = lines.map((line) => {
          const cells: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cells.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          cells.push(current);
          return cells;
        });

        const parsedData = buildHierarchyFromRows(cellRows);
        if (parsedData.length === 0) {
          showToast("파일에서 데이터를 찾지 못했습니다.");
          return;
        }

        const uniqueParsedData = namespaceHierarchyRows(parsedData, `upload-${Date.now()}`);
        setBudgetHierarchyRows((prev) => {
          const merged = mergeHierarchyByDepartment(prev, uniqueParsedData);
          saveHierarchyToServer(merged).then((savedToServer) => {
            showToast(savedToServer ? `서버에 ${uniqueParsedData.length}개의 항목을 저장했습니다.` : `${uniqueParsedData.length}개의 항목을 이 기기에만 저장했습니다.`);
          });
          return merged;
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      } catch (error) {
        console.error('CSV 파싱 오류:', error);
        showToast("CSV 파일을 읽지 못했습니다.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    // Excel 파일인 경우
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      // "부서·정책·단위·세부·과목" 계층형 서식(여러 부서를 한 파일에 담은 서식) 감지
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
      const headerFirstCell = String((matrix[0] as unknown[])?.[0] ?? "");
      if (headerFirstCell.includes("부서") && headerFirstCell.includes("과목")) {
        const cellRows = (matrix as unknown[][]).map((row) => row.map((cell) => String(cell ?? "")));
        const parsedData = buildHierarchyFromRows(cellRows);
        if (!parsedData.length) {
          throw new Error("empty");
        }
        const uniqueParsedData = namespaceHierarchyRows(parsedData, `upload-${Date.now()}`);
        setBudgetHierarchyRows((prev) => {
          const merged = mergeHierarchyByDepartment(prev, uniqueParsedData);
          saveHierarchyToServer(merged).then((savedToServer) => {
            showToast(savedToServer ? `서버에 ${uniqueParsedData.length}개의 항목을 저장했습니다.` : `${uniqueParsedData.length}개의 항목을 이 기기에만 저장했습니다.`);
          });
          return merged;
        });
        return;
      }

      if (!department) {
        showToast("먼저 편성 부서를 선택해 주세요.");
        return;
      }

      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      const skippedDepartmentCount = 0;
      // 원본 예산서 엑셀은 "정책사업명"/"단위사업명" 칸을 같은 그룹 안에서 세로로 병합해
      // 맨 윗행에만 값을 적어두는 경우가 많다. XLSX 파서는 병합된 아래쪽 셀은 빈 문자열로
      // 읽어오므로, 그대로 두면 그 행들이 전부 "미분류 정책"/"단위사업 미지정"으로 떨어진다.
      // 마지막으로 값이 있던 정책/단위사업명을 아래 행으로 이어받는다(carry-down).
      let lastPolicy = "";
      let lastUnitProgram = "";
      const importedRows = imported
        .map((record, index): BudgetRow => {
          const rawStatus = String(pick(record, ["상태", "status"]));
          const status: Status = rawStatus === "오류" || rawStatus === "주의" || rawStatus === "정상" ? rawStatus : "정상";
          const code = String(pick(record, ["편성목코드"])) || "-";
          const rawStatisticalCode = String(pick(record, ["통계목코드"])) || "";
          // 엑셀에서 "05" 같은 코드가 숫자로 읽히면 앞자리 0이 사라지므로 2자리로 복원한다.
          const statisticalCode = /^\d+$/.test(rawStatisticalCode)
            ? rawStatisticalCode.padStart(2, "0")
            : rawStatisticalCode;
          const statisticalName = String(pick(record, ["통계목명"])) || "";
          const accountDisplay = statisticalCode && statisticalName ? `${statisticalCode} ${statisticalName}` : statisticalCode;
          const rawUnitProgram = String(pick(record, ["단위사업명"])) || "";
          if (rawUnitProgram) lastUnitProgram = rawUnitProgram;
          const unitProgram = rawUnitProgram || lastUnitProgram;
          const subProgram = String(pick(record, ["세부사업명"])) || "미입력 사업";
          const programDisplay = unitProgram ? `${unitProgram}\n${subProgram}` : subProgram;
          const rawPolicy = String(pick(record, ["정책사업명", "정책명", "정책"])) || "";
          if (rawPolicy) lastPolicy = rawPolicy;
          return {
            id: Date.now() + index,
            policy: rawPolicy || lastPolicy || "미분류 정책",
            program: programDisplay,
            code,
            account: accountDisplay,
            detail: (() => {
              const note = String(pick(record, ["요구산출근거"])) || "";
              const expr = String(pick(record, ["요구산출근거식"])).replace(/=/g, "").trim();
              return note && expr ? `${note}\n${expr}` : (note || expr || "-");
            })(),
            amount: parseNumber(pick(record, ["요구액"])),
            city: parseNumber(pick(record, ["자체재원"])),
            national: parseNumber(pick(record, ["국고보조금"])),
            province: parseNumber(pick(record, ["광역보조금"])),
            other: parseNumber(pick(record, ["기타"])),
            previous: parseNumber(pick(record, ["전년도"])),
            status,
            note: String(pick(record, ["검토메모", "메모", "note"])) || undefined,
            department,
          };
        });
      const nextRows = importedRows;
      if (!nextRows.length) throw new Error("empty");
      setSearch("");

      // 계층형 데이터로 변환
      const hierarchyRows: BudgetHierarchyRow[] = [];
      const groupedByDept = new Map<string, BudgetRow[]>();

      nextRows.forEach(row => {
        const dept = row.department || "미분류";
        if (!groupedByDept.has(dept)) groupedByDept.set(dept, []);
        groupedByDept.get(dept)!.push(row);
      });

      let id = 1;
      groupedByDept.forEach((deptRows, dept) => {
        const deptBudget = deptRows.reduce((sum, r) => sum + r.amount, 0);
        const deptPrevious = deptRows.reduce((sum, r) => sum + r.previous, 0);
        hierarchyRows.push({
          id: `dept-${id++}`,
          level: "dept",
          label: dept,
          budget: deptBudget,
          previous: deptPrevious,
          difference: deptBudget - deptPrevious
        });

        const groupedByPolicy = new Map<string, BudgetRow[]>();
        deptRows.forEach(row => {
          const policy = row.policy || "미분류 정책";
          if (!groupedByPolicy.has(policy)) groupedByPolicy.set(policy, []);
          groupedByPolicy.get(policy)!.push(row);
        });

        groupedByPolicy.forEach((policyRows, policy) => {
          const policyBudget = policyRows.reduce((sum, r) => sum + r.amount, 0);
          const policyPrevious = policyRows.reduce((sum, r) => sum + r.previous, 0);
          hierarchyRows.push({
            id: `policy-${id++}`,
            level: "policy",
            label: policy,
            budget: policyBudget,
            previous: policyPrevious,
            difference: policyBudget - policyPrevious,
            parentId: dept
          });

          policyRows.forEach(row => {
            hierarchyRows.push({
              id: `item-${id++}`,
              level: "item",
              label: row.program,
              budget: row.amount,
              previous: row.previous,
              difference: row.amount - row.previous,
              statisticsCode: row.account,
              description: row.detail,
              parentId: policy
            });
          });
        });
      });

      const uniqueHierarchyRows = namespaceHierarchyRows(hierarchyRows, `upload-${Date.now()}`);
      const mergedHierarchyRows = mergeHierarchyByDepartment(budgetHierarchyRows, uniqueHierarchyRows);
      setBudgetHierarchyRows(mergedHierarchyRows);
      const hierarchySaved = await saveHierarchyToServer(mergedHierarchyRows);

      setBudgetRows((prevRows) => {
        const otherDepartmentRows = prevRows.filter((row) => row.department !== department);
        const allRows = [...otherDepartmentRows, ...nextRows];
        showToast(`${department} 기존 자료를 초기화하고 ${nextRows.length}개를 등록했습니다.${skippedDepartmentCount > 0 ? ` (${skippedDepartmentCount}개 타 부서 행 제외)` : ""}${hierarchySaved ? " 서버 저장 완료" : " (이 기기에만 저장됨)"}`);
        try {
          localStorage.setItem('budgetRows', JSON.stringify(allRows));
        } catch (error) {
          console.warn('localStorage 저장 실패:', error);
        }
        setTimeout(() => saveDataToServer(allRows), 100);
        return allRows;
      });
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error && error.message.includes("데이터를 찾지 못했습니다")
        ? error.message
        : "엑셀 파일을 읽지 못했습니다. 첫 번째 시트와 열 이름을 확인해 주세요.";
      showToast(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveRowEdit = async () => {
    if (!editingRow) return;
    const updatedRows = budgetRows.map((row) => row.id === editingRow.id ? editingRow : row);
    setBudgetRows(updatedRows);
    setEditingRow(null);
    showToast(`${editingRow.program} 항목을 저장했습니다.`);
    await saveDataToServer(updatedRows);
  };

  const deleteRow = async (rowId: number) => {
    const rowToDelete = budgetRows.find(row => row.id === rowId);
    const updatedRows = budgetRows.filter(row => row.id !== rowId);
    setBudgetRows(updatedRows);
    showToast(`${rowToDelete?.program || '항목'}이(가) 삭제되었습니다.`);
    await saveDataToServer(updatedRows);
  };

  const exportToCsv = () => {
    const sheetRows = filteredRows.map((row) => ({
      정책사업명: row.policy,
      세부사업명: row.program,
      편성목코드: row.code,
      "통계목(계정)": row.account,
      요구산출근거: row.detail,
      요구액: row.amount,
      자체재원: row.city,
      국고보조금: row.national,
      광역보조금: row.province,
      기타: row.other,
      전년도: row.previous,
      상태: row.status,
      검토메모: row.note ?? "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${year}년_본예산_편성검토.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV 파일을 다운로드했습니다.");
  };

  // "PDF" 메뉴는 별도 PDF 렌더링 없이, 지금 화면의 세출예산내역서를 그대로 인쇄 미리보기로
  // 띄운다(브라우저 인쇄 대화상자에서 "PDF로 저장"을 고르면 곧 파일로 남는다). 단, 화면에는
  // 페이지당 30행만 그려져 있으므로 인쇄 전에 잠깐 전체 행을 그리도록 전환해야 한다.
  const handlePdfExport = () => {
    showToast("인쇄 미리보기를 준비했습니다.");
    setIsPrintMode(true);
  };

  // 전체 행 전환(isPrintMode)이 화면에 그려진 다음 프레임에 인쇄 대화상자를 띄운다 -
  // 곧바로 호출하면 아직 페이지네이션된 행이 그려진 채로 인쇄될 수 있다.
  useEffect(() => {
    if (!isPrintMode) return;
    const timer = window.setTimeout(() => window.print(), 150);
    return () => window.clearTimeout(timer);
  }, [isPrintMode]);

  // 인쇄 대화상자를 닫으면(취소하든 실제로 인쇄하든) 다시 페이지네이션 화면으로 되돌린다.
  useEffect(() => {
    const handleAfterPrint = () => setIsPrintMode(false);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const renderCell = (row: BudgetRow, key: ColumnKey) => {
    if (key === "policy") {
      const programLines = row.program.split("\n");
      return (
        <div className="program-cell">
          <span className="policy-name" title={row.policy}>{row.policy}</span>
          {programLines.map((line, idx) => (
            <button
              key={idx}
              className="program-name"
              title={`${line} · 설명자료 보기`}
              onClick={() =>
                setLocation(`/budget-explainer?dept=${encodeURIComponent(department)}&item=${encodeURIComponent(line)}`)
              }
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontFamily: "inherit",
                textAlign: "left",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              {line}
            </button>
          ))}
        </div>
      );
    }
    if (key === "account") {
      return (
        <div className="account-cell">
          <span className="account-code">{row.code}</span>
          <span className="account-name" title={row.account}>{row.account}</span>
        </div>
      );
    }
    if (key === "detail") {
      const lineBreakIndex = row.detail.indexOf("\n");
      const description = lineBreakIndex === -1 ? row.detail : row.detail.slice(0, lineBreakIndex).trim();
      const formula = lineBreakIndex === -1 ? "" : row.detail.slice(lineBreakIndex + 1).trim();
      const procedureNames = (row.procedures || []).map(id => PROCEDURE_NAMES[id]).filter(Boolean);
      return (
        <div className="detail-cell">
          <span className="detail-description" title={description}>{description}</span>
          {formula && <span className="detail-formula" title={formula}>{formula}</span>}
          {procedureNames.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {procedureNames.map((name, idx) => (
                <span key={idx} style={{ display: 'inline-block', backgroundColor: '#ffe0e0', color: '#c0392b', padding: '4px 8px', borderRadius: '3px', fontSize: '0.85em', fontWeight: 500 }}>{name}</span>
              ))}
            </div>
          )}
          {(row.formulaErrors && row.formulaErrors.length > 0) && (
            <div style={{ display: 'block', marginTop: '6px', padding: '6px', backgroundColor: '#e8f5e9', borderRadius: '3px', borderLeft: '3px solid #4caf50' }}>
              {row.formulaErrors.map((error, idx) => (
                <div key={idx} style={{ fontSize: '0.75em', color: '#2e7d32', marginBottom: idx < row.formulaErrors!.length - 1 ? '4px' : '0' }}>
                  {error}
                </div>
              ))}
            </div>
          )}
          {row.note && <span className={`row-note row-note-${row.status}`}>{row.note}</span>}
        </div>
      );
    }
    if (key === "status") {
      const hasFormula = row.formulaErrors && row.formulaErrors.length > 0;
      const hasProcedure = row.procedures && row.procedures.length > 0;

      if (hasFormula || hasProcedure) {
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {hasFormula && (
              <button
                type="button"
                onClick={() => {
                  showToast(`산출식: ${row.formulaErrors![0]}`);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  fontSize: '0.75em',
                  fontWeight: 500,
                  border: '1px solid #4caf50',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c8e6c9')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e8f5e9')}
              >
                ✓ 산출식
              </button>
            )}
            {hasProcedure && (
              <button
                type="button"
                onClick={() => {
                  const updatedRows = budgetRows.map(r => r.id === row.id ? { ...r, procedures: [] } : r);
                  setBudgetRows(updatedRows);
                  localStorage.setItem('budgetRows', JSON.stringify(updatedRows));
                  showToast(`사전 절차 완료 표시됨`);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  fontSize: '0.75em',
                  fontWeight: 500,
                  border: '1px solid #ffc107',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginLeft: 'auto'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ffe69c')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff3cd')}
              >
                ⚠️ 사전
              </button>
            )}
          </div>
        );
      }
      return <StatusBadge status={row.status} />;
    }
    const value = row[key as keyof BudgetRow];
    return <span className={key === "amount" ? "amount-emphasis" : "numeric-cell"}>{formatAmount(Number(value))}</span>;
  };

  return (
    <Layout
      showToast={showToast}
      // 형광펜은 화면 좌표에 고정된 그림이라, URL은 안 바뀌어도 표에 보이는 내용이
      // 바뀌는 모든 경우(부서 전환뿐 아니라 페이지네이션·검색·필터)를 다 scope에 넣어야
      // "다음 페이지로 넘기면 다른 행 위에 그대로 겹쳐 보이는" 문제가 안 생긴다.

    >
      <div className="page-content">
          <section className="page-heading">
            <div className="title-area">
              <div className="title-wrapper budget-page-title">
                <h1>{year} 본예산 편성 검토</h1>
              </div>
              <div className="action-row no-print">
                <div className="action-group">
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="icon-stack-btn"
                      aria-label="저장"
                      onClick={() => setShowSaveMenu(!showSaveMenu)}
                    >
                      <div className="icon-stack-front"><Download size={20} /></div>
                    </button>
                    {showSaveMenu && (
                      <div className="save-menu">
                        <button onClick={() => { exportToCsv(); setShowSaveMenu(false); }}>
                          CSV
                        </button>
                        <button onClick={() => { handlePdfExport(); setShowSaveMenu(false); }}>
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <label className="icon-stack-btn" aria-label="업로드" data-tooltip="업로드">
                    <div className="icon-stack-front"><Upload size={20} /></div>
                    <input
                      ref={fileInputRef}
                      className="upload-input"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleExcelUpload(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="context-bar no-print">
              <div className="select-field"><span>회계연도</span><Dropdown value={year} options={yearOptions} onChange={setYear} label="회계연도" /></div>
              <div className={`select-field dept-select-field${department && departmentOptions.some((o: { value: string }) => o.value === department) ? " dept-picked" : ""}`}><span>편성 부서</span><Dropdown value={department} options={departmentOptions} onChange={(value) => { setDepartment(value); localStorage.setItem('selectedDepartment', value); setCurrentPage(1); setProgramFilter(""); setAccountFilter(""); setSearch(""); setStatusFilter("전체"); setHierarchyProgramFilter([]); setHierarchyItemFilter([]); }} label="편성 부서" /></div>
              <div className="select-field"><span>정현원</span><button className="staff-summary" onClick={() => setShowStaffModal(true)}><UsersRound size={17} /><span>정원 <b>{staffData[department]?.capacity || "-"}명</b></span><span>현원 <b>{staffData[department]?.current || "-"}명</b></span></button></div>
              <div className="select-field dept-note-field"><span>부서 메모</span><textarea className="dept-note" value={deptNote} disabled={!department || department === '전체'} placeholder={department && department !== '전체' ? "부서 전체 사항, 잊지 말아야 할 내용을 자유롭게 적어두세요" : "편성 부서를 먼저 선택하세요"} onChange={(event) => onDeptNoteChange(event.target.value)} onBlur={flushDeptNote} rows={2} aria-label="부서 메모" /></div>
            </div>
          </section>

          {department === '전체' ? (
            <AllDepartmentsOverview rows={budgetHierarchyRows} supp3ByDepartment={supp3ByDepartment} />
          ) : (
          <>
          <section className={`metric-grid no-print${department ? " dept-selected" : ""}`} aria-label="예산 요약">
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 요구액</span></div>
              </div>
              {/* 왼쪽: 2027 요구액 제목 아래 본·3추 증감률, 오른쪽: 금액(다른 카드와 같은 자리). 카드 높이는 그대로. */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "8px", marginTop: "4px", minHeight: "42px" }}>
                  {(() => {
                    const base2026Amount = department && budget2026Data[department]?.base2026
                      ? parseBudgetInput(budget2026Data[department].base2026)
                      : hierarchyTotals.previous;
                    const supp3Amount = department && budget2026Data[department]?.supp3
                      ? parseBudgetInput(budget2026Data[department].supp3)
                      : null;
                    const basePct = formatYoyPercent(hierarchyTotals.amount, base2026Amount);
                    const supp3Pct = formatYoyPercent(hierarchyTotals.amount, supp3Amount);
                    if (!basePct && !supp3Pct) return null;
                    // 증가는 초록 ▲, 감소는 빨강 ▼, 변동 없음은 회색 ▶ — 화살표가 방향을
                    // 전달하므로 부호(+/△)는 칩 안에서는 떼고 숫자만 보여준다.
                    const renderChip = (label: string, pct: string) => {
                      const isUp = pct.startsWith("+");
                      const isDown = pct.startsWith("△");
                      const color = isUp ? "#4ade80" : isDown ? "#f87171" : "#9ca3af";
                      const arrow = isUp ? "▲" : isDown ? "▼" : "▶";
                      return (
                        <span
                          key={label}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "1px 7px",
                            border: "1px solid rgba(255,255,255,0.18)",
                            borderRadius: "6px",
                            background: "rgba(255,255,255,0.04)",
                            fontSize: "12px",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ color: "#c0d0df" }}>{label}</span>
                          <span style={{ color }}>{arrow} {pct.replace(/^[+△]/, "")}</span>
                        </span>
                      );
                    };
                    return (
                      // 2027 요구액 제목 아래에 본 → 3추 순서로 세로로 쌓는다.
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" }}>
                        {basePct && renderChip("본", basePct)}
                        {supp3Pct && renderChip("3추", supp3Pct)}
                      </div>
                    );
                  })()}
                <span style={{ marginLeft: "auto" }}><strong style={{ margin: 0, color: "#edf5fe", fontSize: "calc(1rem + 5px)", lineHeight: 1.1, letterSpacing: "-0.045em", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatMillion(hierarchyTotals.amount)}<span className="metric-unit">백만원</span></strong></span>
              </div>
            </article>
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 신규 예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 5px)" }}>{formatMillion(newProjectTotal)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 주요투자사업 예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 5px)" }}>{formatMillion(majorInvestmentTotal)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#e8b84b" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2026 본예산액</span><button type="button" className="metric-edit-trigger" onClick={() => setShowBudget2026Modal(true)} aria-label="2026 예산액 편집"><Pencil size={13} /></button></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 5px)" }}>{department && budget2026Data[department]?.base2026 ? formatMillion(parseBudgetInput(budget2026Data[department].base2026)) : formatMillion(hierarchyTotals.previous)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#e8b84b" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2026년 예산액 (3추 기준)</span><button type="button" className="metric-edit-trigger" onClick={() => setShowBudget2026Modal(true)} aria-label="2026 예산액 편집"><Pencil size={13} /></button></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 5px)" }}>{department && budget2026Data[department]?.supp3 ? formatMillion(parseBudgetInput(budget2026Data[department].supp3)) : "-"}<span className="metric-unit">백만원</span></strong>
            </article>
          </section>

          <section className="table-panel ledger-paper" style={{ background: '#ece7db' }}>
            <div className="table-heading" style={{ minHeight: 0, padding: '8px 19px 8px 30px' }}>
              <div className="table-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {([["revenue", "세입예산내역서"], ["expenditure", "세출예산내역서"]] as const).map(([view, label]) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setStatementView(view)}
                        style={{
                          fontSize: '20px', fontWeight: 600, padding: '5px 12px 3px', lineHeight: 1.15, borderRadius: '6px',
                          border: 'none', cursor: 'pointer',
                          background: 'transparent',
                          color: statementView === view ? '#3d70b8' : '#8b9099',
                          boxShadow: statementView === view ? 'inset 0 0 0 1px #3d70b8' : 'none',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {statementView === 'expenditure' && supplementaryRounds.length > 0 && (
                    <span className="no-print" title={supplementaryRounds.map((record) => `${record.round}회: ${record.fileName}`).join('\n')} style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f', background: '#e3e9f1', border: '1px solid #b7c2cf', borderRadius: '999px', padding: '3px 10px' }}>
                      추경 {[...supplementaryRounds].sort((a, b) => a.round - b.round).map((record) => record.round).join('·')}회 반영
                    </span>
                  )}
                  {department === "전국체전추진단" && (
                    <>
                      <button
                        type="button"
                        className="no-print"
                        onClick={() => setShowChejeon(true)}
                        title="2027 전국체전 본예산 필수 소요 검토"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '5px 11px', fontSize: '13px', fontWeight: 600,
                          color: '#1e3a5f', background: '#e3e9f1',
                          border: '1px solid #b7c2cf', borderRadius: '6px', cursor: 'pointer',
                        }}
                      >
                        <Calculator size={14} />
                        전국체전 소요 예산 검토(시전체)
                      </button>
                      <button
                        type="button"
                        className="no-print"
                        onClick={() => setShowChejeonOrg(true)}
                        title="2027 전국체전 대회준비 추진체계(1실 18부 84팀)"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '5px 11px', fontSize: '13px', fontWeight: 600,
                          color: '#1e3a5f', background: '#e3e9f1',
                          border: '1px solid #b7c2cf', borderRadius: '6px', cursor: 'pointer',
                        }}
                      >
                        <Network size={14} />
                        본부 조직도
                      </button>
                    </>
                  )}
                </div>
                <div className="no-print" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: '#6b7280', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={hierarchySearch}
                    onChange={(event) => setHierarchySearch(event.target.value)}
                    placeholder="검색"
                    style={{ width: '220px', padding: '6px 10px 6px 30px', fontSize: '13px', background: '#eef1f5', border: '1px solid #b7c2cf', borderRadius: '6px', color: '#111827' }}
                  />
                </div>
              </div>
            </div>

            <div className="table-scroll ledger-scrollbar" ref={tableRef} style={{ overflowX: 'auto', overflowY: 'visible', border: '1px solid #b7c2cf' }}>
              <table className="budget-table hierarchy-budget-table" style={{ width: '100%', minWidth: '1440px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  {(['label', 'budget', 'previous', 'difference', 'statisticsCode', 'description', 'review'] as const).map((key) => (
                    <col key={key} style={{ width: `${getHierarchyColumnWidth(key)}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr style={{ background: '#1e3a5f', position: 'sticky', top: 0, zIndex: 2 }}>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(16px + 1pt)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                      <HeaderFilterDropdown
                        label="부서/정책/단위/세부/과목"
                        value={hierarchyProgramFilter}
                        options={uniqueHierarchyPrograms}
                        onChange={setHierarchyProgramFilter}
                      />
                      {renderHierarchyResizeHandle('label')}
                    </th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(16px + 1pt)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>예산액{renderHierarchyResizeHandle('budget')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(16px + 1pt)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>기정액(본){renderHierarchyResizeHandle('previous')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(16px + 1pt)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>증감{renderHierarchyResizeHandle('difference')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(15px + 1pt)' }}>
                      <HeaderFilterDropdown
                        label="통계목"
                        value={hierarchyItemFilter}
                        options={uniqueHierarchyItems}
                        onChange={setHierarchyItemFilter}
                        align="right"
                      />
                      {renderHierarchyResizeHandle('statisticsCode')}
                    </th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(16px + 1pt)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>산출근거{renderHierarchyResizeHandle('description')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: 'calc(16px + 1pt)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>검토{renderHierarchyResizeHandle('review')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 각 세부사업(program) 블록이 끝나는 행(다음 program/상위 레벨이 시작되기 직전,
                    // 또는 표의 맨 끝)에 그 세부사업의 메모 칸을 붙인다.
                    const BOUNDARY_LEVELS: HierarchyLevel[] = ['dept', 'policy', 'unit', 'program'];
                    let activeProgramId: string | null = null;
                    const memoAfterRowId: Record<string, string> = {};
                    filteredHierarchyRows.forEach((row, idx) => {
                      // 메모는 행 id가 아니라 "부서::세부사업명"으로 키를 잡는다. 행 id는
                      // 파일을 다시 업로드할 때마다 새로 발급되므로, id로 저장하면 재업로드할
                      // 때마다 기존에 적어둔 메모가 전부 연결이 끊겨버린다.
                      if (row.level === 'program') activeProgramId = `${department}::${row.label}`;
                      const nextRow = filteredHierarchyRows[idx + 1];
                      const nextIsBoundaryOrEnd = !nextRow || BOUNDARY_LEVELS.includes(nextRow.level);
                      if (activeProgramId && nextIsBoundaryOrEnd) {
                        memoAfterRowId[row.id] = activeProgramId;
                        activeProgramId = null;
                      }
                    });

                    // 편성목(item) 행 바로 다음에 연달아 딸린 부기명 행들(예: "○일반수용비",
                    // "○급식비", "○위원회 참석수당" 등, 한 편성목 아래 여러 개가 이어질 수
                    // 있다)의 텍스트를 전부 모아둔다. 201-01(사무관리비)처럼 코드만으로는 너무
                    // 광범위한 통계목은 이 텍스트로 실제 표준 산출식이 있는 하위 항목인지
                    // 좁혀서 판단한다.
                    const nextNoteLinesByItemId: Record<string, string[]> = {};
                    filteredHierarchyRows.forEach((row, idx) => {
                      if (row.level !== 'item') return;
                      const noteTexts: string[] = [];
                      for (let j = idx + 1; j < filteredHierarchyRows.length; j++) {
                        const nextRow = filteredHierarchyRows[j];
                        // 부기명("○일반수용비")과 그 계산 결과값이 'note'가 아니라 별도의
                        // 'formula' 레벨 행으로 따로 떨어져 나오는 경우가 있어("18,750,000원 = 18,750"),
                        // 'formula'도 같이 모아야 라벨 다음 줄의 계산값을 찾을 수 있다.
                        if (nextRow.level !== 'note' && nextRow.level !== 'formula') break;
                        noteTexts.push(`${nextRow.statisticsCode ?? ''} ${nextRow.description ?? ''}`);
                      }
                      if (noteTexts.length > 0) nextNoteLinesByItemId[row.id] = noteTexts;
                    });

                    const pageStart = (hierarchyPage - 1) * HIERARCHY_ROWS_PER_PAGE;
                    const pagedRows = isPrintMode
                      ? filteredHierarchyRows
                      : filteredHierarchyRows.slice(pageStart, pageStart + HIERARCHY_ROWS_PER_PAGE);

                    return pagedRows.map((row) => {
                    const getPaddingLeft = () => {
                      switch (row.level) {
                        case 'dept': return '16px';
                        case 'policy': return '40px';
                        case 'unit': return '64px';
                        case 'program': return '88px';
                        case 'account': return '112px';
                        case 'item': return '136px';
                        case 'note': return '16px';
                        case 'formula': return '16px';
                        default: return '16px';
                      }
                    };

                    // 부기명(note) 행만 강조 표시 대상이다. 키를 행 id가 아니라 내용 경로로
                    // 잡아야 엑셀을 다시 올려도 표시가 그대로 따라붙는다.
                    const markAncestors = hierarchyAncestors.get(row.id);
                    const markKey = row.level === 'note'
                      ? [
                          department,
                          markAncestors?.programRow?.label ?? '',
                          markAncestors?.itemRow?.statisticsCode ?? '',
                          row.statisticsCode ?? '',
                        ].join('::')
                      : null;
                    const markColor = markKey ? rowMarks[markKey] : undefined;

                    const getBackground = () => {
                      return markColor || 'transparent';
                    };

                    const getFontSize = () => {
                      if (row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program') return 'calc(15px + 1pt)';
                      if (row.level === 'item' || row.level === 'note') return 'calc(14px + 1pt)';
                      return 'calc(13px + 1pt)';
                    };

                    // 부서~세부사업(첫 컬럼) 전용: 나머지 레벨은 기존과 동일하고, 상위 레벨만 1포인트 크게.
                    const getLabelFontSize = () => {
                      if (row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program') return 'calc(16px + 1pt)';
                      return getFontSize();
                    };

                    // 통계목 컬럼 전용: 통계목(item)과 부기명(note)만 1포인트 크게.
                    const getStatCodeFontSize = () => {
                      if (row.level === 'item' || row.level === 'note') return 'calc(15px + 1pt)';
                      return getFontSize();
                    };

                    const getFontWeight = () => {
                      if (row.level === 'dept') return '600';
                      if (row.level === 'policy') return '500';
                      if (row.level === 'program') return '700'; // 지마켓 산스 Medium → Bold 한 단계
                      return 'normal';
                    };

                    // 예산액·전년도·증감 컬럼 전용: 부서~세부사업(상위 레벨)은 기존 굵기/크기 그대로 유지하고,
                    // 그 아래(편성목·통계목·부기 등)는 레벨에 상관없이 동일하게 얇고 한 단계 작은 글씨로 통일한다.
                    const isUpperAmountLevel = row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program';
                    const getAmountFontSize = () => (isUpperAmountLevel ? 'calc(14px + 1pt)' : 'calc(13px + 1pt)');
                    const getAmountFontWeight = () => (isUpperAmountLevel ? '600' : '400');

                    // 감액(음수)은 예산서 관행대로 "△1,000"으로 표시한다.
                    const formatNumber = (num?: number) => {
                      if (!num && num !== 0) return '';
                      const text = new Intl.NumberFormat('ko-KR').format(Math.abs(num));
                      return num < 0 ? `△${text}` : text;
                    };
                    // 예전 버전이 "△1,000"을 +1,000으로 잘못 읽어 저장해 둔 행도 바로잡아 보여준다:
                    // 증감액은 항상 (예산액 - 전년도)이므로, 크기는 같고 부호만 반대면 계산값을 쓴다.
                    const getDisplayDifference = (target: BudgetHierarchyRow) => {
                      const diff = target.difference;
                      if (typeof target.budget === 'number' && typeof target.previous === 'number' && typeof diff === 'number') {
                        const computed = target.budget - target.previous;
                        if (diff !== computed && Math.abs(diff) === Math.abs(computed)) return computed;
                      }
                      return diff;
                    };

                    const memoProgramId = memoAfterRowId[row.id];
                    const isEditingMemo = memoProgramId && editingMemoId === memoProgramId;
                    const memoRow = memoProgramId && !hiddenMemoIds.includes(memoProgramId) && (
                      <tr key={`${row.id}-memo`}>
                        <td colSpan={7} style={{ padding: '4px 16px', background: 'rgba(60, 50, 35, 0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isEditingMemo ? (
                              <>
                                {/* 부기명 메모처럼: 바로 입력, Enter·포커스 이동 시 저장, Esc 취소 */}
                                <input
                                  type="text"
                                  value={memoDraft}
                                  onChange={(event) => setMemoDraft(event.target.value)}
                                  onBlur={() => { updateProgramMemo(memoProgramId, memoDraft); setEditingMemoId(null); }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') { updateProgramMemo(memoProgramId, memoDraft); setEditingMemoId(null); }
                                    if (event.key === 'Escape') setEditingMemoId(null);
                                  }}
                                  placeholder="세부사업 메모"
                                  autoFocus
                                  style={{ flex: 1, background: '#fff', border: '1px solid #111827', borderRadius: '4px', padding: '3px 8px', color: '#111827', fontSize: 'calc(13px + 1pt)' }}
                                />
                              </>
                            ) : (
                              <>
                                <span
                                  onClick={() => { setMemoDraft(programMemos[memoProgramId] ?? ''); setEditingMemoId(memoProgramId); }}
                                  title={programMemos[memoProgramId] ? '클릭하여 메모 수정' : '클릭하여 메모 입력'}
                                  style={{ flex: 1, fontSize: 'calc(13px + 1pt)', color: programMemos[memoProgramId] ? '#111827' : 'rgba(0,0,0,0.25)', padding: '4px 8px', cursor: 'pointer' }}
                                >
                                  {programMemos[memoProgramId] || '클릭하여 메모 입력'}
                                </span>
                                {pendingHideId === memoProgramId ? (
                                  <>
                                    <span style={{ flexShrink: 0, fontSize: 'calc(11px + 1pt)', color: '#9b2c2c' }}>이 메모 줄을 숨길까요?</span>
                                    <button
                                      type="button"
                                      aria-label="메모 줄 숨기기 확인"
                                      title="숨기기"
                                      onClick={() => { hideMemoRow(memoProgramId); setPendingHideId(null); }}
                                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', border: '1px solid #9b2c2c', borderRadius: '4px', background: 'rgba(155, 44, 44, 0.12)', color: '#9b2c2c', cursor: 'pointer' }}
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="메모 줄 숨기기 취소"
                                      title="취소"
                                      onClick={() => setPendingHideId(null)}
                                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', border: '1px solid #b7c2cf', borderRadius: '4px', background: 'transparent', color: '#475569', cursor: 'pointer' }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label="메모 줄 숨기기"
                                    title="이 메모 줄 숨기기"
                                    onClick={() => {
                                      // 써둔 메모가 있는 줄은 한 번 더 물어본다. 빈 줄은 바로 정리해도 잃을 게 없다.
                                      if (programMemos[memoProgramId]) setPendingHideId(memoProgramId);
                                      else hideMemoRow(memoProgramId);
                                    }}
                                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', border: '1px solid #b7c2cf', borderRadius: '4px', background: 'transparent', color: '#9b2c2c', cursor: 'pointer' }}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );

                    // colSpan이 있는 경우 (부기명, 산출식 등)
                    if (row.colSpan) {
                      const isRightAligned = row.level === 'formula' || row.level === 'opinion';
                      return (
                        <Fragment key={row.id}>
                          <tr>
                            <td colSpan={row.colSpan} style={{ paddingLeft: getPaddingLeft(), paddingRight: isRightAligned ? '16px' : '0', background: getBackground(), fontSize: getFontSize(), color: '#1a1a1a', borderTop: '1px solid #e0e0e0', textAlign: isRightAligned ? 'right' : 'left' }}>
                              {row.label}
                            </td>
                          </tr>
                          {memoRow}
                        </Fragment>
                      );
                    }

                    const getColor = () => {
                      if (row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program') return '#000000';
                      if (row.level === 'note' || row.level === 'formula' || row.level === 'opinion') return '#1a1a1a';
                      return '#000000';
                    };

                    const handleProgramClick = () => {
                      if (row.level === 'program') {
                        const url = `/budget-explainer?dept=${encodeURIComponent(department)}&item=${encodeURIComponent(row.label)}`;
                        setLocation(url);
                      }
                    };

                    const rowAncestors = hierarchyAncestors.get(row.id);
                    const itemBadges = row.level === 'item'
                      ? getHierarchyItemBadges(row, rowAncestors?.accountRow?.label ?? '', rowAncestors?.programRow?.label ?? '')
                      : [];
                    const formulaChecks = getHierarchyFormulaChecks(
                      row, rowAncestors?.accountRow?.label ?? '', nextNoteLinesByItemId[row.id] ?? [], staffData[department]
                    );
                    const itemHasFormula = formulaChecks.length > 0;
                    const formulaLabel = formulaChecks.map((check) => check.message).join(' / ');
                    // "검토" 열의 사전/산출식 버튼은 각각 따로 확인 처리할 수 있다 - 확인한 쪽만
                    // 숨기고, 아직 확인 안 한 쪽은 계속 보여야 한다.
                    const procedureConfirmed = confirmedProcedureIds.includes(row.id);
                    const formulaConfirmed = confirmedFormulaIds.includes(row.id);
                    const showProcedureButton = itemBadges.length > 0 && !procedureConfirmed;
                    const showFormulaButton = itemHasFormula && !formulaConfirmed;
                    // 부기명(note) 행이 설명하는 편성목(item)이 전년도 예산 없이 2027년에
                    // 처음 편성된 항목이면(전년도 0원, 올해는 금액 있음) 산출근거 앞에
                    // "신규" 표시를 붙인다.
                    const isNewItemNote = row.level === 'note'
                      && !(rowAncestors?.itemRow?.previous || 0)
                      && (rowAncestors?.itemRow?.budget || 0) > 0;
                    // 화성시 주요투자사업 대시보드에 등록된 세부사업이면 사업명 앞에 "주요" 배지를 붙인다.
                    const isMajorProgram = row.level === 'program' && isMajorInvestmentProgram(department, row.label);

                    // 부기명 줄의 사업명·예산액·전년도·증감 칸은 항상 비어 있다(해당 값은
                    // 위 통계목 줄에 이미 표시됨). 그 빈 공간을 키워드 등을 적는 넓은 메모칸으로 쓴다.
                    // 오른쪽 검토 칸의 짧은 메모와는 따로 저장한다(키 끝에 "::왼쪽메모").
                    const leftNoteKey = markKey ? `${markKey}::왼쪽메모` : null;
                    // 공약사항 표시 - 부기명마다 직접 켜고 끈다. 왼쪽메모처럼 키 끝에 "::공약"을 붙여
                    // 같은 표시 테이블에 저장한다(값 '공약'이면 표시, 빈 값이면 해제).
                    const pledgeKey = markKey ? `${markKey}::공약` : null;
                    const isPledge = pledgeKey !== null && !!rowNotes[pledgeKey];
                    // 통계목 안에 전년 금액이 있어 자동 "신규"가 안 붙는 부기명도, 검토자가 신규로 지정하면
                    // (표시 테이블에 키 끝 "::신규") 같은 신규 배지를 붙인다.
                    const isEditingLeftNote = leftNoteKey !== null && editingRowNoteKey === leftNoteKey && editingRowNoteSide === 'left';
                    return (
                      <Fragment key={row.id}>
                        <tr>
                          {row.level === 'note' ? (
                            <td
                              colSpan={4}
                              onClick={leftNoteKey && !isEditingLeftNote ? () => { setRowNoteDraft(rowNotes[leftNoteKey] ?? ''); setEditingRowNoteSide('left'); setEditingRowNoteKey(leftNoteKey); } : undefined}
                              title={leftNoteKey ? (rowNotes[leftNoteKey] ? '클릭하여 메모 수정' : '클릭하여 메모 입력') : undefined}
                              style={{
                                paddingLeft: getPaddingLeft(),
                                paddingRight: '8px',
                                background: getBackground(),
                                verticalAlign: 'top',
                                paddingTop: rowSpacing,
                                paddingBottom: rowSpacing,
                                borderRight: '1px solid rgba(60,50,35,0.12)',
                                cursor: leftNoteKey && !isEditingLeftNote ? 'pointer' : 'default',
                              }}
                            >
                              {leftNoteKey && isEditingLeftNote ? (
                                <input
                                  autoFocus
                                  value={rowNoteDraft}
                                  onChange={(event) => setRowNoteDraft(event.target.value)}
                                  onBlur={() => setRowNote(leftNoteKey, rowNoteDraft)}
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') setRowNote(leftNoteKey, rowNoteDraft);
                                    if (event.key === 'Escape') { setEditingRowNoteKey(null); setRowNoteDraft(""); }
                                  }}
                                  placeholder="예: 전년 대비 증액 사유"
                                  style={{ width: '100%', padding: '3px 8px', border: '1px solid #1d4ed8', borderRadius: '4px', fontSize: 'calc(13px + 1pt)', fontWeight: 600, color: '#1d4ed8' }}
                                />
                              ) : (
                                <span style={{ fontSize: 'calc(13px + 1pt)', fontWeight: 600, color: leftNoteKey && rowNotes[leftNoteKey] ? '#1d4ed8' : 'rgba(0,0,0,0.07)' }}>
                                  {(leftNoteKey && rowNotes[leftNoteKey]) || (leftNoteKey ? '클릭하여 메모 입력' : '')}
                                </span>
                              )}
                            </td>
                          ) : (
                            <>
                              <td
                                onClick={handleProgramClick}
                                style={{
                                  paddingLeft: getPaddingLeft(),
                                  paddingRight: '8px',
                                  background: getBackground(),
                                  fontSize: getLabelFontSize(),
                                  fontWeight: getFontWeight(),
                                  // 세부사업명만 지마켓 산스로(크기·굵기는 다른 행과 같은 규칙)
                                  fontFamily: row.level === 'program' ? '"Gmarket Sans", "Pretendard", system-ui, sans-serif' : undefined,
                                  color: getColor(),
                                  verticalAlign: 'top',
                                  paddingTop: rowSpacing,
                                  paddingBottom: rowSpacing,
                                  borderRight: '1px solid rgba(60,50,35,0.12)',
                                  cursor: row.level === 'program' ? 'pointer' : 'default',
                                  textDecoration: row.level === 'program' ? 'underline' : 'none',
                                  textDecorationColor: row.level === 'program' ? '#4a90e2' : 'transparent'
                                }}
                              >
                                {isMajorProgram && (
                                  <span style={{ display: 'inline-block', padding: '1px 6px', marginRight: '6px', borderRadius: '4px', background: 'rgba(91, 155, 240, 0.15)', color: '#5b9bf0', fontSize: 'calc(11px + 1pt)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    주요
                                  </span>
                                )}
                                {(requestBadgesByRow.get(row.id) ?? []).map((badge) => (
                                  <span key={badge.label} title={badge.title} style={{ display: 'inline-block', padding: '1px 6px', marginRight: '6px', borderRadius: '4px', ...REQUEST_BADGE_STYLES[badge.tone], fontSize: 'calc(11px + 1pt)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {badge.label}
                                  </span>
                                ))}
                                {row.label}
                              </td>
                              <td style={{ textAlign: 'right', background: getBackground(), fontSize: getAmountFontSize(), fontWeight: getAmountFontWeight(), color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '10px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                                {formatNumber(row.budget)}
                              </td>
                              <td style={{ textAlign: 'right', background: getBackground(), fontSize: getAmountFontSize(), fontWeight: getAmountFontWeight(), color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '10px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                                {formatNumber(row.previous)}
                              </td>
                              <td style={{ textAlign: 'right', background: getBackground(), fontSize: getAmountFontSize(), fontWeight: getAmountFontWeight(), color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '10px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                                {formatNumber(getDisplayDifference(row))}
                              </td>
                            </>
                          )}
                          <td
                            className="stat-code-cell"
                            onClick={markKey ? () => setMarkPickerKey(markPickerKey === markKey ? null : markKey) : undefined}
                            title={markKey ? '클릭하여 강조 표시' : undefined}
                            style={{ background: getBackground(), fontSize: getStatCodeFontSize(), color: getColor(), textAlign: 'left', verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingLeft: '16px', whiteSpace: 'nowrap', overflow: 'visible', position: 'relative', zIndex: markPickerKey && markPickerKey === markKey ? 3 : 1, cursor: markKey ? 'pointer' : 'default' }}
                          >
                            {/* 요구사항 배지(의원·시장·부시장·공약)는 모두 부기명 오른쪽 */}
                            {row.statisticsCode || ''}
                            {row.level === 'note' && (requestBadgesByRow.get(row.id) ?? []).map((badge) => (
                              <span key={badge.label} title={badge.title} style={{ display: 'inline-block', padding: '1px 6px', marginLeft: '6px', borderRadius: '4px', ...REQUEST_BADGE_STYLES[badge.tone], fontSize: 'calc(11px + 1pt)', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                {badge.label}
                              </span>
                            ))}
                            {markKey && markPickerKey === markKey && (
                              <span
                                onClick={(event) => event.stopPropagation()}
                                style={{
                                  position: 'absolute', top: '100%', left: '16px', marginTop: '2px', zIndex: 4,
                                  display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 7px',
                                  background: '#ffffff', border: '1px solid #c3ccd6', borderRadius: '7px',
                                  boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                                }}
                              >
                                {ROW_MARK_COLORS.map((mark) => (
                                  <button
                                    key={mark.color}
                                    type="button"
                                    title={mark.label}
                                    aria-label={mark.label}
                                    onClick={() => setRowMark(markKey, mark.color)}
                                    style={{
                                      width: '20px', height: '20px', padding: 0, borderRadius: '50%',
                                      background: mark.color, cursor: 'pointer',
                                      border: markColor === mark.color ? '2px solid #16283c' : '1px solid #c3ccd6',
                                    }}
                                  />
                                ))}
                                <button
                                  type="button"
                                  title="표시 지우기"
                                  aria-label="표시 지우기"
                                  onClick={() => setRowMark(markKey, '')}
                                  style={{ padding: '2px 7px', borderRadius: '5px', border: '1px solid #c3ccd6', background: '#f7f8f6', color: '#46525e', fontSize: 'calc(11px + 1pt)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  지우기
                                </button>
                              </span>
                            )}
                          </td>
                          <td style={{ background: getBackground(), fontSize: getFontSize(), color: getColor(), whiteSpace: 'pre-line', textAlign: 'right', verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '16px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            {(isNewItemNote || (markKey !== null && !!rowNotes[`${markKey}::신규`])) && (
                              <span style={{ display: 'inline-block', padding: '1px 6px', marginRight: '6px', borderRadius: '4px', background: 'rgba(214, 69, 90, 0.15)', color: '#d6455a', fontSize: 'calc(11px + 1pt)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                신규
                              </span>
                            )}
                            {pledgeKey && (
                              <button
                                type="button"
                                className={isPledge ? undefined : 'pledge-toggle-off'}
                                title={isPledge ? '공약사항 - 클릭하여 해제' : '클릭하여 공약사항으로 표시'}
                                onClick={() => saveRowAnnotation(pledgeKey, '', isPledge ? '' : '공약')}
                                style={{ display: 'inline-block', padding: '1px 6px', marginRight: '6px', borderRadius: '4px', border: 'none', background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', fontSize: 'calc(11px + 1pt)', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
                              >
                                공약
                              </button>
                            )}
                            {row.description || ''}
                          </td>
                          <td style={{ background: getBackground(), fontSize: getFontSize(), textAlign: 'center', verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                              {showProcedureButton && (
                                <button
                                  type="button"
                                  title="클릭하여 사전절차 확인 처리"
                                  onClick={() => setConfirmingBadge({ rowId: row.id, type: 'procedure', detail: itemBadges.join(', ') })}
                                  style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '4px', background: 'rgba(230, 126, 34, 0.12)', border: '1px solid rgba(230, 126, 34, 0.4)', fontSize: 'calc(11px + 1pt)', fontWeight: 600, color: '#e67e22', cursor: 'pointer' }}
                                >
                                  사전
                                </button>
                              )}
                              {showFormulaButton && (
                                <button
                                  type="button"
                                  title="클릭하여 산출식 확인 처리"
                                  onClick={() => setConfirmingBadge({ rowId: row.id, type: 'formula', detail: formulaLabel })}
                                  style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '4px', background: 'rgba(91, 155, 240, 0.12)', border: '1px solid rgba(91, 155, 240, 0.4)', fontSize: 'calc(11px + 1pt)', fontWeight: 600, color: '#5b9bf0', cursor: 'pointer' }}
                                >
                                  산출식
                                </button>
                              )}
                              {/* 부기명 줄에만 한두 단어짜리 메모를 단다. 통계목 줄의 사전/산출식
                                  배너와 같은 칸을 쓰되, 이쪽은 직접 적는 글자다. */}
                              {markKey && (editingRowNoteKey === markKey && editingRowNoteSide === 'right' ? (
                                <input
                                  autoFocus
                                  value={rowNoteDraft}
                                  onChange={(event) => setRowNoteDraft(event.target.value)}
                                  onBlur={() => setRowNote(markKey, rowNoteDraft)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') setRowNote(markKey, rowNoteDraft);
                                    if (event.key === 'Escape') { setEditingRowNoteKey(null); setRowNoteDraft(""); }
                                  }}
                                  placeholder="예: 증빙 확인"
                                  style={{ width: '92px', padding: '1px 4px', border: '1px solid #1d4ed8', borderRadius: '4px', fontSize: 'calc(12px + 1pt)', fontWeight: 700, color: '#1d4ed8', textAlign: 'center' }}
                                />
                              ) : (
                                <button
                                  type="button"
                                  title={rowNotes[markKey] ? '클릭하여 수정' : '클릭하여 메모 입력'}
                                  onClick={() => { setRowNoteDraft(rowNotes[markKey] ?? ''); setEditingRowNoteSide('right'); setEditingRowNoteKey(markKey); }}
                                  style={{
                                    padding: '1px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
                                    fontSize: 'calc(12px + 1pt)', fontWeight: 700,
                                    color: rowNotes[markKey] ? '#1d4ed8' : '#c3ccd6',
                                  }}
                                >
                                  {rowNotes[markKey] || '＋'}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                        {memoRow}
                      </Fragment>
                    );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div className="table-footer no-print" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
                <Pagination
                  page={hierarchyPage}
                  totalPages={Math.max(1, Math.ceil(filteredHierarchyRows.length / HIERARCHY_ROWS_PER_PAGE))}
                  onChange={setHierarchyPage}
                />
              </div>
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#1a1a1a', marginTop: '4px' }}>
                {filteredHierarchyRows.length === 0 ? '0' : (hierarchyPage - 1) * HIERARCHY_ROWS_PER_PAGE + 1}–{Math.min(hierarchyPage * HIERARCHY_ROWS_PER_PAGE, filteredHierarchyRows.length)} of {filteredHierarchyRows.length}
              </div>
              {(() => {
                // 숨긴 메모 줄이 있으면 항상 되돌릴 수단을 같이 보여준다.
                const hiddenHere = hiddenMemoIds.filter((id) => id.startsWith(`${department}::`));
                if (hiddenHere.length === 0) return null;
                return (
                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => unhideMemoRows(hiddenHere)}
                      style={{ border: '1px solid #b7c2cf', borderRadius: '6px', background: 'transparent', color: '#1a1a1a', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}
                    >
                      숨긴 메모 줄 {hiddenHere.length}개 다시 보기
                    </button>
                  </div>
                );
              })()}
            </div>
          </section>
          </>
          )}
        </div>

      {showStaffModal && <div className="modal-backdrop" onMouseDown={() => setShowStaffModal(false)}><div className="modal-card staff-modal-card" ref={staffModalRef} role="dialog" aria-modal="true" aria-labelledby="staff-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, staffModalRef.current)}><div className="modal-head"><div><span>DEPARTMENT PROFILE</span><h2 id="staff-modal-title">부서별 정원·현원 설정</h2></div><button className="close-button" onClick={() => setShowStaffModal(false)} aria-label="닫기"><X size={19} /></button></div><div className="modal-fields staff-modal-fields">{DEPARTMENTS.map((dept) => (<div key={dept} className="staff-dept-card"><h3>{dept}</h3><label>정원<input value={staffData[dept]?.capacity || ""} onChange={(event) => setStaffData({...staffData, [dept]: {...(staffData[dept] || {}), capacity: event.target.value}})} inputMode="numeric" />명</label><label>현원<input value={staffData[dept]?.current || ""} onChange={(event) => setStaffData({...staffData, [dept]: {...(staffData[dept] || {}), current: event.target.value}})} inputMode="numeric" />명</label></div>))}</div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setShowStaffModal(false)}>취소</AppButton><AppButton variant="primary" onClick={saveStaff}>저장</AppButton></div></div></div>}
      {showBudget2026Modal && <div className="modal-backdrop" onMouseDown={() => setShowBudget2026Modal(false)}><div className="modal-card staff-modal-card" ref={budget2026ModalRef} role="dialog" aria-modal="true" aria-labelledby="budget2026-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, budget2026ModalRef.current)}><div className="modal-head"><div><span>DEPARTMENT PROFILE</span><h2 id="budget2026-modal-title">부서별 2026 예산액 설정</h2></div><button className="close-button" onClick={() => setShowBudget2026Modal(false)} aria-label="닫기"><X size={19} /></button></div><div className="modal-fields staff-modal-fields">{DEPARTMENTS.map((dept) => (<div key={dept} className="staff-dept-card"><h3>{dept}</h3><label>본예산(천원)<input value={budget2026Data[dept]?.base2026 || ""} onChange={(event) => setBudget2026Data({...budget2026Data, [dept]: {...(budget2026Data[dept] || {}), base2026: event.target.value}})} inputMode="numeric" /></label><label>3추기준(천원)<input value={budget2026Data[dept]?.supp3 || ""} onChange={(event) => setBudget2026Data({...budget2026Data, [dept]: {...(budget2026Data[dept] || {}), supp3: event.target.value}})} inputMode="numeric" /></label></div>))}</div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setShowBudget2026Modal(false)}>취소</AppButton><AppButton variant="primary" onClick={saveBudget2026}>저장</AppButton></div></div></div>}
      {supplementaryPending && <div className="modal-backdrop" onMouseDown={() => setSupplementaryPending(null)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="supp-pending-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span>SUPPLEMENTARY BUDGET</span><h2 id="supp-pending-title">어느 부서의 몇 회 추경인가요?</h2></div><button className="close-button" onClick={() => setSupplementaryPending(null)} aria-label="닫기"><X size={19} /></button></div>
        <div style={{ padding: '4px 4px 8px', lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>{supplementaryPending.fileName}에서 세부사업 {supplementaryPending.report.programs.length}개, 통계목 {supplementaryPending.report.items.length}개를 읽었습니다. 이 파일에는 {!supplementaryPending.report.department && !supplementaryPending.report.round ? '부서와 추경 회차가' : !supplementaryPending.report.department ? '부서가' : '추경 회차가'} 적혀 있지 않아 직접 골라주세요.</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>부서
              <select value={supplementaryPending.department} onChange={(event) => setSupplementaryPending({ ...supplementaryPending, department: event.target.value })} style={{ height: '36px', padding: '0 8px', borderRadius: '6px', minWidth: '170px' }}>
                <option value="">선택</option>
                {DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>추경 회차
              <select value={supplementaryPending.round} onChange={(event) => setSupplementaryPending({ ...supplementaryPending, round: event.target.value })} style={{ height: '36px', padding: '0 8px', borderRadius: '6px', minWidth: '110px' }}>
                <option value="">선택</option>
                {[1, 2, 3, 4, 5].map((no) => <option key={no} value={String(no)}>{no}회</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <AppButton variant="ghost" onClick={() => setSupplementaryPending(null)}>취소</AppButton>
          <AppButton variant="primary" onClick={() => {
            const pending = supplementaryPending;
            if (!pending.department || !pending.round) { showToast('부서와 추경 회차를 모두 골라주세요.'); return; }
            setSupplementaryPending(null);
            commitSupplementary({ ...pending.report, department: pending.department, round: Number(pending.round) }, pending.fileName);
          }}>반영</AppButton>
        </div>
      </div></div>}
      {supplementaryResult && <div className="modal-backdrop" onMouseDown={() => setSupplementaryResult(null)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="supp-result-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span>SUPPLEMENTARY BUDGET</span><h2 id="supp-result-title">{supplementaryResult.error ? '추경 내역서를 반영하지 못했습니다' : `${supplementaryResult.department} 추경 ${supplementaryResult.round}회 반영`}</h2></div><button className="close-button" onClick={() => setSupplementaryResult(null)} aria-label="닫기"><X size={19} /></button></div>
        <div style={{ padding: '4px 4px 8px', lineHeight: 1.7 }}>
          {supplementaryResult.error ? (
            <>
              <p style={{ margin: 0, fontWeight: 700 }}>{supplementaryResult.fileName}</p>
              <p style={{ margin: '8px 0 0' }}>{supplementaryResult.error}</p>
            </>
          ) : (<>
          <p style={{ margin: 0 }}>{supplementaryResult.fileName}에서 세부사업 {supplementaryResult.programCount}개, 통계목 {supplementaryResult.itemCount}개를 읽어 저장했습니다.</p>
          {supplementaryResult.unmatched.length > 0 ? (
            <>
              <p style={{ margin: '10px 0 4px', fontWeight: 700 }}>2027 예산서에서 같은 이름을 찾지 못한 세부사업 {supplementaryResult.unmatched.length}개</p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {supplementaryResult.unmatched.map((name) => <li key={name}>{name}</li>)}
              </ul>
              <p style={{ margin: '8px 0 0', opacity: 0.75, fontSize: '13px' }}>올해 사업명이 바뀌었거나 2027 요구가 없는 사업이면 3추 열에 나타나지 않습니다.</p>
            </>
          ) : (
            <p style={{ margin: '10px 0 0' }}>모든 세부사업이 2027 예산서와 이름이 맞았습니다.</p>
          )}
          </>)}
        </div>
        <div className="modal-actions"><AppButton variant="primary" onClick={() => setSupplementaryResult(null)}>확인</AppButton></div>
      </div></div>}
      {showDeptMemoModal && <div className="modal-backdrop" onMouseDown={() => setShowDeptMemoModal(false)}><div className="modal-card dept-memo-modal-card" ref={deptMemoModalRef} role="dialog" aria-modal="true" aria-labelledby="dept-memo-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, deptMemoModalRef.current)}>
        <div className="modal-head"><div><span>DEPARTMENT MEMO</span><h2 id="dept-memo-modal-title">{department} 주요 내용 메모</h2></div><button className="close-button" onClick={() => setShowDeptMemoModal(false)} aria-label="닫기"><X size={19} /></button></div>
        <div className="dept-memo-body">
          <div className="dept-memo-list">
            {(deptMemos[department]?.memos.length ?? 0) > 0 ? [...deptMemos[department].memos].reverse().map((memo, reverseIndex) => {
              const memoIndex = deptMemos[department].memos.length - 1 - reverseIndex;
              return (
                <div key={memo.id || `${memo.date}-${memoIndex}`} className="dept-memo-item">
                  <div className="dept-memo-item-head"><span>{memo.date}</span><button type="button" onClick={() => deleteDeptMemo(memoIndex)} aria-label="메모 삭제">삭제</button></div>
                  <div className="dept-memo-item-text">{memo.text}</div>
                </div>
              );
            }) : <div className="dept-memo-empty">등록된 메모가 없습니다</div>}
          </div>
          <textarea
            className="dept-memo-textarea"
            value={deptMemoDraft}
            onChange={(event) => setDeptMemoDraft(event.target.value)}
            placeholder={`${department}의 주요 내용을 입력하세요...`}
          />
        </div>
        <div className="modal-actions"><AppButton variant="ghost" onClick={() => setShowDeptMemoModal(false)}>닫기</AppButton><AppButton variant="primary" onClick={saveDeptMemo}>메모 추가</AppButton></div>
      </div></div>}
      {editingRow && <div className="modal-backdrop" onMouseDown={() => setEditingRow(null)}><div className="modal-card edit-row-modal" ref={editModalRef} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, editModalRef.current)}><div className="modal-head"><div><span>BUDGET ITEM / EDIT</span><h2 id="edit-modal-title">예산 항목 편집</h2></div><button className="close-button" onClick={() => setEditingRow(null)} aria-label="닫기"><X size={19} /></button></div><div className="edit-grid"><label>정책<input value={editingRow.policy} onChange={(event) => setEditingRow({ ...editingRow, policy: event.target.value })} /></label><label>세부사업<input value={editingRow.program} onChange={(event) => setEditingRow({ ...editingRow, program: event.target.value })} /></label><label className="edit-wide">산출내역<input value={editingRow.detail} onChange={(event) => setEditingRow({ ...editingRow, detail: event.target.value })} /></label><label>요구액(천원)<input value={editingRow.amount} onChange={(event) => setEditingRow({ ...editingRow, amount: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>전년도(천원)<input value={editingRow.previous} onChange={(event) => setEditingRow({ ...editingRow, previous: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>시비(천원)<input value={editingRow.city} onChange={(event) => setEditingRow({ ...editingRow, city: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>국비(천원)<input value={editingRow.national} onChange={(event) => setEditingRow({ ...editingRow, national: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>도비(천원)<input value={editingRow.province} onChange={(event) => setEditingRow({ ...editingRow, province: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>기타(천원)<input value={editingRow.other} onChange={(event) => setEditingRow({ ...editingRow, other: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>상태<select value={editingRow.status} onChange={(event) => setEditingRow({ ...editingRow, status: event.target.value as Status })}><option>정상</option><option>주의</option><option>오류</option><option>사전</option></select></label><label className="edit-wide">검토 메모<input value={editingRow.note ?? ""} onChange={(event) => setEditingRow({ ...editingRow, note: event.target.value })} placeholder="검토 메모를 입력하세요" /></label></div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setEditingRow(null)}>취소</AppButton><AppButton variant="primary" onClick={saveRowEdit}>저장</AppButton></div></div></div>}

      {confirmingBadge && <div className="modal-backdrop" onMouseDown={() => setConfirmingBadge(null)}><div className="modal-card" ref={badgeConfirmModalRef} role="dialog" aria-modal="true" aria-labelledby="badge-confirm-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, badgeConfirmModalRef.current)}><div className="modal-head"><div><span>REVIEW · {confirmingBadge.type === 'procedure' ? '사전절차' : '산출식'}</span><h2 id="badge-confirm-modal-title">확인하셨습니까?</h2></div><button className="close-button" onClick={() => setConfirmingBadge(null)} aria-label="닫기"><X size={19} /></button></div>{confirmingBadge.detail && <p style={{ padding: '0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>{confirmingBadge.detail}</p>}<div className="modal-actions"><AppButton variant="ghost" onClick={() => setConfirmingBadge(null)}>취소</AppButton><AppButton variant="primary" onClick={() => confirmBadge(confirmingBadge.rowId, confirmingBadge.type)}>확인</AppButton></div></div></div>}
      {showChejeon && (() => {
        const rows = CHEJEON_ESTIMATES.filter((e) => !chejeonConf || e.conf === chejeonConf);
        const total = rows.reduce((sum, e) => sum + e.amount, 0);
        const byConf = (c: "A" | "B" | "C") =>
          CHEJEON_ESTIMATES.filter((e) => e.conf === c).reduce((s, e) => s + e.amount, 0);
        const confColor: Record<string, string> = { A: '#166534', B: '#92400e', C: '#6b7280' };
        return (
          <div className="modal-backdrop" onMouseDown={() => setShowChejeon(false)}>
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chejeon-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
              style={{
                width: 'min(1280px, 96vw)', maxWidth: 'none', maxHeight: '92vh',
                display: 'flex', flexDirection: 'column',
                background: '#f7f8f6', border: '1px solid #b7c2cf',
                color: '#1a2129', padding: '20px 0 0',
              }}
            >
              <div className="modal-head" style={{ padding: '0 24px' }}>
                <div>
                  <span style={{ color: '#4a6b8a' }}>2027 전국(장애인)체육대회</span>
                  <h2 id="chejeon-modal-title" style={{ color: '#16283c' }}>본예산 필수 소요 검토</h2>
                </div>
                <button
                  className="close-button"
                  onClick={() => setShowChejeon(false)}
                  aria-label="닫기"
                  style={{ color: '#46525e', background: 'transparent', border: '1px solid #c3ccd6' }}
                ><X size={19} /></button>
              </div>

              <div style={{ padding: '12px 24px 12px', fontSize: '13px', color: '#46525e', lineHeight: 1.6 }}>
                기본계획 Ⅲ 집행부별 세부추진계획의 사업 중 착수 시기와 계약 리드타임을 고려해 2027년 본예산에 반드시 편성되어야 하는 것만 골랐습니다.
                <strong style={{ color: '#9b2a21' }}> 부서가 제출한 산출내역이 아니라 계획서에 근거한 추정치입니다.</strong> 부서 회신으로 교체되어야 합니다. 단위: 천원
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0 24px 12px', alignItems: 'center' }}>
                {([['', '전체'], ['A', '실단가'], ['B', '유사단가'], ['C', '규모추정']] as const).map(([key, label]) => (
                  <button
                    key={key || 'all'}
                    type="button"
                    onClick={() => setChejeonConf(key as "" | "A" | "B" | "C")}
                    style={{
                      padding: '5px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                      borderRadius: '6px', border: '1px solid #b7c2cf',
                      background: chejeonConf === key ? '#1e3a5f' : '#ffffff',
                      color: chejeonConf === key ? '#ffffff' : '#1e3a5f',
                    }}
                  >
                    {label}
                    {key ? ` ${formatMillion(byConf(key as "A" | "B" | "C"))}백만` : ` ${CHEJEON_ESTIMATES.length}건`}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '15px', fontWeight: 700, color: '#1e3a5f' }}>
                  {rows.length}건 · {total.toLocaleString()}천원
                </span>
              </div>

              <div style={{ overflow: 'auto', padding: '0 24px 20px', flex: 1, background: '#f7f8f6' }}>
                <table style={{ width: '100%', minWidth: '1060px', borderCollapse: 'collapse', fontSize: '12.5px', background: '#ffffff', color: '#1a2129' }}>
                  <thead>
                    <tr style={{ background: '#1e3a5f', color: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '9px 10px', textAlign: 'left', width: '140px' }}>주관부서</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', width: '170px' }}>사업명</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left' }}>사업계획 (실행 단위)</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', width: '300px' }}>산출 근거</th>
                      <th style={{ padding: '9px 10px', textAlign: 'right', width: '95px' }}>검토액</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '76px' }}>확실도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e, i) => (
                      <tr key={`${e.dept}-${e.name}-${i}`} style={{ borderTop: '1px solid #dfe4ea', background: i % 2 ? '#fafbfa' : '#ffffff' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 600, verticalAlign: 'top', color: '#16283c' }}>{e.dept}</td>
                        <td style={{ padding: '9px 10px', fontWeight: 600, verticalAlign: 'top', color: '#1a2129' }}>{e.name}</td>
                        <td style={{ padding: '9px 10px', color: '#374151', verticalAlign: 'top' }}>{e.plan}</td>
                        <td style={{ padding: '9px 10px', color: '#6b7280', fontSize: '11.5px', verticalAlign: 'top' }}>{e.basis}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'top', color: '#16283c' }}>{e.amount.toLocaleString()}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: '11px', color: confColor[e.conf], fontWeight: 700, verticalAlign: 'top' }}>{CHEJEON_CONF_LABEL[e.conf]}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #1e3a5f', background: '#e8edf3' }}>
                      <td colSpan={4} style={{ padding: '10px', fontWeight: 800, color: '#16283c' }}>계</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', color: '#16283c' }}>{total.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>

                <div style={{ marginTop: '16px', fontSize: '11.5px', color: '#5b6672', lineHeight: 1.7 }}>
                  <p style={{ margin: '0 0 5px' }}><strong>확실도</strong> 실단가 = 경기도 편성요청 목록의 실제 단가(방역 358천원/개소·일, 구급차 1,200천원/대·일, 청소 130천원/인·일) · 유사단가 = 시중노임단가·기존 용역 단가 환산 · 규모추정 = 대회 규모(경기장 25개소·3만명·7일)로 추정</p>
                  <p style={{ margin: '0 0 5px' }}><strong>이미 편성된 것과의 관계</strong> 전국체전추진단 183.5억, 체육진흥과 축구경기장 18.0억, 관광진흥과 지질공원 홍보관 0.7억은 별도입니다. 추진단에 잡힌 항목(성화봉송 200,000·문화예술행사 90,000·자원봉사 284,000)은 해당 부서 검토액에서 차감했습니다. 추진단 &ldquo;대회 운영 지원 2,960,000&rdquo;은 내역이 없어 중복 여부가 확인되지 않았습니다.</p>
                  <p style={{ margin: 0 }}><strong>출처</strong> 2027년 전국(장애인)체육대회 기본계획(안) Ⅲ 집행부별 세부추진계획 · 2027년 전국체전 화성시 자체사업 편성 요청 목록(안)</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {showChejeonOrg && (() => {
        const totalTeams = CHEJEON_ORG.reduce((s, u) => s + u.teams.length, 0);
        return (
          <div className="modal-backdrop" onMouseDown={() => setShowChejeonOrg(false)}>
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chejeon-org-title"
              onMouseDown={(event) => event.stopPropagation()}
              style={{
                width: 'min(1280px, 96vw)', maxWidth: 'none', maxHeight: '92vh',
                display: 'flex', flexDirection: 'column',
                background: '#f7f8f6', border: '1px solid #b7c2cf',
                color: '#1a2129', padding: '20px 0 0',
              }}
            >
              <div className="modal-head" style={{ padding: '0 24px' }}>
                <div>
                  <span style={{ color: '#4a6b8a' }}>2027 전국(장애인)체육대회</span>
                  <h2 id="chejeon-org-title" style={{ color: '#16283c' }}>대회준비 추진체계 · 본부 조직도</h2>
                </div>
                <button
                  className="close-button"
                  onClick={() => setShowChejeonOrg(false)}
                  aria-label="닫기"
                  style={{ color: '#46525e', background: 'transparent', border: '1px solid #c3ccd6' }}
                ><X size={19} /></button>
              </div>

              <div style={{ overflow: 'auto', padding: '14px 24px 20px', flex: 1, background: '#f7f8f6' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16283c', marginBottom: '6px' }}>
                  집행부 {CHEJEON_ORG.length}개 · 팀 {totalTeams}개 <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '11.5px' }}>(행을 누르면 담당업무가 펼쳐집니다)</span>
                </div>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '12.5px', background: '#ffffff', color: '#1a2129' }}>
                  <thead>
                    <tr style={{ background: '#1e3a5f', color: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '56px', whiteSpace: 'nowrap' }}>연번</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>집행부</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>소관 실·국·기관</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', width: '100%' }}>소속 팀</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '56px', whiteSpace: 'nowrap' }}>팀수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHEJEON_ORG.map((u, i) => (
                      <Fragment key={u.no}>
                        <tr
                          onClick={() => setChejeonOrgOpen(chejeonOrgOpen === u.no ? null : u.no)}
                          style={{
                            borderTop: '1px solid #dfe4ea', cursor: 'pointer',
                            background: chejeonOrgOpen === u.no ? '#eef3f9' : (i % 2 ? '#fafbfa' : '#ffffff'),
                          }}
                        >
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: '#6b7280', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{u.no}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 700, color: '#16283c', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{u.name}</td>
                          <td style={{ padding: '9px 10px', color: '#374151', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{u.owner}</td>
                          <td style={{ padding: '9px 10px', color: '#374151', verticalAlign: 'middle' }}>{u.teams.join(' · ')}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#16283c', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{u.teams.length}</td>
                        </tr>
                        {chejeonOrgOpen === u.no && (
                          <tr style={{ background: '#f4f8fc' }}>
                            <td />
                            <td colSpan={4} style={{ padding: '4px 10px 12px', color: '#374151', fontSize: '12px', lineHeight: 1.8 }}>
                              <strong style={{ color: '#1e3a5f' }}>담당업무</strong> {u.duties.join(' · ')}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '16px', fontSize: '11.5px', color: '#5b6672', lineHeight: 1.7 }}>
                  <p style={{ margin: '0 0 5px' }}><strong>운영</strong> 평시에는 전국체전추진단이 준비를 총괄하고, 대회 6개월 전부터 교육체육국장을 실장으로 하는 「종합상황실」 체제로 전환해 18개 집행부를 지휘합니다.</p>
                  <p style={{ margin: 0 }}><strong>출처</strong> 2027년 전국(장애인)체육대회 기본계획(안) Ⅰ-6 대회준비 추진체계 구축 · Ⅲ 집행부별 세부추진계획</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </Layout>
  );
}
