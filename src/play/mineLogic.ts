export type MineDifficulty = 'easy' | 'medium' | 'hard';

export type MineSize = { width: number; height: number; mines: number };

export const DIFFICULTIES: Record<MineDifficulty, MineSize> = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 },
};

export const MINE_BEST_MAX_MS = 3_600_000;

export type MineCell = { mine: boolean; revealed: boolean; flagged: boolean };
export type MineBoard = MineCell[][];
export type MineState = 'idle' | 'playing' | 'won' | 'lost';

export type MineGame = {
  difficulty: MineDifficulty;
  width: number;
  height: number;
  mines: number;
  board: MineBoard;
  state: MineState;
  revealedSafe: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
};

export function newGame(difficulty: MineDifficulty, rng: () => number): MineGame {
  const size = DIFFICULTIES[difficulty];
  const board = emptyBoard(size.width, size.height);
  placeMines(board, size.mines, rng);
  return baseGame(difficulty, size, board);
}

/** Test helper: build a game with mines at exact positions. */
export function newGameWithMines(
  difficulty: MineDifficulty,
  positions: ReadonlyArray<readonly [number, number]>,
): MineGame {
  const size = DIFFICULTIES[difficulty];
  const board = emptyBoard(size.width, size.height);
  for (const [x, y] of positions) {
    const row = board[y];
    if (row && row[x]) row[x].mine = true;
  }
  return baseGame(difficulty, size, board, positions.length);
}

export function reveal(game: MineGame, x: number, y: number, nowMs: number): MineGame {
  if (game.state === 'won' || game.state === 'lost') return game;
  if (!inBounds(game, x, y)) return game;
  const cell = game.board[y][x];
  if (cell.revealed || cell.flagged) return game;
  const wasIdle = game.state === 'idle';
  let next = wasIdle ? startGame(game, nowMs) : game;
  // First-click safety only: a later click on a mine must lose.
  if (wasIdle && next.board[y][x].mine) next = relocateMine(next, x, y);
  return revealFrom(next, x, y, nowMs);
}

export function flag(game: MineGame, x: number, y: number): MineGame {
  if (game.state === 'won' || game.state === 'lost') return game;
  if (!inBounds(game, x, y)) return game;
  const cell = game.board[y][x];
  if (cell.revealed) return game;
  const board = cloneBoard(game.board);
  board[y][x].flagged = !board[y][x].flagged;
  return { ...game, board };
}

export function chord(game: MineGame, x: number, y: number, nowMs: number): MineGame {
  if (game.state !== 'idle' && game.state !== 'playing') return game;
  if (!inBounds(game, x, y)) return game;
  const cell = game.board[y][x];
  if (!cell.revealed || cell.mine) return game;
  const count = adjacentMines(game, x, y);
  if (count === 0) return game;
  const flagged = countNeighbors(game, x, y, (neighbor) => neighbor.flagged);
  if (flagged !== count) return game;
  let next = game;
  for (const [nx, ny] of neighbors(x, y)) {
    if (!inBounds(game, nx, ny)) continue;
    const neighbor = next.board[ny][nx];
    if (neighbor.revealed || neighbor.flagged) continue;
    next = revealFrom(next, nx, ny, nowMs);
    if (next.state === 'lost') break;
  }
  return next;
}

export function inBounds(game: MineGame, x: number, y: number): boolean {
  return x >= 0 && x < game.width && y >= 0 && y < game.height;
}

export function adjacentMines(game: MineGame, x: number, y: number): number {
  return countNeighbors(game, x, y, (neighbor) => neighbor.mine);
}

export function flagsOn(game: MineGame): number {
  let count = 0;
  for (const row of game.board) {
    for (const cell of row) {
      if (cell.flagged) count += 1;
    }
  }
  return count;
}

export function countMines(game: MineGame): number {
  let count = 0;
  for (const row of game.board) {
    for (const cell of row) {
      if (cell.mine) count += 1;
    }
  }
  return count;
}

