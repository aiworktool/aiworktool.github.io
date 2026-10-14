export const MIN_SPLIT_BYTES = 8 * 1024 * 1024;
export const MIN_PART_BYTES = 4 * 1024 * 1024;
export const MAX_PARTS = 8;
export const RANGE_PARALLEL = 4;

export type ByteRange = { start: number; end: number };

export function planByteRanges(size: number): ByteRange[] | null {
  if (!Number.isFinite(size) || size < MIN_SPLIT_BYTES) return null;
  const parts = Math.min(MAX_PARTS, Math.floor(size / MIN_PART_BYTES));
  if (parts < 2) return null;
  const chunk = Math.floor(size / parts);
  const ranges: ByteRange[] = [];
  for (let index = 0; index < parts; index += 1) {
    const start = index * chunk;
    const end = index === parts - 1 ? size - 1 : start + chunk - 1;
    ranges.push({ start, end });
  }
  return ranges;
}

export function totalFromContentRange(header: string | null): number | null {
  if (!header) return null;
  const match = /bytes \d+-\d+\/(\d+)/.exec(header.trim());
  if (!match) return null;
  const total = Number(match[1]);
  if (!Number.isFinite(total) || total <= 0) return null;
  return total;
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
