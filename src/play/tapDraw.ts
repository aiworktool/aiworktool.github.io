import { prepCanvas } from './boardCanvas';
import { dotScale, type Dot } from './tapLogic';

const FILLS = ['#1f6b4a', '#c4783a', '#3d6f8c', '#a33b4a'];

export function drawDots(canvas: HTMLCanvasElement | null, dots: Dot[], now: number): void {
  if (!canvas) return;
  const view = prepCanvas(canvas);
  if (!view) return;
  const unit = Math.min(view.width, view.height);
  for (const dot of dots) drawDot(view.ctx, dot, now, view.width, view.height, unit);
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  dot: Dot,
  now: number,
  width: number,
  height: number,
  unit: number,
): void {
  const radius = unit * dot.r * dotScale(dot, now);
  ctx.beginPath();
  ctx.fillStyle = FILLS[dot.id % FILLS.length];
  ctx.arc(dot.x * width, dot.y * height, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 253, 248, 0.35)';
  ctx.arc(dot.x * width - radius * 0.25, dot.y * height - radius * 0.28, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
}
