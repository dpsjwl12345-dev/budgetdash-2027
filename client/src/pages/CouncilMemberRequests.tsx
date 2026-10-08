import { useState, useEffect } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

type RequestStatus = "검토중" | "반영" | "미반영";
// 요구가 들어온 경로. 탭을 가르는 기준이며, 소속 정당명과는 별개다.
// "시장"·"부시장"은 원래 별도 메뉴(요구사항 반영)였는데, 같은 화면으로 합쳐졌다.
type RequestType = "당정협의회" | "정책간담회" | "시의원" | "특별조정교부금" | "시장" | "부시장" | "민선9기공약";

// 시장·부시장·민선9기공약 탭은 선거구/소속정당명/위원회 칸이 없다(시의원이 아니므로).
const isMayorType = (type: RequestType) => type === "시장" || type === "부시장" || type === "민선9기공약";

type CouncilRequest = {
  id: string;
  requestType: RequestType;
  electoralDistrict: string;
  partyName: string;
  memberName: string;
  committee: string;
  department: string;
  content: string;
  budgetItemName: string;
  requestedAmount: string;
  status: RequestStatus;
  requestedDate: string;
  // 민선9기공약 탭 전용 부가정보(사업주체·신규여부·연도별 예산계획)를 JSON으로 담는다.
  // 테이블 스키마를 바꾸지 않고 이 탭만 다른 항목을 쓰기 위한 용도.
  note?: string;
};

const STATUS_OPTIONS: RequestStatus[] = ["검토중", "반영", "미반영"];
const REQUEST_TYPE_OPTIONS: RequestType[] = ["당정협의회", "정책간담회", "시의원", "특별조정교부금", "시장", "부시장", "민선9기공약"];

const todayString = () =>
  new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

// 민선9기공약 전용 부가정보: 사업주체·신규여부·연도별 예산계획(단위 자유, 예: 백만원/억원).
type PledgeExtra = {
  subject: string;
  isNew: string;
  total: string;
  prior: string;
  y2026: string;
  y2027: string;
  y2028: string;
  y2029: string;
  y2030: string;
  postTerm: string;
};

const emptyPledgeExtra = (): PledgeExtra => ({
  subject: "",
  isNew: "",
  total: "",
  prior: "",
  y2026: "",
  y2027: "",
  y2028: "",
  y2029: "",
  y2030: "",
  postTerm: "",
});

const parsePledgeExtra = (note?: string): PledgeExtra => {
  if (!note) return emptyPledgeExtra();
  try {
    return { ...emptyPledgeExtra(), ...JSON.parse(note) };
  } catch {
    return emptyPledgeExtra();
  }
};

const serializePledgeExtra = (pledge: PledgeExtra): string => JSON.stringify(pledge);

const PLEDGE_SUBJECT_OPTIONS = ["국가", "도", "자체", "민간"];
const PLEDGE_NEW_OPTIONS = ["신규", "계속"];
const PLEDGE_YEAR_FIELDS: { key: keyof PledgeExtra; label: string }[] = [
  { key: "total", label: "총계" },
  { key: "prior", label: "기투자액" },
  { key: "y2026", label: "2026" },
  { key: "y2027", label: "2027" },
  { key: "y2028", label: "2028" },
  { key: "y2029", label: "2029" },
  { key: "y2030", label: "2030" },
  { key: "postTerm", label: "임기후" },
];
// 총계는 입력받지 않고 기투자액~임기후 합계로 자동 계산한다.
const PLEDGE_INPUT_YEAR_FIELDS = PLEDGE_YEAR_FIELDS.filter((field) => field.key !== "total");

