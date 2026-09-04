/*
 * Civic Ledger 스타일 기준: 사용자가 제공한 참조 대시보드의 어두운 네이비 행정 업무 화면을 보존한다.
 * 이번 수정 범위는 데스크톱 전체 가독성 향상이며, 정보 구조와 상태 체계는 유지하고 타이포그래피만 한 단계 크게 잡는다.
 */
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
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
} from "lucide-react";

type Status = "정상" | "오류" | "주의";

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
};

const rows: BudgetRow[] = [
  {
    id: 1,
    policy: "노인복지 증진",
    program: "경로당 운영지원",
    code: "300",
    account: "302-03 민간경상보조",
    detail: "관내 경로당 145개소 운영비 보조 · 20,000,000원 × 145개소",
    amount: 290000,
    city: 290000,
    national: 0,
    province: 0,
    other: 0,
    previous: 270000,
    status: "정상",
  },
  {
    id: 2,
    policy: "노인복지 증진",
    program: "노인복지관 운영지원",
    code: "300",
    account: "303-01 사회복지시설법정운영비보조",
    detail: "노인복지관 3개소 운영비 보조 · 216,666,666원 × 3개소",
    amount: 650000,
    city: 650000,
    national: 0,
    province: 0,
    other: 0,
    previous: 600000,
    status: "오류",
    note: "근거자료 또는 사전절차 확인",
  },
  {
    id: 3,
    policy: "노인복지 증진",
    program: "노인일자리사업",
    code: "300",
    account: "302-02 민간행사사업보조",
    detail: "공익활동형 노인일자리 1,800명 · 1,666,666원 × 1,800명",
    amount: 2100000,
    city: 420000,
    national: 1680000,
    province: 0,
    other: 0,
    previous: 1900000,
    status: "주의",
    note: "전년도 대비 증액 확인 권장",
  },
  {
    id: 4,
    policy: "복지인프라 확충",
    program: "경로당 환경개선",
    code: "400",
    account: "401-01 시설비",
    detail: "신축 공사비 (2026~2027 계속비) · 1,500,000,000원 × 1식",
    amount: 1500000,
    city: 750000,
    national: 0,
    province: 750000,
    other: 0,
    previous: 0,
    status: "오류",
    note: "근거자료 또는 사전절차 확인",
  },
  {
    id: 5,
    policy: "복지인프라 확충",
    program: "경로당 안전개선",
    code: "400",
    account: "402-01 자산및물품취득비",
    detail: "노후 경로당 12개소 보수 · 20,000,000원 × 12개소",
    amount: 240000,
    city: 240000,
    national: 0,
    province: 0,
    other: 0,
    previous: 180000,
    status: "정상",
  },
  {
    id: 6,
    policy: "복지정책 추진",
    program: "복지정책 연구용역",
    code: "200",
    account: "207-01 연구용역비",
    detail: "시 복지정책 5개년 종합계획 수립 용역",
    amount: 120000,
    city: 120000,
    national: 0,
    province: 0,
    other: 0,
    previous: 0,
    status: "오류",
    note: "근거자료 또는 사전절차 확인",
  },
  {
    id: 7,
    policy: "복지정책과 운영",
    program: "기본경비",
    code: "200",
    account: "201-01 사무관리비",
    detail: "사무용품비 (소모품·복사용지) · 1,500,000원 × 12개월",
    amount: 18000,
    city: 18000,
    national: 0,
    province: 0,
    other: 0,
    previous: 17000,
    status: "정상",
  },
  {
    id: 8,
    policy: "복지정책과 운영",
    program: "기본경비",
    code: "200",
    account: "201-02 공공운영비",
    detail: "공공운영비 (청사 공공요금 분담)",
    amount: 22000,
    city: 22000,
    national: 0,
    province: 0,
    other: 0,
    previous: 21000,
    status: "정상",
  },
  {
    id: 9,
    policy: "복지정책과 운영",
    program: "기본경비",
    code: "200",
    account: "202-01 국내여비",
    detail: "국내여비 (관내·관외 출장) · 50,000원 × 120회",
    amount: 6000,
    city: 6000,
    national: 0,
    province: 0,
    other: 0,
    previous: 5000,
    status: "정상",
  },
  {
    id: 10,
    policy: "복지정책과 운영",
    program: "운영비품 구입",
    code: "400",
    account: "405-01 자산및물품취득비",
    detail: "직원 책상·의자 교체 · 350,000원 × 12개",
    amount: 5000,
    city: 5000,
    national: 0,
    province: 0,
    other: 0,
    previous: 4500,
    status: "오류",
    note: "근거자료 또는 사전절차 확인",
  },
];

