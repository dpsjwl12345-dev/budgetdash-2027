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
            <h2>세입예산 요구 가이드 <span className="guide-subtitle">세외수입 및 이전재원 요구</span></h2>

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
        return <div className="tab-content">행정운영경비 내용 (준비 중)</div>;
      case "보조금·행사":
        return <div className="tab-content">보조금·행사 내용 (준비 중)</div>;
      case "국도비·전환":
        return <div className="tab-content">국도비·전환 내용 (준비 중)</div>;
      case "지방투자사업":
        return <div className="tab-content">지방투자사업 내용 (준비 중)</div>;
      case "시설비":
        return <div className="tab-content">시설비 내용 (준비 중)</div>;
      case "자산 취득":
        return <div className="tab-content">자산 취득 내용 (준비 중)</div>;
      case "기간제근로자":
        return <div className="tab-content">기간제근로자 내용 (준비 중)</div>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading">
          <h1>편성기준 및 사전절차</h1>
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

        .page-heading {
          margin-bottom: 24px;
        }

        .page-heading h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
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
          font-size: 15px;
          line-height: 1.8;
          word-break: keep-all;
        }

        .tab-content h2 {
          font-size: 20px;
          font-weight: 600;
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
          font-size: 15px;
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
          font-size: 14px;
        }

        .info-card p {
          margin: 0;
          font-size: 13px;
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
      `}</style>
    </Layout>
  );
}
