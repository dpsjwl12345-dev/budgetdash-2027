import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useSearchParams } from "wouter";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";
import { processExplainerPdf, renderPdfPagesAsImages } from "@/lib/pdfExplainer";
import { ArrowLeft, ArrowUp, ChevronDown, X, Upload } from "lucide-react";

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

// 재단·공사 등 기관이 세부사업 트리와 무관하게 통째로 올리는 설명자료.
// department + institution(자유 텍스트)을 키로 institution_materials 테이블에 저장된다.
type InstitutionMaterial = {
  images?: string[];
  file_name?: string | null;
  uploaded_at?: string;
} | null;

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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [deletingPageIndex, setDeletingPageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 공공기관 예산 설명자료 (부서 세부사업 트리와는 별도)
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [institutionSectionExpanded, setInstitutionSectionExpanded] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [institutionMaterial, setInstitutionMaterial] = useState<InstitutionMaterial>(null);
  const [institutionMaterialLoading, setInstitutionMaterialLoading] = useState(false);
  const [newInstitutionName, setNewInstitutionName] = useState("");
  const [addingInstitution, setAddingInstitution] = useState(false);
  const [institutionUploading, setInstitutionUploading] = useState(false);
  const [deletingInstitutionPageIndex, setDeletingInstitutionPageIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 계층 구조 데이터 로드
  const loadTree = useCallback(async () => {
    setLoading(true);
    setSelectedPath("");
    setMaterial(null);
    setSelectedInstitution("");
    setInstitutionMaterial(null);
    setInstitutionSectionExpanded(false);
    try {
      const response = await fetch(
        `/api/budget-explainer/data?department=${encodeURIComponent(department)}`
      );
      const { data, institutions: institutionList } = await response.json();
      setTreeData(data || []);
      setInstitutions(institutionList || []);
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

  // 공공기관 설명자료 로드
  useEffect(() => {
    if (!selectedInstitution) {
      setInstitutionMaterial(null);
      return;
    }

    const loadInstitutionMaterial = async () => {
      setInstitutionMaterialLoading(true);
      try {
        const response = await fetch(
          `/api/budget-explainer/get-material?department=${encodeURIComponent(department)}&institution=${encodeURIComponent(selectedInstitution)}`
        );
        const { data } = await response.json();
        setInstitutionMaterial(data || null);
      } catch (error) {
        console.error("기관 설명자료 로드 실패:", error);
      } finally {
        setInstitutionMaterialLoading(false);
      }
    };

    loadInstitutionMaterial();
  }, [department, selectedInstitution]);

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
          body: JSON.stringify({
            department,
            fileName: file.name,
            materials: [materials[i]],
            replaceExisting: i === 0,
          }),
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


  // 부서 PDF 자동 분할이 다음 세부사업 페이지까지 꼬리를 물고 들어온 경우처럼, 잘못
  // 섞인 페이지 한 장을 직접 지운다 (부서 설명자료 sections_json.images에서).
  const handleDeletePage = async (index: number) => {
    if (!selectedPath) return;
    if (!window.confirm("이 페이지를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;

    setDeletingPageIndex(index);
    try {
      const [dept, policy, unit, detail] = selectedPath.split("|");
      const response = await fetch("/api/budget-explainer/material-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deletePage", department: dept, policy, unit, detail, index }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "삭제 실패");

      setMaterial((prev) => {
        if (!prev?.sections_json) return prev;
        const nextImages = [...(prev.sections_json.images || [])];
        nextImages.splice(index, 1);
        return { ...prev, sections_json: { ...prev.sections_json, images: nextImages } };
      });
    } catch (error) {
      console.error("페이지 삭제 실패:", error);
      alert(error instanceof Error ? error.message : "페이지 삭제에 실패했습니다");
    } finally {
      setDeletingPageIndex(null);
    }
  };

  // 재단·공사 등 기관 이름을 자유 텍스트로 만들어 목록에 추가한다 (자료는 비워둔 채,
  // 이후 이 항목을 클릭해 PDF를 올리면 채워진다).
  const handleAddInstitution = async () => {
    const name = newInstitutionName.trim();
    if (!name) return;
    if (institutions.includes(name)) {
      setSelectedPath("");
      setSelectedInstitution(name);
      setNewInstitutionName("");
      return;
    }

    setAddingInstitution(true);
    try {
      const response = await fetch("/api/budget-explainer/material-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveInstitution", department, institution: name, images: [] }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "추가 실패");

      setInstitutions((prev) => [...prev, name].sort());
      setNewInstitutionName("");
      setSelectedPath("");
      setSelectedInstitution(name);
    } catch (error) {
      console.error("기관 추가 실패:", error);
      alert(error instanceof Error ? error.message : "기관 추가에 실패했습니다");
    } finally {
      setAddingInstitution(false);
    }
  };

  // 기관이 통째로 제출한 PDF를 올리면, 블록 탐지 없이 모든 페이지를 그대로 이미지로
  // 렌더링해 그 기관 항목에 저장한다 (재업로드 시 전체 교체).
  const handleInstitutionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedInstitution) return;

    setInstitutionUploading(true);
    try {
      const images = await renderPdfPagesAsImages(file);
      const response = await fetch("/api/budget-explainer/material-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveInstitution", department, institution: selectedInstitution, fileName: file.name, images }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "저장 실패");

      setInstitutionMaterial({ images, file_name: file.name });
    } catch (error) {
      console.error("기관 설명자료 업로드 실패:", error);
      alert(error instanceof Error ? error.message : "기관 설명자료 업로드에 실패했습니다");
    } finally {
      setInstitutionUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteInstitutionPage = async (index: number) => {
    if (!selectedInstitution) return;
    if (!window.confirm("이 페이지를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;

    setDeletingInstitutionPageIndex(index);
    try {
      const response = await fetch("/api/budget-explainer/material-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteInstitutionPage", department, institution: selectedInstitution, index }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "삭제 실패");

      setInstitutionMaterial((prev) => {
        if (!prev) return prev;
        const nextImages = [...(prev.images || [])];
        nextImages.splice(index, 1);
        return { ...prev, images: nextImages };
      });
    } catch (error) {
      console.error("페이지 삭제 실패:", error);
      alert(error instanceof Error ? error.message : "페이지 삭제에 실패했습니다");
    } finally {
      setDeletingInstitutionPageIndex(null);
    }
  };

  // 편성 시트에서 이 세부사업을 클릭해 여기로 넘어왔던 경우, 돌아갈 때도 부서
  // 검색과 세부사업 찾기를 처음부터 다시 하지 않도록 두 값을 저장해둔다.
  const handleReturnToSheet = () => {
    const detail = selectedPath.split("|").pop() || requestedItem;
    if (department) localStorage.setItem('selectedDepartment', department);
    if (detail) localStorage.setItem('returnToHierarchyProgram', detail);
    setLocation('/');
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
        setSelectedInstitution("");
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
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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

              {/* 재단·공사 등 기관이 통째로 제출하는 설명자료 - 세부사업 트리와 무관하게
                  부서 맨 아래에 별도 항목으로 둔다. 기관 이름은 화면에서 자유롭게 추가한다. */}
              {!loading && treeData.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <button
                    onClick={() => setInstitutionSectionExpanded((prev) => !prev)}
                    style={{
                      paddingLeft: "12px",
                      paddingRight: "12px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text)",
                      backgroundColor: "rgba(118, 157, 194, 0.08)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "left",
                      margin: "4px 0",
                      width: "100%",
                    }}
                  >
                    <ChevronDown
                      size={14}
                      style={{
                        transform: institutionSectionExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s",
                      }}
                    />
                    <span style={{ flex: 1 }}>공공기관 예산 설명자료</span>
                  </button>
                  {institutionSectionExpanded && (
                    <div>
                      {institutions.map((name) => {
                        const isSelected = selectedInstitution === name;
                        return (
                          <button
                            key={name}
                            onClick={() => {
                              setSelectedPath("");
                              setSelectedInstitution(name);
                            }}
                            style={{
                              paddingLeft: "28px",
                              paddingRight: "12px",
                              height: "36px",
                              display: "flex",
                              alignItems: "center",
                              fontSize: "13px",
                              color: isSelected ? "var(--text)" : "var(--text-muted)",
                              backgroundColor: isSelected ? "rgba(118, 157, 194, 0.14)" : "transparent",
                              border: "1px solid var(--line)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              textAlign: "left",
                              margin: "4px 0",
                              width: "100%",
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                          </button>
                        );
                      })}
                      <div style={{ display: "flex", gap: "6px", paddingLeft: "28px", margin: "8px 0" }}>
                        <input
                          type="text"
                          value={newInstitutionName}
                          onChange={(e) => setNewInstitutionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddInstitution();
                          }}
                          placeholder="새 항목 이름 (예: 문화관광재단 출연금)"
                          disabled={addingInstitution}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "6px 8px",
                            fontSize: "12px",
                            border: "1px solid var(--line)",
                            borderRadius: "6px",
                            background: "var(--bg-secondary)",
                            color: "var(--text)",
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddInstitution}
                          disabled={addingInstitution || !newInstitutionName.trim()}
                          style={{
                            padding: "6px 10px",
                            fontSize: "12px",
                            border: "1px solid var(--line)",
                            borderRadius: "6px",
                            background: "var(--bg-secondary)",
                            color: "var(--text)",
                            cursor: addingInstitution || !newInstitutionName.trim() ? "default" : "pointer",
                            opacity: addingInstitution || !newInstitutionName.trim() ? 0.5 : 1,
                            flexShrink: 0,
                          }}
                        >
                          + 추가
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 우측: 설명자료 */}
          <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
            {selectedPath ? (
              <div style={{ padding: "16px 8px", display: "flex", flexDirection: "column", overflow: "auto" }}>
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

                <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 0" }}>
                  <button
                    type="button"
                    onClick={handleReturnToSheet}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      background: "var(--bg-secondary)",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                    aria-label="이 세부사업의 편성 시트로 돌아가기"
                    title="편성 시트로 돌아가기"
                  >
                    <ArrowLeft size={16} />
                  </button>
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
                      <div key={i} style={{ position: "relative", maxWidth: "100%" }}>
                        <img
                          src={src}
                          alt={`${selectedPath.split("|").pop()} 설명자료 ${i + 1}페이지`}
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            border: "1px solid var(--line)",
                            borderRadius: "4px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePage(i)}
                          disabled={deletingPageIndex === i}
                          title="이 페이지 삭제 (다음 세부사업 내용이 잘못 포함된 경우)"
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            width: "28px",
                            height: "28px",
                            border: "1px solid var(--line)",
                            borderRadius: "6px",
                            background: "rgba(0,0,0,0.65)",
                            color: "#fff",
                            cursor: deletingPageIndex === i ? "default" : "pointer",
                            opacity: deletingPageIndex === i ? 0.5 : 1,
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "32px" }}>
                      데이터 없음
                    </div>
                  )}
                </div>
              </div>
            ) : selectedInstitution ? (
              <div style={{ padding: "16px 8px", display: "flex", flexDirection: "column", overflow: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px", flexShrink: 0 }}>
                  <h2
                    style={{
                      fontSize: "18px",
                      margin: 0,
                      padding: "8px 16px",
                      borderRadius: "10px",
                      backgroundColor: "rgb(66, 66, 66)",
                    }}
                  >
                    {selectedInstitution}
                  </h2>
                  <label
                    className="template-link"
                    style={{ cursor: institutionUploading ? "default" : "pointer", opacity: institutionUploading ? 0.5 : 1, flexShrink: 0 }}
                  >
                    {institutionUploading
                      ? "업로드 중..."
                      : institutionMaterial?.images && institutionMaterial.images.length > 0
                      ? "PDF 다시 업로드"
                      : "+ PDF 업로드"}
                    <input
                      type="file"
                      hidden
                      accept="application/pdf"
                      disabled={institutionUploading}
                      onChange={handleInstitutionUpload}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px",
                    padding: "8px 0",
                  }}
                >
                  {institutionMaterialLoading || institutionUploading ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "32px" }}>
                      {institutionUploading ? "PDF 변환 중..." : "로딩 중..."}
                    </div>
                  ) : institutionMaterial?.images && institutionMaterial.images.length > 0 ? (
                    institutionMaterial.images.map((src, i) => (
                      <div key={i} style={{ position: "relative", maxWidth: "100%" }}>
                        <img
                          src={src}
                          alt={`${selectedInstitution} 설명자료 ${i + 1}페이지`}
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            border: "1px solid var(--line)",
                            borderRadius: "4px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteInstitutionPage(i)}
                          disabled={deletingInstitutionPageIndex === i}
                          title="이 페이지 삭제"
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            width: "28px",
                            height: "28px",
                            border: "1px solid var(--line)",
                            borderRadius: "6px",
                            background: "rgba(0,0,0,0.65)",
                            color: "#fff",
                            cursor: deletingInstitutionPageIndex === i ? "default" : "pointer",
                            opacity: deletingInstitutionPageIndex === i ? 0.5 : 1,
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "32px" }}>
                      아직 올린 자료가 없습니다. 우측 상단에서 PDF를 업로드하세요.
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
      {showBackToTop && (
        <button
          type="button"
          onClick={handleBackToTop}
          aria-label="페이지 상단으로 이동"
          title="상단으로"
          style={{
            position: "fixed",
            right: "32px",
            bottom: "32px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "44px",
            height: "44px",
            border: "1px solid rgba(164, 192, 221, 0.35)",
            borderRadius: "50%",
            background: "var(--panel-raised)",
            color: "var(--text)",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.28)",
            cursor: "pointer",
          }}
        >
          <ArrowUp size={20} />
        </button>
      )}
    </Layout>
  );
}
