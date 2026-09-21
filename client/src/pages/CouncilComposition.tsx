import { useState } from "react";
import Layout from "@/components/Layout";

type TabKey = "위원회별 의원 현황" | "상임위원회별 소관부서 현황" | "지역구별 의원 현황";

const TABS: { key: TabKey; label: string }[] = [
  { key: "위원회별 의원 현황", label: "위원회별 의원 현황" },
  { key: "상임위원회별 소관부서 현황", label: "상임위원회별 소관부서 현황" },
  { key: "지역구별 의원 현황", label: "지역구별 의원 현황" },
];

type Member = { name: string; phone: string };

type CommitteeKey = "의회운영" | "기획행정" | "경제환경" | "문화체육" | "도시건설" | "보건복지" | "윤리특별";

const COMMITTEE_KEYS: CommitteeKey[] = ["의회운영", "기획행정", "경제환경", "문화체육", "도시건설", "보건복지", "윤리특별"];

type CommitteeRoster = { chair: Member; viceChair: Member; members: Member[] };

const COMMITTEE_ROSTERS: Record<CommitteeKey, CommitteeRoster> = {
  의회운영: {
    chair: { name: "정순영", phone: "010-4135-3573" },
    viceChair: { name: "장동희", phone: "010-6725-9007" },
    members: [
      { name: "고병태", phone: "010-9223-9934" },
      { name: "김기현", phone: "010-2558-0005" },
      { name: "오문섭", phone: "010-5231-3544" },
      { name: "유상희", phone: "010-9516-1028" },
      { name: "이민희", phone: "010-9005-7849" },
    ],
  },
  기획행정: {
    chair: { name: "배현경", phone: "010-2346-1826" },
    viceChair: { name: "정명희", phone: "010-5246-9310" },
    members: [
      { name: "박진섭", phone: "010-8705-0933" },
      { name: "박진희", phone: "010-5539-3119" },
      { name: "유상희", phone: "010-9516-1028" },
      { name: "조정옥", phone: "010-5246-8258" },
    ],
  },
  경제환경: {
    chair: { name: "김상수", phone: "010-2363-8198" },
    viceChair: { name: "이은진", phone: "010-7315-7455" },
    members: [
      { name: "고병태", phone: "010-9223-9934" },
      { name: "김정주", phone: "010-9580-4884" },
      { name: "김창겸", phone: "010-8860-5703" },
      { name: "이민희", phone: "010-9005-7849" },
    ],
  },
  문화체육: {
    chair: { name: "김미영", phone: "010-9119-7664" },
    viceChair: { name: "장철규", phone: "010-8978-4888" },
    members: [
      { name: "신동희", phone: "010-4811-6515" },
      { name: "유지혜", phone: "010-8020-8082" },
      { name: "이남근", phone: "010-5356-1990" },
      { name: "장동희", phone: "010-6725-9007" },
    ],
  },
  도시건설: {
    chair: { name: "김상균", phone: "010-2376-3670" },
    viceChair: { name: "최청환", phone: "010-4703-9066" },
    members: [
      { name: "송현미", phone: "010-9443-0904" },
      { name: "오문섭", phone: "010-5231-3544" },
      { name: "정순영", phone: "010-4135-3573" },
      { name: "최태양", phone: "010-4813-9830" },
    ],
  },
  보건복지: {
    chair: { name: "최은희", phone: "010-7370-0051" },
    viceChair: { name: "권영학", phone: "010-5345-1196" },
    members: [
      { name: "김기현", phone: "010-2558-0005" },
      { name: "신미정", phone: "010-4661-3319" },
      { name: "위영란", phone: "010-7200-3049" },
      { name: "임채덕", phone: "010-5616-1542" },
    ],
  },
  윤리특별: {
    chair: { name: "신동희", phone: "010-4811-6515" },
    viceChair: { name: "박진희", phone: "010-5539-3119" },
    members: [
      { name: "박진섭", phone: "010-8705-0933" },
      { name: "송현미", phone: "010-9443-0904" },
      { name: "최태양", phone: "010-4813-9830" },
    ],
  },
};

const COMMITTEE_MEMBER_ROW_COUNT = Math.max(
  ...COMMITTEE_KEYS.map((key) => COMMITTEE_ROSTERS[key].members.length)
);

type DepartmentGroup = { committee: string; count: number; departments: string[] };

