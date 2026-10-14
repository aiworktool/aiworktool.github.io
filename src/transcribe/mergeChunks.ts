import { OVERLAP_SEC } from './limits';

export type RawStamp = {
  text: string;
  timestamp: [number, number | null];
};

export type DraftSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

export function acceptChunk(
  raw: RawStamp[],
  chunkStartSec: number,
  dropOverlap: boolean,
): DraftSegment[] {
  const out: DraftSegment[] = [];
  for (const item of raw) {
    const text = item.text.trim();
    if (!text) continue;
    const relStart = item.timestamp[0] ?? 0;
    if (dropOverlap && relStart < OVERLAP_SEC) continue;
    const relEnd = item.timestamp[1] ?? relStart;
    const startMs = Math.round((chunkStartSec + relStart) * 1000);
    const endSec = chunkStartSec + Math.max(relEnd, relStart);
    out.push({ startMs, endMs: Math.round(endSec * 1000), text });
  }
  return out;
}
