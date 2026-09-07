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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownProgramOpen, setDropdownProgramOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownProgramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDataFromServer();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (dropdownProgramRef.current && !dropdownProgramRef.current.contains(event.target as Node)) {
        setDropdownProgramOpen(false);
      }
    };

    if (dropdownOpen || dropdownProgramOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen, dropdownProgramOpen]);

  const loadDataFromServer = async () => {
    try {
      const response = await fetch(`/api/budget-execution-2026/load`);
      if (!response.ok) throw new Error('데이터 로드 실패');
      const { data } = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          year: String(row.year ?? "2026"),
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
        localStorage.setItem("budgetExecution2026Rows", JSON.stringify(merged));
      } catch (error) {
        console.warn('localStorage 저장 실패:', error);
      }

      try {
        const response = await fetch(`/api/budget-execution-2026/save`, {
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
      const matchesYear = String(row.year ?? "2026") === selectedYear;
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
    const departmentOrder = ["문화예술과", "문화유산과", "독립기념관", "관광진흥과", "교육지원과", "평생학습과", "도서관정책과", "체육진흥과", "전국체전추진단"];
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
              <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.02em" }}>
                {selectedYear} 일반회계
              </span>
              <h1 style={{ marginTop: "-4px" }}>부서별 예산집행현황</h1>
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
                <div className="execution-filter-segment" ref={dropdownRef}>
                <select
                  value={selectedYear}
                  onChange={(event) => { setSelectedYear(event.target.value); setSelectedDepartment(""); setSelectedProgramName(""); setPage(1); }}
                  aria-label="회계연도"
                  style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
                >
                  <option value="2025">2025년</option>
                  <option value="2026">2026년</option>
                </select>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontWeight: '500',
                    color: '#334155',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    minWidth: '140px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = '#cbd5e1';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = '#e2e8f0';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <span>{selectedDepartment || '부서명 선택'}</span>
                  <span style={{ fontSize: '12px' }}>▼</span>
                </button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    right: '0',
                    marginTop: '4px',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 10,
                    maxHeight: '240px',
                    overflow: 'hidden',
                  }}>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <button
                      onClick={() => {
                        setSelectedDepartment('');
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        backgroundColor: selectedDepartment === '' ? '#f0f4f9' : 'transparent',
                        color: '#334155',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDepartment !== '') {
                          (e.target as HTMLButtonElement).style.backgroundColor = '#f0f4f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDepartment !== '') {
                          (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      부서명 선택
                    </button>
                    {departments.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          backgroundColor: selectedDepartment === dept ? '#f0f4f9' : 'transparent',
                          color: '#334155',
                          fontSize: '14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: selectedDepartment === dept ? '600' : '500',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedDepartment !== dept) {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#f0f4f9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedDepartment !== dept) {
                            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {dept}
                      </button>
                    ))}
                    </div>
                  </div>
                )}
                </div>

                <div className="execution-filter-segment" ref={dropdownProgramRef}>
                <button
                  onClick={() => setDropdownProgramOpen(!dropdownProgramOpen)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontWeight: '500',
                    color: '#334155',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    minWidth: '140px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = '#cbd5e1';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = '#e2e8f0';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <span>{selectedProgramName || '세부사업명 선택'}</span>
                  <span style={{ fontSize: '12px' }}>▼</span>
                </button>
                {dropdownProgramOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    right: '0',
                    marginTop: '4px',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 10,
                    maxHeight: '240px',
                    overflow: 'hidden',
                  }}>
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <button
                      onClick={() => {
                        setSelectedProgramName('');
                        setDropdownProgramOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        backgroundColor: selectedProgramName === '' ? '#f0f4f9' : 'transparent',
                        color: '#334155',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedProgramName !== '') {
                          (e.target as HTMLButtonElement).style.backgroundColor = '#f0f4f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedProgramName !== '') {
                          (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      세부사업명 선택
                    </button>
                    {programNames.map((prog) => (
                      <button
                        key={prog}
                        onClick={() => {
                          setSelectedProgramName(prog);
                          setDropdownProgramOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          backgroundColor: selectedProgramName === prog ? '#f0f4f9' : 'transparent',
                          color: '#334155',
                          fontSize: '14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: selectedProgramName === prog ? '600' : '500',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedProgramName !== prog) {
                            (e.target as HTMLButtonElement).style.backgroundColor = '#f0f4f9';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedProgramName !== prog) {
                            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {prog}
                      </button>
                    ))}
                    </div>
                  </div>
                )}
                </div>

                <span className="execution-filter-unit">(단위: 천원)</span>
              </div>
            </div>

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
          </div>

          <div className="table-scroll">
            <table className="budget-table">
              <thead>
                <tr style={{ background: 'rgba(140, 155, 170, 0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '100px' }}>정책사업명</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '100px' }}>단위사업명</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '100px' }}>세부사업명</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '60px' }}>통계목</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '80px' }}>예산현액</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '80px' }}>본예산</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '80px' }}>추경</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: '600', color: 'var(--text)', fontSize: '16px', minWidth: '80px' }}>성립전</th>
                  <th style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontWeight: '600', color: 'var(--text)', fontSize: '16px' }}>예비비</th>
                  <th style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontWeight: '600', color: 'var(--text)', fontSize: '16px' }}>이월액계</th>
                  <th style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontWeight: '600', color: 'var(--text)', fontSize: '16px' }}>집행액</th>
                  <th style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontWeight: '600', color: 'var(--text)', fontSize: '16px' }}>집행률</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 && (
                  <tr key="total" style={{ fontWeight: '700', background: 'rgba(91, 155, 240, 0.08)' }}>
                    <td style={{ padding: '12px 8px', fontSize: '16px', color: '#5b9bf0', width: '120px', maxWidth: '120px' }}></td>
                    <td style={{ padding: '12px 2px', fontSize: '16px', color: '#5b9bf0', width: '100px', maxWidth: '100px' }}></td>
                    <td style={{ padding: '12px 8px', fontSize: '16px', color: '#5b9bf0' }}></td>
                    <td style={{ textAlign: 'left', padding: '12px 4px 12px 4px', width: '50px', maxWidth: '50px', fontSize: '16px', color: '#5b9bf0' }}>합계</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px 12px 12px', width: '80px', fontSize: '16px', color: '#5b9bf0' }}>{formatAmount(filteredTotals.budget)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', color: '#5b9bf0' }}>{formatAmount(filteredTotals.original)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', color: '#5b9bf0' }}>{formatAmount(filteredTotals.supplementary)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#5b9bf0' }}>{formatAmount(filteredTotals.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#5b9bf0' }}>{formatAmount(filteredTotals.reserve)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#5b9bf0' }}>{formatAmount(filteredTotals.carryover)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', color: '#5b9bf0' }}>{formatAmount(filteredTotals.executed)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 6px', width: '80px', fontSize: '16px', color: '#5b9bf0' }}>{filteredTotals.budget > 0 ? ((filteredTotals.executed / filteredTotals.budget) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                )}
                {paginatedData.map((row) => (
                  <tr key={row.id} className="budget-row">
                    <td style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '100px' }}>{row.policyName}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '100px' }}>{row.programName}</td>
                    <td style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '100px' }}>{row.unitName}</td>
                    <td style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '60px' }}>{row.statisticsCode}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.budget)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.original)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.supplementary)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.reserve)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.carryover)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{formatAmount(row.executed)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', minWidth: '80px' }}>{row.executionRate.toFixed(1)}%</td>
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