const DEPARTMENT_JURISDICTION: DepartmentGroup[] = [
  {
    committee: "기획행정",
    count: 36,
    departments: [
      "공보실(2과)",
      "감사관",
      "기획조정실(5과)",
      "자치행정국(6과)",
      "재정국(5과)",
      "AI스마트전략실",
      "대외협력사무소",
      "만세구(자치행정과, 민원토지과, 세무1·2과, 현장민원실)",
      "효행구(자치행정과, 민원토지과, 세무과)",
      "병점구(자치행정과, 민원토지과, 세무과)",
      "동탄구(자치행정과, 민원여권과, 세무과)",
      "화성시연구원",
    ],
  },
  {
    committee: "경제환경",
    count: 30,
    departments: [
      "농정해양국(5과)",
      "기업투자실(5과)",
      "기후환경에너지국(5과)",
      "농업기술센터(3과)",
      "맑은물사업소(3과)",
      "만세구(경제교통과, 환경관리과)",
      "효행구(경제환경과)",
      "병점구(경제환경과)",
      "동탄구(경제교통과, 도시환경과)",
      "화성시푸드통합지원센터",
      "화성산업진흥원",
      "화성시환경재단",
    ],
  },
  {
    committee: "문화체육",
    count: 17,
    departments: [
      "문화관광국(4과)",
      "교육체육국(5과)",
      "공원녹지사업소(5과)",
      "화성시문화관광재단",
      "화성시인재육성재단",
      "화성FC",
    ],
  },
  {
    committee: "도시건설",
    count: 30,
    departments: [
      "트램건설추진단",
      "안전건설실(4과)",
      "교통국(5과)",
      "도시정책실(5과)",
      "주택국(4과)",
      "만세구(안전건설과, 도시건축과, 허가민원1·2과)",
      "효행구(안전건설과, 도시건축과)",
      "병점구(안전건설과, 도시건축과)",
      "동탄구(안전건설과, 도시건축과)",
      "화성도시공사",
    ],
  },
  {
    committee: "보건복지",
    count: 26,
    departments: [
      "돌봄복지국(5과)",
      "성평등가족국(5과)",
      "기본사회담당관",
      "만세구보건소(2과)",
      "효행구보건소(2과)",
      "병점구보건소(2과)",
      "동탄구보건소(2과)",
      "만세구(돌봄복지과)",
      "효행구(돌봄복지과)",
      "병점구(돌봄복지과)",
      "동탄구(돌봄복지과, 가정보육과)",
      "화성시복지재단",
      "여성가족청소년재단",
    ],
  },
];

type Party = "더불어민주당" | "국민의힘" | "개혁신당";

type DistrictMember = { district: string; area: string; name: string; committee: string; party: Party };

const DISTRICT_MEMBERS: DistrictMember[] = [
  { district: "가선거구", area: "향남, 양감, 정남", name: "이계철", committee: "의장", party: "더불어민주당" },
  { district: "가선거구", area: "향남, 양감, 정남", name: "최은희", committee: "보건복지", party: "더불어민주당" },
  { district: "가선거구", area: "향남, 양감, 정남", name: "최청환", committee: "도시건설", party: "국민의힘" },
  { district: "나선거구", area: "우정, 팔탄, 장안, 매송, 비봉", name: "김정주", committee: "경제환경", party: "국민의힘" },
  { district: "나선거구", area: "우정, 팔탄, 장안, 매송, 비봉", name: "송현미", committee: "도시건설", party: "더불어민주당" },
  { district: "다선거구", area: "동탄1, 동탄2, 동탄5", name: "박진희", committee: "기획행정", party: "국민의힘" },
  { district: "다선거구", area: "동탄1, 동탄2, 동탄5", name: "이은진", committee: "경제환경", party: "더불어민주당" },
  { district: "다선거구", area: "동탄1, 동탄2, 동탄5", name: "정순영", committee: "운영위·도시건설", party: "더불어민주당" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "김기현", committee: "운영위·보건복지", party: "개혁신당" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "고병태", committee: "운영위·경제환경", party: "더불어민주당" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "장동희", committee: "운영위·문화체육", party: "국민의힘" },
  { district: "라선거구", area: "동탄4, 동탄6, 동탄8", name: "조정옥", committee: "기획행정", party: "더불어민주당" },
  { district: "마선거구", area: "동탄7, 동탄9", name: "김상균", committee: "도시건설", party: "더불어민주당" },
  { district: "마선거구", area: "동탄7, 동탄9", name: "김상수", committee: "경제환경", party: "국민의힘" },
  { district: "마선거구", area: "동탄7, 동탄9", name: "유지혜", committee: "문화체육", party: "더불어민주당" },
  { district: "바선거구", area: "봉담, 기배", name: "김미영", committee: "문화체육", party: "국민의힘" },
  { district: "바선거구", area: "봉담, 기배", name: "배현경", committee: "기획행정", party: "더불어민주당" },
  { district: "바선거구", area: "봉담, 기배", name: "박진섭", committee: "기획행정", party: "국민의힘" },
  { district: "바선거구", area: "봉담, 기배", name: "위영란", committee: "보건복지", party: "더불어민주당" },
  { district: "바선거구", area: "봉담, 기배", name: "최태양", committee: "도시건설", party: "더불어민주당" },
  { district: "사선거구", area: "진안, 병점1·2, 화산동", name: "김창겸", committee: "경제환경", party: "더불어민주당" },
  { district: "사선거구", area: "진안, 병점1·2, 화산동", name: "임채덕", committee: "보건복지", party: "국민의힘" },
  { district: "사선거구", area: "진안, 병점1·2, 화산동", name: "장철규", committee: "문화체육", party: "더불어민주당" },
  { district: "아선거구", area: "반월, 동탄3", name: "신동희", committee: "문화체육", party: "더불어민주당" },
  { district: "아선거구", area: "반월, 동탄3", name: "오문섭", committee: "운영위·도시건설", party: "국민의힘" },
  { district: "자선거구", area: "남양읍, 마도면, 송산면, 서신면, 새솔동", name: "권영학", committee: "보건복지", party: "국민의힘" },
  { district: "자선거구", area: "남양읍, 마도면, 송산면, 서신면, 새솔동", name: "이남근", committee: "문화체육", party: "더불어민주당" },
  { district: "자선거구", area: "남양읍, 마도면, 송산면, 서신면, 새솔동", name: "이민희", committee: "운영위·경제환경", party: "더불어민주당" },
  { district: "비례대표", area: "", name: "신미정", committee: "보건복지", party: "더불어민주당" },
  { district: "비례대표", area: "", name: "유상희", committee: "운영위·기획행정", party: "더불어민주당" },
  { district: "비례대표", area: "", name: "정명희", committee: "기획행정", party: "국민의힘" },
];

