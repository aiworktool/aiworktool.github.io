import {
  CUP_H, CUP_W, MAX_BALLS, MAX_SCORE, MAX_TIER, clampAim, restingAboveLine, tierRadius,
  type Ball, type DropState,
} from './dropLogic';

export const DROP_STORAGE_KEY = 'handy-drop-v2';
export const MAX_PROGRESS_CHARS = 8192;
export const PROGRESS_VERSION = 2;
const POS_SLOP = 1.5;

const KEYS = ['v', 'score', 'best', 'current', 'next', 'balls'];
const BALL_KEYS = ['t', 'x', 'y'];

export type SavedBall = { t: number; x: number; y: number };

export type DropProgress = {
  v: 2;
  score: number;
  best: number;
  current: number;
  next: number;
  balls: SavedBall[];
};

export type DropStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function decodeProgress(raw: string | null): DropProgress | null {
  if (raw == null || raw.length === 0 || raw.length > MAX_PROGRESS_CHARS) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isProgress(data)) return null;
    return copyProgress(data);
  } catch {
    return null;
  }
}

export function loadProgress(store: DropStore | null): DropProgress | null {
  if (!store) return null;
  try {
    return decodeProgress(store.getItem(DROP_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveProgress(store: DropStore | null, progress: DropProgress): void {
  if (!store || progress.balls.length > MAX_BALLS) return;
  try {
    const raw = JSON.stringify(progress);
    if (raw.length > MAX_PROGRESS_CHARS) return;
    store.setItem(DROP_STORAGE_KEY, raw);
  } catch {
    // Private mode and quota errors leave the in-memory game playable.
  }
}

export function toProgress(state: DropState): DropProgress {
  const balls = state.balls.filter((ball) => ball.rest).slice(0, MAX_BALLS).map(savedBall);
  return {
    v: PROGRESS_VERSION,
    score: state.score,
    best: state.best,
    current: state.current,
    next: state.next,
    balls,
  };
}

export function stateFromProgress(progress: DropProgress): DropState {
  const balls = progress.balls.map(ballFromSaved);
  const over = restingAboveLine(balls);
  return {
    balls,
    current: progress.current,
    next: progress.next,
    aim: clampAim(CUP_W / 2, progress.current),
    score: progress.score,
    best: progress.best,
    phase: over ? 'over' : 'aim',
    calmMs: 0,
    nextId: balls.length + 1,
    waits: [],
    pops: [],
  };
}

export function browserDropStore(): DropStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function savedBall(ball: Ball): SavedBall {
  const point = savedPoint(ball.tier, ball.x, ball.y);
  return { t: ball.tier, x: point.x, y: point.y };
}

function savedPoint(tier: number, x: number, y: number): { x: number; y: number } {
  const radius = tierRadius(tier);
  const clampedX = Math.min(CUP_W - radius, Math.max(radius, x));
  const clampedY = Math.min(CUP_H - radius, Math.max(0, y));
  return { x: round2(clampedX), y: round2(clampedY) };
}

function ballFromSaved(ball: SavedBall, index: number): Ball {
  return { id: index + 1, tier: ball.t, x: ball.x, y: ball.y, vx: 0, vy: 0, rest: true };
}

function copyProgress(data: DropProgress): DropProgress {
  return {
    v: PROGRESS_VERSION,
    score: data.score,
    best: data.best,
    current: data.current,
    next: data.next,
    balls: data.balls.map((ball) => ({ t: ball.t, x: ball.x, y: ball.y })),
  };
}

function isProgress(data: unknown): data is DropProgress {
  if (!isRecord(data) || !exactKeys(data, KEYS) || data.v !== PROGRESS_VERSION) return false;
  if (!isScore(data.score) || !isScore(data.best) || data.best < data.score) return false;
  if (!isTier(data.current) || !isTier(data.next) || !Array.isArray(data.balls)) return false;
  if (data.balls.length > MAX_BALLS) return false;
  return data.balls.every(isSavedBall);
}

function isSavedBall(value: unknown): value is SavedBall {
  if (!isRecord(value) || !exactKeys(value, BALL_KEYS) || !isTier(value.t)) return false;
  if (!isCoord(value.x) || !isCoord(value.y)) return false;
  return inCup(value.t, value.x, value.y);
}

function inCup(tier: number, x: number, y: number): boolean {
  const radius = tierRadius(tier);
  if (x < radius - POS_SLOP || x > CUP_W - radius + POS_SLOP) return false;
  if (y < -POS_SLOP || y > CUP_H - radius + POS_SLOP) return false;
  return true;
}

function exactKeys(data: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(data);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SCORE;
}

function isTier(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_TIER;
}

function isCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
