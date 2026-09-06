import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  ClipboardCheck,
  History,
  SlidersHorizontal,
  Database,
  ChevronRight,
  Landmark,
  X,
  ChevronDown,
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/departments";

type NavItem = {
  label: string;
  icon: React.FC<{ size: number }>;
  path: string;
  count?: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { label: "예산 편성 시트", icon: ClipboardCheck, path: "/", count: "01" },
  { label: "예산집행현황", icon: History, path: "/budget-execution-2026" },
  { label: "예산설명자료", icon: Database, path: "/budget-explainer" },
];

const toolItems = [
  { label: "심의 기준 설정", icon: SlidersHorizontal },
];

export default function Layout({
  children,
  showToast,
}: {
  children: React.ReactNode;
  showToast: (message: string) => void;
}) {
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState(
    navItems.find((item) => item.path === location)?.label ?? "예산 편성 시트"
  );
  const [expandedBudgetExplainer, setExpandedBudgetExplainer] = useState(false);

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
      >
        <div className="brand-lockup">
          <div className="brand-icon">
            <Landmark size={18} />
          </div>
          <div className="sidebar-title">
            <span>지방자치단체</span>
            <span>예산편성검토</span>
          </div>
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="워크스페이스">
          {navItems.map(({ label, icon: Icon, path, count, disabled }) => {
            const isBudgetExplainer = label === "예산설명자료";
            return (
              <div key={label}>
                <button
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
                      showToast(`${label} 화면은 다음 업데이트에서 제공됩니다.`);
                    }
                  }}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {count && <span className="nav-count">{count}</span>}
                  {isBudgetExplainer && (
                    <ChevronDown
                      size={16}
                      style={{
                        marginLeft: "auto",
                        transform: expandedBudgetExplainer ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  )}
                </button>
                {isBudgetExplainer && expandedBudgetExplainer && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept}
                        style={{
                          paddingLeft: "44px",
                          paddingRight: "12px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onClick={() => {
                          setActiveNav(label);
                          setLocation(`/budget-explainer?dept=${encodeURIComponent(dept)}`);
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
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-label tools-label">TOOLS</div>
        <nav className="nav-list" aria-label="도구">
          {toolItems.map(({ label, icon: Icon }) => (
            <div key={label}>
              <button
                className="nav-item"
                aria-label={label}
                onClick={() =>
                  showToast(`${label} 화면은 다음 업데이트에서 제공됩니다.`)
                }
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom" />
      </aside>

      <main className="main-area">
        <header className="topbar">
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
