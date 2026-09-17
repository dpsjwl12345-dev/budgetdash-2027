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
  Landmark,
  Highlighter,
  Eraser,
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
      { label: "사전절차" },
      { label: "세출 통계목별 상세" },
      { label: "산출식(함수) 전체 목록" },
      { label: "기간제근로자 인건비 계산기" },
    ],
  },
  { label: "부서별 주요 쟁점사항", icon: AlertCircle, path: "/department-key-issues" },
  { label: "시의원 요구사항", icon: Landmark, path: "/council-member-requests" },
];

export default function Layout({
  children,
  showToast,
  highlightScope,
}: {
  children: React.ReactNode;
  showToast?: (message: string) => void;
  // 같은 경로(URL)인데 화면에 보이는 내용이 실질적으로 바뀌는 페이지(예: 예산 편성 시트의
  // "편성 부서" 드롭다운 - URL은 그대로 "/"임)는 이걸로 형광펜을 부서별로 따로 구분해서
  // 보관하게 한다. 안 넘기면 경로만으로 구분(기존 동작 그대로).
  highlightScope?: string | null;
}) {
  const [location, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const isBudgetExplainerPage = location === "/budget-explainer";
  const currentDept = isBudgetExplainerPage ? searchParams.get("dept") : null;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isBudgetExplainerPage);
  const highlightPathKey = highlightScope ? `${location}::${highlightScope}` : location;

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
      case "/council-member-requests":
        return "시의원 요구사항";
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
  const [highlightToolbarPosition, setHighlightToolbarPosition] = useState({ left: 24, bottom: 24 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokeStartRef = useRef<{ x: number; y: number } | null>(null);
  const toolbarDragRef = useRef<{ pointerX: number; pointerY: number; left: number; bottom: number } | null>(null);
  // 형광펜 표시는 "경로+화면 범위(highlightScope)"별로 따로 보관한다 - 경로만으로 구분하면
  // 예산 편성 시트처럼 URL은 그대로인데 "편성 부서" 드롭다운만으로 내용이 완전히 바뀌는
  // 화면에서, 부서를 바꿔도 형광펜이 그 자리에 그대로 남아 다른 부서 내용 위에 겹쳐 보인다.
  const highlightStrokesRef = useRef<HighlightStroke[]>([]);
  const highlightStrokesByPathRef = useRef<Record<string, HighlightStroke[]>>({});
  const prevHighlightKeyRef = useRef(highlightPathKey);
  const mainAreaRef = useRef<HTMLElement>(null);

  // 획 목록은 캔버스에만 그려지고 리액트 화면에는 나타나지 않는다. 예전엔 목록을 state로 들고
  // ref는 useEffect로 뒤늦게 맞췄는데, 그 한 박자 사이에 다시 칠하기(resizeCanvas 등)가 끼어들면
  // 캔버스가 "직전 목록"으로 칠해졌다. 방금 그은 획이 사라지거나, 페이지를 넘긴 직후 이전 페이지
  // 획이 새 내용 위에 다시 칠해지던 증상이 전부 이 시차에서 나왔다. 목록은 ref 하나만 두고 항상
  // 이 함수로만 바꿔서, 목록이 바뀌는 순간과 캔버스가 칠해지는 순간이 절대 어긋나지 않게 한다.
  const applyStrokes = (next: HighlightStroke[]) => {
    highlightStrokesRef.current = next;
    redrawHighlights(next);
  };

  useEffect(() => {
    setSidebarCollapsed(isBudgetExplainerPage);
    setActiveNav(getActiveNavLabel());
  }, [location]);

  useEffect(() => {
    // 떠나는 화면의 형광펜 표시를 저장해두고, 도착한 화면에 저장돼 있던 표시를 복원한다.
    highlightStrokesByPathRef.current[prevHighlightKeyRef.current] = highlightStrokesRef.current;
    const restored = highlightStrokesByPathRef.current[highlightPathKey] || [];
    prevHighlightKeyRef.current = highlightPathKey;
    applyStrokes(restored);
    setEraserMode(false);
  }, [highlightPathKey]);

  // 형광펜 캔버스는 본문(main) 안에 본문과 똑같은 크기로 깔아둔다. 그러면 스크롤이든, 사이드바가
  // 접히고 펴지며 본문이 좌우로 움직이는 것이든, 브라우저가 캔버스를 본문과 함께 움직여주므로
  // 형광펜이 글자에서 어긋날 일이 없다.
  //
  // 크기를 맞추는 시점이 관건인데, 예전엔 ResizeObserver 하나에만 맡겼다가 실패했다. 이 페이지에서
  // ResizeObserver 콜백은 실제로 한 번도 오지 않았고(본문 높이를 강제로 3000px로 바꿔도 0회),
  // 그 결과 캔버스가 처음 잡힌 크기(730px)에 그대로 머물러 그 아래에 칠한 형광펜이 통째로 잘려
  // 사라졌다. 그래서 이제 ResizeObserver는 "빠른 길"로만 두고, 크기 맞추기는 형광펜을 다시 그리는
  // 모든 경로(redrawHighlights)에서 직접 한다. 크기가 그대로면 아무 일도 하지 않으므로 비용도 없다.
  useEffect(() => {
    const repaint = () => redrawHighlights(highlightStrokesRef.current);
    const repaintIfResized = () => { if (syncCanvasSize()) repaint(); };

    repaint();
    window.addEventListener("resize", repaint);
    // 본문이 뒤늦게 길어지는 경우(자료 비동기 로딩 등)를 잡기 위한 보정. 스크롤은 확실히 오는
    // 이벤트이고, 크기가 안 변했으면 즉시 빠져나오므로 스크롤 성능에 영향을 주지 않는다.
    window.addEventListener("scroll", repaintIfResized, { passive: true });
    const resizeObserver = new ResizeObserver(repaintIfResized);
    if (mainAreaRef.current) resizeObserver.observe(mainAreaRef.current);
    return () => {
      window.removeEventListener("resize", repaint);
      window.removeEventListener("scroll", repaintIfResized);
      resizeObserver.disconnect();
    };
  }, []);

  // 형광펜 도구 상자를 원하는 위치로 옮길 수 있게 한다.
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = toolbarDragRef.current;
      if (!drag) return;
      const nextLeft = Math.max(8, Math.min(window.innerWidth - 180, drag.left + event.clientX - drag.pointerX));
      const nextBottom = Math.max(8, Math.min(window.innerHeight - 56, drag.bottom - (event.clientY - drag.pointerY)));
      setHighlightToolbarPosition({ left: nextLeft, bottom: nextBottom });
    };
    const stopDragging = () => { toolbarDragRef.current = null; };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, []);

  const startToolbarDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const { left, bottom } = highlightToolbarPosition;
    toolbarDragRef.current = { pointerX: event.clientX, pointerY: event.clientY, left, bottom };
    // 드래그 추적은 아래 window 레벨 pointermove/pointerup 리스너로 이미 다 처리된다
    // (포인터가 이 div 밖으로 나가도 동작함). 그런데 여기서 setPointerCapture를 걸면
    // 브라우저가 뒤이은 click 이벤트의 대상을 이 div로 강제로 바꿔버려서, 정작 그 안의
    // "형광펜 켜기" 버튼 등을 그냥 한 번 클릭해도 그 버튼의 onClick이 씹히는(안 눌리는)
    // 문제가 생긴다. 캡처가 애초에 불필요하니 아예 없앤다.
  };

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
    // 점을 저장할 때 이미 캔버스 기준 좌표로 바꿔뒀고(getPointerPoint 참고) 캔버스는 본문 전체를
    // 덮고 있으므로, 그릴 때 스크롤이나 사이드바 위치를 다시 보정할 필요가 없다.
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
    context.restore();
  };

  // 캔버스를 본문 크기에 맞춘다. 크기가 그대로면 아무것도 하지 않고 false를 돌려준다
  // (캔버스는 width/height를 대입하는 순간 그려둔 내용이 지워지므로 불필요한 대입을 피한다).
  const syncCanvasSize = () => {
    const canvas = canvasRef.current;
    const main = mainAreaRef.current;
    if (!canvas || !main) return false;
    const width = Math.max(main.scrollWidth, main.clientWidth);
    const height = Math.max(main.scrollHeight, main.clientHeight);
    if (width === 0 || height === 0) return false;
    if (canvas.style.width === `${width}px` && canvas.style.height === `${height}px`) return false;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    return true;
  };

  const redrawHighlights = (strokes: HighlightStroke[]) => {
    // 그리기 직전에 항상 크기를 맞춘다. 표 행 수나 필터가 바뀌어 본문 높이가 달라진 상태에서
    // 옛 크기 그대로 그리면, 늘어난 부분에 칠한 형광펜이 캔버스 밖이라 보이지 않는다.
    syncCanvasSize();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // setTransform(ratio, ...)로 이미 스케일된 좌표계라 canvas.width/height(물리 픽셀)를 그대로
    // 넘겨도 실제 필요한 영역보다 넓게(=안전하게) 지워질 뿐 문제없다.
    context.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => drawStroke(context, stroke));
  };

  // 캔버스가 본문(main) 안에 본문과 같은 크기로 깔려 있으므로, 캔버스 자신의 화면상 위치를
  // 기준으로 좌표를 잡으면 스크롤이든 사이드바 접힘이든 전부 자동으로 반영된다. 예전의 "문서
  // 절대좌표"(clientX + scrollX)는 사이드바가 hover로 접히고 펴질 때 본문이 좌우로 188px
  // 움직이는 것을 반영하지 못해, 그 순간 형광펜만 글자에서 옆으로 밀려 보였다.
  const getPointerPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startHighlight = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (eraserMode) {
      handleEraser(event);
      return;
    }
    drawingRef.current = true;
    strokeStartRef.current = getPointerPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    applyStrokes([...highlightStrokesRef.current, { color: highlightColor, points: [getPointerPoint(event), getPointerPoint(event)] }]);
  };

  const continueHighlight = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || eraserMode) return;
    const strokes = highlightStrokesRef.current;
    const current = strokes[strokes.length - 1];
    const start = strokeStartRef.current;
    if (!current || !start) return;
    // 형광펜은 자유 곡선이 아닌 시작점과 현재 위치를 잇는 직선으로 표시한다.
    applyStrokes([...strokes.slice(0, -1), { ...current, points: [start, getPointerPoint(event)] }]);
  };

  const finishHighlight = () => {
    drawingRef.current = false;
    strokeStartRef.current = null;
  };

  const handleEraser = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const clickPoint = getPointerPoint(event);
    const eraserRadius = 30;

    applyStrokes(highlightStrokesRef.current.filter((stroke) => !stroke.points.some(
      (point) => Math.hypot(point.x - clickPoint.x, point.y - clickPoint.y) <= eraserRadius
    )));
  };

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
            setActiveNav("예산 편성 시트");
            setLocation("/");
          }}
          aria-label="초기 화면으로 이동"
        >
          <div className="sidebar-title">
            <span>지방자치단체</span>
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
                          } else if (subItem.label === "기간제근로자 인건비 계산기") {
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

      <main className="main-area" ref={mainAreaRef}>
        <header className="topbar no-print">
          <div className="breadcrumbs">
            <span>DASHBOARDS</span>
            <ChevronRight size={14} />
            <b>{activeNav}</b>
          </div>
        </header>

        {children}

        <canvas
          ref={canvasRef}
          className="no-print"
          aria-hidden={!highlightMode}
          onPointerDown={highlightMode ? startHighlight : undefined}
          onPointerMove={highlightMode ? continueHighlight : undefined}
          onPointerUp={highlightMode ? finishHighlight : undefined}
          onPointerCancel={highlightMode ? finishHighlight : undefined}
          style={{
            // 본문(main) 안에 본문과 똑같은 크기로 깔아둔다. 사이드바가 접히고 펴지면서 본문이
            // 좌우로 움직여도 캔버스가 본문과 함께 움직이므로 형광펜이 글자에서 어긋나지 않는다.
            // 뷰포트 기준 fixed도, 문서 기준 absolute도 이 가로 이동은 따라가지 못했다.
            // 크기(width/height)는 본문 전체 크기에 맞춰 JS에서 직접 지정한다(위 resizeCanvas).
            position: "absolute",
            top: 0,
            left: 0,
            // 도구를 닫아도 캔버스가 콘텐츠 위에 남아 기존 표시를 계속 보여준다.
            zIndex: 40,
            pointerEvents: highlightMode ? "auto" : "none",
            cursor: highlightMode ? (eraserMode ? "not-allowed" : "crosshair") : "default",
          }}
        />
      </main>

      <div
        className="no-print"
        onPointerDown={startToolbarDrag}
        title="형광펜 도구를 드래그하여 이동"
        style={{
          position: "fixed",
          left: `${highlightToolbarPosition.left}px`,
          bottom: `${highlightToolbarPosition.bottom}px`,
          zIndex: 41,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px",
          border: "1px solid var(--line)",
          borderRadius: "10px",
          background: "var(--panel-raised)",
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
          cursor: "grab",
          userSelect: "none",
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
            <button type="button" onClick={() => setEraserMode(!eraserMode)} aria-label={eraserMode ? "지우기 모드 해제" : "지우개 모드"} title={eraserMode ? "지우개 모드 해제" : "지우개"} className="icon-stack-btn" style={{ width: "32px", height: "32px", background: eraserMode ? "rgba(255, 107, 107, 0.2)" : "transparent" }}>
              <Eraser size={16} />
            </button>
            <button type="button" onClick={() => applyStrokes(highlightStrokesRef.current.slice(0, -1))} aria-label="마지막 형광펜 되돌리기" title="실행 취소" className="icon-stack-btn" style={{ width: "32px", height: "32px" }} disabled={eraserMode}>
              <Undo2 size={16} />
            </button>
            <button type="button" onClick={() => { applyStrokes([]); setEraserMode(false); }} aria-label="형광펜 전체 지우기" title="전체 지우기" className="icon-stack-btn" style={{ width: "32px", height: "32px" }}>
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
