import { useState } from "react";
import Layout from "@/components/Layout";
import { ChevronDown, ChevronLeft } from "lucide-react";

type TabKey = "인건비" | "물건비" | "경상이전" | "자본지출" | "보전·반환";

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

const TABS: { key: TabKey; label: string; description: string }[] = [
  { key: "인건비", label: "인건비", description: "소속 직원의 급여 및 수당, 기간제 인부임 산정 탭" },
  { key: "물건비", label: "물건비", description: "부서 운영 소모품비, 수당, 여비 및 행사 경비 탭" },
  { key: "경상이전", label: "경상이전", description: "민간 지원금, 사회복지 수혜금 및 민간 위탁금 탭" },
  { key: "자본지출", label: "자본지출", description: "토지 매입, 자산 취득 및 주요 시설공사 예산 탭" },
  { key: "보전·반환", label: "보전·반환", description: "차입금 상환 및 국고보조금 정산 잔액 반납 탭" },
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
      subtitle: "🌟 [가장 많이 찾는 페이지]",
      content: (
        <div className="detail-content">
          <h3>기간제근로자 채용 및 단가 가이드</h3>
          <div className="content-section">
            <h4>페이지 목적</h4>
            <p>사업 부서의 기간제 및 단시간근로자 예산 요구 수식 및 단가 검색</p>
          </div>
          <div className="content-section">
            <h4>예산 요구 기본 공식</h4>
            <p style={{ backgroundColor: "rgba(118, 157, 194, 0.1)", padding: "12px", borderRadius: "4px", marginBottom: "12px" }}>
              <strong>기본급 + 주휴수당 + 연차수당 = 기준단가 × 인원 × 근로(휴일/미사용연차) 일수</strong>
            </p>
            <p><strong>근무 일수 계산 팁:</strong> 월 평균 기준 일수는 주휴일을 포함하여 27일로 계산 (예: 6개월 고용 시 27일 × 6개월 = 162일 반영)</p>
          </div>
          <div className="content-section">
            <h4>4대 보험료 계산</h4>
            <p>임금 총액의 12% 정밀 계산 반영 (국민연금 사업주 부담금 5% 인상 반영)</p>
          </div>
          <div className="content-section">
            <h4>공정수당</h4>
            <p>기간제근로자 인원수 × 구간별 보상지급액 (추후 생활임금 최종 확정 후 단가 공고 예정)</p>
          </div>
          <div className="content-section">
            <h4>2027년도 직종별 적용 단가</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "13px" }}>
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
      subtitle: "🌟 [기본경비 집중 안내]",
      content: (
        <div className="detail-content">
          <h3>사무관리비 편성 기준</h3>
          <div className="content-section">
            <h4>핵심 배분 한도</h4>
            <ul>
              <li><strong>일반수용비:</strong> 부서 공무원 정원 1인당 연 750,000원 한도 (2026. 10. 정원 기준)</li>
              <li><strong>특근급식비:</strong> 부서 공무원 정원 1인당 연 600,000원 한도 (인허가 담당 등 격무·기피 가점 부서도 동일 적용하되 정책사업으로 별도 요구 가능)</li>
            </ul>
          </div>
          <div className="content-section">
            <h4>각종 운영 수당 법정 단가표</h4>
            <div style={{ marginTop: "12px" }}>
              <strong>위원회 참석 수당</strong>
              <ul>
                <li>대면 1회: 100,000원 (회의 시간이 2시간을 초과하면 50,000원 추가)</li>
                <li>서면 심의 1회: 50,000원</li>
              </ul>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>일·숙직비</strong>
              <ul>
                <li>1회당: 60,000원</li>
                <li>재택 당직근무: 30,000원</li>
              </ul>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>현업직종 피복비</strong>
              <ul>
                <li>청원경찰: 연 266,000원 (상의 5만 원×2회 + 하의 10.4만 원 + 단화 6.2만 원)</li>
                <li>환경미화원: 연 700,000원 (상·하복 50만 원 + 안전장구 20만 원)</li>
              </ul>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>휴일 행사 차출 공무원 실비보상</strong>
              <ul>
                <li>반일 (4시간 이하): 60,000원</li>
                <li>1일 상한 (4시간 초과): 120,000원 범위 내 실비 비례 지급</li>
                <li><em>중복지급 제한: 동일 근무 시간에 대해 시간외근무수당 중복 청구 절대 불가</em></li>
              </ul>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>출동 매식비</strong>
              <p>화재·구급 현장 출동 소방공무원에 대한 매식비 및 출동간식비 지원 (훈련 출동 시 간식비 미지급)</p>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>구내식당 운영비</strong>
              <p>자치단체 조례에 후생복지시설 포함 및 지원근거가 규정된 경우에 한해 운영 경비(주·부식대, 연료비 등) 요구 가능</p>
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
            <h4>완전 통합 개편 사항</h4>
            <p><strong>자본지출에 해당하던 행사관련시설비(401-04) 통계목이 폐지됨에 따라</strong>, 행사장 가설 무대나 일회성 텐트, 구조물 설치비는 자본지출이 아닌 <strong>행사운영비(201-03)로 일괄 편성</strong>해야 합니다.</p>
          </div>
          <div className="content-section">
            <h4>임시 구조물 설치비 편성 규칙</h4>
            <p>행사 운영을 위한 임시 구조물 설치비 편성 시 준수해야 할 규칙입니다.</p>
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
            <h4>기본 관내출장</h4>
            <p><strong>계산식: 20,000원 × 공무원현원 × 9일 × 12월</strong></p>
          </div>
          <div className="content-section">
            <h4>상시출장 월액여비</h4>
            <p><strong>1인당 월 225,000원 한도</strong> (요구 전 부서 내부 방침 결재 필수 선행)</p>
          </div>
          <div className="content-section">
            <h4>개정 사항 (통계목 통합)</h4>
            <p>월액여비(202-02) 및 국제화여비(202-04) 통계목은 모두 <strong>국내여비(202-01)</strong>로 통합 정비되었습니다.</p>
          </div>
        </div>
      ),
    },
    {
      id: "203",
      title: "203. 업무추진비 (정원가산 / 부서운영)",
      content: (
        <div className="detail-content">
          <h3>업무추진비 편성 기준</h3>
          <div className="content-section">
            <h4>정원가산업무추진비 (203-02) 배분 기준</h4>
            <p><em>(정원별 누적 산정)</em></p>
            <div style={{ marginTop: "12px" }}>
              <strong>본청 및 의회사무기구</strong>
              <ul>
                <li>100명까지: 1인당 80,000원</li>
                <li>101~300명: 1인당 60,000원</li>
                <li>301~600명: 1인당 45,000원</li>
              </ul>
            </div>
            <div style={{ marginTop: "12px" }}>
              <strong>출장소, 사업소, 읍면동</strong>
              <ul>
                <li>100명까지: 1인당 40,000원</li>
                <li>101~400명: 1인당 30,000원</li>
              </ul>
            </div>
          </div>
          <div className="content-section">
            <h4>부서운영업무추진비 (203-04) 월정액 기준</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(118, 157, 194, 0.15)", borderBottom: "2px solid rgba(118, 157, 194, 0.3)" }}>
                  <th style={{ padding: "8px", textAlign: "left", borderRight: "1px solid rgba(118, 157, 194, 0.2)" }}>부서 정원</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>월정액</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>5인 이하</td>
                  <td style={{ padding: "8px" }}>월 100,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>6~10인</td>
                  <td style={{ padding: "8px" }}>월 175,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>11~15인</td>
                  <td style={{ padding: "8px" }}>월 250,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>16~20인</td>
                  <td style={{ padding: "8px" }}>월 300,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>21~25인</td>
                  <td style={{ padding: "8px" }}>월 350,000원</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(118, 157, 194, 0.1)" }}>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>26~30인</td>
                  <td style={{ padding: "8px" }}>월 400,000원</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", borderRight: "1px solid rgba(118, 157, 194, 0.1)" }}>31인 이상</td>
                  <td style={{ padding: "8px" }}>월 400,000원 + 30명 초과 1인당 월 5,000원</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: "204-03",
      title: "204-03. 특정업무경비",
      content: (
        <div className="detail-content">
          <h3>특정업무경비 분야별 월 기준 단가표</h3>
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
      subtitle: "🌟 [2027년 신설 탭]",
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
      subtitle: "🌟 [2027년 개정 탭]",
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
  const [activeTab, setActiveTab] = useState<TabKey>("인건비");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const currentItems = ACCORDION_DATA[activeTab];
  const currentTab = TABS.find((t) => t.key === activeTab);
  const selectedItemData = selectedItem ? currentItems.find((item) => item.id === selectedItem) : null;

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
                    setSelectedItem(null);
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

          <div className="guide-content">
            {selectedItemData ? (
              <div className="detail-view">
                <button
                  className="back-button"
                  onClick={() => setSelectedItem(null)}
                >
                  <ChevronLeft size={20} />
                  <span>뒤로가기</span>
                </button>
                <div className="detail-wrapper">
                  {selectedItemData.content}
                </div>
              </div>
            ) : (
              <div className="accordion-container">
                {currentItems.map((item) => (
                  <button
                    key={item.id}
                    className="accordion-item"
                    onClick={() => setSelectedItem(item.id)}
                  >
                    <div className="accordion-header">
                      <ChevronDown size={18} />
                      <div className="accordion-title-wrapper">
                        <span className="accordion-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="accordion-subtitle">{item.subtitle}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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

        .accordion-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .accordion-item {
          background: none;
          border: 1px solid rgba(118, 157, 194, 0.2);
          border-radius: 6px;
          overflow: hidden;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .accordion-item:hover {
          background: rgba(118, 157, 194, 0.05);
          border-color: rgba(118, 157, 194, 0.4);
        }

        .accordion-header {
          width: 100%;
          padding: 14px 16px;
          background: rgba(118, 157, 194, 0.08);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: background 0.2s ease;
        }

        .accordion-item:hover .accordion-header {
          background: rgba(118, 157, 194, 0.12);
        }

        .accordion-title-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .accordion-title {
          font-size: 15px;
          font-weight: 600;
          color: #5b9bf0;
        }

        .accordion-subtitle {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
        }

        .detail-view {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          margin-bottom: 20px;
          background: rgba(118, 157, 194, 0.1);
          border: 1px solid rgba(118, 157, 194, 0.2);
          border-radius: 6px;
          color: #5b9bf0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: rgba(118, 157, 194, 0.2);
          border-color: rgba(118, 157, 194, 0.4);
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

        .detail-content h3 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 24px;
          border-bottom: 2px solid var(--border);
          padding-bottom: 12px;
        }

        .content-section {
          margin-bottom: 20px;
        }

        .content-section h4 {
          font-size: 15px;
          font-weight: 600;
          color: #5b9bf0;
          margin-bottom: 12px;
        }

        .content-section ul {
          padding-left: 20px;
          margin: 0;
        }

        .content-section li {
          margin: 8px 0;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .content-section p {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          margin: 0;
        }

        .detail-wrapper {
          padding: 20px;
          background: var(--bg-surface);
          border-radius: 6px;
        }
      `}</style>
    </Layout>
  );
}
