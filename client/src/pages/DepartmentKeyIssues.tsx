import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

type MemoItem = {
  id?: string;
  text: string;
  date: string;
};

type IssueData = {
  memos: MemoItem[];
};

export default function DepartmentKeyIssues() {
  const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0] || "");
  const [issues, setIssues] = useState<Record<string, IssueData>>({});
  const [currentText, setCurrentText] = useState("");

  // 서버 데이터를 우선 로드하고, 서버를 사용할 수 없는 경우 localStorage를 사용한다.
  useEffect(() => {
    const loadIssues = async () => {
      try {
        const response = await fetch("/api/cloud-sync?type=issues");
        if (!response.ok) throw new Error("서버 로드 실패");
        const { data } = await response.json();
        if (data && typeof data === "object" && !Array.isArray(data)) {
          setIssues(data);
          localStorage.setItem("departmentIssues", JSON.stringify(data));
          return;
        }
      } catch (error) {
        console.warn("서버에서 쟁점사항 로드 실패:", error);
      }

      const savedIssues = localStorage.getItem("departmentIssues");
      if (savedIssues) {
        try {
          setIssues(JSON.parse(savedIssues));
        } catch (error) {
          console.error("쟁점사항 로컬 데이터 로드 실패:", error);
        }
      }
    };
    loadIssues();
  }, []);

  // 부서 변경 시 textarea 초기화
  useEffect(() => {
    setCurrentText("");
  }, [selectedDept]);

  // 메모 저장 (기존 메모에 추가)
  const handleSave = async () => {
    if (!currentText.trim()) return;

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const existingData = issues[selectedDept] || { memos: [] };
    const updatedIssues = {
      ...issues,
      [selectedDept]: {
        memos: [
          ...existingData.memos,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: currentText, date: today }
        ]
      },
    };
    setIssues(updatedIssues);
    localStorage.setItem("departmentIssues", JSON.stringify(updatedIssues));
    setCurrentText("");

    try {
      const response = await fetch("/api/cloud-sync?type=issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedIssues }),
      });
      if (!response.ok) throw new Error("서버 저장 실패");
    } catch (error) {
      console.warn("쟁점사항 서버 저장 실패:", error);
    }
  };

  const handleDelete = async (memoIndex: number) => {
    const existingData = issues[selectedDept] || { memos: [] };
    const updatedIssues = {
      ...issues,
      [selectedDept]: {
        memos: existingData.memos.filter((_, index) => index !== memoIndex),
      },
    };
    setIssues(updatedIssues);
    localStorage.setItem("departmentIssues", JSON.stringify(updatedIssues));

    try {
      const response = await fetch("/api/cloud-sync?type=issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedIssues }),
      });
      if (!response.ok) throw new Error("서버 삭제 저장 실패");
    } catch (error) {
      console.warn("쟁점사항 삭제 서버 저장 실패:", error);
    }
  };

  return (
    <Layout highlightScope={selectedDept}>
      <div className="page-content">
        <section className="page-heading">
          <h1>부서별 주요 쟁점사항</h1>
        </section>

        <section className="issues-section">
          <div className="issues-container">
            {/* 부서 목록 */}
            <aside className="departments-list">
              <div className="dept-buttons">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    className={`dept-button ${selectedDept === dept ? "active" : ""}`}
                    onClick={() => setSelectedDept(dept)}
                  >
                    <span className="dept-name">{dept}</span>
                    {issues[dept]?.memos?.length > 0 && <span className="has-note">●</span>}
                  </button>
                ))}
              </div>
            </aside>

            {/* 쟁점사항 메모 영역 */}
            <main className="issues-editor">
              <div className="editor-header">
                <div className="header-top">
                  <div>
                    <h2>{selectedDept}</h2>
                    <span className="subtitle">주요 쟁점사항 메모</span>
                  </div>
                  <button className="bookmarkBtn" onClick={handleSave}>
                    <span className="IconContainer">
                      <svg viewBox="0 0 384 512" height="0.9em" className="icon">
                        <path
                          d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"
                        ></path>
                      </svg>
                    </span>
                    <p className="text">저장</p>
                  </button>
                </div>
              </div>

              {/* 저장된 메모 표시 (최신순) */}
              <div className="saved-memos-container">
                {issues[selectedDept]?.memos && issues[selectedDept].memos.length > 0 ? (
                  [...issues[selectedDept].memos].reverse().map((memo, reverseIndex) => {
                    const memoIndex = issues[selectedDept].memos.length - 1 - reverseIndex;
                    return (
                    <div key={memo.id || `${memo.date}-${memoIndex}`} className="saved-memo-box">
                      <div className="memo-header">
                        <span className="memo-date">{memo.date}</span>
                        <button
                          type="button"
                          className="delete-memo-button"
                          onClick={() => handleDelete(memoIndex)}
                          aria-label="쟁점사항 삭제"
                        >삭제</button>
                      </div>
                      <div className="memo-content">{memo.text}</div>
                    </div>
                    );
                  })
                ) : (
                  <div className="no-memos">저장된 메모가 없습니다</div>
                )}
              </div>

              <textarea
                className="memo-textarea"
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder={`${selectedDept}의 주요 쟁점사항을 입력하세요...`}
              />

            </main>
          </div>
        </section>
      </div>

      <style>{`
        .page-content {
          padding: 24px;
        }

        .page-heading {
          margin-bottom: 32px;
        }

        .page-heading h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .issues-section {
          background: var(--bg-elevated);
          border-radius: 8px;
          overflow: hidden;
          height: calc(100vh - 200px);
          display: flex;
          flex-direction: column;
        }

        .issues-container {
          display: flex;
          height: 100%;
          overflow: hidden;
        }

        .departments-list {
          width: 200px;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          padding: 16px;
          background: rgba(118, 157, 194, 0.05);
        }

        .dept-buttons {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dept-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: none;
          border: 1px solid transparent;
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dept-button:hover {
          background: rgba(118, 157, 194, 0.1);
          color: var(--text);
        }

        .dept-button.active {
          background: rgba(91, 155, 240, 0.2);
          color: #5b9bf0;
          border-color: rgba(91, 155, 240, 0.3);
          font-weight: 600;
        }

        .has-note {
          margin-left: auto;
          font-size: 12px;
          color: #5b9bf0;
          flex-shrink: 0;
        }

        .issues-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow: hidden;
        }

        .editor-header {
          margin-bottom: 20px;
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .editor-header h2 {
          font-size: 21px;
          font-weight: 600;
          color: var(--text);
          margin: 6px 0 4px 0;
        }

        .subtitle {
          font-size: 13px;
          color: var(--text-muted);
        }

        .bookmarkBtn {
          width: 100px;
          height: 40px;
          border-radius: 40px;
          border: 1px solid rgba(91, 155, 240, 0.3);
          background-color: rgba(91, 155, 240, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition-duration: 0.3s;
          overflow: hidden;
          flex-shrink: 0;
        }

        .IconContainer {
          width: 30px;
          height: 30px;
          background: linear-gradient(to bottom, #5b9bf0, #4a8ae0);
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 2;
          transition-duration: 0.3s;
          color: white;
        }

        .icon {
          border-radius: 1px;
          fill: currentColor;
        }

        .bookmarkBtn .text {
          height: 100%;
          width: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text);
          z-index: 1;
          transition-duration: 0.3s;
          font-size: 1.04em;
          font-weight: 600;
        }

        .bookmarkBtn:hover .IconContainer {
          width: 90px;
          transition-duration: 0.3s;
        }

        .bookmarkBtn:hover .text {
          transform: translate(10px);
          width: 0;
          font-size: 0;
          transition-duration: 0.3s;
        }

        .bookmarkBtn:active {
          transform: scale(0.95);
          transition-duration: 0.3s;
        }

        .saved-memos-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .saved-memos-container::-webkit-scrollbar {
          width: 6px;
        }

        .saved-memos-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .saved-memos-container::-webkit-scrollbar-thumb {
          background: rgba(118, 157, 194, 0.3);
          border-radius: 3px;
        }

        .saved-memos-container::-webkit-scrollbar-thumb:hover {
          background: rgba(118, 157, 194, 0.5);
        }

        .no-memos {
          text-align: center;
          padding: 24px;
          color: var(--text-muted);
          font-size: 14px;
        }

        .saved-memo-box {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 12px 16px;
          flex-shrink: 0;
        }

        .memo-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;
        }

        .delete-memo-button {
          margin-left: auto;
          border: 1px solid rgba(255, 107, 125, 0.35);
          border-radius: 5px;
          padding: 3px 8px;
          background: rgba(255, 107, 125, 0.08);
          color: #ff9aa7;
          font-size: 12px;
          cursor: pointer;
        }

        .delete-memo-button:hover {
          background: rgba(255, 107, 125, 0.18);
          color: #ffd8dd;
        }

        .memo-date {
          font-size: 12px;
          color: #5b9bf0;
          font-weight: 600;
        }

        .memo-content {
          color: var(--text);
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .memo-textarea {
          flex: 1;
          padding: 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
          resize: none;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .memo-textarea:focus {
          outline: none;
          border-color: #5b9bf0;
          box-shadow: 0 0 0 2px rgba(91, 155, 240, 0.1);
        }

        .memo-textarea::placeholder {
          color: var(--text-muted);
        }


        @media (max-width: 768px) {
          .issues-container {
            flex-direction: column;
          }

          .departments-list {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border);
            max-height: 120px;
          }

          .dept-buttons {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .dept-button {
            flex: 1;
            min-width: 100px;
          }
        }
      `}</style>
    </Layout>
  );
}
