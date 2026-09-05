import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/departments";
import { extractPdfText, suggestSections, findExcerpt, type ExplainerSection } from "@/lib/pdfExplainer";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, FileText, Search, AlertCircle, Plus, X, Check, ChevronsUpDown } from "lucide-react";

type ExplainerDoc = {
  text: string;
  fileName: string;
  sections: ExplainerSection[];
  uploadedAt: string;
};

export default function BudgetExplainer() {
  const [params] = useSearchParams();
  const initialDept = params.get("dept") ?? "";
  const initialItem = params.get("item") ?? "";

  const [department, setDepartment] = useState(
    DEPARTMENTS.includes(initialDept as (typeof DEPARTMENTS)[number]) ? initialDept : DEPARTMENTS[0]
  );
  const [doc, setDoc] = useState<ExplainerDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(initialItem);
  const [comboOpen, setComboOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [requestOrder, setRequestOrder] = useState<string[]>([]);

  // 업로드 검토 상태 (저장 전)
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [pendingSections, setPendingSections] = useState<ExplainerSection[]>([]);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const localKey = (dept: string) => `explainer:${dept}`;

  const loadDoc = async (dept: string) => {
    setLoading(true);
    setPendingText(null);
    let localDoc: ExplainerDoc | null = null;
    try {
      const saved = localStorage.getItem(localKey(dept));
      localDoc = saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("로컬 설명자료 로드 실패:", error);
    }
    setDoc(localDoc);
    try {
      const response = await fetch(`/api/budget-explainer/load?department=${encodeURIComponent(dept)}`);
      const { data } = await response.json();
      if (data) setDoc(data);
    } catch (error) {
      console.warn("설명자료 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoc(department);
  }, [department]);

  // 예산 편성 시트(요구서)에 업로드된 세부사업 순서를 가져와 정렬 기준으로 사용
  useEffect(() => {
    fetch("/api/budget/load")
      .then((res) => res.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setRequestOrder(data.map((row: any) => String(row.program ?? "")).filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  // 문서가 로드된 뒤, URL에 item이 지정되어 있으면 자동 선택
  useEffect(() => {
    if (doc && initialItem) {
      setSelectedTitle(initialItem);
    }
  }, [doc, initialItem]);

  const handleFileSelect = async (file?: File) => {
    if (!file) return;
    setParsing(true);
    try {
      const text = await extractPdfText(file);
      const sections = suggestSections(text);
      setPendingText(text);
      setPendingFileName(file.name);
      setPendingSections(sections);
      if (!sections.length) {
        showToast("세부사업을 자동으로 나누지 못했습니다. 아래에서 직접 추가해주세요.");
      }
    } catch (error) {
      console.error(error);
      showToast("PDF를 읽지 못했습니다.");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updatePendingTitle = (id: string, title: string) => {
    setPendingSections((current) => current.map((section) => (section.id === id ? { ...section, title } : section)));
  };

  const removePendingSection = (id: string) => {
    setPendingSections((current) => current.filter((section) => section.id !== id));
  };

  const addPendingSection = () => {
    setPendingSections((current) => [...current, { id: `manual-${Date.now()}`, title: "" }]);
  };

  const cancelPending = () => {
    setPendingText(null);
    setPendingFileName("");
    setPendingSections([]);
  };

  const savePending = async () => {
    if (pendingText === null) return;
    const cleanedSections = pendingSections
      .map((section) => ({ ...section, title: section.title.trim() }))
      .filter((section) => section.title.length > 0);

    const newDoc: ExplainerDoc = {
      text: pendingText,
      fileName: pendingFileName,
      sections: cleanedSections,
      uploadedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(localKey(department), JSON.stringify(newDoc));
    } catch (error) {
      console.warn("로컬 저장 실패:", error);
    }

    try {
      const response = await fetch("/api/budget-explainer/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department,
          text: pendingText,
          fileName: pendingFileName,
          sections: cleanedSections,
        }),
      });
      const result = await response.json();
      if (result.success) {
        showToast("설명자료를 저장했습니다.");
      } else {
        showToast("클라우드 저장에 실패했습니다 (로컬 확인만 가능).");
      }
    } catch (error) {
      console.error(error);
      showToast("클라우드 저장에 실패했습니다 (로컬 확인만 가능).");
    }
    setDoc(newDoc);
    cancelPending();
  };

  const excerpt = useMemo(() => {
    if (!doc || !selectedTitle) return null;
    return findExcerpt(doc.text, selectedTitle, doc.sections ?? []);
  }, [doc, selectedTitle]);

  const activeSections = useMemo(() => {
    const sections = pendingText !== null ? pendingSections : doc?.sections ?? [];
    if (!requestOrder.length) return sections;

    const orderIndex = (title: string) => {
      const index = requestOrder.findIndex((program) => title.includes(program) || program.includes(title));
      return index === -1 ? requestOrder.length : index;
    };

    return [...sections]
      .map((section, originalIndex) => ({ section, originalIndex, order: orderIndex(section.title) }))
      .sort((a, b) => a.order - b.order || a.originalIndex - b.originalIndex)
      .map((entry) => entry.section);
  }, [pendingText, pendingSections, doc, requestOrder]);

  return (
    <Layout showToast={showToast}>
      <div className="page-content">
        <section className="page-heading">
          <div className="title-area">
            <div className="title-wrapper" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0px" }}>
              <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.02em" }}>
                2027 본예산
              </span>
              <h1 style={{ marginTop: "-4px" }}>부서별 예산설명자료</h1>
            </div>
          </div>
        </section>

        <div style={{ marginTop: "12px", marginBottom: "20px" }}>
          <Popover open={deptOpen} onOpenChange={setDeptOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={deptOpen}
                className="w-[220px] justify-between bg-transparent border-[var(--line)] text-[var(--text)] hover:bg-[rgba(118,157,194,0.08)] hover:text-[var(--text)]"
              >
                <span>{department}</span>
                <ChevronsUpDown className="opacity-60 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[220px] p-1 bg-[#1b212b] border-[var(--line)] text-[var(--text)]"
              side="bottom"
              align="start"
              avoidCollisions={false}
            >
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    setDepartment(dept);
                    setSelectedTitle("");
                    cancelPending();
                    setDeptOpen(false);
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: department === dept ? "rgba(118, 157, 194, 0.14)" : "transparent",
                    color: "var(--text)",
                    fontWeight: department === dept ? 600 : 500,
                    fontSize: "14px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {dept}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <section className="table-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", lineHeight: "36px" }}>
              {loading
                ? "불러오는 중..."
                : doc
                ? `현재 파일: ${doc.fileName} (${new Date(doc.uploadedAt).toLocaleString("ko-KR")})`
                : "업로드된 설명자료가 없습니다"}
            </div>
            <label className="upload-file-field">
              <Upload size={16} />
              <span>{parsing ? "분석 중..." : "PDF 업로드"}</span>
              <input
                ref={fileInputRef}
                className="upload-input"
                type="file"
                accept=".pdf"
                disabled={parsing}
                onChange={(event) => handleFileSelect(event.target.files?.[0])}
              />
            </label>
          </div>

          {pendingText !== null && (
            <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "16px", marginBottom: "20px", backgroundColor: "rgba(140, 155, 170, 0.08)" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                세부사업 목록 확인 · {pendingFileName}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
                PDF에서 자동으로 나눈 목록입니다. 이름이 이상하면 고치거나 지워주세요.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {pendingSections.map((section) => (
                  <div key={section.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      value={section.title}
                      onChange={(event) => updatePendingTitle(section.id, event.target.value)}
                      placeholder="세부사업명"
                      style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "14px", backgroundColor: "rgba(140, 155, 170, 0.08)", color: "var(--text)" }}
                    />
                    <button
                      onClick={() => removePendingSection(section.id)}
                      aria-label="삭제"
                      style={{ padding: "6px", borderRadius: "8px", border: "1px solid var(--line)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={addPendingSection}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}
                >
                  <Plus size={14} /> 항목 추가
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={cancelPending}
                  style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--line)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}
                >
                  취소
                </button>
                <button
                  onClick={savePending}
                  style={{ padding: "8px 14px", borderRadius: "8px", border: "none", backgroundColor: "#5b9bf0", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                >
                  저장
                </button>
              </div>
            </div>
          )}

          {pendingText === null && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboOpen}
                      disabled={!activeSections.length}
                      className="w-[560px] max-w-full justify-between bg-transparent border-[var(--line)] text-[var(--text)] hover:bg-[rgba(118,157,194,0.08)] hover:text-[var(--text)]"
                    >
                      <span className={cn("text-left", !selectedTitle && "text-[var(--text-faint)]")}>
                        {selectedTitle || "세부사업을 선택하세요"}
                      </span>
                      <ChevronsUpDown className="opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[560px] max-w-full p-0 bg-[#1b212b] border-[var(--line)] text-[var(--text)]"
                    side="bottom"
                    align="start"
                    avoidCollisions={false}
                  >
                    <Command className="bg-transparent">
                      <CommandInput placeholder="세부사업 검색..." className="h-9 text-[var(--text)]" />
                      <CommandList className="max-h-[240px] dark-scrollbar">
                        <CommandEmpty>일치하는 세부사업이 없습니다.</CommandEmpty>
                        <CommandGroup>
                          {activeSections.map((section) => (
                            <CommandItem
                              key={section.id}
                              value={section.title}
                              onSelect={(value) => {
                                setSelectedTitle(value === selectedTitle ? "" : value);
                                setComboOpen(false);
                              }}
                              className="text-[var(--text)] aria-selected:bg-transparent data-[selected=true]:bg-transparent"
                            >
                              {section.title}
                              <Check
                                className={cn(
                                  "ml-auto",
                                  selectedTitle === section.title ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedTitle && (
                <div style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "20px", backgroundColor: "rgba(140, 155, 170, 0.06)" }}>
                  {excerpt ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text)", fontWeight: 600 }}>
                        <FileText size={16} />
                        {selectedTitle}
                      </div>
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "14px", lineHeight: 1.7, color: "var(--text)" }}>
                        {excerpt}
                      </pre>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-faint)" }}>
                      <Search size={16} />
                      일치하는 내용을 PDF에서 찾지 못했습니다.
                    </div>
                  )}
                </div>
              )}

              {!doc && !loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-faint)", fontSize: "14px", padding: "24px 0" }}>
                  <AlertCircle size={16} />
                  이 부서의 PDF 설명자료를 업로드해주세요.
                </div>
              )}
            </>
          )}
        </section>

        {toast && (
          <div className="toast">
            <AlertCircle size={16} />
            {toast}
          </div>
        )}
      </div>
    </Layout>
  );
}
