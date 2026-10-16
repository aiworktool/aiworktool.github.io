import {
  MAX_TIER, circlesTouch, mergeStep, tierScore,
  type Ball, type MergeWait, type ScorePop,
} from './dropLogic';

export const MERGE_BLEND_MS = 160;
export const POP_LIFE_MS = 720;
export const MAX_POPS = 12;
const MERGE_PULSE = 0.9;

export type MergeOutcome = {
  balls: Ball[];
  waits: MergeWait[];
  score: number;
  nextId: number;
  pops: ScorePop[];
};

export function settleMerge(
  balls: readonly Ball[],
  waits: readonly MergeWait[],
  nextId: number,
  dt: number,
): MergeOutcome {
  const index = byId(balls);
  const touching = livePairs(balls);
  const pending = continueWaits(index, waits, touching, dt);
  const ready = readyKeys(pending);
  const merging = drawTogether(balls, pending);
  const merged = mergeStep(merging, nextId, (a, b) => ready.has(keyOf(a.id, b.id)));
  const kept = dropConsumed(pending, merged.balls, ready);
  return {
    balls: pulseNew(merged.balls, nextId),
    waits: unionWaits(kept, livePairs(merged.balls)),
    score: merged.score,
    nextId: merged.nextId,
    pops: popsFor(merged.balls, nextId),
  };
}

export function agePops(pops: readonly ScorePop[], dt: number): ScorePop[] {
  const next: ScorePop[] = [];
  for (const pop of pops) {
    const age = pop.age + dt;
    if (age < POP_LIFE_MS) next.push({ ...pop, age });
  }
  return next;
}

export function capPops(pops: readonly ScorePop[]): ScorePop[] {
  if (pops.length <= MAX_POPS) return pops.slice();
  return pops.slice(pops.length - MAX_POPS);
}

function continueWaits(
  index: Map<number, Ball>,
  waits: readonly MergeWait[],
  touching: Map<string, MergeWait>,
  dt: number,
): MergeWait[] {
  const seen = new Set<string>();
  const out: MergeWait[] = [];
  for (const wait of waits) {
    if (!sameTierHeld(index, wait)) continue;
    seen.add(waitKey(wait));
    out.push({ ...wait, ms: wait.ms + dt });
  }
  for (const [key, pair] of touching) {
    if (!seen.has(key)) out.push({ ...pair, ms: dt });
  }
  return out;
}

export function mergeBlend(waits: readonly MergeWait[], id: number): number {
  let best = 0;
  for (const wait of waits) {
    if (wait.a !== id && wait.b !== id) continue;
    const t = wait.ms / MERGE_BLEND_MS;
    if (t > best) best = t;
  }
  if (best < 0) return 0;
  if (best > 1) return 1;
  return best;
}

function drawTogether(balls: readonly Ball[], waits: readonly MergeWait[]): Ball[] {
  if (waits.length === 0) return balls as Ball[];
  const next = balls.map((ball) => ({ ...ball }));
  const index = byId(next);
  for (const wait of waits) pullPair(index, wait);
  return next;
}

function pullPair(index: Map<number, Ball>, wait: MergeWait): void {
  const a = index.get(wait.a);
  const b = index.get(wait.b);
  if (!a || !b) return;
  const t = Math.min(1, wait.ms / MERGE_BLEND_MS);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  a.x += (midX - a.x) * t;
  a.y += (midY - a.y) * t;
  b.x += (midX - b.x) * t;
  b.y += (midY - b.y) * t;
  a.vx *= 1 - t;
  a.vy *= 1 - t;
  b.vx *= 1 - t;
  b.vy *= 1 - t;
}

function readyKeys(pending: readonly MergeWait[]): Set<string> {
  const ready = new Set<string>();
  for (const wait of pending) {
    if (wait.ms >= MERGE_BLEND_MS) ready.add(waitKey(wait));
  }
  return ready;
}

function dropConsumed(pending: readonly MergeWait[], balls: readonly Ball[], ready: Set<string>): MergeWait[] {
  const ids = new Set(balls.map((ball) => ball.id));
  return pending.filter((wait) => ids.has(wait.a) && ids.has(wait.b) && !ready.has(waitKey(wait)));
}

function unionWaits(kept: readonly MergeWait[], born: Map<string, MergeWait>): MergeWait[] {
  const seen = new Set(kept.map(waitKey));
  const out = kept.slice();
  for (const [key, pair] of born) {
    if (!seen.has(key)) out.push(pair);
  }
  return out;
}

function livePairs(balls: readonly Ball[]): Map<string, MergeWait> {
  const map = new Map<string, MergeWait>();
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      const a = balls[i];
      const b = balls[j];
      if (!circlesTouch(a, b)) continue;
      const key = keyOf(a.id, b.id);
      if (!map.has(key)) map.set(key, { a: a.id, b: b.id, tier: a.tier, ms: 0 });
    }
  }
  return map;
}

function sameTierHeld(index: Map<number, Ball>, wait: MergeWait): boolean {
  const a = index.get(wait.a);
  const b = index.get(wait.b);
  if (!a || !b || a.tier !== wait.tier || b.tier !== wait.tier) return false;
  return a.tier < MAX_TIER;
}

function popsFor(balls: readonly Ball[], previousNextId: number): ScorePop[] {
  const pops: ScorePop[] = [];
  for (const ball of balls) {
    if (ball.id < previousNextId) continue;
    const points = tierScore(ball.tier);
    if (points <= 0) continue;
    pops.push({ id: ball.id, x: ball.x, y: ball.y, points, age: 0 });
  }
  return pops;
}

function pulseNew(balls: readonly Ball[], previousNextId: number): Ball[] {
  return balls.map((ball) => {
    if (ball.id < previousNextId) return ball;
    return {
      ...ball,
      squash: Math.max(ball.squash ?? 0, MERGE_PULSE),
      jolt: Math.max(ball.jolt ?? 0, MERGE_PULSE * 0.8),
    };
  });
}

function byId(balls: readonly Ball[]): Map<number, Ball> {
  const map = new Map<number, Ball>();
  for (const ball of balls) map.set(ball.id, ball);
  return map;
}

function waitKey(wait: MergeWait): string {
  return keyOf(wait.a, wait.b);
}

function keyOf(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
