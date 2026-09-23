import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

type RequestStatus = "검토중" | "반영" | "미반영";
// 요구가 들어온 경로. 탭을 가르는 기준이며, 소속 정당명과는 별개다.
type RequestType = "당정협의회" | "정책간담회" | "시의원" | "특별조정교부금";

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
};

const STATUS_OPTIONS: RequestStatus[] = ["검토중", "반영", "미반영"];
const REQUEST_TYPE_OPTIONS: RequestType[] = ["당정협의회", "정책간담회", "시의원", "특별조정교부금"];

const todayString = () =>
  new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

const emptyForm = (requestType: RequestType = "당정협의회") => ({
  requestType,
  electoralDistrict: "",
  partyName: "",
  memberName: "",
  committee: "",
  department: DEPARTMENTS[0] || "",
  content: "",
  budgetItemName: "",
  requestedAmount: "",
  status: "검토중" as RequestStatus,
  requestedDate: todayString(),
});

type EditDraft = Omit<CouncilRequest, "id" | "status">;

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
});

// ── 원구성 현황 (제10대 화성시의회 전반기, 26. 7. 3. 기준) ──────────────────
type MainTabKey = RequestType | "원구성 현황";

const MAIN_TABS: { key: MainTabKey; label: string; subtitle?: string; emptyText?: string; color?: string }[] = [
  { key: "당정협의회", label: "당정협의회 요구", subtitle: "정당 요구사업 · 정책기획관 주관", emptyText: "등록된 당정협의회 요구가 없습니다", color: "#5b9bf0" },
  { key: "정책간담회", label: "정책간담회", subtitle: "당과 무관한 시의원 요구사업 · 소통협치실을 통한 요구", emptyText: "등록된 정책간담회 요구가 없습니다", color: "#7ee787" },
  { key: "시의원", label: "시의원 요구사항", emptyText: "등록된 시의원 요구사항이 없습니다" },
  { key: "특별조정교부금", label: "특별조정교부금", subtitle: "경기도 관할 시의 지역개발사업 등 시책 추진을 위한 재원", emptyText: "등록된 특별조정교부금 요구가 없습니다", color: "#d9ad52" },
  { key: "원구성 현황", label: "원구성 현황" },
];

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

type CompositionTabKey = "위원회별 의원 현황" | "상임위원회별 소관부서 현황" | "지역구별 의원 현황";

