import { useState } from "react";
import Layout from "@/components/Layout";
import { Star } from "lucide-react";

type TabKey = "인건비" | "물건비" | "경상이전" | "자본지출" | "보전·반환";

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  content: React.ReactNode;
}

const StarredSubtitle = ({ children }: { children: React.ReactNode }) => (
  <>
    <Star size={11} style={{ display: "inline", verticalAlign: "-1px", fill: "currentColor" }} />{" "}
    {children}
  </>
);

const TABS: { key: TabKey; label: string; description: string }[] = [
  { key: "인건비", label: "인건비(100)", description: "소속 직원의 급여 및 수당, 기간제 인부임 산정 탭" },
  { key: "물건비", label: "물건비(200)", description: "부서 운영 소모품비, 수당, 여비 및 행사 경비 탭" },
  { key: "경상이전", label: "경상이전(300)", description: "민간 지원금, 사회복지 수혜금 및 민간 위탁금 탭" },
  { key: "자본지출", label: "자본지출(400)", description: "토지 매입, 자산 취득 및 주요 시설공사 예산 탭" },
  { key: "보전·반환", label: "보전·반환(600,800)", description: "차입금 상환 및 국고보조금 정산 잔액 반납 탭" },
];

const ACCORDION_DATA: Record<TabKey, AccordionItem[]> = {
  인건비: [
    {
      id: "101-01",
      title: "101-01. 보수 (공무원)",
      content: (
        <div className="detail-content">
          <h3>지방공무원 보수 편성 기준</h3>
          <div className="content-section">
            <h4>📌 편성 정원 기준</h4>
            <p>2026년 8월 31일 기준 정원 또는 현원 반영</p>
          </div>
          <div className="content-section">
            <h4>📌 적용 단가 기준</h4>
            <p>2026년도 공무원 봉급표 기준</p>
          </div>
          <div className="content-section">
            <h4>📌 법정 수당 요율표</h4>
            <ul>
              <li><strong>대우공무원수당:</strong> 월봉급액의 4.1%</li>
              <li><strong>관리업무수당:</strong> 월봉급액의 9%</li>
              <li><strong>정액급식비:</strong> 월 160,000원</li>
              <li><strong>명절휴가비:</strong> 월봉급액의 120% (설날 60%, 추석 60% 분할 지급)</li>
              <li><strong>시간외근무수당:</strong> 월 35시간 기준 편성 (실제 지급은 월 57시간 한도 실비 지급)</li>
              <li><strong>연가보상비:</strong> 연 10일 기준 편성 (지급 기준은 최대 20일 범위 내)</li>
              <li><strong>직급보조비:</strong> 행안부 수당규정 별표 14 지급 구분 적용</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "101-03",
      title: "101-03. 공무직근로자보수",
      content: (
        <div className="detail-content">
          <h3>공무직(무기계약) 근로자 보수 편성 기준</h3>
          <div className="content-section">
            <h4>📌 급여 단가</h4>
            <p>「화성시-화성시공무직노동조합 임금협약」 단가 엄격 준수</p>
          </div>
          <div className="content-section">
            <h4>📌 명절휴가비</h4>
            <ul>
              <li>기본급의 120% 편성</li>
              <li>설·추석 각 60% 분할 지급</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 실무 필수 규칙</h4>
            <ul>
              <li>공무직 여비: 공무원과 동일하게 국내여비(202-01) 목에 통합 요구</li>
              <li>현업 공무직 피복비: 인건비가 아닌 사무관리비(201-01) 일반운영비에 요구</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "101-04",
      title: "101-04. 기간제근로자등 보수",
      content: (
        <div className="detail-content">
          <h3>기간제근로자등 보수 편성 기준</h3>
          <div className="content-section">
            <h4>📌 1. 인건비</h4>
            <ul>
              <li><strong>예산 과목 (통계목):</strong> 101-04 기간제근로자등 보수 (개별 정책사업에 포함하여 요구)</li>
              <li><strong>관할 및 주관 부서:</strong> 행정지원과 공공노무팀</li>
              <li><strong>근거 규정:</strong> 「화성시 기간제 및 단시간근로자 관리 규정」 제6조 및 「공공부문 비정규직 처우개선 대책 및 가이드라인」</li>
              <li><strong>사전 승인 의무:</strong> 기간제 및 단시간근로자 보수 예산을 요구하기 전에 반드시 공공노무팀으로부터 채용 적정성 심사를 받아서 정수 승인을 얻어야 예산편성이 가능합니다.</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 2. 기간제근로자 인건비 구성요소 및 표준 산출식</h4>
            <p>예산 요구 시 인건비 항목은 기본급, 주휴수당, 연차수당, 4대 보험료, 공정수당으로 구별하여 요구합니다.</p>
            <div style={{ marginTop: "12px" }}>
              <strong>① 기본급 · 주휴수당 · 연차수당</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>기본급: 일일단가(원) × 인원(명) × 근로일수(일)</li>
                <li>주휴수당: 일일단가(원) × 인원(명) × 휴일일수(일) (일요일 및 근로자의 날)</li>
                <li>연차수당: 일일단가(원) × 인원(명) × 미사용 연차 일수(일)</li>
                <li style={{ marginTop: "8px" }}>
                  <strong>표준 산출식:</strong>{" "}
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>기준단가(원) × 인원(명) × 근무일수(일)</code>
                </li>
                <li style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px", color: "var(--text-muted)" }}>월 평균 기준일수(주휴일 포함): <strong>월 27일</strong> 적용</li>
                <li style={{ marginLeft: "20px", fontSize: "13px", color: "var(--text-muted)" }}>(예시) 6개월 고용 시 근무일수: 27일 × 6개월 = 162일 적용</li>
                <li style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px", color: "var(--text-muted)" }}>(예시) 생활임금 적용 직종 기본급: <strong>일급 102,000원</strong> × 1명 × 162일 = 16,524,000원</li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>② 4대 보험료 (기관 부담금)</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>
                  표준 산출식:{" "}
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>임금 총액(원) × 12% (또는 11.75%, 원 단위까지 정확히 입력)</code>
                </li>
                <li style={{ fontSize: "13px", color: "var(--text-muted)" }}>(참고) 국민연금 사업주 공제부담 비율이 4.75%에서 5%로 인상 반영되었습니다.</li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>③ 공정수당</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>
                  표준 산출식:{" "}
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>기간제근로자 인원수(명) × 구간별 보상지급액(원)</code>
                </li>
                <li style={{ fontSize: "13px", color: "var(--text-muted)" }}>(참고) 보상지급액은 당해 연도 화성시 생활임금 확정 고시 후 산정 적용됩니다.</li>
              </ul>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 3. 직종별 단가 적용 기준</h4>
            <p>기간제근로자의 일일 단가는 수행하는 업무 직종에 따라 <strong>생활임금 적용 직종</strong>과 <strong>최저임금 상승률 차등 적용 직종</strong>으로 분리됩니다.</p>
            <div style={{ marginTop: "12px" }}>
              <strong>생활임금 적용 직종</strong>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>화성시 노사협력과에서 확정 고시하는 생활임금 단가를 적용합니다.</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}><em>해당 직종:</em> 행정실무원, 연구실무원, 도서실무원, 관제실무원, 농림실무원, 조리실무원, 경비실무원, 환경정비원, 대민종사원 등</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>최저임금 상승률 차등 적용 직종</strong>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>생활임금 초과 직종으로서 전년 대비 최저임금 상승률 등을 감안한 차등 단가표를 적용합니다.</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}><em>해당 직종:</em> 사례관리실무원, 상담실무원, 조사실무원, 요양보호실무원, 기계실무원, 보건의료보조원, 보건의료실무원, 시설물관리원, 건설실무원 등</p>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 2027년도 직종별 적용 단가</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(118, 157, 194, 0.15)", borderBottom: "2px solid rgba(118, 157, 194, 0.3)" }}>
                  <th style={{ padding: "8px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.2)" }}>직종 명칭</th>
                  <th style={{ padding: "8px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.2)" }}>2027년 단가 기준</th>
                  <th style={{ padding: "8px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.2)" }}>2026년 단가</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>행정/도서/농림/환경정비원 등</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 102,000<br/>(시급 12,750)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 93,170</td>
                  <td style={{ padding: "8px" }}>화성시 생활임금 우선 적용</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>사례관리/상담/조사원 등</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 103,680<br/>(시급 12,960)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 100,000</td>
                  <td style={{ padding: "8px" }}>해당 업무 전담 임금 적용</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>기계실무원, 시설물관리원</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 108,960<br/>(시급 13,620)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 105,120</td>
                  <td style={{ padding: "8px" }}>차량운전, 시설 보수 등</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>보건의료보조원 (간호조무사)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 112,560<br/>(시급 14,070)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 108,560</td>
                  <td style={{ padding: "8px" }}>보건소 보조원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>보건의료실무원 (임상병리사, 간호사)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 128,840<br/>(시급 16,100)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 124,240</td>
                  <td style={{ padding: "8px" }}>대체인력 일급 15만원 적용</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>건설실무원 (도로보수, 수거 등)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 161,920<br/>(시급 20,240)</td>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 156,160</td>
                  <td style={{ padding: "8px" }}>건설기계 운전 등 포함</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ],
  물건비: [
    {
      id: "201-01",
      title: "201-01. 사무관리비",
      content: (
        <div className="detail-content">
          <h3>사무관리비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 통상 업무 기본 경비 배분 기준</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>일반수용비 (정원 기준)</strong>
              <p>부서 소모품비, 피복비, 도서구입비, 범용 S/W 구입비, 장비 임차료 등.</p>
              <ul style={{ marginLeft: "20px" }}>
                <li>배분 한도: 공무원 정원 1인당 연 750,000원 (2026. 10. 기준 정원 적용)</li>
                <li>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>750,000원 × 부서 공무원 정원(명) = 총요구액(원)</code></li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>급식비 (특근매식비)</strong>
              <p>통상 업무 수행을 위한 급식비.</p>
              <ul style={{ marginLeft: "20px" }}>
                <li>배분 한도: 공무원 정원 1인당 연 600,000원 (인허가 등 격무·기피 가점 부서도 동일 단가 적용하되 정책사업으로 편성 가능)</li>
                <li>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>600,000원 × 부서 공무원 정원(명) = 총요구액(원)</code></li>
              </ul>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 인원 적용 기준</h4>
            <ul>
              <li><strong>인원 적용 기준일:</strong> 2026년 10월 1일 기준의 인력을 정밀하게 반영</li>
              <li><strong>대상 인원 범위:</strong> 소속 정규직 공무원 외에 비정규직 전체를 누락 없이 포함
                <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                  <li>정원 기준 반영: 공무원, 공무직(무기계약직), 청원경찰</li>
                  <li>정수 승인 기준 반영: 기간제근로자</li>
                  <li>현원 기준 반영: 임기제공무원(정원관리 규정 외), 파견자 등</li>
                </ul>
              </li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 위원회 수당 및 법정 당직비 기준</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>위원회 참석수당</strong>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>법령 및 조례 등에 의해 설치된 위원회의 심의 참석 수당 (단, 개별 조례에 따로 단가가 명시된 경우는 조례 단가 우선 적용)</p>
              <ul style={{ marginLeft: "20px" }}>
                <li><strong>대면 심의 수당:</strong> 1회당 100,000원 (회의 시간이 2시간을 초과할 경우 50,000원 추가 지급 가능)
                  <div style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>100,000원(또는 150,000원) × 참석 위원 수(명) × 회의 횟수(회)</code></div>
                </li>
                <li><strong>서면 심의 수당:</strong> 1회당 50,000원
                  <div style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>50,000원 × 심의 위원 수(명) × 심의 횟수(회)</code></div>
                </li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>일·숙직 수당</strong>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>「화성시 지방공무원 당직 및 비상근무 규칙」에 따라 당직근무 명령을 받고 근무하는 자에게 지급하는 수당</p>
              <ul style={{ marginLeft: "20px" }}>
                <li>일직 및 숙직 근무: 1회당 60,000원</li>
                <li>재택 당직근무: 1회당 30,000원</li>
                <li style={{ marginTop: "8px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>60,000원(또는 30,000원) × 근무 인원(명) × 365일</code></li>
              </ul>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 현업직종 피복비 기준</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>청원경찰 피복비</strong>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>연간 총 266,000원 범위 내 반영</p>
              <p style={{ fontSize: "13px", marginLeft: "20px", color: "var(--text-muted)" }}>산출 세부 내역: 근무복 상의 50,000원 × 2회 + 근무복 하의 104,000원 + 단화 62,000원</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>환경미화원 피복비</strong>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>연간 총 700,000원 범위 내 반영</p>
              <p style={{ fontSize: "13px", marginLeft: "20px", color: "var(--text-muted)" }}>산출 세부 내역: 상·하복 500,000원 + 안전장구(안전화 등) 200,000원</p>
              <p style={{ fontSize: "13px", marginLeft: "20px", color: "#e67e22" }}>※ 방역·조리·도로보수 등 기타 현업직종은 부서 요구 시 예산재정과 별도 검토</p>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 행사 지원 차출 및 특수 매식비 기준</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>행사 차출 공무원 지급경비</strong>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>시 주관 행사·축제 지원을 위해 공무원이 휴일 근무를 하는 경우 지급하는 실비보상 경비 (반드시 201-01 사무관리비로만 편성해야 하며, 동일 근무시간에 대한 시간외수당 및 관리업무수당 중복 지급은 절대 불가함)</p>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>반일 (4시간 이하) 차출: 60,000원</li>
                <li>1일 상한 (4시간 초과) 차출: 120,000원 범위 내에서 실제 근무시간에 비례하여 지급</li>
              </ul>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>출동 매식비</strong>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>화재·구급 현장 출동 소방공무원에 대한 매식비 및 출동간식비 지원 (단, 훈련출동 시 간식비 미지급 준수)</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>구내식당 운영비</strong>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>자치단체 조례에 근거하여 구내식당이 후생복지시설에 포함되고 명시적 지원 근거가 규정된 경우에 한하여, 주·부식대 및 연료비 등 구내식당 운영 경비를 예산으로 편성 가능</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "201-02",
      title: "201-02. 공공운영비",
      content: (
        <div className="detail-content">
          <h3>공공운영비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 공공요금 및 제세공과금 범위</h4>
            <ul>
              <li>우편물 발송대, 전보료 및 통신료, 회선사용료</li>
              <li>전기료, 가스료, 상·하수도료, 오물수거료, 자동차세 등 법령 및 조례에 의하여 지불하는 제세금</li>
              <li>법령 또는 협약에 따라 자치단체가 의무적으로 지불해야 하는 각종 협회비 및 국내 부담금
                <ul style={{ marginLeft: "20px", marginTop: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                  <li>대상 부담금 예시: 한국지역정보개발원 분담금, 전국적 협의체 부담금, 소방안전협회비, 전기안전협회비, 한국상·하수도협회비, 한국폐기물협회비 등</li>
                </ul>
              </li>
              <li>공제 및 보험계약에 의한 해상·화재·손해·차량 보험료, 배상공제료, 공무원책임보험료</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 시설장비유지비 관리 규칙</h4>
            <ul>
              <li><strong>적용 범위:</strong> 건물 및 건축설비(구축물, 기계장비), 공구, 기구, 비품, 통신시설 등의 정기적인 유지관리 비용 및 용역 위탁비</li>
              <li><strong>자본지출 분리 규칙 (★ 중요):</strong>
                <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                  <li>청사 건물의 대규모 도장공사비나 건물의 가치를 증가시키고 내용연수를 현저히 증가시키는 대규모 수리비는 공공운영비가 아닌 401-02 시설비 과목으로 분리하여 계상</li>
                  <li>당해 연도에 새로 구입한 신규 전기·기계·통신장비에 대한 유지관리비는 무상 A/S 기간을 감안하여 예산을 계상하지 않는 것을 원칙</li>
                </ul>
              </li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 차량·선박비 및 공무원 의료비</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>차량·선박비</strong>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>관용 차량 유류대, 차량 정비유지비 및 차량 소모품비 (※ 구체적인 차량관련 경비는 재산관리과 공용차량관리팀의 별도 통보 기준을 우선 적용함)</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>공무원 대상 의료비</strong>
              <p style={{ fontSize: "13px", marginTop: "8px" }}>의무실·양호실용 의약품 및 소모성 의료기구 구입비, 공무원 공상치료비 등</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "201-03",
      title: "201-03. 행사운영비",
      content: (
        <div className="detail-content">
          <h3>행사운영비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 행사운영비 적용 범위 및 포함 경비</h4>
            <ul>
              <li>행사운영을 위한 일체의 일반운영비 (초청장, 홍보유인물, 현수막, 상패 제작비 등 각종 일반수용비)</li>
              <li>행사 개최를 위해 일시적으로 동원되는 각종 시설물·장비·물품의 임차료</li>
              <li>행사 지원을 위한 외래 강사의 강사료 및 수당</li>
              <li><strong>민간 용역 대행 허용:</strong> 자치단체가 추진하는 행사 중 전문성이 극히 요구되고 내용이 복잡·다양하여 직접 집행이 곤란한 행사의 경우 민간 용역으로 일괄 대행이 가능 (단, 합리적인 산출기준을 사전에 수립하여 예산을 편성해야 함)</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 [★ 2027년 전격 개정] 행사관련 시설비의 통폐합 이관</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>개정 조치</strong>
              <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--text-muted)" }}>기존에 자본지출(401-04 행사관련시설비)로 편성되던 행사장 내 각종 시설 및 장치 설치비 통계목이 자본 형성적 성격에 부합하지 않아 전격 폐지되었습니다.</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>실무 규칙</strong>
              <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--text-muted)" }}>행사장 개최를 위해 임시적으로 가설하는 무대, 텐트, 가설 구조물 등의 임시적·일회성 시설물 설치 및 구축 경비 일체는 모두 201-03 행사운영비 통계목으로 일괄 편성하여 요구해야 합니다.</p>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 행사운영비 편성 제한 (주의)</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>부서 연찬회 경비 편성 절대 금지</strong>
              <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--text-muted)" }}>부서 워크숍이나 연찬회 관련 경비는 행사운영비 목으로 요구할 수 없습니다.</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>우회 편성 요령</strong>
              <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--text-muted)" }}>부서 연찬회는 부서 내부 사전 방침 결재를 득한 뒤, 성격에 맞추어 사무관리비(201-01), 국내여비(202-01), 부서운영업무추진비(203-04) 등으로 나누어 정상 요구하여야 합니다.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "202-01",
      title: "202-01. 국내여비",
      content: (
        <div className="detail-content">
          <h3>국내여비 산정 표준</h3>
          <div className="content-section">
            <h4>📌 통폐합 규칙</h4>
            <ul>
              <li><strong>기존 통계목 삭제:</strong> 월액여비(202-02) 및 국제화여비(202-04) 통계목이 삭제됨</li>
              <li><strong>단일화:</strong> 국내여비(202-01) 하나로 대폭 간소화</li>
              <li><strong>실무 적용:</strong> 일상적인 관내·외 출장비는 물론, 상시출장자에게 지급하는 월액여비까지 모두 '국내여비(202-01)' 통계목 하위에 산출기초(부기)를 나누어 함께 작성해야 함</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 세부 항목별 표준 산출식 및 작성 요령</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>① 일상업무 추진 관내여비 (현원 기준)</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px", fontSize: "13px" }}>
                <li><strong>지침 기준:</strong> 기본 관내출장비로, 월 9일을 기준(1일 20,000원)으로 정률 편성하되 지급은 실제 출장일수에 맞춰 실비로 지급</li>
                <li><strong>기준 인원 주의:</strong> 부서 '정원'이 아닌 2026년 10월 기준 <strong>'공무원 현원(임기제공무원 포함)'</strong>을 기준으로 계산해야 함</li>
                <li style={{ marginTop: "8px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>20,000원 × 공무원 현원(명) × 9일 × 12월 = 총요구액(원)</code></li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>② 월액여비 (상시출장자 지정)</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px", fontSize: "13px" }}>
                <li><strong>지침 기준:</strong> 업무 성격상 상시출장을 요하는 공무원 및 공무직에 대하여 월정액으로 지급하는 여비</li>
                <li><strong>필수 선행 절차:</strong> 월액여비를 e호조에 요구하기 전에, 대상자 지정에 대한 부서별 내부검토 결재(방침)를 반드시 선행 완료해야 함</li>
                <li style={{ marginTop: "8px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>225,000원 × 상시출장 지정 대상자 수(명) × 12월 = 총요구액(원)</code></li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>③ 사업추진 관외여비 (정책사업 반영)</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px", fontSize: "13px" }}>
                <li><strong>지침 기준:</strong> 부서 기본경비 외에 개별 정책 사업(예: 워크숍 참가, 특정 사업 현장 점검 등) 수행을 위해 별도로 요구하는 관외 출장 여비</li>
                <li style={{ marginTop: "8px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>20,000원 × 출장 인원(명) × 출장 일수(일) × 출장 횟수(회) = 총요구액(원)</code></li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "202-02",
      title: "202-02. 국외업무여비",
      content: (
        <div className="detail-content">
          <h3>국외업무여비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 신설 배경</h4>
            <ul>
              <li><strong>기존의 비어있던 202-02 코드:</strong> '국외업무여비'로 대체되어 새롭게 신설</li>
              <li><strong>실무 적용:</strong> 특정 업무 수행(공사 검수, 바이어 미팅, 특정물품 구매, 조사·확인, MOU 체결 등)이나 국제회의·행사 참석 목적의 국외 출장, 그리고 공무원이 아닌 자(청원경찰 등)의 국외 여비는 반드시 이 '국외업무여비(202-02)'로 요구해야 함</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 [업무수행 국외출장]</h4>
            <ul>
              <li><strong>기준:</strong> 조사·확인·점검·물품구매 검사, MOU 체결 등 특정업무 및 국제회의 참석</li>
              <li style={{ marginTop: "8px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>공무원 여비 규정 단가(원) × 출장 인원(명) × 출장 일수(일) = 총요구액(원)</code></li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 [공무원이 아닌 자의 국외여비]</h4>
            <ul>
              <li><strong>기준:</strong> 소속 청원경찰 등 공무원이 아닌 자가 업무상 국외 출장을 동행 또는 수행할 때의 여비</li>
              <li style={{ marginTop: "8px" }}>표준 산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>여비 규정 준용 단가(원) × 대상 인원(명) × 출장 일수(일) = 총요구액(원)</code></li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 "사무관리비 이중 배정" 절대 원칙</h4>
            <div style={{ marginTop: "12px", backgroundColor: "rgba(230, 126, 34, 0.1)", padding: "12px", borderRadius: "4px", borderLeft: "3px solid #e67e22" }}>
              <strong style={{ color: "#e67e22" }}>⚠️ 현지 차량 임차료 및 통역비 분리 규칙</strong>
              <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--text-muted)" }}>해외 출장에 소요되는 부대비용 중 현지 차량 임차료와 통역비는 세출 성격상 여비(202) 목에 포함할 수 없으며, 반드시 사무관리비(201-01)로 분리하여 요구해야 함</p>
              <div style={{ marginTop: "12px" }}>
                <strong style={{ fontSize: "13px", color: "#e67e22" }}>기준</strong>
                <p style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-muted)" }}>현지 수준 및 물가 등을 고려하여 실비 수준으로 별도 산출</p>
              </div>
              <div style={{ marginTop: "8px" }}>
                <strong style={{ fontSize: "13px", color: "#e67e22" }}>e호조 요구 경로</strong>
                <p style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-muted)" }}>201-01(사무관리비) 과목 하위에 별도 부기 입력</p>
              </div>
              <div style={{ marginTop: "8px" }}>
                <strong style={{ fontSize: "13px", color: "#e67e22" }}>표준 산출식</strong>
                <div style={{ marginTop: "4px", fontSize: "12px" }}>
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>현지 차량 임차 단가(원) × 임차 일수(일) = 차량 임차비 요구액(원)</code>
                  <div style={{ marginTop: "4px" }}><code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>통역 수당 단가(원) × 통역 횟수 또는 일수 = 통역비 요구액(원)</code></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "203",
      title: "203. 업무추진비",
      content: (
        <div className="detail-content">
          <h3>업무추진비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 203-01. 기관운영업무추진비 (Agency Operating Expenses)</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>각급 기관의 장과 보조기관의 원활한 기관 운영을 위한 경비</p>
            <ul style={{ marginTop: "8px", fontSize: "13px" }}>
              <li><strong>편성 대상:</strong> 4급 이상 및 읍·면·동장 범위 내에서 편성</li>
              <li><strong>5급 제한:</strong> 본청의 국장급 보조기관, 소속기관의 장, 합의제행정기관의 장, 의회사무기구의 장으로 제한 적용</li>
              <li><strong>한도액:</strong> 예산부서에서 별도로 수립하여 통보하는 기준을 적용</li>
              <li style={{ marginTop: "8px" }}><strong>실무 준수 철칙:</strong>
                <ul style={{ marginLeft: "20px", marginTop: "4px" }}>
                  <li>개인적인 용도의 사용은 절대 금지, 월정액 형태의 정기 지급은 불가</li>
                  <li>「지방자치단체의 행정기구와 정원기준 등에 관한 규정」을 위반하여 임의로 설치한 기구 및 직위에 대해서는 예산을 요구할 수 없음</li>
                </ul>
              </li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 203-02. 정원가산업무추진비 (Staff-proportional Operating Expenses)</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>소속 직원의 사기진작, 격려, 동호회 지원 등을 위해 정원에 가산하여 지원하는 경비</p>
            <div style={{ marginTop: "12px" }}>
              <strong>기준 단가 (정원 구간별 누적 합산)</strong>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(118, 157, 194, 0.15)", borderBottom: "1px solid rgba(118, 157, 194, 0.2)" }}>
                    <th style={{ padding: "6px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>본청 및 의회사무기구</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>출장소, 사업소, 구청, 읍·면·동</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>100명까지: 1인당 80,000원<br/>101~300명: 1인당 60,000원<br/>301~600명: 1인당 45,000원<br/>601~800명: 1인당 30,000원<br/>801명 이상: 1인당 15,000원</td>
                    <td style={{ padding: "6px" }}>100명까지: 1인당 40,000원<br/>101~400명: 1인당 30,000원<br/>401~1,000명: 1인당 25,000원<br/>1,000명 이상: 1인당 20,000원</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong style={{ fontSize: "14px" }}>🧮 표준 산출식</strong>
              <div style={{ marginTop: "10px", backgroundColor: "rgba(91, 155, 240, 0.2)", border: "2px solid #5b9bf0", padding: "14px 16px", borderRadius: "6px", fontFamily: "monospace", fontWeight: "500", fontSize: "13px", lineHeight: "1.7", color: "var(--text)" }}>
                부서 대상 인원이 본청 소속 120명인 경우: (100명 × 80,000원) + (20명 × 60,000원) = 9,200,000원
              </div>
              <div style={{ marginTop: "8px", backgroundColor: "rgba(91, 155, 240, 0.2)", border: "2px solid #5b9bf0", padding: "14px 16px", borderRadius: "6px", fontFamily: "monospace", fontWeight: "500", fontSize: "13px", lineHeight: "1.7", color: "var(--text)" }}>
                부서 대상 인원이 사업소 소속 150명인 경우: (100명 × 40,000원) + (50명 × 30,000원) = 5,500,000원
              </div>
            </div>
          </div>
          <div className="content-section">
            <h4>📌 203-03. 시책추진업무추진비 (Policy Promotion Expenses)</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>자치단체의 주요 시책 사업 추진, 대외 행사, 고유 업무 수행 시 소요되는 경비</p>
            <ul style={{ marginTop: "8px", fontSize: "13px" }}>
              <li><strong>편성 방법:</strong> 지방자치단체별로 책정된 예산편성기준액 상한액(일반회계 및 기타특별회계를 합산한 전체 상한액) 범위 내에서만 요구 가능</li>
              <li><strong>성격:</strong> 부서 기본경비 성격이 아니므로, 반드시 관련 목적에 해당하는 개별 구체적인 정책 사업에 포함하여 요구해야 함</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 203-04. 부서운영업무추진비 (Department Operating Expenses)</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>통상적인 실·과 조직 운영에 필수적으로 소요되는 다과 경비 등 제잡비</p>
            <div style={{ marginTop: "12px" }}>
              <strong>부서 정원별 월정 기준</strong>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "12px" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(118, 157, 194, 0.15)", borderBottom: "1px solid rgba(118, 157, 194, 0.2)" }}>
                    <th style={{ padding: "6px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>부서 정원</th>
                    <th style={{ padding: "6px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 기준 요율</th>
                    <th style={{ padding: "6px", textAlign: "left" }}>연간 편성 한도액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>5인 이하</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 100,000원</td>
                    <td style={{ padding: "6px" }}>1,200,000원</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>6~10인</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 175,000원</td>
                    <td style={{ padding: "6px" }}>2,100,000원</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>11~15인</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 250,000원</td>
                    <td style={{ padding: "6px" }}>3,000,000원</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>16~20인</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 300,000원</td>
                    <td style={{ padding: "6px" }}>3,600,000원</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>21~25인</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 350,000원</td>
                    <td style={{ padding: "6px" }}>4,200,000원</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>26~30인</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 400,000원</td>
                    <td style={{ padding: "6px" }}>4,800,000원</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>31인 이상</td>
                    <td style={{ padding: "6px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>월 400,000원 + 30인 초과 1인당 월 5,000원</td>
                    <td style={{ padding: "6px" }}>하단 산출식 참조</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong style={{ fontSize: "14px" }}>🧮 표준 산출식</strong>
              <div style={{ marginTop: "10px", backgroundColor: "rgba(91, 155, 240, 0.2)", border: "2px solid #5b9bf0", padding: "14px 16px", borderRadius: "6px", fontFamily: "monospace", fontWeight: "500", fontSize: "13px", lineHeight: "1.7", color: "var(--text)" }}>
                30인 이하 부서 (예: 정원 18명): 300,000원 × 12월 = 3,600,000원
              </div>
              <div style={{ marginTop: "8px", backgroundColor: "rgba(91, 155, 240, 0.2)", border: "2px solid #5b9bf0", padding: "14px 16px", borderRadius: "6px", fontFamily: "monospace", fontWeight: "500", fontSize: "13px", lineHeight: "1.7", color: "var(--text)" }}>
                31인 이상 부서 (예: 정원 35명): [400,000원 + (5명 × 5,000원)] × 12월 = 5,100,000원
              </div>
            </div>
            <div style={{ marginTop: "12px", backgroundColor: "rgba(230, 126, 34, 0.1)", padding: "8px", borderRadius: "4px", borderLeft: "3px solid #e67e22" }}>
              <strong style={{ fontSize: "13px", color: "#e67e22" }}>실무 예외 조항</strong>
              <p style={{ fontSize: "12px", marginTop: "4px", color: "var(--text-muted)" }}>실·과 단위 소속이지만 실제 근무지가 다른 지역(예: 파견, 관외 현장 사무소 등)으로 이원화되어 운영되는 경우, 인원수에 맞게 예산을 분할하여 분할 요구 및 집행이 가능</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "204-03",
      title: "204-03. 특정업무경비",
      content: (
        <div className="detail-content">
          <h3>특정업무경비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 기본 활동비</h4>
            <ul>
              <li><strong>대민활동비:</strong> 월 50,000원 (6급 이하 정규직 및 청원경찰)</li>
              <li><strong>특별사법경찰관 수사활동비:</strong> 월 200,000원 (특사경 지명을 받은 실무 과장 및 담당자)</li>
              <li><strong>아동학대대응활동비:</strong> 월 100,000원 <em>(기존 5만 원에서 2배 인상, 대민활동비와 중복 수령 가능)</em></li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 분야별 활동비</h4>
            <ul>
              <li><strong>세무활동비 / 예산활동비:</strong> 월 150,000원</li>
              <li><strong>재난·안전 활동비:</strong> 월 80,000원 (수당 규정상 재난안전 대상자)</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>📌 선택항목 (지자체 설정)</h4>
            <ul>
              <li>감사담당: 월 80,000원</li>
              <li>여론·동향: 월 100,000원</li>
              <li>공무원단체담당: 월 60,000원</li>
            </ul>
          </div>
        </div>
      ),
    },
  ],
  경상이전: [
    {
      id: "301-01",
      title: "301-01. 사회보장적수혜금",
      content: (
        <div className="detail-content">
          <h3>사회보장적수혜금 편성 기준</h3>
          <div className="content-section">
            <h4>📌 기본 정의</h4>
            <p>사회보장 또는 사회복지 증진 정책에 따라 취약 계층, 아동, 장애인 등 수혜자에게 현금이나 현물로 직접 지원하는 보상 경비입니다.</p>
          </div>
          <div className="content-section">
            <h4>📌 2027년 핵심 개정</h4>
            <p>기존에 재원에 따라 분리되어 있던 3개 통계목(국고보조재원 301-01, 취약계층지방재원 301-02, 지방재원 301-03)이 <strong>사회보장적수혜금(301-01) 단일 통계목</strong>으로 통합 정비되었습니다. 현금성 복지경비 지출에 대한 페널티 제도 폐지 등 국가 정책 여건 변화를 반영한 조치입니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "301-08",
      title: "301-08. 민간인 국외여비",
      content: (
        <div className="detail-content">
          <h3>민간인 국외여비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 기본 정의</h4>
            <p>시의 공식 정책 사업 수행을 위해 학계, 언론, 전문가 등이 자문 목적으로 국외 출장을 동행할 때 지급하는 여비입니다.</p>
          </div>
          <div className="content-section">
            <h4>📌 2027년 핵심 개정</h4>
            <p>사업 수행 목적과 직접적인 관계가 없는 민간인(지역 이·통장, 지역 학생 등)을 대상으로 지원하던 관행적인 해외연수 및 포상성 여비 목적의 편성이 <strong>전면 금지</strong>됩니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "301-09",
      title: "301-09. 행사실비 지원금",
      content: (
        <div className="detail-content">
          <h3>행사실비 지원금 편성 기준</h3>
          <div className="content-section">
            <h4>📌 기본 정의</h4>
            <p>시가 주관하는 각종 행사나 교육 등에 참여하는 <strong>민간인에게 지급하는 실비 성격의 경비 및 사례금</strong>을 처리합니다.</p>
          </div>
          <div className="content-section">
            <h4>📌 적용 범위</h4>
            <ul>
              <li><strong>민간인 실비 보상:</strong> 시가 주관하는 교육, 세미나, 공청회, 회의, 훈련 등에 참석하는 민간인에게 지급하는 급식비(매식비 1식 9천 원 이내) 및 교통비</li>
              <li><strong>출연자·발표자 사례금:</strong> 체육행사, 문화제 행사, 세미나·공청회 등의 출연자 및 발표자에게 지급하는 반대급부적 사례금 <em>(※ 단순 참가자에게는 지급 불가)</em></li>
              <li><strong>행사 참석·견학 실비:</strong> 국가(지방) 단위 행사 참석 및 산업시찰·견학·참여를 위해 소요되는 실비</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "301-14",
      title: "301-14. 기타보상금 (자원봉사 실비)",
      content: (
        <div className="detail-content">
          <h3>자원봉사자 실비보상 기준</h3>
          <div className="content-section">
            <h4>📌 적용 대상</h4>
            <p>시 주관 프로그램 참여 자원봉사자 대상 (1일 4시간 이상 활동 시 적용)</p>
          </div>
          <div className="content-section">
            <h4>📌 실비보상 단가</h4>
            <ul>
              <li><strong>교통비:</strong> 1일 4,000원 이내</li>
              <li><strong>급식비:</strong> 1일 10,000원 이내</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "304-04",
      title: "304-04. 보험료 부담금 등",
      content: (
        <div className="detail-content">
          <h3>보험료 부담금 등 편성 기준</h3>
          <div className="content-section">
            <h4>📌 기본 정의</h4>
            <p>자치단체가 고용한 소속 근로자의 4대 사회보험 기관 부담금 및 법정 퇴직금입니다.</p>
          </div>
          <div className="content-section">
            <h4>📌 2027년 핵심 개정</h4>
            <p>기존 '공무직근로자 보험료 부담금 등'에서 <strong>보험료 부담금 등(304-04)</strong>으로 명칭이 개정되었으며, 적용 대상에 <strong>청원경찰의 고용보험 부담금</strong> 편성 규정이 명시적으로 추가되었습니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "307",
      title: "307. 민간 이전",
      subtitle: "민간보조·위탁금·사회복지 보조 8개 통계목",
      content: (
        <div className="detail-content">
          <h3>307. 민간 이전</h3>
          <div className="code-grid">
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-02</span>
                <span className="code-card-name">민간경상사업보조</span>
              </div>
              <p className="code-card-body">민간이 추진하는 공익 사업을 권장하기 위한 경상 사업비</p>
              <p className="code-card-note">단체 자체 운영비와 섞어서 지원 불가 · 제3자 재위탁 금지</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-03</span>
                <span className="code-card-name">민간단체 법정운영비보조</span>
              </div>
              <p className="code-card-body">명시적 법령 근거가 있는 단체에 한해 기본 업무수행에 필요한 인건비·사무관리비·임차료 지원</p>
              <p className="code-card-note">포괄적 총액 지원 금지</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-04</span>
                <span className="code-card-name">민간행사사업보조</span>
              </div>
              <p className="code-card-body">민간 주관 행사를 권장하기 위한 보조금. 임시 무대·부스 등 가설물 설치비 포함 가능</p>
              <p className="code-card-note">시가 직접 주관하는 행사를 우회 편성하는 것은 금지</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-05</span>
                <span className="code-card-name">민간위탁금</span>
              </div>
              <p className="code-card-body">자치단체 사무를 민간에 위탁·대행할 때 소요되는 경상 경비</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-08</span>
                <span className="code-card-name">이차보전금</span>
              </div>
              <p className="code-card-body">특정 목적 자금이 일반 금리보다 낮게 조달되도록 금리 차액을 지원하는 경비</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-09</span>
                <span className="code-card-name">운수업계보조금</span>
              </div>
              <p className="code-card-body">버스·택시·화물자동차 유류세 인상분 보전(유가보조금) 및 비수익 노선 손실 보전</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-10</span>
                <span className="code-card-name">사회복지시설 법정운영비보조</span>
              </div>
              <p className="code-card-body">법령에 명시적 근거가 있는 사회복지시설의 운영비 지원</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">307-11</span>
                <span className="code-card-name">사회복지사업보조</span>
              </div>
              <p className="code-card-body">「사회복지사업법」 등 복지 정책 관련 민간 경상 사업비 지원</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "308",
      title: "308. 자치단체 등 이전",
      subtitle: "자치단체·교육기관·공기관 이전 5개 통계목",
      content: (
        <div className="detail-content">
          <h3>308. 자치단체 등 이전</h3>
          <div className="code-grid">
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">308-01</span>
                <span className="code-card-name">자치단체 경상보조금</span>
              </div>
              <p className="code-card-body">광역(시·도)이 관할 기초(시·군·구)나 타 자치단체에 지급하는 경상 보조금</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">308-07</span>
                <span className="code-card-name">자치단체간부담금</span>
              </div>
              <p className="code-card-body">법령 또는 협약에 따라 지자체 간 상호 공동 부담하는 경비</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">308-08</span>
                <span className="code-card-name">교육기관에 대한 보조</span>
              </div>
              <p className="code-card-body">각급 학교(초·중·고)의 급식, 교육정보화, 시설개선 및 교육과정 운영을 지원하는 보조금</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">308-09</span>
                <span className="code-card-name">지역대학에 대한 경상보조</span>
              </div>
              <p className="code-card-body">「지방대학 및 지역균형인재 육성에 관한 법률」 등에 따른 대학 지원 경상 경비</p>
            </div>
            <div className="code-card code-card-wide">
              <div className="code-card-head">
                <span className="code-card-badge">308-13</span>
                <span className="code-card-name">공기관등에 대한 경상적 위탁사업비</span>
              </div>
              <p className="code-card-body">공기관(한국지역정보개발원 등) 또는 지자체조합에 자본형성적 사업 외의 일반 사업을 위탁·대행할 때 소요되는 제반 경비 및 정부광고료</p>
              <p className="code-card-note">출연기관(도시공사·문화관광재단 등)의 기본 운영경비는 출연금, 특정 사업 대행 경비는 위탁사업비로 철저히 구분 편성</p>
            </div>
          </div>
        </div>
      ),
    },
  ],
  자본지출: [
    {
      id: "401",
      title: "401. 시설비 및 부대비",
      subtitle: <StarredSubtitle>보상비·시설비·감리비·부대비 4종</StarredSubtitle>,
      content: (
        <div className="detail-content">
          <h3>401. 시설비 및 부대비</h3>
          <div className="code-grid">
            <div className="code-card code-card-wide">
              <div className="code-card-head">
                <span className="code-card-badge">401-01</span>
                <span className="code-card-name">시설공사 보상비</span>
                <span className="code-card-tag">2027 신설</span>
              </div>
              <p className="code-card-body">기존 시설비에서 분리 신설된 통계목으로, 토지·지장물 보상과 행정 부대경비를 담습니다.</p>
              <ul className="code-card-list">
                <li>사무실·공장·공원 및 대단위 토목공사에 편입되는 토지 매입 대금</li>
                <li>건물 및 지장물 손실보상금, 영업권·어업권 보상금 및 이전비</li>
                <li>감정·측량수수료, 등기등록비, 농지·개발제한구역 보전부담금 등 행정 부대경비</li>
              </ul>
              <p className="code-card-note">시(市) 공공자산 증가가 실질적으로 수반되는 경우에만 편성 · 보상가격은 감정평가 우선(없을 시 공시지가·유사 실적 참조)</p>
            </div>
            <div className="code-card code-card-wide">
              <div className="code-card-head">
                <span className="code-card-badge">401-02</span>
                <span className="code-card-name">시설비</span>
                <span className="code-card-tag">2027 개정</span>
              </div>
              <ul className="code-card-list">
                <li>기본조사설계비 및 실시설계비, 설계공모비</li>
                <li>실제 도로·하천의 건설 및 개·보수 순공사비</li>
                <li>건물·기계·공작물의 내용연수를 현저히 늘리는 대수선 및 수리비</li>
                <li>문화재 발굴경비, 대형 시설의 안전진단 및 정밀점검 용역비</li>
              </ul>
              <p className="code-card-note">토지매입비 및 대규모 보상비 요구 일체 배제 (모두 보상비 목으로 이관 완료)</p>
              <div className="code-card-steps">
                <span className="code-card-steps-label">단계별 편성 의무 룰 (집행률 관리)</span>
                <ol>
                  <li>사전조사·기본계획 수립 및 설계비(실시설계비 등) 요구</li>
                  <li>설계 완료 시점에 맞추어 토지·용지 매입을 위한 시설공사 보상비 요구</li>
                  <li>보상이 100% 완료된 시점에 한하여 실제 착공을 위한 공사비 요구</li>
                </ol>
              </div>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">401-03</span>
                <span className="code-card-name">감리비</span>
              </div>
              <p className="code-card-body">공사 및 재산 취득에 직접 소요되는 법정 공사 감리비</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">401-04</span>
                <span className="code-card-name">시설부대비</span>
              </div>
              <p className="code-card-body">공사 현장 관리·감독에 직접 소요되는 공공요금, 여비, 수용비, 현장 감독 피복비(명찰·헬멧·장화 등)</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "402",
      title: "402. 민간자본이전",
      subtitle: "민간자본사업보조 · 민간위탁사업비",
      content: (
        <div className="detail-content">
          <h3>402. 민간자본이전</h3>
          <div className="code-grid">
            <div className="code-card code-card-wide">
              <div className="code-card-head">
                <span className="code-card-badge">402-01</span>
                <span className="code-card-name">민간자본사업보조</span>
                <span className="code-card-tag">2027 통합</span>
              </div>
              <p className="code-card-body">민간이 자체 추진하는 자본 형성적 사업(시설물 축조, 대규모 수선, 자본재·고가 장비 도입 등)에 교부하는 <strong>자본 지출 성격의 보조금</strong>입니다.</p>
              <ul className="code-card-list">
                <li><strong>재원구분 통합:</strong> 자체재원·이전재원(국·도비)으로 나뉘던 민간자본 보조가 402-01 단일 통계목으로 통합</li>
                <li><strong>시설 신·증축 및 개보수:</strong> 민간 단체·법인 소유 시설물의 신축, 증축, 개축, 대수선 공사비</li>
                <li><strong>자본재 및 고가 장비:</strong> 내용연수가 다년인 기계장비, 공장 설비, 전문 의료·과학 장비 취득비</li>
                <li><strong>사전 심의:</strong> 예산 요구 전 지방보조금관리위원회 심의 완료·승인된 사업만 반영 가능</li>
                <li><strong>총액한도 관리:</strong> 화성시 민간보조금 총액 한도(2027년 예상 1,094억 원) 내 부서별 배분 준수</li>
              </ul>
              <p className="code-card-note">경상적 경비(인건비·사무실 운영비·소모품·홍보비·여비) 혼합 편성 절대 금지 → 민간경상사업보조(307-02) 등으로 분리 요구</p>
              <p className="code-card-tip">e호조 입력 시에는 하나의 통계목으로 통일하되, 보통교부세 산정 등을 위해 시스템 내부 속성(정보관리사업)에서 재원 구분을 관리합니다.</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">402-02</span>
                <span className="code-card-name">민간위탁사업비</span>
              </div>
              <p className="code-card-body">지자체 사무를 민간에 위탁하여 자본적 성격의 사업(시설물 축조 등 자산 형성이 수반되는 위탁사업)을 수행하게 할 때 소요되는 경비</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "403-404",
      title: "403·404. 자치단체 등 자본이전",
      subtitle: "자치단체·공기관·대학 자본보조 및 공사공단 전출금 5종",
      content: (
        <div className="detail-content">
          <h3>403 · 404. 자치단체 등 자본이전</h3>
          <div className="code-grid">
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">403-01</span>
                <span className="code-card-name">자치단체자본보조</span>
              </div>
              <p className="code-card-body">다른 지방자치단체(시·군·구 등)의 자본 형성적 사업을 지원하기 위해 교부하는 보조금</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">403-02</span>
                <span className="code-card-name">공기관 등에 대한 자본적 위탁사업비</span>
              </div>
              <p className="code-card-body">공사·공단 등 공기관에 자본적 성격의 사업(시설 신·증축 등)을 위탁하여 수행하게 할 때 소요되는 경비</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">403-03</span>
                <span className="code-card-name">예비군육성지원 자본보조</span>
              </div>
              <p className="code-card-body">예비군 육성을 지원하기 위한 시설·장비 등 자본 형성적 지출에 대한 보조금</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">403-04</span>
                <span className="code-card-name">지역대학에 대한 자본보조</span>
              </div>
              <p className="code-card-body">지역 소재 대학의 시설 확충 등 자본 형성적 사업을 지원하기 위해 교부하는 보조금</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">404-01</span>
                <span className="code-card-name">공사·공단 자본전출금</span>
              </div>
              <p className="code-card-body">지방공사·공단의 자본 형성(시설 투자 등)을 지원하기 위해 지자체 예산에서 출연·전출하는 경비</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "405",
      title: "405. 자산및물품취득비",
      content: (
        <div className="detail-content">
          <h3>자산및물품취득비 편성 기준</h3>
          <div className="content-section">
            <h4>📌 정수 배정 사전 승인제</h4>
            <p><strong>주요 정수관리 물품 및 공용차량 임차(1개월 이상)는 예산 요구 전 반드시 물품 부서의 정수 배정 승인을 받아야 요구 등록이 가능</strong>합니다.</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>대표적 정수 물품(59종): 노트북컴퓨터, 에어컨, 빔프로젝터, 디지털캠코더 등</p>
          </div>
          <div className="content-section">
            <h4>📌 2027년도 다기능 사무기기 주요 물품 표준 단가</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(118, 157, 194, 0.15)", borderBottom: "2px solid rgba(118, 157, 194, 0.3)" }}>
                  <th style={{ padding: "8px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.2)" }}>물품명</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>표준 단가</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>컴퓨터(Core i5, 모니터 포함)</td>
                  <td style={{ padding: "8px" }}>1,260,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>노트북컴퓨터(Core i5)</td>
                  <td style={{ padding: "8px" }}>1,500,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>레이저프린터 (A3 컬러)</td>
                  <td style={{ padding: "8px" }}>1,800,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>고속 전자복사기</td>
                  <td style={{ padding: "8px" }}>15,000,000원</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>문서세단기</td>
                  <td style={{ padding: "8px" }}>790,000원</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="content-section">
            <h4>📌 친환경 의무 정책</h4>
            <p>신규 또는 교체로 구매·임차하는 모든 공용차량은 반드시 <strong>친환경차량(저공해자동차 100%)</strong>으로 예산을 반영하여야 합니다.</p>
          </div>
          <div className="content-section">
            <h4>📌 유의 사항</h4>
            <p><strong>사용 중인 비품이 정상 작동함에도 단순 노후·구형이라는 이유만으로 신품 교체 예산을 요구할 수 없습니다.</strong> 고장·파손 등으로 실사용이 불가능하거나 내용연수를 경과한 경우에 한해 교체를 검토합니다.</p>
          </div>
        </div>
      ),
    },
  ],
  "보전·반환": [
    {
      id: "600",
      title: "600. 차입금 상환 및 예치금",
      subtitle: "국내·해외 차입금상환, 일반·의무 예치금 4종",
      content: (
        <div className="detail-content">
          <h3>600. 차입금 상환 및 예치금</h3>
          <div className="code-grid">
            <div className="code-card code-card-wide">
              <div className="code-card-head">
                <span className="code-card-badge">601-01</span>
                <span className="code-card-name">국내차입금상환</span>
                <span className="code-card-tag">2027 통폐합</span>
              </div>
              <p className="code-card-body">상환 기금 종류별로 7개로 쪼개져 있던 국내차입 원금상환 통계목이 601-01 하나로 통폐합되었습니다.</p>
              <ul className="code-card-list">
                <li>지역개발기금 차입금 원금 상환</li>
                <li>금융기관(은행) 차입금 원금 상환</li>
                <li>중앙정부 특별회계 융자금 원금 상환</li>
                <li>지방채증권 원금 상환</li>
              </ul>
              <p className="code-card-note">601(원금상환) 예산은 임의 전용 불가 · 601 ↔ 311(차입금이자상환) 사이에서만 예외적으로 상호 전용 허용</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">601-02</span>
                <span className="code-card-name">해외차입금상환</span>
              </div>
              <p className="code-card-body">외국 정부·국제기구 등으로부터 도입한 차입금의 원금 상환. 국내차입금상환(601-01)과 재원을 구분하여 별도 편성</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">602-01</span>
                <span className="code-card-name">일반예치금</span>
              </div>
              <p className="code-card-body">특별한 목적이나 법령상 의무 없이 여유 자금을 금융기관 등에 예치하는 경비</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">602-02</span>
                <span className="code-card-name">의무예치금</span>
              </div>
              <p className="code-card-body">법령 또는 계약 등에 따라 예치가 의무화된 자금을 예치하는 경비. 일반예치금(602-01)과 구분</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "800",
      title: "800. 예비비 및 반환금",
      subtitle: "일반·재해재난 예비비, 예비금, 국고·시도비 반환금 5종",
      content: (
        <div className="detail-content">
          <h3>800. 예비비 및 반환금</h3>
          <div className="code-grid">
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">801-01</span>
                <span className="code-card-name">일반예비비</span>
              </div>
              <p className="code-card-body">예측하지 못한 지출 또는 예산 초과 지출에 충당하기 위한 경비</p>
              <p className="code-card-note">예산총액의 1% 이내에서 편성</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">801-02</span>
                <span className="code-card-name">재해·재난목적예비비</span>
              </div>
              <p className="code-card-body">재해·재난 발생 시 응급 복구 및 대응 경비에 충당하기 위해 별도 편성. 용도가 한정되어 일반예비비(801-01)와 구분 관리</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">801-03</span>
                <span className="code-card-name">예비금</span>
                <span className="code-card-tag">2027 신설</span>
              </div>
              <p className="code-card-body">2027년 신설된 통계목으로, 기존 예비비 체계와 별도로 운용되는 예비 재원</p>
            </div>
            <div className="code-card code-card-wide">
              <div className="code-card-head">
                <span className="code-card-badge">802-01</span>
                <span className="code-card-name">국고보조금 반환금</span>
              </div>
              <p className="code-card-body">보조금 집행 후 <strong>정산 처리가 완료</strong>되었다면, 중앙부처가 정식 반납 고지서를 발부하기 전이라도 미리 예산안에 계상해 둘 수 있습니다.</p>
              <p className="code-card-note">계상해 둔 반환금은 중앙부처의 반납 고지가 있는 즉시 지체 없이 집행(반납)</p>
            </div>
            <div className="code-card">
              <div className="code-card-head">
                <span className="code-card-badge">802-02</span>
                <span className="code-card-name">시·도비보조금 반환금</span>
              </div>
              <p className="code-card-body">도(道) 등 광역자치단체 교부 보조금의 정산 후 잔액 반환. 802-01과 동일한 사전 계상·고지 즉시 집행 원칙 적용</p>
            </div>
          </div>
        </div>
      ),
    },
  ],
};

export default function StatisticsCodeDetail() {
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const currentItems = activeTab ? ACCORDION_DATA[activeTab] : [];
  const currentTab = activeTab ? TABS.find((t) => t.key === activeTab) : null;
  const selectedItemData = selectedItemId ? currentItems.find((item) => item.id === selectedItemId) : null;

  return (
    <Layout highlightScope={[activeTab, selectedItemId].join('::')}>
      <div className="page-content">
        <section className="page-heading">
          <h1>세출 통계목별 상세</h1>
        </section>

        <section className="guide-section">
          <div className="tabs-with-dropdown">
            <div className="guide-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`guide-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedItemId(null);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {currentTab && (
              <div className="tab-description">
                {currentTab.description}
              </div>
            )}
          </div>

          <div className="guide-content-wrapper">
            {!activeTab ? (
              <div className="guide-empty">상단 탭에서 항목을 선택하면 세부 통계목 목록이 나타납니다.</div>
            ) : (
              <>
                <div className="guide-subtabs">
                  {currentItems.map((item) => (
                    <button
                      key={item.id}
                      className={`guide-subtab ${selectedItemId === item.id ? "active" : ""}`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <span className="guide-subtab-title">{item.title}</span>
                      {item.subtitle && (
                        <span className="guide-subtab-subtitle">{item.subtitle}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="guide-detail-area">
                  {selectedItemData ? (
                    selectedItemData.content
                  ) : (
                    <div className="guide-empty">세부 통계목을 선택하면 내용이 나타납니다.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .tabs-with-dropdown {
          border-bottom: 2px solid var(--border);
          background: var(--bg-elevated);
        }

        .guide-tabs {
          display: flex;
          gap: 0;
          padding: 0;
          flex-wrap: wrap;
          border-bottom: none;
          background: var(--bg-elevated);
        }

        .guide-tab {
          flex: 1;
          min-width: 120px;
          padding: 16px 12px !important;
          font-size: 16px !important;
          font-weight: 500 !important;
          text-align: center;
          white-space: nowrap;
          color: var(--text-muted) !important;
          background: none !important;
          border: none !important;
          border-bottom: 3px solid transparent !important;
          cursor: pointer;
          transition: all 0.2s;
        }

        .guide-tab:hover {
          background: rgba(118, 157, 194, 0.08) !important;
          color: var(--text) !important;
        }

        .guide-tab.active {
          color: #5b9bf0 !important;
          border-bottom-color: #5b9bf0 !important;
          font-weight: 600 !important;
        }

        .tab-description {
          padding: 12px 16px;
          background: rgba(118, 157, 194, 0.05);
          font-size: 13px;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
        }

        .guide-empty {
          padding: 48px 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        .guide-content-wrapper {
          display: flex;
          gap: 0;
          height: calc(100vh - 220px);
          min-height: 680px;
        }

        .guide-subtabs {
          width: 240px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
          background: rgba(118, 157, 194, 0.06);
          border-right: 1px solid var(--border);
          overflow-y: auto;
          flex-shrink: 0;
        }

        .guide-subtab {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          padding: 12px 14px;
          border: 1px solid rgba(118, 157, 194, 0.2);
          border-radius: 6px;
          background: rgba(118, 157, 194, 0.05);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          white-space: normal;
          word-break: break-word;
        }

        .guide-subtab:hover {
          background: rgba(118, 157, 194, 0.12);
          border-color: rgba(118, 157, 194, 0.35);
          color: var(--text);
        }

        .guide-subtab.active {
          background: rgba(91, 155, 240, 0.18);
          border-color: #5b9bf0;
          color: #5b9bf0;
          box-shadow: 0 0 0 2px rgba(91, 155, 240, 0.1);
        }

        .guide-subtab-title {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.4;
        }

        .guide-subtab-subtitle {
          font-size: 11px;
          font-weight: 400;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .guide-subtab.active .guide-subtab-subtitle {
          color: #5b9bf0;
          opacity: 0.85;
        }

        .guide-detail-area {
          flex: 1;
          padding: 24px 28px;
          background: transparent;
          color: var(--text);
          overflow-y: auto;
        }

        .detail-content {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .detail-content {
          max-width: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .detail-content h3 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text);
          margin: 0 0 16px;
          border-bottom: 3px solid #5b9bf0;
          padding-bottom: 10px;
          letter-spacing: -0.5px;
        }

        .content-section {
          margin-bottom: 0;
          padding: 14px 18px;
          background: var(--bg-elevated);
          border-radius: 8px;
          border-left: 4px solid #5b9bf0;
        }

        .content-section h4 {
          font-size: 17px;
          font-weight: 700;
          color: #7cb2f5;
          margin-bottom: 10px;
          margin-top: 0;
          letter-spacing: -0.3px;
        }

        .content-section ul {
          padding-left: 24px;
          margin: 0;
        }

        .content-section li {
          margin: 6px 0;
          font-size: 15px !important;
          color: var(--text-muted) !important;
          line-height: 1.5;
        }

        .content-section p {
          font-size: 15px !important;
          color: var(--text-muted) !important;
          line-height: 1.5;
          margin: 0;
        }

        .content-section strong {
          color: var(--text) !important;
        }

        .content-section table {
          font-size: 15px !important;
          color: var(--text-muted) !important;
        }

        .content-section * {
          font-size: 15px !important;
          color: var(--text-muted) !important;
          line-height: 1.5 !important;
        }

        .content-section h4 {
          font-size: 17px !important;
          color: #7cb2f5 !important;
        }

        .content-section strong {
          color: var(--text) !important;
        }

        .content-section code {
          background: rgba(91, 155, 240, 0.14) !important;
          color: #9dc3f7 !important;
        }

        .content-section th {
          color: var(--text) !important;
          background: rgba(91, 155, 240, 0.1) !important;
        }

        .content-section td {
          color: var(--text-muted) !important;
        }


        /* 통계목 계열 한 화면 카드 그리드 */
        .detail-content:has(.code-grid) h3 {
          margin-bottom: 12px;
          padding-bottom: 8px;
          font-size: 20px;
        }

        .code-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
          gap: 9px;
          align-items: start;
        }

        .code-card {
          padding: 10px 12px;
          background: var(--bg-elevated);
          border: 1px solid rgba(118, 157, 194, 0.16);
          border-left: 3px solid #5b9bf0;
          border-radius: 8px;
        }

        .code-card-wide {
          grid-column: span 2;
        }

        @media (max-width: 900px) {
          .code-card-wide {
            grid-column: span 1;
          }
        }

        .code-card-head {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 7px;
        }

        .code-card-badge {
          flex: none;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(91, 155, 240, 0.16);
          color: #7cb2f5;
          font-size: 12px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.2px;
        }

        .code-card-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.2px;
        }

        .code-card-tag {
          flex: none;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 193, 7, 0.14);
          color: #e0b341;
          font-size: 11px;
          font-weight: 600;
        }

        .code-card-body {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
        }

        .code-card-body strong {
          color: var(--text);
        }

        .code-card-list {
          margin: 7px 0 0;
          padding-left: 17px;
        }

        .code-card-list li {
          margin: 2px 0;
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-muted);
        }

        .code-card-list li strong {
          color: var(--text);
        }

        .code-card-note {
          margin: 7px 0 0;
          padding: 6px 9px;
          border-radius: 6px;
          background: rgba(255, 193, 7, 0.08);
          border-left: 2px solid rgba(224, 179, 65, 0.6);
          font-size: 12px;
          line-height: 1.45;
          color: var(--text-muted);
        }

        .code-card-note strong {
          color: var(--text);
        }

        .code-card-tip {
          margin: 8px 0 0;
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-muted);
          opacity: 0.85;
        }

        .code-card-steps {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(118, 157, 194, 0.08);
        }

        .code-card-steps-label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          font-weight: 700;
          color: #7cb2f5;
        }

        .code-card-steps ol {
          margin: 0;
          padding-left: 18px;
        }

        .code-card-steps li {
          margin: 3px 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
        }
      `}</style>
    </Layout>
  );
}
