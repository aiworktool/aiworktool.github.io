import { IMAGE_MAX_EDGE } from '../transcribe/limits';

export type Size = { width: number; height: number };

export function scaledSize(width: number, height: number, maxEdge = IMAGE_MAX_EDGE): Size {
  const edge = Math.max(width, height);
  if (edge <= maxEdge || edge === 0) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
