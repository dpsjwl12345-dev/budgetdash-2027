import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

type RequestStatus = "검토중" | "반영" | "미반영";
// 요구가 들어온 경로. 탭을 가르는 기준이며, 소속 정당명과는 별개다.
type RequestType = "당정협의회" | "시의원";

type CouncilRequest = {
  id: string;
  requestType: RequestType;
  electoralDistrict: string;
  partyName: string;
  memberName: string;
  committee: string;
  department: string;
  content: string;
  budgetItemName: string;
  requestedAmount: string;
  status: RequestStatus;
  requestedDate: string;
};

const STATUS_OPTIONS: RequestStatus[] = ["검토중", "반영", "미반영"];
const REQUEST_TYPE_OPTIONS: RequestType[] = ["당정협의회", "시의원"];

const todayString = () =>
  new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

const emptyForm = (requestType: RequestType = "당정협의회") => ({
  requestType,
  electoralDistrict: "",
  partyName: "",
  memberName: "",
  committee: "",
  department: DEPARTMENTS[0] || "",
  content: "",
  budgetItemName: "",
  requestedAmount: "",
  status: "검토중" as RequestStatus,
  requestedDate: todayString(),
});

type EditDraft = Omit<CouncilRequest, "id" | "status">;

const draftFromItem = (item: CouncilRequest): EditDraft => ({
  requestType: item.requestType,
  electoralDistrict: item.electoralDistrict ?? "",
  partyName: item.partyName,
  memberName: item.memberName,
  committee: item.committee ?? "",
  department: item.department,
  content: item.content,
  budgetItemName: item.budgetItemName,
  requestedAmount: item.requestedAmount,
  requestedDate: item.requestedDate,
});

