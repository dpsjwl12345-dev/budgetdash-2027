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
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  clearable?: boolean;
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
    <div className="execution-filter-segment" ref={containerRef}>
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
  ["policyName", 85],
  ["programName", 85],
  ["unitName", 145],
  ["statisticsCode", 140],
  ["budget", 82],
  ["original", 82],
  ["supplementary", 78],
  ["preEstablishment", 78],
  ["reserve", 78],
  ["carryover", 82],
  ["executed", 82],
  ["executionRate", 74],
] as const;

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

  useEffect(() => {
    loadDataFromServer();
  }, [selectedYear]);

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

      const nextData: BudgetExecution[] = imported
        .map((record, index) => {
          const budgetAmount = parseNumber(record["예산현액"]);
          const executedAmount = parseNumber(record["집행액"]);

          return {
            id: Date.now() + index,
            year: selectedYear,
            department: parseText(record["부서명"]) || "미분류",
            policyName: parseText(record["정책사업명"]),
            programName: parseText(record["단위사업명"]),
            unitName: parseText(record["세부사업명"]),
            statisticsCode: (() => {
              const raw = parseText(record["통계목"]);
              // 엑셀에서 "05" 같은 코드가 숫자로 읽히면 앞자리 0이 사라지므로 2자리로 복원한다.
              return /^\d+$/.test(raw) ? raw.padStart(2, "0") : raw;
            })(),
            original: parseNumber(record["본예산"]),
            supplementary: parseNumber(record["추경"]),
            preEstablishment: parseNumber(record["성립전"]),
            reserve: parseNumber(record["예비비"]),
            carryover: parseNumber(record["이월액계"]),
            budget: budgetAmount,
            executed: executedAmount,
            executionRate: budgetAmount > 0 ? (executedAmount / budgetAmount) * 100 : 0,
          };
        })
        .filter((row) => row.budget > 0);

      if (!nextData.length) throw new Error("empty");

      setData((previous) => [
        ...previous.filter((row) => String(row.year ?? "2026") !== selectedYear),
        ...nextData,
      ]);
      setSelectedDepartment("");

      try {
        const merged = [
          ...data.filter((row) => String(row.year ?? "2026") !== selectedYear),
          ...nextData,
        ];
        localStorage.setItem(`budgetExecution${selectedYear}Rows`, JSON.stringify(merged));
      } catch (error) {
        console.warn('localStorage 저장 실패:', error);
      }

      try {
        const response = await fetch(`/api/budget-execution-${selectedYear}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              ...data.filter((row) => String(row.year ?? "2026") !== selectedYear),
              ...nextData,
            ],
          }),
        });
        if (!response.ok) {
          showToast('저장에 실패했습니다 (로컬에만 저장됨)');
        } else {
          showToast(`${selectedYear}년 ${nextData.length}개 데이터를 교체 저장했습니다.`);
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

  const filteredData = useMemo(() => {
    let filtered = data.filter((row) => {
      const matchesYear = String(row.year ?? selectedYear) === selectedYear;
      const matchesSearch = row.department.toLowerCase().includes(search.toLowerCase()) ||
                           row.policyName.toLowerCase().includes(search.toLowerCase()) ||
                           row.programName.toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = selectedDepartment === "" || selectedDepartment === "전체" || row.department === selectedDepartment;
      const matchesProgramName = selectedProgramName === "" || selectedProgramName === "전체" || row.programName === selectedProgramName;
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
    return filteredData.reduce(
      (sum, row) => ({
        budget: sum.budget + row.budget,
        original: sum.original + row.original,
        supplementary: sum.supplementary + row.supplementary,
        preEstablishment: sum.preEstablishment + row.preEstablishment,
        reserve: sum.reserve + row.reserve,
        carryover: sum.carryover + row.carryover,
        executed: sum.executed + row.executed,
      }),
      { budget: 0, original: 0, supplementary: 0, preEstablishment: 0, reserve: 0, carryover: 0, executed: 0 }
    );
  }, [filteredData]);

  const departments = useMemo(() => {
    const departmentOrder = ["문화예술과", "문화유산과", "문화시설과", "독립기념관", "관광진흥과", "교육지원과", "평생학습과", "도서관정책과", "체육진흥과", "전국체전추진단"];
    return departmentOrder;
  }, [data]);

  const programNames = useMemo(() => {
    const dept = selectedDepartment && selectedDepartment !== "전체" ? selectedDepartment : null;
    const filtered = dept ? data.filter(row => row.department === dept) : data;
    const unique = Array.from(new Set(filtered.map(row => row.programName).filter(Boolean)));
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
              <h1 style={{ marginTop: "0" }}>부서별 예산집행현황</h1>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "24px" }}>
              <div style={{ display: "flex", gap: "12px" }} aria-label="2026 예산 요약">
                <article className="metric-card" style={{ "--tint": "#5b9bf0", width: "200px", minHeight: "64px", padding: "10px 16px" } as React.CSSProperties}>
                  <div className="metric-header">
                    <div className="metric-top"><span>총예산액</span></div>
                  </div>
                  <strong style={{ textAlign: "right" }}>{new Intl.NumberFormat("ko-KR").format(Math.round(filteredTotals.budget / 1000000))}<span className="metric-unit">백만원</span></strong>
                </article>
                <article className="metric-card" style={{ "--tint": "#4fc3a1", width: "200px", minHeight: "64px", padding: "10px 16px" } as React.CSSProperties}>
                  <div className="metric-header">
                    <div className="metric-top"><span>총집행액</span></div>
                  </div>
                  <strong style={{ textAlign: "right" }}>{new Intl.NumberFormat("ko-KR").format(Math.round(filteredTotals.executed / 1000000))}<span className="metric-unit">백만원</span></strong>
                </article>
              </div>
              <label className="icon-stack-btn" aria-label="업로드" data-tooltip="업로드">
                <div className="icon-stack-front"><Upload size={20} /></div>
                <input
                  ref={fileInputRef}
                  className="upload-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => handleExcelUpload(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </section>

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
            <table className="budget-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '1091px' }}>
              <colgroup>
                {EXECUTION_COLUMNS.map(([key, fallback]) => (
                  <col key={key} style={{ width: `${colWidth(key, fallback)}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr style={{ background: '#141a22', position: 'sticky', top: 0, zIndex: 2 }}>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>정책사업명{renderResizeHandle("policyName", 85)}</th>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>단위사업명{renderResizeHandle("programName", 85)}</th>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>세부사업명{renderResizeHandle("unitName", 145)}</th>
                  <th style={{ position: 'relative', textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>통계목{renderResizeHandle("statisticsCode", 140)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>예산현액{renderResizeHandle("budget", 82)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>편성액{renderResizeHandle("budget", 82)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>본예산{renderResizeHandle("original", 82)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>추경{renderResizeHandle("supplementary", 78)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>성립전{renderResizeHandle("preEstablishment", 78)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>예비비{renderResizeHandle("reserve", 78)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>이월액계{renderResizeHandle("carryover", 82)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>집행액{renderResizeHandle("executed", 82)}</th>
                  <th style={{ position: 'relative', textAlign: 'right', padding: '12px 6px', fontWeight: '600', color: 'var(--text)', fontSize: '15px' }}>집행률{renderResizeHandle("executionRate", 74)}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 && (
                  <tr key="total" style={{ fontWeight: '700', background: 'rgba(91, 155, 240, 0.08)', borderTop: '1.5px solid rgba(91, 155, 240, 0.3)' }}>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#5b9bf0' }}></td>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: '#5b9bf0' }}></td>
                    <td style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', color: '#5b9bf0' }}>합계</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', color: '#5b9bf0' }}></td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(filteredTotals.budget)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(filteredTotals.original + filteredTotals.supplementary + filteredTotals.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(filteredTotals.original)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(filteredTotals.supplementary)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(filteredTotals.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(filteredTotals.reserve)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(filteredTotals.carryover)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(filteredTotals.executed)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '14px', color: '#5b9bf0', fontVariantNumeric: 'tabular-nums' }}>{filteredTotals.budget > 0 ? ((filteredTotals.executed / filteredTotals.budget) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                )}
                {paginatedData.map((row) => (
                  <tr key={row.id} className="budget-row">
                    <td title={row.policyName} style={{ padding: '12px 8px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.policyName}</td>
                    <td title={row.programName} style={{ padding: '12px 8px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.programName}</td>
                    <td title={row.unitName} style={{ padding: '12px 8px', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.unitName}</td>
                    <td title={row.statisticsCode} style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.statisticsCode}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.budget)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.original + row.supplementary + row.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.original)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.supplementary)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.reserve)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.carryover)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(row.executed)}</td>
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
