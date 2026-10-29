export const TETRIS_W = 10;
export const TETRIS_H = 20;

export type PieceId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Rotation = 0 | 1 | 2 | 3;
export type TetrisCell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type TetrisBoard = TetrisCell[][];

export type ActivePiece = { id: PieceId; rotation: Rotation; x: number; y: number };

export type TetrisGame = {
  board: TetrisBoard;
  piece: ActivePiece | null;
  next: PieceId;
  queue: PieceId[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
};

type Cells = Array<[number, number]>;

const BASE: Record<PieceId, number[][]> = {
  1: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  2: [
    [1, 1],
    [1, 1],
  ],
  3: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  4: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  5: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  6: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  7: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const SHAPES: Record<PieceId, Cells[]> = buildShapes();

export function emptyBoard(): TetrisBoard {
  return Array.from({ length: TETRIS_H }, () => Array.from({ length: TETRIS_W }, () => 0));
}

export function cellsOf(piece: ActivePiece): Cells {
  const offsets = SHAPES[piece.id]?.[piece.rotation] ?? [];
  return offsets.map(([ox, oy]) => [piece.x + ox, piece.y + oy]);
}

export function collides(board: TetrisBoard, piece: ActivePiece): boolean {
  for (const [x, y] of cellsOf(piece)) {
    if (x < 0 || x >= TETRIS_W || y >= TETRIS_H) return true;
    if (y < 0) continue;
    if (board[y]?.[x] !== 0) return true;
  }
  return false;
}

export function newGame(rng: () => number): TetrisGame {
  return spawnFrom({
    board: emptyBoard(),
    piece: null,
    next: 1,
    queue: [],
    score: 0,
    lines: 0,
    level: 1,
    over: false,
  }, rng);
}

export function shuffledBag(rng: () => number): PieceId[] {
  const bag: PieceId[] = [1, 2, 3, 4, 5, 6, 7];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const clamped = Math.min(Math.max(j, 0), i);
    [bag[i], bag[clamped]] = [bag[clamped], bag[i]];
  }
  return bag;
}

export function followSenseLine(game: TetrisGame, targetBottom: number): TetrisGame {
  if (!game.piece || game.over) return game;
  let next = game;
  while (pieceBottom(next) < targetBottom) {
    const moved = movePiece(next, 0, 1);
    if (moved === next) break;
    next = moved;
  }
  return next;
}

function pieceBottom(game: TetrisGame): number {
  if (!game.piece) return -1;
  let bottom = -1;
  for (const [, y] of cellsOf(game.piece)) bottom = Math.max(bottom, y);
  return bottom;
}

export function movePiece(game: TetrisGame, dx: number, dy: number): TetrisGame {
  if (!game.piece || game.over) return game;
  const piece = { ...game.piece, x: game.piece.x + dx, y: game.piece.y + dy };
  if (collides(game.board, piece)) return game;
  return { ...game, piece };
}

const KICKS: readonly number[] = [0, -1, 1, -2, 2];

export function rotatePiece(game: TetrisGame, dir: 1 | -1): TetrisGame {
  if (!game.piece || game.over) return game;
  const rotation = (((game.piece.rotation + dir) % 4) + 4) % 4 as Rotation;
  for (const kick of KICKS) {
    const piece = { ...game.piece, rotation, x: game.piece.x + kick };
    if (!collides(game.board, piece)) return { ...game, piece };
  }
  return game;
}

export function tick(game: TetrisGame, rng: () => number): TetrisGame {
  if (!game.piece || game.over) return game;
  const moved = movePiece(game, 0, 1);
  if (moved !== game) return moved;
  return lockPiece(game, rng);
}

export function hardDrop(game: TetrisGame, rng: () => number): TetrisGame {
  if (!game.piece || game.over) return game;
  let next = game;
  let rows = 0;
  while (next.piece) {
    const moved = movePiece(next, 0, 1);
    if (moved === next) break;
    next = moved;
    rows += 1;
  }
  const locked = lockPiece(next, rng);
  return { ...locked, score: locked.score + rows * 2 };
}

export function ghostY(game: TetrisGame): number {
  if (!game.piece) return 0;
  let y = game.piece.y;
  while (!collides(game.board, { ...game.piece, y: y + 1 })) y += 1;
  return y;
}

export function linePoints(cleared: number, level: number): number {
  const table = [0, 100, 300, 500, 800];
  if (!Number.isInteger(cleared) || cleared < 0 || cleared > 4) return 0;
  const safeLevel = Number.isInteger(level) && level >= 1 ? level : 1;
  return table[cleared] * safeLevel;
}

export function dropIntervalMs(level: number): number {
  const safeLevel = Number.isInteger(level) && level >= 1 ? level : 1;
  return Math.max(80, Math.round(800 * 0.8 ** (safeLevel - 1)));
}

export function clearLines(board: TetrisBoard): { board: TetrisBoard; cleared: number } {
  const kept = board.filter((row) => row.some((value) => value === 0));
  const cleared = TETRIS_H - kept.length;
  if (cleared === 0) return { board, cleared: 0 };
  const empty: TetrisBoard = Array.from(
    { length: cleared },
    () => Array.from({ length: TETRIS_W }, () => 0 as TetrisCell),
  );
  return { board: [...empty, ...kept], cleared };
}

function spawnFrom(game: TetrisGame, rng: () => number): TetrisGame {
  const queue = game.queue.length > 0 ? game.queue.slice() : shuffledBag(rng);
  const current = queue[0] as PieceId;
  const rest = queue.slice(1);
  const upcoming = rest.length > 0 ? rest : shuffledBag(rng);
  const piece: ActivePiece = { id: current, rotation: 0, x: spawnX(current), y: 0 };
  const over = collides(game.board, piece);
  return { ...game, piece: over ? null : piece, queue: upcoming, next: upcoming[0], over };
}

function lockPiece(game: TetrisGame, rng: () => number): TetrisGame {
  if (!game.piece) return game;
  const merged = mergePiece(game.board, game.piece);
  const cleared = clearLines(merged);
  const lines = game.lines + cleared.cleared;
  const level = Math.floor(lines / 10) + 1;
  const score = game.score + linePoints(cleared.cleared, game.level);
  return spawnFrom({ ...game, board: cleared.board, score, lines, level }, rng);
}

function mergePiece(board: TetrisBoard, piece: ActivePiece): TetrisBoard {
  const next = board.map((row) => row.slice());
  for (const [x, y] of cellsOf(piece)) {
    if (x < 0 || x >= TETRIS_W || y < 0 || y >= TETRIS_H) continue;
    next[y][x] = piece.id;
  }
  return next;
}

function spawnX(id: PieceId): number {
  const width = shapeWidth(id);
  return Math.floor((TETRIS_W - width) / 2);
}

function shapeWidth(id: PieceId): number {
  const rotation = SHAPES[id]?.[0] ?? [];
  let width = 0;
  for (const [x] of rotation) {
    if (x + 1 > width) width = x + 1;
  }
  return width;
}

function buildShapes(): Record<PieceId, Cells[]> {
  const out = {} as Record<PieceId, Cells[]>;
  for (const id of [1, 2, 3, 4, 5, 6, 7] as PieceId[]) {
    let matrix = BASE[id].map((row) => row.slice());
    const rotations: Cells[] = [];
    for (let index = 0; index < 4; index += 1) {
      rotations.push(toOffsets(matrix));
      matrix = rotateMatrix(matrix);
    }
    out[id] = rotations;
  }
  return out;
}

function toOffsets(matrix: number[][]): Cells {
  const out: Cells = [];
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) out.push([x, y]);
    });
  });
  return out;
}

function rotateMatrix(matrix: number[][]): number[][] {
  const height = matrix.length;
  const width = matrix[0]?.length ?? 0;
  const next: number[][] = Array.from({ length: width }, () => Array(height).fill(0));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      next[x][height - 1 - y] = matrix[y][x];
    }
  }
  return next;
}
