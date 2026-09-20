import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { DEPARTMENTS } from "@/lib/departments";

type RequestStatus = "검토중" | "반영" | "미반영";
type RequesterType = "시장" | "부시장";

type MayorRequest = {
  id: string;
  requesterType: RequesterType;
  memberName: string;
  department: string;
  content: string;
  budgetItemName: string;
  requestedAmount: string;
  status: RequestStatus;
  requestedDate: string;
};

const STATUS_OPTIONS: RequestStatus[] = ["검토중", "반영", "미반영"];
const REQUESTER_TYPE_OPTIONS: RequesterType[] = ["시장", "부시장"];

const todayString = () =>
  new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

const emptyForm = () => ({
  requesterType: "시장" as RequesterType,
  memberName: "",
  department: DEPARTMENTS[0] || "",
  content: "",
  budgetItemName: "",
  requestedAmount: "",
  status: "검토중" as RequestStatus,
  requestedDate: todayString(),
});

export default function MayorViceMayorRequests() {
  const [requests, setRequests] = useState<MayorRequest[]>([]);
  const [form, setForm] = useState(emptyForm());

  // 서버 데이터를 우선 로드하고, 서버를 사용할 수 없는 경우 localStorage를 사용한다.
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch("/api/cloud-sync?type=mayor-requests");
        if (!response.ok) throw new Error("서버 로드 실패");
        const { data } = await response.json();
        if (Array.isArray(data)) {
          setRequests(data);
          localStorage.setItem("mayorViceMayorRequests", JSON.stringify(data));
          return;
        }
      } catch (error) {
        console.warn("서버에서 시장·부시장 요구사항 로드 실패:", error);
      }

      const saved = localStorage.getItem("mayorViceMayorRequests");
      if (saved) {
        try {
          setRequests(JSON.parse(saved));
        } catch (error) {
          console.error("시장·부시장 요구사항 로컬 데이터 로드 실패:", error);
        }
      }
    };
    loadRequests();
  }, []);

  const handleAdd = async () => {
    if (!form.memberName.trim() || !form.content.trim()) return;

    const newItem: MayorRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      requesterType: form.requesterType,
      memberName: form.memberName.trim(),
      department: form.department,
      content: form.content.trim(),
      budgetItemName: form.budgetItemName.trim(),
      requestedAmount: form.requestedAmount.trim(),
      status: form.status,
      requestedDate: form.requestedDate,
    };

    const updated = [newItem, ...requests];
    setRequests(updated);
    localStorage.setItem("mayorViceMayorRequests", JSON.stringify(updated));
    setForm(emptyForm());

    try {
      const response = await fetch("/api/cloud-sync?type=mayor-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newItem }),
      });
      if (!response.ok) throw new Error("서버 저장 실패");
    } catch (error) {
      console.warn("시장·부시장 요구사항 서버 저장 실패:", error);
    }
  };

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    const target = requests.find((item) => item.id === id);
    if (!target) return;
    const updatedItem = { ...target, status };
    const updated = requests.map((item) => (item.id === id ? updatedItem : item));
    setRequests(updated);
    localStorage.setItem("mayorViceMayorRequests", JSON.stringify(updated));

    try {
      const response = await fetch("/api/cloud-sync?type=mayor-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updatedItem }),
      });
      if (!response.ok) throw new Error("서버 저장 실패");
    } catch (error) {
      console.warn("반영여부 서버 저장 실패:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = requests.filter((item) => item.id !== id);
    setRequests(updated);
    localStorage.setItem("mayorViceMayorRequests", JSON.stringify(updated));

    try {
      const response = await fetch("/api/cloud-sync?type=mayor-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!response.ok) throw new Error("서버 삭제 실패");
    } catch (error) {
      console.warn("시장·부시장 요구사항 삭제 서버 저장 실패:", error);
    }
  };

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>시장, 부시장 요구사항</h1>
        </section>

        <section className="request-form-section">
          <div className="form-row">
            <select
              className="form-input type-select"
              value={form.requesterType}
              onChange={(e) => setForm({ ...form, requesterType: e.target.value as RequesterType })}
            >
              {REQUESTER_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              className="form-input member-input"
              placeholder="이름"
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
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

        <section className="table-section">
          <table className="requests-table">
            <thead>
              <tr>
                <th className="col-num">번호</th>
                <th className="col-type">구분</th>
                <th className="col-member">이름</th>
                <th className="col-dept">소관부서</th>
                <th className="col-content">요구내용</th>
                <th className="col-budget-item">사업명 (세부사업+부기명)</th>
                <th className="col-amount">요구액</th>
                <th className="col-date">요구일</th>
                <th className="col-status">반영여부</th>
                <th className="col-action">삭제</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map((item, index) => (
                  <tr key={item.id}>
                    <td className="col-num">{requests.length - index}</td>
                    <td className="col-type">
                      <span className={`type-badge type-${item.requesterType}`}>{item.requesterType}</span>
                    </td>
                    <td className="col-member">{item.memberName}</td>
                    <td className="col-dept">{item.department}</td>
                    <td className="col-content">{item.content}</td>
                    <td className="col-budget-item">{item.budgetItemName}</td>
                    <td className="col-amount">{item.requestedAmount}</td>
                    <td className="col-date">{item.requestedDate}</td>
                    <td className="col-status">
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
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => handleDelete(item.id)}
                        aria-label="요구사항 삭제"
                      >삭제</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="empty-row">등록된 요구사항이 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
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

        .type-select {
          flex: 0 0 90px;
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

        .table-section {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: auto;
        }

        .requests-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .requests-table th,
        .requests-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          text-align: left;
          vertical-align: top;
        }

        .requests-table th {
          background: rgba(118, 157, 194, 0.08);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 13px;
          white-space: nowrap;
        }

        .requests-table td {
          color: var(--text);
        }

        .col-num {
          width: 48px;
          text-align: center;
          color: var(--text-muted);
        }

        .col-member {
          width: 100px;
          font-weight: 600;
        }

        .col-type {
          width: 64px;
          text-align: center;
        }

        .col-dept {
          width: 120px;
        }

        .col-content {
          min-width: 260px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .col-budget-item {
          width: 130px;
        }

        .col-amount {
          width: 100px;
          white-space: nowrap;
        }

        .col-date {
          width: 110px;
          white-space: nowrap;
          color: var(--text-muted);
        }

        .col-status {
          width: 100px;
        }

        .col-action {
          width: 60px;
          text-align: center;
        }

        .status-badge {
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

        .type-badge {
          display: inline-block;
          border-radius: 5px;
          border: 1px solid var(--border);
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          white-space: nowrap;
        }

        .type-badge.type-시장 {
          color: #b98cf0;
          border-color: rgba(185, 140, 240, 0.35);
          background: rgba(185, 140, 240, 0.1);
        }

        .type-badge.type-부시장 {
          color: #52c4d9;
          border-color: rgba(82, 196, 217, 0.35);
          background: rgba(82, 196, 217, 0.1);
        }

        .delete-button {
          border: 1px solid rgba(255, 107, 125, 0.35);
          border-radius: 5px;
          padding: 3px 8px;
          background: rgba(255, 107, 125, 0.08);
          color: #ff9aa7;
          font-size: 12px;
          cursor: pointer;
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

          .type-select,
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
