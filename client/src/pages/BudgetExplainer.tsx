import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useSearchParams } from "wouter";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";
import { processExplainerPdf } from "@/lib/pdfExplainer";
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
  sections_json?: { images?: string[] } | null;
  uploaded_at?: string;
};

// 트리에서 제목이 일치하는 세부사업 노드를 찾아 전체 경로와, 그 노드가 보이도록
// 펼쳐야 하는 조상 노드 id 목록을 함께 반환한다.
function findDetailNode(
  node: TreeNode,
  depth: number,
  ancestorIds: string[],
  titleChain: string[],
  targetTitle: string
): { path: string; expandIds: string[] } | null {
  const chain = [...titleChain, node.title];
  if (node.level === "세부사업" && node.title === targetTitle) {
    return { path: chain.join("|"), expandIds: ancestorIds };
  }
  const nodeId = `${depth}-${node.title}`;
  for (const child of node.children) {
    const found = findDetailNode(child, depth + 1, [...ancestorIds, nodeId], chain, targetTitle);
    if (found) return found;
  }
  return null;
}

export default function BudgetExplainer() {
  const [params] = useSearchParams();
  const [, setLocation] = useLocation();
  const requestedDept = params.get("dept") ?? DEPARTMENTS[0];
  const department = DEPARTMENTS.includes(requestedDept as (typeof DEPARTMENTS)[number])
    ? requestedDept
    : DEPARTMENTS[0];
  const requestedItem = params.get("item");

  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [material, setMaterial] = useState<Material | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 계층 구조 데이터 로드
  const loadTree = useCallback(async () => {
    setLoading(true);
    setSelectedPath("");
    setMaterial(null);
    try {
      const response = await fetch(
        `/api/budget-explainer/data?department=${encodeURIComponent(department)}`
      );
      const { data } = await response.json();
      setTreeData(data || []);
      if (data && data.length > 0) {
        const rootId = `0-${data[0].title}`;
        const match = requestedItem
          ? findDetailNode(data[0], 0, [], [], requestedItem)
          : null;
        if (match) {
          setExpandedNodes(new Set([rootId, ...match.expandIds]));
          setSelectedPath(match.path);
        } else {
          setExpandedNodes(new Set([rootId]));
          setSelectedPath("");
        }
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [department, requestedItem]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // 설명자료 로드
  useEffect(() => {
    if (!selectedPath) {
      setMaterial(null);
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
  // 모두 찾아 페이지 이미지를 렌더링한 뒤 저장한다 (세부사업별 개별 업로드 불필요).
  // 서버리스 함수의 요청 본문 크기 제한 때문에 세부사업 하나씩 순차적으로 저장한다.
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(null);
    try {
      const materials = await processExplainerPdf(file);

      if (materials.length === 0) {
        alert("PDF에서 세부사업 블록을 찾지 못했습니다");
        return;
      }

      let savedCount = 0;
      for (let i = 0; i < materials.length; i++) {
        setUploadProgress({ done: i, total: materials.length });
        const response = await fetch("/api/budget-explainer/bulk-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department, fileName: file.name, materials: [materials[i]] }),
        });
        const result = await response.json();
        if (result.success) savedCount += 1;
      }
      setUploadProgress({ done: materials.length, total: materials.length });

      alert(`${savedCount}개 세부사업의 설명자료를 저장했습니다`);
      await loadTree();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("업로드 실패:", error);
      alert("업로드에 실패했습니다");
    } finally {
      setUploading(false);
      setUploadProgress(null);
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
      <div
        className="page-content"
        style={{
          display: "flex",
          flexDirection: "column",
          paddingTop: "20px",
          paddingBottom: "16px",
        }}
      >
        <section className="page-heading" style={{ flexShrink: 0, marginBottom: "12px" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
                편성 부서
                <select
                  value={department}
                  onChange={(event) => setLocation(`/budget-explainer?dept=${encodeURIComponent(event.target.value)}`)}
                  style={{ minWidth: "150px", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "6px", background: "var(--bg-secondary)", color: "var(--text)" }}
                  aria-label="설명자료 편성 부서"
                >
                  {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </label>
              <label
              className="icon-stack-btn"
              aria-label={uploading ? "업로드 중" : "부서 설명자료 PDF 업로드"}
              data-tooltip={
                uploading
                  ? uploadProgress
                    ? `업로드 중... (${uploadProgress.done}/${uploadProgress.total})`
                    : "PDF 분석 중..."
                  : "부서 설명자료 PDF 업로드"
              }
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
          </div>
        </section>

        {/* 메인 컨텐츠 */}
        <div style={{ display: "flex", gap: "16px", padding: "0 16px", minHeight: "80vh" }}>
          {/* 좌측: 계층 구조 */}
          {showTree && (
            <div
              style={{
                flex: "0 0 300px",
                borderRight: "1px solid var(--line)",
                paddingRight: "16px",
                paddingTop: "8px",
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
          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
            {selectedPath ? (
              <div style={{ padding: "16px 8px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "12px", marginBottom: "16px", flexShrink: 0 }}>
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
                        flexShrink: 0,
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
                  <h2
                    style={{
                      fontSize: "18px",
                      margin: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      padding: "8px 16px",
                      borderRadius: "10px",
                      backgroundColor: "rgb(66, 66, 66)",
                    }}
                  >
                    {(() => {
                      const [, policy, unit, detail] = selectedPath.split("|");
                      return (
                        <>
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{policy}</span>
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>›</span>
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{unit}</span>
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>›</span>
                          <span>{detail}</span>
                        </>
                      );
                    })()}
                  </h2>
                </div>

                {/* 원본 PDF 페이지 그대로 - 텍스트 재조립 없이 이미지로 표시 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px",
                    padding: "8px 0",
                  }}
                >
                  {materialLoading ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "32px" }}>
                      로딩 중...
                    </div>
                  ) : material?.sections_json?.images && material.sections_json.images.length > 0 ? (
                    material.sections_json.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`${selectedPath.split("|").pop()} 설명자료 ${i + 1}페이지`}
                        style={{
                          maxWidth: "100%",
                          border: "1px solid var(--line)",
                          borderRadius: "4px",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        }}
                      />
                    ))
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "32px" }}>
                      데이터 없음
                    </div>
                  )}
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
