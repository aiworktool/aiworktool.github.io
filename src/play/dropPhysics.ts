import { feelStep, floorImpact, impactOf } from './dropFeel';
import { agePops, capPops, settleMerge } from './dropMerge';
import {
  CUP_H, CUP_W, MAX_TIER, OVER_DELAY_MS, addScore, findMergePair, overAfterSettle,
  restingAboveLine, tierRadius, type Ball, type DropState,
} from './dropLogic';

export const STEP_MS = 1000 / 60;
const DT = STEP_MS / 1000;
const GRAVITY = 3600;
const RESTITUTION = 0.06;
const AIR = 0.995;
const SLEEP_SPEED = 18;
const SUPPORT_DOWN = 0.2;
const MAX_SPEED = 1600;
const SOLVE_ITERS = 24;
const FLOOR_SLOP = 1.4;
const OVERLAP_SLOP = 0.45;
const SLOPE_KEEP = 0.1;
const HIT_PUSH = 210;

export function needsSim(state: DropState): boolean {
  if (state.phase === 'over') return false;
  if ((state.pops?.length ?? 0) > 0 || (state.waits?.length ?? 0) > 0) return true;
  if (state.balls.some((ball) => !ball.rest)) return true;
  const soft = (ball: Ball) => (ball.squash ?? 0) > 0.02 || (ball.jolt ?? 0) > 0.02;
  if (state.balls.some(soft)) return true;
  if (pairsOverlap(state.balls)) return true;
  if (hasFloater(state.balls)) return true;
  if (hasRolling(state.balls)) return true;
  if (!restingAboveLine(state.balls)) return false;
  return state.calmMs <= OVER_DELAY_MS;
}

export function stepDrop(state: DropState, dtMs: number): DropState {
  if (state.phase === 'over' || !needsSim(state)) return state;
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? Math.min(dtMs, 50) : STEP_MS;
  const aged = agePops(state.pops ?? [], dt);
  if (pileIsCalm(state.balls) && (state.waits?.length ?? 0) === 0) {
    return finish(advanceCalm({ ...state, pops: aged }, dt));
  }
  const live = markRolling(state.balls);
  const moved = live.map((ball) => fall(ball, live.length));
  const solved = wakeOrSleep(solve(moved));
  const merged = settleMerge(solved, state.waits ?? [], state.nextId, dt);
  const felt = feelStep(merged.balls);
  const resting = felt.every((ball) => ball.rest);
  const calmMs = merged.score > 0 || !resting ? 0 : state.calmMs + dt;
  const score = addScore(state.score, merged.score);
  return finish({
    ...state,
    balls: felt,
    score,
    best: Math.max(state.best, score),
    nextId: merged.nextId,
    waits: merged.waits,
    pops: capPops(aged.concat(merged.pops)),
    calmMs,
  });
}

function advanceCalm(state: DropState, dt: number): DropState {
  const felt = feelStep(state.balls);
  const calmMs = state.calmMs + dt;
  const sameBalls = felt === state.balls;
  const next = sameBalls && calmMs === state.calmMs ? state : { ...state, balls: felt, calmMs };
  return finish(next);
}

function finish(state: DropState): DropState {
  if (!pileIsCalm(state.balls)) return state;
  if (overAfterSettle(state.balls, state.calmMs)) return { ...state, phase: 'over' };
  return state;
}

function hasFloater(balls: readonly Ball[]): boolean {
  if (balls.length === 0) return false;
  const supported = supportFlags(balls);
  return balls.some((ball, index) => !grounded(ball, balls, supported[index]));
}

function pileIsCalm(balls: readonly Ball[]): boolean {
  if (balls.length === 0 || balls.some((ball) => !ball.rest)) return false;
  if (findMergePair(balls)) return false;
  if (pairsOverlap(balls)) return false;
  if (hasRolling(balls)) return false;
  return !hasFloater(balls);
}

