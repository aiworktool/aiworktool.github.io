export const SIZE = 4;
export const WIN_TILE = 2048;
export const MAX_TILE = 131072;

export type Board = number[][];
export type Dir = 'left' | 'right' | 'up' | 'down';

export type Slide = {
  board: Board;
  gained: number;
  changed: boolean;
};

export type TwentyGame = {
  board: Board;
  score: number;
  best: number;
};

export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

export function isTileValue(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  if (value === 0) return true;
  if (value < 2 || value > MAX_TILE) return false;
  return (value & (value - 1)) === 0;
}

export function slide(board: Board, dir: Dir): Slide {
  if (dir === 'left') return slideLeft(board);
  if (dir === 'right') return slideAcross(board, true);
  if (dir === 'up') return slideVertical(board, false);
  return slideVertical(board, true);
}

export function moveBoard(board: Board, dir: Dir, rng: () => number): {
  board: Board;
  gained: number;
  moved: boolean;
} {
  const slid = slide(board, dir);
  if (!slid.changed) return { board: cloneBoard(board), gained: 0, moved: false };
  return { board: spawn(slid.board, rng) ?? slid.board, gained: slid.gained, moved: true };
}

export function startBoard(rng: () => number): Board {
  const first = spawn(emptyBoard(), rng) ?? emptyBoard();
  return spawn(first, rng) ?? first;
}

export function stepGame(game: TwentyGame, dir: Dir, rng: () => number): TwentyGame {
  if (hasLost(game.board)) return game;
  const step = moveBoard(game.board, dir, rng);
  if (!step.moved) return game;
  const score = game.score + step.gained;
  const best = score > game.best ? score : game.best;
  return { board: step.board, score, best };
}

export function restartGame(best: number, rng: () => number): TwentyGame {
  return { board: startBoard(rng), score: 0, best };
}

export function hasWon(board: Board): boolean {
  return board.some((row) => row.some((value) => value >= WIN_TILE));
}

export function hasLost(board: Board): boolean {
  if (emptySpots(board).length > 0) return false;
  return !hasPair(board);
}

export function dirFromKey(key: string): Dir | null {
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up';
  if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
  return null;
}

export function swipeDir(x0: number, y0: number, x1: number, y1: number): Dir | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < 24) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function slideLeft(board: Board): Slide {
  let gained = 0;
  let changed = false;
  const next = board.map((row) => {
    const merged = mergeLine(row);
    gained += merged.gained;
    if (!sameLine(row, merged.line)) changed = true;
    return merged.line;
  });
  return { board: next, gained, changed };
}

function slideAcross(board: Board, reverse: boolean): Slide {
  const turned = reverse ? board.map(reverseLine) : board;
  const slid = slideLeft(turned);
  const next = reverse ? slid.board.map(reverseLine) : slid.board;
  return { board: next, gained: slid.gained, changed: slid.changed };
}

function slideVertical(board: Board, reverse: boolean): Slide {
  const slid = slideAcross(transpose(board), reverse);
  return { board: transpose(slid.board), gained: slid.gained, changed: slid.changed };
}

function mergeLine(line: number[]): { line: number[]; gained: number } {
  const tiles = line.filter((value) => value !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i += 1) {
    const pair = takePair(tiles, i);
    if (pair) {
      merged.push(pair.sum);
      gained += pair.sum;
      i += 1;
    } else {
      merged.push(tiles[i] ?? 0);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { line: merged, gained };
}

function takePair(tiles: number[], index: number): { sum: number } | null {
  const current = tiles[index];
  const next = tiles[index + 1];
  if (current === undefined || next === undefined || current !== next) return null;
  return { sum: current * 2 };
}

function reverseLine(line: number[]): number[] {
  return line.slice().reverse();
}

function transpose(board: Board): Board {
  return emptyBoard().map((row, x) => row.map((_, y) => board[y]?.[x] ?? 0));
}

function sameLine(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function emptySpots(board: Board): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) spots.push({ x, y });
    });
  });
  return spots;
}

function spawn(board: Board, rng: () => number): Board | null {
  const spots = emptySpots(board);
  if (spots.length === 0) return null;
  const spot = spots[pickIndex(spots.length, rng())];
  if (!spot) return null;
  const next = cloneBoard(board);
  next[spot.y][spot.x] = rng() < 0.9 ? 2 : 4;
  return next;
}

function pickIndex(count: number, roll: number): number {
  if (count <= 1) return 0;
  const index = Math.floor(roll * count);
  if (!Number.isFinite(index) || index <= 0) return 0;
  if (index >= count) return count - 1;
  return index;
}

function hasPair(board: Board): boolean {
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (matches(board, x, y, x + 1, y) || matches(board, x, y, x, y + 1)) return true;
    }
  }
  return false;
}

function matches(board: Board, x: number, y: number, nx: number, ny: number): boolean {
  if (nx >= SIZE || ny >= SIZE) return false;
  const value = board[y]?.[x] ?? 0;
  return value !== 0 && value === board[ny]?.[nx];
}
