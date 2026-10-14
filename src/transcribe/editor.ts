import type { Segment } from './types';

export function mergeAdjacent(segments: Segment[], index: number): Segment[] {
  if (index < 0 || index >= segments.length - 1) return segments;
  const current = segments[index];
  const next = segments[index + 1];
  const text = [current.text, next.text].filter((part) => part.trim()).join('\n');
  const merged: Segment = {
    id: current.id,
    startMs: current.startMs,
    endMs: next.endMs,
    text,
  };
  return [...segments.slice(0, index), merged, ...segments.slice(index + 2)];
}

export function deleteAt(segments: Segment[], index: number): Segment[] {
  if (index < 0 || index >= segments.length) return segments;
  return segments.filter((_, i) => i !== index);
}

export function withIds(drafts: Array<Omit<Segment, 'id'>>, prefix: string): Segment[] {
  return drafts.map((draft, index) => ({ ...draft, id: `${prefix}-${index}` }));
}
