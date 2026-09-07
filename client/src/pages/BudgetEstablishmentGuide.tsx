import { useState } from "react";
import Layout from "@/components/Layout";

type TabKey = "세입예산" | "행정운영경비" | "보조금·행사" | "국도비·전환" | "지방투자사업" | "시설비" | "자산 취득" | "기간제근로자";

const TABS: { key: TabKey; label: string }[] = [
  { key: "세입예산", label: "세입예산" },
  { key: "행정운영경비", label: "행정운영경비" },
  { key: "보조금·행사", label: "보조금·행사" },
  { key: "국도비·전환", label: "국도비·전환" },
  { key: "지방투자사업", label: "지방투자사업" },
  { key: "시설비", label: "시설비" },
  { key: "자산 취득", label: "자산 취득" },
  { key: "기간제근로자", label: "기간제근로자" },
];

export default function BudgetEstablishmentGuide() {
  const [activeTab, setActiveTab] = useState<TabKey>("세입예산");

  const renderTabContent = () => {
    switch (activeTab) {
      case "세입예산":
        return (
          <div className="tab-content">
            <h2>세입예산 <span className="guide-subtitle">세외수입 및 이전재원 요구</span></h2>

            <h3>📌 세입 분류별 핵심 정의</h3>
            <div className="cards-grid">
              <div className="info-card">
                <h4>지방세</h4>
                <p>최근 5년간의 징수 추이와 현년도 세수여건 등을 종합 분석하여 요구합니다.</p>
              </div>
              <div className="info-card">
                <h4>세외수입</h4>
                <p>자치단체 자체 수입으로, 요구 전에 반드시 세정과(세외수입관리팀)와 재정합의를 거쳐야 합니다.</p>
              </div>
              <div className="info-card">
                <h4>보조금 반환수입</h4>
                <p>지난 연도 지방보조금 및 위탁비 정산 잔액과 이자 수입입니다.</p>
              </div>
            </div>

            <div className="alert-box">
              <strong>🚨 [필수 선행]</strong>
              <p>세입 요구 전 반드시 세정과 주관으로 시장님 보고 및 결재를 완료해야 합니다.</p>
            </div>

            <div className="alert-box">
              <strong>🚨 [작성 주체]</strong>
              <p>재배정 사업을 포함하여, 실제 세출 예산을 편성하여 집행했던 사업 부서가 직접 세입 예산으로 요구해야 합니다.</p>
            </div>

            <h3>📝 세외수입 실무 검토 팁</h3>
            <table className="content-table">
              <thead>
                <tr>
                  <th>세입 목</th>
                  <th>산출 및 요구 기준</th>
                  <th>e호조 입력 시 유의사항</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>토지 임대</td>
                  <td>• 공시지가 기준 산출</td>
                  <td>무상임대 경과 재산은 유상임대로 즉시 전환</td>
                </tr>
                <tr>
                  <td>사용료·수수료</td>
                  <td>• 징수 실적 및 2027년 특수요인 분석 반영</td>
                  <td>사용료·수수료 현실화 계획 마련 및 조례 검토</td>
                </tr>
                <tr>
                  <td>재산 매각</td>
                  <td>• 공유재산관리계획 처분 승인액 반영</td>
                  <td>분할 납부 시 당해 연도 분입 예정액만 계상</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case "행정운영경비":
        return (
          <div className="tab-content">
            <h2>행정운영경비 및 기본경비 요구가이드 <span className="guide-subtitle">기본경비 및 급식·여비 기준</span></h2>

            <h3>📌 핵심 개념 정의</h3>
            <div className="cards-grid">
              <div className="info-card">
                <h4>행정운영경비</h4>
                <p>부서의 기본적인 조직 유지와 인력 운영을 위한 공통 경비입니다.</p>
              </div>
              <div className="info-card">
                <h4>인력운영비</h4>
                <p>소속 직원의 보수 및 법정부담금으로, 행안부 기준인건비 범위 내에서만 편성합니다. 2026년 8월 말 정원과 2026년도 봉급표가 적용 기준입니다.</p>
              </div>
            </div>

            <div className="alert-box">
              <strong>🚨 화면 안내</strong>
              <p>세부사업 등록 시 세부사업명 옆에 <strong>[행정운영경비(OO과)]</strong>를 명시하고, 기타(900) 비목으로 분류해 부서 간 상호 구분되도록 해야 합니다.</p>
            </div>

            <h3>💰 2027년도 부서 기본경비 기준 단가표</h3>
            <div style={{ padding: '16px', background: 'rgba(118, 157, 194, 0.08)', borderRadius: '6px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: 'var(--text)' }}>부서 정원당 배분액</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#5b9bf0', fontWeight: '600' }}>일반수용비</p>
                  <p style={{ margin: '0', fontSize: '14px', color: 'var(--text-muted)' }}>750,000원/명</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#5b9bf0', fontWeight: '600' }}>급식비</p>
                  <p style={{ margin: '0', fontSize: '14px', color: 'var(--text-muted)' }}>600,000원/명</p>
                </div>
              </div>
            </div>

            <h3>📝 편성 및 지급 기준</h3>
            <table className="content-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>편성 및 지급 기준</th>
                  <th>e호조 입력 표준 수식 예시</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>관내여비</td>
                  <td>• 1일 20,000원 (월 9일 기준 편성)</td>
                  <td>20,000원 × 공무원현원 × 9일 × 12월</td>
                </tr>
                <tr>
                  <td>월액여비</td>
                  <td>• 상시출장자 대상 월 225,000원 한도</td>
                  <td>225,000원 × 대상자수 × 12월</td>
                </tr>
                <tr>
                  <td>특근매식비</td>
                  <td>• 기본업무 수행용 급식비 단가 기준</td>
                  <td>600,000원 × 부서 정원</td>
                </tr>
                <tr>
                  <td>위원회 수당</td>
                  <td>• 대면: 1회 100,000원 (2시간 초과 시 50,000원 추가)<br/>• 서면: 1회 50,000원</td>
                  <td>100,000원 × 위원수 × 횟수<br/>50,000원 × 위원수 × 횟수</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case "보조금·행사":
        return (
          <div className="tab-content">
            <h2>지방보조금 및 행사 <span className="guide-subtitle">민간보조금 한도 관리 및 평가 환류</span></h2>

            <h3>📌 핵심 개념 정의</h3>
            <div className="cards-grid">
              <div className="info-card">
                <h4>지방보조금</h4>
                <p>민간이나 시설의 기본 운영 또는 공익사업 수행을 지원하기 위해 지자체가 교부하는 예산입니다.</p>
              </div>
              <div className="info-card">
                <h4>민간단체 법정운영비 보조</h4>
                <p>명시적 법령 근거가 있는 경우에 한하여 인건비, 사무관리비, 임차료 등으로 범위를 엄격히 제한하여 편성하며, 포괄적 지원은 절대 불가합니다.</p>
              </div>
            </div>

            <div className="alert-box">
              <strong>🚨 2027 한도액</strong>
              <p>화성시 총 보조금 한도액은 1,094억 원(예상) 범위 내에서 관리됩니다.</p>
            </div>

            <h3>⚠️ 평가 부진 사업의 예산 삭감 및 페널티 기준</h3>
            <table className="content-table">
              <thead>
                <tr>
                  <th>평가 결과</th>
                  <th>조치 방안</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>성과평가 미흡 (60점 미만)</td>
                  <td>예산 삭감 검토 (최대 50% 감액)</td>
                </tr>
                <tr>
                  <td>유지필요성 미흡 (60점 미만)</td>
                  <td>원칙적으로 사업 폐지</td>
                </tr>
                <tr>
                  <td>집행률 부진 (집행률 70% 미만)</td>
                  <td>다음 연도 예산 요구 시 삭감 검토</td>
                </tr>
              </tbody>
            </table>

            <h3>🎪 행사·축제 예산 필수 규칙</h3>
            <div className="content-section-alt">
              <h4>시 주관 행사 보조금 편성 금지</h4>
              <p>시가 사실상 주관하는 행사는 보조금(민간행사사업보조)으로 우회 편성할 수 없으며, 반드시 행사운영비(201-03)로 세출 직접 편성 후 집행해야 합니다.</p>
            </div>

            <div className="content-section-alt">
              <h4>행사 차출 공무원 실비</h4>
              <p>휴일에 행사 지원으로 차출된 공무원 경비는 시간외수당 대신 사무관리비(201-01) 내 행사차출경비로 편성합니다.</p>
              <p style={{ fontSize: '13px', color: '#e67e22', marginTop: '8px' }}>• 반일 4시간 이하: 6만 원<br/>• 4시간 초과 시 1일 최대 12만 원</p>
            </div>
          </div>
        );
      case "국도비·전환":
        return (
          <div className="tab-content">
            <h2>국·도비 및 전환사업 <span className="guide-subtitle">매칭 비율 및 전환사업 독립 편성</span></h2>

            <h3>📌 핵심 개념 정의</h3>
            <div className="cards-grid">
              <div className="info-card">
                <h4>국·도비 보조사업</h4>
                <p>중앙정부나 도로부터 재원을 지원받아 시비와 매칭하여 추진하는 사업입니다.</p>
              </div>
              <div className="info-card">
                <h4>전환사업</h4>
                <p>국가에서 지방으로 사무와 재원이 이전되어 지방세 재원으로 추진하는 사업입니다.</p>
              </div>
            </div>

            <h3>🚨 매칭 및 편성 실무 규칙</h3>
            <div className="rules-container">
              <div className="rule-item">
                <h4>공모·신청 전 필수 절차</h4>
                <p>의무적 매칭을 제외한 국도비 신청 전 "예산재정과 재정합의" 완료</p>
              </div>
              <div className="rule-item">
                <h4>시비 매칭 한도 제한</h4>
                <p>정해진 매칭 비율 외 추가 시비 증액 편성 금지 (자체 추가 요구 시 별도 사업 분리)</p>
              </div>
              <div className="rule-item">
                <h4>전환사업 단독 분리</h4>
                <p>전환사업은 일반 사업과 섞지 않고 "단독 세부사업 단위"로 완전히 분리 편성</p>
              </div>
            </div>

            <div className="alert-box">
              <strong>📋 e호조 입력 매뉴얼</strong>
              <p>전환사업 등록 시 시스템 내 '전환사업 여부', '단계', '기존 국고내역명' 속성을 반드시 누락 없이 체크해야 합니다.</p>
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
          <h1>사전절차 및 편성기준</h1>
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
          padding: 14px 18px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--text-muted);
          font-size: 15px;
          font-weight: 500;
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
          font-weight: 600;
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