function grounded(ball: Ball, balls: readonly Ball[], supported: boolean): boolean {
  if (supported) return true;
  if (slopeDir(ball, balls)) return false;
  return contactNormals(ball, balls).length > 0;
}

function fall(ball: Ball, count: number): Ball {
  if (ball.rest) return ball;
  const extra = Math.min(0.6, Math.max(0, count - 1) * 0.04);
  let vx = ball.vx * AIR;
  let vy = (ball.vy + GRAVITY * (1 + extra) * DT) * AIR;
  const speed = Math.hypot(vx, vy);
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed;
    vx *= scale;
    vy *= scale;
  }
  return { ...ball, x: ball.x + vx * DT, y: ball.y + vy * DT, vx, vy, rest: false };
}

function solve(balls: readonly Ball[]): Ball[] {
  const next = balls.map((ball) => ({ ...ball }));
  for (let iter = 0; iter < SOLVE_ITERS; iter += 1) {
    for (let i = 0; i < next.length; i += 1) next[i] = keepInCup(next[i]);
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) separate(next[i], next[j]);
    }
  }
  for (let i = 0; i < next.length; i += 1) next[i] = keepInCup(next[i]);
  slideStuck(next);
  settleVelocities(next);
  driveSlopes(next);
  return next;
}

function keepInCup(ball: Ball): Ball {
  const radius = tierRadius(ball.tier);
  let { x, y, vx, vy } = ball;
  if (x < radius) {
    x = radius;
    if (vx < 0) vx = -vx * RESTITUTION;
  } else if (x > CUP_W - radius) {
    x = CUP_W - radius;
    if (vx > 0) vx = -vx * RESTITUTION;
  }
  let hit = ball.hit ?? 0;
  if (y > CUP_H - radius) {
    y = CUP_H - radius;
    const landed = ball.vy > 0 ? floorImpact(ball.vy, ball.tier) : 0;
    if (landed > hit) hit = landed;
    if (Math.abs(vy) < 90) vy = 0;
    else if (vy > 0) vy = -vy * RESTITUTION;
    vx *= 0.75;
  } else if (vy > 0 && y >= CUP_H - radius - FLOOR_SLOP) {
    vy = 0;
  }
  if (x === ball.x && y === ball.y && vx === ball.vx && vy === ball.vy && hit === (ball.hit ?? 0)) {
    return ball;
  }
  return { ...ball, x, y, vx, vy, hit };
}

function separate(a: Ball, b: Ball): void {
  const ra = tierRadius(a.tier);
  const rb = tierRadius(b.tier);
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const minDist = ra + rb;
  if (dist >= minDist) return;
  if (dist < 0.0001) {
    dx = 1;
    dy = 0;
    dist = 0.0001;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  const ma = ra * ra * ra;
  const mb = rb * rb * rb;
  const raw = minDist - dist;
  if (raw > OVERLAP_SLOP) moveApart(a, b, nx, ny, raw - OVERLAP_SLOP, ma, mb);
  resolveHit(a, b, nx, ny, ma, mb);
}

function moveApart(
  a: Ball,
  b: Ball,
  nx: number,
  ny: number,
  overlap: number,
  ma: number,
  mb: number,
): void {
  const share = splitOverlap(ma, mb);
  const movedA = nudge(a, -nx, -ny, overlap * share.a, ma, mb);
  const movedB = nudge(b, nx, ny, overlap * share.b, mb, ma);
  const left = overlap - movedA - movedB;
  if (left > 0.05) giveLeft(a, b, nx, ny, left, ma, mb);
}

function giveLeft(
  a: Ball,
  b: Ball,
  nx: number,
  ny: number,
  left: number,
  ma: number,
  mb: number,
): void {
  if (ma > mb) nudge(b, nx, ny, left, mb, ma);
  else if (mb > ma) nudge(a, -nx, -ny, left, ma, mb);
  else {
    nudge(a, -nx, -ny, left / 2, ma, mb);
    nudge(b, nx, ny, left / 2, mb, ma);
  }
}

function wouldLift(dirY: number, selfMass: number, otherMass: number): boolean {
  return dirY < -0.05 && selfMass > otherMass;
}

function nudge(
  ball: Ball,
  dirX: number,
  dirY: number,
  dist: number,
  selfMass: number,
  otherMass: number,
): number {
  if (dist <= 0) return 0;
  const dx = dirX * dist;
  const dy = wouldLift(dirY, selfMass, otherMass) ? 0 : dirY * dist;
  const radius = tierRadius(ball.tier);
  const nextX = Math.min(CUP_W - radius, Math.max(radius, ball.x + dx));
  const nextY = Math.min(CUP_H - radius, ball.y + dy);
  const appliedX = nextX - ball.x;
  const appliedY = nextY - ball.y;
  ball.x = nextX;
  ball.y = nextY;
  const along = appliedX * dirX + appliedY * dirY;
  return along > 0 ? along : 0;
}

function slideStuck(balls: Ball[]): void {
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      const ma = volumeMass(balls[i]);
      const mb = volumeMass(balls[j]);
      slideOut(balls[i], balls[j], ma, mb, balls);
    }
  }
}

