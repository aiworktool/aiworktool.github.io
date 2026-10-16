import { isTileValue, SIZE, type Board } from './twentyLogic';

export const TWENTY_STORAGE_KEY = 'handy-twenty-v1';
export const MAX_PROGRESS_CHARS = 4096;
export const PROGRESS_VERSION = 1;
export const MAX_SCORE = 20_000_000;

const KEYS = ['v', 'score', 'best', 'board'];

export type TwentyProgress = {
  v: 1;
  score: number;
  best: number;
  board: Board;
};

export type TwentyStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function decodeProgress(raw: string | null): TwentyProgress | null {
  if (raw == null || raw.length === 0 || raw.length > MAX_PROGRESS_CHARS) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isProgress(data)) return null;
    return copyProgress(data);
  } catch {
    return null;
  }
}

export function loadProgress(store: TwentyStore | null): TwentyProgress | null {
  if (!store) return null;
  try {
    return decodeProgress(store.getItem(TWENTY_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveProgress(store: TwentyStore | null, progress: TwentyProgress): void {
  if (!store) return;
  try {
    const raw = JSON.stringify(progress);
    if (raw.length > MAX_PROGRESS_CHARS) return;
    store.setItem(TWENTY_STORAGE_KEY, raw);
  } catch {
    // Private mode and quota errors leave the in-memory game playable.
  }
}

export function browserTwentyStore(): TwentyStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function copyProgress(data: TwentyProgress): TwentyProgress {
  return {
    v: 1,
    score: data.score,
    best: data.best,
    board: data.board.map((row) => row.slice()),
  };
}

function isProgress(data: unknown): data is TwentyProgress {
  if (!isRecord(data) || !exactKeys(data) || data.v !== PROGRESS_VERSION) return false;
  const score = data.score;
  const best = data.best;
  if (!isScore(score) || !isScore(best) || best < score) return false;
  return isBoard(data.board);
}

function exactKeys(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data);
  return keys.length === KEYS.length && KEYS.every((key) => keys.includes(key));
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SCORE;
}

function isBoard(value: unknown): value is Board {
  if (!Array.isArray(value) || value.length !== SIZE) return false;
  return value.every(isRow);
}

function isRow(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === SIZE && value.every(isTileValue);
}
