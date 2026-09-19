import { useMemo, useState } from "react";
import Layout from "@/components/Layout";

// 이 계산기는 "세출 통계목별 상세 - 101-04 기간제근로자등 보수" 가이드 페이지에 이미
// 등록되어 있는 2027년 직종별 단가(화성시 생활임금 기준)·공정수당 지급기준표·산출식을
// 그대로 옮겨와 계산만 대신해줄 뿐이다 - 여기서 새로운 단가나 기준을 만들지 않는다.
// 단, 기관에 따라 생활임금이 아니라 최저임금 등 다른 기준으로 일일단가를 정하는 경우가
// 있어 - 이 앱에 확정된 최저임금 수치를 등록해 둔 곳이 없으므로 임의로 만들어 넣지 않고 -
// 아래 "직종별 단가"는 참고용 빠른 채우기일 뿐, 일일 단가 입력칸은 항상 직접 수정할 수 있다.
type JobRate = { key: string; label: string; dailyWage: number; note: string };

const JOB_RATES: JobRate[] = [
  { key: "admin", label: "생활임금 (행정/도서/농림/환경정비원 등)", dailyWage: 103680, note: "화성시 생활임금 우선 적용 - 기본값" },
  { key: "counsel", label: "사례관리/상담/조사원 등", dailyWage: 103680, note: "해당 업무 전담 임금 적용" },
  { key: "facility", label: "기계실무원, 시설물관리원", dailyWage: 108960, note: "차량운전, 시설 보수 등" },
  { key: "nurse_aide", label: "보건의료보조원 (간호조무사)", dailyWage: 112560, note: "보건소 보조원" },
  { key: "health_pro", label: "보건의료실무원 (임상병리사, 간호사)", dailyWage: 128840, note: "대체인력 일급 15만원 적용" },
  { key: "construction", label: "건설실무원 (도로보수, 수거 등)", dailyWage: 161920, note: "건설기계 운전 등 포함" },
];

type FairPayTier = { label: string; rate: string; amount: number; minMonths: number };

const FAIR_PAY_TIERS: FairPayTier[] = [
  { label: "1~2개월 미만", rate: "10%", amount: 400000, minMonths: 1 },
  { label: "3~4개월 미만", rate: "9.5%", amount: 886000, minMonths: 3 },
  { label: "5~6개월 미만", rate: "9%", amount: 1319000, minMonths: 5 },
  { label: "7~8개월 미만", rate: "8.5%", amount: 1699000, minMonths: 7 },
  { label: "9~10개월 미만", rate: "8.5%", amount: 2152000, minMonths: 9 },
  { label: "11~12개월 미만", rate: "8.5%", amount: 2605000, minMonths: 11 },
];

