import type { Dir } from './twentyLogic';

export type PosePoint = { x: number; y: number; visibility: number };

export type TorsoBody = {
  leftShoulder: PosePoint;
  rightShoulder: PosePoint;
  leftHip: PosePoint;
  rightHip: PosePoint;
};

export type TorsoDir = Dir | 'none';
export type TorsoGate = { last: TorsoDir; at: number };
export type HeightBase = { y: number; ready: boolean };

const MIN_VIS = 0.5;
const COOLDOWN_MS = 500;
const SIDE = 0.08;
const VERT = 0.045;
const BASE_BLEND = 0.08;

export function torsoDir(body: TorsoBody, base: HeightBase): TorsoDir {
  if (!seen(body) || !base.ready) return 'none';
  const midX = (body.leftShoulder.x + body.rightShoulder.x) / 2;
  const midY = torsoY(body);
  const dx = midX - 0.5;
  const dy = midY - base.y;
  if (Math.abs(dx) < SIDE && Math.abs(dy) < VERT) return 'none';
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= SIDE) {
    return dx < 0 ? 'left' : 'right';
  }
  if (Math.abs(dy) >= VERT) return dy < 0 ? 'up' : 'down';
  return 'none';
}

export function nextHeightBase(base: HeightBase, body: TorsoBody, dir: TorsoDir): HeightBase {
  if (!seen(body)) return base;
  const y = torsoY(body);
  if (!base.ready) return { y, ready: true };
  if (dir !== 'none') return base;
  return { y: base.y * (1 - BASE_BLEND) + y * BASE_BLEND, ready: true };
}

export function nextTorsoGate(
  gate: TorsoGate,
  dir: TorsoDir,
  now: number,
): { gate: TorsoGate; fire: Dir | null } {
  if (dir === 'none') return { gate: { last: 'none', at: gate.at }, fire: null };
  if (dir === gate.last) return { gate, fire: null };
  if (now - gate.at < COOLDOWN_MS) return { gate: { last: dir, at: gate.at }, fire: null };
  return { gate: { last: dir, at: now }, fire: dir };
}

function torsoY(body: TorsoBody): number {
  return (
    body.leftShoulder.y + body.rightShoulder.y + body.leftHip.y + body.rightHip.y
  ) / 4;
}

function seen(body: TorsoBody): boolean {
  return [body.leftShoulder, body.rightShoulder, body.leftHip, body.rightHip]
    .every((point) => point.visibility >= MIN_VIS);
}