function partyColor(party: Party): string {
  if (party === "더불어민주당") return "#5b9bf0";
  if (party === "국민의힘") return "#ff6b7d";
  return "#d9ad52";
}

// 같은 선거구가 연속으로 이어지는 첫 행에서만 몇 줄을 합칠지(rowSpan) 계산한다.
function groupRowSpans(rows: { district: string }[]): (number | null)[] {
  const spans: (number | null)[] = new Array(rows.length).fill(null);
  let groupStart = 0;
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i].district !== rows[groupStart].district) {
      spans[groupStart] = i - groupStart;
      groupStart = i;
    }
  }
  return spans;
}

const districtRowSpans = groupRowSpans(DISTRICT_MEMBERS);
const districtAreaByGroup = DISTRICT_MEMBERS.reduce<Record<string, string>>((acc, row) => {
  if (!(row.district in acc)) acc[row.district] = row.area;
  return acc;
}, {});

export default function CouncilComposition() {
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0].key);

  return (
    <Layout highlightScope={activeTab}>
      <div className="page-content">
        <section className="page-heading" style={{ marginBottom: "12px" }}>
          <div className="title-area">
            <div className="title-wrapper" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0px" }}>
              <h1>제10대 화성시의회 전반기 원구성 현황</h1>
            </div>
            <div className="cc-summary-box">
              <div>의장: 이계철 (010-3361-8282) &nbsp;/&nbsp; 부의장: 임채덕 (010-5616-1542)</div>
              <div className="cc-summary-sub">26. 7. 3. 기준</div>
            </div>
          </div>
        </section>

        <section className="cc-section">
          <div className="cc-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`cc-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="cc-content">
            {activeTab === "위원회별 의원 현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table">
                  <thead>
                    <tr>
                      <th>구분</th>
                      {COMMITTEE_KEYS.map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="cc-role-cell">위원장</td>
                      {COMMITTEE_KEYS.map((key) => {
                        const m = COMMITTEE_ROSTERS[key].chair;
                        return (
                          <td key={key} className="cc-member-cell">
                            <div className="cc-member-name">{m.name}</div>
                            <div className="cc-member-phone">{m.phone}</div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="cc-role-cell">부위원장</td>
                      {COMMITTEE_KEYS.map((key) => {
                        const m = COMMITTEE_ROSTERS[key].viceChair;
                        return (
                          <td key={key} className="cc-member-cell">
                            <div className="cc-member-name">{m.name}</div>
                            <div className="cc-member-phone">{m.phone}</div>
                          </td>
                        );
                      })}
                    </tr>
                    {Array.from({ length: COMMITTEE_MEMBER_ROW_COUNT }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {rowIndex === 0 && (
                          <td className="cc-role-cell" rowSpan={COMMITTEE_MEMBER_ROW_COUNT}>
                            위원
                          </td>
                        )}
                        {COMMITTEE_KEYS.map((key) => {
                          const m = COMMITTEE_ROSTERS[key].members[rowIndex];
                          return (
                            <td key={key} className="cc-member-cell">
                              {m && (
                                <>
                                  <div className="cc-member-name">{m.name}</div>
                                  <div className="cc-member-phone">{m.phone}</div>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "상임위원회별 소관부서 현황" && (
              <div className="cc-dept-grid">
                {DEPARTMENT_JURISDICTION.map((group) => (
                  <div key={group.committee} className="cc-dept-card">
                    <div className="cc-dept-card-title">
                      {group.committee} <span className="cc-dept-count">({group.count})</span>
                    </div>
                    <ul className="cc-dept-list">
                      {group.departments.map((dept, i) => (
                        <li key={i}>{dept}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "지역구별 의원 현황" && (
              <div className="cc-table-wrap">
                <table className="cc-table cc-district-table">
                  <thead>
                    <tr>
                      <th>선거구</th>
                      <th>성명</th>
                      <th>위원회</th>
                      <th>정당명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISTRICT_MEMBERS.map((row, i) => (
                      <tr key={i}>
                        {districtRowSpans[i] && (
                          <td className="cc-district-cell" rowSpan={districtRowSpans[i] as number}>
                            <div className="cc-district-name">{row.district}</div>
                            {districtAreaByGroup[row.district] && (
                              <div className="cc-district-area">{districtAreaByGroup[row.district]}</div>
                            )}
                          </td>
                        )}
                        <td>{row.name}</td>
                        <td>{row.committee}</td>
                        <td>
                          <span className="cc-party-badge" style={{ color: partyColor(row.party) }}>
                            {row.party}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .cc-summary-box {
          border: 1px solid rgba(217, 173, 82, 0.35);
          border-left: 3px solid #d9ad52;
          border-radius: 6px;
          background: rgba(217, 173, 82, 0.06);
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.6;
        }

        .cc-summary-sub {
          margin-top: 2px;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-muted);
        }

        .cc-section {
          background: var(--bg-surface);
          border-radius: 8px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-top: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .cc-tabs {
          display: flex;
          gap: 0;
          background: var(--bg-elevated);
          border-bottom: 2px solid var(--border);
          overflow-x: auto;
          padding: 0;
          flex-wrap: wrap;
        }

        .cc-tab {
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

        .cc-tab:hover {
          color: var(--text);
          background: rgba(118, 157, 194, 0.08);
        }

        .cc-tab.active {
          color: #5b9bf0;
          border-bottom-color: #5b9bf0;
          font-weight: 700;
        }

        .cc-content {
          padding: 40px;
          min-height: 500px;
          background: var(--bg-surface);
        }

        .cc-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 6px;
        }

        .cc-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          font-size: 14px;
        }

        .cc-table th,
        .cc-table td {
          border: 1px solid var(--border);
          padding: 10px 12px;
          text-align: center;
          vertical-align: middle;
        }

        .cc-table thead th {
          background: rgba(126, 231, 187, 0.16);
          color: var(--text);
          font-size: 15px;
          font-weight: 400;
          white-space: nowrap;
        }

        .cc-role-cell {
          font-weight: 700;
          background: rgba(217, 173, 82, 0.1);
          white-space: nowrap;
        }

        .cc-member-cell {
          min-width: 100px;
        }

        .cc-member-name {
          font-weight: 600;
        }

        .cc-member-phone {
          margin-top: 2px;
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .cc-table tbody tr:nth-child(even) {
          background: rgba(118, 157, 194, 0.04);
        }

        .cc-dept-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .cc-dept-card {
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg-elevated);
          padding: 16px 18px;
        }

        .cc-dept-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(126, 231, 187, 0.3);
        }

        .cc-dept-count {
          font-weight: 400;
          color: var(--text-muted);
        }

        .cc-dept-list {
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 13px;
          color: var(--text);
          line-height: 1.8;
        }

        .cc-dept-list li {
          padding-left: 12px;
          position: relative;
        }

        .cc-dept-list li::before {
          content: "○";
          position: absolute;
          left: 0;
          font-size: 10px;
          color: var(--text-muted);
        }

        .cc-district-table td:nth-child(2) {
          font-weight: 600;
        }

        .cc-district-cell {
          white-space: nowrap;
        }

        .cc-district-name {
          font-weight: 700;
        }

        .cc-district-area {
          margin-top: 2px;
          font-size: 11px;
          color: var(--text-muted);
          white-space: normal;
        }

        .cc-party-badge {
          font-weight: 700;
        }
      `}</style>
    </Layout>
  );
}
