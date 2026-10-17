// 초기 화면 하단의 "2027년도 본예산 편성 일정" 스케줄러.
// 출처: 예산재정과 「★2027년도 본예산 일정표★ v4.hwpx」. 일정이 바뀌면 아래 SCHEDULE만 고치면 된다.
// 진행 상태(지남/진행 중/예정)는 오늘 날짜로 자동 판정한다.

type ScheduleItem = {
  title: string;
  detail?: string;
  start: string; // YYYY-MM-DD. "~10.16 限"처럼 마감만 있는 일정은 start = end
  end: string;
  when: string; // 원문 날짜 표기
  note?: string; // 비고
  report?: string; // 시장님 보고 등 주요 보고(원문 노란 음영 행)
};

const SCHEDULE: ScheduleItem[] = [
  { title: "본예산 편성 분야별 조정현황 보고", detail: "지시사항, 공약사업, 20억 이상 투자사업", start: "2026-10-12", end: "2026-10-12", when: "10. 12.(월) 국장단 차담회 이후", report: "시장님 대면보고" },
  { title: "2026년 본예산 기준경비편성안 결재 및 통보", detail: "메모보고 통보 시, 전체공개 가능한 내역만 발췌 후 재편집하여 공개", start: "2026-10-16", end: "2026-10-16", when: "~ 10. 16.(금)" },
  { title: "본예산 편성 분야별 조정현황 보고", detail: "행사, 단체보조금, 10개 공공기관, 의원요구사업", start: "2026-10-19", end: "2026-10-19", when: "10. 19.(월) 오전 중", report: "시장님 대면보고" },
  { title: "조정현황 정책실, 비서실 협의", start: "2026-10-21", end: "2026-10-23", when: "10. 21.(수) ~ 23.(금)" },
  { title: "조정현황 제1,2부시장님 보고", start: "2026-10-21", end: "2026-10-23", when: "10. 21.(수) ~ 23.(금)" },
  { title: "예산안 초안 보고", start: "2026-10-26", end: "2026-10-26", when: "10. 26.(월) 시간 미정", note: "10. 16.(금) 16시 이호조 마감 및 퇴청 전 자료제출", report: "초안 보고" },
  { title: "예산(안) 출력 및 이호조 입력내역 점검", start: "2026-10-26", end: "2026-10-30", when: "10. 26.(월) 초안보고 이후", note: "팀별로 위원회 예산(안) 출력 후 교차점검" },
  { title: "설명자료 입력 안내", start: "2026-10-26", end: "2026-10-30", when: "10. 26.(월) 이후" },
  { title: "국도비 보조사업 내시 확정 반영", detail: "국도비 보조사업 내시 추가 심사 및 조정", start: "2026-10-30", end: "2026-10-30", when: "~ 10. 30.(금) 限", note: "그 후 내시서는 2027년 추경" },
  { title: "성과계획서 및 성인지 예산 작성", start: "2026-11-03", end: "2026-11-03", when: "11. 3.(화) 限" },
  { title: "예산안 최종 보고", start: "2026-11-04", end: "2026-11-04", when: "11. 4.(수) 미확정", note: "시장님 일정확인 要", report: "최종 보고" },
  { title: "예산안 시의회 제출", start: "2026-11-06", end: "2026-11-06", when: "~ 11. 6.(금) 限", note: "책자전달 11. 19.(목) 限. 늦어질 경우 책자파일 선송부, 책자 20일 송부로 협의 필요. 회계연도 개시 40일 전(~11. 21.)" },
  { title: "제2차 정례회 중 세입·세출예산 의결(시의회)", start: "2026-11-16", end: "2026-12-17", when: "11. 16.(월) ~ 12. 17.(목)" },
];

const DAY = 86400000;
const toTime = (s: string) => new Date(`${s}T00:00:00`).getTime();
const RAIL_START = toTime("2026-10-12");
const RAIL_END = toTime("2026-12-17");
const pct = (t: number) => Math.min(100, Math.max(0, ((t - RAIL_START) / (RAIL_END - RAIL_START)) * 100));
const RAIL_MONTHS = [
  { label: "10월", t: toTime("2026-10-12") },
  { label: "11월", t: toTime("2026-11-01") },
  { label: "12월", t: toTime("2026-12-01") },
];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function statusOf(item: ScheduleItem, today: number) {
  if (toTime(item.end) < today) return "done";
  if (toTime(item.start) <= today) return "now";
  return "next";
}

