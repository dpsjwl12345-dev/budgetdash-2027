import * as pdfjsLib from 'pdfjs-dist';

// pdfjs-dist 6.x부터 워커가 .mjs(ESM)로만 배포된다 (.js는 cdnjs에 없어 404 발생).
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export type ProgramMaterial = {
  policy: string;
  unit: string;
  detail: string;
  // 세부사업이 걸쳐 있는 PDF 페이지를 원본 그대로 렌더링한 이미지(JPEG data URL).
  // 텍스트를 뽑아 재조립하면 표/줄바꿈이 깨져 원본과 다른 내용으로 보일 수 있어,
  // 심사자가 실제로 보는 문서와 동일하게 페이지 이미지를 그대로 보여준다.
  images: string[];
};

type PageRange = { page: number; start: number; end: number };

async function extractTextWithPageRanges(
  pdf: pdfjsLib.PDFDocumentProxy
): Promise<{ fullText: string; pageRanges: PageRange[] }> {
  let fullText = '';
  const pageRanges: PageRange[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    const start = fullText.length;
    fullText += pageText + '\n';
    pageRanges.push({ page: i, start, end: fullText.length });
  }

  return { fullText, pageRanges };
}

// 부서 전체 설명자료 PDF는 세부사업마다 "세 출 예 산" 블록이 반복되고, 각 블록은
// "페이지 {세부사업명} 정책사업 {정책명} 단위사업 {단위명} □ 예산 총괄표 ..." 순서로
// 나온다(브라우저 pdf.js 텍스트 추출 순서 기준 — 화면에 보이는 순서와 다르다는 점 주의).
// "세 출 예 산"으로 블록 경계를 먼저 확정한 뒤 그 안에서만 정책/단위/세부를 뽑아야
// 특정 블록에 "예산 총괄표" 표기가 없을 때 다음 블록까지 잘못 삼키는 걸 막을 수 있다.
function detectBlocks(
  fullText: string,
  pageRanges: PageRange[]
): { policy: string; unit: string; detail: string; pages: number[] }[] {
  const blockMarker = /세\s*출\s*예\s*산/g;
  const starts: number[] = [];
  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = blockMarker.exec(fullText)) !== null) {
    starts.push(markerMatch.index);
  }

  if (starts.length === 0) return [];

  const results: { policy: string; unit: string; detail: string; pages: number[] }[] = [];

  for (let i = 0; i < starts.length; i++) {
    const blockStart = starts[i];
    const blockEnd = i < starts.length - 1 ? starts[i + 1] : fullText.length;
    const chunk = fullText.slice(blockStart, blockEnd);

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

    const pages = pageRanges
      .filter((pr) => pr.end > blockStart && pr.start < blockEnd)
      .map((pr) => pr.page);

    results.push({ policy, unit, detail, pages });
  }

  return results;
}

async function renderPageImage(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.3 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context를 생성하지 못했습니다');
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.8);
}

// 부서 설명자료 PDF 한 개를 세부사업 단위로 분리하고, 각 세부사업이 걸쳐 있는
// 페이지를 원본 그대로 이미지로 렌더링한다.
export async function processExplainerPdf(file: File): Promise<ProgramMaterial[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const { fullText, pageRanges } = await extractTextWithPageRanges(pdf);
  const blocks = detectBlocks(fullText, pageRanges);

  const neededPages = Array.from(new Set(blocks.flatMap((b) => b.pages))).sort((a, b) => a - b);
  const imageByPage = new Map<number, string>();
  for (const pageNum of neededPages) {
    imageByPage.set(pageNum, await renderPageImage(pdf, pageNum));
  }

  return blocks.map((b) => ({
    policy: b.policy,
    unit: b.unit,
    detail: b.detail,
    images: b.pages.map((p) => imageByPage.get(p)).filter((img): img is string => Boolean(img)),
  }));
}
