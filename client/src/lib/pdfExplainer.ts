import * as pdfjsLib from 'pdfjs-dist';

// pdfjs-dist 6.x부터 워커가 .mjs(ESM)로만 배포된다 (.js는 cdnjs에 없어 404 발생).
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export type SectionKey = '예산총괄표' | '사업설명서' | '편성현황';

export type MaterialSection = {
  title: SectionKey;
  content: string;
};

export type ProgramMaterial = {
  policy: string;
  unit: string;
  detail: string;
  sections: Record<SectionKey, string>;
};

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// 실제 PDF 원문은 "예산 총괄표"(공백 포함)/"사업설명서"로 표기되는 경우가 대부분이라
// 공백 유무와 사업명세서/사업설명서 표기 차이를 모두 인식한다.
const SECTION_PATTERNS: { key: SectionKey; pattern: RegExp }[] = [
  { key: '예산총괄표', pattern: /예산\s*총괄표/ },
  { key: '사업설명서', pattern: /사업\s*(?:설명서|명세서)/ },
  { key: '편성현황', pattern: /편성\s*현황/ },
];

export function splitIntoSections(text: string): MaterialSection[] {
  const sections: MaterialSection[] = [];

  const positions = SECTION_PATTERNS.map(({ key, pattern }) => {
    const match = pattern.exec(text);
    return { title: key, index: match ? match.index : -1 };
  }).filter((p) => p.index !== -1);

  positions.sort((a, b) => a.index - b.index);

  for (let i = 0; i < positions.length; i++) {
    const startPos = positions[i].index;
    const endPos = i < positions.length - 1 ? positions[i + 1].index : text.length;
    sections.push({
      title: positions[i].title,
      content: text.substring(startPos, endPos).trim(),
    });
  }

  return sections;
}

// 부서 전체 설명자료 PDF는 세부사업마다 "세 출 예 산" 블록이 반복되고, 각 블록은
// "페이지 {세부사업명} 정책사업 {정책명} 단위사업 {단위명} □ 예산 총괄표 ..." 순서로
// 나온다(브라우저 pdf.js 추출 순서 기준 — 화면에 보이는 순서와 다르다는 점 주의).
// "세 출 예 산"으로 블록 경계를 먼저 확정한 뒤 그 안에서만 정책/단위/세부를 뽑아야
// 특정 블록에 "예산 총괄표" 표기가 없을 때 다음 블록까지 잘못 삼키는 걸 막을 수 있다.
export function extractProgramBlocks(text: string): ProgramMaterial[] {
  const blockMarker = /세\s*출\s*예\s*산/g;
  const starts: number[] = [];
  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = blockMarker.exec(text)) !== null) {
    starts.push(markerMatch.index);
  }

  if (starts.length === 0) return [];

  const results: ProgramMaterial[] = [];

  for (let i = 0; i < starts.length; i++) {
    const chunk = text.slice(starts[i], i < starts.length - 1 ? starts[i + 1] : text.length);

    const detailMatch = /페이지\s+([\s\S]+?)\s*정책사업\s+/.exec(chunk);
    const policyMatch = /정책사업\s+([\s\S]+?)\s*단위사업\s+/.exec(chunk);
    const unitMatch =
      /단위사업\s+([\s\S]+?)\s*□?\s*(?:예산\s*총괄표)/.exec(chunk) ||
      /단위사업\s+([\s\S]+?)\s*□/.exec(chunk);

    if (!detailMatch || !policyMatch || !unitMatch) continue;

    const detail = detailMatch[1].trim();
    const policy = policyMatch[1].trim();
    const unit = unitMatch[1].trim();
    if (!detail || !policy || !unit) continue;

    const sections = splitIntoSections(chunk);
    const sectionMap: Record<SectionKey, string> = {
      예산총괄표: '',
      사업설명서: '',
      편성현황: '',
    };
    sections.forEach((s) => {
      sectionMap[s.title] = s.content;
    });

    results.push({ policy, unit, detail, sections: sectionMap });
  }

  return results;
}
