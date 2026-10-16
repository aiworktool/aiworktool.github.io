export const MAX_TIER = 10;
export const TIER_COUNT = MAX_TIER + 1;
export const SPAWN_MAX = 2;
export const MAX_BALLS = 40;
export const MAX_SCORE = 1_000_000;
export const CUP_H = 460;
export const DANGER_Y = 92;
export const AIM_NUDGE = 24;
export const OVER_DELAY_MS = 500;
const TOUCH_SLOP = 2.2;
const DROP_VY = 220;

const RADII = [15, 19, 24, 30, 37, 46, 56, 67, 79, 92, 106];

/** Inner width fits one largest ball beside one second-largest ball, and no wider. */
export const CUP_W = RADII[RADII.length - 1] * 2 + RADII[RADII.length - 2] * 2;

export type Ball = {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rest: boolean;
  squash?: number;
  jolt?: number;
  hit?: number;
};

export type DropPhase = 'aim' | 'drop' | 'over';

export type MergeWait = {
  a: number;
  b: number;
  tier: number;
  ms: number;
};

export type ScorePop = {
  id: number;
  x: number;
  y: number;
  points: number;
  age: number;
};

export type DropState = {
  balls: Ball[];
  current: number;
  next: number;
  aim: number;
  score: number;
  best: number;
  phase: DropPhase;
  calmMs: number;
  nextId: number;
  waits: MergeWait[];
  pops: ScorePop[];
};

export type PointerKind = 'down' | 'move' | 'up' | 'click';

export type PointerArm = { down: boolean; swallowClick: boolean };

export type MergeHit = { i: number; j: number };

export type MergeResult = { balls: Ball[]; score: number; nextId: number };

/** Points added for a merge. The new tier's value is its tier number. */
export function tierScore(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > MAX_TIER) return 0;
  return tier;
}

export function tierRadius(tier: number): number {
  if (!Number.isInteger(tier) || tier < 0) return RADII[0];
  if (tier >= RADII.length) return RADII[RADII.length - 1];
  return RADII[tier];
}

export function clampAim(x: number, tier: number): number {
  const radius = tierRadius(tier);
  const lo = radius;
  const hi = Math.max(lo, CUP_W - radius);
  if (!Number.isFinite(x)) return (lo + hi) / 2;
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

export function holdY(tier: number): number {
  return tierRadius(tier) + 8;
}

export function spawnTier(rng: () => number): number {
  const roll = rng();
  if (typeof roll !== 'number' || !(roll < 0.88)) return SPAWN_MAX;
  if (roll < 0.58) return 0;
  return 1;
}

export function newGame(best: number, rng: () => number): DropState {
  const current = spawnTier(rng);
  return {
    balls: [],
    current,
    next: spawnTier(rng),
    aim: clampAim(CUP_W / 2, current),
    score: 0,
    best: boundScore(best),
    phase: 'aim',
    calmMs: 0,
    nextId: 1,
    waits: [],
    pops: [],
  };
}

export function moveAim(state: DropState, x: number): DropState {
  if (state.phase === 'over') return state;
  const tier = state.phase === 'aim' ? state.current : state.next;
  const aim = clampAim(x, tier);
  if (aim === state.aim) return state;
  return { ...state, aim };
}

export function nudgeAim(state: DropState, dir: -1 | 1): DropState {
  if (dir !== -1 && dir !== 1) return state;
  return moveAim(state, state.aim + dir * AIM_NUDGE);
}

export function release(state: DropState, rng: () => number = Math.random): DropState {
  if (state.phase === 'over') return state;
  if (state.balls.length >= MAX_BALLS) return { ...state, phase: 'over' };
  const tier = state.current;
  const ball: Ball = {
    id: state.nextId,
    tier,
    x: clampAim(state.aim, tier),
    y: holdY(tier),
    vx: 0,
    vy: DROP_VY,
    rest: false,
  };
  const current = state.next;
  return {
    ...state,
    balls: state.balls.concat(ball),
    current,
    next: spawnTier(rng),
    aim: clampAim(state.aim, current),
    nextId: state.nextId + 1,
    phase: 'aim',
    calmMs: 0,
  };
}

export function circlesTouch(a: Ball, b: Ball): boolean {
  if (a.id === b.id || a.tier !== b.tier || a.tier >= MAX_TIER) return false;
  const reach = tierRadius(a.tier) * 2 + TOUCH_SLOP;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= reach * reach;
}

export function findMergePair(balls: readonly Ball[]): MergeHit | null {
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      if (circlesTouch(balls[i], balls[j])) return { i, j };
    }
  }
  return null;
}

