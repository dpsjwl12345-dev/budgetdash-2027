import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

export default function DepartmentKeyIssues() {
  const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0] || "");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [currentText, setCurrentText] = useState("");

  // localStorage에서 데이터 로드
  useEffect(() => {
    const savedIssues = localStorage.getItem("departmentIssues");
    if (savedIssues) {
      try {
        setIssues(JSON.parse(savedIssues));
      } catch (e) {
        console.error("Failed to load issues:", e);
      }
    }
  }, []);

  // 부서 변경 시 텍스트 업데이트
  useEffect(() => {
    setCurrentText(issues[selectedDept] || "");
  }, [selectedDept, issues]);

  // 메모 저장
  const handleSave = () => {
    const updatedIssues = {
      ...issues,
      [selectedDept]: currentText,
    };
    setIssues(updatedIssues);
    localStorage.setItem("departmentIssues", JSON.stringify(updatedIssues));
  };

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>부서별 주요 쟁점사항</h1>
        </section>

        <section className="issues-section">
          <div className="issues-container">
            {/* 부서 목록 */}
            <aside className="departments-list">
              <h3>부서 목록</h3>
              <div className="dept-buttons">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    className={`dept-button ${selectedDept === dept ? "active" : ""}`}
                    onClick={() => setSelectedDept(dept)}
                  >
                    <span className="dept-name">{dept}</span>
                    {issues[dept] && <span className="has-note">●</span>}
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
                    <p className="text">Save</p>
                  </button>
                </div>
              </div>

              <textarea
                className="memo-textarea"
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder={`${selectedDept}의 주요 쟁점사항을 입력하세요...`}
              />

              <div className="editor-footer">
                <span className="char-count">{currentText.length}자</span>
              </div>
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

        .departments-list h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
          font-size: 13px;
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
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 4px 0;
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

        .editor-footer {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .save-button {
          padding: 10px 16px;
          background: #5b9bf0;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-button:hover {
          background: #4a8ae0;
        }

        .save-button:active {
          transform: scale(0.98);
        }

        .char-count {
          font-size: 13px;
          color: var(--text-muted);
          margin-left: auto;
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
