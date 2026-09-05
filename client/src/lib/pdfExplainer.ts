import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type ExplainerSection = {
  id: string;
  title: string;
  start?: number;
  end?: number;
};

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n\n");
}

const SECTION_MARKER = "세 출 예 산";
const SECTION_MARKER_PATTERN = /세\s*출\s*예\s*산/g;
const NOISE_PATTERNS = [/페이지/g, /정책사업/g, /[-–]\s*\d+\s*[-–]/g];

function findMarkerRanges(fullText: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = new RegExp(SECTION_MARKER_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(fullText)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
    if (match.index === pattern.lastIndex) pattern.lastIndex++; // 무한루프 방지
  }
  return ranges;
}

// PDF 텍스트에서 "세 출 예 산" 구분자로 세부사업 후보를 나누고, 각 구간의 정확한 위치(offset)를 함께 저장한다.
// 제목은 표 레이아웃 특성상 완벽하지 않을 수 있어, 업로드 직후 사용자가 검토/수정하는 것을 전제로 한다.
export function suggestSections(fullText: string): ExplainerSection[] {
  const markers = findMarkerRanges(fullText);

  return markers
    .map((marker, index) => {
      const contentStart = marker.end;
      const contentEnd = index + 1 < markers.length ? markers[index + 1].start : fullText.length;
      const chunk = fullText.slice(contentStart, contentEnd);

      const upToUnit = chunk.split("단위사업")[0] ?? "";
      let candidate = upToUnit;
      for (const pattern of NOISE_PATTERNS) {
        candidate = candidate.replace(pattern, " ");
      }
      candidate = candidate.replace(/\s+/g, " ").trim();

      return {
        id: `section-${index}`,
        title: candidate || `항목 ${index + 1}`,
        start: contentStart,
        end: contentEnd,
      };
    })
    .filter((section) => section.title.length > 0);
}

const EXCERPT_RADIUS_BEFORE = 200;
const EXCERPT_MAX_LENGTH = 3500;

// 정확히 일치하는 파싱된 섹션이 있으면 그 구간을 그대로 반환하고,
// 없으면(엑셀에서 넘어온 더 세부적인 이름 등) 원문에서 정확히 일치하는 위치를 찾아 앞뒤 맥락과 함께 발췌한다.
// 잘못된 위치를 보여주는 것을 방지하기 위해 정확히 일치하지 않으면 null을 반환한다 (단어 단위 추측 금지).
export function findExcerpt(fullText: string, title: string, sections: ExplainerSection[]): string | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  const exactSection = sections.find(
    (section) => section.title === trimmedTitle && section.start !== undefined && section.end !== undefined
  );
  if (exactSection) {
    return fullText.slice(exactSection.start!, exactSection.end!).trim();
  }

  const matchIndex = fullText.indexOf(trimmedTitle);
  if (matchIndex === -1) return null;

  const nextMarkerOffset = fullText.slice(matchIndex + trimmedTitle.length).search(SECTION_MARKER_PATTERN);

  const start = Math.max(0, matchIndex - EXCERPT_RADIUS_BEFORE);
  const end =
    nextMarkerOffset === -1
      ? Math.min(fullText.length, matchIndex + EXCERPT_MAX_LENGTH)
      : Math.min(
          fullText.length,
          matchIndex + trimmedTitle.length + nextMarkerOffset,
          matchIndex + EXCERPT_MAX_LENGTH
        );

  return fullText.slice(start, end).trim();
}