const navItems = [
  { label: "예산 편성 시트", icon: ClipboardCheck, count: "01" },
  { label: "예산 현황", icon: LayoutDashboard },
  { label: "심의 이력", icon: History },
];

const toolItems = [
  { label: "심의 기준 설정", icon: SlidersHorizontal },
  { label: "정원·현원 관리", icon: UsersRound },
  { label: "데이터 연결", icon: Database, subItems: [
    { label: "업로드 양식 다운", action: "upload" }
  ]},
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
  const [activeNav, setActiveNav] = useState("예산 편성 시트");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>(rows);
  const [editingRow, setEditingRow] = useState<BudgetRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState("2027");
  const [department, setDepartment] = useState("복지정책과");
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"전체" | Status>("전체");
  const [search, setSearch] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(columns.map(([key]) => key));
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [capacity, setCapacity] = useState("14");
  const [current, setCurrent] = useState("12");
  const [toast, setToast] = useState("");

  const filteredRows = useMemo(() => {
    return budgetRows.filter((row) => {
      const searchable = `${row.policy} ${row.program} ${row.account} ${row.detail}`;
      const matchesSearch = searchable.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "전체" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [budgetRows, search, statusFilter]);

  const totals = useMemo(() => budgetRows.reduce((sum, row) => ({ amount: sum.amount + row.amount, city: sum.city + row.city, national: sum.national + row.national, province: sum.province + row.province, other: sum.other + row.other, previous: sum.previous + row.previous }), { amount: 0, city: 0, national: 0, province: 0, other: 0, previous: 0 }), [budgetRows]);

  const counts = {
    전체: budgetRows.length,
    오류: budgetRows.filter((row) => row.status === "오류").length,
    주의: budgetRows.filter((row) => row.status === "주의").length,
    정상: budgetRows.filter((row) => row.status === "정상").length,
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

  const saveStaff = () => {
    setShowStaffModal(false);
    showToast(`정원 ${capacity}명 · 현원 ${current}명으로 저장했습니다.`);
  };

  const parseNumber = (value: unknown) => Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;
  const pick = (record: Record<string, unknown>, keys: string[]) => {
    const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(record, candidate));
    return key ? record[key] : "";
  };

  const handleExcelUpload = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      const nextRows = imported.map((record, index): BudgetRow => {
        const rawStatus = String(pick(record, ["상태", "status"]));
        const status: Status = rawStatus === "오류" || rawStatus === "주의" || rawStatus === "정상" ? rawStatus : "정상";
        return {
          id: Date.now() + index,
          policy: String(pick(record, ["정책", "정책 / 단위 / 세부사업", "policy"])) || "미분류 정책",
          program: String(pick(record, ["세부사업", "사업명", "program"])) || "미입력 사업",
          code: String(pick(record, ["코드", "code"])) || "-",
          account: String(pick(record, ["편성목·통계목", "편성목", "account"])) || "미입력",
          detail: String(pick(record, ["산출내역", "detail"])) || "-",
          amount: parseNumber(pick(record, ["요구액", "amount"])),
          city: parseNumber(pick(record, ["시비", "city"])),
          national: parseNumber(pick(record, ["국비", "national"])),
          province: parseNumber(pick(record, ["도비", "province"])),
          other: parseNumber(pick(record, ["기타", "other"])),
          previous: parseNumber(pick(record, ["전년도", "previous"])),
          status,
          note: String(pick(record, ["검토메모", "메모", "note"])) || undefined,
        };
      });
      if (!nextRows.length) throw new Error("empty");
      setBudgetRows(nextRows);
      setSearch("");
      showToast(`${nextRows.length}개 예산 항목을 엑셀에서 불러왔습니다.`);
    } catch {
      showToast("엑셀 파일을 읽지 못했습니다. 첫 번째 시트와 열 이름을 확인해 주세요.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveRowEdit = () => {
    if (!editingRow) return;
    setBudgetRows((currentRows) => currentRows.map((row) => row.id === editingRow.id ? editingRow : row));
    setEditingRow(null);
    showToast(`${editingRow.program} 항목을 저장했습니다.`);
  };

  const downloadTemplate = () => {
    const template = [{ 정책: "노인복지 증진", 세부사업: "사업명을 입력하세요", 코드: "300", "편성목·통계목": "302-03 민간경상보조", 산출내역: "산출근거를 입력하세요", 요구액: 0, 시비: 0, 국비: 0, 도비: 0, 기타: 0, 전년도: 0, 상태: "정상", 검토메모: "" }];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "예산편성");
    XLSX.writeFile(workbook, "2027_본예산_편성양식.xlsx");
    showToast("엑셀 양식을 다운로드했습니다.");
  };

  const renderCell = (row: BudgetRow, key: ColumnKey) => {
    if (key === "policy") {
      return (
        <div className="program-cell">
          <span className="policy-name">{row.policy}</span>
          <span className="program-name">{row.program}</span>
        </div>
      );
    }
    if (key === "account") {
      return (
        <div className="account-cell">
          <span className="account-code">{row.code}</span>
          <span className="account-name">{row.account}</span>
        </div>
      );
    }
    if (key === "detail") {
      const parts = row.detail.split(" · ");
      const formula = parts[0];
      const description = parts.slice(1).join(" · ");
      return (
        <div className="detail-cell">
          <span className="detail-formula">{formula}</span>
          {description && <span className="detail-description">{description}</span>}
          {row.note && <span className={`row-note row-note-${row.status}`}>{row.note}</span>}
        </div>
      );
    }
    if (key === "status") return <StatusBadge status={row.status} />;
    const value = row[key as keyof BudgetRow];
    return <span className={key === "amount" ? "amount-emphasis" : "numeric-cell"}>{formatAmount(Number(value))}</span>;
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`} onMouseEnter={() => setSidebarCollapsed(false)} onMouseLeave={() => setSidebarCollapsed(true)}>
        <div className="sidebar-card">
          <div className="card">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" className="moon"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"></path></svg>
          </div>
          <div className="sidebar-title"><span>지방자체단체</span><span>예산편성검토</span></div>
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="워크스페이스">
          {navItems.map(({ label, icon: Icon, count }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => {
                setActiveNav(label);
                if (label !== "예산 편성 시트") showToast(`${label} 화면은 다음 업데이트에서 제공됩니다.`);
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {count && <span className="nav-count">{count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-label tools-label">TOOLS</div>
        <nav className="nav-list" aria-label="도구">
          {toolItems.map(({ label, icon: Icon, subItems }) => (
            <div key={label}>
              <button className="nav-item" onClick={() => showToast(`${label} 화면은 다음 업데이트에서 제공됩니다.`)}>
                <Icon size={17} />
                <span>{label}</span>
              </button>
              {subItems && (
                <nav className="nav-sublist">
                  {subItems.map(({ label: subLabel, action }) => (
                    <button
                      key={subLabel}
                      className="nav-subitem"
                      onClick={() => {
                        if (action === "upload") {
                          fileInputRef.current?.click();
                        } else {
                          showToast(`${subLabel} 화면은 다음 업데이트에서 제공됩니다.`);
                        }
                      }}
                    >
                      <span>{subLabel}</span>
                    </button>
                  ))}
                </nav>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom" />
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>DASHBOARDS</span><ChevronRight size={14} /><b>예산 편성 시트</b></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div className="title-area">
              <div className="title-wrapper">
                <h1>{year} 본예산 편성검토</h1>
              </div>
              <div className="action-row">
                <label className="upload-file-field"><Upload size={16} /><span>UPLOAD</span><input ref={fileInputRef} className="upload-input" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => handleExcelUpload(event.target.files?.[0])} /></label>
                <div className="action-group">
                  <div style={{ position: "relative" }}>
                    <button
                      className="upload-file-field"
                      onClick={() => setShowSaveMenu(!showSaveMenu)}
                    >
                      <Download size={16} />SAVE
                    </button>
                    {showSaveMenu && (
                      <div className="save-menu">
                        <button onClick={() => { showToast("CSV 내보내기를 준비했습니다."); setShowSaveMenu(false); }}>
                          CSV 내보내기
                        </button>
                        <button onClick={() => { showToast("인쇄 미리보기를 준비했습니다."); setShowSaveMenu(false); }}>
                          인쇄 / PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="add-button-circle" title="Add New" onClick={() => showToast("새 편성 항목 입력을 준비했습니다.")} aria-label="편성 추가"><svg xmlns="http://www.w3.org/2000/svg" width="36px" height="36px" viewBox="0 0 24 24" className="add-button-icon"><path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" strokeWidth="1.5"></path><path d="M8 12H16" strokeWidth="1.5"></path><path d="M12 16V8" strokeWidth="1.5"></path></svg></button>
                </div>
              </div>
            </div>
            <div className="context-bar">
              <label className="select-field"><span>회계연도</span><span className="select-wrap"><select value={year} onChange={(event) => setYear(event.target.value)}><option value="2027">2027년</option><option value="2026">2026년</option></select><ChevronDown size={15} /></span></label>
              <label className="select-field"><span>편성 부서</span><span className="select-wrap"><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="복지정책과">복지정책과</option><option value="교육청소년과">교육청소년과</option><option value="보건의료과">보건의료과</option></select><ChevronDown size={15} /></span></label>
              <label className="select-field"><span>정현원</span><button className="staff-summary" onClick={() => setShowStaffModal(true)}><UsersRound size={17} /><span>정원 <b>{capacity}명</b></span><span>현원 <b>{current}명</b></span></button></label>
            </div>
          </section>

          <section className="metric-grid" aria-label="예산 요약">
            <article className="metric-card">
              <div className="metric-header">
                <div className="metric-top"><span>2027 요구액</span></div>
                <div className="metric-sub">↗ 21.5%</div>
              </div>
              <strong>{formatMillion(totals.amount)}백만원</strong>
            </article>
            <article className="metric-card">
              <div className="metric-header">
                <div className="metric-top"><span>2026 예산액</span></div>
                <div className="metric-sub">↗ 21.5%</div>
              </div>
              <strong>{formatMillion(totals.previous)}백만원</strong>
            </article>
            <article className="metric-card">
              <div className="metric-header">
                <div className="metric-top"><span>전년도 집행액</span></div>
                <div className="metric-sub">집행률 8.8%</div>
              </div>
              <strong>1,214백만원</strong>
            </article>
            <article className="metric-card metric-alert">
              <div className="metric-header">
                <div className="metric-top"><span>점검 · 오류</span><AlertCircle size={18} /></div>
                <div className="metric-sub">오류 4 · 주의 1</div>
              </div>
              <strong>4건</strong>
            </article>
          </section>

          <section className="table-panel">
            <div className="table-heading">
              <div className="table-title"><div><h2><span className="actual-text">&nbsp;{department}&nbsp;</span><span aria-hidden="true" className="hover-text">&nbsp;{department}&nbsp;</span></h2></div></div>
              <div className="table-tools">
                <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="사업명, 산출내역 검색" aria-label="사업명, 산출내역 검색" />{search && <button aria-label="검색어 지우기" onClick={() => setSearch("")}><X size={14} /></button>}</div>
                <div className="column-menu-wrap">
                  <AppButton variant="outline" onClick={() => setShowColumns(!showColumns)}><ListFilter size={16} />열 설정</AppButton>
                  {showColumns && <div className="column-menu">{columns.map(([key, label]) => <label key={key}><input type="checkbox" checked={visibleColumns.includes(key)} onChange={() => toggleColumn(key)} /><span>{label}</span></label>)}</div>}
                </div>
              </div>
            </div>

            <div className="filter-row">
              <span className="filter-label"><Filter size={15} />필터</span>
              {(["오류", "주의", "정상"] as const).map((filter) => <button key={filter} className={`filter-chip ${statusFilter === filter ? "selected" : ""} filter-${filter}`} onClick={() => setStatusFilter(filter)}><span className="chip-dot" />{filter}<b>{counts[filter]}</b></button>)}
              <button className="result-refresh" aria-label="새로고침" onClick={() => showToast("목록을 새로고침했습니다.")}><RefreshCw size={15} /></button>
            </div>

            <div className="table-scroll">
              <table className="budget-table">
                <thead><tr>{columns.filter(([key]) => visibleColumns.includes(key)).map(([key, label]) => <th key={key} className={`col-${key}`}>{label}</th>)}<th className="col-action">편집</th></tr></thead>
                <tbody>
                  <tr className="total-row">{columns.filter(([key]) => visibleColumns.includes(key)).map(([key]) => <td key={key} className={`col-${key}`}>{key === "policy" ? "" : key === "account" ? "" : key === "detail" ? <b>합계</b> : key === "amount" ? <b>{formatAmount(totals.amount)}</b> : key === "city" ? <b>{formatAmount(totals.city)}</b> : key === "national" ? <b>{formatAmount(totals.national)}</b> : key === "province" ? <b>{formatAmount(totals.province)}</b> : key === "other" ? <b>{formatAmount(totals.other)}</b> : key === "previous" ? <b>{formatAmount(totals.previous)}</b> : key === "status" ? "" : null}</td>)}</tr>
                  {filteredRows.map((row) => <tr key={row.id} className={`budget-row row-${row.status}`}>
                    {columns.filter(([key]) => visibleColumns.includes(key)).map(([key]) => <td key={key} className={`col-${key}`}>{renderCell(row, key)}</td>)}
                    <td className="action-cell"><button className="row-edit" onClick={() => setEditingRow(row)} aria-label={`${row.program} 편집`}><Pencil size={15} /></button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-footer"></div>
          </section>
        </div>
      </main>

      {showStaffModal && <div className="modal-backdrop" onMouseDown={() => setShowStaffModal(false)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span>DEPARTMENT PROFILE</span><h2>정원·현원 편집</h2></div><button className="close-button" onClick={() => setShowStaffModal(false)} aria-label="닫기"><X size={19} /></button></div><div className="modal-fields"><label>정원<input value={capacity} onChange={(event) => setCapacity(event.target.value)} inputMode="numeric" /><span>명</span></label><label>현원<input value={current} onChange={(event) => setCurrent(event.target.value)} inputMode="numeric" /><span>명</span></label></div><p className="modal-note"><UsersRound size={16} />현재 <b>결원 {Math.max(0, Number(capacity) - Number(current))}명</b>으로 표시됩니다.</p><div className="modal-actions"><AppButton variant="ghost" onClick={() => setShowStaffModal(false)}>취소</AppButton><AppButton variant="primary" onClick={saveStaff}>저장</AppButton></div></div></div>}
      {editingRow && <div className="modal-backdrop" onMouseDown={() => setEditingRow(null)}><div className="modal-card edit-row-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span>BUDGET ITEM / EDIT</span><h2>예산 항목 편집</h2></div><button className="close-button" onClick={() => setEditingRow(null)} aria-label="닫기"><X size={19} /></button></div><div className="edit-grid"><label>정책<input value={editingRow.policy} onChange={(event) => setEditingRow({ ...editingRow, policy: event.target.value })} /></label><label>세부사업<input value={editingRow.program} onChange={(event) => setEditingRow({ ...editingRow, program: event.target.value })} /></label><label className="edit-wide">산출내역<input value={editingRow.detail} onChange={(event) => setEditingRow({ ...editingRow, detail: event.target.value })} /></label><label>요구액(천원)<input value={editingRow.amount} onChange={(event) => setEditingRow({ ...editingRow, amount: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>전년도(천원)<input value={editingRow.previous} onChange={(event) => setEditingRow({ ...editingRow, previous: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>시비(천원)<input value={editingRow.city} onChange={(event) => setEditingRow({ ...editingRow, city: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>국비(천원)<input value={editingRow.national} onChange={(event) => setEditingRow({ ...editingRow, national: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>도비(천원)<input value={editingRow.province} onChange={(event) => setEditingRow({ ...editingRow, province: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>기타(천원)<input value={editingRow.other} onChange={(event) => setEditingRow({ ...editingRow, other: parseNumber(event.target.value) })} inputMode="numeric" /></label><label>상태<select value={editingRow.status} onChange={(event) => setEditingRow({ ...editingRow, status: event.target.value as Status })}><option>정상</option><option>주의</option><option>오류</option></select></label><label className="edit-wide">검토 메모<input value={editingRow.note ?? ""} onChange={(event) => setEditingRow({ ...editingRow, note: event.target.value })} placeholder="검토 메모를 입력하세요" /></label></div><div className="modal-actions"><AppButton variant="ghost" onClick={() => setEditingRow(null)}>취소</AppButton><AppButton variant="primary" onClick={saveRowEdit}>저장</AppButton></div></div></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  );
}
