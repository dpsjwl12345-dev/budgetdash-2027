import { useEffect, useState } from "react";
import { useSearchParams } from "wouter";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";
import { ChevronDown, X } from "lucide-react";

type TreeNode = {
  title: string;
  level: "부서" | "정책사업" | "단위사업" | "세부사업";
  id?: string;
  children: TreeNode[];
};

type Material = {
  id?: number;
  explanation_text?: string;
  file_name?: string;
  uploaded_at?: string;
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
  const [explanationText, setExplanationText] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // 계층 구조 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/budget-explainer/data?department=${encodeURIComponent(department)}`
        );
        const { data } = await response.json();
        setTreeData(data || []);
        // 부서 노드를 기본으로 확장
        if (data && data.length > 0) {
          setExpandedNodes(new Set([`0-${data[0].title}`]));
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [department]);

  // 설명자료 로드
  useEffect(() => {
    if (!selectedPath) {
      setMaterial(null);
      setExplanationText("");
      setFileName("");
      setSelectedFile(null);
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
        setExplanationText(data?.explanation_text || "");
        setFileName(data?.file_name || "");
      } catch (error) {
        console.error("설명자료 로드 실패:", error);
      } finally {
        setMaterialLoading(false);
      }
    };

    loadMaterial();
  }, [selectedPath]);

  const handleSaveMaterial = async () => {
    if (!selectedPath) return;

    setSaving(true);
    try {
      const [dept, policy, unit, detail] = selectedPath.split("|");
      const response = await fetch("/api/budget-explainer/save-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: dept,
          policy,
          unit,
          detail,
          level: "세부사업",
          explanation_text: explanationText,
          file_name: fileName,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("저장되었습니다");
        // 새로 로드
        const getResponse = await fetch(
          `/api/budget-explainer/get-material?department=${encodeURIComponent(
            dept
          )}&policy=${encodeURIComponent(policy)}&unit=${encodeURIComponent(
            unit
          )}&detail=${encodeURIComponent(detail)}`
        );
        const { data } = await getResponse.json();
        setMaterial(data || null);
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
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

        {/* 메인 컨텐츠 */}
        <div style={{ display: "flex", gap: "16px", padding: "16px", height: "calc(100vh - 280px)" }}>
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
          <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            {selectedPath ? (
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
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

                {/* 설명자료 입력/편집 섹션 */}
                <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                    설명자료 작성
                  </div>

                  <textarea
                    value={explanationText}
                    onChange={(e) => setExplanationText(e.target.value)}
                    placeholder="설명자료 내용을 입력하세요"
                    style={{
                      width: "100%",
                      height: "150px",
                      padding: "8px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text)",
                      backgroundColor: "var(--bg-secondary)",
                      boxSizing: "border-box",
                      marginBottom: "8px",
                    }}
                  />

                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="파일명 (선택사항)"
                      style={{
                        flex: 1,
                        padding: "8px",
                        fontSize: "13px",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        color: "var(--text)",
                        backgroundColor: "var(--bg-secondary)",
                      }}
                    />
                    <button
                      onClick={handleSaveMaterial}
                      disabled={saving}
                      style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        backgroundColor: "rgba(118, 157, 194, 0.1)",
                        color: "var(--text)",
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.backgroundColor = "rgba(118, 157, 194, 0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(118, 157, 194, 0.1)";
                      }}
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>

                {/* 저장된 설명자료 표시 */}
                {materialLoading ? (
                  <div style={{ color: "var(--text-muted)" }}>로딩 중...</div>
                ) : material?.explanation_text ? (
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                      저장된 내용
                    </div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                        color: "var(--text)",
                        fontSize: "13px",
                        padding: "8px",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "4px",
                      }}
                    >
                      {material.explanation_text}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    저장된 설명자료가 없습니다
                  </div>
                )}
                {material?.file_name && (
                  <div style={{ marginTop: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
                    📄 {material.file_name}
                  </div>
                )}
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
