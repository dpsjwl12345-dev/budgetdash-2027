import Layout from "@/components/Layout";
import CitywideBudgetOverview from "@/components/CitywideBudgetOverview";

// 사이트 접속 시 가장 먼저 보이는 초기 화면. "부서예산요구"(개별 부서 편성 작업 화면)와는
// 별개의 화면으로, 시 전체 세입세출 요구 현황(예산재정과 보고 스냅샷)만 보여준다.
export default function CityOverview() {
  return (
    <Layout>
      <div className="page-content">
        <CitywideBudgetOverview />
      </div>
    </Layout>
  );
}