function slideOut(a: Ball, b: Ball, ma: number, mb: number, balls: readonly Ball[]): void {
  const minDist = tierRadius(a.tier) + tierRadius(b.tier) - OVERLAP_SLOP;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const depth = minDist - Math.hypot(dx, dy);
  if (depth < 3) return;
  if (ma > mb) {
    takeSpot(b, orbitSpot(b, a, minDist, balls));
    return;
  }
  if (mb > ma) {
    takeSpot(a, orbitSpot(a, b, minDist, balls));
    return;
  }
  const need = sideNeed(a, b, minDist);
  if (need <= 0) return;
  const moved = slideX(a, b.x, need);
  if (need - moved > 0.05) slideX(b, a.x, need - moved);
}

function sideNeed(ball: Ball, other: Ball, minDist: number): number {
  const dy = ball.y - other.y;
  const limit = minDist * minDist - dy * dy;
  if (limit <= 0) return 0;
  return Math.max(0, Math.sqrt(limit) - Math.abs(ball.x - other.x));
}

function slideX(ball: Ball, otherX: number, need: number): number {
  const radius = tierRadius(ball.tier);
  const left = ball.x - radius;
  const right = CUP_W - radius - ball.x;
  let dir = ball.x >= otherX ? 1 : -1;
  if (Math.abs(ball.x - otherX) < 0.8) dir = right >= left ? 1 : -1;
  const room = dir > 0 ? right : left;
  const push = Math.min(Math.max(0, room), need);
  ball.x += dir * push;
  return push;
}

function resolveHit(a: Ball, b: Ball, nx: number, ny: number, ma: number, mb: number): void {
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel < -HIT_PUSH) {
    const kickA = impactOf(-rel, b.tier, a.tier);
    const kickB = impactOf(-rel, a.tier, b.tier);
    if (kickA > (a.hit ?? 0)) a.hit = kickA;
    if (kickB > (b.hit ?? 0)) b.hit = kickB;
  }
  const stick = a.tier === b.tier && a.tier < MAX_TIER;
  if (rel >= 0 && !stick) return;
  const invA = 1 / ma;
  const invB = 1 / mb;
  const bounce = stick ? 0 : RESTITUTION;
  const impulse = -(1 + bounce) * rel / (invA + invB);
  const prevAy = a.vy;
  const prevBy = b.vy;
  a.vx -= impulse * nx * invA;
  a.vy -= impulse * ny * invA;
  b.vx += impulse * nx * invB;
  b.vy += impulse * ny * invB;
  if (ny > 0.05) a.vy = rejectLift(a.vy, prevAy, ma, mb);
  if (ny < -0.05) b.vy = rejectLift(b.vy, prevBy, mb, ma);
  clampSpeed(a);
  clampSpeed(b);
}

