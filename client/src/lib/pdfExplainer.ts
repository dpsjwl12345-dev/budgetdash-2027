import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export type MaterialSection = {
  title: '예산총괄표' | '사업명세서' | '편성현황';
  content: string;
};

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

export function splitIntoSections(text: string): MaterialSection[] {
  const sections: MaterialSection[] = [];

  const sectionTitles = ['예산총괄표', '사업명세서', '편성현황'];
  const positions = sectionTitles.map(title => ({
    title: title as MaterialSection['title'],
    index: text.indexOf(title)
  })).filter(p => p.index !== -1);

  // 위치순으로 정렬
  positions.sort((a, b) => a.index - b.index);

  for (let i = 0; i < positions.length; i++) {
    const startPos = positions[i].index;
    const endPos = i < positions.length - 1 ? positions[i + 1].index : text.length;
    const content = text.substring(startPos, endPos).trim();

    sections.push({
      title: positions[i].title,
      content: content
    });
  }

  return sections;
}
