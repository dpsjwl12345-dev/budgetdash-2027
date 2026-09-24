import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "wouter";
import {
  ClipboardCheck,
  History,
  SlidersHorizontal,
  Database,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Landmark,
  Award,
  Banknote,
  Users,
  PanelLeftOpen,
  PanelLeftClose,
  LayoutDashboard,
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/departments";

type NavItem = {
  label: string;
  icon: React.FC<{ size: number }>;
  path: string;
  count?: string;
  disabled?: boolean;
  iconColor?: string;
};

type ToolItem = {
  label: string;
  icon: React.FC<{ size: number }>;
  path?: string;
  subItems?: { label: string; path?: string }[];
};

const navItems: NavItem[] = [
  { label: "시 전체 현황", icon: LayoutDashboard, path: "/" },
  { label: "부서예산요구", icon: ClipboardCheck, path: "/department-budget-request", count: "01" },
  { label: "예산설명자료", icon: Database, path: "/budget-explainer", iconColor: "#d9ad52" },
  { label: "예산집행현황", icon: History, path: "/budget-execution-2026", iconColor: "#d9ad52" },
  { label: "지방채사업", icon: Banknote, path: "/local-bonds", iconColor: "#d9ad52" },
  { label: "당정협의회요구", icon: Landmark, path: "/council-member-requests", iconColor: "#d9ad52" },
  { label: "시장님 요구사항", icon: Users, path: "/mayor-vice-mayor-requests", iconColor: "#d9ad52" },
];

const toolItems: ToolItem[] = [
  {
    label: "예산 편성 가이드",
    icon: SlidersHorizontal,
    subItems: [
      { label: "사전절차" },
      { label: "세출 통계목별 상세" },
      { label: "인건비 계산기" },
      { label: "산출식(함수) 전체 목록" },
    ],
  },
  { label: "성과평가반영", icon: Award, path: "/performance-evaluation" },
  { label: "부서별 주요 쟁점사항", icon: AlertCircle, path: "/department-key-issues" },
];

export default function Layout({
  children,
  showToast,
}: {
  children: React.ReactNode;
  showToast?: (message: string) => void;
}) {
  const [location, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const isBudgetExplainerPage = location === "/budget-explainer";
  const isCityOverviewPage = location === "/";
  const currentDept = isBudgetExplainerPage ? searchParams.get("dept") : null;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isBudgetExplainerPage || isCityOverviewPage);

  const getActiveNavLabel = () => {
    const navItem = navItems.find((item) => item.path === location);
    if (navItem) return navItem.label;

    switch (location) {
      case "/budget-establishment-guide":
        return "사전절차";
      case "/statistics-code-detail":
        return "세출 통계목별 상세";
      case "/formula-overview":
        return "산출식(함수) 전체 목록";
      case "/department-key-issues":
        return "부서별 주요 쟁점사항";
      default:
        return "시 전체 현황";
    }
  };

  const [activeNav, setActiveNav] = useState(getActiveNavLabel());
  const [expandedBudgetExplainer, setExpandedBudgetExplainer] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(isBudgetExplainerPage || isCityOverviewPage);
    setActiveNav(getActiveNavLabel());
  }, [location]);

  return (
    <div className="app-shell">
      <aside
        className={`sidebar no-print ${sidebarCollapsed ? "collapsed" : ""}`}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
      >
        <button
          type="button"
          className="brand-lockup"
          onClick={() => {
            setActiveNav("시 전체 현황");
            setLocation("/");
          }}
          aria-label="초기 화면으로 이동"
        >
          <div className="sidebar-title">
            <span>2027 화성시</span>
            <span>예산편성검토</span>
          </div>
        </button>
        <div className="sidebar-divider" />
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="워크스페이스">
          {navItems.map(({ label, icon: Icon, path, count, disabled, iconColor }) => {
            const isBudgetExplainer = label === "예산설명자료";

            const button = (
              <button
                key={label}
                className={`nav-item ${activeNav === label ? "active" : ""} ${disabled ? "disabled" : ""}`}
                aria-label={label}
                disabled={disabled}
                onClick={() => {
                  setActiveNav(label);
                  if (isBudgetExplainer) {
                    setExpandedBudgetExplainer(!expandedBudgetExplainer);
                  } else if (path && !disabled) {
                    setLocation(path);
                  } else if (disabled) {
                    showToast?.(`${label} 화면은 다음 업데이트에서 제공됩니다.`);
                  }
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {count && <span className="nav-count">{count}</span>}
                {isBudgetExplainer && (
                  <ChevronDown
                    size={10}
                    style={{
                      marginLeft: "auto",
                      transform: expandedBudgetExplainer ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 0.2s",
                      opacity: 0.6,
                      background: "none !important",
                      padding: "0 !important",
                      border: "none !important",
                      width: "auto !important",
                      height: "auto !important",
                    }}
                  />
                )}
              </button>
            );

            if (!isBudgetExplainer) {
              return button;
            }

            return (
              <div key={label}>
                {button}
                {expandedBudgetExplainer && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {DEPARTMENTS.map((dept) => {
                      const isDeptActive = currentDept === dept;
                      return (
                        <button
                          key={dept}
                          style={{
                            paddingLeft: "44px",
                            paddingRight: "12px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            fontSize: "13px",
                            fontWeight: isDeptActive ? 600 : 400,
                            color: isDeptActive ? "#ffffff" : "var(--text-muted)",
                            backgroundColor: isDeptActive ? "rgba(203, 213, 225, 0.08)" : "transparent",
                            border: "none",
                            borderLeft: isDeptActive ? "2px solid #cbd5e1" : "2px solid transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                          onClick={() => {
                            setActiveNav(label);
                            setLocation(`/budget-explainer?dept=${encodeURIComponent(dept)}`);
                          }}
                          onMouseEnter={(e) => {
                            if (isDeptActive) return;
                            e.currentTarget.style.backgroundColor = "rgba(118, 157, 194, 0.08)";
                            e.currentTarget.style.color = "var(--text)";
                          }}
                          onMouseLeave={(e) => {
                            if (isDeptActive) return;
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--text-muted)";
                          }}
                        >
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-label tools-label">TOOLS</div>
        <nav className="nav-list" aria-label="도구">
          {toolItems.map(({ label, icon: Icon, path, subItems }) => {
            const hasSubItems = subItems && subItems.length > 0;
            const isExpanded = label === "예산 편성 가이드" ? expandedGuide : false;

            const button = (
              <button
                key={label}
                className="nav-item"
                aria-label={label}
                onClick={() => {
                  if (hasSubItems && label === "예산 편성 가이드") {
                    setExpandedGuide(!expandedGuide);
                  } else if (path) {
                    setLocation(path);
                  } else {
                    showToast?.(`${label} 화면은 다음 업데이트에서 제공됩니다.`);
                  }
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {hasSubItems && (
                  <ChevronDown
                    size={10}
                    style={{
                      marginLeft: "auto",
                      transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 0.2s",
                      opacity: 0.6,
                    }}
                  />
                )}
              </button>
            );

            if (!hasSubItems) {
              return <div key={label}>{button}</div>;
            }

            return (
              <div key={label}>
                {button}
                {isExpanded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {subItems.map((subItem) => (
                      <button
                        key={subItem.label}
                        style={{
                          paddingLeft: "44px",
                          paddingRight: "12px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "14px",
                          fontWeight: 400,
                          color: "var(--text-muted)",
                          backgroundColor: "transparent",
                          border: "none",
                          borderLeft: "2px solid transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onClick={() => {
                          if (subItem.label === "사전절차") {
                            setLocation("/budget-establishment-guide");
                          } else if (subItem.label === "세출 통계목별 상세") {
                            setLocation("/statistics-code-detail");
                          } else if (subItem.label === "산출식(함수) 전체 목록") {
                            setLocation("/formula-overview");
                          } else if (subItem.label === "인건비 계산기") {
                            setLocation("/temp-worker-wage-calculator");
                          } else {
                            showToast?.(`${subItem.label}은 다음 업데이트에서 제공됩니다.`);
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(118, 157, 194, 0.08)";
                          e.currentTarget.style.color = "var(--text)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? "사이드바 펴기" : "사이드바 접기"}
            title={sidebarCollapsed ? "사이드바 펴기" : "사이드바 접기"}
            onClick={(event) => {
              event.stopPropagation();
              setSidebarCollapsed((collapsed) => !collapsed);
            }}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span>{sidebarCollapsed ? "펴기" : "접기"}</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar no-print">
          <div className="breadcrumbs">
            <span>DASHBOARDS</span>
            <ChevronRight size={14} />
            <b>{activeNav}</b>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