const parsePledgeAmount = (value: string): number => {
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

const calcPledgeTotal = (pledge: PledgeExtra): number =>
  PLEDGE_INPUT_YEAR_FIELDS.reduce((sum, field) => sum + parsePledgeAmount(pledge[field.key]), 0);

// 요구액은 천원 단위(표 위에 "단위: 천원" 표시)라 숫자만 적고, 줄마다 천 단위 쉼표를 붙인다
// (예: 6000 → 6,000). 예전에 붙여 저장한 "천원"은 떼고, "6억"처럼 다른 단위를 적었으면 그대로 둔다.
const normalizeAmountLine = (line: string): string => {
  const value = line.trim().replace(/\s*천원$/, "");
  if (!value || !/^[\d,\s]+$/.test(value)) return value;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : value;
};
const normalizeRequestedAmount = (raw: string): string =>
  raw.split("\n").map(normalizeAmountLine).join("\n").trim();

// 표에는 백만원 단위로 보여준다. 입력·저장은 천원 그대로 두고, 숫자만 있는 줄을 1,000으로 나눠 반올림한다.
const displayAmountInMillions = (raw: string): string =>
  normalizeRequestedAmount(raw)
    .split("\n")
    .map((line) => {
      if (!/^[\d,]+$/.test(line)) return line;
      const thousands = Number(line.replace(/,/g, ""));
      return (thousands / 1000).toLocaleString("ko-KR", { maximumFractionDigits: thousands < 1000 ? 1 : 0 });
    })
    .join("\n");

const emptyForm = (requestType: RequestType = "당정협의회") => ({
  requestType,
  electoralDistrict: "",
  partyName: "",
  memberName: "",
  committee: "",
  department: (DEPARTMENTS[0] || "") as string,
  content: "",
  budgetItemName: "",
  requestedAmount: "",
  status: "검토중" as RequestStatus,
  requestedDate: todayString(),
  pledge: emptyPledgeExtra(),
});

type EditDraft = Omit<CouncilRequest, "id" | "status" | "note"> & { pledge: PledgeExtra };

const draftFromItem = (item: CouncilRequest): EditDraft => ({
  requestType: item.requestType,
  electoralDistrict: item.electoralDistrict ?? "",
  partyName: item.partyName,
  memberName: item.memberName,
  committee: item.committee ?? "",
  department: item.department,
  content: item.content,
  budgetItemName: item.budgetItemName,
  requestedAmount: item.requestedAmount,
  requestedDate: item.requestedDate,
  pledge: parsePledgeExtra(item.note),
});

// ── 원구성 현황 (제10대 화성시의회 전반기, 26. 7. 3. 기준) ──────────────────
type MainTabKey = RequestType | "원구성 현황";

const MAIN_TABS: { key: MainTabKey; label: string; subtitle?: string; emptyText?: string; color?: string }[] = [
  { key: "시장", label: "시장님 지시사항", emptyText: "등록된 시장님 지시사항이 없습니다", color: "#b98cf0" },
  { key: "민선9기공약", label: "민선9기 공약사항", emptyText: "등록된 민선9기 공약사항이 없습니다", color: "#f2905e" },
  { key: "부시장", label: "부시장님 요구사항", emptyText: "등록된 부시장님 요구사항이 없습니다", color: "#52c4d9" },
  { key: "당정협의회", label: "당정협의회", subtitle: "정당 요구사업\n정책기획관 주관", emptyText: "등록된 당정협의회 요구가 없습니다", color: "#5b9bf0" },
  { key: "정책간담회", label: "정책간담회", subtitle: "당과 무관한 시의원 요구사업\n소통협치실을 통한 요구", emptyText: "등록된 정책간담회 요구가 없습니다", color: "#7ee787" },
  { key: "시의원", label: "시의원 요구사항", emptyText: "등록된 시의원 요구사항이 없습니다" },
  { key: "특별조정교부금", label: "특별조정교부금", subtitle: "도 관할 시의 지역개발사업 등\n시책 추진을 위한 재원", emptyText: "등록된 특별조정교부금 요구가 없습니다", color: "#d9ad52" },
  { key: "원구성 현황", label: "원구성 현황" },
];

const FILLED_TAB_KEYS: MainTabKey[] = ["시장", "민선9기공약", "당정협의회"];

// hex(#rrggbb 또는 #rgb) 문자열을 rgba()로 변환한다. 탭 테두리/배경에 투명도를 줄 때 사용.
function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type CompositionTabKey = "위원회별 의원 현황" | "상임위원회별 소관부서 현황" | "지역구별 시의원현황" | "지역구별 도의원현황" | "국회의원 현황";

const COMPOSITION_TABS: { key: CompositionTabKey; label: string }[] = [
  { key: "위원회별 의원 현황", label: "위원회별 의원 현황" },
  { key: "상임위원회별 소관부서 현황", label: "상임위원회별 소관부서 현황" },
  { key: "지역구별 시의원현황", label: "지역구별 시의원현황" },
  { key: "지역구별 도의원현황", label: "지역구별 도의원현황" },
  { key: "국회의원 현황", label: "국회의원 현황" },
];

type NationalAssemblyDistrict = {
  district: string;
  areaLabel: string;
  jurisdiction: string;
  memberName: string;
};

const NATIONAL_ASSEMBLY_DISTRICTS: NationalAssemblyDistrict[] = [
  {
    district: "화성시 갑",
    areaLabel: "서·남부권 (원도심 및 도농복합)",
    jurisdiction: "우정읍, 향남읍, 남양읍, 매송면, 비봉면, 마도면, 송산면, 서신면, 팔탄면, 장안면, 양감면, 정남면, 새솔동",
    memberName: "송옥주",
  },
  {
    district: "화성시 을",
    areaLabel: "동탄2신도시 (중·남부)",
    jurisdiction: "동탄4동, 동탄6동, 동탄7동, 동탄8동, 동탄9동",
    memberName: "이준석",
  },
  {
    district: "화성시 병",
    areaLabel: "중부권 (봉담·병점 일대)",
    jurisdiction: "봉담읍, 진안동, 병점1동, 병점2동, 기배동, 화산동",
    memberName: "권칠승",
  },
  {
    district: "화성시 정",
    areaLabel: "반월동 및 동탄1·2신도시(북부)",
    jurisdiction: "반월동, 동탄1동, 동탄2동, 동탄3동, 동탄5동",
    memberName: "전용기",
  },
];

type CommitteeMember = { name: string };

type CommitteeKey = "의회운영" | "기획행정" | "경제환경" | "문화체육" | "도시건설" | "보건복지" | "윤리특별";

const COMMITTEE_KEYS: CommitteeKey[] = ["의회운영", "기획행정", "경제환경", "문화체육", "도시건설", "보건복지", "윤리특별"];

type CommitteeRoster = { chair: CommitteeMember; viceChair: CommitteeMember; members: CommitteeMember[] };

const COMMITTEE_ROSTERS: Record<CommitteeKey, CommitteeRoster> = {
  의회운영: {
    chair: { name: "정순영" },
    viceChair: { name: "장동희" },
    members: [
      { name: "고병태" },
      { name: "김기현" },
      { name: "오문섭" },
      { name: "유상희" },
      { name: "이민희" },
    ],
  },
  기획행정: {
    chair: { name: "배현경" },
    viceChair: { name: "정명희" },
    members: [
      { name: "박진섭" },
      { name: "박진희" },
      { name: "유상희" },
      { name: "조정옥" },
    ],
  },
  경제환경: {
    chair: { name: "김상수" },
    viceChair: { name: "이은진" },
    members: [
      { name: "고병태" },
      { name: "김정주" },
      { name: "김창겸" },
      { name: "이민희" },
    ],
  },
  문화체육: {
    chair: { name: "김미영" },
    viceChair: { name: "장철규" },
    members: [
      { name: "신동희" },
      { name: "유지혜" },
      { name: "이남근" },
      { name: "장동희" },
    ],
  },
  도시건설: {
    chair: { name: "김상균" },
    viceChair: { name: "최청환" },
    members: [
      { name: "송현미" },
      { name: "오문섭" },
      { name: "정순영" },
      { name: "최태양" },
    ],
  },
  보건복지: {
    chair: { name: "최은희" },
    viceChair: { name: "권영학" },
    members: [
      { name: "김기현" },
      { name: "신미정" },
      { name: "위영란" },
      { name: "임채덕" },
    ],
  },
  윤리특별: {
    chair: { name: "신동희" },
    viceChair: { name: "박진희" },
    members: [
      { name: "박진섭" },
      { name: "송현미" },
      { name: "최태양" },
    ],
  },
};

const COMMITTEE_MEMBER_ROW_COUNT = Math.max(
  ...COMMITTEE_KEYS.map((key) => COMMITTEE_ROSTERS[key].members.length)
);

type DepartmentGroup = { committee: string; count: number; departments: string[] };

const DEPARTMENT_JURISDICTION: DepartmentGroup[] = [
  {
    committee: "기획행정",
    count: 36,
    departments: [
      "공보실(2과)",
      "감사관",
      "기획조정실(5과)",
      "자치행정국(6과)",
      "재정국(5과)",
      "AI스마트전략실",
      "대외협력사무소",
      "만세구(자치행정과, 민원토지과, 세무1·2과, 현장민원실)",
      "효행구(자치행정과, 민원토지과, 세무과)",
      "병점구(자치행정과, 민원토지과, 세무과)",
      "동탄구(자치행정과, 민원여권과, 세무과)",
      "화성시연구원",
    ],
  },
  {
    committee: "경제환경",
    count: 30,
    departments: [
      "농정해양국(5과)",
      "기업투자실(5과)",
      "기후환경에너지국(5과)",
      "농업기술센터(3과)",
      "맑은물사업소(3과)",
      "만세구(경제교통과, 환경관리과)",
      "효행구(경제환경과)",
      "병점구(경제환경과)",
      "동탄구(경제교통과, 도시환경과)",
      "화성시푸드통합지원센터",
      "화성산업진흥원",
      "화성시환경재단",
    ],
  },
  {
    committee: "문화체육",
    count: 17,
    departments: [
      "문화관광국(4과)",
      "교육체육국(5과)",
      "공원녹지사업소(5과)",
      "화성시문화관광재단",
      "화성시인재육성재단",
      "화성FC",
    ],
  },
  {
    committee: "도시건설",
    count: 30,
    departments: [
      "트램건설추진단",
      "안전건설실(4과)",
      "교통국(5과)",
      "도시정책실(5과)",
      "주택국(4과)",
      "만세구(안전건설과, 도시건축과, 허가민원1·2과)",
      "효행구(안전건설과, 도시건축과)",
      "병점구(안전건설과, 도시건축과)",
      "동탄구(안전건설과, 도시건축과)",
      "화성도시공사",
    ],
  },
  {
    committee: "보건복지",
    count: 26,
    departments: [
      "돌봄복지국(5과)",
      "성평등가족국(5과)",
      "기본사회담당관",
      "만세구보건소(2과)",
      "효행구보건소(2과)",
      "병점구보건소(2과)",
      "동탄구보건소(2과)",
      "만세구(돌봄복지과)",
      "효행구(돌봄복지과)",
      "병점구(돌봄복지과)",
      "동탄구(돌봄복지과, 가정보육과)",
      "화성시복지재단",
      "여성가족청소년재단",
    ],
  },
];

type Party = "더불어민주당" | "국민의힘" | "개혁신당";

type DistrictMember = { district: string; area: string; name: string; committee: string; party: Party };

const DISTRICT_MEMBERS: DistrictMember[] = [
  { district: "가선거구", area: "향남, 양감, 정남", name: "이계철", committee: "의장", party: "더불어민주당" },
  { district: "가선거구", area: "향남, 양감, 정남", name: "최은희", committee: "보건복지", party: "더불어민주당" },
  { district: "가선거구", area: "향남, 양감, 정남", name: "최청환", committee: "도시건설", party: "국민의힘" },
  { district: "나선거구", area: "우정, 팔탄, 장안, 매송, 비봉", name: "김정주", committee: "경제환경", party: "국민의힘" },
  { district: "나선거구", area: "우정, 팔탄, 장안, 매송, 비봉", name: "송현미", committee: "도시건설", party: "더불어민주당" },
  { district: "다선거구", area: "동탄1, 동탄2, 동탄5", name: "박진희", committee: "기획행정", party: "국민의힘" },
  { district: "다선거구", area: "동탄1, 동탄2, 동탄5", name: "이은진", committee: "경제환경", party: "더불어민주당" },
  { district: "다선거구", area: "동탄1, 동탄2, 동탄5", name: "정순영", committee: "운영위·도시건설", party: "더불어민주당" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "김기현", committee: "운영위·보건복지", party: "개혁신당" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "고병태", committee: "운영위·경제환경", party: "더불어민주당" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "장동희", committee: "운영위·문화체육", party: "국민의힘" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "조정옥", committee: "기획행정", party: "더불어민주당" },
  { district: "마선거구", area: "동탄7, 동탄9", name: "김상균", committee: "도시건설", party: "더불어민주당" },
  { district: "마선거구", area: "동탄7, 동탄9", name: "김상수", committee: "경제환경", party: "국민의힘" },
  { district: "마선거구", area: "동탄7, 동탄9", name: "유지혜", committee: "문화체육", party: "더불어민주당" },
  { district: "바선거구", area: "봉담, 기배", name: "김미영", committee: "문화체육", party: "국민의힘" },
  { district: "바선거구", area: "봉담, 기배", name: "배현경", committee: "기획행정", party: "더불어민주당" },
  { district: "바선거구", area: "봉담, 기배", name: "박진섭", committee: "기획행정", party: "국민의힘" },
  { district: "바선거구", area: "봉담, 기배", name: "위영란", committee: "보건복지", party: "더불어민주당" },
  { district: "바선거구", area: "봉담, 기배", name: "최태양", committee: "도시건설", party: "더불어민주당" },
  { district: "사선거구", area: "진안, 병점1·2, 화산동", name: "김창겸", committee: "경제환경", party: "더불어민주당" },
  { district: "사선거구", area: "진안, 병점1·2, 화산동", name: "임채덕", committee: "보건복지", party: "국민의힘" },
  { district: "사선거구", area: "진안, 병점1·2, 화산동", name: "장철규", committee: "문화체육", party: "더불어민주당" },
  { district: "아선거구", area: "반월, 동탄3", name: "신동희", committee: "문화체육", party: "더불어민주당" },
  { district: "아선거구", area: "반월, 동탄3", name: "오문섭", committee: "운영위·도시건설", party: "국민의힘" },
  { district: "자선거구", area: "남양읍, 마도면, 송산면, 서신면, 새솔동", name: "권영학", committee: "보건복지", party: "국민의힘" },
  { district: "자선거구", area: "남양읍, 마도면, 송산면, 서신면, 새솔동", name: "이남근", committee: "문화체육", party: "더불어민주당" },
  { district: "자선거구", area: "남양읍, 마도면, 송산면, 서신면, 새솔동", name: "이민희", committee: "운영위·경제환경", party: "더불어민주당" },
  { district: "비례대표", area: "", name: "신미정", committee: "보건복지", party: "더불어민주당" },
  { district: "비례대표", area: "", name: "유상희", committee: "운영위·기획행정", party: "더불어민주당" },
  { district: "비례대표", area: "", name: "정명희", committee: "기획행정", party: "국민의힘" },
];

function districtDisplayLabel(district: string): string {
  return district;
}

// 시의원 선거구별 관할 도의원과 소속 정당(경기도의회 홈페이지 현역의원 명단 기준,
// 2026.9. 확인 - 화성시 도의원 9명 전원 더불어민주당). 마지막(비례대표)은 도의원 선거구가
// 따로 없어 공란.
const PROVINCIAL_MEMBER_BY_DISTRICT: Record<string, { name: string; party: Party } | null> = {
  가선거구: { name: "이홍근", party: "더불어민주당" },
  나선거구: { name: "오현정", party: "더불어민주당" },
  다선거구: { name: "김영훈", party: "더불어민주당" },
  라선거구: { name: "신미숙", party: "더불어민주당" },
  마선거구: { name: "김태형", party: "더불어민주당" },
  바선거구: { name: "김회철", party: "더불어민주당" },
  사선거구: { name: "이진형", party: "더불어민주당" },
  아선거구: { name: "김영수", party: "더불어민주당" },
  자선거구: { name: "오진택", party: "더불어민주당" },
  비례대표: null,
};

// 도의원 선거구는 시의원 선거구(가~자)와 관할 구역이 달라 따로 표기(제1~9선거구, 경기도의회 기준).
const PROVINCIAL_DISTRICT_INFO: Record<string, { label: string; area: string }> = {
  가선거구: { label: "제1선거구", area: "향남읍, 양감면, 정남면" },
  나선거구: { label: "제2선거구", area: "우정읍, 팔탄면, 장안면, 매송면, 비봉면" },
  다선거구: { label: "제3선거구", area: "동탄1동, 동탄2동, 동탄5동" },
  라선거구: { label: "제4선거구", area: "동탄4동, 동탄6동, 동탄8동" },
  마선거구: { label: "제5선거구", area: "동탄7동, 동탄9동" },
  바선거구: { label: "제6선거구", area: "봉담읍, 기배동" },
  사선거구: { label: "제7선거구", area: "진안동, 병점1동, 병점2동, 화산동" },
  아선거구: { label: "제8선거구", area: "반월동, 동탄3동" },
  자선거구: { label: "제9선거구", area: "마도면, 송산면, 서신면, 새솔동" },
};

// 시의원 선거구(가~자)가 속한 국회의원 지역구(화성시 갑·을·병·정). 각 선거구 관할 읍면동이
// 국회의원 현황(NATIONAL_ASSEMBLY_DISTRICTS)의 관할구역 안에 통째로 들어가므로 1:1로 정해진다.
// 도의원 선거구도 시의원 선거구와 같은 구역 단위라 같은 표를 쓴다.
const NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT: Record<string, string> = {
  가선거구: "갑",
  나선거구: "갑",
  다선거구: "정",
  라선거구: "을",
  마선거구: "을",
  바선거구: "병",
  사선거구: "병",
  아선거구: "정",
  자선거구: "갑",
};

// 요구사항 표에 보이는 선거구 문구. 예전에 "가선거구"만 저장된 건도 지역구(갑~정)를 붙여 보여준다.
function electoralDistrictLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /\((갑|을|병|정)\)$/.test(trimmed)) return trimmed;
  const national = NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT[trimmed];
  return national ? `${trimmed}(${national})` : trimmed;
}


