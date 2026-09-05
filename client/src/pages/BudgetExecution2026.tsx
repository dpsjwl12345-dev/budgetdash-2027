import { useState, useMemo, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import * as XLSX from "xlsx";
import {
  Filter,
  Search,
  X,
  Upload,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"department" | "executionRate">("department");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [data, setData] = useState<BudgetExecution[]>([]);
  const [toast, setToast] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDataFromServer();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadDataFromServer = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/budget-execution-2026/load`);
      if (!response.ok) throw new Error('데이터 로드 실패');
      const { data } = await response.json();
      if (data && Array.isArray(data)) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          department: row.department,
          policyName: row.policy_name,
          programName: row.program_name,
          unitName: row.unit_name,
          statisticsCode: row.statistics_code,
          original: row.original,
          supplementary: row.supplementary,
          preEstablishment: row.pre_establishment,
          reserve: row.reserve,
          carryover: row.carryover,
          budget: row.budget,
          executed: row.executed,
          executionRate: row.execution_rate,
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

      const nextData: BudgetExecution[] = imported
        .map((record, index) => {
          const budgetAmount = parseNumber(record["예산현액"]);
          const executedAmount = parseNumber(record["집행액"]);

          return {
            id: Date.now() + index,
            department: String(record["부서명"]) || "미분류",
            policyName: String(record["정책사업명"]) || "",
            programName: String(record["단위사업명"]) || "",
            unitName: String(record["세부사업명"]) || "",
            statisticsCode: String(record["통계목"]) || "",
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

      setData(nextData);
      setSelectedDepartment("전체");

      try {
        const response = await fetch(`http://localhost:5000/api/budget-execution-2026/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: nextData }),
        });
        if (!response.ok) {
          showToast('서버 저장에 실패했습니다');
        } else {
          showToast(`${nextData.length}개 부서 데이터를 저장했습니다.`);
        }
      } catch (error) {
        console.warn('서버 저장 실패:', error);
        showToast('서버 저장에 실패했습니다');
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
      const matchesSearch = row.department.toLowerCase().includes(search.toLowerCase()) ||
                           row.policyName.toLowerCase().includes(search.toLowerCase()) ||
                           row.programName.toLowerCase().includes(search.toLowerCase());
      const matchesDepartment = selectedDepartment === "" || selectedDepartment === "전체" || row.department === selectedDepartment;
      return matchesSearch && matchesDepartment;
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
  }, [data, search, sortBy, selectedDepartment]);

  const totals = useMemo(() => {
    return data.reduce(
      (sum, row) => ({
        budget: sum.budget + row.budget,
        executed: sum.executed + row.executed,
      }),
      { budget: 0, executed: 0 }
    );
  }, [data]);

  const avgExecutionRate = totals.budget > 0 ? (totals.executed / totals.budget) * 100 : 0;

  const departments = useMemo(() => {
    const departmentOrder = ["문화예술과", "문화유산과", "독립기념관", "관광진흥과", "교육지원과", "평생학습과", "도서관정책과", "체육진흥과", "전국체전추진단"];
    return departmentOrder;
  }, [data]);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <Layout showToast={showToast}>
      <div className="page-content">
        <section className="page-heading">
          <div className="title-area">
            <div className="title-wrapper">
              <h1>부서별 예산집행현황</h1>
            </div>
          </div>
        </section>

        <section className="metric-grid" aria-label="2026 예산 요약">
          <article className="metric-card" style={{ "--tint": "#5b9bf0" } as React.CSSProperties}>
            <div className="metric-header">
              <div className="metric-top"><span>총 예산</span></div>
            </div>
            <strong>{formatAmount(Math.round(totals.budget / 1000000))}<span className="metric-unit">백만원</span></strong>
          </article>
          <article className="metric-card" style={{ "--tint": "#4fc3a1" } as React.CSSProperties}>
            <div className="metric-header">
              <div className="metric-top"><span>집행액</span></div>
            </div>
            <strong>{formatAmount(Math.round(totals.executed / 1000000))}<span className="metric-unit">백만원</span></strong>
          </article>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginTop: '-32px' }}>
          <label className="upload-file-field">
            <Upload size={16} />
            <span>UPLOAD</span>
            <input
              ref={fileInputRef}
              className="upload-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => handleExcelUpload(event.target.files?.[0])}
            />
          </label>
        </div>

        <section className="table-panel">
          <div className="table-heading">
            <div className="table-title">
              <div style={{ fontSize: '20px', color: '#9fb0c8', fontWeight: '600', marginLeft: '-25px' }}>
                2026 일반회계 부서별 집행현황
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }} ref={dropdownRef}>
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
            </div>
          </div>

          <div className="filter-row" style={{ gap: '12px', alignItems: 'center' }}>
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
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>정책사업명</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>단위사업명</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>세부사업명</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>통계목</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>예산현액</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>본예산</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>추경</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', width: '80px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>성립전</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', width: '80px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>예비비</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', width: '80px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>이월액계</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>집행액</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: '600', color: '#475569', fontSize: '16px' }}>집행률</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 && (
                  <tr key="total" style={{ fontWeight: '600' }}>
                    <td style={{ padding: '12px 0', fontSize: '16px' }}></td>
                    <td style={{ padding: '12px 0', fontSize: '16px' }}></td>
                    <td style={{ padding: '12px 0', fontSize: '16px' }}></td>
                    <td style={{ textAlign: 'left', padding: '12px 0', fontSize: '16px' }}>합계</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '16px' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.budget, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '16px' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.original, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '16px' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.supplementary, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', width: '80px', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.preEstablishment, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', width: '80px', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.reserve, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', width: '80px', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.carryover, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '16px' }}>{formatAmount(paginatedData.reduce((sum, row) => sum + row.executed, 0))}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontSize: '16px' }}>{paginatedData.reduce((sum, row) => sum + row.budget, 0) > 0 ? ((paginatedData.reduce((sum, row) => sum + row.executed, 0) / paginatedData.reduce((sum, row) => sum + row.budget, 0)) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                )}
                {paginatedData.map((row) => (
                  <tr key={row.id} className="budget-row">
                    <td style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.policyName}</td>
                    <td style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.programName}</td>
                    <td style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.unitName}</td>
                    <td style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.statisticsCode}</td>
                    <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatAmount(row.budget)}</td>
                    <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatAmount(row.original)}</td>
                    <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatAmount(row.supplementary)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', width: '80px', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(row.preEstablishment)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', width: '80px', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(row.reserve)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', width: '80px', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatAmount(row.carryover)}</td>
                    <td style={{ textAlign: 'right', fontSize: '14px' }}>{formatAmount(row.executed)}</td>
                    <td style={{ textAlign: 'right', fontSize: '14px' }}>{row.executionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', marginBottom: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', paddingTop: '16px', paddingBottom: '8px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>
              {filteredData.length === 0 ? '0' : (page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, filteredData.length)} of {filteredData.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: page === 1 ? '#f8fafc' : '#fff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? '#cbd5e1' : '#475569',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  opacity: page === 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="이전"
              >
                <ChevronLeft size={16} />
                <span style={{ display: 'none' }}>이전</span>
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 10px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: page >= totalPages ? '#f8fafc' : '#fff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  color: page >= totalPages ? '#cbd5e1' : '#475569',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  opacity: page >= totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="다음"
              >
                <span style={{ display: 'none' }}>다음</span>
                <ChevronRight size={16} />
              </button>
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