function rejectLift(vy: number, prev: number, selfMass: number, otherMass: number): number {
  if (!(selfMass > otherMass)) return vy;
  const limit = Math.min(prev, 0);
  return vy < limit ? limit : vy;
}

function clampSpeed(ball: Ball): void {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed <= MAX_SPEED) return;
  const scale = MAX_SPEED / speed;
  ball.vx *= scale;
  ball.vy *= scale;
}

function settleVelocities(balls: Ball[]): void {
  for (const ball of balls) stopIntoFloor(ball);
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) stopClosing(balls[i], balls[j]);
  }
}

function stopIntoFloor(ball: Ball): void {
  const radius = tierRadius(ball.tier);
  if (ball.vy > 0 && ball.y >= CUP_H - radius - FLOOR_SLOP) ball.vy = 0;
}

function stopClosing(a: Ball, b: Ball): void {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const reach = tierRadius(a.tier) + tierRadius(b.tier) + OVERLAP_SLOP;
  if (dist > reach) return;
  if (dist < 0.0001) {
    dx = 1;
    dy = 0;
    dist = 0.0001;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rel >= 0) return;
  const aTan = tangential(a.vx, a.vy, nx, ny);
  const bTan = tangential(b.vx, b.vy, nx, ny);
  const prevAy = a.vy;
  const prevBy = b.vy;
  const ma = volumeMass(a);
  const mb = volumeMass(b);
  cancelInto(a, nx, ny);
  cancelInto(b, -nx, -ny);
  pasteTangent(a, aTan, nx, ny);
  pasteTangent(b, bTan, -nx, -ny);
  if (ny > 0.05) a.vy = rejectLift(a.vy, prevAy, ma, mb);
  if (ny < -0.05) b.vy = rejectLift(b.vy, prevBy, mb, ma);
}

function volumeMass(ball: Ball): number {
  const radius = tierRadius(ball.tier);
  return radius * radius * radius;
}

function cancelInto(ball: Ball, nx: number, ny: number): void {
  const into = ball.vx * nx + ball.vy * ny;
  if (into <= 0) return;
  ball.vx -= into * nx;
  ball.vy -= into * ny;
}

function tangential(vx: number, vy: number, nx: number, ny: number): { x: number; y: number } {
  const into = vx * nx + vy * ny;
  return { x: vx - into * nx, y: vy - into * ny };
}

function pasteTangent(ball: Ball, tan: { x: number; y: number }, nx: number, ny: number): void {
  const into = ball.vx * nx + ball.vy * ny;
  ball.vx = tan.x + into * nx;
  ball.vy = tan.y + into * ny;
}

function splitOverlap(ma: number, mb: number): { a: number; b: number } {
  const total = ma + mb;
  if (!(total > 0)) return { a: 0.5, b: 0.5 };
  return { a: mb / total, b: ma / total };
}

function wakeOrSleep(balls: Ball[]): Ball[] {
  const supported = supportFlags(balls);
  return balls.map((ball, index) => {
    const speed = Math.hypot(ball.vx, ball.vy);
    const rolling = slopeDir(ball, balls) != null;
    const held = grounded(ball, balls, supported[index]);
    if (!rolling && held && speed < SLEEP_SPEED) {
      if (ball.rest && ball.vx === 0 && ball.vy === 0) return ball;
      return { ...ball, vx: 0, vy: 0, rest: true };
    }
    return ball.rest ? { ...ball, rest: false } : ball;
  });
}

function supportFlags(balls: readonly Ball[]): boolean[] {
  const order = balls.map((ball, index) => ({ index, y: ball.y }));
  order.sort((a, b) => b.y - a.y);
  const flags = balls.map(() => false);
  for (const item of order) {
    const ball = balls[item.index];
    const radius = tierRadius(ball.tier);
    if (ball.y >= CUP_H - radius - FLOOR_SLOP) {
      flags[item.index] = true;
      continue;
    }
    flags[item.index] = balls.some((other, otherIndex) => (
      flags[otherIndex] && otherIndex !== item.index && heldUpBy(ball, other)
    ));
  }
  return flags;
}

