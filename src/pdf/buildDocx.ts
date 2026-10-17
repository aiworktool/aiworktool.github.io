import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx';
import type { Line } from './lineLayout';

// 一页排版好的行。
export type Page = { lines: Line[] };

function median(sizes: number[]): number {
  if (sizes.length === 0) return 0;
  const s = [...sizes].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// 把磅值限制在合理区间，避免个别异常字号撑爆文档。
function clampPt(v: number, lo = 7, hi = 72): number {
  return Math.min(hi, Math.max(lo, v));
}

export function buildDocument(pages: readonly Page[]): Document {
  const paragraphs: Paragraph[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    if (i > 0) paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
    const med = median(pages[i].lines.map((l) => l.size));
    for (const line of pages[i].lines) {
      // 明显大于本页中位数的行按标题处理：加粗并略放大。
      const isHeading = med > 0 && line.size >= med * 1.12 && line.size - med >= 1;
      const pt = clampPt(Math.round(isHeading ? Math.max(line.size, med * 1.2) : line.size));
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line.text, bold: line.bold || isHeading, size: pt * 2 })],
        spacing: { after: isHeading ? 200 : 40 },
      }));
    }
  }
  return new Document({ sections: [{ children: paragraphs }] });
}

export async function packDoc(doc: Document): Promise<Blob> {
  return Packer.toBlob(doc);
}
