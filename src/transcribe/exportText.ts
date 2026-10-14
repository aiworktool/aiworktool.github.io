import type { Segment } from './types';

export function toTxt(segments: Segment[]): string {
  return segments
    .map((segment) => segment.text.trim())
    .filter((text) => text.length > 0)
    .join('\n\n');
}
