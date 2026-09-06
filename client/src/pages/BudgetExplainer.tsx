import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "wouter";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";
import { extractPdfText, extractProgramBlocks } from "@/lib/pdfExplainer";
import { ChevronDown, X, Upload } from "lucide-react";

type TreeNode = {
  title: string;
  level: "부서" | "정책사업" | "단위사업" | "세부사업";
  id?: string;
  children: TreeNode[];
};

type Material = {
  id?: number;
  file_name?: string;
  sections_json?: Record<string, string> | null;
  uploaded_at?: string;
};

type ParsedSections = {
  [key: string]: string;
};

export default function BudgetExplainer() {
  const [params] = useSearchParams();
  const initialDept = params.get("dept") ?? DEPARTMENTS[0];

  const [department] = useState(
    DEPARTMENTS.includes(initialDept as (typeof DEPARTMENTS)[number])
      ? initialDept
      : DEPARTMENTS[0]
  );
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [material, setMaterial] = useState<Material | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsedSections, setParsedSections] = useState<ParsedSections>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 계층 구조 데이터 로드
  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/budget-explainer/data?department=${encodeURIComponent(department)}`
      );
      const { data } = await response.json();
      setTreeData(data || []);
      if (data && data.length > 0) {
        setExpandedNodes(new Set([`0-${data[0].title}`]));
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // 설명자료 로드
  useEffect(() => {
    if (!selectedPath) {
      setMaterial(null);
      setParsedSections({});
      return;
    }

    const loadMaterial = async () => {
      setMaterialLoading(true);
      try {
        const [dept, policy, unit, detail] = selectedPath.split("|");
        const response = await fetch(
          `/api/budget-explainer/get-material?department=${encodeURIComponent(
            dept
          )}&policy=${encodeURIComponent(policy)}&unit=${encodeURIComponent(
            unit
          )}&detail=${encodeURIComponent(detail)}`
        );
        const { data } = await response.json();
        setMaterial(data || null);
        setParsedSections(data?.sections_json || {});
      } catch (error) {
        console.error("설명자료 로드 실패:", error);
      } finally {
        setMaterialLoading(false);
      }
    };

    loadMaterial();
  }, [selectedPath]);

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 부서 설명자료 PDF 한 개를 통째로 업로드하면 안에 이어진 세부사업 블록들을
  // 모두 파싱해 한 번에 저장한다 (세부사업별 개별 업로드 불필요).
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const pdfText = await extractPdfText(file);
      const materials = extractProgramBlocks(pdfText);

      if (materials.length === 0) {
        alert("PDF에서 세부사업 블록을 찾지 못했습니다");
        return;
      }

      const response = await fetch("/api/budget-explainer/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, fileName: file.name, materials }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`${result.count}개 세부사업의 설명자료를 저장했습니다`);
        await loadTree();
      } else {
        alert(`저장 실패: ${result.error || "알 수 없는 오류"}`);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("업로드 실패:", error);
      alert("업로드에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  const TreeNodeRenderer = ({
    node,
    path = "",
    depth = 0,
  }: {
    node: TreeNode;
    path?: string;
    depth?: number;
  }) => {
    const nodeId = `${depth}-${node.title}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children.length > 0;
    const currentPath = path ? `${path}|${node.title}` : node.title;
    const isSelected = selectedPath === currentPath && node.level === "세부사업";
    const isDepartment = node.level === "부서";

    const handleClick = () => {
      if (node.level === "세부사업") {
        setSelectedPath(currentPath);
      } else if (hasChildren && !isDepartment) {
        toggleExpand(nodeId);
      } else if (isDepartment && hasChildren) {
        toggleExpand(nodeId);
      }
    };

    return (
      <div key={nodeId}>
        <button
          onClick={handleClick}
          style={{
            paddingLeft: `${12 + depth * 16}px`,
            paddingRight: "12px",
            height: isDepartment ? "40px" : "36px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: isDepartment ? "14px" : "13px",
            fontWeight: isDepartment ? 600 : 400,
            color: isDepartment ? "var(--text)" : isSelected ? "var(--text)" : "var(--text-muted)",
            backgroundColor: isDepartment
              ? "rgba(118, 157, 194, 0.08)"
              : isSelected
              ? "rgba(118, 157, 194, 0.14)"
              : "transparent",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            cursor: isDepartment ? "default" : "pointer",
            textAlign: "left",
            transition: "all 0.15s",
            margin: "4px 0",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (!isDepartment) {
              e.currentTarget.style.backgroundColor =
                "rgba(118, 157, 194, 0.08)";
              e.currentTarget.style.color = "var(--text)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isDepartment && !isSelected) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }
          }}
        >
          {hasChildren && (
            <span style={{ display: "flex", alignItems: "center", minWidth: "16px" }}>
              <ChevronDown
                size={14}
                style={{
                  transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.15s",
                }}
              />
            </span>
          )}
          {!hasChildren && <span style={{ minWidth: "16px" }} />}
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {node.title}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeRenderer
                key={child.title}
                node={child}
                path={currentPath}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <div className="title-area">
            <div
              className="title-wrapper"
              style={{ flexDirection: "column", alignItems: "flex-start", gap: "0px" }}
            >
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--text-faint)",
                  letterSpacing: "0.02em",
                }}
              >
                2027 본예산
              </span>
              <h1 style={{ marginTop: "-4px" }}>부서별 예산설명자료</h1>
            </div>
          </div>
        </section>

        {/* 상단 컨트롤 바 */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
          <label
            className="icon-stack-btn"
            aria-label={uploading ? "업로드 중" : "부서 설명자료 PDF 업로드"}
            data-tooltip={uploading ? "업로드 중..." : "부서 설명자료 PDF 업로드"}
            style={uploading ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            <div className="icon-stack-front"><Upload size={20} /></div>
            <input
              ref={fileInputRef}
              className="upload-input"
              type="file"
              accept=".pdf"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* 메인 컨텐츠 */}
        <div style={{ display: "flex", gap: "16px", padding: "16px", height: "calc(100vh - 300px)" }}>
          {/* 좌측: 계층 구조 */}
          {showTree && (
            <div
              style={{
                flex: "0 0 300px",
                borderRight: "1px solid var(--line)",
                paddingRight: "16px",
                paddingTop: "8px",
                overflowY: "auto",
                position: "relative",
              }}
            >
              {selectedPath && (
                <button
                  onClick={() => setShowTree(false)}
                  style={{
                    position: "sticky",
                    top: 0,
                    right: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    padding: 0,
                    marginBottom: "8px",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    marginLeft: "auto",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(118, 157, 194, 0.1)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                  title="네비게이션 닫기"
                >
                  <X size={16} />
                </button>
              )}
              {loading ? (
                <div style={{ padding: "16px", color: "var(--text-muted)" }}>
                  로딩 중...
                </div>
              ) : treeData.length === 0 ? (
                <div style={{ padding: "16px", color: "var(--text-muted)" }}>
                  데이터가 없습니다
                </div>
              ) : (
                treeData.map((node) => (
                  <TreeNodeRenderer key={node.title} node={node} depth={0} />
                ))
              )}
            </div>
          )}

          {/* 우측: 설명자료 */}
          <div style={{ flex: 1, overflowY: "auto", position: "relative", display: "flex", flexDirection: "column" }}>
            {selectedPath ? (
              <div style={{ padding: "16px 8px", display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexShrink: 0 }}>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>
                    {selectedPath.split("|").pop()}
                  </h2>
                  {!showTree && (
                    <button
                      onClick={() => setShowTree(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        padding: 0,
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(118, 157, 194, 0.1)";
                        e.currentTarget.style.color = "var(--text)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                      title="네비게이션 열기"
                    >
                      ☰
                    </button>
                  )}
                </div>

                {/* 3개 섹션 박스 - 페이지 전체 세로 구분 */}
                <div style={{ flex: 1, display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: "16px" }}>

                  {/* 예산총괄표 */}
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "16px",
                      backgroundColor: "var(--bg-secondary)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
                      예산총괄표
                    </div>
                    {materialLoading ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>로딩 중...</div>
                    ) : parsedSections["예산총괄표"] ? (
                      <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.6", whiteSpace: "pre-wrap", flex: 1, overflowY: "auto" }}>
                        {parsedSections["예산총괄표"]}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        데이터 없음
                      </div>
                    )}
                  </div>

                  {/* 사업명세서 */}
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "16px",
                      backgroundColor: "var(--bg-secondary)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
                      사업명세서
                    </div>
                    {materialLoading ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>로딩 중...</div>
                    ) : parsedSections["사업설명서"] ? (
                      <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.6", whiteSpace: "pre-wrap", flex: 1, overflowY: "auto" }}>
                        {parsedSections["사업설명서"]}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        데이터 없음
                      </div>
                    )}
                  </div>

                  {/* 편성현황 */}
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "16px",
                      backgroundColor: "var(--bg-secondary)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
                      편성현황
                    </div>
                    {materialLoading ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>로딩 중...</div>
                    ) : parsedSections["편성현황"] ? (
                      <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.6", whiteSpace: "pre-wrap", flex: 1, overflowY: "auto" }}>
                        {parsedSections["편성현황"]}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        데이터 없음
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--text-muted)",
                }}
              >
                세부사업을 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
