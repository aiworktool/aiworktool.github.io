export const AUDIO_MAX_BYTES = 100 * 1024 * 1024;
export const AUDIO_MAX_SECONDS = 30 * 60;
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_MAX_EDGE = 2048;

export const SAMPLE_RATE = 16_000;
export const CHUNK_SEC = 30;
export const OVERLAP_SEC = 5;

export function exceedsBytes(size: number, limit: number): boolean {
  return size > limit;
}