function shortDate(s: string) {
  const d = new Date(`${s}T00:00:00`);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function BudgetSchedule2027() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayLabel = `${now.getMonth() + 1}. ${now.getDate()}.(${WEEKDAYS[now.getDay()]})`;
  const nextIndex = SCHEDULE.findIndex((item) => statusOf(item, today) !== "done");
  const nextItem = nextIndex >= 0 ? SCHEDULE[nextIndex] : null;
  const dDay = nextItem ? Math.round((toTime(nextItem.start) - today) / DAY) : null;
  const milestones = SCHEDULE.filter((item) => item.report || item.title === "예산안 시의회 제출");
  const council = SCHEDULE[SCHEDULE.length - 1];
  const showToday = today >= RAIL_START && today <= RAIL_END;

  return (
    <section className="bs-schedule" aria-labelledby="bs-schedule-title">
      <header className="bs-head">
        <h2 id="bs-schedule-title">2027년도 본예산 편성 일정</h2>
        <p className="bs-head-meta">
          오늘 {todayLabel}
          {nextItem && dDay !== null && (
            <>
              <span className="bs-head-sep" aria-hidden="true" />
              다음 일정 <strong>{nextItem.title}</strong> {dDay <= 0 ? "진행 중" : `D-${dDay}`}
            </>
          )}
        </p>
      </header>

      <div className="bs-rail" role="img" aria-label="10월 12일부터 12월 17일까지 주요 보고 일정">
        <div className="bs-rail-track" />
        {RAIL_MONTHS.map((m) => (
          <span key={m.label} className="bs-rail-month" style={{ left: `${pct(m.t)}%` }}>{m.label}</span>
        ))}
        <div
          className="bs-rail-band"
          style={{ left: `${pct(toTime(council.start))}%`, width: `${pct(toTime(council.end)) - pct(toTime(council.start))}%` }}
        >
          <span>시의회 정례회 심의·의결</span>
        </div>
        {milestones.map((m, i) => (
          <div
            key={`${m.start}-${i}`}
            className={`bs-rail-mark bs-rail-mark--${statusOf(m, today)} ${i % 2 ? "bs-rail-mark--low" : ""} ${i === 0 ? "bs-rail-mark--first" : ""}`}
            style={{ left: `${pct(toTime(m.start))}%` }}
          >
            <span className="bs-rail-dot" />
            <span className="bs-rail-label">
              <b>{shortDate(m.start)}</b> {m.report ?? "시의회 제출"}
            </span>
          </div>
        ))}
        {showToday && (
          <div className="bs-rail-today" style={{ left: `${pct(today)}%` }}>
            <span>오늘</span>
          </div>
        )}
      </div>

      <ol className="bs-list">
        {SCHEDULE.map((item, i) => {
          const status = statusOf(item, today);
          const d = new Date(`${item.start}T00:00:00`);
          return (
            <li key={i} className={`bs-row bs-row--${status} ${item.report ? "bs-row--report" : ""} ${i === nextIndex ? "bs-row--focus" : ""}`}>
              <div className="bs-date">
                <span className="bs-date-num">{d.getMonth() + 1}.{String(d.getDate()).padStart(2, "0")}</span>
                <span className="bs-date-day">{WEEKDAYS[d.getDay()]}</span>
              </div>
              <div className="bs-body">
                <div className="bs-title-line">
                  <span className="bs-title">{item.title}</span>
                  {item.report === "시장님 대면보고" && <span className="bs-tag">시장님 대면보고</span>}
                  {status === "now" && <span className="bs-state bs-state--now">진행 중</span>}
                  {status === "done" && <span className="bs-state">지남</span>}
                </div>
                {item.detail && <div className="bs-detail">{item.detail}</div>}
                <div className="bs-when">{item.when}</div>
              </div>
              {item.note && <div className="bs-note">{item.note}</div>}
            </li>
          );
        })}
      </ol>

      <style>{`
        .bs-schedule { margin-top: 36px; padding-top: 28px; border-top: 1px solid var(--line); }
        .bs-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 26px; }
        .bs-head h2 { margin: 0; font-size: 28px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; }
        .bs-head-meta { margin: 0; font-size: 17px; color: var(--text); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .bs-head-meta strong { color: #ffe9b0; font-weight: 600; }
        .bs-head-sep { width: 1px; height: 12px; background: var(--line-strong); }

        .bs-rail { position: relative; height: 124px; margin: 0 14px 24px; }
        .bs-rail-track { position: absolute; left: 0; right: 0; top: 56px; height: 2px; background: var(--line-strong); }
        .bs-rail-month { position: absolute; top: 104px; font-size: 14px; color: var(--text-muted); transform: translateX(-50%); }
        .bs-rail-month:first-of-type { transform: none; }
        .bs-rail-band { position: absolute; top: 52px; height: 10px; background: rgba(127, 184, 255, 0.28); border-radius: 5px; }
        .bs-rail-band span { position: absolute; top: 18px; right: 0; font-size: 14px; color: #b5d6ff; white-space: nowrap; }
        .bs-rail-mark { position: absolute; top: 0; bottom: 0; width: 0; }
        .bs-rail-mark::before { content: ""; position: absolute; left: 0; top: 20px; height: 32px; width: 1px; background: var(--line-strong); }
        .bs-rail-mark--low::before { top: 62px; height: 14px; }
        .bs-rail-dot { position: absolute; z-index: 1; left: -6px; top: 51px; width: 12px; height: 12px; border-radius: 50%; background: #ffe9b0; box-shadow: 0 0 0 3px var(--bg-base); }
        .bs-rail-label { position: absolute; top: 0; left: 0; transform: translateX(-50%); white-space: nowrap; font-size: 15px; font-weight: 500; color: var(--text); }
        .bs-rail-mark--low .bs-rail-label { top: 78px; }
        .bs-rail-mark--first .bs-rail-label { transform: translateX(-6px); }
        .bs-rail-label b { color: #ffe9b0; font-variant-numeric: tabular-nums; }
        .bs-rail-mark--done .bs-rail-dot { background: var(--text-faint); }
        .bs-rail-mark--done .bs-rail-label { color: #a3b4c6; }
        .bs-rail-mark--done .bs-rail-label b { color: #a3b4c6; }
        .bs-rail-today { position: absolute; top: 40px; height: 30px; width: 2px; background: #ff6b7d; transform: translateX(-1px); z-index: 2; }
        .bs-rail-today span { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 14px; font-weight: 700; color: #ff8a98; white-space: nowrap; }

        .bs-list { list-style: none; margin: 0; padding: 0; }
        .bs-row { display: grid; grid-template-columns: 108px minmax(0, 1fr) minmax(0, 340px); gap: 20px; align-items: start; padding: 14px 4px 14px 14px; border-top: 1px solid var(--line); position: relative; }
        .bs-row:last-child { border-bottom: 1px solid var(--line); }
        .bs-row--report::before { content: ""; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 2px; background: #ffe9b0; }
        .bs-row--focus { background: rgba(127, 184, 255, 0.07); }
        .bs-date { display: flex; align-items: baseline; gap: 6px; }
        .bs-date-num { font-size: 26px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; line-height: 1.1; }
        .bs-date-day { font-size: 15px; color: #c3d0de; }
        .bs-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .bs-title { font-size: 19px; font-weight: 600; color: var(--text); }
        .bs-tag { font-size: 15px; font-weight: 600; color: #ffe9b0; }
        .bs-state { font-size: 14px; color: #a3b4c6; }
        .bs-state--now { color: #7fb8ff; font-weight: 700; }
        .bs-detail { margin-top: 4px; font-size: 16px; color: #c3d0de; line-height: 1.5; }
        .bs-when { margin-top: 5px; font-size: 15px; color: #b5d6ff; }
        .bs-note { font-size: 15px; color: #d3dde8; line-height: 1.55; padding-top: 2px; }
        .bs-row--done .bs-date-num, .bs-row--done .bs-title { color: #a3b4c6; }
        .bs-row--done .bs-when, .bs-row--done .bs-detail, .bs-row--done .bs-note, .bs-row--done .bs-tag { color: #8fa3b8; }
        .bs-row--done::before { opacity: 0.35; }

        @media (max-width: 760px) {
          .bs-rail { display: none; }
          .bs-row { grid-template-columns: 64px minmax(0, 1fr); gap: 12px; }
          .bs-date { flex-direction: column; gap: 0; }
          .bs-date-num { font-size: 22px; }
          .bs-note { grid-column: 2; padding-top: 0; }
        }
      `}</style>
    </section>
  );
}