// 당정협의회 선거구는 "화성갑"처럼 적혀 있어도 "갑"만 남긴다. "가선거구" 같은 시의원 선거구는 그대로 둔다.
function stripCityName(value: string): string {
  return value.trim().replace(/^화성시?\s*/, "");
}

// 소속 정당명 칸. 정당명에만 정당 색을 입히고, 선거구가 갑~정 하나뿐이면 "더불어민주당(갑)"처럼 한 줄로,
// 그 밖엔 정당명 아래 (선거구)로 보여준다.
function renderPartyWithDistrict(partyName: string, district: string) {
  const national = stripCityName(district);
  const coloredParty = partyName ? (
    <span style={{ color: partyColor(partyName as Party), fontWeight: 600 }}>{partyName}</span>
  ) : null;
  if (/^(갑|을|병|정)$/.test(national)) {
    return (
      <>
        {coloredParty}({national})
      </>
    );
  }
  return (
    <>
      {coloredParty}
      {district && <><br />({electoralDistrictLabel(district)})</>}
    </>
  );
}

function partyColor(party: Party): string {
  if (party === "더불어민주당") return "#5b9bf0";
  if (party === "국민의힘") return "#ff6b7d";
  return "#d9ad52";
}

// 같은 선거구가 연속으로 이어지는 첫 행에서만 몇 줄을 합칠지(rowSpan) 계산한다.
function groupDistrictRowSpans(rows: { district: string }[]): (number | null)[] {
  const spans: (number | null)[] = new Array(rows.length).fill(null);
  let groupStart = 0;
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i].district !== rows[groupStart].district) {
      spans[groupStart] = i - groupStart;
      groupStart = i;
    }
  }
  return spans;
}

const districtRowSpans = groupDistrictRowSpans(DISTRICT_MEMBERS);
const districtAreaByGroup = DISTRICT_MEMBERS.reduce<Record<string, string>>((acc, row) => {
  if (!(row.district in acc)) acc[row.district] = row.area;
  return acc;
}, {});

// 이름만 넣으면 원구성 현황 명부(시의원·도의원)에서 선거구·소속정당·위원회를 끌어다 채운다.
// 선거구 칸에는 국회의원 지역구까지 붙인다(예: 가선거구(갑), 도의원 제1선거구(갑)).
type RosterEntry = { district: string; party: Party; committee: string; label: string };

const MEMBER_BY_NAME: Record<string, RosterEntry> = {};
DISTRICT_MEMBERS.forEach((row) => {
  if (row.name in MEMBER_BY_NAME) return;
  const district = electoralDistrictLabel(row.district);
  MEMBER_BY_NAME[row.name] = { district, party: row.party, committee: row.committee, label: `시의원 · ${district}` };
});
Object.entries(PROVINCIAL_MEMBER_BY_DISTRICT).forEach(([councilDistrict, member]) => {
  if (!member || member.name in MEMBER_BY_NAME) return;
  const provincialLabel = PROVINCIAL_DISTRICT_INFO[councilDistrict]?.label ?? councilDistrict;
  const national = NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT[councilDistrict];
  const district = `도의원 ${provincialLabel}${national ? `(${national})` : ""}`;
  MEMBER_BY_NAME[member.name] = { district, party: member.party, committee: "경기도의원", label: district };
});

const MEMBER_NAMES = Object.keys(MEMBER_BY_NAME);
const MEMBER_NAME_DATALIST_ID = "council-member-names";

type RosterFields = {
  memberName: string;
  electoralDistrict: string;
  partyName: string;
  committee: string;
};

// 명부에 없는 이름(당직자 등)은 이름만 바꾸고 나머지 칸은 손대지 않는다.
const fillFromRoster = <T extends RosterFields>(base: T, name: string): T => {
  const hit = MEMBER_BY_NAME[name.trim()];
  if (!hit) return { ...base, memberName: name };
  return {
    ...base,
    memberName: name,
    electoralDistrict: hit.district,
    partyName: hit.party,
    committee: hit.committee,
  };
};

// 예전에 "요구사항 반영"이라는 별도 메뉴로 저장되던 시장·부시장 요구사항 데이터.
// 이 화면에 탭으로 합쳐졌으니, 처음 한 번만 여기 데이터 형태로 옮겨온다.
type LegacyMayorRequest = {
  id: string;
  requesterType: "시장" | "부시장";
  memberName: string;
  department: string;
  content: string;
  budgetItemName: string;
  requestedAmount: string;
  status: RequestStatus;
  requestedDate: string;
};

const MAYOR_MIGRATION_FLAG = "mayorRequestsMergedIntoCouncil";

const legacyMayorToCouncil = (item: LegacyMayorRequest): CouncilRequest => ({
  id: item.id,
  requestType: item.requesterType,
  electoralDistrict: "",
  partyName: "",
  memberName: item.memberName,
  committee: "",
  department: item.department,
  content: item.content,
  budgetItemName: item.budgetItemName,
  requestedAmount: item.requestedAmount,
  status: item.status,
  requestedDate: item.requestedDate,
});

async function loadLegacyMayorRequests(): Promise<LegacyMayorRequest[]> {
  try {
    const response = await fetch("/api/cloud-sync?type=mayor-requests");
    if (response.ok) {
      const { data } = await response.json();
      if (Array.isArray(data)) return data;
    }
  } catch (error) {
    console.warn("이전 시장·부시장 요구사항 서버 로드 실패:", error);
  }
  const saved = localStorage.getItem("mayorViceMayorRequests");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("이전 시장·부시장 요구사항 로컬 데이터 로드 실패:", error);
    }
  }
  return [];
}

