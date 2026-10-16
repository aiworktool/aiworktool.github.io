import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  hasLost, hasWon, moveBoard, slide, startBoard, stepGame, type Board, type TwentyGame,
} from './twentyLogic';
import {
  decodeProgress, loadProgress, MAX_PROGRESS_CHARS, saveProgress, TWENTY_STORAGE_KEY,
  type TwentyStore,
} from './twentyProgress';

describe('twenty slide and merge', () => {
  it('merges a row once and does not chain a fresh tile', () => {
    const doubles = slide(grid(['2 2 2 2', '0 0 0 0', '0 0 0 0', '0 0 0 0']), 'left');
    expect(doubles.board[0]).toEqual([4, 4, 0, 0]);
    expect(doubles.gained).toBe(8);
    const fresh = slide(grid(['2 2 4 0', '0 0 0 0', '0 0 0 0', '0 0 0 0']), 'left');
    expect(fresh.board[0]).toEqual([4, 4, 0, 0]);
    expect(fresh.gained).toBe(4);
    const gap = slide(grid(['2 0 2 0', '0 0 0 0', '0 0 0 0', '0 0 0 0']), 'left');
    expect(gap.board[0]).toEqual([4, 0, 0, 0]);
    expect(gap.gained).toBe(4);
  });

  it('stops at a wall and leaves the source row unchanged', () => {
    const row = [2, 4, 8, 16];
    const board = [row, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const slid = slide(board, 'left');
    expect(slid.changed).toBe(false);
    expect(slid.gained).toBe(0);
    expect(slid.board[0]).toEqual([2, 4, 8, 16]);
    expect(row).toEqual([2, 4, 8, 16]);
    const right = slide(grid(['2 2 0 0', '0 0 0 0', '0 0 0 0', '0 0 0 0']), 'right');
    expect(right.board[0]).toEqual([0, 0, 0, 4]);
    const down = slide(grid(['2 0 0 0', '0 0 0 0', '0 0 0 0', '2 0 0 0']), 'down');
    expect(down.board.map((line) => line[0])).toEqual([0, 0, 0, 4]);
  });

  it('does not spawn or score a move that changes nothing', () => {
    const board = grid(['2 4 8 16', '0 0 0 0', '0 0 0 0', '0 0 0 0']);
    let calls = 0;
    const result = moveBoard(board, 'left', () => {
      calls += 1;
      return 0;
    });
    expect(result.moved).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.board).toEqual(board);
    expect(calls).toBe(0);
    expect(board[0]).toEqual([2, 4, 8, 16]);
  });
});

describe('twenty end states', () => {
  it('wins at 2048 and still lets the player move', () => {
    const board = grid(['2048 0 0 0', '0 0 0 0', '0 0 0 0', '0 0 0 0']);
    expect(hasWon(board)).toBe(true);
    expect(hasWon(grid(['1024 1024 0 0', '0 0 0 0', '0 0 0 0', '0 0 0 0']))).toBe(false);
    expect(hasLost(board)).toBe(false);
    const next = stepGame({ board, score: 20, best: 40 }, 'right', () => 0);
    expect(next.score).toBe(20);
    expect(next.best).toBe(40);
    expect(next.board[0][3]).toBe(2048);
    expect(next.board[0][0]).toBe(2);
  });

  it('loses only when the board is full and nothing matches', () => {
    const stuck = grid(['2 4 8 16', '16 8 4 2', '2 4 8 16', '16 8 4 2']);
    const open = grid(['2 2 8 16', '16 8 4 2', '2 4 8 16', '16 8 4 2']);
    const gap = grid(['2 4 8 16', '16 8 4 2', '2 4 8 16', '16 8 4 0']);
    expect(hasLost(stuck)).toBe(true);
    expect(hasLost(open)).toBe(false);
    expect(hasLost(gap)).toBe(false);
    let calls = 0;
    const start = game(stuck, 10);
    const stayed = stepGame(start, 'left', () => {
      calls += 1;
      return 0;
    });
    expect(stayed).toBe(start);
    expect(stayed.board).toBe(stuck);
    expect(stayed.score).toBe(10);
    expect(calls).toBe(0);
  });

  it('starts with two tiles', () => {
    const board = startBoard(() => 0);
    expect(board.flat().filter((value) => value !== 0)).toEqual([2, 2]);
    const fours = startBoard(scripted([0, 0.95, 0, 0]));
    expect(fours[0][0]).toBe(4);
    expect(fours[0][1]).toBe(2);
  });
});

describe('twenty progress', () => {
  it('rejects a bad version, huge text, a negative score, and a non power-of-two cell', () => {
    expect(decodeProgress(saved({ v: 2 }))).toBeNull();
    expect(decodeProgress('x'.repeat(MAX_PROGRESS_CHARS + 1))).toBeNull();
    expect(decodeProgress(saved({ score: -1 }))).toBeNull();
    const bad = openBoard();
    bad[0][0] = 6;
    expect(decodeProgress(saved({ board: bad }))).toBeNull();
    expect(decodeProgress(saved({ score: 4, best: 0 }))).toBeNull();
    expect(decodeProgress(saved({ score: -5, best: -1 }))).toBeNull();
    const over = openBoard();
    over[0][1] = 262144;
    expect(decodeProgress(saved({ board: over }))).toBeNull();
  });

  it('keeps a valid board and drops a blob with missing fields', () => {
    const high = openBoard();
    high[1][1] = 131072;
    high[2][2] = 2048;
    const raw = saved({ score: 4, best: 8, board: high });
    const loaded = decodeProgress(raw);
    expect(loaded?.score).toBe(4);
    expect(loaded?.best).toBe(8);
    expect(loaded?.board[1][1]).toBe(131072);
    expect(decodeProgress(saved({ score: 1.5 }))).toBeNull();
    expect(decodeProgress('{"v":1,"best":0,"board":[]}')).toBeNull();
    expect(decodeProgress(null)).toBeNull();
    const store = memory();
    const progress = loaded;
    expect(progress).not.toBeNull();
    if (!progress) return;
    saveProgress(store, progress);
    expect(loadProgress(store)).toEqual(progress);
    expect(store.getItem(TWENTY_STORAGE_KEY)).toContain('"v":1');
  });
});

describe('twenty route', () => {
  it('adds the card on the play list without a new home card', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const list = readFileSync('src/pages/PlayListPage.tsx', 'utf8');
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(app).toContain("plainRoute('/play/twenty'");
    expect(home.match(/'\/play'/g)).toHaveLength(1);
    expect(home).not.toContain('/play/twenty');
    expect(list).toContain("'/play/twenty'");
    expect(script).toContain("'play/twenty'");
  });
});

function grid(rows: string[]): Board {
  return rows.map((line) => line.split(' ').map(Number));
}

function openBoard(): Board {
  return grid(['2 4 0 0', '0 0 0 0', '0 0 0 0', '0 0 0 0']);
}

function game(board: Board, score: number): TwentyGame {
  return { board, score, best: score };
}

function saved(extra: Record<string, unknown>): string {
  return JSON.stringify({ v: 1, score: 0, best: 0, board: openBoard(), ...extra });
}

function scripted(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

function memory(): TwentyStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
}
