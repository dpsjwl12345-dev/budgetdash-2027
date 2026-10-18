import { useState } from "react";
import type { CouncilRequest } from "@/pages/CouncilMemberRequests";
import { DEPARTMENTS } from "@/lib/departments";

function metadata(note?: string): Record<string, string> {
  try { const value = JSON.parse(note || "{}"); return value && typeof value === "object" ? value : {}; } catch { return { review: note || "" }; }
}

export default function PartyRequestsTable({ rows, onUpdate }: { rows: CouncilRequest[]; onUpdate: (item: CouncilRequest) => Promise<boolean> }) {
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const mine = (row: CouncilRequest) => (DEPARTMENTS as readonly string[]).includes(row.department);
  const visible = rows.filter(row => (scope !== "mine" || mine(row)) && `${row.department} ${row.partyName} ${row.electoralDistrict} ${row.content}`.includes(search.trim()));
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
        <colgroup><col style={{width:"13%"}}/><col style={{width:"16%"}}/><col style={{width:"29%"}}/><col style={{width:"17%"}}/><col style={{width:"25%"}}/></colgroup>
        <thead><tr>{["부서", "정당", "요구내용", "요구액", "검토결과"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map(item => {
          const info = metadata(item.note);
          const amount = item.requestedAmount ? item.requestedAmount.split("\n").map(line => /^[\d,]+$/.test(line) ? (Number(line.replace(/,/g,""))/1000).toLocaleString("ko-KR", {maximumFractionDigits: 3}) : line).join("\n") : info.sourceAmount || "미기재";
          return <tr key={item.id}>
            <td><strong>{item.department}</strong></td>
            <td><span className="party-name-region">{item.partyName}{item.electoralDistrict && `(${item.electoralDistrict})`}</span></td>
            <td><div className="party-content">{item.content}</div>{info.source && <details><summary>출처 보기</summary>{info.source} · 정-{String(info.sourceNumber).padStart(2,"0")}</details>}</td>
            <td className="party-amount">{amount}</td>
            <td><label><span className="sr-only">{item.budgetItemName || item.content} 심사 상태</span><select value={item.status} onChange={e => void update({...item, status:e.target.value as CouncilRequest["status"]})}>{["검토중","반영","미반영"].map(status=><option key={status}>{status}</option>)}</select></label>
              {info.sourceReview && <details open><summary>자료상 의견</summary><p>{info.sourceReview}</p></details>}
              <textarea aria-label={`${item.budgetItemName || item.content} 검토 의견`} placeholder="심사 검토 의견 입력" defaultValue={info.review || ""} key={`${item.id}-${info.review || ""}`} onBlur={e => {if(e.target.value !== (info.review || "")) void update({...item,note:JSON.stringify({...info,review:e.target.value})});}}/>
            </td>
          </tr>;
        })}{!visible.length && <tr><td colSpan={5}>조건에 맞는 요구사업이 없습니다.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
