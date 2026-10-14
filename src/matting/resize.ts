export function resizeBilinear(
  src: Float32Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Float32Array {
  if (srcW === dstW && srcH === dstH) return src;
  const dst = new Float32Array(dstW * dstH);
  const xScale = srcW / dstW;
  const yScale = srcH / dstH;
  for (let y = 0; y < dstH; y += 1) {
    const fy = Math.min(srcH - 1, (y + 0.5) * yScale - 0.5);
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < dstW; x += 1) {
      const fx = Math.min(srcW - 1, (x + 0.5) * xScale - 0.5);
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const tx = fx - x0;
      const v00 = src[y0 * srcW + x0];
      const v10 = src[y0 * srcW + x1];
      const v01 = src[y1 * srcW + x0];
      const v11 = src[y1 * srcW + x1];
      const top = v00 * (1 - tx) + v10 * tx;
      const bottom = v01 * (1 - tx) + v11 * tx;
      dst[y * dstW + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return dst;
}

export function sigmoidPlane(src: Float32Array): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (const value of src) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min >= 0 && max <= 1) return src;
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 1) {
    out[i] = 1 / (1 + Math.exp(-src[i]));
  }
  return out;
}
