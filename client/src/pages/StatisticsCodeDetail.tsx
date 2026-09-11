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
            <h4>편성 정원 기준</h4>
            <p>2026년 8월 31일 기준 정원 또는 현원 반영</p>
          </div>
          <div className="content-section">
            <h4>적용 단가 기준</h4>
            <p>2026년도 공무원 봉급표 기준</p>
          </div>
          <div className="content-section">
            <h4>법정 수당 요율표</h4>
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
            <h4>급여 단가</h4>
            <p>「화성시-화성시공무직노동조합 임금협약」 단가 엄격 준수</p>
          </div>
          <div className="content-section">
            <h4>명절휴가비</h4>
            <ul>
              <li>기본급의 120% 편성</li>
              <li>설·추석 각 60% 분할 지급</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>실무 필수 규칙</h4>
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
            <h4>1. 인건비</h4>
            <ul>
              <li><strong>예산 과목 (통계목):</strong> 101-04 기간제근로자등 보수 (개별 정책사업에 포함하여 요구)</li>
              <li><strong>관할 및 주관 부서:</strong> 행정지원과 공공노무팀</li>
              <li><strong>근거 규정:</strong> 「화성시 기간제 및 단시간근로자 관리 규정」 제6조 및 「공공부문 비정규직 처우개선 대책 및 가이드라인」</li>
              <li><strong>사전 승인 의무:</strong> 기간제 및 단시간근로자 보수 예산을 요구하기 전에 반드시 공공노무팀으로부터 채용 적정성 심사를 받아서 정수 승인을 얻어야 예산편성이 가능합니다.</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>2. 기간제근로자 인건비 구성요소 및 표준 산출식</h4>
            <p>예산 요구 시 인건비 항목은 기본급, 주휴수당, 연차수당, 4대 보험료, 공정수당으로 구별하여 요구합니다.</p>
            <div style={{ marginTop: "12px" }}>
              <strong>① 기본급 · 주휴수당 · 연차수당</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>기본급: 일일단가(원) × 인원(명) × 근로일수(일)</li>
                <li>주휴수당: 일일단가(원) × 인원(명) × 휴일일수(일) (일요일 및 근로자의 날)</li>
                <li>연차수당: 일일단가(원) × 인원(명) × 미사용 연차 일수(일)</li>
                <li style={{ marginTop: "8px" }}>
                  <strong>통합 입력 수식:</strong>{" "}
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>기준단가(원) × 인원(명) × 근무일수(일)</code>
                </li>
                <li style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px", color: "var(--text-muted)" }}>월 평균 기준일수(주휴일 포함): <strong>월 27일</strong> 적용</li>
                <li style={{ marginLeft: "20px", fontSize: "13px", color: "var(--text-muted)" }}>(예시) 6개월 고용 시 근무일수: 27일 × 6개월 = 162일 적용</li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>② 4대 보험료 (기관 부담금)</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>
                  산출식:{" "}
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>임금 총액(원) × 12% (또는 11.75%, 원 단위까지 정확히 입력)</code>
                </li>
                <li style={{ fontSize: "13px", color: "var(--text-muted)" }}>(참고) 국민연금 사업주 공제부담 비율이 4.75%에서 5%로 인상 반영되었습니다.</li>
              </ul>
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>③ 공정수당</strong>
              <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                <li>
                  산출식:{" "}
                  <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>기간제근로자 인원수(명) × 구간별 보상지급액(원)</code>
                </li>
                <li style={{ fontSize: "13px", color: "var(--text-muted)" }}>(참고) 보상지급액은 당해 연도 화성시 생활임금 확정 고시 후 산정 적용됩니다.</li>
              </ul>
            </div>
          </div>
          <div className="content-section">
            <h4>3. 직종별 단가 적용 기준</h4>
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
            <h4>2027년도 직종별 적용 단가</h4>
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
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>일급 96,720<br/>(시급 12,090)</td>
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
                  <div style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px" }}>산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>100,000원(또는 150,000원) × 참석 위원 수(명) × 회의 횟수(회)</code></div>
                </li>
                <li><strong>서면 심의 수당:</strong> 1회당 50,000원
                  <div style={{ marginLeft: "20px", marginTop: "4px", fontSize: "13px" }}>산출식: <code style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "2px 4px", borderRadius: "3px" }}>50,000원 × 심의 위원 수(명) × 심의 횟수(회)</code></div>
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
          <h3>특정업무경비 편성기준</h3>
          <div className="content-section">
            <h4>기본 활동비</h4>
            <ul>
              <li><strong>대민활동비:</strong> 월 50,000원 (6급 이하 정규직 및 청원경찰)</li>
              <li><strong>특별사법경찰관 수사활동비:</strong> 월 200,000원 (특사경 지명을 받은 실무 과장 및 담당자)</li>
              <li><strong>아동학대대응활동비:</strong> 월 100,000원 <em>(기존 5만 원에서 2배 인상, 대민활동비와 중복 수령 가능)</em></li>
            </ul>
          </div>
          <div className="content-section">
            <h4>분야별 활동비</h4>
            <ul>
              <li><strong>세무활동비 / 예산활동비:</strong> 월 150,000원</li>
              <li><strong>재난·안전 활동비:</strong> 월 80,000원 (수당 규정상 재난안전 대상자)</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>선택항목 (지자체 설정)</h4>
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
          <h3>사회보장적수혜금 단일화</h3>
          <div className="content-section">
            <h4>개정 사항 (통계목 통합)</h4>
            <p><strong>기존에 복잡했던 국고보조재원, 취약계층지방재원 등 3개 재원별 통계목이 사회보장적수혜금(301-01) 하나로 완전히 통합됨</strong></p>
          </div>
          <div className="content-section">
            <h4>현금성 복지경비 편성 기준</h4>
            <p>현금성 복지경비 편성 시 통합 기준을 준수합니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "301-08",
      title: "301-08. 민간인 국외여비",
      content: (
        <div className="detail-content">
          <h3>민간인 국외여비 엄격 제한</h3>
          <div className="content-section">
            <h4>편성 불허 사항</h4>
            <p>사업수행 전문가가 아닌 단순 이·통장, 지역 학생 등을 대상으로 포상 성격으로 지급하는 관행적인 해외연수 목적 여비 편성은 <strong>강력히 불허</strong>합니다.</p>
          </div>
          <div className="content-section">
            <h4>준용 기준</h4>
            <p>포상성·관행적 국외연수는 편성이 금지됩니다. 강력한 규제 지침을 준수합니다.</p>
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
            <h4>적용 대상</h4>
            <p>시 주관 프로그램 참여 자원봉사자 대상 (1일 4시간 이상 활동 시 적용)</p>
          </div>
          <div className="content-section">
            <h4>실비보상 단가</h4>
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
          <h3>보험료 부담금 편성 기준</h3>
          <div className="content-section">
            <h4>포함 범위</h4>
            <p>공무직 외에 <strong>청원경찰 고용보험 부담금의 시 의무 납부분</strong>을 포함하여 명확히 산정합니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "307",
      title: "307. 민간보조금 (경상 / 법정운영 / 행사)",
      content: (
        <div className="detail-content">
          <h3>민간단체 법정운영비 보조 기준</h3>
          <div className="content-section">
            <h4>편성 원칙</h4>
            <p><strong>명시적 법령 근거가 규정된 단체에 한하여</strong> 인건비, 사무관리비, 임차료 등으로 용도를 한정하여 요구하며, 포괄적 지원은 금지됩니다.</p>
          </div>
          <div className="content-section">
            <h4>허용 용도</h4>
            <ul>
              <li>인건비</li>
              <li>사무관리비</li>
              <li>임차료</li>
              <li>기타 인정되는 운영경비</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>보조금 한도액</h4>
            <p>보조금 총 한도액: 1,094억 원</p>
          </div>
        </div>
      ),
    },
    {
      id: "308-13",
      title: "308-13. 공기관등에 대한 경상적 위탁사업비",
      content: (
        <div className="detail-content">
          <h3>공기관 위탁사업비 편성 기준</h3>
          <div className="content-section">
            <h4>분리 편성 원칙</h4>
            <p><strong>출연기관(도시공사, 문화관광재단 등)의 기본 운영경비가 아닌 특정 사업 대행 시에는 출연금이 아닌 위탁사업비 목으로 철저히 구분 편성</strong>합니다.</p>
          </div>
          <div className="content-section">
            <h4>편성 구분</h4>
            <ul>
              <li><strong>출연금:</strong> 기관의 기본 운영경비</li>
              <li><strong>위탁사업비:</strong> 특정 사업 대행 경비</li>
            </ul>
          </div>
        </div>
      ),
    },
  ],
  자본지출: [
    {
      id: "401-01",
      title: "401-01. 시설공사 보상비",
      subtitle: <StarredSubtitle>[2027년 신설 탭]</StarredSubtitle>,
      content: (
        <div className="detail-content">
          <h3>시설공사 보상비 편성 기준</h3>
          <div className="content-section">
            <h4>적용 대상 예산 범위</h4>
            <ul>
              <li>사무실, 공장, 공원 및 대단위 토목공사에 편입되는 토지 매입 대금</li>
              <li>건물 및 지장물 손실보상금, 영업권·어업권 보상금 및 이전비</li>
              <li>감정수수료, 측량수수료, 등기등록비, 농지·개발제한구역 보전부담금 등 행정 부대경비</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>편성 시 필수 요건</h4>
            <ul>
              <li><strong>[자산 증가 필수]</strong> 예산 지출을 통해 시(市)의 공공자산 증가가 실질적으로 수반되는 경우에만 편성</li>
              <li><strong>보상 가격은 감정평가를 우선</strong>하되 없을 시 공시지가나 유사 실적 참조</li>
            </ul>
          </div>
          <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--text-muted)" }}>2027년도에 신설된 통계목으로, 기존 시설비에서 분리되었습니다.</p>
        </div>
      ),
    },
    {
      id: "401-02",
      title: "401-02. 시설비",
      subtitle: <StarredSubtitle>[2027년 개정 탭]</StarredSubtitle>,
      content: (
        <div className="detail-content">
          <h3>시설비 편성 기준</h3>
          <div className="content-section">
            <h4>편성 범위 (신규 기준)</h4>
            <ul>
              <li>기본조사설계비 및 실시설계비, 설계공모비</li>
              <li>실제 도로·하천의 건설 및 개·보수 순공사비</li>
              <li>건물, 기계, 공작물의 내용연수를 현저히 늘리는 대수선 및 수리비</li>
              <li>문화재 발굴경비, 대형 시설의 안전진단 및 정밀점검 용역비</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>배제 대상 (중요 변경)</h4>
            <p><strong>토지매입비 및 대규모 보상비 요구 일체 배제</strong> (모두 보상비 목으로 이관 완료)</p>
          </div>
          <div className="content-section">
            <h4>⚠️ 시설비 단계별 편성 의무 룰 (집행률 관리)</h4>
            <p style={{ marginBottom: "12px" }}>예산의 이월·불용 최소화를 위해 공정별 집행계획을 감안하여 실제 지출할 단계의 금액만 요구 가능합니다.</p>
            <div style={{ backgroundColor: "rgba(118, 157, 194, 0.08)", padding: "12px", borderRadius: "4px" }}>
              <p style={{ marginTop: 0 }}><strong>1단계:</strong> 사전조사 및 기본계획 수립, 설계비(실시설계비 등) 요구</p>
              <p><strong>2단계:</strong> 설계 완료 시점에 맞추어 토지 및 용지 매입을 위한 시설공사 보상비 요구</p>
              <p style={{ marginBottom: 0 }}><strong>3단계:</strong> 보상이 100% 추진(완료)된 시점에 한하여 실제 착공을 위한 공사비 요구</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "402-01",
      title: "402-01. 민간자본사업보조",
      content: (
        <div className="detail-content">
          <h3>민간자본사업보조 편성 기준</h3>
          <div className="content-section">
            <h4>기본 정의</h4>
            <p>민간이 자체적으로 추진하는 자본 형성적 사업(시설물 축조, 대규모 수선, 자본재 및 고가 장비 도입 등)을 지원하기 위해 지방자치단체가 민간 보조사업자에게 교부하는 <strong>자본 지출 성격의 보조금</strong>입니다.</p>
          </div>
          <div className="content-section">
            <h4>2027년도 주요 개정 사항</h4>
            <p><strong>재원구분 통계목 통합:</strong> 기존에는 자체재원 보조와 이전재원(국·도비 등) 보조로 번거롭게 나누어 관리되던 민간자본 보조 통계목이 '민간자본사업보조(402-01)' 단일 통계목으로 완전히 통합되었습니다.</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>💡 <em>실무 팁: e호조 시스템 입력 시에는 하나의 통계목으로 통일하되, 보통교부세 산정 등을 위해 시스템 내부 속성(정보관리사업)에서 재원 구분을 분류하여 관리합니다.</em></p>
          </div>
          <div className="content-section">
            <h4>예산 편성 대상 및 범위</h4>
            <ul>
              <li><strong>시설 신·증축 및 개보수:</strong> 민간 단체나 법인이 소유·운영하는 시설물의 신축, 증축, 개축 및 대수선 공사 비용 지원</li>
              <li><strong>자본재 및 고가 장비 구입:</strong> 내용연수가 다년인 기계장비, 공장 설비, 전문 의료·과학 장비 등 민간의 유형자산 형성을 돕기 위한 물품 취득비 지원</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>⚠️ 예산 편성 시 실무 유의사항 (필수 체크)</h4>
            <div style={{ backgroundColor: "rgba(255, 193, 7, 0.1)", padding: "12px", borderRadius: "4px", marginBottom: "12px" }}>
              <strong>경상적 경비 편성 절대 금지</strong>
              <ul style={{ marginTop: "8px" }}>
                <li>사업 수행에 따르는 단순 인건비, 사무실 운영비, 소모품 구입비, 홍보비, 여비 등 경상적 성격의 경비는 자본지출(402-01)에 섞어서 편성할 수 없습니다.</li>
                <li>해당 비용은 반드시 경상이전 비목인 민간경상사업보조(307-02) 등으로 철저히 분리하여 요구해야 합니다.</li>
              </ul>
            </div>
            <ul>
              <li><strong>지방보조금 사전 심의:</strong> 예산 요구 전, 반드시 지방보조금관리위원회 심의를 완료하여 승인을 득한 사업에 한해서만 예산을 반영할 수 있습니다.</li>
              <li><strong>보조금 총액한도액 관리:</strong> 화성시 전체 민간보조금 총액 한도(2027년도 예상 한도액 1,094억 원) 범위 내에서 부서별 한도액 배분을 준수하여야 합니다.</li>
            </ul>
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
            <h4>정수 배정 사전 승인제</h4>
            <p><strong>주요 정수관리 물품 및 공용차량 임차(1개월 이상)는 예산 요구 전 반드시 물품 부서의 정수 배정 승인을 받아야 요구 등록이 가능</strong>합니다.</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "8px" }}>대표적 정수 물품(59종): 노트북컴퓨터, 에어컨, 빔프로젝터, 디지털캠코더 등</p>
          </div>
          <div className="content-section">
            <h4>💻 2027년도 다기능 사무기기 주요 물품 표준 단가</h4>
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
            <h4>🌱 친환경 의무 정책</h4>
            <p>신규 또는 교체로 구매·임차하는 모든 공용차량은 반드시 <strong>친환경차량(저공해자동차 100%)</strong>으로 예산을 반영하여야 합니다.</p>
          </div>
        </div>
      ),
    },
  ],
  "보전·반환": [
    {
      id: "601-01",
      title: "601-01. 국내차입금상환",
      content: (
        <div className="detail-content">
          <h3>국내차입금상환 편성 기준</h3>
          <div className="content-section">
            <h4>통계목 대폭 간소화</h4>
            <p><strong>기존에 상환 기금 종류별로 7개로 쪼개져 있던 국내차입 원금상환 통계목이 국내차입금상환(601-01) 하나로 통폐합</strong>되었습니다.</p>
          </div>
          <div className="content-section">
            <h4>편성 기준</h4>
            <p>통폐합된 기준에 따라 채무 원금 상환을 편성합니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "802-01",
      title: "802-01. 국고보조금 반환금",
      content: (
        <div className="detail-content">
          <h3>국고보조금 반환금 편성 기준</h3>
          <div className="content-section">
            <h4>사전 계상 승인</h4>
            <p>보조금 집행 후 정산 처리가 완료되었다면, 중앙부처에서 정식 반납 고지서를 발부하기 전이라도 <strong>미리 예산안에 자금을 계상하여 고지 즉시 즉각 반납</strong>할 수 있습니다.</p>
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
    <Layout>
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
          height: calc(100vh - 350px);
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
          padding: 32px 40px;
          background: rgba(255, 255, 255, 0.95);
          color: #1a1a1a;
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
          gap: 16px;
        }

        .detail-content h3 {
          font-size: 28px;
          font-weight: 800;
          color: #000;
          margin-bottom: 40px;
          border-bottom: 3px solid #5b9bf0;
          padding-bottom: 20px;
          letter-spacing: -0.5px;
        }

        .content-section {
          margin-bottom: 32px;
          padding: 20px 24px;
          background: rgba(118, 157, 194, 0.08);
          border-radius: 8px;
          border-left: 4px solid #5b9bf0;
        }

        .content-section h4 {
          font-size: 19px;
          font-weight: 700;
          color: #1a3a66;
          margin-bottom: 20px;
          margin-top: 0;
          letter-spacing: -0.3px;
        }

        .content-section ul {
          padding-left: 28px;
          margin: 0;
        }

        .content-section li {
          margin: 10px 0;
          font-size: 16px !important;
          color: #222 !important;
          line-height: 1.5;
        }

        .content-section p {
          font-size: 16px !important;
          color: #222 !important;
          line-height: 1.5;
          margin: 0;
        }

        .content-section strong {
          color: #000 !important;
        }

        .content-section table {
          font-size: 16px !important;
          color: #222 !important;
        }

        .content-section ul {
          color: #222 !important;
        }

        .content-section * {
          font-size: 16px !important;
          color: #222 !important;
          line-height: 1.5 !important;
        }

        .content-section h4 {
          font-size: 19px !important;
          color: #1a3a66 !important;
        }

      `}</style>
    </Layout>
  );
}