function getFairPayTier(months: number): FairPayTier | null {
  if (!months || months < 1) return null;
  let matched: FairPayTier | null = null;
  for (const tier of FAIR_PAY_TIERS) {
    if (months >= tier.minMonths) matched = tier;
  }
  return matched;
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString()}원`;
}

export default function TempWorkerWageCalculator() {
  const [jobKey, setJobKey] = useState<string>(JOB_RATES[0].key);
  const [dailyWageInput, setDailyWageInput] = useState<string>(String(JOB_RATES[0].dailyWage));
  const [headcount, setHeadcount] = useState<string>("1");
  const [months, setMonths] = useState<string>("6");
  const [workDaysOverride, setWorkDaysOverride] = useState<string>("");
  const [basePayOverride, setBasePayOverride] = useState<string>("");
  const [unusedLeaveDays, setUnusedLeaveDays] = useState<string>("0");
  const [insuranceRate, setInsuranceRate] = useState<12 | 11.75>(12);

  const selectedJob = JOB_RATES.find((job) => job.key === jobKey);

  const result = useMemo(() => {
    const dailyWage = Number(dailyWageInput) || 0;
    const people = Number(headcount) || 0;
    const monthsNum = Number(months) || 0;
    const autoWorkDays = Math.round(monthsNum * 27);
    const workDays = workDaysOverride ? Number(workDaysOverride) || 0 : autoWorkDays;
    const leaveDays = Number(unusedLeaveDays) || 0;

    // 표준 산출식(기본급·주휴수당 통합): 기준단가(원) × 인원(명) × 근무일수(일)
    // - 월 평균 기준일수(주휴일 포함) 27일 적용. 실제로는 직종별 단가표에 없는 경우나
    // 이미 정해진 금액을 그대로 써야 하는 경우가 있어 최종 금액 자체도 덮어쓸 수 있게 한다.
    const autoBasePlusWeeklyPay = dailyWage * people * workDays;
    const basePlusWeeklyPay = basePayOverride ? Number(basePayOverride) || 0 : autoBasePlusWeeklyPay;
    // 연차수당: 일일단가(원) × 인원(명) × 미사용 연차 일수(일)
    const leavePay = dailyWage * people * leaveDays;
    const wageSubtotal = basePlusWeeklyPay + leavePay;
    // 4대 보험료(기관 부담금): 임금 총액(원) × 12% (또는 11.75%)
    const insurance = wageSubtotal * (insuranceRate / 100);
    // 공정수당: 기간제근로자 인원수(명) × 구간별 보상지급액(원)
    const tier = getFairPayTier(monthsNum);
    const fairPay = (tier?.amount ?? 0) * people;
    const total = wageSubtotal + insurance + fairPay;

    return { dailyWage, people, monthsNum, autoWorkDays, workDays, leaveDays, autoBasePlusWeeklyPay, basePlusWeeklyPay, leavePay, wageSubtotal, insurance, tier, fairPay, total };
  }, [dailyWageInput, headcount, months, workDaysOverride, basePayOverride, unusedLeaveDays, insuranceRate]);

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>기간제 인건비 계산기</h1>
        </section>

        <section className="guide-section">
          <div className="guide-content">
            <div className="calc-layout">
              <div className="calc-inputs">
                <div className="calc-field">
                  <label>직종 (화성시 생활임금 기준 - 빠른 채우기)</label>
                  <select
                    value={jobKey}
                    onChange={(e) => {
                      const key = e.target.value;
                      setJobKey(key);
                      const job = JOB_RATES.find((j) => j.key === key);
                      if (job) setDailyWageInput(String(job.dailyWage));
                    }}
                  >
                    {JOB_RATES.map((job) => (
                      <option key={job.key} value={job.key}>
                        {job.label} (일급 {job.dailyWage.toLocaleString()}원)
                      </option>
                    ))}
                  </select>
                  <span className="calc-hint">{selectedJob?.note}</span>
                </div>

                <div className="calc-field">
                  <label>일일 단가(원) - 직접 수정 가능</label>
                  <input
                    type="number"
                    min="0"
                    value={dailyWageInput}
                    onChange={(e) => setDailyWageInput(e.target.value)}
                    placeholder="예: 103680"
                  />
                  <span className="calc-hint">
                    위 직종 선택은 생활임금 기준 참고값을 채워줄 뿐입니다. 최저임금 등 다른 기준을 적용하는
                    기관은 이 칸에 해당 일일 단가를 직접 입력하세요.
                  </span>
                </div>

                <div className="calc-field">
                  <label>인원(명)</label>
                  <input type="number" min="0" step="1" value={headcount} onChange={(e) => setHeadcount(e.target.value)} />
                </div>

                <div className="calc-field">
                  <label>고용(근무) 기간(개월)</label>
                  <input type="number" min="0" step="0.5" value={months} onChange={(e) => setMonths(e.target.value)} />
                  <span className="calc-hint">공정수당 구간 판정 및 근무일수 자동 계산(27일 × 개월)에 쓰입니다.</span>
                </div>

                <div className="calc-field">
                  <label>근무일수(일) - 자동계산값 수정 가능</label>
                  <input
                    type="number"
                    min="0"
                    value={workDaysOverride}
                    onChange={(e) => setWorkDaysOverride(e.target.value)}
                    placeholder={`자동: ${result.autoWorkDays}일 (27일 × ${result.monthsNum || 0}개월)`}
                  />
                </div>

                <div className="calc-field">
                  <label>기본급·주휴수당 금액(원) - 자동계산값 수정 가능</label>
                  <input
                    type="number"
                    min="0"
                    value={basePayOverride}
                    onChange={(e) => setBasePayOverride(e.target.value)}
                    placeholder={`자동: ${result.autoBasePlusWeeklyPay.toLocaleString()}원 (일일단가 × 인원 × 근무일수)`}
                  />
                </div>

                <div className="calc-field">
                  <label>미사용 연차 일수(일)</label>
                  <input type="number" min="0" step="1" value={unusedLeaveDays} onChange={(e) => setUnusedLeaveDays(e.target.value)} />
                </div>

                <div className="calc-field">
                  <label>4대 보험료(기관 부담금) 요율</label>
                  <div className="calc-toggle">
                    <button type="button" className={insuranceRate === 12 ? "active" : ""} onClick={() => setInsuranceRate(12)}>12%</button>
                    <button type="button" className={insuranceRate === 11.75 ? "active" : ""} onClick={() => setInsuranceRate(11.75)}>11.75%</button>
                  </div>
                  <span className="calc-hint">국민연금 사업주 부담 비율 4.75%→5% 인상분 반영 여부에 따라 선택합니다.</span>
                </div>
              </div>

              <div className="calc-result">
                <h3>계산 결과</h3>
                <div className="calc-result-row">
                  <span>기본급·주휴수당 (통합)</span>
                  <strong>{won(result.basePlusWeeklyPay)}</strong>
                </div>
                <div className="calc-result-sub">
                  {basePayOverride
                    ? "직접 입력한 금액"
                    : `${result.dailyWage.toLocaleString()}원 × ${result.people}명 × ${result.workDays}일`}
                </div>

                <div className="calc-result-row">
                  <span>연차수당</span>
                  <strong>{won(result.leavePay)}</strong>
                </div>
                <div className="calc-result-sub">
                  {result.dailyWage.toLocaleString()}원 × {result.people}명 × {result.leaveDays}일
                </div>

                <div className="calc-result-row subtotal">
                  <span>임금 소계</span>
                  <strong>{won(result.wageSubtotal)}</strong>
                </div>

                <div className="calc-result-row">
                  <span>4대 보험료 (기관 부담금, {insuranceRate}%)</span>
                  <strong>{won(result.insurance)}</strong>
                </div>

                <div className="calc-result-row">
                  <span>공정수당 {result.tier ? `(${result.tier.label} · ${result.tier.rate})` : "(1개월 미만 - 일할계산 필요)"}</span>
                  <strong>{won(result.fairPay)}</strong>
                </div>
                {result.tier && (
                  <div className="calc-result-sub">
                    {result.tier.amount.toLocaleString()}원 × {result.people}명
                  </div>
                )}

                <div className="calc-result-row total">
                  <span>총 인건비</span>
                  <strong>{won(result.total)}</strong>
                </div>
              </div>
            </div>

            <div className="calc-reference">
              <h4>참고 - 2027년 화성형 공정수당 지급 기준</h4>
              <table className="content-table">
                <thead>
                  <tr>
                    <th>근무기간</th>
                    <th>보상지급률</th>
                    <th>공정수당</th>
                  </tr>
                </thead>
                <tbody>
                  {FAIR_PAY_TIERS.map((tier) => (
                    <tr key={tier.label} className={result.tier?.label === tier.label ? "calc-tier-active" : ""}>
                      <td>{tier.label}</td>
                      <td>{tier.rate}</td>
                      <td>{tier.amount.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="calc-footnote">1개월 미만은 근무기간을 고려해 일할계산합니다. (자세한 산출식·직종별 단가는 "세출 통계목별 상세 &gt; 인건비(100) &gt; 101-04" 탭 참고)</p>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .guide-section {
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .guide-content {
          padding: 40px;
          background: var(--bg-surface);
        }

        .intro-text {
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.7;
          margin: 0 0 24px 0;
        }

        .calc-layout {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .calc-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 18px 24px;
        }

        .calc-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .calc-field label {
          font-size: 15px;
          font-weight: 400;
          color: var(--text);
        }

        .calc-field input,
        .calc-field select {
          padding: 9px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text);
          font-size: 14px;
        }

        .calc-field input:focus,
        .calc-field select:focus {
          outline: none;
          border-color: #5b9bf0;
        }

        .calc-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        .calc-toggle {
          display: flex;
          gap: 8px;
        }

        .calc-toggle button {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease-out;
        }

        .calc-toggle button.active {
          background: rgba(91, 155, 240, 0.18);
          border-color: #5b9bf0;
          color: #5b9bf0;
        }

        .calc-result {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          max-width: 640px;
        }

        .calc-result h3 {
          margin: 0 0 16px 0;
          font-size: 15px;
          color: var(--text);
        }

        .calc-result-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 8px 0;
          font-size: 14px;
          color: var(--text);
        }

        .calc-result-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: -6px;
          padding-bottom: 4px;
        }

        .calc-result-row.subtotal {
          border-top: 1px dashed var(--border);
          margin-top: 4px;
          font-weight: 600;
        }

        .calc-result-row.total {
          border-top: 2px solid var(--border);
          margin-top: 10px;
          padding-top: 14px;
          font-size: 16px;
          font-weight: 700;
        }

        .calc-reference {
          margin-top: 32px;
        }

        .calc-reference h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: var(--text);
        }

        .calc-tier-active {
          background: rgba(91, 155, 240, 0.12);
        }

        .calc-footnote {
          margin-top: 10px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
      `}</style>
    </Layout>
  );
}
