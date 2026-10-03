// 추경 세출예산내역서(엑셀) 읽기.
//
// 예산 시스템에서 뽑은 "세 출 예 산 내 역 서" 엑셀(PDF를 변환한 형태, 쪽마다 시트 하나)을 읽어
// 세부사업·통계목별 [예산액(추경 반영 후) / 기정 예산액(그 회차 추경 직전) / 비교증감]을 뽑는다.
// 추경 내역서에는 그 회차에 바뀐 항목만 실려 있다.
import * as XLSX from "xlsx";

export interface SupplementaryProgram {
  name: string;
  amount: number;
  previous: number;
  difference: number;
}

export interface SupplementaryItem {
  program: string;
  stat: string; // 통계목명 (앞의 번호 포함, 예: "01 출연금")
  amount: number;
  previous: number;
  difference: number;
}

export interface SupplementaryReport {
  department: string;
  round: number;
  accountName: string;
  fileName: string;
  totalAmount: number | null;
  totalPrevious: number | null;
  programs: SupplementaryProgram[];
  items: SupplementaryItem[];
}

// "△1,722" / "-1,722" / "(1,722)" → -1722, "14,470,173" → 14470173, 빈 칸 → null
function readAmount(value: unknown): number | null {
  const text = String(value ?? "").replace(/\s/g, "");
  if (!text) return null;
  const negative = /^[△▽▼−-]/.test(text) || /^\(.*\)$/.test(text);
  const digits = text.replace(/[^0-9.]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  if (Number.isNaN(amount)) return null;
  return negative && amount ? -amount : amount;
}

// 이름 비교용: 공백·가운뎃점·따옴표 차이를 무시한다.
export function normalizeSupplementaryName(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[·ㆍ・.,]/g, "")
    .replace(/['"‘’“”]/g, "");
}

// 통계목명 비교용: 앞의 번호("01 ")를 떼고 공백을 지운다.
export function normalizeSupplementaryStat(value: string): string {
  return normalizeSupplementaryName(String(value ?? "").replace(/^\s*\d+\s*/, ""));
}

function readHeaderField(headText: string, label: string): string | null {
  const match = headText.match(new RegExp(`${label}\\s*:\\s*([^\\n]+)`));
  return match ? match[1].trim() : null;
}

// 열 제목은 "예 산 액"처럼 글자 사이에 공백이 섞여 있어도 찾도록 공백을 지우고 비교한다.
const compact = (value: unknown) => String(value ?? "").replace(/\s+/g, "");

export function parseSupplementaryWorkbook(workbook: XLSX.WorkBook, fileName: string): SupplementaryReport {
  const programs: SupplementaryProgram[] = [];
  const items: SupplementaryItem[] = [];
  let department = "";
  let round = 0;
  let accountName = "";
  let totalAmount: number | null = null;
  let totalPrevious: number | null = null;

  // 쪽(시트)이 여러 장이든 한 장이든 같은 방식으로 읽는다. 세부사업 이름은 쪽을 넘어 이어서 기억한다.
  let currentProgram = "";

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
    const headerIndex = rows.findIndex((row) => row.some((cell) => compact(cell) === "예산액"));
    if (headerIndex === -1) continue;
    const header = rows[headerIndex];

    // 금액 열 위치는 파일마다 다르므로(칸이 하나씩 벌어진 파일도 있다) 열 제목으로 찾는다.
    const amountCol = header.findIndex((cell) => compact(cell) === "예산액");
    let previousCol = header.findIndex((cell) => compact(cell) === "기정예산액");
    if (previousCol < 0) previousCol = amountCol + 1;
    let differenceCol = header.findIndex((cell) => compact(cell) === "비교증감");
    if (differenceCol < 0) differenceCol = previousCol + 1;
    let statCol = header.findIndex((cell) => compact(cell) === "산출근거");
    if (statCol < 0) statCol = differenceCol + 1;

    // 머리글(부서·회계명·추경 회차)은 있으면 쓰고, 없으면 아래에서 표 안의 부서 줄로 채운다.
    const headText = rows.slice(0, headerIndex).map((row) => String(row[0] ?? "")).join("\n");
    if (!department) department = readHeaderField(headText, "부\\s*서") ?? "";
    if (!accountName) accountName = readHeaderField(headText, "회\\s*계\\s*명") ?? "";
    if (!round) {
      const roundMatch = headText.match(/추경\s*(\d+)\s*회/);
      if (roundMatch) round = Number(roundMatch[1]);
    }

    for (const row of rows.slice(headerIndex + 1)) {
      const labelIndex = row.slice(0, amountCol).findIndex((cell) => String(cell ?? "").trim() !== "");
      const amount = readAmount(row[amountCol]);
      const previous = readAmount(row[previousCol]);
      const difference = readAmount(row[differenceCol]);
      if (amount === null) continue;

      if (labelIndex >= 0) {
        // 라벨이 놓인 칸이 금액 칸에서 얼마나 떨어졌는지로 계층을 안다
        // (1=편성목, 2=세부사업, 3=단위, 4=정책, 5 이상=총계/부서).
        const level = amountCol - labelIndex;
        const name = String(row[labelIndex]).trim();
        if (level >= 5) {
          if (compact(name) === "총계") {
            totalAmount = amount;
            totalPrevious = previous;
          } else if (!department) {
            department = name;
          }
        } else if (level === 2) {
          currentProgram = name;
          programs.push({ name, amount, previous: previous ?? 0, difference: difference ?? 0 });
        }
      } else {
        // 라벨 칸이 모두 비어 있고 산출근거 칸에 통계목명이 있으면 통계목 합계 줄
        const stat = String(row[statCol] ?? "").trim();
        if (stat && currentProgram) {
          items.push({ program: currentProgram, stat, amount, previous: previous ?? 0, difference: difference ?? 0 });
        }
      }
    }
  }

  return { department, round, accountName, fileName, totalAmount, totalPrevious, programs, items };
}

export async function readSupplementaryFile(file: File): Promise<SupplementaryReport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return parseSupplementaryWorkbook(workbook, file.name);
}
