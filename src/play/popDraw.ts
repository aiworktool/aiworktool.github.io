import { bubbleRadius, type Bubble } from './popLogic';
import { prepCanvas } from './boardCanvas';

const FILLS = ['#d7efe4', '#f6e4d4', '#f6dbe2', '#e4eef3'];

export type Burst = { x: number; y: number; t: number };

export function drawBubbles(
  canvas: HTMLCanvasElement,
  bubbles: Bubble[],
  bursts: Burst[],
  now: number,
): void {
  const view = prepCanvas(canvas);
  if (!view) return;
  const radius = bubbleRadius(view.width, view.height);
  for (const bubble of bubbles) {
    if (!bubble.popped) drawBubble(view.ctx, bubble, view.width, view.height, radius);
  }
  for (const burst of bursts) drawBurst(view.ctx, burst, view.width, view.height, radius, now);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  bubble: Bubble,
  width: number,
  height: number,
  radius: number,
): void {
  const cx = bubble.x * width;
  const cy = bubble.y * height;
  ctx.beginPath();
  ctx.fillStyle = FILLS[bubble.tone % FILLS.length];
  ctx.strokeStyle = '#1f6b4a';
  ctx.lineWidth = 2;
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 253, 248, 0.9)';
  ctx.arc(cx - radius * 0.28, cy - radius * 0.32, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawBurst(
  ctx: CanvasRenderingContext2D,
  burst: Burst,
  width: number,
  height: number,
  radius: number,
  now: number,
): void {
  const age = (now - burst.t) / 240;
  if (age < 0 || age > 1) return;
  ctx.beginPath();
  ctx.strokeStyle = `rgba(31, 107, 74, ${1 - age})`;
  ctx.lineWidth = 2;
  ctx.arc(burst.x * width, burst.y * height, radius * (1 + age * 0.45), 0, Math.PI * 2);
  ctx.stroke();
}
