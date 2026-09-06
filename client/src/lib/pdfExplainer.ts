import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

function commonWordPrefix(a: string, b: string): string {
  const aw = a.split(/\s+/);
  const bw = b.split(/\s+/);
  let i = 0;
  while (i < aw.length && i < bw.length && aw[i] === bw[i]) i++;
  return aw.slice(0, i).join(' ');
}

// 같은 단위사업 안에서 "정책사업+세부사업"이 붙어있는 헤더 문자열들을 서로 비교해
// 반복되는 공통 접두어를 정책사업명으로, 나머지를 세부사업명으로 분리한다.
// (동일 단위사업에 세부사업이 하나뿐이면 접두어를 비교할 대상이 없어 정책사업을 "기타"로 둔다.)
function splitPolicyDetail(headers: string[]): { policy: string; detail: string }[] {
  const results = new Array<{ policy: string; detail: string }>(headers.length);
  let remaining = headers.map((s, i) => ({ i, s: s.trim() }));

  while (remaining.length > 0) {
    let bestPrefix = '';
    for (let a = 0; a < remaining.length; a++) {
      for (let b = a + 1; b < remaining.length; b++) {
        const prefix = commonWordPrefix(remaining[a].s, remaining[b].s);
        if (prefix.length > bestPrefix.length) bestPrefix = prefix;
      }
    }

    if (!bestPrefix) {
      remaining.forEach((r) => {
        results[r.i] = { policy: '기타', detail: r.s };
      });
      break;
    }

    const matched = remaining.filter((r) => r.s.startsWith(bestPrefix));
    matched.forEach((r) => {
      results[r.i] = { policy: bestPrefix, detail: r.s.slice(bestPrefix.length).trim() };
    });
    remaining = remaining.filter((r) => !r.s.startsWith(bestPrefix));
  }

  return results;
}

// 부서 전체 설명자료 PDF(여러 세부사업이 "세 출 예 산" 블록으로 이어진 문서)를
// 세부사업 단위로 분리해 각 블록의 3섹션을 추출한다.
export function extractProgramBlocks(text: string): ProgramMaterial[] {
  const headerRegex = /정책사업\s+([\s\S]+?)\s*단위사업\s+([\s\S]+?)(?=□?\s*예산\s*총괄표)/g;

  type RawBlock = { headerCombined: string; unit: string; bodyStart: number };
  const rawBlocks: RawBlock[] = [];
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(text)) !== null) {
    rawBlocks.push({
      headerCombined: match[1].trim(),
      unit: match[2].trim(),
      bodyStart: match.index,
    });
  }

  if (rawBlocks.length === 0) return [];

  const results: ProgramMaterial[] = [];

  // 단위사업별로 묶어서 그 안에서 정책/세부를 분리해야 접두어 비교 정확도가 올라간다.
  const byUnit = new Map<string, number[]>();
  rawBlocks.forEach((b, idx) => {
    const list = byUnit.get(b.unit) ?? [];
    list.push(idx);
    byUnit.set(b.unit, list);
  });

  const policyDetailByIndex = new Map<number, { policy: string; detail: string }>();
  byUnit.forEach((indices) => {
    const headers = indices.map((i) => rawBlocks[i].headerCombined);
    const split = splitPolicyDetail(headers);
    indices.forEach((i, j) => policyDetailByIndex.set(i, split[j]));
  });

  for (let i = 0; i < rawBlocks.length; i++) {
    const bodyEnd = i < rawBlocks.length - 1 ? rawBlocks[i + 1].bodyStart : text.length;
    const body = text.slice(rawBlocks[i].bodyStart, bodyEnd);
    const sections = splitIntoSections(body);

    const sectionMap: Record<SectionKey, string> = {
      예산총괄표: '',
      사업설명서: '',
      편성현황: '',
    };
    sections.forEach((s) => {
      sectionMap[s.title] = s.content;
    });

    const { policy, detail } = policyDetailByIndex.get(i) ?? { policy: '기타', detail: rawBlocks[i].headerCombined };
    if (!detail) continue;

    results.push({
      policy,
      unit: rawBlocks[i].unit,
      detail,
      sections: sectionMap,
    });
  }

  return results;
}
