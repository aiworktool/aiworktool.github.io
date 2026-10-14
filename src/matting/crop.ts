export type Rect = { x: number; y: number; w: number; h: number };

export function initialCrop(imgW: number, imgH: number, aspect: number): Rect {
  if (imgW <= 0 || imgH <= 0 || aspect <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  const imgAspect = imgW / imgH;
  const w = imgAspect > aspect ? imgH * aspect : imgW;
  const h = imgAspect > aspect ? imgH : imgW / aspect;
  return { x: (imgW - w) / 2, y: (imgH - h) / 2, w, h };
}

export function moveCrop(rect: Rect, dx: number, dy: number, imgW: number, imgH: number): Rect {
  const x = Math.min(Math.max(0, rect.x + dx), Math.max(0, imgW - rect.w));
  const y = Math.min(Math.max(0, rect.y + dy), Math.max(0, imgH - rect.h));
  return { ...rect, x, y };
}

export function resizeCrop(
  start: Rect,
  dx: number,
  aspect: number,
  imgW: number,
  imgH: number,
  minSize = 32,
): Rect {
  let w = Math.max(minSize, start.w + dx);
  let h = w / aspect;
  if (start.x + w > imgW) {
    w = imgW - start.x;
    h = w / aspect;
  }
  if (start.y + h > imgH) {
    h = imgH - start.y;
    w = h * aspect;
  }
  if (w < minSize || h < minSize) return start;
  if (start.x + w > imgW + 0.01 || start.y + h > imgH + 0.01) return start;
  return { x: start.x, y: start.y, w, h };
}

export function cropInside(rect: Rect, imgW: number, imgH: number): boolean {
  return (
    rect.w > 0 &&
    rect.h > 0 &&
    rect.x >= -0.01 &&
    rect.y >= -0.01 &&
    rect.x + rect.w <= imgW + 0.01 &&
    rect.y + rect.h <= imgH + 0.01
  );
}