export function mergeStep(
  balls: readonly Ball[],
  nextId: number,
  allow: (a: Ball, b: Ball) => boolean = allowAll,
): MergeResult {
  const used = new Set<number>();
  const seen = new Set<number>();
  const out: Ball[] = [];
  let score = 0;
  let id = nextId;
  for (let i = 0; i < balls.length; i += 1) {
    if (used.has(i) || seen.has(balls[i].id)) continue;
    const pair = partnerIndex(balls, i, used, allow);
    if (pair == null) {
      seen.add(balls[i].id);
      out.push(balls[i]);
      continue;
    }
    const made = placeMerged(combine(balls[i], balls[pair], id));
    id += 1;
    score += tierScore(made.tier);
    used.add(i);
    used.add(pair);
    seen.add(balls[i].id);
    seen.add(balls[pair].id);
    out.push(made);
  }
  return { balls: out, score, nextId: id };
}

export function restingAboveLine(balls: readonly { y: number; rest: boolean }[]): boolean {
  return balls.some((ball) => ball.rest && ball.y < DANGER_Y);
}

export function overAfterSettle(
  balls: readonly { y: number; rest: boolean }[],
  calmMs: number,
): boolean {
  if (!(calmMs >= OVER_DELAY_MS)) return false;
  if (balls.length === 0 || balls.some((ball) => !ball.rest)) return false;
  return restingAboveLine(balls);
}

export function addScore(score: number, gain: number): number {
  const base = boundScore(score);
  if (!Number.isInteger(gain) || gain <= 0) return base;
  return boundScore(base + gain);
}

export function aimDelta(key: string): -1 | 1 | null {
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return -1;
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 1;
  return null;
}

export function isDropKey(key: string): boolean {
  return key === ' ' || key === 'ArrowDown';
}

/** One pointer gesture releases one ball. pointerup drops; the click after it does not. */
export function armDrop(
  kind: PointerKind,
  arm: PointerArm,
): { drop: boolean; ignore: boolean; arm: PointerArm } {
  if (kind === 'down') return { drop: false, ignore: false, arm: { down: true, swallowClick: false } };
  if (kind === 'move') return { drop: false, ignore: false, arm };
  if (kind === 'up') {
    const drop = arm.down;
    return { drop, ignore: false, arm: { down: false, swallowClick: drop } };
  }
  if (arm.swallowClick) return { drop: false, ignore: true, arm: { down: false, swallowClick: false } };
  return { drop: false, ignore: false, arm: { down: false, swallowClick: false } };
}

function allowAll(): boolean {
  return true;
}

function partnerIndex(
  balls: readonly Ball[],
  i: number,
  used: Set<number>,
  allow: (a: Ball, b: Ball) => boolean,
): number | null {
  for (let j = i + 1; j < balls.length; j += 1) {
    if (used.has(j) || !allow(balls[i], balls[j])) continue;
    if (circlesTouch(balls[i], balls[j])) return j;
  }
  return null;
}

function combine(a: Ball, b: Ball, id: number): Ball {
  return {
    id,
    tier: a.tier + 1,
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    vx: (a.vx + b.vx) * 0.4,
    vy: (a.vy + b.vy) * 0.4,
    rest: false,
  };
}

function placeMerged(ball: Ball): Ball {
  const radius = tierRadius(ball.tier);
  let x = ball.x;
  let y = ball.y;
  if (x < radius) x = radius;
  if (x > CUP_W - radius) x = CUP_W - radius;
  if (y > CUP_H - radius) y = CUP_H - radius;
  return x === ball.x && y === ball.y ? ball : { ...ball, x, y };
}

function boundScore(score: number): number {
  if (!Number.isInteger(score) || score < 0) return 0;
  if (score > MAX_SCORE) return MAX_SCORE;
  return score;
}