// 요구사항 표 열 너비. 머리글 오른쪽 끝을 끌어 바꾸고, 표 모양(시의원 칸 유무)별로 브라우저에 기억한다.
const COLUMN_WIDTHS_STORAGE_KEY = "councilRequests.columnWidths";

function loadColumnWidths(): Record<string, Record<string, number>> {
  try {
    return JSON.parse(localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

// 머리글 필터가 각 열에서 비교하는 값. 여기 없는 열(번호·요구액·관리)은 필터가 없다.
const FILTER_ACCESSORS: Record<string, (item: CouncilRequest) => string> = {
  member: (item) => item.memberName || "",
  party: (item) => item.partyName || "",
  content: (item) => item.content || "",
  dept: (item) => item.department || "",
  budget: (item) => item.budgetItemName || "",
  status: (item) => item.status || "",
};
const TEXT_FILTER_KEYS = ["content", "budget"];

export default function CouncilMemberRequests() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, Record<string, number>>>(loadColumnWidths);

  const saveColumnWidths = (next: Record<string, Record<string, number>>) => {
    setColumnWidths(next);
    try {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장이 막힌 브라우저에서는 이번 화면에서만 적용된다.
    }
  };

  // 끌기 시작할 때 모든 열의 실제 폭을 %로 고정한 뒤, 잡은 열과 바로 오른쪽 열만 서로 주고받는다.
  const startColumnResize = (event: ReactMouseEvent, layoutKey: string, keys: string[], index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const headerRow = (event.currentTarget as HTMLElement).closest("tr");
    const table = headerRow?.closest("table");
    if (!headerRow || !table) return;
    const tableWidth = table.getBoundingClientRect().width;
    const cells = Array.from(headerRow.children) as HTMLElement[];
    const start: Record<string, number> = {};
    keys.forEach((key, i) => {
      start[key] = (cells[i].getBoundingClientRect().width / tableWidth) * 100;
    });
    const leftKey = keys[index];
    const rightKey = keys[index + 1];
    const pairTotal = start[leftKey] + start[rightKey];
    const minPct = (40 / tableWidth) * 100;
    const startX = event.clientX;
    let latest = start;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaPct = ((moveEvent.clientX - startX) / tableWidth) * 100;
      const left = Math.min(Math.max(start[leftKey] + deltaPct, minPct), pairTotal - minPct);
      latest = { ...start, [leftKey]: left, [rightKey]: pairTotal - left };
      setColumnWidths((prev) => ({ ...prev, [layoutKey]: latest }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      saveColumnWidths({ ...loadColumnWidths(), [layoutKey]: latest });
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const resetColumnWidths = (layoutKey: string) => {
    const next = { ...loadColumnWidths() };
    delete next[layoutKey];
    saveColumnWidths(next);
  };

  const [requests, setRequests] = useState<CouncilRequest[]>([]);
  const [activeTab, setActiveTab] = useState<MainTabKey>("당정협의회");
  const [compositionTab, setCompositionTab] = useState<CompositionTabKey>(COMPOSITION_TABS[0].key);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // 서버 데이터를 우선 로드하고, 서버를 사용할 수 없는 경우 localStorage를 사용한다.
  useEffect(() => {
    const loadRequests = async () => {
      let loaded: CouncilRequest[] = [];
      try {
        const response = await fetch("/api/cloud-sync?type=council-requests");
        if (!response.ok) throw new Error("서버 로드 실패");
        const { data } = await response.json();
        if (Array.isArray(data)) loaded = data;
      } catch (error) {
        console.warn("서버에서 시의원 요구사항 로드 실패:", error);
        const saved = localStorage.getItem("councilMemberRequests");
        if (saved) {
          try {
            loaded = JSON.parse(saved);
          } catch (parseError) {
            console.error("시의원 요구사항 로컬 데이터 로드 실패:", parseError);
          }
        }
      }

      // 예전 "요구사항 반영" 메뉴(시장·부시장)의 데이터를 이 화면으로 한 번만 옮겨온다.
      if (!localStorage.getItem(MAYOR_MIGRATION_FLAG)) {
        const legacy = await loadLegacyMayorRequests();
        if (legacy.length > 0) {
          const migrated = legacy.map(legacyMayorToCouncil);
          const existingIds = new Set(loaded.map((item) => item.id));
          const toAdd = migrated.filter((item) => !existingIds.has(item.id));
          loaded = [...loaded, ...toAdd];
          await Promise.all(toAdd.map((item) => persist(item)));
        }
        localStorage.setItem(MAYOR_MIGRATION_FLAG, "1");
      }

      setRequests(loaded);
      localStorage.setItem("councilMemberRequests", JSON.stringify(loaded));
    };
    loadRequests();
  }, []);

  const persist = async (updatedItem: CouncilRequest) => {
    try {
      const response = await fetch("/api/cloud-sync?type=council-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedItem }),
      });
      if (!response.ok) throw new Error("서버 저장 실패");
    } catch (error) {
      console.warn("시의원 요구사항 서버 저장 실패:", error);
    }
  };

  const handleAdd = async () => {
    // 민선9기공약 탭은 이름 대신 공약명이 필수 항목이다(이름 칸을 쓰지 않으므로).
    const isPledge = form.requestType === "민선9기공약";
    const memberName = isPledge ? form.budgetItemName.trim() : form.memberName.trim();
    if (!memberName || !form.content.trim()) return;

    const pledgeToSave = { ...form.pledge, total: String(calcPledgeTotal(form.pledge)) };

    const newItem: CouncilRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestType: form.requestType,
      electoralDistrict: stripCityName(form.electoralDistrict),
      partyName: form.partyName.trim(),
      memberName,
      committee: form.committee.trim(),
      department: form.department,
      content: form.content.trim(),
      budgetItemName: form.budgetItemName.trim(),
      requestedAmount: normalizeRequestedAmount(form.requestedAmount),
      status: form.status,
      requestedDate: form.requestedDate,
      note: isPledge ? serializePledgeExtra(pledgeToSave) : undefined,
    };

    const updated = [...requests, newItem];
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    setActiveTab(newItem.requestType);
    setForm(emptyForm(newItem.requestType));
    await persist(newItem);
  };

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    const target = requests.find((item) => item.id === id);
    if (!target) return;
    const updatedItem = { ...target, status };
    const updated = requests.map((item) => (item.id === id ? updatedItem : item));
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    await persist(updatedItem);
  };

  const handleDelete = async (id: string) => {
    const updated = requests.filter((item) => item.id !== id);
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    if (editingId === id) {
      setEditingId(null);
      setEditDraft(null);
    }

    try {
      const response = await fetch("/api/cloud-sync?type=council-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!response.ok) throw new Error("서버 삭제 실패");
    } catch (error) {
      console.warn("시의원 요구사항 삭제 서버 저장 실패:", error);
    }
  };

  const startEdit = (item: CouncilRequest) => {
    setEditingId(item.id);
    setEditDraft(draftFromItem(item));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    const target = requests.find((item) => item.id === id);
    if (!target) return;
    const isPledge = editDraft.requestType === "민선9기공약";
    const memberName = isPledge ? editDraft.budgetItemName.trim() : editDraft.memberName.trim();
    if (!memberName || !editDraft.content.trim()) return;

    const pledgeToSave = { ...editDraft.pledge, total: String(calcPledgeTotal(editDraft.pledge)) };

    const updatedItem: CouncilRequest = {
      ...target,
      electoralDistrict: stripCityName(editDraft.electoralDistrict),
      partyName: editDraft.partyName.trim(),
      memberName,
      committee: editDraft.committee.trim(),
      department: editDraft.department,
      content: editDraft.content.trim(),
      budgetItemName: editDraft.budgetItemName.trim(),
      requestedAmount: normalizeRequestedAmount(editDraft.requestedAmount),
      requestedDate: editDraft.requestedDate,
      note: isPledge ? serializePledgeExtra(pledgeToSave) : target.note,
    };
    const updated = requests.map((item) => (item.id === id ? updatedItem : item));
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    setEditingId(null);
    setEditDraft(null);
    await persist(updatedItem);
  };

  // 예전에 저장된 건(requestType 없음)은 소속 정당명 칸에 "시의원"으로 적혀 있었다.
  const typeOf = (item: CouncilRequest): RequestType =>
    item.requestType
      ? item.requestType
      : (item.partyName || "").replace(/\s/g, "") === "시의원"
        ? "시의원"
        : "당정협의회";
  const visibleRequests = requests.filter((item) => typeOf(item) === activeTab);
  const countOf = (type: RequestType) => requests.filter((item) => typeOf(item) === type).length;

  const renderTable = (rows: CouncilRequest[], emptyText: string, showCouncilFields: boolean, showMemberColumn: boolean = true) => {
    const columns = [
      { key: "num", className: "col-num", label: <>번호</> },
      ...(showMemberColumn ? [{ key: "member", className: "col-member", label: showCouncilFields ? <>이름<br />(위원회)</> : <>이름</> }] : []),
      ...(showCouncilFields ? [{ key: "party", className: "col-party", label: <>소속 정당명<br />(선거구)</> }] : []),
      { key: "content", className: "col-content", label: <>요구내용</> },
      { key: "dept", className: "col-dept", label: <>소관부서</> },
      { key: "budget", className: "col-budget-item", label: <>사업명 (세부사업+부기명)</> },
      { key: "amount", className: "col-amount", label: <>요구액</> },
      { key: "status", className: "col-status", label: <>반영여부</> },
      { key: "action", className: "col-action", label: <>관리</> },
    ];
    const layoutKey = `${showMemberColumn ? "m" : ""}${showCouncilFields ? "c" : ""}`;
    const widths = columnWidths[layoutKey];
    const keys = columns.map((column) => column.key);
    // 사업명·요구액·반영여부 머리글에는 원래 열 클래스가 없었다(본문 칸 정렬 규칙이 걸리지 않도록).
    const headerClass = (className: string) => (["col-budget-item", "col-amount", "col-status"].includes(className) ? "" : className);

    // 머리글 필터: 이름·정당·부서·반영여부는 목록에서 고르고, 요구내용·사업명은 글자로 찾는다. 탭마다 따로 기억한다.
    const filterKey = (columnKey: string) => `${activeTab}:${columnKey}`;
    const filterValue = (columnKey: string) => columnFilters[filterKey(columnKey)] || "";
    const setFilter = (columnKey: string, value: string) =>
      setColumnFilters((prev) => ({ ...prev, [filterKey(columnKey)]: value }));
    const hasFilter = keys.some((key) => filterValue(key));
    const clearFilters = () =>
      setColumnFilters((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${activeTab}:`))));
    const optionsFor = (columnKey: string) =>
      Array.from(new Set(rows.map((item) => FILTER_ACCESSORS[columnKey](item).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));
    const filteredRows = rows.filter((item) =>
      keys.every((key) => {
        const wanted = filterValue(key);
        if (!wanted || !FILTER_ACCESSORS[key]) return true;
        const actual = FILTER_ACCESSORS[key](item).trim();
        return TEXT_FILTER_KEYS.includes(key) ? actual.toLowerCase().includes(wanted.trim().toLowerCase()) : actual === wanted;
      }),
    );
    return (
          <table className="requests-table">
            <caption className="requests-unit-caption">(단위: 백만원)</caption>
            <colgroup>
              {columns.map((column) => (
                <col
                  key={column.key}
                  className={column.className}
                  style={widths?.[column.key] ? { width: `${widths[column.key]}%` } : undefined}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={column.key} className={`${headerClass(column.className)} resizable-th`.trim()}>
                    {column.label}
                    {index < columns.length - 1 && (
                      <span
                        className="col-resizer"
                        title="끌어서 열 너비 조절 · 두 번 클릭하면 원래 너비로"
                        onMouseDown={(event) => startColumnResize(event, layoutKey, keys, index)}
                        onDoubleClick={() => resetColumnWidths(layoutKey)}
                      />
                    )}
                  </th>
                ))}
              </tr>
              <tr className="requests-filter-row">
                {columns.map((column) => (
                  <th key={column.key}>
                    {TEXT_FILTER_KEYS.includes(column.key) ? (
                      <input
                        className="filter-control"
                        placeholder="검색"
                        value={filterValue(column.key)}
                        onChange={(e) => setFilter(column.key, e.target.value)}
                      />
                    ) : FILTER_ACCESSORS[column.key] ? (
                      <select
                        className={`filter-control${filterValue(column.key) ? " is-set" : ""}`}
                        value={filterValue(column.key)}
                        onChange={(e) => setFilter(column.key, e.target.value)}
                      >
                        <option value="">전체</option>
                        {optionsFor(column.key).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : column.key === "action" && hasFilter ? (
                      <button type="button" className="filter-clear" onClick={clearFilters}>필터 해제</button>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((item, index) => {
                  const isEditing = editingId === item.id && editDraft;
                  return (
                    <tr key={item.id}>
                      <td className="col-num">{index + 1}</td>
                      {isEditing ? (
                        <>
                          {showMemberColumn && (
                          <td>
                            <input
                              className="cell-input"
                              list={MEMBER_NAME_DATALIST_ID}
                              placeholder="이름"
                              value={editDraft.memberName}
                              onChange={(e) => setEditDraft(fillFromRoster(editDraft, e.target.value))}
                            />
                            {showCouncilFields && (
                            <input
                              className="cell-input"
                              placeholder="위원회"
                              value={editDraft.committee}
                              onChange={(e) => setEditDraft({ ...editDraft, committee: e.target.value })}
                            />
                            )}
                          </td>
                          )}
                          {showCouncilFields && (
                          <td>
                            <input
                              className="cell-input"
                              placeholder="소속 정당명"
                              value={editDraft.partyName}
                              onChange={(e) => setEditDraft({ ...editDraft, partyName: e.target.value })}
                            />
                            <input
                              className="cell-input"
                              placeholder="선거구"
                              value={editDraft.electoralDistrict}
                              onChange={(e) => setEditDraft({ ...editDraft, electoralDistrict: e.target.value })}
                            />
                          </td>
                          )}
                          <td>
                            <textarea
                              className="cell-input cell-textarea"
                              value={editDraft.content}
                              onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-input"
                              value={editDraft.department}
                              onChange={(e) => setEditDraft({ ...editDraft, department: e.target.value })}
                            >
                              {DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <textarea
                              className="cell-input cell-textarea"
                              value={editDraft.budgetItemName}
                              onChange={(e) => setEditDraft({ ...editDraft, budgetItemName: e.target.value })}
                            />
                          </td>
                          <td>
                            <textarea
                              className="cell-input cell-textarea"
                              value={editDraft.requestedAmount}
                              onChange={(e) => setEditDraft({ ...editDraft, requestedAmount: e.target.value })}
                              onBlur={() => setEditDraft((draft) => (draft ? { ...draft, requestedAmount: normalizeRequestedAmount(draft.requestedAmount) } : draft))}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          {showMemberColumn && (
                          <td className="col-member">
                            {item.memberName}
                            {showCouncilFields && item.committee && <><br />({item.committee})</>}
                          </td>
                          )}
                          {showCouncilFields && (
                          <td className="col-party">
                            {renderPartyWithDistrict(item.partyName, item.electoralDistrict || "")}
                          </td>
                          )}
                          <td className="col-content">{item.content}</td>
                          <td className="col-dept">{item.department}</td>
                          <td className="col-budget-item">{item.budgetItemName}</td>
                          <td className="col-amount">{displayAmountInMillions(item.requestedAmount)}</td>
                        </>
                      )}
                      <td>
                        <select
                          className={`status-badge status-${item.status}`}
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as RequestStatus)}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="col-action">
                        {isEditing ? (
                          <div className="action-buttons">
                            <button type="button" className="save-button" onClick={() => saveEdit(item.id)}>저장</button>
                            <button type="button" className="cancel-button" onClick={cancelEdit}>취소</button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => startEdit(item)}
                              aria-label="요구사항 편집"
                            >편집</button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDelete(item.id)}
                              aria-label="요구사항 삭제"
                            >삭제</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7 + (showMemberColumn ? 1 : 0) + (showCouncilFields ? 1 : 0)} className="empty-row">{rows.length > 0 ? "필터 조건에 맞는 요구가 없습니다" : emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
    );
  };

  // 민선9기공약 탭 전용 표: 다른 탭과 달리 이름 대신 공약명·사업주체·신규여부·연도별 예산계획을 보여준다.
  const renderPledgeTable = (rows: CouncilRequest[], emptyText: string) => (
          <table className="requests-table pledge-table">
            <colgroup>
              <col className="col-num" />
              <col className="col-pledge-name" />
              <col className="col-pledge-subject" />
              <col className="col-pledge-new" />
              <col className="col-dept" />
              <col className="col-pledge-content" />
              {PLEDGE_YEAR_FIELDS.map((field) => (
                <col key={field.key} className="col-pledge-year" />
              ))}
              <col className="col-status" />
              <col className="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th className="col-num">번호</th>
                <th>공약명</th>
                <th>사업주체</th>
                <th>신규</th>
                <th className="col-dept">소관부서</th>
                <th>추진내용</th>
                {PLEDGE_YEAR_FIELDS.map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
                <th>추진현황</th>
                <th className="col-action">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item, index) => {
                  const isEditing = editingId === item.id && editDraft;
                  const pledge = isEditing ? editDraft!.pledge : parsePledgeExtra(item.note);
                  return (
                    <tr key={item.id}>
                      <td className="col-num">{index + 1}</td>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              className="cell-input"
                              placeholder="공약명"
                              value={editDraft!.budgetItemName}
                              onChange={(e) => setEditDraft({ ...editDraft!, budgetItemName: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-input"
                              value={pledge.subject}
                              onChange={(e) => setEditDraft({ ...editDraft!, pledge: { ...pledge, subject: e.target.value } })}
                            >
                              <option value="">-</option>
                              {PLEDGE_SUBJECT_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="cell-input"
                              value={pledge.isNew}
                              onChange={(e) => setEditDraft({ ...editDraft!, pledge: { ...pledge, isNew: e.target.value } })}
                            >
                              <option value="">-</option>
                              {PLEDGE_NEW_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="cell-input"
                              value={editDraft!.department}
                              onChange={(e) => setEditDraft({ ...editDraft!, department: e.target.value })}
                            >
                              {DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <textarea
                              className="cell-input cell-textarea"
                              value={editDraft!.content}
                              onChange={(e) => setEditDraft({ ...editDraft!, content: e.target.value })}
                            />
                          </td>
                          <td className="col-amount">{calcPledgeTotal(pledge).toLocaleString("ko-KR")}</td>
                          {PLEDGE_INPUT_YEAR_FIELDS.map((field) => (
                            <td key={field.key}>
                              <input
                                className="cell-input"
                                value={pledge[field.key]}
                                onChange={(e) => setEditDraft({ ...editDraft!, pledge: { ...pledge, [field.key]: e.target.value } })}
                              />
                            </td>
                          ))}
                        </>
                      ) : (
                        <>
                          <td className="col-member">{item.budgetItemName}</td>
                          <td className="col-party">{pledge.subject || "-"}</td>
                          <td className="col-party">{pledge.isNew || "-"}</td>
                          <td className="col-dept">{item.department}</td>
                          <td className="col-content">{item.content}</td>
                          <td className="col-amount">{calcPledgeTotal(pledge).toLocaleString("ko-KR")}</td>
                          {PLEDGE_INPUT_YEAR_FIELDS.map((field) => (
                            <td key={field.key} className="col-amount">{pledge[field.key] || "-"}</td>
                          ))}
                        </>
                      )}
                      <td>
                        <select
                          className={`status-badge status-${item.status}`}
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as RequestStatus)}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="col-action">
                        {isEditing ? (
                          <div className="action-buttons">
                            <button type="button" className="save-button" onClick={() => saveEdit(item.id)}>저장</button>
                            <button type="button" className="cancel-button" onClick={cancelEdit}>취소</button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => startEdit(item)}
                              aria-label="공약 편집"
                            >편집</button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDelete(item.id)}
                              aria-label="공약 삭제"
                            >삭제</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8 + PLEDGE_YEAR_FIELDS.length} className="empty-row">{emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
  );

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>요구사항 반영</h1>
        </section>

        <section className="tab-bar">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            // 시장님 지시사항·민선9기 공약사항·당정협의회는 다른 탭과 구분되게 박스 전체를 색으로 채운다.
            const isFilled = FILLED_TAB_KEYS.includes(tab.key);
            // 탭 색은 CSS 변수로만 넘기고, 채움·선택 모양은 아래 스타일 규칙이 한곳에서 정한다.
            const tabStyle = tab.color
              ? ({
                  "--tab-color": tab.color,
                  "--tab-tint": hexToRgba(tab.color, 0.13),
                  "--tab-tint-strong": hexToRgba(tab.color, 0.24),
                  "--tab-edge": hexToRgba(tab.color, 0.45),
                } as CSSProperties)
              : undefined;
            return (
              <button
                key={tab.key}
                type="button"
                className={`tab-button${tab.color ? " tab-colored" : ""}${isFilled ? " tab-filled" : ""}${isActive ? " active" : ""}${tab.key === "원구성 현황" ? " tab-button-detached" : ""}`}
                style={tabStyle}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-label-row">
                  {tab.label}
                  {tab.key !== "원구성 현황" && (
                    <span className="tab-count">{countOf(tab.key as RequestType)}</span>
                  )}
                </span>
                {tab.subtitle && <span className="tab-subtitle">{tab.subtitle}</span>}
              </button>
            );
          })}
        </section>

        {activeTab !== "원구성 현황" && activeTab !== "민선9기공약" && (
        <section className="request-form-section">
          <div className="form-row">
            <select
              className="form-input type-select"
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value as RequestType })}
            >
              {REQUEST_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {!isMayorType(form.requestType) && (
            <input
              className="form-input district-input"
              placeholder="선거구"
              value={form.electoralDistrict}
              onChange={(e) => setForm({ ...form, electoralDistrict: e.target.value })}
            />
            )}
            {!isMayorType(form.requestType) && (
            <input
              className="form-input party-input"
              placeholder="소속 정당명"
              value={form.partyName}
              onChange={(e) => setForm({ ...form, partyName: e.target.value })}
            />
            )}
            <input
              className="form-input member-input"
              placeholder="이름"
              list={MEMBER_NAME_DATALIST_ID}
              value={form.memberName}
              onChange={(e) => setForm(fillFromRoster(form, e.target.value))}
            />
            <datalist id={MEMBER_NAME_DATALIST_ID}>
              {MEMBER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {`${MEMBER_BY_NAME[name].label} · ${MEMBER_BY_NAME[name].party}`}
                </option>
              ))}
            </datalist>
            {!isMayorType(form.requestType) && (
            <input
              className="form-input committee-input"
              placeholder="위원회"
              value={form.committee}
              onChange={(e) => setForm({ ...form, committee: e.target.value })}
            />
            )}
            <select
              className="form-input dept-select"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              className="form-input status-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as RequestStatus })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input
              className="form-input date-input"
              type="text"
              placeholder="요구일 (예: 2026. 09. 17.)"
              value={form.requestedDate}
              onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
            />
          </div>
          <div className="form-row">
            <textarea
              className="form-input content-textarea"
              placeholder="요구내용을 입력하세요..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <textarea
              className="form-input budget-item-input"
              rows={1}
              placeholder="사업명 (세부사업+부기명)"
              value={form.budgetItemName}
              onChange={(e) => setForm({ ...form, budgetItemName: e.target.value })}
            />
            <textarea
              className="form-input amount-input"
              rows={1}
              placeholder="요구액 (천원)"
              value={form.requestedAmount}
              onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
              onBlur={() => setForm((current) => ({ ...current, requestedAmount: normalizeRequestedAmount(current.requestedAmount) }))}
            />
            <button className="add-button" onClick={handleAdd}>추가</button>
          </div>
        </section>
        )}

        {activeTab === "민선9기공약" && (
        <section className="request-form-section pledge-form-section">
          <div className="form-row">
            <select
              className="form-input type-select"
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value as RequestType })}
            >
              {REQUEST_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              className="form-input pledge-name-input"
              placeholder="공약명"
              value={form.budgetItemName}
              onChange={(e) => setForm({ ...form, budgetItemName: e.target.value })}
            />
            <select
              className="form-input pledge-select"
              value={form.pledge.subject}
              onChange={(e) => setForm({ ...form, pledge: { ...form.pledge, subject: e.target.value } })}
            >
              <option value="">사업주체</option>
              {PLEDGE_SUBJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="form-input pledge-select"
              value={form.pledge.isNew}
              onChange={(e) => setForm({ ...form, pledge: { ...form.pledge, isNew: e.target.value } })}
            >
              <option value="">신규여부</option>
              {PLEDGE_NEW_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="form-input dept-select"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              className="form-input status-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as RequestStatus })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <textarea
              className="form-input content-textarea"
              placeholder="추진내용을 입력하세요..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <div className="form-row pledge-budget-row">
            <input
              className="form-input pledge-year-input pledge-total-input"
              placeholder="총계"
              value={calcPledgeTotal(form.pledge).toLocaleString("ko-KR")}
              readOnly
              disabled
            />
            {PLEDGE_INPUT_YEAR_FIELDS.map((field) => (
              <input
                key={field.key}
                className="form-input pledge-year-input"
                placeholder={field.label}
                value={form.pledge[field.key]}
                onChange={(e) => setForm({ ...form, pledge: { ...form.pledge, [field.key]: e.target.value } })}
              />
            ))}
            <button className="add-button" onClick={handleAdd}>추가</button>
          </div>
        </section>
        )}

        {activeTab !== "원구성 현황" && activeTab !== "민선9기공약" && (
        <section className="table-section">
          {renderTable(visibleRequests, MAIN_TABS.find((tab) => tab.key === activeTab)?.emptyText ?? "등록된 요구가 없습니다", !isMayorType(activeTab as RequestType), activeTab !== "시장")}
        </section>
        )}

        {activeTab === "민선9기공약" && (
        <section className="table-section">
          <div className="pledge-table-caption">추진년도별 예산액 (단위:백만원)</div>
          {renderPledgeTable(visibleRequests, MAIN_TABS.find((tab) => tab.key === activeTab)?.emptyText ?? "등록된 공약이 없습니다")}
        </section>
        )}

        {activeTab === "원구성 현황" && (
        <>
          <section className="cc-summary-box">
            <div>제10대 화성시의회 전반기 원구성 현황 &nbsp;·&nbsp; 의장: 이계철 &nbsp;/&nbsp; 부의장: 임채덕</div>
            <div className="cc-summary-sub">26. 7. 3. 기준</div>
          </section>

          <section className="cc-subtabs">
            {COMPOSITION_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`cc-subtab${compositionTab === tab.key ? " active" : ""}`}
                onClick={() => setCompositionTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </section>

          <section className="table-section cc-section">
            {compositionTab === "위원회별 의원 현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>구분</th>
                      {COMMITTEE_KEYS.map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="cc-role-cell">위원장</td>
                      {COMMITTEE_KEYS.map((key) => {
                        const m = COMMITTEE_ROSTERS[key].chair;
                        return (
                          <td key={key} className="cc-member-cell">
                            <div className="cc-member-name">{m.name}</div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="cc-role-cell">부위원장</td>
                      {COMMITTEE_KEYS.map((key) => {
                        const m = COMMITTEE_ROSTERS[key].viceChair;
                        return (
                          <td key={key} className="cc-member-cell">
                            <div className="cc-member-name">{m.name}</div>
                          </td>
                        );
                      })}
                    </tr>
                    {Array.from({ length: COMMITTEE_MEMBER_ROW_COUNT }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {rowIndex === 0 && (
                          <td className="cc-role-cell" rowSpan={COMMITTEE_MEMBER_ROW_COUNT}>
                            위원
                          </td>
                        )}
                        {COMMITTEE_KEYS.map((key) => {
                          const m = COMMITTEE_ROSTERS[key].members[rowIndex];
                          return (
                            <td key={key} className="cc-member-cell">
                              {m && <div className="cc-member-name">{m.name}</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {compositionTab === "상임위원회별 소관부서 현황" && (
              <div className="cc-dept-grid">
                {DEPARTMENT_JURISDICTION.map((group) => (
                  <div key={group.committee} className="cc-dept-card">
                    <div className="cc-dept-card-title">
                      {group.committee} <span className="cc-dept-count">({group.count})</span>
                    </div>
                    <ul className="cc-dept-list">
                      {group.departments.map((dept, i) => (
                        <li key={i}>{dept}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {compositionTab === "지역구별 시의원현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table cc-district-table">
                  <thead>
                    <tr>
                      <th>지역구</th>
                      <th>선거구</th>
                      <th>시의원</th>
                      <th>위원회</th>
                      <th>정당명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISTRICT_MEMBERS.map((row, i) => (
                      <tr key={i}>
                        {districtRowSpans[i] && (
                          <td className="cc-district-cell" rowSpan={districtRowSpans[i] as number}>
                            <div className="cc-district-name">
                              {NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT[row.district] ? `화성시 ${NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT[row.district]}` : "-"}
                            </div>
                          </td>
                        )}
                        {districtRowSpans[i] && (
                          <td className="cc-district-cell" rowSpan={districtRowSpans[i] as number}>
                            <div className="cc-district-name">{districtDisplayLabel(row.district)}</div>
                            {districtAreaByGroup[row.district] && (
                              <div className="cc-district-area">{districtAreaByGroup[row.district]}</div>
                            )}
                          </td>
                        )}
                        <td className="cc-row-text">{row.name}</td>
                        <td className="cc-row-text">{row.committee}</td>
                        <td>
                          <span className="cc-party-badge cc-row-text" style={{ color: partyColor(row.party) }}>
                            {row.party}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {compositionTab === "지역구별 도의원현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table cc-district-table cc-provincial-table">
                  <colgroup>
                    <col className="cc-prov-col-national" />
                    <col className="cc-prov-col-district" />
                    <col className="cc-prov-col-member" />
                    <col className="cc-prov-col-party" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>지역구</th>
                      <th>선거구</th>
                      <th>도의원</th>
                      <th>정당명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(DISTRICT_MEMBERS.map((row) => row.district))).filter((district) => district !== "비례대표").map((district) => {
                      const provincial = PROVINCIAL_MEMBER_BY_DISTRICT[district];
                      const provincialDistrict = PROVINCIAL_DISTRICT_INFO[district];
                      return (
                        <tr key={district}>
                          <td className="cc-district-cell">
                            <div className="cc-district-name">
                              {NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT[district] ? `화성시 ${NATIONAL_DISTRICT_BY_COUNCIL_DISTRICT[district]}` : "-"}
                            </div>
                          </td>
                          <td className="cc-district-cell">
                            <div className="cc-district-line">
                              <span className="cc-district-name">{provincialDistrict?.label ?? districtDisplayLabel(district)}</span>
                              {provincialDistrict?.area && (
                                <span className="cc-district-area">{provincialDistrict.area}</span>
                              )}
                            </div>
                          </td>
                          <td className="cc-row-text">{provincial?.name || "-"}</td>
                          <td>
                            {provincial && (
                              <span className="cc-party-badge cc-row-text" style={{ color: partyColor(provincial.party) }}>
                                {provincial.party}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {compositionTab === "국회의원 현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table cc-national-table">
                  <thead>
                    <tr>
                      <th>선거구</th>
                      <th>국회의원</th>
                      <th>관할 읍·면·동 (구역)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NATIONAL_ASSEMBLY_DISTRICTS.map((row) => (
                      <tr key={row.district}>
                        <td className="cc-district-cell">
                          <div className="cc-district-name">{row.district}</div>
                        </td>
                        <td>
                          <div className="cc-member-name">{row.memberName}</div>
                        </td>
                        <td className="cc-national-jurisdiction">{row.jurisdiction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
        )}
      </div>

      <style>{`
        .page-content {
          padding: 24px;
        }

        .page-heading {
          margin-bottom: 24px;
        }

        .page-heading h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .request-form-section {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-row {
          display: flex;
          gap: 10px;
        }

        .form-input {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-family: "Pretendard", system-ui, sans-serif;
          font-size: 15px;
          padding: 10px 12px;
        }

        .form-input:focus {
          outline: none;
          border-color: #5b9bf0;
          box-shadow: 0 0 0 2px rgba(91, 155, 240, 0.1);
        }

        .form-input::placeholder {
          color: var(--text-muted);
        }

        .party-input {
          flex: 0 0 130px;
        }

        .member-input {
          flex: 0 0 140px;
        }

        .dept-select {
          flex: 0 0 160px;
        }

        .status-select {
          flex: 0 0 110px;
        }

        .date-input {
          flex: 0 0 190px;
        }

        .content-textarea {
          flex: 1;
          min-height: 56px;
          resize: vertical;
          line-height: 1.5;
        }

        .budget-item-input {
          flex: 0 0 240px;
        }

        .amount-input {
          flex: 0 0 150px;
        }

        .pledge-name-input {
          flex: 1 1 220px;
        }

        .pledge-select {
          flex: 0 0 110px;
        }

        .pledge-total-input {
          font-weight: 500;
          color: #7ee787;
          opacity: 1;
          cursor: default;
        }

        .pledge-budget-row {
          flex-wrap: wrap;
        }

        .pledge-year-input {
          flex: 0 0 90px;
          text-align: right;
        }

        .add-button {
          flex: 0 0 88px;
          border: 1px solid rgba(91, 155, 240, 0.35);
          border-radius: 6px;
          background: rgba(91, 155, 240, 0.15);
          color: #5b9bf0;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
        }

        .add-button:hover {
          background: rgba(91, 155, 240, 0.25);
        }

        .col-resizer {
          position: absolute;
          top: 0;
          right: -4px;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          z-index: 1;
        }

        .col-resizer:hover {
          background: rgba(91, 155, 240, 0.45);
        }

        /* 상단 구분 탭: 모두 같은 높이·같은 바탕. 탭 고유색은 윗변 띠로만 보이고,
           시장님 지시사항·민선9기 공약·당정협의회(.tab-filled)만 같은 농도로 옅게 채운다. */
        .tab-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 8px;
          margin-bottom: 20px;
        }

        .tab-button {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 76px;
          padding: 12px 18px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-elevated);
          color: var(--text);
          font-family: "Pretendard", system-ui, sans-serif;
          cursor: pointer;
          overflow: hidden;
          transition: background-color 160ms ease, border-color 160ms ease;
        }

        .tab-button.tab-colored::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 3px;
          background: var(--tab-color);
          opacity: 0.85;
        }

        .tab-button.tab-filled {
          background: var(--tab-tint);
          border-color: var(--tab-edge);
        }

        .tab-button:hover {
          border-color: rgba(203, 213, 225, 0.35);
        }

        .tab-button.tab-colored:hover {
          border-color: var(--tab-edge);
        }

        .tab-button.active {
          border-color: #5b9bf0;
          background: rgba(91, 155, 240, 0.14);
          box-shadow: inset 0 0 0 1px #5b9bf0;
        }

        .tab-button.tab-colored.active {
          border-color: var(--tab-color);
          background: var(--tab-tint-strong);
          box-shadow: inset 0 0 0 1px var(--tab-color);
        }

        .tab-button:focus-visible {
          outline: 2px solid #5b9bf0;
          outline-offset: 2px;
        }

        .tab-button-detached {
          margin-left: auto;
        }

        .tab-label-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .tab-count {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }

        .tab-button.active .tab-count {
          color: var(--text);
        }

        .tab-subtitle {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
          white-space: pre;
          text-align: center;
          line-height: 1.45;
        }

        .type-select {
          min-width: 130px;
        }

        .table-section {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: auto;
        }

        .table-section + .table-section {
          margin-top: 28px;
        }

        .table-title {
          margin: 0;
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 500;
          border-bottom: 1px solid var(--border);
        }

        /* 요구사항 표: 머리글·본문 모두 Pretendard 한 서체, 회색 계열 하나로 통일. */
        .requests-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-family: "Pretendard", system-ui, sans-serif;
          font-size: 16px;
        }

        .requests-table th,
        .requests-table td {
          padding: 9px 12px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.14);
          border-right: 1px solid rgba(148, 163, 184, 0.1);
          text-align: left;
          vertical-align: middle;
          word-break: keep-all;
          overflow-wrap: anywhere;
          line-height: 1.5;
        }

        .requests-table th:last-child,
        .requests-table td:last-child {
          border-right: none;
        }

        .requests-table th {
          position: relative;
          background: #1c2735;
          color: var(--text);
          border-bottom: 1px solid rgba(148, 163, 184, 0.3);
          font-weight: 600;
          font-size: 18px;
          line-height: 1.35;
          text-align: center;
          letter-spacing: -0.01em;
        }

        .pledge-table th {
          font-size: 16px;
        }

        .pledge-table td.col-content {
          font-weight: 400;
        }

        .requests-table td {
          color: var(--text);
          font-size: 17px;
        }

        .requests-table thead .requests-filter-row th {
          padding: 6px 8px;
          background: #18212d;
          border-bottom: 1px solid rgba(148, 163, 184, 0.3);
          font-size: 14px;
          font-weight: 400;
        }

        .filter-control {
          width: 100%;
          height: 30px;
          padding: 0 8px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 5px;
          background: var(--bg-surface);
          color: var(--text);
          font-family: "Pretendard", system-ui, sans-serif;
          font-size: 14px;
        }

        .filter-control::placeholder {
          color: var(--text-muted);
        }

        .filter-control:focus {
          outline: none;
          border-color: #5b9bf0;
        }

        .filter-control.is-set,
        input.filter-control:not(:placeholder-shown) {
          border-color: #5b9bf0;
          background: rgba(91, 155, 240, 0.12);
        }

        .filter-clear {
          width: 100%;
          height: 30px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 5px;
          background: transparent;
          color: var(--text);
          font-family: "Pretendard", system-ui, sans-serif;
          font-size: 13px;
          cursor: pointer;
        }

        .filter-clear:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .requests-table tbody tr:hover td {
          background: rgba(91, 155, 240, 0.06);
        }

        col.col-num { width: 4%; }
        col.col-party { width: 9%; }
        col.col-content { width: 24%; }
        col.col-status { width: 8%; }
        col.col-action { width: 8%; }
        /* 시의원 이름·소관부서·사업명·요구액 - 나머지 칸과 구분되는 옅은 바탕 */
        col.col-member, col.col-dept, col.col-budget-item, col.col-amount {
          background-color: rgba(148, 163, 184, 0.05);
        }
        col.col-member { width: 9%; }
        col.col-dept { width: 8%; }
        col.col-budget-item { width: 15%; }
        col.col-amount { width: 7%; }

        /* 민선9기공약 전용 표 열 너비 */
        .pledge-table col.col-pledge-name {
          width: 12%;
          background-color: rgba(126, 231, 187, 0.12);
        }
        .pledge-table col.col-pledge-subject { width: 6%; }
        .pledge-table col.col-pledge-new { width: 5%; }
        .pledge-table col.col-pledge-content { width: 12%; }
        .pledge-table col.col-pledge-year { width: 4.5%; }

        .pledge-table-caption {
          text-align: right;
          padding: 10px 16px 0;
          font-size: 14px;
          color: var(--text-muted);
        }

        .requests-table td.col-num {
          text-align: center;
          color: var(--text-muted);
        }

        .requests-table td.col-member {
          font-weight: 500;
          text-align: center;
        }

        .requests-table td.col-party,
        .requests-table td.col-dept {
          text-align: center;
        }

        .requests-table td.col-content {
          white-space: pre-wrap;
          text-align: center;
        }

        .requests-table td.col-budget-item {
          white-space: pre-wrap;
        }

        .requests-unit-caption {
          caption-side: top;
          text-align: right;
          padding: 10px 14px 8px;
          font-family: "Pretendard", system-ui, sans-serif;
          font-size: 13px;
          color: var(--text-muted);
        }

        .budget-item-input,
        .amount-input {
          min-height: 56px;
          resize: vertical;
          line-height: 1.5;
        }

        /* 전역 .col-amount(예산서 표용 14px !important)를 이 표에서만 되돌린다. */
        .requests-table td.col-amount {
          white-space: pre;
          text-align: right;
          font-size: 17px !important;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }

        .col-date {
          white-space: nowrap;
          color: var(--text-muted);
        }

        .col-action {
          text-align: center;
        }

        .cell-input {
          width: 100%;
          background: var(--bg-surface);
          border: 1px solid #5b9bf0;
          border-radius: 4px;
          color: var(--text);
          font-family: inherit;
          font-size: 14px;
          padding: 4px 6px;
        }

        .cell-textarea {
          resize: vertical;
          min-height: 40px;
        }

        .action-buttons {
          display: flex;
          flex-direction: row;
          gap: 4px;
          align-items: center;
          justify-content: center;
        }

        .status-badge {
          width: 100%;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text);
          font-family: "Pretendard", system-ui, sans-serif;
          font-size: 15px;
          font-weight: 500;
          padding: 4px 6px;
          cursor: pointer;
        }

        .status-badge.status-반영 {
          color: #7ee787;
        }

        .status-badge.status-미반영 {
          color: #ff9aa7;
        }

        .status-badge.status-검토중 {
          color: #d9ad52;
        }

        .edit-button,
        .delete-button,
        .save-button,
        .cancel-button {
          border-radius: 5px;
          padding: 3px 8px;
          font-size: 14px;
          cursor: pointer;
        }

        /* 관리 버튼: 색 없이 회색 테두리만 */
        .edit-button,
        .save-button,
        .cancel-button,
        .delete-button {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
        }

        .edit-button:hover,
        .save-button:hover,
        .cancel-button:hover,
        .delete-button:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
        }

        .empty-row {
          text-align: center;
          padding: 24px;
          color: var(--text-muted);
        }

        .cc-summary-box {
          border: 1px solid rgba(217, 173, 82, 0.35);
          border-left: 3px solid #d9ad52;
          border-radius: 6px;
          background: rgba(217, 173, 82, 0.06);
          padding: 10px 16px;
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          line-height: 1.6;
        }

        .cc-summary-sub {
          margin-top: 2px;
          font-size: 14px;
          font-weight: 400;
          color: var(--text-muted);
        }

        .cc-subtabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .cc-subtab {
          flex-shrink: 0;
          padding: 8px 18px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text-muted);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .cc-subtab:hover {
          color: var(--text);
          background: rgba(118, 157, 194, 0.08);
        }

        .cc-subtab.active {
          color: #fff;
          background: #5b9bf0;
          border-color: #5b9bf0;
        }

        .cc-section {
          padding: 24px;
        }

        .cc-subsection-title {
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 10px;
        }

        .cc-subsection-title-spaced {
          margin-top: 28px;
        }

        .cc-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 6px;
        }

        .cc-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          font-size: 15px;
        }

        .cc-table th,
        .cc-table td {
          border: 1px solid var(--border);
          padding: 10px 12px;
          text-align: center;
          vertical-align: middle;
        }

        .cc-table thead th {
          background: rgba(126, 231, 187, 0.16);
          color: var(--text);
          font-size: 15px;
          font-weight: 400;
          white-space: nowrap;
        }

        .cc-role-cell {
          font-weight: 500;
          background: rgba(217, 173, 82, 0.1);
          white-space: nowrap;
        }

        .cc-member-cell {
          min-width: 100px;
        }

        .cc-member-name {
          font-weight: 500;
        }

        .cc-table tbody tr:nth-child(even) {
          background: rgba(118, 157, 194, 0.04);
        }

        .cc-dept-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .cc-dept-card {
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-elevated);
          padding: 16px 18px;
        }

        .cc-dept-card-title {
          font-size: 15px;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(126, 231, 187, 0.3);
        }

        .cc-dept-count {
          font-weight: 400;
          color: var(--text-muted);
        }

        .cc-dept-list {
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 14px;
          color: var(--text);
          line-height: 1.8;
        }

        .cc-dept-list li {
          padding-left: 12px;
          position: relative;
        }

        .cc-dept-list li::before {
          content: "○";
          position: absolute;
          left: 0;
          font-size: 12px;
          color: var(--text-muted);
        }

        .cc-district-table .cc-district-cell {
          width: 190px;
          min-width: 190px;
        }

        /* 도의원 현황: 선거구(제N선거구 + 관할 구역)는 넓은 칸에 한 줄로, 정당명은 글자에 맞는 폭으로 */
        .cc-provincial-table {
          table-layout: fixed;
          min-width: 760px;
        }

        .cc-provincial-table col.cc-prov-col-national { width: 14%; }
        .cc-provincial-table col.cc-prov-col-district { width: 50%; }
        .cc-provincial-table col.cc-prov-col-member { width: 16%; }
        .cc-provincial-table col.cc-prov-col-party { width: 20%; }

        .cc-provincial-table .cc-district-table .cc-district-cell,
        .cc-provincial-table .cc-district-cell {
          width: auto;
          min-width: 0;
          text-align: left;
          padding-left: 20px;
        }

        .cc-district-line {
          display: flex;
          align-items: baseline;
          gap: 14px;
          white-space: nowrap;
        }

        .cc-provincial-table .cc-district-area {
          margin-top: 0;
          white-space: nowrap;
        }

        .cc-district-cell {
          white-space: nowrap;
          vertical-align: middle;
        }

        .cc-district-name {
          font-size: 17px;
          font-weight: 500;
        }

        .cc-district-area {
          margin-top: 2px;
          font-size: 15px;
          color: var(--text-muted);
          white-space: normal;
        }

        .cc-row-text {
          font-weight: 500;
        }

        .cc-party-badge {
          font-weight: 500;
        }

        .cc-table td.cc-national-jurisdiction {
          text-align: left;
          white-space: normal;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .form-row {
            flex-wrap: wrap;
          }

          .party-input,
          .member-input,
          .dept-select,
          .status-select,
          .date-input,
          .add-button {
            flex: 1 1 45%;
          }

          .content-textarea,
          .budget-item-input,
          .amount-input {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
