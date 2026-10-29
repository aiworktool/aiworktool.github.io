import { boardFrame, paintBoard } from './tetrisPoseBoard';
import type { TetrisGame } from './tetrisLogic';

export type PoseMark = { x: number; y: number; visibility: number };
type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

const MIN_VIS = 0.5;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const LIMBS: Array<[number, number]> = [
  [L_SHOULDER, R_SHOULDER],
  [L_SHOULDER, L_ELBOW],
  [L_ELBOW, L_WRIST],
  [R_SHOULDER, R_ELBOW],
  [R_ELBOW, R_WRIST],
];
const JOINTS = [L_SHOULDER, R_SHOULDER, L_ELBOW, R_ELBOW, L_WRIST, R_WRIST];

export function paintPose(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  marks: PoseMark[] | undefined,
  game: TetrisGame | null,
): void {
  ctx.clearRect(0, 0, width, height);
  if (marks) drawLimbs(ctx, marks, width, height);
  const frame = boardFrame(width, height);
  paintBoard(ctx, frame, game);
  drawTicks(ctx, frame);
}

function drawTicks(ctx: CanvasRenderingContext2D, box: Box): void {
  ctx.fillStyle = 'rgba(255, 230, 120, 0.78)';
  const step = Math.max(26, box.h / 8);
  for (let y = box.y + step * 0.5; y < box.y + box.h; y += step) {
    tick(ctx, box.x, y, 1);
    tick(ctx, box.x + box.w, y, -1);
  }
}

function tick(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x + dir * 8, y);
  ctx.lineTo(x, y + 5);
  ctx.closePath();
  ctx.fill();
}

function drawLimbs(
  ctx: CanvasRenderingContext2D,
  marks: PoseMark[],
  width: number,
  height: number,
): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  for (const [from, to] of LIMBS) {
    const start = point(marks, from, width, height);
    const end = point(marks, to, width, height);
    if (!start || !end) continue;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#fffdf8';
  for (const index of JOINTS) {
    const joint = point(marks, index, width, height);
    if (!joint) continue;
    ctx.beginPath();
    ctx.arc(joint.x, joint.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function point(marks: PoseMark[], index: number, width: number, height: number): Pt | null {
  const mark = marks[index];
  if (!mark || mark.visibility < MIN_VIS) return null;
  return { x: mark.x * width, y: mark.y * height };
}
