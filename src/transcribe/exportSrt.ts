import type { Segment } from './types';

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function formatSrtTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

export function toSrt(segments: Segment[]): string {
  return segments
    .map((segment, index) => {
      const text = segment.text.replace(/\r\n/g, '\n').trim();
      const start = formatSrtTime(segment.startMs);
      const end = formatSrtTime(segment.endMs);
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}
