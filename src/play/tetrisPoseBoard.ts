import { cellsOf, ghostY, TETRIS_H, TETRIS_W, type PieceId, type TetrisGame } from './tetrisLogic';

export type Frame = { x: number; y: number; w: number; h: number };
export type SenseSpan = { x: number; y: number; w: number };

const COLORS: Record<PieceId, string> = {
  1: '#19d6ff',
  2: '#ffe14a',
  3: '#d56bff',
  4: '#3dff6a',
  5: '#ff4d3a',
  6: '#4d8dff',
  7: '#ff9a2e',
};

export function boardFrame(width: number, height: number): Frame {
  const padX = width * 0.01;
  const padY = height * 0.01;
  const outerW = width - padX * 2;
  const outerH = height - padY * 2;
  const cell = Math.min(outerW / TETRIS_W, outerH / TETRIS_H);
  const w = cell * TETRIS_W;
  const h = cell * TETRIS_H;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

export function paintBoard(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  game: TetrisGame | null,
): void {
  drawPanel(ctx, frame);
  drawLines(ctx, frame);
  if (!game) return;
  const cellW = frame.w / TETRIS_W;
  const cellH = frame.h / TETRIS_H;
  paintLocked(ctx, frame, game, cellW, cellH);
  paintFalling(ctx, frame, game, cellW, cellH);
  paintSenseLine(ctx, frame, game, cellW, cellH);
}

function drawPanel(ctx: CanvasRenderingContext2D, frame: Frame): void {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.28)';
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
}

function drawLines(ctx: CanvasRenderingContext2D, frame: Frame): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  strokeGrid(ctx, frame, 'rgba(255, 230, 120, 0.28)', 1);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 230, 120, 0.72)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
}

function strokeGrid(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (let col = 0; col <= TETRIS_W; col += 1) {
    const x = frame.x + (frame.w * col) / TETRIS_W;
    ctx.beginPath();
    ctx.moveTo(x, frame.y);
    ctx.lineTo(x, frame.y + frame.h);
    ctx.stroke();
  }
  for (let row = 0; row <= TETRIS_H; row += 1) {
    const y = frame.y + (frame.h * row) / TETRIS_H;
    ctx.beginPath();
    ctx.moveTo(frame.x, y);
    ctx.lineTo(frame.x + frame.w, y);
    ctx.stroke();
  }
}

function paintLocked(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  game: TetrisGame,
  cellW: number,
  cellH: number,
): void {
  for (let y = 0; y < TETRIS_H; y += 1) {
    for (let x = 0; x < TETRIS_W; x += 1) {
      const value = game.board[y][x];
      if (value === 0) continue;
      fillCell(ctx, frame, x, y, cellW, cellH, COLORS[value], 0.88);
    }
  }
}

function paintFalling(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  game: TetrisGame,
  cellW: number,
  cellH: number,
): void {
  const piece = game.piece;
  if (!piece) return;
  const color = COLORS[piece.id];
  const ghost = ghostY(game);
  for (const [x, y] of cellsOf({ ...piece, y: ghost })) {
    strokeCell(ctx, frame, x, y, cellW, cellH, color);
  }
  for (const [x, y] of cellsOf(piece)) {
    fillCell(ctx, frame, x, y, cellW, cellH, color, 1);
  }
}

export function senseSpans(cells: Array<[number, number]>): SenseSpan[] {
  const bottoms = new Map<number, number>();
  for (const [x, y] of cells) {
    if (!inside(x, y)) continue;
    bottoms.set(x, Math.max(bottoms.get(x) ?? -1, y));
  }
  const spans: SenseSpan[] = [];
  for (const x of [...bottoms.keys()].sort((a, b) => a - b)) {
    const y = bottoms.get(x) ?? 0;
    const prev = spans[spans.length - 1];
    if (prev && prev.y === y && prev.x + prev.w === x) prev.w += 1;
    else spans.push({ x, y, w: 1 });
  }
  return spans;
}

function paintSenseLine(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  game: TetrisGame,
  cellW: number,
  cellH: number,
): void {
  const piece = game.piece;
  if (!piece) return;
  const spans = senseSpans(cellsOf(piece));
  if (spans.length === 0) return;
  ctx.save();
  clipFrame(ctx, frame);
  strokeSpans(ctx, frame, spans, cellW, cellH);
  paintMarks(ctx, frame, spans, cellW, cellH);
  ctx.restore();
}

function strokeSpans(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  spans: SenseSpan[],
  cellW: number,
  cellH: number,
): void {
  ctx.beginPath();
  spans.forEach((span, index) => {
    const x0 = frame.x + span.x * cellW;
    const x1 = frame.x + (span.x + span.w) * cellW;
    const y = lineY(frame, span.y, cellH);
    if (index === 0) ctx.moveTo(x0, y);
    else ctx.lineTo(x0, y);
    ctx.lineTo(x1, y);
  });
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function paintMarks(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  spans: SenseSpan[],
  cellW: number,
  cellH: number,
): void {
  const first = spans[0];
  const last = spans[spans.length - 1];
  const mid = frame.x + ((first.x + last.x + last.w) / 2) * cellW;
  const y = lineY(frame, Math.max(...spans.map((span) => span.y)), cellH) + 2;
  if (y + 5 > frame.y + frame.h) return;
  ctx.fillStyle = '#1ef0d8';
  for (let i = -1; i <= 1; i += 1) ctx.fillRect(mid - 16 + i * 12, y, 10, 6);
}

function lineY(frame: Frame, row: number, cellH: number): number {
  const edge = frame.y + (row + 1) * cellH + 1;
  return Math.min(edge, frame.y + frame.h - 2);
}

function clipFrame(ctx: CanvasRenderingContext2D, frame: Frame): void {
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  color: string,
  alpha: number,
): void {
  if (!inside(x, y)) return;
  const left = frame.x + x * cellW + 1;
  const top = frame.y + y * cellH + 1;
  const sizeW = cellW - 2;
  const sizeH = cellH - 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(left, top, sizeW, sizeH);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left + 0.5, top + 0.5, sizeW - 1, sizeH - 1);
  ctx.restore();
}

function strokeCell(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  color: string,
): void {
  if (!inside(x, y)) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(frame.x + x * cellW + 2, frame.y + y * cellH + 2, cellW - 4, cellH - 4);
}

function inside(x: number, y: number): boolean {
  return x >= 0 && x < TETRIS_W && y >= 0 && y < TETRIS_H;
}
