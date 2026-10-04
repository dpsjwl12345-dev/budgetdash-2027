import { useState, useMemo, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import Pagination from "@/components/Pagination";
import * as XLSX from "xlsx";
import {
  Filter,
  Search,
  X,
  Upload,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

type BudgetExecution = {
  id: number;
  year?: string;
  department: string;
  // 정책사업명·단위사업명·예비비는 예전 업로드 양식에만 있던 값이라 선택 항목으로 남겨둔다.
  policyName?: string;
  programName?: string;
  unitName: string;
  statisticsCode: string;
  formedAmount: number;
  original: number;
  supplementary: number;
  preEstablishment: number;
  reserve?: number;
  carryover: number;
  carryoverExplicit: number;
  carryoverAccident: number;
  carryoverContinuing: number;
  budget: number;
  executed: number;
  executionRate: number;
};

// 부서별로 엑셀 파일 하나씩 올리는 지출결의 단위의 집행내역. 위 BudgetExecution(정책사업
// 단위 집행률 요약)과는 별개 표라 데이터도 서버 테이블(budget_execution_details)도 따로 둔다.
type ExecutionDetail = {
  id: number;
  department: string;
  division: string;
  policyProgram: string;
  unitProgram: string;
  detailProgram: string;
  statisticsAccount: string;
  note: string;
  resolutionAmount: number;
  resolutionDate: string;
  vendorName: string;
};

function formatAmount(value: number) {
  const thousands = Math.round(value / 1000);
  return new Intl.NumberFormat("ko-KR").format(thousands);
}

function ExecutionFilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder,
  clearable = true,
  wide = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  clearable?: boolean;
  // 세부사업명처럼 긴 항목은 버튼·목록을 넓혀 이름 전체가 보이게 한다.
  wide?: boolean;
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
    <div className={`execution-filter-segment${wide ? " is-wide" : ""}`} ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="execution-filter-value">{current?.label ?? placeholder}</span>
        <ChevronDown size={15} className={`dropdown-icon ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="dropdown-menu" role="listbox">
          <div className="dropdown-options">
            {clearable && (
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                className={`dropdown-option ${value === "" ? "selected" : ""}`}
                onClick={() => { onChange(""); setOpen(false); }}
              >
                <span className="option-text">{placeholder}</span>
              </button>
            )}
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`dropdown-option ${option.value === value ? "selected" : ""}`}
                onClick={() => { onChange(option.value); setOpen(false); }}
              >
                <span className="option-text">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EXECUTION_COLUMNS = [
  ["department", 90],
  ["unitName", 170],
  ["statisticsCode", 140],
  ["budget", 82],
  ["formedAmount", 82],
  ["original", 82],
  ["supplementary", 78],
  ["preEstablishment", 78],
  ["carryover", 82],
  ["carryoverExplicit", 78],
  ["carryoverAccident", 78],
  ["carryoverContinuing", 78],
  ["executed", 82],
  ["executionRate", 74],
] as const;

// 금액 열: [필드, 제목, 제목 색]. 표 머리·합계·본문을 이 목록 하나로 그린다.
const AMOUNT_COLUMNS = [
  ["budget", "예산현액", "#d9ad52"],
  ["formedAmount", "편성액", "#d9ad52"],
  ["original", "본예산", "#d9ad52"],
  ["supplementary", "추경", "#d9ad52"],
  ["preEstablishment", "성립전", "var(--text)"],
  ["carryover", "이월액 계", "var(--text)"],
  ["carryoverExplicit", "명시", "var(--text)"],
  ["carryoverAccident", "사고", "var(--text)"],
  ["carryoverContinuing", "계속비", "var(--text)"],
  ["executed", "집행액", "#4fc3a1"],
] as const;

type AmountKey = (typeof AMOUNT_COLUMNS)[number][0];

// 업로드 엑셀 머리글(한 줄). 공백을 뺀 뒤 아래 이름 중 하나와 맞으면 그 열로 읽는다.
const UPLOAD_HEADERS: Record<"department" | "unitName" | "statisticsCode" | AmountKey, string[]> = {
  department: ["부서명", "부서"],
  unitName: ["세부사업명", "세부사업"],
  statisticsCode: ["통계목"],
  budget: ["예산현액"],
  formedAmount: ["편성액"],
  original: ["본예산"],
  supplementary: ["추경"],
  preEstablishment: ["성립전"],
  carryover: ["이월액계", "이월액", "이월계", "계"],
  carryoverExplicit: ["명시", "명시이월", "명시이월액"],
  carryoverAccident: ["사고", "사고이월", "사고이월액"],
  carryoverContinuing: ["계속비", "계속비이월", "계속비이월액"],
  executed: ["집행액"],
};

function ExecutionBar({ rate }: { rate: number }) {
  return (
    <div className="execution-bar-container">
      <div className="execution-bar-track">
        <div
          className="execution-bar-fill"
          style={{
            width: `${Math.min(rate, 100)}%`,
            backgroundColor: rate >= 90 ? "#4fc3a1" : rate >= 70 ? "#f0b232" : "#e74c3c",
          }}
        />
      </div>
      <span className="execution-rate-text">{rate.toFixed(1)}%</span>
    </div>
  );
}

export default function BudgetExecution2026() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"department" | "executionRate">("department");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedProgramName, setSelectedProgramName] = useState("");
  const [data, setData] = useState<BudgetExecution[]>(() => {
    try {
      const saved = localStorage.getItem("budgetExecution2026Rows");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("budgetExecution2026ColumnWidths");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [resizingColumn, setResizingColumn] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "예산 집행내역" 탭(지출결의 단위) - 위 요약표와 별개 데이터.
  const [execView, setExecView] = useState<"summary" | "details">("summary");
  const [executionDetails, setExecutionDetails] = useState<ExecutionDetail[]>([]);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailDepartment, setDetailDepartment] = useState("");
  const [detailProgramFilter, setDetailProgramFilter] = useState("");
  const [detailStatisticsFilter, setDetailStatisticsFilter] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const detailRowsPerPage = 20;

  useEffect(() => {
    loadDataFromServer();
  }, [selectedYear]);

  const loadExecutionDetailsFromServer = async () => {
    try {
      const response = await fetch('/api/cloud-sync?type=execution-details');
      if (!response.ok) throw new Error('로드 실패');
      const { data } = await response.json();
      if (Array.isArray(data)) setExecutionDetails(data);
    } catch (error) {
      console.warn('예산 집행내역 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadExecutionDetailsFromServer();
  }, []);

  const handleExecutionDetailUpload = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

      const parseText = (value: unknown): string => (value == null ? "" : String(value).trim());
      const parseAmount = (value: unknown): number => {
        if (typeof value === "number") return value;
        const parsed = parseInt(String(value || "0").replace(/[^0-9-]/g, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
      };

      // 부서명 칸이 병합 셀로 돼있으면 그 부서의 첫 줄에만 값이 들어있고 나머지 줄은 빈 값으로
      // 읽힌다. 빈 값을 그대로 "미분류"로 떨어뜨리면 그 부서의 나머지 내역이 전부 미분류로
      // 뒤섞이고, 서버 저장은 부서 단위 삭제 후 재삽입이라 그 부서의 기존 데이터까지 지워진다.
      // 빈 값이면 바로 위 줄의 부서명을 그대로 이어받게 해서 병합 셀을 펼쳐준다.
      let lastDepartment = "";
      const nextRows: ExecutionDetail[] = imported
        .map((record, index) => {
          const parsedDepartment = parseText(record["부서명"]);
          if (parsedDepartment) lastDepartment = parsedDepartment;
          return {
            id: Date.now() + index,
            department: parsedDepartment || lastDepartment || "미분류",
            division: parseText(record["구분"]),
            policyProgram: parseText(record["정책사업"]),
            unitProgram: parseText(record["단위사업"]),
            detailProgram: parseText(record["세부사업"]),
            statisticsAccount: parseText(record["통계목"]),
            note: parseText(record["적요"]),
            resolutionAmount: parseAmount(record["결의금액"]),
            resolutionDate: parseText(record["결의요청일"]),
            vendorName: parseText(record["거래처명"]),
          };
        })
        .filter((row) => row.department !== "미분류" || row.note || row.resolutionAmount);

      if (!nextRows.length) throw new Error("empty");

      const uploadedDepartments = new Set(nextRows.map((row) => row.department));
      setExecutionDetails((previous) => [
        ...previous.filter((row) => !uploadedDepartments.has(row.department)),
        ...nextRows,
      ]);
      setDetailPage(1);

      // 부서 블록별로 나눠 보내야 서버가 그 부서 몫만 지우고 다시 채운다(다른 부서 데이터 보존).
      const byDepartment = new Map<string, ExecutionDetail[]>();
      for (const row of nextRows) {
        const list = byDepartment.get(row.department) ?? [];
        list.push(row);
        byDepartment.set(row.department, list);
      }

      const results = await Promise.all(
        Array.from(byDepartment.entries()).map(async ([department, rows]) => {
          const response = await fetch('/api/cloud-sync?type=execution-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ department, data: rows }),
          });
          const result = await response.json().catch(() => ({}));
          return response.ok && result.success === true;
        })
      );

      showToast(results.every(Boolean)
        ? `${nextRows.length}개 집행내역을 서버에 저장했습니다.`
        : '저장에 일부 실패했습니다 (로컬에만 반영됨)');
    } catch (error) {
      showToast('엑셀 파일을 읽지 못했습니다');
      console.error(error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // columnWidths 저장
  useEffect(() => {
    try {
      localStorage.setItem(`budgetExecution${selectedYear}ColumnWidths`, JSON.stringify(columnWidths));
    } catch (error) {
      console.warn('columnWidths 저장 실패:', error);
    }
  }, [columnWidths, selectedYear]);

  // 컬럼 리사이저 이벤트
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizingColumn.startX;
      const newWidth = Math.max(50, resizingColumn.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.key]: newWidth,
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

  const colWidth = (key: string, fallback: number) => columnWidths[key] ?? fallback;

  const renderResizeHandle = (colKey: string, fallback: number) => (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumn({ key: colKey, startX: e.clientX, startWidth: colWidth(colKey, fallback) });
      }}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        width: '6px',
        cursor: 'col-resize',
        background: resizingColumn?.key === colKey ? 'rgba(91, 155, 240, 0.5)' : 'transparent',
      }}
    />
  );

  const loadDataFromServer = async () => {
    try {
      const response = await fetch(`/api/budget-execution-${selectedYear}/load`);
      if (!response.ok) throw new Error('데이터 로드 실패');
      const { data } = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          year: String(row.year ?? selectedYear),
          department: row.department,
          policyName: row.policyName ?? row.policy_name,
          programName: row.programName ?? row.program_name,
          unitName: row.unitName ?? row.unit_name,
          statisticsCode: row.statisticsCode ?? row.statistics_code,
          original: row.original,
          supplementary: row.supplementary,
          preEstablishment: row.preEstablishment ?? row.pre_establishment,
          reserve: row.reserve,
          carryover: row.carryover,
          carryoverExplicit: row.carryoverExplicit ?? 0,
          carryoverAccident: row.carryoverAccident ?? 0,
          carryoverContinuing: row.carryoverContinuing ?? 0,
          formedAmount: row.formedAmount || (row.original ?? 0) + (row.supplementary ?? 0) + (row.preEstablishment ?? 0),
          budget: row.budget,
          executed: row.executed,
          executionRate: row.executionRate ?? row.execution_rate,
        }));
        setData(mapped);
      }
    } catch (error) {
      console.warn('서버에서 데이터 로드 실패:', error);
    }
  };

  const handleExcelUpload = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

      const parseNumber = (value: unknown): number => {
        if (typeof value === "number") return value;
        const parsed = parseInt(String(value || "0").replace(/[^0-9]/g, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
      };
      const parseText = (value: unknown): string => (value == null ? "" : String(value));

      // 머리글 공백 차이("이월액 계"/"이월액계")를 흡수해서 열을 찾는다.
      const headerOf = (record: Record<string, unknown>) =>
        new Map(Object.keys(record).map((key) => [key.replace(/\s/g, ""), key] as const));
      const pick = (record: Record<string, unknown>, headers: Map<string, string>, field: keyof typeof UPLOAD_HEADERS) => {
        const key = UPLOAD_HEADERS[field].map((name) => headers.get(name)).find(Boolean);
        return key ? record[key] : undefined;
      };

      const firstHeaders = imported.length ? headerOf(imported[0]) : new Map<string, string>();
      const missing = (["department", "unitName", "statisticsCode", "budget", "executed"] as const)
        .filter((field) => pick(imported[0] ?? {}, firstHeaders, field) === undefined)
        .map((field) => UPLOAD_HEADERS[field][0]);
      if (missing.length) {
        showToast(`엑셀 머리글에 ${missing.join(", ")} 열이 없습니다`);
        return;
      }

      const nextData: BudgetExecution[] = imported
        .map((record, index) => {
          const amount = (field: AmountKey) => parseNumber(pick(record, firstHeaders, field));
          const budgetAmount = amount("budget");
          const executedAmount = amount("executed");
          const original = amount("original");
          const supplementary = amount("supplementary");
          const preEstablishment = amount("preEstablishment");

          return {
            id: Date.now() + index,
            year: selectedYear,
            department: parseText(pick(record, firstHeaders, "department")) || "미분류",
            unitName: parseText(pick(record, firstHeaders, "unitName")),
            statisticsCode: (() => {
              const raw = parseText(pick(record, firstHeaders, "statisticsCode"));
              // 엑셀에서 "05" 같은 코드가 숫자로 읽히면 앞자리 0이 사라지므로 2자리로 복원한다.
              return /^\d+$/.test(raw) ? raw.padStart(2, "0") : raw;
            })(),
            formedAmount: amount("formedAmount") || original + supplementary + preEstablishment,
            original,
            supplementary,
            preEstablishment,
            carryover: amount("carryover"),
            carryoverExplicit: amount("carryoverExplicit"),
            carryoverAccident: amount("carryoverAccident"),
            carryoverContinuing: amount("carryoverContinuing"),
            budget: budgetAmount,
            executed: executedAmount,
            executionRate: budgetAmount > 0 ? (executedAmount / budgetAmount) * 100 : 0,
          };
        })
        .filter((row) => row.budget > 0);

      if (!nextData.length) throw new Error("empty");

      // 같은 연도라도 이번에 업로드한 부서의 기존 행만 새 데이터로 교체하고,
      // 다른 부서의 기존 데이터는 그대로 보존한다.
      const uploadedDepartments = new Set(nextData.map((row) => row.department));
      const isReplaced = (row: BudgetExecution) =>
        String(row.year ?? "2026") === selectedYear && uploadedDepartments.has(row.department);

      setData((previous) => [
        ...previous.filter((row) => !isReplaced(row)),
        ...nextData,
      ]);
      setSelectedDepartment("");

      const merged = [
        ...data.filter((row) => !isReplaced(row)),
        ...nextData,
      ];

      try {
        localStorage.setItem(`budgetExecution${selectedYear}Rows`, JSON.stringify(merged));
      } catch (error) {
        console.warn('localStorage 저장 실패:', error);
      }

      try {
        const response = await fetch(`/api/budget-execution-${selectedYear}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 이번 파일에 있는 부서 행만 보낸다. 서버는 그 부서만 교체하고 다른 부서는 그대로
          // 두므로, 부서별 파일을 여러 번 올리면 누적된다(브라우저에 남은 예전 행은 올리지 않음).
          body: JSON.stringify({ data: nextData }),
        });
        // 저장 API는 DB 거부도 200으로 돌려주므로 success 값까지 확인한다.
        const result = response.ok ? await response.json().catch(() => null) : null;
        if (!result?.success) {
          showToast(`저장에 실패했습니다 (이 브라우저에만 저장됨)${result?.error ? `: ${result.error}` : ''}`);
        } else {
          showToast(`${Array.from(uploadedDepartments).join(", ")} ${nextData.length}건 저장 (다른 부서는 유지)`);
          loadDataFromServer();
        }
      } catch (error) {
        console.warn('서버 저장 실패:', error);
        showToast('저장에 실패했습니다 (로컬에만 저장됨)');
      }
    } catch (error) {
      showToast('엑셀 파일을 읽지 못했습니다');
      console.error(error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const detailDepartments = useMemo(
    () => Array.from(new Set(executionDetails.map((row) => row.department))).sort(),
    [executionDetails]
  );

  // 부서를 고르면 그 부서 안의 세부사업만 보이도록 좁힌다(다른 표의 세부사업명 드롭다운과 동일한 방식).
  const detailPrograms = useMemo(() => {
    const scoped = detailDepartment === "" ? executionDetails : executionDetails.filter((row) => row.department === detailDepartment);
    return Array.from(new Set(scoped.map((row) => row.detailProgram).filter(Boolean))).sort();
  }, [executionDetails, detailDepartment]);

  // 부서·세부사업 선택에 맞춰 통계목 목록도 같이 좁힌다.
  const detailStatisticsCodes = useMemo(() => {
    const scoped = executionDetails.filter((row) =>
      (detailDepartment === "" || row.department === detailDepartment) &&
      (detailProgramFilter === "" || row.detailProgram === detailProgramFilter)
    );
    return Array.from(new Set(scoped.map((row) => row.statisticsAccount).filter(Boolean))).sort();
  }, [executionDetails, detailDepartment, detailProgramFilter]);

  const filteredDetails = useMemo(() => {
    const keyword = detailSearch.toLowerCase();
    return executionDetails.filter((row) => {
      const matchesDepartment = detailDepartment === "" || row.department === detailDepartment;
      const matchesProgram = detailProgramFilter === "" || row.detailProgram === detailProgramFilter;
      const matchesStatistics = detailStatisticsFilter === "" || row.statisticsAccount === detailStatisticsFilter;
      const matchesSearch = keyword === "" ||
        row.detailProgram.toLowerCase().includes(keyword) ||
        row.note.toLowerCase().includes(keyword) ||
        row.vendorName.toLowerCase().includes(keyword);
      return matchesDepartment && matchesProgram && matchesStatistics && matchesSearch;
    });
  }, [executionDetails, detailDepartment, detailProgramFilter, detailStatisticsFilter, detailSearch]);

  const detailTotalPages = Math.max(1, Math.ceil(filteredDetails.length / detailRowsPerPage));
  const paginatedDetails = useMemo(() => {
    const start = (detailPage - 1) * detailRowsPerPage;
    return filteredDetails.slice(start, start + detailRowsPerPage);
  }, [filteredDetails, detailPage]);

  const detailTotalAmount = useMemo(
    () => filteredDetails.reduce((sum, row) => sum + row.resolutionAmount, 0),
    [filteredDetails]
  );

  const filteredData = useMemo(() => {
    let filtered = data.filter((row) => {
      const matchesYear = String(row.year ?? selectedYear) === selectedYear;
      const keyword = search.toLowerCase();
      const matchesSearch = [row.department, row.unitName, row.statisticsCode]
        .some((text) => (text ?? "").toLowerCase().includes(keyword));
      const matchesDepartment = selectedDepartment === "" || selectedDepartment === "전체" || row.department === selectedDepartment;
      const matchesProgramName = selectedProgramName === "" || selectedProgramName === "전체" || row.unitName === selectedProgramName;
      return matchesYear && matchesSearch && matchesDepartment && matchesProgramName;
    });

    if (sortBy === "executionRate") {
      filtered.sort((a, b) => {
        const rateDiff = b.executionRate - a.executionRate;
        return rateDiff !== 0 ? rateDiff : a.id - b.id;
      });
    } else {
      filtered.sort((a, b) => {
        const deptDiff = a.department.localeCompare(b.department);
        return deptDiff !== 0 ? deptDiff : a.id - b.id;
      });
    }

    return filtered;
  }, [data, search, sortBy, selectedDepartment, selectedProgramName, selectedYear]);

  const filteredTotals = useMemo(() => {
    const totals = Object.fromEntries(AMOUNT_COLUMNS.map(([key]) => [key, 0])) as Record<AmountKey, number>;
    for (const row of filteredData) {
      for (const [key] of AMOUNT_COLUMNS) totals[key] += row[key] ?? 0;
    }
    return totals;
  }, [filteredData]);

  const departments = useMemo(() => {
    const departmentOrder = ["문화예술과", "문화유산과", "문화시설과", "독립기념관", "관광진흥과", "교육지원과", "평생학습과", "도서관정책과", "체육진흥과", "전국체전추진단"];
    // 연도마다 부서명이 바뀌기도 해서(예: 2025 독립기념사업소·독립기념추진단) 업로드된 부서 중
    // 고정 목록에 없는 이름도 뒤에 붙여 선택할 수 있게 한다.
    const extras = Array.from(new Set(
      data.filter((row) => String(row.year ?? selectedYear) === selectedYear).map((row) => row.department)
    )).filter((name) => name && !departmentOrder.includes(name)).sort();
    return [...departmentOrder, ...extras];
  }, [data, selectedYear]);

  const programNames = useMemo(() => {
    const dept = selectedDepartment && selectedDepartment !== "전체" ? selectedDepartment : null;
    const filtered = dept ? data.filter(row => row.department === dept) : data;
    const unique = Array.from(new Set(filtered.map(row => row.unitName).filter(Boolean)));
    return unique.sort();
  }, [data, selectedDepartment]);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <Layout showToast={showToast}>
      <div className="page-content" style={{ paddingTop: "20px" }}>
        <section className="page-heading">
            <div className="title-area" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
            <div className="title-wrapper" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                {([["summary", "부서별 예산집행현황"], ["details", "예산 집행내역"]] as const).map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setExecView(view)}
                    style={{
                      fontSize: '26px', fontWeight: 700, padding: '6.25px 12px 0.75px', lineHeight: 1.15, borderRadius: '6px',
                      border: 'none', cursor: 'pointer',
                      background: 'transparent',
                      color: execView === view ? '#3d70b8' : '#8b9099',
                      boxShadow: execView === view ? 'inset 0 0 0 1px #3d70b8' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "24px" }}>
              <label className="icon-stack-btn" aria-label="업로드" data-tooltip="업로드">
                <div className="icon-stack-front"><Upload size={20} /></div>
                <input
                  ref={fileInputRef}
                  className="upload-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => execView === "details" ? handleExecutionDetailUpload(event.target.files?.[0]) : handleExcelUpload(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </section>

        {execView === "summary" && (
        <section className="table-panel" style={{ marginTop: "8px" }}>
          <div className="table-heading" style={{ borderBottom: 'none', justifyContent: 'space-between' }}>
            <div className="table-title">
              <div className="execution-filter-bar">
                <ExecutionFilterDropdown
                  label="회계연도"
                  value={selectedYear}
                  options={[
                    { value: "2025", label: "2025년" },
                    { value: "2026", label: "2026년" },
                  ]}
                  onChange={(value) => { setSelectedYear(value); setSelectedDepartment(""); setSelectedProgramName(""); setPage(1); }}
                  placeholder="연도 선택"
                  clearable={false}
                />
                <ExecutionFilterDropdown
                  label="부서명"
                  value={selectedDepartment}
                  options={departments.map((dept) => ({ value: dept, label: dept }))}
                  onChange={setSelectedDepartment}
                  placeholder="부서명 선택"
                />
                <ExecutionFilterDropdown
                  label="세부사업명"
                  value={selectedProgramName}
                  options={programNames.map((prog) => ({ value: prog, label: prog }))}
                  onChange={setSelectedProgramName}
                  placeholder="세부사업명 선택"
                  wide
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="검색"
                  aria-label="검색"
                />
                {search && (
                  <button aria-label="검색어 지우기" onClick={() => setSearch("")}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <span className="unit-note">(단위: 천원)</span>
            </div>
          </div>

          <div className="table-scroll">
            <table className="budget-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '1274px' }}>
              <colgroup>
                {EXECUTION_COLUMNS.map(([key, fallback]) => (
                  <col key={key} style={{ width: `${colWidth(key, fallback)}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr style={{ background: '#141a22', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>부서명{renderResizeHandle("department", 90)}</th>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>세부사업명{renderResizeHandle("unitName", 170)}</th>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>통계목{renderResizeHandle("statisticsCode", 140)}</th>
                  {AMOUNT_COLUMNS.map(([key, label, color]) => (
                    <th key={key} style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color, fontSize: '15px' }}>
                      {label}{renderResizeHandle(key, EXECUTION_COLUMNS.find(([colKey]) => colKey === key)?.[1] ?? 82)}
                    </th>
                  ))}
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: '#4fc3a1', fontSize: '15px' }}>집행률{renderResizeHandle("executionRate", 74)}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 && (
                  <tr key="total" style={{ fontWeight: '600', background: 'rgba(91, 155, 240, 0.055)', borderBottom: '1px solid rgba(91, 155, 240, 0.16)' }}>
                    <td style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', color: '#5b9bf0' }}>합계</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#5b9bf0' }}></td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#5b9bf0' }}></td>
                    {AMOUNT_COLUMNS.map(([key]) => (
                      <td key={key} style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(filteredTotals[key])}</td>
                    ))}
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{filteredTotals.budget > 0 ? ((filteredTotals.executed / filteredTotals.budget) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                )}
                {paginatedData.map((row) => (
                  <tr key={row.id} className="budget-row">
                    <td title={row.department} style={{ padding: '12px 8px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.department}</td>
                    <td title={row.unitName} style={{ padding: '12px 8px', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.unitName}</td>
                    <td title={row.statisticsCode} style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.statisticsCode}</td>
                    {AMOUNT_COLUMNS.map(([key]) => (
                      <td key={key} style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row[key] ?? 0)}</td>
                    ))}
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{row.executionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#9fb0c8', marginTop: '4px' }}>
              {filteredData.length === 0 ? '0' : (page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, filteredData.length)} of {filteredData.length}
            </div>
          </div>
        </section>
        )}

        {execView === "details" && (
        <section className="table-panel" style={{ marginTop: "8px" }}>
          <div className="table-heading" style={{ borderBottom: 'none', justifyContent: 'space-between' }}>
            <div className="table-title">
              <div className="execution-filter-bar">
                <ExecutionFilterDropdown
                  label="부서명"
                  value={detailDepartment}
                  options={detailDepartments.map((dept) => ({ value: dept, label: dept }))}
                  onChange={(value) => { setDetailDepartment(value); setDetailProgramFilter(""); setDetailStatisticsFilter(""); setDetailPage(1); }}
                  placeholder="부서명 선택"
                />
                <ExecutionFilterDropdown
                  label="세부사업"
                  value={detailProgramFilter}
                  options={detailPrograms.map((prog) => ({ value: prog, label: prog }))}
                  onChange={(value) => { setDetailProgramFilter(value); setDetailStatisticsFilter(""); setDetailPage(1); }}
                  placeholder="세부사업 선택"
                  wide
                />
                <ExecutionFilterDropdown
                  label="통계목"
                  value={detailStatisticsFilter}
                  options={detailStatisticsCodes.map((code) => ({ value: code, label: code }))}
                  onChange={(value) => { setDetailStatisticsFilter(value); setDetailPage(1); }}
                  placeholder="통계목 선택"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="search-box">
                <Search size={17} />
                <input
                  value={detailSearch}
                  onChange={(event) => { setDetailSearch(event.target.value); setDetailPage(1); }}
                  placeholder="세부사업·적요·거래처명 검색"
                  aria-label="검색"
                />
                {detailSearch && (
                  <button aria-label="검색어 지우기" onClick={() => setDetailSearch("")}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <span className="unit-note">(단위: 천원)</span>
            </div>
          </div>

          <div className="table-scroll">
            {/* 이 표는 칸마다 내용 길이가 하도 달라서(코드성 짧은 값 vs 긴 사업명·적요) 고정폭을
                아무리 손봐도 어떤 칸은 늘 남고 어떤 칸은 늘 모자랐다. table-layout을 auto로 바꿔
                각 칸이 실제 내용 길이에 맞춰 스스로 넓이를 잡게 하고, 원래 길어질 수 있는 자유
                서술형 칸(정책사업·세부사업·적요·거래처명)에만 최대폭+말줄임을 둬서 표 전체가
                한없이 넓어지는 것만 막는다. */}
            <table className="budget-table" style={{ tableLayout: 'auto', width: 'auto', minWidth: '100%' }}>
              <thead>
                <tr style={{ background: '#141a22', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>부서명</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>구분</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>정책사업</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>단위사업</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>세부사업</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>통계목</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>적요</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>결의금액</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>결의요청일</th>
                  <th style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '600', color: 'var(--text)', fontSize: '15px', whiteSpace: 'nowrap' }}>거래처명</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDetails.length > 0 && (
                  <tr key="detail-total" style={{ fontWeight: '600', background: 'rgba(91, 155, 240, 0.055)', borderBottom: '1px solid rgba(91, 155, 240, 0.16)' }}>
                    <td style={{ textAlign: 'left', padding: '12px 10px', fontSize: '15px', color: '#5b9bf0', whiteSpace: 'nowrap' }}>합계 ({filteredDetails.length}건)</td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{new Intl.NumberFormat("ko-KR").format(detailTotalAmount)}</td>
                    <td style={{ padding: '12px 10px' }}></td>
                    <td style={{ padding: '12px 10px' }}></td>
                  </tr>
                )}
                {paginatedDetails.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>등록된 집행내역이 없습니다.</td></tr>
                ) : paginatedDetails.map((row) => (
                  <tr key={row.id} className="budget-row">
                    <td style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap' }}>{row.department}</td>
                    <td style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap' }}>{row.division}</td>
                    <td title={row.policyProgram} style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>{row.policyProgram}</td>
                    <td style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap' }}>{row.unitProgram}</td>
                    <td title={row.detailProgram} style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>{row.detailProgram}</td>
                    <td style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap' }}>{row.statisticsAccount}</td>
                    <td title={row.note} style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '190px' }}>{row.note}</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', fontSize: '14px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{new Intl.NumberFormat("ko-KR").format(row.resolutionAmount)}</td>
                    <td style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap' }}>{row.resolutionDate}</td>
                    <td title={row.vendorName} style={{ textAlign: 'left', padding: '12px 10px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{row.vendorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
              <Pagination page={detailPage} totalPages={detailTotalPages} onChange={setDetailPage} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#9fb0c8', marginTop: '4px' }}>
              {filteredDetails.length === 0 ? '0' : (detailPage - 1) * detailRowsPerPage + 1}–{Math.min(detailPage * detailRowsPerPage, filteredDetails.length)} of {filteredDetails.length}
            </div>
          </div>
        </section>
        )}

        {toast && (
          <div className="toast">
            <AlertCircle size={16} />
            {toast}
          </div>
        )}
      </div>
    </Layout>
  );
}
