/*
 * Civic Ledger 스타일 기준: 사용자가 제공한 참조 대시보드의 어두운 네이비 행정 업무 화면을 보존한다.
 * 이번 수정 범위는 데스크톱 전체 가독성 향상이며, 정보 구조와 상태 체계는 유지하고 타이포그래피만 한 단계 크게 잡는다.
 */
import { useMemo, useRef, useState, useEffect } from "react";
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
  ["change", "증감"],
  ["city", "시비"],
  ["national", "국비"],
  ["province", "도비"],
  ["other", "기타"],
  ["previous", "전년도"],
  ["status", "검토"],
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
  const [executionData, setExecutionData] = useState<BudgetExecution[]>(() => {
    const saved = localStorage.getItem('budgetExecution2026Rows');
    return saved ? JSON.parse(saved) : [];
  });
  const [editingRow, setEditingRow] = useState<BudgetRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState("2027");
  const [department, setDepartment] = useState("");
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
  const [programFilter, setProgramFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('columnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  const [resizingColumn, setResizingColumn] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const staffModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Esc로 모달 닫기
  useEffect(() => {
    if (!showStaffModal && !editingRow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowStaffModal(false);
        setEditingRow(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showStaffModal, editingRow]);

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

  // 페이지 로드 시 클라우드 데이터를 우선 불러오고, 클라우드가 설정되지 않은 경우에만 localStorage를 사용한다.
  useEffect(() => {
    loadDataFromServer();
    loadExecutionDataFromServer();
  }, []);

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

  // 서버 API 함수들
  const loadDataFromServer = async () => {
    try {
      const response = await fetch('/api/budget/load');
      if (!response.ok) throw new Error('서버 로드 실패');
      const { data } = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        setBudgetRows(data);
        localStorage.setItem('budgetRows', JSON.stringify(data));
        return;
      }
      const saved = localStorage.getItem('budgetRows');
      if (saved) {
        const savedRows = JSON.parse(saved);
        if (Array.isArray(savedRows) && savedRows.length > 0) {
          setBudgetRows(savedRows);
          await saveDataToServer(savedRows);
        }
      }
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
      const matchesDepartment = !department || row.department === department;
      return matchesSearch && matchesStatus && matchesProgram && matchesAccount && matchesDepartment;
    });
    return filtered;
  }, [budgetRows, search, statusFilter, programFilter, accountFilter, department]);

  const departmentRows = useMemo(
    () => department ? budgetRows.filter((row) => row.department === department) : budgetRows,
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

  const budget2026Total = useMemo(() => {
    if (executionData.length === 0) return 0;
    const filtered = department ? executionData.filter(row => row.department === department) : executionData;
    return filtered.reduce((sum, row) => sum + row.original + row.supplementary + row.preEstablishment + row.reserve, 0);
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

  const autoFitColumns = () => {
    const table = tableRef.current?.querySelector<HTMLTableElement>(".budget-table");
    if (!table) return;

    const nextWidths: Record<string, number> = {};
    const headerCells = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
    const rowCells = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"));
    visibleColumns.forEach((key, columnIndex) => {
      const cells = [headerCells[columnIndex], ...rowCells.map((row) => row.cells[columnIndex])].filter(Boolean);
      const measuredWidth = Math.max(...cells.map((cell) => cell.scrollWidth), 0) + 20;
      const minWidth = key === "policy" ? 200 : key === "detail" ? 150 : 80;
      const maxWidth = key === "policy" || key === "detail" ? 420 : 180;
      nextWidths[key] = Math.min(maxWidth, Math.max(minWidth, measuredWidth));
    });
    setColumnWidths((currentWidths) => ({ ...currentWidths, ...nextWidths }));
    showToast("현재 내용에 맞춰 열 너비를 자동 조정했습니다.");
  };

  const saveStaff = () => {
    setShowStaffModal(false);
    showToast('부서별 정원·현원이 저장되었습니다.');
  };

  const parseNumber = (value: unknown) => Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;
  const pick = (record: Record<string, unknown>, keys: string[]) => {
    const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(record, candidate));
    return key ? record[key] : "";
  };

  const handleExcelUpload = async (file?: File) => {
    if (!file) return;
    if (!department) {
      showToast("먼저 편성 부서를 선택해 주세요.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      const skippedDepartmentCount = 0;
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
          const unitProgram = String(pick(record, ["단위사업명"])) || "";
          const subProgram = String(pick(record, ["세부사업명"])) || "미입력 사업";
          const programDisplay = unitProgram ? `${unitProgram}\n${subProgram}` : subProgram;
          return {
            id: Date.now() + index,
            policy: String(pick(record, ["정책사업명"])) || "미분류 정책",
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
      setBudgetRows((prevRows) => {
        const otherDepartmentRows = prevRows.filter((row) => row.department !== department);
        const allRows = [...otherDepartmentRows, ...nextRows];
        showToast(`${department} 기존 자료를 초기화하고 ${nextRows.length}개를 등록했습니다.${skippedDepartmentCount > 0 ? ` (${skippedDepartmentCount}개 타 부서 행 제외)` : ""}`);
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
      showToast("엑셀 파일을 읽지 못했습니다. 첫 번째 시트와 열 이름을 확인해 주세요.");
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
      증감: row.amount - row.previous,
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

  const downloadTemplate = () => {
    const template = [{
      정책사업명: "노인복지 증진",
      단위사업명: "경로당 운영지원",
      세부사업명: "사업명을 입력하세요",
      편성목코드: "300",
      통계목코드: "302-03",
      통계목명: "민간경상보조",
      요구산출근거: "산출근거를 입력하세요",
      요구산출근거식: "단가 × 수량",
      요구액: 0,
      자체재원: 0,
      국고보조금: 0,
      광역보조금: 0,
      기타: 0,
      전년도: 0,
    }];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "예산편성");
    XLSX.writeFile(workbook, "2027_본예산_편성요구서_양식.xlsx");
    showToast("엑셀 양식을 다운로드했습니다.");
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
          {row.note && <span className={`row-note row-note-${row.status}`}>{row.note}</span>}
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
        </div>
      );
    }
    if (key === "status") {
      const hasFormula = row.formulaErrors && row.formulaErrors.length > 0;
      const hasProcedure = row.procedures && row.procedures.length > 0;

      if (hasFormula || hasProcedure) {
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap' }}>
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
                  transition: 'all 0.2s'
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
    if (key === "change") {
      return <span className="numeric-cell">{formatAmount(row.amount - row.previous)}</span>;
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
                <button type="button" className="template-link" onClick={downloadTemplate}>업로드 양식</button>
                <label className="icon-stack-btn" aria-label="업로드" data-tooltip="업로드">
                  <div className="icon-stack-front"><Upload size={20} /></div>
                  <input ref={fileInputRef} className="upload-input" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => handleExcelUpload(event.target.files?.[0])} />
                </label>
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
                </div>
              </div>
            </div>
            <div className="context-bar">
              <div className="select-field"><span>회계연도</span><Dropdown value={year} options={yearOptions} onChange={setYear} label="회계연도" /></div>
              <div className="select-field"><span>편성 부서</span><Dropdown value={department} options={departmentOptions} onChange={(value) => { setDepartment(value); setCurrentPage(1); setProgramFilter(""); setAccountFilter(""); setSearch(""); setStatusFilter("전체"); }} label="편성 부서" /></div>
              <div className="select-field"><span>정현원</span><button className="staff-summary" onClick={() => setShowStaffModal(true)}><UsersRound size={17} /><span>정원 <b>{staffData[department]?.capacity || "-"}명</b></span><span>현원 <b>{staffData[department]?.current || "-"}명</b></span></button></div>
            </div>
          </section>

          <section className="metric-grid" aria-label="예산 요약">
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 요구액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px", fontSize: "calc(1rem + 4px)" }}>{formatMillion(totals.amount)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2027 신규 사업 예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px" }}>0<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#e8b84b" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2026 본예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px" }}>{formatMillion(totals.previous)}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card" style={{ "--tint": "#e8b84b" } as React.CSSProperties}>
              <div className="metric-header">
                <div className="metric-top"><span>2026 예산액</span></div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px" }}>{new Intl.NumberFormat("ko-KR").format(Math.round(budget2026Total / 1000000))}<span className="metric-unit">백만원</span></strong>
            </article>
            <article className="metric-card metric-alert">
              <div className="metric-header">
                <div className="metric-top"><span>점검 · 오류</span><AlertCircle size={18} /></div>
                <div className="metric-sub">오류 {budgetRows.filter(r => r.status === "오류").length} · 주의 {budgetRows.filter(r => r.status === "주의").length}</div>
              </div>
              <strong style={{ textAlign: "right", marginTop: "16px" }}>{budgetRows.filter(r => r.status === "오류").length}<span className="metric-unit">건</span></strong>
            </article>
          </section>

          <section className="table-panel">
            <div className="table-heading">
              <div className="table-title"><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{department && <span className="dept-pill">{department}</span>}<div style={{ fontSize: '20px', color: '#9fb0c8', fontWeight: '600' }}>세출예산요구서</div></div></div>
            </div>

            <div className="filter-row">
              <span className="filter-label"><Filter size={15} />필터</span>
              <button className={`filter-chip ${statusFilter === "전체" ? "selected" : ""}`} onClick={() => setStatusFilter("전체")}>전체</button>
              {(["정상", "사전"] as const).map((filter) => <button key={filter} className={`filter-chip ${statusFilter === filter ? "selected" : ""} filter-${filter}`} onClick={() => setStatusFilter(filter)}><span className="chip-dot" />{filter}<b>{counts[filter]}</b></button>)}
              <button className="result-refresh" aria-label="새로고침" onClick={() => showToast("목록을 새로고침했습니다.")}><RefreshCw size={15} /></button>
              <button className="result-refresh" aria-label="열 너비 자동 조정" title="열 너비 자동 조정" onClick={autoFitColumns}><Settings2 size={15} /></button>
              <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="사업명, 산출내역 검색" aria-label="사업명, 산출내역 검색" />{search && <button aria-label="검색어 지우기" onClick={() => setSearch("")}><X size={14} /></button>}</div>
              <span className="unit-note">(단위: 천원)</span>
            </div>

            <div className="table-scroll" ref={tableRef}>
              <table className="budget-table">
                <thead><tr>{columns.filter(([key]) => visibleColumns.includes(key)).map(([key, label]) => <th key={key} className={`col-${key}`} style={{ position: 'relative', width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto', minWidth: key === "policy" ? '200px' : 'auto' }}>{key === "policy" || key === "account" ? <HeaderFilterDropdown label={key === "policy" ? "정책·단위·세부" : label} value={key === "policy" ? programFilter : accountFilter} options={key === "policy" ? uniquePrograms : uniqueAccounts} onChange={key === "policy" ? setProgramFilter : setAccountFilter} /> : label}<div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '6px', cursor: 'col-resize', background: resizingColumn?.key === key ? 'rgba(91, 155, 240, 0.5)' : 'transparent' }} onMouseDown={(e) => { e.preventDefault(); setResizingColumn({ key, startX: e.clientX, startWidth: columnWidths[key] || 120 }); }} /></th>)}<th className="col-action">편집</th></tr></thead>
                <tbody>
                  <tr className="total-row">{columns.filter(([key]) => visibleColumns.includes(key)).map(([key]) => <td key={key} className={`col-${key}`} style={key === "detail" ? { textAlign: "right", paddingRight: 12 } : undefined}>{key === "policy" ? "" : key === "account" ? "" : key === "detail" ? <b>합계</b> : key === "amount" ? <b>{formatAmount(totals.amount)}</b> : key === "change" ? <b>{formatAmount(totals.amount - totals.previous)}</b> : key === "city" ? <b>{formatAmount(totals.city)}</b> : key === "national" ? <b>{formatAmount(totals.national)}</b> : key === "province" ? <b>{formatAmount(totals.province)}</b> : key === "other" ? <b>{formatAmount(totals.other)}</b> : key === "previous" ? <b>{formatAmount(totals.previous)}</b> : key === "status" ? "" : null}</td>)}<td className="action-cell"></td></tr>
                  {paginatedRows.map((row) => <tr key={row.id} className={`budget-row row-${row.status}`}>
                    {columns.filter(([key]) => visibleColumns.includes(key)).map(([key]) => <td key={key} className={`col-${key}`}>{renderCell(row, key)}</td>)}
                    <td className="action-cell"><button className="row-edit" onClick={() => setEditingRow(row)} aria-label={`${row.program} 편집`}><Pencil size={15} /></button><button className="row-delete" onClick={() => deleteRow(row.id)} aria-label={`${row.program} 삭제`}><X size={15} /></button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-footer" style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
              <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
            </div>
          </section>
        </div>

      {showStaffModal && <div className="modal-backdrop" onMouseDown={() => setShowStaffModal(false)}><div className="modal-card staff-modal-card" ref={staffModalRef} role="dialog" aria-modal="true" aria-labelledby="staff-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, staffModalRef.current)}><div className="modal-head"><div><span>DEPARTMENT PROFILE</span><h2 id="staff-modal-title">부서별 정원·현원 설정</h2></div><button className="close-button" onClick={() => setShowStaffModal(false)} aria-label="닫기"><X size={19} /></button></div><div className="modal-fields staff-modal-fields">{DEPARTMENTS.map((dept) => (<div key={dept} className="staff-dept-card"><h3>{dept}</h3><label>정원<input value={staffData[dept]?.capacity || ""} onChange={(event) => setStaffData({...staffData, [dept]: {...(staffData[dept] || {}), capacity: event.target.value}})} inputMode="numeric" />명</label><label>현원<input value={staffData[dept]?.current || ""} onChange={(event) => setStaffData({...staffData, [dept]: {...(staffData[dept] || {}), current: event.target.value}})} inputMode="numeric" />명</label></div>))}</div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setShowStaffModal(false)}>취소</AppButton><AppButton variant="primary" onClick={saveStaff}>저장</AppButton></div></div></div>}
      {editingRow && <div className="modal-backdrop" onMouseDown={() => setEditingRow(null)}><div className="modal-card edit-row-modal" ref={editModalRef} role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapTabKey(event, editModalRef.current)}><div className="modal-head"><div><span>BUDGET ITEM / EDIT</span><h2 id="edit-modal-title">예산 항목 편집</h2></div><button className="close-button" onClick={() => setEditingRow(null)} aria-label="닫기"><X size={19} /></button></div><div className="edit-grid"><label>정책<input value={editingRow.policy} onChange={(event) => setEditingRow({ ...editingRow, policy: event.target.value })} /></label><label>세부사업<input value={editingRow.program} onChange={(event) => setEditingRow({ ...editingRow, program: event.target.value })} /></label><label className="edit-wide">산출내역<input value={editingRow.detail} onChange={(event) => setEditingRow({ ...editingRow, detail: event.target.value })} /></label><label>요구액(천원)<input value={editingRow.amount} onChange={(event) => setEditingRow({ ...editingRow, amount: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>전년도(천원)<input value={editingRow.previous} onChange={(event) => setEditingRow({ ...editingRow, previous: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>시비(천원)<input value={editingRow.city} onChange={(event) => setEditingRow({ ...editingRow, city: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>국비(천원)<input value={editingRow.national} onChange={(event) => setEditingRow({ ...editingRow, national: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>도비(천원)<input value={editingRow.province} onChange={(event) => setEditingRow({ ...editingRow, province: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>기타(천원)<input value={editingRow.other} onChange={(event) => setEditingRow({ ...editingRow, other: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>상태<select value={editingRow.status} onChange={(event) => setEditingRow({ ...editingRow, status: event.target.value as Status })}><option>정상</option><option>주의</option><option>오류</option><option>사전</option></select></label><label className="edit-wide">검토 메모<input value={editingRow.note ?? ""} onChange={(event) => setEditingRow({ ...editingRow, note: event.target.value })} placeholder="검토 메모를 입력하세요" /></label></div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setEditingRow(null)}>취소</AppButton><AppButton variant="primary" onClick={saveRowEdit}>저장</AppButton></div></div></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </Layout>
  );
}
