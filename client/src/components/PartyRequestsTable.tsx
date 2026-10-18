import { useState } from "react";
import type { CouncilRequest } from "@/pages/CouncilMemberRequests";
import { DEPARTMENTS } from "@/lib/departments";

function metadata(note?: string): Record<string, string> {
  try { const value = JSON.parse(note || "{}"); return value && typeof value === "object" ? value : {}; } catch { return { review: note || "" }; }
}

export default function PartyRequestsTable({ rows, onUpdate, onDelete }: { rows: CouncilRequest[]; onUpdate: (item: CouncilRequest) => Promise<boolean>; onDelete: (item: CouncilRequest) => Promise<boolean> }) {
  const [draft, setDraft] = useState<CouncilRequest | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const mine = (row: CouncilRequest) => (DEPARTMENTS as readonly string[]).includes(row.department);
  const visible = rows.filter(row => (scope !== "mine" || mine(row)) && `${row.department} ${row.partyName} ${row.electoralDistrict} ${row.content} ${row.budgetItemName}`.includes(search.trim()));
  const update = async (item: CouncilRequest) => {
    const saved = await onUpdate(item);
    setMessage(saved ? "저장했습니다." : "이 브라우저에 저장했습니다. 서버 저장은 실패하여 다른 기기에는 반영되지 않습니다.");
  };
  return <section className="party-review-section">
    <div className="party-review-controls">
      <div role="group" aria-label="요구사업 조회 범위">
        <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>시 전체 {rows.length}건</button>
        <button type="button" aria-pressed={scope === "mine"} onClick={() => setScope("mine")}>내 담당 부서 {rows.filter(mine).length}건</button>
      </div>
      <input aria-label="당정협의회 검색" placeholder="부서·정당·지역·요구내용 검색" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    <p role="status">{message}</p>
    <div className="party-review-scroll" tabIndex={0} role="region" aria-label="당정협의회 요구사업 목록">
      <table className="party-review-table">
        <caption>당정협의회 요구사업 {visible.length}건 · 금액 단위: 백만원</caption>
        <colgroup><col style={{width:"12%"}}/><col style={{width:"14%"}}/><col style={{width:"25%"}}/><col style={{width:"16%"}}/><col style={{width:"23%"}}/><col style={{width:"10%"}}/></colgroup>
        <thead><tr>{["부서", "정당", "요구내용", "요구액", "검토결과", "관리"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map(item => {
          const info = metadata(item.note);
          const amount = item.requestedAmount ? item.requestedAmount.split("\n").map(line => {
            const value = line.trim().replace(/\s*천원$/, "").replace(/,/g, "");
            return /^\d+(?:\.\d+)?$/.test(value) ? (Number(value)/1000).toLocaleString("ko-KR", {maximumFractionDigits: 3}) : line;
          }).join("\n") : info.sourceAmount || "미기재";
          if (draft?.id === item.id) return <tr key={item.id}><td colSpan={6}>
            <form className="party-edit-form" onSubmit={async e => {
              e.preventDefault(); setBusy(true);
              try {
                const numeric = editAmount.split("\n").every(line => !line.trim() || /^\d+(?:\.\d+)?$/.test(line.trim().replace(/,/g, "")));
                const details = metadata(draft.note);
                if (!numeric) details.sourceAmount = editAmount;
                const saved = {...draft, requestedAmount: numeric ? editAmount.split("\n").map(line => line.trim() ? String(Math.round(Number(line.replace(/,/g,"")) * 1000)) : "").join("\n") : "", note: JSON.stringify(details)};
                await update(saved); setDraft(null);
              } finally { setBusy(false); }
            }}>
              <label>부서<input required value={draft.department} onChange={e=>setDraft({...draft,department:e.target.value})}/></label>
              <label>정당<input required value={draft.partyName} onChange={e=>setDraft({...draft,partyName:e.target.value})}/></label>
              <label>지역<input value={draft.electoralDistrict} onChange={e=>setDraft({...draft,electoralDistrict:e.target.value})}/></label>
              <label>요구내용<textarea required value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>
              <label>요구액 (백만원)<textarea className="party-edit-amount" value={editAmount} onChange={e=>setEditAmount(e.target.value)}/></label>
              <div className="party-row-actions"><button disabled={busy} type="submit">저장</button><button disabled={busy} type="button" onClick={()=>setDraft(null)}>취소</button></div>
            </form>
          </td></tr>;
          return <tr key={item.id} data-district={(item.electoralDistrict || "").trim().replace(/^화성시?\s*/, "")}>
            <td><strong>{item.department}</strong></td>
            <td><span className="party-name-region">{item.partyName}{item.electoralDistrict && `(${item.electoralDistrict})`}</span></td>
            <td><div className="party-content">{item.budgetItemName && !item.content.includes(item.budgetItemName) && <strong>{item.budgetItemName}<br /></strong>}{item.content}</div>{info.source && <details><summary>출처 보기</summary>{info.source} · 정-{String(info.sourceNumber).padStart(2,"0")}</details>}</td>
            <td className="party-amount">{amount}</td>
            <td><label><span className="sr-only">{item.budgetItemName || item.content} 심사 상태</span><select value={item.status} onChange={e => void update({...item, status:e.target.value as CouncilRequest["status"]})}>{["검토중","반영","미반영"].map(status=><option key={status}>{status}</option>)}</select></label>
              {info.sourceReview && <details open><summary>자료상 의견</summary><p>{info.sourceReview}</p></details>}
            </td>
            <td><div className="party-row-actions">
              <button type="button" disabled={busy} onClick={()=>{setDraft({...item});setEditAmount(amount === "미기재" ? "" : amount);}}>수정</button>
              <button type="button" disabled={busy} className="party-delete-button" onClick={async ()=>{
                if (!window.confirm(`‘${item.budgetItemName || item.content}’ 요구사항을 삭제하시겠습니까?`)) return;
                setBusy(true);
                try { const saved = await onDelete(item); setMessage(saved ? "삭제했습니다." : "이 브라우저에서 삭제했습니다. 서버 반영은 실패했습니다."); }
                finally { setBusy(false); }
              }}>삭제</button>
            </div></td>
          </tr>;
        })}{!visible.length && <tr><td colSpan={6}>조건에 맞는 요구사업이 없습니다.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
