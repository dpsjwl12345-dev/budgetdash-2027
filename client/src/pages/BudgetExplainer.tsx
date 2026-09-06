import { useEffect, useState } from "react";
import { useSearchParams } from "wouter";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";
import { ChevronDown } from "lucide-react";

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
          <div
            style={{
              flex: "0 0 300px",
              borderRight: "1px solid var(--line)",
              paddingRight: "16px",
              overflowY: "auto",
            }}
          >
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

          {/* 우측: 설명자료 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {selectedPath ? (
              <div style={{ padding: "16px" }}>
                <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>
                  {selectedPath.split("|").pop()}
                </h2>
                {materialLoading ? (
                  <div style={{ color: "var(--text-muted)" }}>로딩 중...</div>
                ) : material?.explanation_text ? (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      color: "var(--text)",
                    }}
                  >
                    {material.explanation_text}
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)" }}>
                    설명자료가 없습니다
                  </div>
                )}
                {material?.file_name && (
                  <div style={{ marginTop: "16px", fontSize: "12px" }}>
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
