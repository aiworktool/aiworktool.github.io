import { LEVELS_EACH, levelsFor, type LotDifficulty } from './lotPacks';
import {
  LOT_STORAGE_KEY, parseStoredProgress, type LotStore,
} from './lotProgress';

export const LOT_STORAGE_KEY_V2 = 'handy-lot-v2';
export const MAX_LOT_V2_CHARS = 8192;

const SAVE_KEYS = ['v', 'difficulty', 'low', 'mid', 'high'];
const SLICE_KEYS = ['cleared', 'current', 'best'];

export type LotSlice = {
  cleared: number[];
  current: number;
  best: number[];
};

export type LotSave = {
  v: 2;
  difficulty: LotDifficulty;
  low: LotSlice;
  mid: LotSlice;
  high: LotSlice;
};

export function emptyLotSave(): LotSave {
  return {
    v: 2,
    difficulty: 'low',
    low: emptySlice(),
    mid: emptySlice(),
    high: emptySlice(),
  };
}

export function decodeLotSave(raw: string | null): LotSave | null {
  if (raw == null || raw.length === 0 || raw.length > MAX_LOT_V2_CHARS) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isSave(data)) return null;
    return copySave(data);
  } catch {
    return null;
  }
}

export function loadLotSave(store: LotStore | null): LotSave {
  if (!store) return emptyLotSave();
  try {
    const raw = store.getItem(LOT_STORAGE_KEY_V2);
    if (raw == null || raw.length === 0) return migrateFromV1(store);
    return decodeLotSave(raw) ?? emptyLotSave();
  } catch {
    return emptyLotSave();
  }
}

export function saveLotSave(store: LotStore | null, save: LotSave): void {
  if (!store) return;
  try {
    const raw = JSON.stringify(save);
    if (raw.length > MAX_LOT_V2_CHARS) return;
    store.setItem(LOT_STORAGE_KEY_V2, raw);
  } catch {
    // Private mode and quota errors leave the in-memory game playable.
  }
}

export function isSliceOpen(slice: LotSlice, index: number): boolean {
  return index >= 0 && index < LEVELS_EACH && index <= slice.cleared.length;
}

/** 1-based level to show after a clear. The last level of a difficulty stays put. */
export function levelIdAfterClear(levelId: number): number {
  if (!Number.isInteger(levelId) || levelId < 1) return 1;
  if (levelId >= LEVELS_EACH) return LEVELS_EACH;
  return levelId + 1;
}

export function clearLotLevel(save: LotSave, index: number, moves: number): LotSave {
  const difficulty = save.difficulty;
  const slice = save[difficulty];
  if (!isSliceOpen(slice, index)) return save;
  const limit = levelsFor(difficulty)[index]?.moveLimit ?? 0;
  if (!Number.isInteger(moves) || moves < 1 || moves > limit) return save;
  const already = slice.cleared.includes(index);
  if (!already && index !== slice.cleared.length) return save;
  const cleared = already ? slice.cleared.slice() : slice.cleared.concat(index);
  const best = slice.best.slice();
  if (best[index] === 0 || moves < best[index]) best[index] = moves;
  let current = slice.current;
  if (!already && current === index && index + 1 < LEVELS_EACH) current = index + 1;
  const next = copySave(save);
  next[difficulty] = { cleared, current, best };
  return next;
}

export function selectLotDifficulty(save: LotSave, difficulty: LotDifficulty): LotSave {
  if (save.difficulty === difficulty) return save;
  const next = copySave(save);
  next.difficulty = difficulty;
  return next;
}

export function selectLotLevel(save: LotSave, index: number): LotSave {
  const slice = save[save.difficulty];
  if (!isSliceOpen(slice, index)) return save;
  const next = copySave(save);
  next[save.difficulty] = {
    cleared: slice.cleared.slice(),
    current: index,
    best: slice.best.slice(),
  };
  return next;
}

export function advanceClearedLevel(save: LotSave, index: number, moves: number): LotSave {
  const saved = clearLotLevel(save, index, moves);
  if (saved === save) return save;
  const nextIndex = levelIdAfterClear(index + 1) - 1;
  if (nextIndex === index || !isSliceOpen(saved[saved.difficulty], nextIndex)) return saved;
  return selectLotLevel(saved, nextIndex);
}

function migrateFromV1(store: LotStore): LotSave {
  let raw: string | null = null;
  try {
    raw = store.getItem(LOT_STORAGE_KEY);
  } catch {
    return emptyLotSave();
  }
  const saved = parseStoredProgress(raw);
  if (!saved) return emptyLotSave();
  const next = emptyLotSave();
  next.low = {
    cleared: saved.cleared.slice(),
    current: saved.current,
    best: saved.best.slice(),
  };
  saveLotSave(store, next);
  return next;
}

function emptySlice(): LotSlice {
  return { cleared: [], current: 0, best: Array.from({ length: LEVELS_EACH }, () => 0) };
}

function copySlice(slice: LotSlice): LotSlice {
  return { cleared: slice.cleared.slice(), current: slice.current, best: slice.best.slice() };
}

function copySave(save: LotSave): LotSave {
  return {
    v: 2,
    difficulty: save.difficulty,
    low: copySlice(save.low),
    mid: copySlice(save.mid),
    high: copySlice(save.high),
  };
}

function isSave(data: unknown): data is LotSave {
  if (!isRecord(data)) return false;
  const keys = Object.keys(data);
  if (keys.length !== SAVE_KEYS.length || !SAVE_KEYS.every((key) => keys.includes(key))) return false;
  if (data.v !== 2 || !isDifficulty(data.difficulty)) return false;
  return (['low', 'mid', 'high'] as const).every((name) => isSlice(data[name], name));
}

function isDifficulty(value: unknown): value is LotDifficulty {
  return value === 'low' || value === 'mid' || value === 'high';
}

function isSlice(value: unknown, difficulty: LotDifficulty): value is LotSlice {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== SLICE_KEYS.length || !SLICE_KEYS.every((key) => keys.includes(key))) return false;
  if (!isPrefix(value.cleared) || !isCurrent(value.current, value.cleared.length)) return false;
  return isBest(value.best, value.cleared.length, difficulty);
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function isPrefix(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length > LEVELS_EACH) return false;
  return value.every((item, index) => item === index);
}

function isCurrent(value: unknown, cleared: number): boolean {
  if (!Number.isInteger(value)) return false;
  const current = value as number;
  return current >= 0 && current < LEVELS_EACH && current <= cleared;
}

function isBest(value: unknown, cleared: number, difficulty: LotDifficulty): value is number[] {
  const pack = levelsFor(difficulty);
  if (!Array.isArray(value) || value.length !== LEVELS_EACH) return false;
  return value.every((item, index) => scoreOk(item, index < cleared, pack[index]?.moveLimit ?? 0));
}

function scoreOk(value: unknown, cleared: boolean, limit: number): boolean {
  if (!Number.isInteger(value)) return false;
  const score = value as number;
  if (!cleared) return score === 0;
  return score >= 1 && score <= limit;
}
