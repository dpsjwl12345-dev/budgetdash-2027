/*
 * Civic Ledger 스타일 기준: 사용자가 제공한 참조 대시보드의 어두운 네이비 행정 업무 화면을 보존한다.
 * 이번 수정 범위는 데스크톱 전체 가독성 향상이며, 정보 구조와 상태 체계는 유지하고 타이포그래피만 한 단계 크게 잡는다.
 */
import { Fragment, useMemo, useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

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
} from "lucide-react";

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

const yearOptions = [
  { value: "2027", label: "2027년" },
  { value: "2026", label: "2026년" },
];

const departmentOptions = [
  { value: "", label: "선택" },
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

  // 5번 보조금심의 - 통계목 코드
  const subsidyCodes = ["307-02", "307-03", "307-04", "307-09", "307-10", "307-11", "402-01", "308-01", "308-08", "308-09", "308-12", "403-01", "403-03", "403-04"];
  if (subsidyCodes.some(code => row.account.includes(code))) applicable.push(5);

  // 6번 용역심의 - 용역 + 10 백만원(1천만원) 이상
  if (text.includes("용역") && amount >= 10) applicable.push(6);

  // 7번 출연금 - 출연/출자/위탁
  if (text.includes("출연") || text.includes("출자") || text.includes("위탁")) applicable.push(7);

  // 8번 정보화 - 정보화/정보시스템/소프트웨어
  if (text.includes("정보화") || text.includes("정보시스템") || text.includes("소프트웨어") || text.includes("db")) applicable.push(8);

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
  if ((accountText.includes("국내여비") && !accountText.includes("국외여비")) || accountText.includes("202-01")) {
    const expectedAmount = currentStaff * 20000 * 9 * 12;
    if (Math.abs(row.amount - expectedAmount) > 1000) {
      errors.push(`국내여비: 현원 ${currentStaff} × 20,000 × 9 × 12 = ${expectedAmount.toLocaleString()}원`);
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

// 세출예산내역서(편성 시트)의 편성목(item) 행이 사전절차 대상인지 판단한다.
// 상위 통계목(account) 코드와 편성목명·세부사업명 텍스트로 판단하며, 판단 근거가
// 있는 항목만 편성목 행 바로 위에 배너로 표시한다 (금액 등은 원본 문서를 벗어나지 않는다).
const HIERARCHY_PROCEDURE_BADGES: {
  label: string;
  test: (ctx: { accountCode: string; itemText: string; programText: string; amount: number }) => boolean;
}[] = [
  { label: "투심", test: ({ amount }) => amount >= 2000000 },
  // 306(출연금)은 307/308(민간이전·자치단체등이전, 실제 "보조금" 성격) 및 402/403(자본이전)과는
  // 다른 계정이라 "보조금"으로 같이 묶으면 출연금 항목이 잘못된 뱃지를 달게 된다 - 따로 분리한다.
  { label: "출연금", test: ({ accountCode }) => /^306/.test(accountCode) },
  { label: "보조금", test: ({ accountCode }) => /^(307|308|402|403)/.test(accountCode) },
  { label: "행사", test: ({ itemText, programText }) => /행사|축제|경기대회|공연/.test(`${itemText} ${programText}`) },
  { label: "자산", test: ({ accountCode }) => /^405/.test(accountCode) },
  { label: "기간제", test: ({ itemText }) => /기간제|임시직/.test(itemText) },
];

function getHierarchyItemBadges(row: BudgetHierarchyRow, accountLabel: string, programLabel: string): string[] {
  const accountCode = accountLabel.match(/^\d+/)?.[0] ?? "";
  const itemText = `${row.statisticsCode ?? ""} ${row.description ?? ""}`;
  const amount = row.budget || 0;
  return HIERARCHY_PROCEDURE_BADGES.filter((rule) =>
    rule.test({ accountCode, itemText, programText: programLabel, amount })
  ).map((rule) => rule.label);
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

function getHierarchyFormulaCheck(
  row: BudgetHierarchyRow,
  accountLabel: string,
  nearbyText: string,
  staff: { capacity: string; current: string } | undefined
): HierarchyFormulaCheck | null {
  if (row.level !== "item") return null;
  const accountCode = accountLabel.match(/^\d+/)?.[0] ?? "";
  const itemCode = row.statisticsCode?.match(/^\d+/)?.[0] ?? "";
  const capacity = parseInt(staff?.capacity || "0", 10);
  const current = parseInt(staff?.current || "0", 10);

  if (accountCode === "202" && itemCode === "01") {
    const actual = (row.budget || 0) * 1000;
    const expected = current * 20000 * 9 * 12;
    if (Math.abs(actual - expected) > 1000) {
      return { name: "국내여비", message: `국내여비: 기준 ${expected.toLocaleString()}원 / 등록 ${actual.toLocaleString()}원` };
    }
  }
  if (accountCode === "201" && itemCode === "01") {
    if (/일반수용비/.test(nearbyText)) {
      const actual = parseTrailingAmountWon(nearbyText);
      const expected = capacity * 750000;
      if (actual !== null && Math.abs(actual - expected) > 1000) {
        return { name: "일반수용비", message: `일반수용비: 기준 ${expected.toLocaleString()}원 / 등록 ${actual.toLocaleString()}원` };
      }
    }
    if (/급식비/.test(nearbyText)) {
      const actual = parseTrailingAmountWon(nearbyText);
      const expected = capacity * 600000;
      if (actual !== null && Math.abs(actual - expected) > 1000) {
        return { name: "급식비", message: `급식비: 기준 ${expected.toLocaleString()}원 / 등록 ${actual.toLocaleString()}원` };
      }
    }
  }

  const combinedText = `${row.statisticsCode ?? ""} ${row.description ?? ""} ${nearbyText}`;
  if (/수당/.test(combinedText)) {
    return { name: "수당", message: "수당 항목 - 산출근거 직접 확인 필요" };
  }

  return null;
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

function HeaderFilterDropdown({
  label,
  value,
  options,
  onChange,
  align = "left",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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
        <span className="th-filter-label" title={value || undefined}>{value || label}</span>
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
              aria-selected={value === ""}
              className={`dropdown-option ${value === "" ? "selected" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="option-text">전체</span>
              {value === "" && <Check size={14} className="option-check" />}
            </button>
            {filtered.length === 0 && <div className="dropdown-empty">일치하는 항목이 없습니다</div>}
            {filtered.map((option) => (
              <button
                type="button"
                key={option}
                role="option"
                aria-selected={option === value}
                className={`dropdown-option ${option === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span className="option-text">{option}</span>
                {option === value && <Check size={14} className="option-check" />}
              </button>
            ))}
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
  const [budgetHierarchyRows, setBudgetHierarchyRows] = useState<BudgetHierarchyRow[]>([]);
  const [programMemos, setProgramMemos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('budgetProgramMemos');
    return saved ? JSON.parse(saved) : {};
  });
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [hiddenMemoIds, setHiddenMemoIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('budgetHiddenMemoIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [executionData, setExecutionData] = useState<BudgetExecution[]>(() => {
    const saved = localStorage.getItem('budgetExecution2026Rows');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingRow, setEditingRow] = useState<BudgetRow | null>(null);
  const [editingHierarchyRow, setEditingHierarchyRow] = useState<BudgetHierarchyRow | null>(null);
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
  const [toast, setToast] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hierarchyPage, setHierarchyPage] = useState(1);
  const HIERARCHY_ROWS_PER_PAGE = 30;
  const [hierarchySearch, setHierarchySearch] = useState("");
  const [hierarchyProgramFilter, setHierarchyProgramFilter] = useState("");
  const [hierarchyItemFilter, setHierarchyItemFilter] = useState("");
  const [rowSpacing, setRowSpacing] = useState(4);
  const [programFilter, setProgramFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('columnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  const [resizingColumn, setResizingColumn] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const DEFAULT_HIERARCHY_COLUMN_WIDTHS: Record<string, number> = {
    label: 168, budget: 120, previous: 120, difference: 120, statisticsCode: 152, description: 310, review: 90, edit: 60,
  };
  const getHierarchyColumnWidth = (key: string) => columnWidths[key] ?? DEFAULT_HIERARCHY_COLUMN_WIDTHS[key];
  const staffModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const hierarchyEditModalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Esc로 모달 닫기
  useEffect(() => {
    if (!showStaffModal && !editingRow && !editingHierarchyRow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowStaffModal(false);
        setEditingRow(null);
        setEditingHierarchyRow(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showStaffModal, editingRow, editingHierarchyRow]);

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
    if (editingRow) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      editModalRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [href]")?.focus();
    } else {
      lastFocusedRef.current?.focus();
    }
  }, [Boolean(editingRow)]);

  useEffect(() => {
    if (editingHierarchyRow) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      hierarchyEditModalRef.current?.querySelector<HTMLElement>("button, input, select, textarea, [href]")?.focus();
    } else {
      lastFocusedRef.current?.focus();
    }
  }, [Boolean(editingHierarchyRow)]);

  useEffect(() => {
    loadDataFromServer();
    loadExecutionDataFromServer();
    loadCsvData();
    loadStaffDataFromServer();
    loadProgramMemosFromServer(department);
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

  const loadCsvData = async () => {
    try {
      const response = await fetch('/api/cloud-sync');
      if (response.ok) {
        const { data } = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setBudgetHierarchyRows(data);
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

  // 세출예산내역서 표의 각 행에 대해 가장 가까운 상위 계층(부서/정책/단위/세부사업/편성목/통계목) 행을 찾아둔다.
  // 검색·필터 드롭다운이 "이 행의 조상이 조건에 맞으면 전체 하위행도 같이 보여준다" 식으로 동작하는 데 쓰인다.
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

  // 세부사업 드롭다운 필터 값 목록 (세부사업명만, 중복 제거)
  const uniqueHierarchyPrograms = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const row of budgetHierarchyRows) {
      if (row.level === 'program' && row.label && !seen.has(row.label)) {
        seen.add(row.label);
        list.push(row.label);
      }
    }
    return list;
  }, [budgetHierarchyRows]);

  // 통계목 드롭다운 필터 값 목록 (통계목만, 중복 제거)
  const uniqueHierarchyItems = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const row of budgetHierarchyRows) {
      if (row.level === 'item' && row.statisticsCode && !seen.has(row.statisticsCode)) {
        seen.add(row.statisticsCode);
        list.push(row.statisticsCode);
      }
    }
    return list;
  }, [budgetHierarchyRows]);

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
    if (hierarchyProgramFilter) {
      intersect(expandHierarchyMatches(budgetHierarchyRows, hierarchyAncestors, (row) =>
        row.level === 'program' && row.label === hierarchyProgramFilter));
    }
    if (hierarchyItemFilter) {
      intersect(expandHierarchyMatches(budgetHierarchyRows, hierarchyAncestors, (row) =>
        row.level === 'item' && row.statisticsCode === hierarchyItemFilter));
    }

    return budgetHierarchyRows.filter((row) => keep!.has(row.id));
  }, [budgetHierarchyRows, hierarchyAncestors, department, hierarchySearch, hierarchyProgramFilter, hierarchyItemFilter]);

  useEffect(() => {
    setHierarchyPage(1);
  }, [department, hierarchySearch, hierarchyProgramFilter, hierarchyItemFilter]);

  // 2026 본예산액 카드: 부서별 예산집행현황표(executionData)를 부서로 필터한 "본예산" 합계.
  const budget2026Original = useMemo(() => {
    if (executionData.length === 0) return 0;
    const filtered = department ? executionData.filter(row => row.department === department) : executionData;
    return filtered.reduce((sum, row) => sum + row.original, 0);
  }, [executionData, department]);

  // 2026 최종예산액 카드: 같은 표의 본예산 + 추경 + 성립전 합계.
  const budget2026Total = useMemo(() => {
    if (executionData.length === 0) return 0;
    const filtered = department ? executionData.filter(row => row.department === department) : executionData;
    return filtered.reduce((sum, row) => sum + row.original + row.supplementary + row.preEstablishment, 0);
  }, [executionData, department]);

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

  const saveProgramMemosToServer = (nextMemos: Record<string, string>, nextHiddenMemoIds: string[]) => {
    fetch('/api/cloud-sync?type=memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programMemos: nextMemos, hiddenMemoIds: nextHiddenMemoIds }),
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

  const parseNumber = (value: unknown) => Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;
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

    for (let idx = startIdx; idx < cellRows.length; idx++) {
      const cleanCells = (cellRows[idx] || []).map((cell) => (cell ?? "").replace(/^"+|"+$/g, "").trim());
      if (!cleanCells.some((cell) => cell)) continue;

      const hierIndent = [0, 1, 2, 3, 4].findIndex((i) => cleanCells[i]);
      const budget = parseNumber(cleanCells[5]);
      const previous = parseNumber(cleanCells[6]);
      const difference = parseNumber(cleanCells[7]);
      const col8 = cleanCells[8] || "";
      const col9 = cleanCells[9] || "";
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
    localStorage.setItem('budgetHierarchyRows', JSON.stringify(rows));
    const blocks = groupRowsByDepartment(rows);
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

  const saveHierarchyItemEdit = async () => {
    if (!editingHierarchyRow) return;
    const edited = {
      ...editingHierarchyRow,
      difference: (editingHierarchyRow.budget || 0) - (editingHierarchyRow.previous || 0),
    };
    const updatedRows = budgetHierarchyRows.map((row) => row.id === edited.id ? edited : row);
    setBudgetHierarchyRows(updatedRows);
    setEditingHierarchyRow(null);
    showToast(`${edited.statisticsCode || edited.label || '편성목'} 항목을 저장했습니다.`);
    const saved = await saveHierarchyToServer(updatedRows);
    if (!saved) showToast('클라우드 저장에 실패했습니다 (이 기기에만 저장됨)');
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
    <Layout showToast={showToast}>
      <div className="page-content">
          <section className="page-heading">
            <div className="title-area">
              <div className="title-wrapper budget-page-title">
                <h1>{year} 본예산 편성 검토</h1>
              </div>
              <div className="action-row">
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
                        <button onClick={() => { showToast("인쇄 미리보기를 준비했습니다."); setShowSaveMenu(false); }}>
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
            <div className="context-bar">
              <div className="select-field"><span>회계연도</span><Dropdown value={year} options={yearOptions} onChange={setYear} label="회계연도" /></div>
              <div className="select-field"><span>편성 부서</span><Dropdown value={department} options={departmentOptions} onChange={(value) => { setDepartment(value); localStorage.setItem('selectedDepartment', value); setCurrentPage(1); setProgramFilter(""); setAccountFilter(""); setSearch(""); setStatusFilter("전체"); }} label="편성 부서" /></div>
              <div className="select-field"><span>정현원</span><button className="staff-summary" onClick={() => setShowStaffModal(true)}><UsersRound size={17} /><span>정원 <b>{staffData[department]?.capacity || "-"}명</b></span><span>현원 <b>{staffData[department]?.current || "-"}명</b></span></button></div>
            </div>
          </section>

          <section className="metric-grid" aria-label="예산 요약">
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 요구액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 4px)" }}>{formatMillion(hierarchyTotals.amount)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 신규 예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 4px)" }}>{formatMillion(newProjectTotal)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#e8b84b" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2026 본예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 4px)" }}>{new Intl.NumberFormat("ko-KR").format(Math.round(budget2026Original / 1000000))}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#e8b84b" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2026 최종예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 4px)" }}>{new Intl.NumberFormat("ko-KR").format(Math.round(budget2026Total / 1000000))}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card metric-alert">
              <div className="metric-header">
                <div className="metric-top"><span>점검 · 오류</span><AlertCircle size={18} /></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 4px)" }}>0<span className="metric-unit">건</span></strong>
            </article>
          </section>

          <section className="table-panel ledger-paper" style={{ background: '#ece7db' }}>
            <div className="table-heading" style={{ minHeight: 0, padding: '8px 19px 8px 30px' }}>
              <div className="table-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ fontSize: '20px', color: '#1e3a5f', fontWeight: '600' }}>세출예산내역서</div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
              <table className="budget-table hierarchy-budget-table" style={{ width: '100%', minWidth: '1140px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  {(['label', 'budget', 'previous', 'difference', 'statisticsCode', 'description', 'review', 'edit'] as const).map((key) => (
                    <col key={key} style={{ width: `${getHierarchyColumnWidth(key)}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr style={{ background: '#1e3a5f', position: 'sticky', top: 0, zIndex: 2 }}>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                      <HeaderFilterDropdown
                        label="부서/정책/단위/세부/과목"
                        value={hierarchyProgramFilter}
                        options={uniqueHierarchyPrograms}
                        onChange={setHierarchyProgramFilter}
                      />
                      {renderHierarchyResizeHandle('label')}
                    </th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>예산액{renderHierarchyResizeHandle('budget')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>전년도{renderHierarchyResizeHandle('previous')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>증감{renderHierarchyResizeHandle('difference')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '15px' }}>
                      <HeaderFilterDropdown
                        label="통계목"
                        value={hierarchyItemFilter}
                        options={uniqueHierarchyItems}
                        onChange={setHierarchyItemFilter}
                        align="right"
                      />
                      {renderHierarchyResizeHandle('statisticsCode')}
                    </th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>산출근거{renderHierarchyResizeHandle('description')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>검토{renderHierarchyResizeHandle('review')}</th>
                    <th style={{ position: 'relative', textAlign: 'center', padding: '12px', fontWeight: '600', color: '#ffffff', fontSize: '16px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>편집{renderHierarchyResizeHandle('edit')}</th>
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
                    const nextNoteTextByItemId: Record<string, string> = {};
                    filteredHierarchyRows.forEach((row, idx) => {
                      if (row.level !== 'item') return;
                      const noteTexts: string[] = [];
                      for (let j = idx + 1; j < filteredHierarchyRows.length; j++) {
                        const nextRow = filteredHierarchyRows[j];
                        if (nextRow.level !== 'note') break;
                        noteTexts.push(`${nextRow.statisticsCode ?? ''} ${nextRow.description ?? ''}`);
                      }
                      if (noteTexts.length > 0) nextNoteTextByItemId[row.id] = noteTexts.join(' ');
                    });

                    const pageStart = (hierarchyPage - 1) * HIERARCHY_ROWS_PER_PAGE;
                    const pagedRows = filteredHierarchyRows.slice(pageStart, pageStart + HIERARCHY_ROWS_PER_PAGE);

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

                    const getBackground = () => {
                      return 'transparent';
                    };

                    const getFontSize = () => {
                      if (row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program') return '15px';
                      if (row.level === 'item' || row.level === 'note') return '14px';
                      return '13px';
                    };

                    // 부서~세부사업(첫 컬럼) 전용: 나머지 레벨은 기존과 동일하고, 상위 레벨만 1포인트 크게.
                    const getLabelFontSize = () => {
                      if (row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program') return '16px';
                      return getFontSize();
                    };

                    // 통계목 컬럼 전용: 통계목(item)과 부기명(note)만 1포인트 크게.
                    const getStatCodeFontSize = () => {
                      if (row.level === 'item' || row.level === 'note') return '15px';
                      return getFontSize();
                    };

                    const getFontWeight = () => {
                      if (row.level === 'dept') return '600';
                      if (row.level === 'policy') return '500';
                      return 'normal';
                    };

                    // 예산액·전년도·증감 컬럼 전용: 부서~세부사업(상위 레벨)은 기존 굵기/크기 그대로 유지하고,
                    // 그 아래(편성목·통계목·부기 등)는 레벨에 상관없이 동일하게 얇고 한 단계 작은 글씨로 통일한다.
                    const isUpperAmountLevel = row.level === 'dept' || row.level === 'policy' || row.level === 'unit' || row.level === 'program';
                    const getAmountFontSize = () => (isUpperAmountLevel ? '14px' : '13px');
                    const getAmountFontWeight = () => (isUpperAmountLevel ? '600' : '400');

                    const formatNumber = (num?: number) => {
                      if (!num && num !== 0) return '';
                      return new Intl.NumberFormat('ko-KR').format(num);
                    };

                    const memoProgramId = memoAfterRowId[row.id];
                    const isEditingMemo = memoProgramId && editingMemoId === memoProgramId;
                    const memoRow = memoProgramId && !hiddenMemoIds.includes(memoProgramId) && (
                      <tr key={`${row.id}-memo`}>
                        <td colSpan={8} style={{ padding: '4px 16px', background: 'rgba(60, 50, 35, 0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isEditingMemo ? (
                              <>
                                <input
                                  type="text"
                                  value={memoDraft}
                                  onChange={(event) => setMemoDraft(event.target.value)}
                                  placeholder="메모"
                                  autoFocus
                                  style={{ flex: 1, background: 'transparent', border: '1px dashed #d7dbe0', borderRadius: '4px', padding: '4px 8px', color: '#111827', fontSize: '12px' }}
                                />
                                <button
                                  type="button"
                                  aria-label="메모 저장"
                                  title="저장"
                                  onClick={() => { updateProgramMemo(memoProgramId, memoDraft); setEditingMemoId(null); }}
                                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', border: '1px solid #5b9bf0', borderRadius: '4px', background: 'rgba(91, 155, 240, 0.15)', color: '#5b9bf0', cursor: 'pointer' }}
                                >
                                  <Check size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <span style={{ flex: 1, fontSize: '12px', color: programMemos[memoProgramId] ? '#111827' : '#6b7280', padding: '4px 8px' }}>
                                  {programMemos[memoProgramId] || '메모'}
                                </span>
                                <button
                                  type="button"
                                  aria-label="메모 수정"
                                  title="수정"
                                  onClick={() => { setMemoDraft(programMemos[memoProgramId] ?? ''); setEditingMemoId(memoProgramId); }}
                                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', border: '1px solid #b7c2cf', borderRadius: '4px', background: 'transparent', color: '#475569', cursor: 'pointer' }}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  aria-label="메모 줄 삭제"
                                  title="이 메모 줄 삭제"
                                  onClick={() => hideMemoRow(memoProgramId)}
                                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', border: '1px solid #b7c2cf', borderRadius: '4px', background: 'transparent', color: '#9b2c2c', cursor: 'pointer' }}
                                >
                                  <X size={12} />
                                </button>
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
                    const formulaCheck = getHierarchyFormulaCheck(
                      row, rowAncestors?.accountRow?.label ?? '', nextNoteTextByItemId[row.id] ?? '', staffData[department]
                    );
                    const itemHasFormula = !!formulaCheck;
                    const formulaLabel = formulaCheck?.message ?? '';
                    const badgeRow = (itemBadges.length > 0 || itemHasFormula) && (
                      <tr key={`${row.id}-badges`}>
                        <td colSpan={8} style={{ paddingLeft: getPaddingLeft(), paddingRight: '16px', paddingTop: '6px', paddingBottom: '6px', background: 'rgba(230, 126, 34, 0.08)', borderLeft: '3px solid #e67e22', textAlign: 'left' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: '6px' }}>
                            {itemBadges.map((badge) => (
                              <span key={badge} style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', background: 'rgba(230, 126, 34, 0.15)', color: '#e67e22', fontSize: '12px', fontWeight: 600 }}>
                                {badge}
                              </span>
                            ))}
                            {itemHasFormula && (
                              <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', background: 'rgba(91, 155, 240, 0.15)', color: '#5b9bf0', fontSize: '12px', fontWeight: 600 }}>
                                산출식 · {formulaLabel}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );

                    return (
                      <Fragment key={row.id}>
                        {badgeRow}
                        <tr>
                          <td
                            onClick={handleProgramClick}
                            style={{
                              paddingLeft: getPaddingLeft(),
                              paddingRight: '8px',
                              background: getBackground(),
                              fontSize: getLabelFontSize(),
                              fontWeight: getFontWeight(),
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
                            {row.label}
                          </td>
                          <td style={{ textAlign: 'right', background: getBackground(), fontSize: getAmountFontSize(), fontWeight: getAmountFontWeight(), color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '10px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            {formatNumber(row.budget)}
                          </td>
                          <td style={{ textAlign: 'right', background: getBackground(), fontSize: getAmountFontSize(), fontWeight: getAmountFontWeight(), color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '10px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            {formatNumber(row.previous)}
                          </td>
                          <td style={{ textAlign: 'right', background: getBackground(), fontSize: getAmountFontSize(), fontWeight: getAmountFontWeight(), color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '10px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            {formatNumber(row.difference)}
                          </td>
                          <td style={{ background: getBackground(), fontSize: getStatCodeFontSize(), color: getColor(), textAlign: 'left', verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingLeft: '16px', whiteSpace: 'nowrap', overflow: 'visible', position: 'relative', zIndex: 1 }}>
                            {row.statisticsCode || ''}
                          </td>
                          <td style={{ background: getBackground(), fontSize: getFontSize(), color: getColor(), whiteSpace: 'pre-line', textAlign: 'right', verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, paddingRight: '16px', borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            {row.description || ''}
                          </td>
                          <td style={{ background: getBackground(), fontSize: getFontSize(), textAlign: 'center', verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing, borderRight: '1px solid rgba(60,50,35,0.12)' }}>
                            {(itemBadges.length > 0 || itemHasFormula) && (
                              <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '4px', background: 'rgba(230, 126, 34, 0.12)', border: '1px solid rgba(230, 126, 34, 0.4)', fontSize: '11px', fontWeight: 600 }}>
                                {itemBadges.length > 0 && <span style={{ color: '#e67e22' }}>사전</span>}
                                {itemBadges.length > 0 && itemHasFormula && <span style={{ color: '#e67e22' }}>, </span>}
                                {itemHasFormula && <span style={{ color: '#5b9bf0' }}>산출식</span>}
                              </span>
                            )}
                          </td>
                          <td style={{ background: getBackground(), fontSize: getFontSize(), textAlign: 'center', color: getColor(), verticalAlign: 'top', paddingTop: rowSpacing, paddingBottom: rowSpacing }}>
                            {row.level === 'item' && (
                              <button
                                type="button"
                                aria-label="편성목 편집"
                                title="편성목 편집"
                                onClick={() => setEditingHierarchyRow(row)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', color: 'inherit', padding: 0 }}
                              >
                                ✎
                              </button>
                            )}
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

            <div className="table-footer" style={{ marginTop: '16px' }}>
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
            </div>
          </section>
        </div>

      {showStaffModal && <div className="modal-backdrop" onMouseDown={() => setShowStaffModal(false)}><div className="modal-card staff-modal-card" ref={staffModalRef} role="dialog" aria-modal="true" aria-labelledby="staff-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, staffModalRef.current)}><div className="modal-head"><div><span>DEPARTMENT PROFILE</span><h2 id="staff-modal-title">부서별 정원·현원 설정</h2></div><button className="close-button" onClick={() => setShowStaffModal(false)} aria-label="닫기"><X size={19} /></button></div><div className="modal-fields staff-modal-fields">{DEPARTMENTS.map((dept) => (<div key={dept} className="staff-dept-card"><h3>{dept}</h3><label>정원<input value={staffData[dept]?.capacity || ""} onChange={(event) => setStaffData({...staffData, [dept]: {...(staffData[dept] || {}), capacity: event.target.value}})} inputMode="numeric" />명</label><label>현원<input value={staffData[dept]?.current || ""} onChange={(event) => setStaffData({...staffData, [dept]: {...(staffData[dept] || {}), current: event.target.value}})} inputMode="numeric" />명</label></div>))}</div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setShowStaffModal(false)}>취소</AppButton><AppButton variant="primary" onClick={saveStaff}>저장</AppButton></div></div></div>}
      {editingRow && <div className="modal-backdrop" onMouseDown={() => setEditingRow(null)}><div className="modal-card edit-row-modal" ref={editModalRef} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, editModalRef.current)}><div className="modal-head"><div><span>BUDGET ITEM / EDIT</span><h2 id="edit-modal-title">예산 항목 편집</h2></div><button className="close-button" onClick={() => setEditingRow(null)} aria-label="닫기"><X size={19} /></button></div><div className="edit-grid"><label>정책<input value={editingRow.policy} onChange={(event) => setEditingRow({ ...editingRow, policy: event.target.value })} /></label><label>세부사업<input value={editingRow.program} onChange={(event) => setEditingRow({ ...editingRow, program: event.target.value })} /></label><label className="edit-wide">산출내역<input value={editingRow.detail} onChange={(event) => setEditingRow({ ...editingRow, detail: event.target.value })} /></label><label>요구액(천원)<input value={editingRow.amount} onChange={(event) => setEditingRow({ ...editingRow, amount: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>전년도(천원)<input value={editingRow.previous} onChange={(event) => setEditingRow({ ...editingRow, previous: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>시비(천원)<input value={editingRow.city} onChange={(event) => setEditingRow({ ...editingRow, city: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>국비(천원)<input value={editingRow.national} onChange={(event) => setEditingRow({ ...editingRow, national: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>도비(천원)<input value={editingRow.province} onChange={(event) => setEditingRow({ ...editingRow, province: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>기타(천원)<input value={editingRow.other} onChange={(event) => setEditingRow({ ...editingRow, other: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>상태<select value={editingRow.status} onChange={(event) => setEditingRow({ ...editingRow, status: event.target.value as Status })}><option>정상</option><option>주의</option><option>오류</option><option>사전</option></select></label><label className="edit-wide">검토 메모<input value={editingRow.note ?? ""} onChange={(event) => setEditingRow({ ...editingRow, note: event.target.value })} placeholder="검토 메모를 입력하세요" /></label></div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setEditingRow(null)}>취소</AppButton><AppButton variant="primary" onClick={saveRowEdit}>저장</AppButton></div></div></div>}

      {editingHierarchyRow && <div className="modal-backdrop" onMouseDown={() => setEditingHierarchyRow(null)}><div className="modal-card edit-row-modal" ref={hierarchyEditModalRef} role="dialog" aria-modal="true" aria-labelledby="hierarchy-edit-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, hierarchyEditModalRef.current)}><div className="modal-head"><div><span>BUDGET LINE ITEM / EDIT</span><h2 id="hierarchy-edit-modal-title">편성목 편집</h2></div><button className="close-button" onClick={() => setEditingHierarchyRow(null)} aria-label="닫기"><X size={19} /></button></div><div className="edit-grid"><label>통계목<input value={editingHierarchyRow.statisticsCode ?? ""} onChange={(event) => setEditingHierarchyRow({ ...editingHierarchyRow, statisticsCode: event.target.value })} /></label><label>예산액(천원)<input value={editingHierarchyRow.budget ?? 0} onChange={(event) => setEditingHierarchyRow({ ...editingHierarchyRow, budget: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>전년도(천원)<input value={editingHierarchyRow.previous ?? 0} onChange={(event) => setEditingHierarchyRow({ ...editingHierarchyRow, previous: parseNumber(event.target.value) })} inputMode="numeric" /></label><label className="edit-wide">산출근거<input value={editingHierarchyRow.description ?? ""} onChange={(event) => setEditingHierarchyRow({ ...editingHierarchyRow, description: event.target.value })} /></label></div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setEditingHierarchyRow(null)}>취소</AppButton><AppButton variant="primary" onClick={saveHierarchyItemEdit}>저장</AppButton></div></div></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </Layout>
  );
}
