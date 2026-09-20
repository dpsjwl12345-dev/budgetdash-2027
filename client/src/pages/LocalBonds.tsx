import Layout from "@/components/Layout";

type LocalBondRow = {
  department: string;
  projectName: string;
  statisticsItem: string;
  issueAmount: string;
  subjectRevisionTarget: string;
};

const LOCAL_BOND_DATA: LocalBondRow[] = [
  { department: "관광진흥과", projectName: "서해안 황금해안길 조성사업(자체)", statisticsItem: "시설비", issueAmount: "6,720,000", subjectRevisionTarget: "6,780,000" },
  { department: "관광진흥과", projectName: "제부도 도시계획도로 중로2-3호선 외 3개소 개설", statisticsItem: "시설비", issueAmount: "7,898,000", subjectRevisionTarget: "3,000,000" },
  { department: "관광진흥과", projectName: "고렴산 해상공원 조성", statisticsItem: "공기관등에대한자본적위탁사업비", issueAmount: "4,500,000", subjectRevisionTarget: "0" },
  { department: "체육진흥과", projectName: "남양 체육복합센터 조성", statisticsItem: "시설비", issueAmount: "2,490,457", subjectRevisionTarget: "2,490,457" },
  { department: "체육진흥과", projectName: "장안 다목적복합센터 건립", statisticsItem: "시설비", issueAmount: "2,270,076", subjectRevisionTarget: "2,270,076" },
  { department: "문화예술과", projectName: "시립미술관 건립", statisticsItem: "시설비", issueAmount: "8,214,000", subjectRevisionTarget: "0" },
  { department: "문화예술과", projectName: "화성예술의전당 조성 및 운영", statisticsItem: "시설비", issueAmount: "2,028,000", subjectRevisionTarget: "0" },
  { department: "도서관정책과", projectName: "(가칭)화성시 독서문화공간 조성(전환사업)", statisticsItem: "시설비", issueAmount: "6,100,000", subjectRevisionTarget: "0" },
  { department: "철도전략과", projectName: "동탄인덕원선 복선전철 건설사업", statisticsItem: "공기관등에대한자본적위탁사업비", issueAmount: "20,503,000", subjectRevisionTarget: "5,000,000" },
  { department: "철도전략과", projectName: "동탄인덕원선 인입선 역사 신설", statisticsItem: "공기관등에대한자본적위탁사업비", issueAmount: "20,000,000", subjectRevisionTarget: "20,000,000" },
  { department: "공공건축과", projectName: "남양읍 행정복지센터 건립", statisticsItem: "시설비", issueAmount: "12,500,000", subjectRevisionTarget: "8,500,000" },
  { department: "공공건축과", projectName: "화성시의회 청사 건립", statisticsItem: "시설비", issueAmount: "15,772,000", subjectRevisionTarget: "15,772,000" },
  { department: "보타닉가든추진단", projectName: "동부권 공공정원화 사업", statisticsItem: "시설비", issueAmount: "1,762,000", subjectRevisionTarget: "1,762,000" },
  { department: "보타닉가든추진단", projectName: "여울공원 전시온실(식물원) 건립", statisticsItem: "시설비", issueAmount: "14,390,000", subjectRevisionTarget: "14,390,000" },
  { department: "보타닉가든추진단", projectName: "우리꽃식물원 확장사업", statisticsItem: "시설비", issueAmount: "4,264,540", subjectRevisionTarget: "0" },
  { department: "농식품유통과", projectName: "재단법인 화성푸드통합지원센터 청사 건립", statisticsItem: "시설비", issueAmount: "4,500,000", subjectRevisionTarget: "4,600,000" },
  { department: "복지정책과", projectName: "북부종합사회복지관 건립", statisticsItem: "시설비", issueAmount: "4,500,000", subjectRevisionTarget: "4,500,000" },
  { department: "도로과", projectName: "국도1호선 병점사거리 개선사업", statisticsItem: "시설비", issueAmount: "2,700,000", subjectRevisionTarget: "2,800,000" },
  { department: "도로과", projectName: "수기-분천간 도로확포장공사", statisticsItem: "시설비", issueAmount: "6,450,000", subjectRevisionTarget: "4,200,000" },
  { department: "도로과", projectName: "시도15호선 도로확포장공사(2구간)", statisticsItem: "시설비", issueAmount: "-", subjectRevisionTarget: "2,000,000" },
  { department: "도로과", projectName: "시도31호선 도로확포장공사", statisticsItem: "시설비", issueAmount: "3,000,000", subjectRevisionTarget: "3,000,000" },
  { department: "도로과", projectName: "양노리 도로확포장공사", statisticsItem: "시설비", issueAmount: "3,000,000", subjectRevisionTarget: "3,240,000" },
  { department: "공원조성과", projectName: "새솔동 시화 친수공간 특화 조성(2단계)", statisticsItem: "시설비", issueAmount: "1,200,000", subjectRevisionTarget: "2,561,000" },
];

