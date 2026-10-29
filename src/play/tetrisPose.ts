import { TETRIS_H } from './tetrisLogic';

export type PosePoint = { x: number; y: number; visibility: number };

export type PoseBody = {
  nose: PosePoint;
  leftWrist: PosePoint;
  rightWrist: PosePoint;
  leftShoulder: PosePoint;
  rightShoulder: PosePoint;
};

export type PoseAction = 'rotateCcw' | 'rotateCw' | 'drop' | 'none';
export type PoseMove = 'left' | 'right' | 'none';
export type PoseGate = { last: PoseAction; at: number };
export type MoveGate = { dir: PoseMove; at: number };

const MIN_VIS = 0.5;
const COOLDOWN_MS = 400;
const MOVE_MS = 200;
const LIFT = 0.05;
const RAISE = 0.16;
const CLOSE = 0.14;
const LEVEL = 0.12;
const CENTER = 0.1;
const CHEST_UP = 0.06;
const CHEST_DOWN = 0.28;
const SHIFT = 0.07;
const LINE_SPAN = 0.42;

export function poseAction(body: PoseBody): PoseAction {
  if (!seen(body)) return 'none';
  if (clapping(body)) return 'rotateCw';
  if (bothLifted(body)) return 'none';
  if (bothDown(body)) return 'drop';
  return 'none';
}

export function poseLean(body: PoseBody): PoseMove {
  if (!seen(body) || clapping(body) || !bothLifted(body)) return 'none';
  const midBody = (body.leftShoulder.x + body.rightShoulder.x) / 2;
  const midHands = (body.leftWrist.x + body.rightWrist.x) / 2;
  if (midHands < midBody - SHIFT) return 'left';
  if (midHands > midBody + SHIFT) return 'right';
  return 'none';
}

export function senseRow(body: PoseBody): number {
  if (!seen(body)) return 0;
  const shoulder = (body.leftShoulder.y + body.rightShoulder.y) / 2;
  const wrist = Math.max(body.leftWrist.y, body.rightWrist.y);
  const t = (wrist - shoulder) / LINE_SPAN;
  const clamped = Math.min(1, Math.max(0, t));
  return Math.round(clamped * (TETRIS_H - 1));
}

export function acceptDrop(
  ready: boolean,
  action: PoseAction,
  cleared: boolean,
): { ready: boolean; action: PoseAction } {
  if (action === 'drop') {
    if (!ready) return { ready: false, action: 'none' };
    return { ready: false, action: 'drop' };
  }
  if (cleared) return { ready: true, action };
  return { ready, action };
}

export function dropCleared(body: PoseBody): boolean {
  return body.leftWrist.y <= body.leftShoulder.y + LIFT
    && body.rightWrist.y <= body.rightShoulder.y + LIFT;
}

export function canSenseFollow(body: PoseBody): boolean {
  return bothLifted(body) && !bothDown(body) && !clapping(body);
}

export function nextPoseGate(
  gate: PoseGate,
  action: PoseAction,
  now: number,
): { gate: PoseGate; fire: PoseAction | null } {
  if (action === 'none') return { gate: { last: 'none', at: gate.at }, fire: null };
  if (action === gate.last) return { gate, fire: null };
  if (now - gate.at < COOLDOWN_MS) return { gate: { last: action, at: gate.at }, fire: null };
  return { gate: { last: action, at: now }, fire: action };
}

export function nextPoseMove(
  gate: MoveGate,
  dir: PoseMove,
  now: number,
): { gate: MoveGate; fire: boolean } {
  if (dir === 'none') return { gate: { dir: 'none', at: gate.at }, fire: false };
  if (dir !== gate.dir || now - gate.at >= MOVE_MS) {
    return { gate: { dir, at: now }, fire: true };
  }
  return { gate, fire: false };
}

function seen(body: PoseBody): boolean {
  return [body.leftWrist, body.rightWrist, body.leftShoulder, body.rightShoulder]
    .every((point) => point.visibility >= MIN_VIS);
}

function bothDown(body: PoseBody): boolean {
  return clearlyDown(body.leftWrist, body.leftShoulder)
    && clearlyDown(body.rightWrist, body.rightShoulder);
}

function bothLifted(body: PoseBody): boolean {
  return slightlyUp(body.leftWrist, body.leftShoulder)
    && slightlyUp(body.rightWrist, body.rightShoulder);
}

function slightlyUp(wrist: PosePoint, shoulder: PosePoint): boolean {
  return wrist.y < shoulder.y + RAISE;
}

function clearlyDown(wrist: PosePoint, shoulder: PosePoint): boolean {
  return wrist.y > shoulder.y + LIFT;
}

function clapping(body: PoseBody): boolean {
  if (!close(body.leftWrist, body.rightWrist)) return false;
  if (Math.abs(body.leftWrist.y - body.rightWrist.y) > LEVEL) return false;
  const midBody = (body.leftShoulder.x + body.rightShoulder.x) / 2;
  const midHands = (body.leftWrist.x + body.rightWrist.x) / 2;
  if (Math.abs(midHands - midBody) > CENTER) return false;
  const shoulderY = (body.leftShoulder.y + body.rightShoulder.y) / 2;
  const handY = (body.leftWrist.y + body.rightWrist.y) / 2;
  return handY >= shoulderY - CHEST_UP && handY <= shoulderY + CHEST_DOWN;
}

function close(left: PosePoint, right: PosePoint): boolean {
  return Math.hypot(left.x - right.x, left.y - right.y) < CLOSE;
}
