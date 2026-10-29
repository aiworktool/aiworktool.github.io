import { SIZE, type Board } from './twentyLogic';
import type { TorsoBody, TorsoDir } from './twentyPose';

export type Frame = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

const FILL: Record<number, string> = {
  2: '#fffdf8',
  4: '#f3e6d4',
  8: '#e8c9a4',
  16: '#d7a56e',
  32: '#c4783a',
  64: '#8d4e22',
  128: '#6e8f72',
  256: '#3f7a58',
  512: '#2d6b4f',
  1024: '#1f6b4a',
  2048: '#1f6b4a',
};

export function boardFrame(width: number, height: number): Frame {
  const pad = Math.min(width, height) * 0.01;
  const side = Math.min(width, height) - pad * 2;
  return { x: (width - side) / 2, y: (height - side) / 2, w: side, h: side };
}

export function paintTwenty(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  board: Board,
  live: TorsoDir,
  body: TorsoBody | null,
): void {
  ctx.clearRect(0, 0, width, height);
  if (body) drawTorso(ctx, body, width, height);
  const frame = boardFrame(width, height);
  drawPanel(ctx, frame);
  drawGrid(ctx, frame);
  drawTiles(ctx, frame, board);
  drawHints(ctx, frame, live);
}

export function torsoOutline(body: TorsoBody, width: number, height: number): Pt[] {
  const ls = screen(body.leftShoulder, width, height);
  const rs = screen(body.rightShoulder, width, height);
  const lh = screen(body.leftHip, width, height);
  const rh = screen(body.rightHip, width, height);
  const midShoulder = mid(ls, rs);
  const midHip = mid(lh, rh);
  const across = Math.hypot(rs.x - ls.x, rs.y - ls.y) || 1;
  const down = Math.hypot(midHip.x - midShoulder.x, midHip.y - midShoulder.y) || 1;
  const side = {
    x: ((rs.x - ls.x) / across) * across * 0.12,
    y: ((rs.y - ls.y) / across) * across * 0.12,
  };
  const drop = {
    x: ((midHip.x - midShoulder.x) / down) * down * 0.08,
    y: ((midHip.y - midShoulder.y) / down) * down * 0.08,
  };
  return [
    { x: ls.x - side.x - drop.x, y: ls.y - side.y - drop.y },
    { x: rs.x + side.x - drop.x, y: rs.y + side.y - drop.y },
    { x: rh.x + side.x + drop.x, y: rh.y + side.y + drop.y },
    { x: lh.x - side.x + drop.x, y: lh.y - side.y + drop.y },
  ];
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  body: TorsoBody,
  width: number,
  height: number,
): void {
  const pts = torsoOutline(body, width, height);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(30, 240, 216, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 240, 216, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  for (const pt of pts) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
  }
}

function drawPanel(ctx: CanvasRenderingContext2D, frame: Frame): void {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.22)';
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
}

function drawGrid(ctx: CanvasRenderingContext2D, frame: Frame): void {
  const gap = frame.w * 0.02;
  const cell = (frame.w - gap * (SIZE + 1)) / SIZE;
  ctx.strokeStyle = 'rgba(255, 230, 120, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const x = frame.x + gap + col * (cell + gap);
      const y = frame.y + gap + row * (cell + gap);
      ctx.fillStyle = 'rgba(228, 220, 203, 0.28)';
      roundRect(ctx, x, y, cell, cell, cell * 0.12);
      ctx.fill();
    }
  }
}

function drawTiles(ctx: CanvasRenderingContext2D, frame: Frame, board: Board): void {
  const gap = frame.w * 0.02;
  const cell = (frame.w - gap * (SIZE + 1)) / SIZE;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = board[row][col];
      if (!value) continue;
      const x = frame.x + gap + col * (cell + gap);
      const y = frame.y + gap + row * (cell + gap);
      ctx.fillStyle = FILL[value] ?? '#1f6b4a';
      roundRect(ctx, x, y, cell, cell, cell * 0.12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = value >= 32 ? '#fffdf8' : '#1c1915';
      ctx.font = `700 ${Math.floor(cell * (value >= 1024 ? 0.32 : 0.4))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = value >= 32 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
      ctx.strokeText(String(value), x + cell / 2, y + cell / 2);
      ctx.fillText(String(value), x + cell / 2, y + cell / 2);
    }
  }
}

function drawHints(ctx: CanvasRenderingContext2D, frame: Frame, live: TorsoDir): void {
  const marks: Array<{ dir: TorsoDir; label: string; x: number; y: number }> = [
    { dir: 'up', label: '↑', x: frame.x + frame.w / 2, y: frame.y + 18 },
    { dir: 'down', label: '↓', x: frame.x + frame.w / 2, y: frame.y + frame.h - 18 },
    { dir: 'left', label: '←', x: frame.x + 18, y: frame.y + frame.h / 2 },
    { dir: 'right', label: '→', x: frame.x + frame.w - 18, y: frame.y + frame.h / 2 },
  ];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 18px sans-serif';
  for (const mark of marks) {
    ctx.fillStyle = live === mark.dir ? '#1ef0d8' : 'rgba(255,255,255,0.55)';
    ctx.fillText(mark.label, mark.x, mark.y);
  }
}

function screen(point: { x: number; y: number }, width: number, height: number): Pt {
  return { x: point.x * width, y: point.y * height };
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