export function elapsedMs(game: MineGame, nowMs: number): number {
  if (game.startedAtMs == null) return 0;
  const end = game.endedAtMs ?? nowMs;
  const ms = Math.max(0, end - game.startedAtMs);
  return Math.min(ms, MINE_BEST_MAX_MS);
}

function baseGame(
  difficulty: MineDifficulty,
  size: MineSize,
  board: MineBoard,
  mines = size.mines,
): MineGame {
  return {
    difficulty,
    width: size.width,
    height: size.height,
    mines,
    board,
    state: 'idle',
    revealedSafe: 0,
    startedAtMs: null,
    endedAtMs: null,
  };
}

function emptyBoard(width: number, height: number): MineBoard {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ mine: false, revealed: false, flagged: false })),
  );
}

function placeMines(board: MineBoard, mines: number, rng: () => number): void {
  const height = board.length;
  const width = board[0]?.length ?? 0;
  let remaining = mines;
  let cellsLeft = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = board[y]?.[x];
      if (!cell) continue;
      if (remaining > 0 && rng() < remaining / cellsLeft) {
        cell.mine = true;
        remaining -= 1;
      }
      cellsLeft -= 1;
    }
  }
}

function startGame(game: MineGame, nowMs: number): MineGame {
  return { ...game, state: 'playing', startedAtMs: nowMs };
}

function relocateMine(game: MineGame, x: number, y: number): MineGame {
  const board = cloneBoard(game.board);
  for (let yy = 0; yy < game.height; yy += 1) {
    for (let xx = 0; xx < game.width; xx += 1) {
      const cell = board[yy]?.[xx];
      if (cell && !cell.mine) {
        board[yy][xx] = { ...cell, mine: true };
        board[y][x] = { ...board[y][x], mine: false };
        return { ...game, board };
      }
    }
  }
  return game;
}

function revealFrom(game: MineGame, x0: number, y0: number, nowMs: number): MineGame {
  const board = cloneBoard(game.board);
  const queue: Array<[number, number]> = [[x0, y0]];
  let revealed = 0;
  let mineHit = false;
  while (queue.length > 0) {
    const [x, y] = queue.shift() as [number, number];
    if (!inBounds(game, x, y)) continue;
    const cell = board[y]?.[x];
    if (!cell || cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      mineHit = true;
      continue;
    }
    revealed += 1;
    if (adjacentMinesFrom(board, game.width, game.height, x, y) === 0) {
      for (const [nx, ny] of neighbors(x, y)) queue.push([nx, ny]);
    }
  }
  const totalSafe = game.width * game.height - game.mines;
  const revealedTotal = game.revealedSafe + revealed;
  const state: MineState = mineHit ? 'lost' : revealedTotal >= totalSafe ? 'won' : 'playing';
  if (state === 'won') flagRemainingMines(board);
  return {
    ...game,
    board,
    state,
    revealedSafe: revealedTotal,
    endedAtMs: state === 'won' || state === 'lost' ? nowMs : null,
  };
}

function flagRemainingMines(board: MineBoard): void {
  for (const row of board) {
    for (const cell of row) {
      if (cell.mine && !cell.revealed) cell.flagged = true;
    }
  }
}

function adjacentMinesFrom(board: MineBoard, width: number, height: number, x: number, y: number): number {
  let count = 0;
  for (const [nx, ny] of neighbors(x, y)) {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    const cell = board[ny]?.[nx];
    if (cell?.mine) count += 1;
  }
  return count;
}

function countNeighbors(
  game: MineGame,
  x: number,
  y: number,
  test: (cell: MineCell) => boolean,
): number {
  let count = 0;
  for (const [nx, ny] of neighbors(x, y)) {
    if (!inBounds(game, nx, ny)) continue;
    const cell = game.board[ny]?.[nx];
    if (cell && test(cell)) count += 1;
  }
  return count;
}

function neighbors(x: number, y: number): Array<[number, number]> {
  return [
    [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
    [x - 1, y], [x + 1, y],
    [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
  ];
}

function cloneBoard(board: MineBoard): MineBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}
