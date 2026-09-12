import { useState } from "react";
import Layout from "@/components/Layout";

type TabKey = "재정전략" | "사업 타당성" | "대외 의사결정 및 자산 관리" | "운영 및 사회적 가치" | "지방투자사업" | "시설비" | "자산 취득" | "기간제근로자";

const TABS: { key: TabKey; label: string }[] = [
  { key: "재정전략", label: "재정전략" },
  { key: "사업 타당성", label: "사업 타당성" },
  { key: "대외 의사결정 및 자산 관리", label: "대외 의사결정 및 자산 관리" },
  { key: "운영 및 사회적 가치", label: "운영 및 사회적 가치" },
  { key: "지방투자사업", label: "지방투자사업" },
  { key: "시설비", label: "시설비" },
  { key: "자산 취득", label: "자산 취득" },
  { key: "기간제근로자", label: "기간제근로자" },
];

export default function BudgetEstablishmentGuide() {
  const [activeTab, setActiveTab] = useState<TabKey>("재정전략");

  const renderTabContent = () => {
    switch (activeTab) {
      case "재정전략":
        return (
          <div className="tab-content">
            <h2>재정전략 <span className="guide-subtitle">거시적 재정 건전성 확보를 위한 핵심 심사</span></h2>

            <h3>📑 [실무 가이드] 16대 사전 행정절차 자가진단 종합 체크리스트</h3>
            <table className="content-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>단계</th>
                  <th style={{ width: '50px' }}>번호</th>
                  <th>사전 행정절차 항목</th>
                  <th>편성 가능 여부 및 누락 시 페널티</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 600 }}>계획</td>
                  <td style={{ textAlign: 'center' }}>01</td>
                  <td>예산 수립 전 재정합의</td>
                  <td>편성 원천 불가</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>03</td>
                  <td>중기지방재정계획 반영 여부</td>
                  <td>투자심사 진행 불가 / 편성 불가</td>
                </tr>
                <tr>
                  <td rowSpan={6} style={{ textAlign: 'center', fontWeight: 600 }}>심사</td>
                  <td style={{ textAlign: 'center' }}>02</td>
                  <td>지방재정 투자심사</td>
                  <td>설계비 및 공사비 요구 불가</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>04</td>
                  <td>지방재정영향평가</td>
                  <td>사업 추진 절차 중단</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>05</td>
                  <td>지방보조금 관리위원회 심의</td>
                  <td>세출예산 반영 불가</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>06</td>
                  <td>용역과제 심의 (1,000만 원↑)</td>
                  <td>용역 발주 불가</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>13</td>
                  <td>축제 경비 심의 및 환류 적용</td>
                  <td>평가 등급에 따른 강제 삭감</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>14</td>
                  <td>교육경비 보조금 심의</td>
                  <td>교육청 협의 및 편성 불가</td>
                </tr>
                <tr>
                  <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 600 }}>의결</td>
                  <td style={{ textAlign: 'center' }}>07</td>
                  <td>출연금·민간위탁 의회 사전의결</td>
                  <td>의회 예산 심사 거부 사유</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>11</td>
                  <td>공유재산관리계획 승인</td>
                  <td>사업 부지 취득 및 공사 불가</td>
                </tr>
                <tr>
                  <td rowSpan={6} style={{ textAlign: 'center', fontWeight: 600 }}>운영</td>
                  <td style={{ textAlign: 'center' }}>08</td>
                  <td>정보화사업 사전승인 및 보안 15%</td>
                  <td>보안예산 미달 시 보완 지시</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>09</td>
                  <td>기간제근로자 채용 승인 (정수)</td>
                  <td>인건비 편성 불가</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>10</td>
                  <td>공무국외출장 사전 협의 (201-01 분리)</td>
                  <td>위반 시 여비 환수 및 징계</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>12</td>
                  <td>물품·차량 정수 승인 (친환경 100%)</td>
                  <td>e호조 시스템 등록 차단</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>15</td>
                  <td>사회보장제도 복지부 사전 협의</td>
                  <td>협의 미완료 시 편성 절대 불가</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center' }}>16</td>
                  <td>재난안전 4대 속성정보 입력</td>
                  <td>보통/소방안전교부세 감액</td>
                </tr>
              </tbody>
            </table>

            <h3>📋 01. 재정합의: 예산재정과 협조결재 (필수)</h3>
            <p>사업계획 수립 시 반드시 예산재정과(소관 예산팀)와 협조결재를 완료해야 합니다.</p>

            <div className="alert-box">
              <strong>🚨 [필수]</strong>
              <p>재정합의 없이 시의회 보고나 보도자료 배포를 선행하는 행위는 엄격히 금지됩니다.</p>
            </div>

            <h3 style={{ fontSize: '16px' }}>[비목 및 규모별 사무전결 및 재정합의 기준]</h3>
            <table className="content-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>전결권자</th>
                  <th>축제·행사성 사업 기준</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>시비 10억 원 초과</td>
                  <td>시장 결재</td>
                  <td>1억 원 초과 (시장)</td>
                </tr>
                <tr>
                  <td>시비 5억~10억 이하</td>
                  <td>부시장 전결</td>
                  <td>5천만~1억 이하 (부시장)</td>
                </tr>
                <tr>
                  <td><strong>시비 1억~5억 이하</strong></td>
                  <td>실·국·소·단장 전결</td>
                  <td>5천만 원 이하 (실·국장)</td>
                </tr>
                <tr>
                  <td>시비 1억 원 이하</td>
                  <td>과장 전결</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td>민간보조/보상(신규)</td>
                  <td>부시장 전결</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>

            <h3>📊 02. 투자심사 및 04. 영향평가</h3>
            <p>총사업비 기준에 따라 심사 주체가 결정되며, 통과 여부에 따라 예산 요구 가능 여부가 결정됩니다.</p>

            <div className="rules-container">
              <div className="rule-item">
                <h4>투자심사 주체</h4>
                <p>20억 이상 자체사업(시), 20억~200억 미만 이전재원 사업(도), 200억 이상(중앙).</p>
              </div>
              <div className="rule-item">
                <h4>재심사 요건</h4>
                <p>총사업비 30% 이상 증액 시 반드시 재심사를 통과해야 합니다. (물가상승분 제외)</p>
              </div>
              <div className="rule-item">
                <h4>영향평가</h4>
                <p>10억 이상 행사성 사업 또는 시비 50억 이상(총사업비 100억 이상) 공모사업은 응모 전 영향평가가 필수입니다.</p>
              </div>
            </div>

            <h3>🗂️ 03. 중기지방재정계획 반영 (2027~2031)</h3>
            <div className="alert-box">
              <strong>🚨 [미반영 시 불이익]</strong>
              <p>계획 미반영 시 투자심사 및 지방채 발행이 불가합니다.</p>
            </div>
            <p>5년간 투자합계가 20억 원 이상인 사업은 반드시 포함되어야 하며, 예외 사유(재난·재해 등)는 엄격히 제한적으로만 적용됩니다.</p>
          </div>
        );
      case "사업 타당성":
        return (
          <div className="tab-content">
            <h2>사업 타당성 <span className="guide-subtitle">비목별 세부 심의 및 성과 환류 체계</span></h2>

            <h3>📋 05. 지방보조금 및 14. 교육경비 (예산재정과/교육지원과)</h3>
            <p>2027년도부터 성과평가 환류 기준이 강화되었습니다.</p>

            <div className="rules-container">
              <div className="rule-item">
                <h4>성과 환류</h4>
                <p>성과평가 60점 미만(미흡) 시 최대 50% 감액, 3년 주기 평가 미흡 시 원칙적 폐지.</p>
              </div>
              <div className="rule-item">
                <h4>심의 제외</h4>
                <p>국·도비 매칭 사업은 심의에서 제외되나, 자체 재원 사업은 반드시 관리위원회 심의를 득해야 합니다.</p>
              </div>
            </div>

            <h3>📋 06. 용역과제 및 13. 축제 경비 (정책기획관/문화예술과)</h3>
            <div className="rules-container">
              <div className="rule-item">
                <h4>용역과제 심의</h4>
                <p>1,000만 원 이상 학술·기술 용역 대상. 단, '시설비 및 부대비' 비목의 설계비·감리비는 심의 제외 대상임을 확인하십시오. (정책협력팀 주관)</p>
              </div>
              <div className="rule-item">
                <h4>축제 경비 환류</h4>
                <p>1억 원 이상 축제는 평가 등급에 따라 예산이 강제 조정됩니다.</p>
              </div>
            </div>

            <table className="content-table">
              <thead>
                <tr>
                  <th>등급</th>
                  <th>기준</th>
                  <th>조정 내용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>S등급</td>
                  <td>90점 이상</td>
                  <td>최대 20% 증액 가능</td>
                </tr>
                <tr>
                  <td>A등급</td>
                  <td>80점 이상</td>
                  <td>최대 10% 증액 가능</td>
                </tr>
                <tr>
                  <td>B등급</td>
                  <td>60~80점</td>
                  <td>동결 또는 10% 감액</td>
                </tr>
                <tr>
                  <td>C등급</td>
                  <td>60점 미만</td>
                  <td>30% 강력 삭감</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case "대외 의사결정 및 자산 관리":
        return (
          <div className="tab-content">
            <h2>대외 의사결정 및 자산 관리 <span className="guide-subtitle">의회 동의 및 물품·차량 관리</span></h2>

            <h3>📋 07. 의회 사전의결 및 11. 공유재산관리계획 (재산관리과)</h3>
            <div className="rules-container">
              <div className="rule-item">
                <h4>출연금</h4>
                <p>직전 대비 10% 이상 증액 시 타당성 심의 및 의회 사전 동의가 절대적 전제조건입니다.</p>
              </div>
              <div className="rule-item">
                <h4>공유재산 기준</h4>
                <p>10억 원 이상 또는 1,000㎡ 이상 취득 시 관리계획 승인 필요.</p>
              </div>
            </div>

            <div className="alert-box">
              <strong>⚠️ 주의 사항 (동시 제출 금지)</strong>
              <p>예산안과 공유재산관리계획안의 동일 회기 동시 제출은 원칙적으로 불허합니다. 선행 절차로서 관리계획 승인을 반드시 먼저 득해야 합니다.</p>
            </div>

            <h3>📋 12. 물품 및 차량 정수 승인 (회계과/재산관리과)</h3>
            <p>정수 승인 없이 e호조 등록이 불가하며, 아래의 표준 단가를 준수해야 합니다.</p>

            <table className="content-table">
              <thead>
                <tr>
                  <th>정수 물품</th>
                  <th>표준 단가</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>데스크탑 컴퓨터</td>
                  <td>100만 원 (모니터 포함 시 126만 원)</td>
                </tr>
                <tr>
                  <td>노트북</td>
                  <td>150만 원</td>
                </tr>
                <tr>
                  <td>A3 컬러 레이저프린터</td>
                  <td>180만 원</td>
                </tr>
              </tbody>
            </table>

            <div className="alert-box">
              <strong>🌱 친환경차 의무화</strong>
              <p>「대기환경보전법」에 따라 신규 구매 및 1개월 이상 임차하는 모든 차량은 친환경차량(저공해자동차) 100% 반영이 법적 의무입니다.</p>
            </div>
          </div>
        );
      case "운영 및 사회적 가치":
        return (
          <div className="tab-content">
            <h2>운영 및 사회적 가치 <span className="guide-subtitle">인적 자원 및 시민 안전망 구축</span></h2>

            <h3>📋 08. 정보화사업 및 09. 인력 관리 (정보통신과/행정지원과)</h3>
            <div className="rules-container">
              <div className="rule-item">
                <h4>정보보호 예산</h4>
                <p>전체 정보화 예산의 15%를 정보보호 비목으로 의무 편성해야 하며, e호조 입력 시 '정보화' 및 '정보보호' 속성을 필히 태깅하십시오.</p>
              </div>
              <div className="rule-item">
                <h4>기간제 근로자 (공공노무팀)</h4>
                <p>'상시고용 회피'를 위한 쪼개기 계약은 엄격히 금지됩니다. 화성시 생활임금 단가 적용 여부를 확인하십시오.</p>
              </div>
            </div>

            <h3>📋 10. 공무국외출장 (행정지원과 교류협력팀)</h3>
            <div className="rules-container">
              <div className="rule-item">
                <h4>비목 분리</h4>
                <p>현지 차량 임차비, 통역비 등 부대비용은 여비가 아닌 <strong>사무관리비(201-01)</strong>로 별도 산출해야 합니다.</p>
              </div>
              <div className="rule-item">
                <h4>청렴 행정</h4>
                <p>출장 비위로 징계받은 의원의 경우, 차년도 관련 여비 삭감은 의무 사항이며 타 항목 전용은 불가합니다.</p>
              </div>
            </div>

            <h3>📋 15. 사회보장 및 16. 재난안전 (복지정책과/안전정책과)</h3>
            <div className="alert-box">
              <strong>🚨 [복지부 사전협의]</strong>
              <p>보건복지부 협의 완료 전 예산 편성은 절대 불가합니다. (쟁점 안건 시 6개월 이상 소요)</p>
            </div>

            <div className="content-section-alt">
              <h4>재난안전 페널티</h4>
              <p>e호조 4대 속성정보(분야, 유형, 법적분류, 단계) 누락 시, 보통교부세 및 소방안전교부세의 대규모 감액 페널티가 발생합니다.</p>
              <p style={{ marginTop: '8px' }}>• 지정 기준: 세부사업 내 안전 예산 비중이 50% 이상일 경우 전체를 재난안전사업으로 지정해야 합니다.</p>
            </div>
          </div>
        );
      case "지방투자사업":
        return (
          <div className="tab-content">
            <h2>지방투자사업 <span className="guide-subtitle">투자심사 대상 금액 및 절차 기준</span></h2>

            <h3>💰 지방재정 투자심사 대상 금액 기준</h3>
            <table className="content-table">
              <thead>
                <tr>
                  <th>사업 구분</th>
                  <th>자체 심사 기준</th>
                  <th>경기도 심사 기준</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>일반 자체사업</td>
                  <td>전액 자체재원 20억 원 이상</td>
                  <td>-</td>
                  <td>자체재원 기준</td>
                </tr>
                <tr>
                  <td>이전재원 포함 사업</td>
                  <td>-</td>
                  <td>20억 원 이상 ~ 200억 원 미만</td>
                  <td>인구 100만 이상 기준 적용</td>
                </tr>
                <tr>
                  <td>행사성 사업</td>
                  <td>1억 원 이상 ~ 3억 원 미만</td>
                  <td>3억 원 이상 ~ 200억 원 미만</td>
                  <td>축제 및 행사 대상</td>
                </tr>
                <tr>
                  <td>자체 청사·문화시설</td>
                  <td>20억 원 이상 ~ 60억 원 미만</td>
                  <td>60억 원 이상</td>
                  <td>신축사업 기준</td>
                </tr>
              </tbody>
            </table>

            <div className="alert-box">
              <strong>📅 심사 의뢰 시기</strong>
              <p>사업계획 수립 후 기본설계(생략 시 실시설계) 용역 예산안 편성 전에 완료되어야 합니다.</p>
            </div>
          </div>
        );
      case "시설비":
        return (
          <div className="tab-content">
            <h2>시설비 <span className="guide-subtitle">시설비 통계목 이원화 및 단계별 편성 기준</span></h2>

            <h3>📌 2027년도 핵심 개정: 시설비 통계목의 이원화 분리</h3>
            <p>포괄 편성으로 인한 예산의 불용 및 이월을 근절하기 위해 토지매입 및 보상 경비를 시설비에서 완전히 분리해 이력을 관리합니다.</p>

            <div className="structure-box">
              <p><strong>기존:</strong> 시설비 (401-01) 내에 토지매입비, 보상비, 설계비, 공사비 포괄 편성</p>
              <p style={{ textAlign: 'center', color: '#5b9bf0', margin: '12px 0' }}>▼ (2027년도 개편안)</p>
              <p><strong>신설:</strong> 시설공사 보상비 (401-01)</p>
              <p style={{ paddingLeft: '16px', color: 'var(--text-muted)' }}>토지매입비, 지장물보상비, 손실보상비, 감정평가수수료 등</p>
              <p><strong>개정:</strong> 시설비 (401-02)</p>
              <p style={{ paddingLeft: '16px', color: 'var(--text-muted)' }}>기본/실시설계비, 공사비, 시설 안전진단 및 점검비 등</p>
            </div>

            <h3>🚧 시설비 단계별 편성 원칙 (이월·불용 최소화)</h3>
            <p>연도 내에 집행 가능한 실제 사업비만 요구해야 하며, 임의로 단계를 건너뛰어 공사비를 일괄 요구할 수 없습니다.</p>

            <table className="content-table">
              <thead>
                <tr>
                  <th>단계</th>
                  <th>편성 내용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1단계</td>
                  <td>사전조사 및 기본계획 수립, 설계비 요구</td>
                </tr>
                <tr>
                  <td>2단계</td>
                  <td>용지보상비 요구 (설계 완료 단계)</td>
                </tr>
                <tr>
                  <td>3단계</td>
                  <td>보상이 100% 완료(추진)된 시점에 한하여 실제 공사비 요구</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case "자산 취득":
        return (
          <div className="tab-content">
            <h2>자산 취득 <span className="guide-subtitle">주요 물품 정수 승인 및 친환경 원칙</span></h2>

            <h3>📌 주요 물품 및 공용차량 정수 승인 제도</h3>

            <div className="cards-grid">
              <div className="info-card">
                <h4>정의</h4>
                <p>조달청 고시 주요물품(59종) 취득 예산 요구 시 사전에 총괄물품관리관의 승인을 받아 정수를 확보하는 절차입니다.</p>
              </div>
              <div className="info-card">
                <h4>핵심 규칙</h4>
                <p>정수 승인을 득하지 못한 정수대상 물품은 예산 요구서 등록 자체가 불가합니다. 1개월 이상의 공용차량 임차 요구 시에도 사전 정수 승인이 필수적입니다.</p>
              </div>
            </div>

            <div className="content-section-alt">
              <h4>🎯 대표 정수물품 (59종 중 주요 품목)</h4>
              <p>노트북컴퓨터, 에어컨, 냉난방기, 비디오프로젝터, 디지털캠코더 등</p>
            </div>

            <div className="alert-box">
              <strong>🌱 친환경 원칙</strong>
              <p>새로 구매하거나 임차하는 모든 공용차량은 반드시 <strong>친환경차량(저공해자동차)</strong>으로 반영해야 합니다.</p>
            </div>
          </div>
        );
      case "기간제근로자":
        return (
          <div className="tab-content">
            <h2>기간제근로자 <span className="guide-subtitle">채용 사전 승인 및 급여 산정 기준</span></h2>

            <h3>📋 기간제근로자 채용 사전 승인</h3>

            <div className="cards-grid">
              <div className="info-card">
                <h4>정의</h4>
                <p>사업 부서에서 기간제 및 단시간근로자 보수(101-04) 예산을 편성하기 전에 채용의 적정성을 미리 심사받는 단계입니다.</p>
              </div>
              <div className="info-card">
                <h4>담당 부서</h4>
                <p>행정지원과 공공노무팀</p>
              </div>
            </div>

            <h3>⚙️ 채용 승인 기준 및 요령</h3>

            <div className="content-section-alt">
              <h4>1. 우선 배정 대상</h4>
              <p>특정 용역이나 국도비 보조사업 수행, 또는 청사·공원 환경정비 등 필수적인 유지보수 목적에 우선 배정됩니다.</p>
            </div>

            <div className="content-section-alt">
              <h4>2. 제한 대상</h4>
              <p>일상적인 부서 업무의 단순 행정 보조나 상시고용 성격의 채용은 제한됩니다.</p>
            </div>

            <div className="content-section-alt">
              <h4>3. 급여 산정 기준</h4>
              <p>매년 고시되는 화성시 생활임금 단가를 정확히 준수하여 기본급, 주휴수당, 연차수당을 계산해야 합니다.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>사전절차</h1>
        </section>

        <section className="guide-section">
          <div className="guide-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`guide-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="guide-content">
            {renderTabContent()}
          </div>
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');

        .tab-content {
          font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .tab-content h2,
        .tab-content h3,
        .tab-content h4 {
          font-family: 'Noto Sans KR', sans-serif;
        }

        .guide-section {
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .guide-tabs {
          display: flex;
          gap: 0;
          background: var(--bg-elevated);
          border-bottom: 2px solid var(--border);
          overflow-x: auto;
          padding: 0;
          flex-wrap: wrap;
        }

        .guide-tab {
          flex-shrink: 0;
          padding: 16px 32px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--text-muted);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          line-height: 1.4;
        }

        .guide-tab:hover {
          color: var(--text);
          background: rgba(118, 157, 194, 0.08);
        }

        .guide-tab.active {
          color: #5b9bf0;
          border-bottom-color: #5b9bf0;
          font-weight: 700;
        }

        .guide-content {
          padding: 40px;
          min-height: 500px;
          max-width: 1200px;
          background: var(--bg-surface);
          overflow-y: auto;
        }

        .tab-content {
          color: var(--text);
          font-size: 16px;
          line-height: 1.8;
          word-break: keep-all;
        }

        .tab-content h2 {
          font-size: 26px;
          font-weight: 700;
          color: var(--text);
          margin-top: 0;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--border);
        }

        .guide-subtitle {
          font-size: 14px;
          font-weight: 400;
          color: var(--text-muted);
          margin-left: 8px;
        }

        .tab-content h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-top: 20px;
          margin-bottom: 12px;
        }

        .tab-content p {
          margin: 12px 0;
          color: var(--text-muted);
          font-size: 16px;
        }

        .tab-content ul,
        .tab-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }

        .tab-content li {
          margin: 8px 0;
          color: var(--text-muted);
        }

        .breadcrumb {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .info-card {
          padding: 16px;
          background: rgba(118, 157, 194, 0.08);
          border: 1px solid rgba(118, 157, 194, 0.2);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .info-card:hover {
          background: rgba(118, 157, 194, 0.12);
          border-color: rgba(118, 157, 194, 0.4);
        }

        .info-card h4 {
          margin-top: 0;
          margin-bottom: 8px;
          color: #5b9bf0;
          font-size: 16px;
          font-weight: 600;
        }

        .info-card p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }

        .alert-box {
          margin: 20px 0;
          padding: 16px;
          background: rgba(230, 126, 34, 0.1);
          border: 1px solid rgba(230, 126, 34, 0.3);
          border-radius: 4px;
        }

        .alert-box strong {
          color: #e67e22;
        }

        .alert-box p {
          margin: 8px 0 0 0;
        }

        .content-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          border: 1px solid var(--border);
        }

        .content-table th {
          background: rgba(118, 157, 194, 0.1);
          color: var(--text);
          font-weight: 600;
          padding: 12px;
          text-align: left;
          border: 1px solid var(--border);
        }

        .content-table td {
          padding: 12px;
          border: 1px solid var(--border);
          color: var(--text-muted);
        }

        .content-table tr:hover {
          background: rgba(118, 157, 194, 0.05);
        }

        .content-section-alt {
          margin: 16px 0;
          padding: 12px;
          background: transparent;
          border-left: 3px solid #e67e22;
          border-radius: 4px;
        }

        .content-section-alt h4 {
          margin-top: 0;
          margin-bottom: 8px;
          color: #e67e22;
          font-size: 15px;
        }

        .content-section-alt p {
          margin: 0;
          font-size: 14px;
          color: var(--text-muted);
        }

        .rules-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin: 20px 0;
        }

        .rule-item {
          padding: 12px;
          background: rgba(230, 126, 34, 0.08);
          border-left: 3px solid #e67e22;
          border-radius: 4px;
        }

        .rule-item h4 {
          margin-top: 0;
          margin-bottom: 6px;
          color: #e67e22;
          font-size: 15px;
          font-weight: 600;
        }

        .rule-item p {
          margin: 0;
          font-size: 14px;
          color: var(--text-muted);
        }

        .structure-box {
          padding: 16px;
          background: rgba(118, 157, 194, 0.08);
          border: 1px solid rgba(118, 157, 194, 0.2);
          border-radius: 6px;
          margin: 20px 0;
        }

        .structure-box p {
          margin: 8px 0;
          font-size: 14px;
        }

        .structure-box strong {
          color: #5b9bf0;
        }
      `}</style>
    </Layout>
  );
}
