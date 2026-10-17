// PDF 文本项 → 行排版。纯函数，不依赖 pdfjs，便于单测。
// x、y、width、height 都是 PDF 坐标（1/72 英寸，即约等于磅值）。

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bold: boolean;
};

export type Line = {
  text: string;
  bold: boolean;
  size: number;
};

// 同一行里两个片段之间的水平空隙超过这个磅值时补一个空格。
const GAP_SPACE = 2;
// 再宽就当成另一栏，另起一行，避免两栏文字粘成一句。
const GAP_BREAK = 28;

export function layoutPage(items: readonly PdfTextItem[]): Line[] {
  const kept = items
    .filter((it) => it.str.trim().length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: Line[] = [];
  let parts: { text: string; x: number; width: number }[] = [];
  let anchorY = 0;
  let maxHeight = 0;
  let anyBold = false;

  const flush = () => {
    if (parts.length === 0) return;
    parts.sort((a, b) => a.x - b.x);
    let text = '';
    let prevEnd = Number.NEGATIVE_INFINITY;
    for (const p of parts) {
      if (prevEnd !== Number.NEGATIVE_INFINITY && p.x - prevEnd > GAP_BREAK) {
        lines.push({ text, bold: anyBold, size: maxHeight });
        text = '';
        prevEnd = Number.NEGATIVE_INFINITY;
      }
      if (prevEnd !== Number.NEGATIVE_INFINITY && p.x - prevEnd > GAP_SPACE) {
        text += ' ';
      }
      text += p.text;
      prevEnd = p.x + p.width;
    }
    lines.push({ text, bold: anyBold, size: maxHeight });
    parts = [];
    maxHeight = 0;
    anyBold = false;
  };

  for (const it of kept) {
    // 同一行共享同一基线 y；允许半个行高以内的抖动。
    const tol = Math.max(1.5, maxHeight * 0.5);
    if (parts.length === 0 || Math.abs(it.y - anchorY) > tol) {
      flush();
      parts = [{ text: it.str, x: it.x, width: it.width }];
      anchorY = it.y;
      maxHeight = it.height;
      anyBold = it.bold;
    } else {
      parts.push({ text: it.str, x: it.x, width: it.width });
      maxHeight = Math.max(maxHeight, it.height);
      anyBold = anyBold || it.bold;
    }
  }
  flush();
  return lines;
}
