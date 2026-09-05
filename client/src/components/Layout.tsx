import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  ClipboardCheck,
  History,
  SlidersHorizontal,
  UsersRound,
  Database,
  ChevronRight,
  Landmark,
  X,
} from "lucide-react";

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
  { label: "예산설명자료", icon: Database, path: "/", disabled: true },
];

const toolItems = [
  { label: "심의 기준 설정", icon: SlidersHorizontal },
  { label: "정원·현원 관리", icon: UsersRound },
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
    location === "/" ? "예산 편성 시트" : "예산집행현황"
  );

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
          {navItems.map(({ label, icon: Icon, path, count, disabled }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""} ${disabled ? "disabled" : ""}`}
              aria-label={label}
              disabled={disabled}
              onClick={() => {
                setActiveNav(label);
                if (path && !disabled) {
                  setLocation(path);
                } else if (disabled) {
                  showToast(`${label} 화면은 다음 업데이트에서 제공됩니다.`);
                }
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
