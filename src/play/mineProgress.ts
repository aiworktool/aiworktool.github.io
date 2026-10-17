import type { MineDifficulty } from './mineLogic';
import { MINE_BEST_MAX_MS } from './mineLogic';

export const MINE_STORAGE_KEY = 'handy-mine-v1';
export const MINE_MAX_CHARS = 512;
export const MINE_VERSION = 1;

const KEYS = ['v', 'best'];
const BEST_KEYS = ['easy', 'medium', 'hard'];

export type MineBest = {
  v: 1;
  best: Record<MineDifficulty, number>;
};

export type MineStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function emptyMineBest(): MineBest {
  return { v: 1, best: { easy: 0, medium: 0, hard: 0 } };
}

export function decodeMineBest(raw: string | null): MineBest | null {
  if (raw == null || raw.length === 0 || raw.length > MINE_MAX_CHARS) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isBest(data)) return null;
    return { v: 1, best: { easy: data.best.easy, medium: data.best.medium, hard: data.best.hard } };
  } catch {
    return null;
  }
}

export function loadMineBest(store: MineStore | null): MineBest {
  if (!store) return emptyMineBest();
  try {
    return decodeMineBest(store.getItem(MINE_STORAGE_KEY)) ?? emptyMineBest();
  } catch {
    return emptyMineBest();
  }
}

export function saveMineBest(store: MineStore | null, best: MineBest): void {
  if (!store) return;
  try {
    const raw = JSON.stringify(best);
    if (raw.length > MINE_MAX_CHARS) return;
    store.setItem(MINE_STORAGE_KEY, raw);
  } catch {
    // Private mode and quota errors leave the in-memory best usable.
  }
}

export function browserMineStore(): MineStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function isBest(data: unknown): data is { v: 1; best: Record<MineDifficulty, number> } {
  if (!isRecord(data) || !exactKeys(data) || data.v !== MINE_VERSION) return false;
  const best = data.best;
  if (!isRecord(best)) return false;
  const keys = Object.keys(best);
  if (keys.length !== BEST_KEYS.length || !BEST_KEYS.every((key) => keys.includes(key))) return false;
  return BEST_KEYS.every((key) => isTime(best[key]));
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MINE_BEST_MAX_MS;
}

function exactKeys(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data);
  return keys.length === KEYS.length && KEYS.every((key) => keys.includes(key));
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