function pairsOverlap(balls: readonly Ball[]): boolean {
  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      if (gap(balls[i], balls[j]) < -OVERLAP_SLOP - 0.08) return true;
    }
  }
  return false;
}

function heldUpBy(ball: Ball, other: Ball): boolean {
  const dx = other.x - ball.x;
  const dy = other.y - ball.y;
  const dist = Math.hypot(dx, dy);
  if (dist - tierRadius(ball.tier) - tierRadius(other.tier) > FLOOR_SLOP) return false;
  if (dist < 0.001) return true;
  return dy / dist >= SUPPORT_DOWN;
}

function gap(a: Ball, b: Ball): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) - tierRadius(a.tier) - tierRadius(b.tier);
}

function markRolling(balls: readonly Ball[]): Ball[] {
  const roll = balls.map((ball) => ball.rest && slopeDir(ball, balls) != null);
  if (!roll.some(Boolean)) return balls as Ball[];
  return balls.map((ball, index) => (roll[index] ? { ...ball, rest: false } : ball));
}

function hasRolling(balls: readonly Ball[]): boolean {
  return balls.some((ball) => slopeDir(ball, balls) != null);
}

function driveSlopes(balls: Ball[]): void {
  const gain = GRAVITY * DT;
  for (const ball of balls) {
    const tangent = slopeDir(ball, balls);
    if (!tangent) {
      settleIfHeld(ball, balls);
      continue;
    }
    const along = ball.vx * tangent.x + ball.vy * tangent.y;
    const want = Math.min(90, gain * tangent.y);
    if (along >= want) continue;
    const add = Math.min(want - along, gain * 0.35);
    ball.vx += tangent.x * add;
    ball.vy += tangent.y * add;
  }
}

function settleIfHeld(ball: Ball, balls: readonly Ball[]): void {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed === 0 || speed >= 90) return;
  if (contactNormals(ball, balls).length === 0 && !onFloor(ball)) return;
  ball.vx = 0;
  ball.vy = 0;
}

function onFloor(ball: Ball): boolean {
  return ball.y >= CUP_H - tierRadius(ball.tier) - FLOOR_SLOP;
}

function slopeDir(ball: Ball, balls: readonly Ball[]): { x: number; y: number } | null {
  const radius = tierRadius(ball.tier);
  if (ball.y >= CUP_H - radius - FLOOR_SLOP) return null;
  const normals = contactNormals(ball, balls);
  let bestY = SLOPE_KEEP;
  let best: { x: number; y: number } | null = null;
  for (const normal of normals) {
    const tangent = downTangent(normal);
    if (tangent.y <= bestY) continue;
    if (tangentBlocked(ball, tangent, normals)) continue;
    if (!pathClear(ball, tangent, balls)) continue;
    bestY = tangent.y;
    best = tangent;
  }
  return best;
}

function contactNormals(ball: Ball, balls: readonly Ball[]): { x: number; y: number }[] {
  const normals: { x: number; y: number }[] = [];
  const radius = tierRadius(ball.tier);
  for (const other of balls) {
    if (other === ball) continue;
    const dx = other.x - ball.x;
    const dy = other.y - ball.y;
    const dist = Math.hypot(dx, dy);
    const reach = radius + tierRadius(other.tier) + FLOOR_SLOP;
    if (dist > reach || dist < 0.0001) continue;
    normals.push({ x: dx / dist, y: dy / dist });
  }
  return normals;
}

function downTangent(normal: { x: number; y: number }): { x: number; y: number } {
  const left = { x: -normal.y, y: normal.x };
  if (left.y >= 0) return left;
  return { x: normal.y, y: -normal.x };
}