const COMPOSITION_TABS: { key: CompositionTabKey; label: string }[] = [
  { key: "위원회별 의원 현황", label: "위원회별 의원 현황" },
  { key: "상임위원회별 소관부서 현황", label: "상임위원회별 소관부서 현황" },
  { key: "지역구별 의원 현황", label: "지역구별 의원 현황" },
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

// 이름만 넣으면 원구성 현황 명부에서 선거구·소속정당·위원회를 끌어다 채운다.
const MEMBER_BY_NAME = DISTRICT_MEMBERS.reduce<Record<string, DistrictMember>>((acc, row) => {
  if (!(row.name in acc)) acc[row.name] = row;
  return acc;
}, {});

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

export default function CouncilMemberRequests() {
  const [requests, setRequests] = useState<CouncilRequest[]>([]);
  const [activeTab, setActiveTab] = useState<MainTabKey>("당정협의회");
  const [compositionTab, setCompositionTab] = useState<CompositionTabKey>(COMPOSITION_TABS[0].key);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // 서버 데이터를 우선 로드하고, 서버를 사용할 수 없는 경우 localStorage를 사용한다.
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch("/api/cloud-sync?type=council-requests");
        if (!response.ok) throw new Error("서버 로드 실패");
        const { data } = await response.json();
        if (Array.isArray(data)) {
          setRequests(data);
          localStorage.setItem("councilMemberRequests", JSON.stringify(data));
          return;
        }
      } catch (error) {
        console.warn("서버에서 시의원 요구사항 로드 실패:", error);
      }

      const saved = localStorage.getItem("councilMemberRequests");
      if (saved) {
        try {
          setRequests(JSON.parse(saved));
        } catch (error) {
          console.error("시의원 요구사항 로컬 데이터 로드 실패:", error);
        }
      }
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
    if (!form.memberName.trim() || !form.content.trim()) return;

    const newItem: CouncilRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestType: form.requestType,
      electoralDistrict: form.electoralDistrict.trim(),
      partyName: form.partyName.trim(),
      memberName: form.memberName.trim(),
      committee: form.committee.trim(),
      department: form.department,
      content: form.content.trim(),
      budgetItemName: form.budgetItemName.trim(),
      requestedAmount: form.requestedAmount.trim(),
      status: form.status,
      requestedDate: form.requestedDate,
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
    if (!editDraft.memberName.trim() || !editDraft.content.trim()) return;

    const updatedItem: CouncilRequest = {
      ...target,
      electoralDistrict: editDraft.electoralDistrict.trim(),
      partyName: editDraft.partyName.trim(),
      memberName: editDraft.memberName.trim(),
      committee: editDraft.committee.trim(),
      department: editDraft.department,
      content: editDraft.content.trim(),
      budgetItemName: editDraft.budgetItemName.trim(),
      requestedAmount: editDraft.requestedAmount.trim(),
      requestedDate: editDraft.requestedDate,
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

  const renderTable = (rows: CouncilRequest[], emptyText: string) => (
          <table className="requests-table">
            <colgroup>
              <col className="col-num" />
              <col className="col-district" />
              <col className="col-party" />
              <col className="col-member" />
              <col className="col-committee" />
              <col className="col-dept" />
              <col className="col-content" />
              <col className="col-budget-item" />
              <col className="col-amount" />
              <col className="col-date" />
              <col className="col-status" />
              <col className="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th className="col-num">번호</th>
                <th>선거구</th>
                <th>소속 정당명</th>
                <th>이름</th>
                <th>위원회</th>
                <th>소관부서</th>
                <th>요구내용</th>
                <th>사업명 (세부사업+부기명)</th>
                <th>요구액</th>
                <th>요구일</th>
                <th>반영여부</th>
                <th className="col-action">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item, index) => {
                  const isEditing = editingId === item.id && editDraft;
                  return (
                    <tr key={item.id}>
                      <td className="col-num">{index + 1}</td>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.electoralDistrict}
                              onChange={(e) => setEditDraft({ ...editDraft, electoralDistrict: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.partyName}
                              onChange={(e) => setEditDraft({ ...editDraft, partyName: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              list={MEMBER_NAME_DATALIST_ID}
                              value={editDraft.memberName}
                              onChange={(e) => setEditDraft(fillFromRoster(editDraft, e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.committee}
                              onChange={(e) => setEditDraft({ ...editDraft, committee: e.target.value })}
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
                              value={editDraft.content}
                              onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.budgetItemName}
                              onChange={(e) => setEditDraft({ ...editDraft, budgetItemName: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.requestedAmount}
                              onChange={(e) => setEditDraft({ ...editDraft, requestedAmount: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.requestedDate}
                              onChange={(e) => setEditDraft({ ...editDraft, requestedDate: e.target.value })}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{item.electoralDistrict}</td>
                          <td>{item.partyName}</td>
                          <td className="col-member">{item.memberName}</td>
                          <td>{item.committee}</td>
                          <td>{item.department}</td>
                          <td className="col-content">{item.content}</td>
                          <td>{item.budgetItemName}</td>
                          <td className="col-amount">{item.requestedAmount}</td>
                          <td className="col-date">{item.requestedDate}</td>
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
                  <td colSpan={12} className="empty-row">{emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
  );

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>당정협의회 요구</h1>
        </section>

        <section className="tab-bar">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabStyle = tab.color
              ? {
                  borderColor: isActive ? tab.color : hexToRgba(tab.color, 0.4),
                  color: isActive ? tab.color : undefined,
                  background: isActive ? hexToRgba(tab.color, 0.12) : "transparent",
                }
              : undefined;
            return (
              <button
                key={tab.key}
                type="button"
                className={`tab-button${isActive ? " active" : ""}`}
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

        {activeTab !== "원구성 현황" && (
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
            <input
              className="form-input district-input"
              placeholder="선거구"
              value={form.electoralDistrict}
              onChange={(e) => setForm({ ...form, electoralDistrict: e.target.value })}
            />
            <input
              className="form-input party-input"
              placeholder="소속 정당명"
              value={form.partyName}
              onChange={(e) => setForm({ ...form, partyName: e.target.value })}
            />
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
                  {`${MEMBER_BY_NAME[name].district} · ${MEMBER_BY_NAME[name].party} · ${MEMBER_BY_NAME[name].committee}`}
                </option>
              ))}
            </datalist>
            <input
              className="form-input committee-input"
              placeholder="위원회"
              value={form.committee}
              onChange={(e) => setForm({ ...form, committee: e.target.value })}
            />
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
            <input
              className="form-input budget-item-input"
              placeholder="사업명 (세부사업+부기명)"
              value={form.budgetItemName}
              onChange={(e) => setForm({ ...form, budgetItemName: e.target.value })}
            />
            <input
              className="form-input amount-input"
              placeholder="요구액 (예: 6억)"
              value={form.requestedAmount}
              onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
            />
            <button className="add-button" onClick={handleAdd}>추가</button>
          </div>
        </section>
        )}

        {activeTab !== "원구성 현황" && (
        <section className="table-section">
          {renderTable(visibleRequests, MAIN_TABS.find((tab) => tab.key === activeTab)?.emptyText ?? "등록된 요구가 없습니다")}
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

            {compositionTab === "지역구별 의원 현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table cc-district-table">
                  <thead>
                    <tr>
                      <th>선거구</th>
                      <th>성명</th>
                      <th>위원회</th>
                      <th>정당명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISTRICT_MEMBERS.map((row, i) => (
                      <tr key={i}>
                        {districtRowSpans[i] && (
                          <td className="cc-district-cell" rowSpan={districtRowSpans[i] as number}>
                            <div className="cc-district-name">{row.district}</div>
                            {districtAreaByGroup[row.district] && (
                              <div className="cc-district-area">{districtAreaByGroup[row.district]}</div>
                            )}
                          </td>
                        )}
                        <td>{row.name}</td>
                        <td>{row.committee}</td>
                        <td>
                          <span className="cc-party-badge" style={{ color: partyColor(row.party) }}>
                            {row.party}
                          </span>
                        </td>
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
          font-family: inherit;
          font-size: 14px;
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
          min-height: 44px;
          resize: vertical;
          line-height: 1.5;
        }

        .budget-item-input {
          flex: 0 0 160px;
        }

        .amount-input {
          flex: 0 0 130px;
        }

        .add-button {
          flex: 0 0 88px;
          border: 1px solid rgba(91, 155, 240, 0.35);
          border-radius: 6px;
          background: rgba(91, 155, 240, 0.15);
          color: #5b9bf0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .add-button:hover {
          background: rgba(91, 155, 240, 0.25);
        }

        .tab-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }

        .tab-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 18px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .tab-button:hover {
          color: var(--text);
        }

        .tab-button.active {
          color: #5b9bf0;
          border-color: rgba(91, 155, 240, 0.45);
          background: rgba(91, 155, 240, 0.12);
        }

        .tab-label-row {
          display: flex;
          align-items: center;
        }

        .tab-count {
          margin-left: 6px;
          font-size: 12px;
          opacity: 0.75;
        }

        .tab-subtitle {
          font-size: 11px;
          font-weight: 400;
          color: var(--text-muted);
          opacity: 0.85;
          white-space: nowrap;
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
          font-weight: 700;
          border-bottom: 1px solid var(--border);
        }

        .requests-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 14px;
        }

        .requests-table th,
        .requests-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          text-align: left;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .requests-table th:last-child,
        .requests-table td:last-child {
          border-right: none;
        }

        .requests-table th {
          background: rgba(118, 157, 194, 0.08);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 13px;
          text-align: center;
        }

        .requests-table td {
          color: var(--text);
        }

        col.col-num { width: 4%; }
        col.col-district { width: 8%; }
        col.col-party { width: 8%; }
        col.col-member { width: 6%; }
        col.col-committee { width: 9%; }
        col.col-dept { width: 7%; }
        col.col-content { width: 16%; }
        col.col-budget-item { width: 12%; }
        col.col-amount { width: 7%; }
        col.col-date { width: 8%; }
        col.col-status { width: 7%; }
        col.col-action { width: 8%; }

        .col-num {
          text-align: center;
          color: var(--text-muted);
        }

        .col-member {
          font-weight: 600;
        }

        .col-content {
          white-space: pre-wrap;
        }

        .col-amount {
          white-space: nowrap;
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
          font-size: 13px;
          padding: 4px 6px;
        }

        .cell-textarea {
          resize: vertical;
          min-height: 40px;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: stretch;
        }

        .status-badge {
          width: 100%;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 13px;
          padding: 4px 6px;
          cursor: pointer;
        }

        .status-badge.status-반영 {
          color: #7ee787;
          border-color: rgba(126, 231, 135, 0.35);
          background: rgba(126, 231, 135, 0.08);
        }

        .status-badge.status-미반영 {
          color: #ff9aa7;
          border-color: rgba(255, 107, 125, 0.35);
          background: rgba(255, 107, 125, 0.08);
        }

        .status-badge.status-검토중 {
          color: #d9ad52;
          border-color: rgba(217, 173, 82, 0.35);
          background: rgba(217, 173, 82, 0.08);
        }

        .edit-button,
        .delete-button,
        .save-button,
        .cancel-button {
          border-radius: 5px;
          padding: 3px 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .edit-button {
          border: 1px solid rgba(91, 155, 240, 0.35);
          background: rgba(91, 155, 240, 0.08);
          color: #5b9bf0;
        }

        .edit-button:hover {
          background: rgba(91, 155, 240, 0.18);
        }

        .save-button {
          border: 1px solid rgba(126, 231, 135, 0.35);
          background: rgba(126, 231, 135, 0.08);
          color: #7ee787;
        }

        .save-button:hover {
          background: rgba(126, 231, 135, 0.18);
        }

        .cancel-button {
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-muted);
        }

        .cancel-button:hover {
          color: var(--text);
        }

        .delete-button {
          border: 1px solid rgba(255, 107, 125, 0.35);
          background: rgba(255, 107, 125, 0.08);
          color: #ff9aa7;
        }

        .delete-button:hover {
          background: rgba(255, 107, 125, 0.18);
          color: #ffd8dd;
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
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.6;
        }

        .cc-summary-sub {
          margin-top: 2px;
          font-size: 12px;
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
          font-size: 14px;
          font-weight: 600;
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

        .cc-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 6px;
        }

        .cc-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          font-size: 14px;
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
          font-weight: 700;
          background: rgba(217, 173, 82, 0.1);
          white-space: nowrap;
        }

        .cc-member-cell {
          min-width: 100px;
        }

        .cc-member-name {
          font-weight: 600;
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
          font-weight: 700;
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
          font-size: 13px;
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
          font-size: 10px;
          color: var(--text-muted);
        }

        .cc-district-table td:nth-child(2) {
          font-weight: 600;
        }

        .cc-district-cell {
          white-space: nowrap;
        }

        .cc-district-name {
          font-size: 17px;
          font-weight: 700;
        }

        .cc-district-area {
          margin-top: 2px;
          font-size: 14px;
          color: var(--text-muted);
          white-space: normal;
        }

        .cc-party-badge {
          font-weight: 700;
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
