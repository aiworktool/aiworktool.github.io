import { LEVELS } from './lotLevels';

export const LOT_STORAGE_KEY = 'handy-lot-v1';
export const MAX_PROGRESS_CHARS = 2048;
export const PROGRESS_VERSION = 1;
export const LEVEL_COUNT = LEVELS.length;

const KEYS = ['v', 'cleared', 'current', 'best'];

export type LotProgress = {
  v: 1;
  cleared: number[];
  current: number;
  best: number[];
};

export type LotStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function emptyProgress(): LotProgress {
  return { v: 1, cleared: [], current: 0, best: Array.from({ length: LEVEL_COUNT }, () => 0) };
}

export function parseStoredProgress(raw: string | null): LotProgress | null {
  if (raw == null || raw.length === 0 || raw.length > MAX_PROGRESS_CHARS) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isProgress(data)) return null;
    return {
      v: 1,
      cleared: data.cleared.slice(),
      current: data.current,
      best: data.best.slice(),
    };
  } catch {
    return null;
  }
}

export function decodeProgress(raw: string | null): LotProgress {
  return parseStoredProgress(raw) ?? emptyProgress();
}

export function loadProgress(store: LotStore | null): LotProgress {
  if (!store) return emptyProgress();
  try {
    return decodeProgress(store.getItem(LOT_STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(store: LotStore | null, progress: LotProgress): void {
  if (!store) return;
  try {
    const raw = JSON.stringify(progress);
    if (raw.length > MAX_PROGRESS_CHARS) return;
    store.setItem(LOT_STORAGE_KEY, raw);
  } catch {
    // Private mode and quota errors leave the in-memory game playable.
  }
}

export function browserLotStore(): LotStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function isUnlocked(progress: LotProgress, index: number): boolean {
  return index >= 0 && index < LEVEL_COUNT && index <= progress.cleared.length;
}

export function markClear(progress: LotProgress, index: number, moves: number): LotProgress {
  if (!isUnlocked(progress, index)) return progress;
  const limit = LEVELS[index]?.moveLimit ?? 0;
  if (!Number.isInteger(moves) || moves < 1 || moves > limit) return progress;
  const already = progress.cleared.includes(index);
  if (!already && index !== progress.cleared.length) return progress;
  const cleared = already ? progress.cleared.slice() : progress.cleared.concat(index);
  const best = progress.best.slice();
  if (best[index] === 0 || moves < best[index]) best[index] = moves;
  let current = progress.current;
  if (!already && current === index && index + 1 < LEVEL_COUNT) current = index + 1;
  return { v: 1, cleared, current, best };
}

export function withCurrent(progress: LotProgress, index: number): LotProgress {
  if (!isUnlocked(progress, index)) return progress;
  return {
    v: 1,
    cleared: progress.cleared.slice(),
    current: index,
    best: progress.best.slice(),
  };
}

function isProgress(data: unknown): data is LotProgress {
  if (!isRecord(data)) return false;
  const keys = Object.keys(data);
  if (keys.length !== KEYS.length || !KEYS.every((key) => keys.includes(key))) return false;
  if (data.v !== PROGRESS_VERSION) return false;
  if (!isPrefix(data.cleared)) return false;
  if (!isBest(data.best, data.cleared.length)) return false;
  return isCurrent(data.current, data.cleared.length);
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function isPrefix(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length > LEVEL_COUNT) return false;
  return value.every((item, index) => item === index);
}

function isCurrent(value: unknown, cleared: number): boolean {
  if (!Number.isInteger(value)) return false;
  const current = value as number;
  return current >= 0 && current < LEVEL_COUNT && current <= cleared;
}

function isBest(value: unknown, cleared: number): value is number[] {
  if (!Array.isArray(value) || value.length !== LEVEL_COUNT) return false;
  return value.every((item, index) => scoreOk(item, index < cleared, index));
}

function scoreOk(value: unknown, cleared: boolean, index: number): boolean {
  if (!Number.isInteger(value)) return false;
  const score = value as number;
  if (!cleared) return score === 0;
  const limit = LEVELS[index]?.moveLimit ?? 0;
  return score >= 1 && score <= limit && score <= 99;
}
