export const BEST_VERSION = 1;
export const BEST_MAX_CHARS = 256;
export const POP_BEST_KEY = 'handy-pop-v1';
export const TAP_BEST_KEY = 'handy-tap-v1';
export const POUR_BEST_KEY = 'handy-pour-v1';
export const POP_BEST_MAX = 1_000_000;
export const TAP_BEST_MAX = 100_000;
export const POUR_BEST_MAX = 999;
export const POUR_LAYOUTS = 3;

const KEYS = ['v', 'best'];

export type BestStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function browserBestStore(): BestStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadBest(store: BestStore | null, key: string, max: number): number {
  const list = loadBestList(store, key, 1, max);
  return list == null ? 0 : list[0];
}

export function saveBest(store: BestStore | null, key: string, best: number, max: number): void {
  saveBestList(store, key, [best], max);
}

export function loadBestList(
  store: BestStore | null,
  key: string,
  count: number,
  max: number,
): number[] | null {
  if (!store) return null;
  try {
    return decodeBest(store.getItem(key), count, max);
  } catch {
    return null;
  }
}

export function saveBestList(
  store: BestStore | null,
  key: string,
  best: number[],
  max: number,
): void {
  if (!store || decodeBest(JSON.stringify({ v: BEST_VERSION, best }), best.length, max) == null) return;
  try {
    const raw = JSON.stringify({ v: BEST_VERSION, best });
    if (raw.length > BEST_MAX_CHARS) return;
    store.setItem(key, raw);
  } catch {
    // Private mode and quota errors leave the in-memory game playable.
  }
}

export function raiseBest(current: number, next: number, max: number): number {
  if (!isMark(next, max) || next <= current) return current;
  return next;
}

export function lowerBest(current: number, next: number, max: number): number {
  if (!isMark(next, max) || next === 0) return current;
  if (current === 0 || next < current) return next;
  return current;
}

export function decodeBest(raw: string | null, count: number, max: number): number[] | null {
  if (raw == null || raw.length === 0 || raw.length > BEST_MAX_CHARS) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || !exactKeys(data) || data.v !== BEST_VERSION) return null;
    if (!Array.isArray(data.best) || data.best.length !== count) return null;
    if (!data.best.every((item) => isMark(item, max))) return null;
    return data.best.slice();
  } catch {
    return null;
  }
}

function isMark(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function exactKeys(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data);
  return keys.length === KEYS.length && KEYS.every((key) => keys.includes(key));
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