export default function LocalBonds() {
  return (
    <Layout>
      <div className="page-content">
        <section className="page-heading" style={{ marginBottom: "12px" }}>
          <div className="title-area">
            <div className="title-wrapper" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0px" }}>
              <h1>지방채 발행사업 현황관리</h1>
            </div>
          </div>
        </section>

        <section className="bond-table-wrap">
          <table className="bond-table">
            <thead>
              <tr>
                <th rowSpan={2}>연번</th>
                <th rowSpan={2}>부서명</th>
                <th rowSpan={2}>세부사업명</th>
                <th rowSpan={2}>통계목명</th>
                <th rowSpan={2}>발행액</th>
                <th rowSpan={2}>총사업비</th>
                <th colSpan={2}>예산 집행액(지방채 편성액 기준)</th>
                <th rowSpan={2}>
                  공사 단계
                  <div className="bond-th-sub">(26. 9. 기준)</div>
                </th>
                <th rowSpan={2}>
                  전체 공정률
                  <div className="bond-th-sub">(현단계 공정률)</div>
                </th>
                <th rowSpan={2}>지출 관련 계획</th>
                <th colSpan={2}>과목경정</th>
                <th rowSpan={2}>
                  본예산
                  <div className="bond-th-sub">편성여부</div>
                </th>
                <th colSpan={2}>편성액</th>
                <th rowSpan={2}>상환시기</th>
              </tr>
              <tr>
                <th>원인행위액</th>
                <th>지출액</th>
                <th>대상금액</th>
                <th>완료 여부</th>
                <th>원금</th>
                <th>이자</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bond-total-row">
                <td colSpan={4}>합계</td>
                <td className="bond-num">154,762,073</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="bond-num">106,865,533</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              {LOCAL_BOND_DATA.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{row.department}</td>
                  <td className="bond-project-cell">{row.projectName}</td>
                  <td>{row.statisticsItem}</td>
                  <td className="bond-num">{row.issueAmount}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="bond-num">{row.subjectRevisionTarget}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <style>{`
        .bond-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 6px;
          margin-top: 20px;
        }

        .bond-table {
          width: 100%;
          min-width: 1400px;
          border-collapse: collapse;
          font-size: 13px;
        }

        .bond-table th,
        .bond-table td {
          border: 1px solid var(--border);
          padding: 10px 12px;
          text-align: center;
          vertical-align: middle;
        }

        .bond-table thead th {
          background: rgba(126, 231, 187, 0.16);
          color: var(--text);
          font-size: 15px;
          font-weight: 400;
          white-space: nowrap;
        }

        .bond-th-sub {
          font-weight: 400;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
          white-space: nowrap;
        }

        .bond-empty {
          padding: 32px;
          color: var(--text-muted);
        }

        .bond-table td.bond-project-cell {
          text-align: left;
          min-width: 220px;
          white-space: normal;
        }

        .bond-table td.bond-num {
          text-align: right;
          white-space: nowrap;
        }

        .bond-table tbody tr:nth-child(even) {
          background: rgba(118, 157, 194, 0.04);
        }

        .bond-total-row {
          font-weight: 700;
          background: rgba(217, 173, 82, 0.1) !important;
        }
      `}</style>
    </Layout>
  );
}
