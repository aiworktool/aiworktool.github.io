function blurAxis(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): Float32Array {
  const dst = new Float32Array(src.length);
  const span = radius * 2 + 1;
  if (horizontal) {
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      let sum = 0;
      for (let x = -radius; x <= radius; x += 1) {
        sum += src[row + Math.min(width - 1, Math.max(0, x))];
      }
      for (let x = 0; x < width; x += 1) {
        dst[row + x] = sum / span;
        const leave = x - radius;
        const enter = x + radius + 1;
        sum -= src[row + Math.min(width - 1, Math.max(0, leave))];
        sum += src[row + Math.min(width - 1, Math.max(0, enter))];
      }
    }
    return dst;
  }
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) {
      sum += src[Math.min(height - 1, Math.max(0, y)) * width + x];
    }
    for (let y = 0; y < height; y += 1) {
      dst[y * width + x] = sum / span;
      const leave = y - radius;
      const enter = y + radius + 1;
      sum -= src[Math.min(height - 1, Math.max(0, leave)) * width + x];
      sum += src[Math.min(height - 1, Math.max(0, enter)) * width + x];
    }
  }
  return dst;
}

function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const horizontal = blurAxis(src, width, height, radius, true);
  return blurAxis(horizontal, width, height, radius, false);
}

export function decontaminate(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  radius = 2,
): Uint8ClampedArray {
  const count = width * height;
  const weightedR = new Float32Array(count);
  const weightedG = new Float32Array(count);
  const weightedB = new Float32Array(count);
  const weight = new Float32Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    const offset = pixel * 4;
    const alpha = rgba[offset + 3] / 255;
    weightedR[pixel] = rgba[offset] * alpha;
    weightedG[pixel] = rgba[offset + 1] * alpha;
    weightedB[pixel] = rgba[offset + 2] * alpha;
    weight[pixel] = alpha;
  }
  const blurR = boxBlur(weightedR, width, height, radius);
  const blurG = boxBlur(weightedG, width, height, radius);
  const blurB = boxBlur(weightedB, width, height, radius);
  const blurA = boxBlur(weight, width, height, radius);
  const out = new Uint8ClampedArray(rgba);
  for (let pixel = 0; pixel < count; pixel += 1) {
    const offset = pixel * 4;
    const alpha = out[offset + 3] / 255;
    if (alpha >= 0.98 || blurA[pixel] < 1e-3) continue;
    out[offset] = Math.round(blurR[pixel] / blurA[pixel]);
    out[offset + 1] = Math.round(blurG[pixel] / blurA[pixel]);
    out[offset + 2] = Math.round(blurB[pixel] / blurA[pixel]);
  }
  return out;
}

export function applyAlpha(rgba: Uint8ClampedArray, alpha: Float32Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  const pixels = Math.min(alpha.length, out.length / 4);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const value = Math.min(1, Math.max(0, alpha[pixel]));
    out[pixel * 4 + 3] = Math.round(value * 255);
  }
  return out;
}