export default function CouncilMemberRequests() {
  const [requests, setRequests] = useState<CouncilRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestType>("당정협의회");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // 서버 데이터를 우선 로드하고, 서버를 사용할 수 없는 경우 localStorage를 사용한다.
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch("/api/cloud-sync?type=council-requests");
        if (!response.ok) throw new Error("서버 로드 실패");
        const { data } = await response.json();
        if (Array.isArray(data)) {
          setRequests(data);
          localStorage.setItem("councilMemberRequests", JSON.stringify(data));
          return;
        }
      } catch (error) {
        console.warn("서버에서 시의원 요구사항 로드 실패:", error);
      }

      const saved = localStorage.getItem("councilMemberRequests");
      if (saved) {
        try {
          setRequests(JSON.parse(saved));
        } catch (error) {
          console.error("시의원 요구사항 로컬 데이터 로드 실패:", error);
        }
      }
    };
    loadRequests();
  }, []);

  const persist = async (updatedItem: CouncilRequest) => {
    try {
      const response = await fetch("/api/cloud-sync?type=council-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedItem }),
      });
      if (!response.ok) throw new Error("서버 저장 실패");
    } catch (error) {
      console.warn("시의원 요구사항 서버 저장 실패:", error);
    }
  };

  const handleAdd = async () => {
    if (!form.memberName.trim() || !form.content.trim()) return;

    const newItem: CouncilRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requestType: form.requestType,
      electoralDistrict: form.electoralDistrict.trim(),
      partyName: form.partyName.trim(),
      memberName: form.memberName.trim(),
      committee: form.committee.trim(),
      department: form.department,
      content: form.content.trim(),
      budgetItemName: form.budgetItemName.trim(),
      requestedAmount: form.requestedAmount.trim(),
      status: form.status,
      requestedDate: form.requestedDate,
    };

    const updated = [...requests, newItem];
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    setActiveTab(newItem.requestType);
    setForm(emptyForm(newItem.requestType));
    await persist(newItem);
  };

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    const target = requests.find((item) => item.id === id);
    if (!target) return;
    const updatedItem = { ...target, status };
    const updated = requests.map((item) => (item.id === id ? updatedItem : item));
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    await persist(updatedItem);
  };

  const handleDelete = async (id: string) => {
    const updated = requests.filter((item) => item.id !== id);
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    if (editingId === id) {
      setEditingId(null);
      setEditDraft(null);
    }

    try {
      const response = await fetch("/api/cloud-sync?type=council-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!response.ok) throw new Error("서버 삭제 실패");
    } catch (error) {
      console.warn("시의원 요구사항 삭제 서버 저장 실패:", error);
    }
  };

  const startEdit = (item: CouncilRequest) => {
    setEditingId(item.id);
    setEditDraft(draftFromItem(item));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    const target = requests.find((item) => item.id === id);
    if (!target) return;
    if (!editDraft.memberName.trim() || !editDraft.content.trim()) return;

    const updatedItem: CouncilRequest = {
      ...target,
      electoralDistrict: editDraft.electoralDistrict.trim(),
      partyName: editDraft.partyName.trim(),
      memberName: editDraft.memberName.trim(),
      committee: editDraft.committee.trim(),
      department: editDraft.department,
      content: editDraft.content.trim(),
      budgetItemName: editDraft.budgetItemName.trim(),
      requestedAmount: editDraft.requestedAmount.trim(),
      requestedDate: editDraft.requestedDate,
    };
    const updated = requests.map((item) => (item.id === id ? updatedItem : item));
    setRequests(updated);
    localStorage.setItem("councilMemberRequests", JSON.stringify(updated));
    setEditingId(null);
    setEditDraft(null);
    await persist(updatedItem);
  };

  // 예전에 저장된 건(requestType 없음)은 소속 정당명 칸에 "시의원"으로 적혀 있었다.
  const typeOf = (item: CouncilRequest): RequestType =>
    item.requestType
      ? item.requestType
      : (item.partyName || "").replace(/\s/g, "") === "시의원"
        ? "시의원"
        : "당정협의회";
  const visibleRequests = requests.filter((item) => typeOf(item) === activeTab);
  const countOf = (type: RequestType) => requests.filter((item) => typeOf(item) === type).length;

  const renderTable = (rows: CouncilRequest[], emptyText: string) => (
          <table className="requests-table">
            <colgroup>
              <col className="col-num" />
              <col className="col-district" />
              <col className="col-party" />
              <col className="col-member" />
              <col className="col-committee" />
              <col className="col-dept" />
              <col className="col-content" />
              <col className="col-budget-item" />
              <col className="col-amount" />
              <col className="col-date" />
              <col className="col-status" />
              <col className="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th className="col-num">번호</th>
                <th>선거구</th>
                <th>소속 정당명</th>
                <th>이름</th>
                <th>위원회</th>
                <th>소관부서</th>
                <th>요구내용</th>
                <th>사업명 (세부사업+부기명)</th>
                <th>요구액</th>
                <th>요구일</th>
                <th>반영여부</th>
                <th className="col-action">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item, index) => {
                  const isEditing = editingId === item.id && editDraft;
                  return (
                    <tr key={item.id}>
                      <td className="col-num">{index + 1}</td>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.electoralDistrict}
                              onChange={(e) => setEditDraft({ ...editDraft, electoralDistrict: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.partyName}
                              onChange={(e) => setEditDraft({ ...editDraft, partyName: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.memberName}
                              onChange={(e) => setEditDraft({ ...editDraft, memberName: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.committee}
                              onChange={(e) => setEditDraft({ ...editDraft, committee: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-input"
                              value={editDraft.department}
                              onChange={(e) => setEditDraft({ ...editDraft, department: e.target.value })}
                            >
                              {DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <textarea
                              className="cell-input cell-textarea"
                              value={editDraft.content}
                              onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.budgetItemName}
                              onChange={(e) => setEditDraft({ ...editDraft, budgetItemName: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.requestedAmount}
                              onChange={(e) => setEditDraft({ ...editDraft, requestedAmount: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={editDraft.requestedDate}
                              onChange={(e) => setEditDraft({ ...editDraft, requestedDate: e.target.value })}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{item.electoralDistrict}</td>
                          <td>{item.partyName}</td>
                          <td className="col-member">{item.memberName}</td>
                          <td>{item.committee}</td>
                          <td>{item.department}</td>
                          <td className="col-content">{item.content}</td>
                          <td>{item.budgetItemName}</td>
                          <td className="col-amount">{item.requestedAmount}</td>
                          <td className="col-date">{item.requestedDate}</td>
                        </>
                      )}
                      <td>
                        <select
                          className={`status-badge status-${item.status}`}
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value as RequestStatus)}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="col-action">
                        {isEditing ? (
                          <div className="action-buttons">
                            <button type="button" className="save-button" onClick={() => saveEdit(item.id)}>저장</button>
                            <button type="button" className="cancel-button" onClick={cancelEdit}>취소</button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => startEdit(item)}
                              aria-label="요구사항 편집"
                            >편집</button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDelete(item.id)}
                              aria-label="요구사항 삭제"
                            >삭제</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="empty-row">{emptyText}</td>
                </tr>
              )}
            </tbody>
          </table>
  );

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>당정협의회 요구</h1>
        </section>

        <section className="request-form-section">
          <div className="form-row">
            <select
              className="form-input type-select"
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value as RequestType })}
            >
              {REQUEST_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              className="form-input district-input"
              placeholder="선거구"
              value={form.electoralDistrict}
              onChange={(e) => setForm({ ...form, electoralDistrict: e.target.value })}
            />
            <input
              className="form-input party-input"
              placeholder="소속 정당명"
              value={form.partyName}
              onChange={(e) => setForm({ ...form, partyName: e.target.value })}
            />
            <input
              className="form-input member-input"
              placeholder="이름"
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
            />
            <input
              className="form-input committee-input"
              placeholder="위원회"
              value={form.committee}
              onChange={(e) => setForm({ ...form, committee: e.target.value })}
            />
            <select
              className="form-input dept-select"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              className="form-input status-select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as RequestStatus })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input
              className="form-input date-input"
              type="text"
              placeholder="요구일 (예: 2026. 09. 17.)"
              value={form.requestedDate}
              onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
            />
          </div>
          <div className="form-row">
            <textarea
              className="form-input content-textarea"
              placeholder="요구내용을 입력하세요..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <input
              className="form-input budget-item-input"
              placeholder="사업명 (세부사업+부기명)"
              value={form.budgetItemName}
              onChange={(e) => setForm({ ...form, budgetItemName: e.target.value })}
            />
            <input
              className="form-input amount-input"
              placeholder="요구액 (예: 6억)"
              value={form.requestedAmount}
              onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })}
            />
            <button className="add-button" onClick={handleAdd}>추가</button>
          </div>
        </section>

        <section className="tab-bar">
          {REQUEST_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              className={`tab-button${activeTab === type ? " active" : ""}`}
              onClick={() => setActiveTab(type)}
            >
              {type} 요구 <span className="tab-count">{countOf(type)}</span>
            </button>
          ))}
        </section>

        <section className="table-section">
          {renderTable(visibleRequests, `등록된 ${activeTab} 요구가 없습니다`)}
        </section>
      </div>

      <style>{`
        .page-content {
          padding: 24px;
        }

        .page-heading {
          margin-bottom: 24px;
        }

        .page-heading h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .request-form-section {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-row {
          display: flex;
          gap: 10px;
        }

        .form-input {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-family: inherit;
          font-size: 14px;
          padding: 10px 12px;
        }

        .form-input:focus {
          outline: none;
          border-color: #5b9bf0;
          box-shadow: 0 0 0 2px rgba(91, 155, 240, 0.1);
        }

        .form-input::placeholder {
          color: var(--text-muted);
        }

        .party-input {
          flex: 0 0 130px;
        }

        .member-input {
          flex: 0 0 140px;
        }

        .dept-select {
          flex: 0 0 160px;
        }

        .status-select {
          flex: 0 0 110px;
        }

        .date-input {
          flex: 0 0 190px;
        }

        .content-textarea {
          flex: 1;
          min-height: 44px;
          resize: vertical;
          line-height: 1.5;
        }

        .budget-item-input {
          flex: 0 0 160px;
        }

        .amount-input {
          flex: 0 0 130px;
        }

        .add-button {
          flex: 0 0 88px;
          border: 1px solid rgba(91, 155, 240, 0.35);
          border-radius: 6px;
          background: rgba(91, 155, 240, 0.15);
          color: #5b9bf0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .add-button:hover {
          background: rgba(91, 155, 240, 0.25);
        }

        .tab-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }

        .tab-button {
          padding: 9px 18px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .tab-button:hover {
          color: var(--text);
        }

        .tab-button.active {
          color: #5b9bf0;
          border-color: rgba(91, 155, 240, 0.45);
          background: rgba(91, 155, 240, 0.12);
        }

        .tab-count {
          margin-left: 6px;
          font-size: 12px;
          opacity: 0.75;
        }

        .type-select {
          min-width: 130px;
        }

        .table-section {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: auto;
        }

        .table-section + .table-section {
          margin-top: 28px;
        }

        .table-title {
          margin: 0;
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 700;
          border-bottom: 1px solid var(--border);
        }

        .requests-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 14px;
        }

        .requests-table th,
        .requests-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          text-align: left;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .requests-table th:last-child,
        .requests-table td:last-child {
          border-right: none;
        }

        .requests-table th {
          background: rgba(118, 157, 194, 0.08);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 13px;
          text-align: center;
        }

        .requests-table td {
          color: var(--text);
        }

        col.col-num { width: 4%; }
        col.col-district { width: 8%; }
        col.col-party { width: 8%; }
        col.col-member { width: 6%; }
        col.col-committee { width: 9%; }
        col.col-dept { width: 7%; }
        col.col-content { width: 16%; }
        col.col-budget-item { width: 12%; }
        col.col-amount { width: 7%; }
        col.col-date { width: 8%; }
        col.col-status { width: 7%; }
        col.col-action { width: 8%; }

        .col-num {
          text-align: center;
          color: var(--text-muted);
        }

        .col-member {
          font-weight: 600;
        }

        .col-content {
          white-space: pre-wrap;
        }

        .col-amount {
          white-space: nowrap;
        }

        .col-date {
          white-space: nowrap;
          color: var(--text-muted);
        }

        .col-action {
          text-align: center;
        }

        .cell-input {
          width: 100%;
          background: var(--bg-surface);
          border: 1px solid #5b9bf0;
          border-radius: 4px;
          color: var(--text);
          font-family: inherit;
          font-size: 13px;
          padding: 4px 6px;
        }

        .cell-textarea {
          resize: vertical;
          min-height: 40px;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: stretch;
        }

        .status-badge {
          width: 100%;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text);
          font-size: 13px;
          padding: 4px 6px;
          cursor: pointer;
        }

        .status-badge.status-반영 {
          color: #7ee787;
          border-color: rgba(126, 231, 135, 0.35);
          background: rgba(126, 231, 135, 0.08);
        }

        .status-badge.status-미반영 {
          color: #ff9aa7;
          border-color: rgba(255, 107, 125, 0.35);
          background: rgba(255, 107, 125, 0.08);
        }

        .status-badge.status-검토중 {
          color: #d9ad52;
          border-color: rgba(217, 173, 82, 0.35);
          background: rgba(217, 173, 82, 0.08);
        }

        .edit-button,
        .delete-button,
        .save-button,
        .cancel-button {
          border-radius: 5px;
          padding: 3px 8px;
          font-size: 12px;
          cursor: pointer;
        }

        .edit-button {
          border: 1px solid rgba(91, 155, 240, 0.35);
          background: rgba(91, 155, 240, 0.08);
          color: #5b9bf0;
        }

        .edit-button:hover {
          background: rgba(91, 155, 240, 0.18);
        }

        .save-button {
          border: 1px solid rgba(126, 231, 135, 0.35);
          background: rgba(126, 231, 135, 0.08);
          color: #7ee787;
        }

        .save-button:hover {
          background: rgba(126, 231, 135, 0.18);
        }

        .cancel-button {
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-muted);
        }

        .cancel-button:hover {
          color: var(--text);
        }

        .delete-button {
          border: 1px solid rgba(255, 107, 125, 0.35);
          background: rgba(255, 107, 125, 0.08);
          color: #ff9aa7;
        }

        .delete-button:hover {
          background: rgba(255, 107, 125, 0.18);
          color: #ffd8dd;
        }

        .empty-row {
          text-align: center;
          padding: 24px;
          color: var(--text-muted);
        }

        @media (max-width: 900px) {
          .form-row {
            flex-wrap: wrap;
          }

          .party-input,
          .member-input,
          .dept-select,
          .status-select,
          .date-input,
          .add-button {
            flex: 1 1 45%;
          }

          .content-textarea,
          .budget-item-input,
          .amount-input {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
