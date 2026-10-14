import { CHUNK_SEC, OVERLAP_SEC, SAMPLE_RATE } from './limits';

export type AudioChunk = {
  index: number;
  startSec: number;
  samples: Float32Array;
};

const chunkLen = CHUNK_SEC * SAMPLE_RATE;
const stride = chunkLen - OVERLAP_SEC * SAMPLE_RATE;

export function countChunks(sampleCount: number): number {
  if (sampleCount <= 0) return 0;
  if (sampleCount <= chunkLen) return 1;
  let count = 0;
  let start = 0;
  while (start < sampleCount) {
    const end = Math.min(start + chunkLen, sampleCount);
    count += 1;
    if (end === sampleCount) break;
    start += stride;
  }
  return count;
}

export function splitChunks(pcm: Float32Array): AudioChunk[] {
  if (pcm.length === 0) return [];
  if (pcm.length <= chunkLen) {
    return [{ index: 0, startSec: 0, samples: pcm }];
  }
  const chunks: AudioChunk[] = [];
  let start = 0;
  while (start < pcm.length) {
    const end = Math.min(start + chunkLen, pcm.length);
    chunks.push({
      index: chunks.length,
      startSec: start / SAMPLE_RATE,
      samples: pcm.subarray(start, end),
    });
    if (end === pcm.length) break;
    start += stride;
  }
  return chunks;
}