function pathClear(
  ball: Ball,
  tangent: { x: number; y: number },
  balls: readonly Ball[],
): boolean {
  const step = 1.6;
  const x = ball.x + tangent.x * step;
  const y = ball.y + tangent.y * step;
  const radius = tierRadius(ball.tier);
  if (x < radius || x > CUP_W - radius || y > CUP_H - radius) return false;
  for (const other of balls) {
    if (other === ball) continue;
    const dx = x - other.x;
    const dy = y - other.y;
    const minDist = radius + tierRadius(other.tier) - OVERLAP_SLOP;
    if (dx * dx + dy * dy < minDist * minDist) return false;
  }
  return true;
}

function tangentBlocked(
  ball: Ball,
  tangent: { x: number; y: number },
  normals: readonly { x: number; y: number }[],
): boolean {
  const radius = tierRadius(ball.tier);
  if (tangent.x < -0.02 && ball.x <= radius + 0.8) return true;
  if (tangent.x > 0.02 && ball.x >= CUP_W - radius - 0.8) return true;
  for (const normal of normals) {
    if (tangent.x * normal.x + tangent.y * normal.y > 0.08) return true;
  }
  return false;
}

function orbitSpot(
  light: Ball,
  heavy: Ball,
  minDist: number,
  balls: readonly Ball[],
): { x: number; y: number; clear: boolean } | null {
  const dx = light.x - heavy.x;
  const dy = light.y - heavy.y;
  const dist = Math.hypot(dx, dy);
  const side = light.x >= heavy.x ? 1 : -1;
  const base = dist < 0.0001 ? Math.atan2(0.2, side) : Math.atan2(dy, dx);
  const radius = tierRadius(light.tier);
  let best: { x: number; y: number; pen: number } | null = null;
  for (let i = 0; i <= 28; i += 1) {
    const turn = (i / 28) * Math.PI;
    const angles = i === 0 ? [base] : [base + turn, base - turn];
    const found = nearerSpot(light, heavy, minDist, radius, angles, balls, best);
    if (found.clear && found.spot) {
      return { x: found.spot.x, y: found.spot.y, clear: true };
    }
    best = found.spot ?? best;
  }
  if (!best) return null;
  return { x: best.x, y: best.y, clear: false };
}

function nearerSpot(
  light: Ball,
  heavy: Ball,
  minDist: number,
  radius: number,
  angles: readonly number[],
  balls: readonly Ball[],
  best: { x: number; y: number; pen: number } | null,
): { clear: boolean; spot: { x: number; y: number; pen: number } | null } {
  let next = best;
  for (const angle of angles) {
    const x = heavy.x + Math.cos(angle) * minDist;
    const y = heavy.y + Math.sin(angle) * minDist;
    if (x < radius || x > CUP_W - radius || y > CUP_H - radius) continue;
    const pen = spotPen(light, heavy, x, y, balls);
    if (pen <= OVERLAP_SLOP) return { clear: true, spot: { x, y, pen } };
    if (!next || pen < next.pen) next = { x, y, pen };
  }
  return { clear: false, spot: next };
}

function spotPen(light: Ball, heavy: Ball, x: number, y: number, balls: readonly Ball[]): number {
  let pen = 0;
  const radius = tierRadius(light.tier);
  for (const other of balls) {
    if (other === light || other === heavy) continue;
    const dx = x - other.x;
    const dy = y - other.y;
    const gap = Math.hypot(dx, dy) - radius - tierRadius(other.tier);
    if (gap < 0) pen -= gap;
  }
  return pen;
}

function takeSpot(ball: Ball, spot: { x: number; y: number; clear: boolean } | null): void {
  if (!spot) return;
  const dx = spot.x - ball.x;
  const dy = spot.y - ball.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) return;
  const limit = Math.min(dist, spot.clear ? 8 : 4);
  ball.x += (dx / dist) * limit;
  ball.y += (dy / dist) * limit;
}
