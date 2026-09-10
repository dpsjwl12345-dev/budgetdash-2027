import { useState, useRef, useEffect } from "react";
import { useLocation, useSearchParams } from "wouter";
import {
  ClipboardCheck,
  History,
  SlidersHorizontal,
  Database,
  ChevronRight,
  X,
  ChevronDown,
  AlertCircle,
  Highlighter,
  Undo2,
  Trash2,
  PanelLeftOpen,
  PanelLeftClose,
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

type HighlightStroke = {
  color: string;
  points: { x: number; y: number }[];
};

const navItems: NavItem[] = [
  { label: "예산 편성 시트", icon: ClipboardCheck, path: "/", count: "01" },
  { label: "예산집행현황", icon: History, path: "/budget-execution-2026", iconColor: "#d9ad52" },
  { label: "예산설명자료", icon: Database, path: "/budget-explainer", iconColor: "#d9ad52" },
];

const toolItems: ToolItem[] = [
  {
    label: "예산 편성 가이드",
    icon: SlidersHorizontal,
    subItems: [
      { label: "사전절차 및 편성기준" },
      { label: "세출 통계목별 상세" },
    ],
  },
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
  const currentDept = isBudgetExplainerPage ? searchParams.get("dept") : null;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isBudgetExplainerPage);

  const getActiveNavLabel = () => {
    const navItem = navItems.find((item) => item.path === location);
    if (navItem) return navItem.label;

    switch (location) {
      case "/budget-establishment-guide":
        return "사전절차 및 편성기준";
      case "/statistics-code-detail":
        return "세출 통계목별 상세";
      case "/department-key-issues":
        return "부서별 주요 쟁점사항";
      default:
        return "예산 편성 시트";
    }
  };

  const [activeNav, setActiveNav] = useState(getActiveNavLabel());
  const [expandedBudgetExplainer, setExpandedBudgetExplainer] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState("#ffe45c");
  const [highlightStrokes, setHighlightStrokes] = useState<HighlightStroke[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setSidebarCollapsed(isBudgetExplainerPage);
    setActiveNav(getActiveNavLabel());
  }, [location]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      highlightStrokes.forEach((stroke) => drawStroke(context, stroke));
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    const redrawOnScroll = () => redrawHighlights(highlightStrokes);
    window.addEventListener("scroll", redrawOnScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("scroll", redrawOnScroll);
    };
  }, [highlightStrokes]);

  const drawStroke = (context: CanvasRenderingContext2D, stroke: HighlightStroke) => {
    if (stroke.points.length < 2) return;
    context.save();
    context.globalAlpha = 0.42;
    context.globalCompositeOperation = "multiply";
    context.strokeStyle = stroke.color;
    context.lineWidth = 22;
    context.lineCap = "butt";
    context.lineJoin = "miter";
    context.beginPath();
    context.moveTo(stroke.points[0].x - window.scrollX, stroke.points[0].y - window.scrollY);
    stroke.points.slice(1).forEach((point) => context.lineTo(point.x - window.scrollX, point.y - window.scrollY));
    context.stroke();
    context.restore();
  };

  const redrawHighlights = (strokes: HighlightStroke[]) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    strokes.forEach((stroke) => drawStroke(context, stroke));
  };

  const getPointerPoint = (event: React.PointerEvent<HTMLCanvasElement>) => ({
    x: event.clientX + window.scrollX,
    y: event.clientY + window.scrollY,
  });

  const startHighlight = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (eraserMode) {
      handleEraser(event);
      return;
    }
    drawingRef.current = true;
    strokeStartRef.current = getPointerPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setHighlightStrokes((strokes) => [...strokes, { color: highlightColor, points: [getPointerPoint(event), getPointerPoint(event)] }]);
  };

  const continueHighlight = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || eraserMode) return;
    setHighlightStrokes((strokes) => {
      const next = [...strokes];
      const current = next[next.length - 1];
      const start = strokeStartRef.current;
      if (!current || !start) return strokes;
      // 형광펜은 자유 곡선이 아닌 시작점과 현재 위치를 잇는 직선으로 표시한다.
      current.points = [start, getPointerPoint(event)];
      redrawHighlights(next);
      return next;
    });
  };

  const finishHighlight = () => {
    drawingRef.current = false;
    strokeStartRef.current = null;
  };

  const handleEraser = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const clickPoint = getPointerPoint(event);
    const eraserRadius = 30;

    setHighlightStrokes((strokes) => {
      const filtered = strokes.filter((stroke) => {
        return !stroke.points.some(
          (point) =>
            Math.hypot(point.x - clickPoint.x, point.y - clickPoint.y) <= eraserRadius
        );
      });
      redrawHighlights(filtered);
      return filtered;
    });
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
      >
        <div className="brand-lockup">
          <div className="sidebar-title">
            <span>지방자치단체</span>
            <span>예산편성검토</span>
          </div>
        </div>
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
                          if (subItem.label === "사전절차 및 편성기준") {
                            setLocation("/budget-establishment-guide");
                          } else if (subItem.label === "세출 통계목별 상세") {
                            setLocation("/statistics-code-detail");
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
        <header className="topbar">
          <div className="breadcrumbs">
            <span>DASHBOARDS</span>
            <ChevronRight size={14} />
            <b>{activeNav}</b>
          </div>
        </header>

        {children}
      </main>

      <canvas
        ref={canvasRef}
        aria-hidden={!highlightMode}
        onPointerDown={highlightMode ? startHighlight : undefined}
        onPointerMove={highlightMode ? continueHighlight : undefined}
        onPointerUp={highlightMode ? finishHighlight : undefined}
        onPointerCancel={highlightMode ? finishHighlight : undefined}
        style={{
          position: "fixed",
          inset: 0,
          // 도구를 닫아도 캔버스가 콘텐츠 위에 남아 기존 표시를 계속 보여준다.
          zIndex: 40,
          pointerEvents: highlightMode ? "auto" : "none",
          cursor: highlightMode ? (eraserMode ? "not-allowed" : "crosshair") : "default",
        }}
      />

      <div
        style={{
          position: "fixed",
          left: "24px",
          bottom: "24px",
          zIndex: 41,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          border: "1px solid var(--line)",
          borderRadius: "10px",
          background: "var(--panel-raised)",
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
        }}
      >
        {highlightMode && !eraserMode && ["#ffe45c", "#7ee787", "#ff8fab"].map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`형광펜 색상 ${color}`}
            onClick={() => setHighlightColor(color)}
            style={{
              width: "22px",
              height: "22px",
              padding: 0,
              border: highlightColor === color ? "2px solid var(--text)" : "1px solid var(--line)",
              borderRadius: "50%",
              background: color,
              cursor: "pointer",
            }}
          />
        ))}
        {highlightMode && (
          <>
            <button type="button" onClick={() => setEraserMode(!eraserMode)} aria-label={eraserMode ? "지우기 모드 해제" : "지우기 모드"} title={eraserMode ? "지우기 모드 해제" : "지우기"} className="icon-stack-btn" style={{ width: "32px", height: "32px", background: eraserMode ? "rgba(255, 107, 107, 0.2)" : "transparent" }}>
              <Trash2 size={16} />
            </button>
            <button type="button" onClick={() => setHighlightStrokes((strokes) => strokes.slice(0, -1))} aria-label="마지막 형광펜 되돌리기" title="실행 취소" className="icon-stack-btn" style={{ width: "32px", height: "32px" }} disabled={eraserMode}>
              <Undo2 size={16} />
            </button>
            <button type="button" onClick={() => { setHighlightStrokes([]); redrawHighlights([]); setEraserMode(false); }} aria-label="형광펜 전체 지우기" title="전체 지우기" className="icon-stack-btn" style={{ width: "32px", height: "32px" }}>
              <Trash2 size={16} />
            </button>
            <button type="button" onClick={() => { setHighlightMode(false); setEraserMode(false); }} aria-label="형광펜 닫기" title="닫기" className="icon-stack-btn" style={{ width: "32px", height: "32px" }}>
              <X size={16} />
            </button>
          </>
        )}
        {!highlightMode && (
          <button
            type="button"
            onClick={() => setHighlightMode(true)}
            aria-label="형광펜 켜기"
            title="형광펜"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "38px",
              padding: "0 12px",
              border: "1px solid #f4d35e",
              borderRadius: "7px",
              background: "#ffe45c",
              color: "#2a2614",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Highlighter size={18} />
            형광펜
          </button>
        )}
      </div>
    </div>
  );
}
