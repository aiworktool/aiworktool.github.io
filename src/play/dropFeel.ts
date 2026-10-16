import { MAX_TIER, tierRadius, type Ball } from './dropLogic';

const HIT_SPEED = 70;
const FADE_SQUASH = 0.9;
const FADE_JOLT = 0.93;
const SPREAD = 0.72;

export type BallPose = { sx: number; sy: number; rot: number };

export function impactOf(speed: number, hitterTier: number, selfTier: number): number {
  if (!Number.isFinite(speed) || speed < HIT_SPEED) return 0;
  const norm = Math.min(1, (speed - HIT_SPEED) / 980);
  const hitter = 0.4 + 0.6 * tierUnit(hitterTier);
  return Math.min(1, norm * hitter * give(selfTier));
}

export function floorImpact(speed: number, tier: number): number {
  return impactOf(speed, Math.round(MAX_TIER * 0.7), tier);
}

export function feelStep(balls: readonly Ball[]): Ball[] {
  if (!balls.some(needsFeel)) return balls as Ball[];
  const next = balls.map(absorb);
  spread(next);
  return next.map(fade);
}

function absorb(ball: Ball): Ball {
  const hit = ball.hit ?? 0;
  if (hit <= 0) return { ...ball };
  return {
    ...ball,
    squash: Math.max(ball.squash ?? 0, hit),
    jolt: Math.max(ball.jolt ?? 0, hit),
  };
}

const BREATH_MS = 560;

export function ballPose(ball: Ball, now: number): BallPose {
  const soft = give(ball.tier);
  const squash = clamp01(ball.squash ?? 0);
  const jolt = clamp01(ball.jolt ?? 0);
  const falling = !ball.rest && ball.vy > 160 ? Math.min(0.34, ball.vy / 2400) * soft : 0;
  const wave = Math.sin(now / (BREATH_MS * 2) + ball.id);
  const sy = clampScale(1 + falling - squash * 0.55 * soft);
  const sx = clampScale(1 + (1 - sy) * 0.95);
  const rot = wave * (1.4 + jolt * 6) * soft;
  return { sx, sy, rot };
}

const BREATH_AMP = 0.08;
const BREATH_CAP = 0.09;

export function breathShape(
  balls: readonly Ball[],
  now: number,
): Map<number, { sx: number; sy: number }> {
  const signs = colorContacts(balls);
  const wave = Math.sin(now / BREATH_MS);
  const shapes = new Map<number, { sx: number; sy: number }>();
  for (const ball of balls) {
    const amp = give(ball.tier) * BREATH_AMP;
    const d = breathDelta(signs.get(ball.id) ?? 1, wave, amp);
    const sx = 1 + d;
    shapes.set(ball.id, { sx, sy: 1 / sx });
  }
  return shapes;
}

function breathDelta(sign: number, wave: number, amp: number): number {
  const d = sign * wave * amp;
  if (d > BREATH_CAP) return BREATH_CAP;
  if (d < -BREATH_CAP) return -BREATH_CAP;
  return d;
}

export function needsFeel(ball: Ball): boolean {
  return (ball.hit ?? 0) > 0.02 || (ball.squash ?? 0) > 0.02 || (ball.jolt ?? 0) > 0.02;
}

function spread(balls: Ball[]): void {
  const hits = balls.map((ball) => ball.hit ?? 0);
  for (let i = 0; i < balls.length; i += 1) {
    if (hits[i] <= 0.02) continue;
    for (let j = 0; j < balls.length; j += 1) {
      if (i === j || gap(balls[i], balls[j]) > 1.2) continue;
      const kick = hits[i] * SPREAD * give(balls[j].tier);
      balls[j].squash = Math.max(balls[j].squash ?? 0, kick);
      balls[j].jolt = Math.max(balls[j].jolt ?? 0, kick);
    }
  }
}

function fade(ball: Ball): Ball {
  const squash = (ball.squash ?? 0) * FADE_SQUASH;
  const jolt = (ball.jolt ?? 0) * FADE_JOLT;
  const nextSquash = squash < 0.02 ? 0 : squash;
  const nextJolt = jolt < 0.02 ? 0 : jolt;
  if (nextSquash === (ball.squash ?? 0) && nextJolt === (ball.jolt ?? 0) && (ball.hit ?? 0) === 0) {
    return ball;
  }
  return { ...ball, squash: nextSquash, jolt: nextJolt, hit: 0 };
}

function give(tier: number): number {
  return 1 - tierUnit(tier) * 0.62;
}

function tierUnit(tier: number): number {
  if (!Number.isFinite(tier) || tier <= 0) return 0;
  if (tier >= MAX_TIER) return 1;
  return tier / MAX_TIER;
}

function colorContacts(balls: readonly Ball[]): Map<number, number> {
  const signs = new Map<number, number>();
  for (const ball of balls) signs.set(ball.id, ball.id % 2 === 0 ? 1 : -1);
  const touch = contactIds(balls);
  const order = balls.map((ball) => ball.id).sort((a, b) => a - b);
  for (const id of order) {
    const sign = signs.get(id) ?? 1;
    const neighbors = (touch.get(id) ?? []).filter((other) => other > id);
    neighbors.sort((a, b) => a - b);
    for (const other of neighbors) {
      if (signs.get(other) !== sign) continue;
      signs.set(other, -sign);
    }
  }
  return signs;
}

function contactIds(balls: readonly Ball[]): Map<number, number[]> {
  const touch = new Map<number, number[]>();
  for (const ball of balls) touch.set(ball.id, []);
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      if (gap(balls[i], balls[j]) > 2) continue;
      touch.get(balls[i].id)?.push(balls[j].id);
      touch.get(balls[j].id)?.push(balls[i].id);
    }
  }
  return touch;
}

function gap(a: Ball, b: Ball): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) - tierRadius(a.tier) - tierRadius(b.tier);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampScale(value: number): number {
  if (value < 0.56) return 0.56;
  if (value > 1.48) return 1.48;
  return value;
}
