import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  adjacentMines, chord, countMines, elapsedMs, flag, flagsOn, newGame, newGameWithMines,
  reveal, type MineGame,
} from './mineLogic';
import {
  decodeMineBest, emptyMineBest, loadMineBest, MINE_STORAGE_KEY, saveMineBest, type MineStore,
} from './mineProgress';

// A wall of mines across row 4 plus one below splits the board in two, so a
// flood from the bottom cannot clear the top half.
const EASY_MINES: ReadonlyArray<readonly [number, number]> = [
  [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [8, 5],
];

describe('mine board creation', () => {
  it('builds each difficulty with the right size and mine count', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const game = newGame(difficulty, () => 0);
      expect(game.width * game.height).toBeGreaterThan(game.mines);
      expect(countMines(game)).toBe(game.mines);
    }
    expect(newGame('easy', () => 0).width).toBe(9);
    expect(newGame('easy', () => 0).height).toBe(9);
    expect(newGame('medium', () => 0).width).toBe(16);
    expect(newGame('hard', () => 0).height).toBe(16);
  });

  it('places mines deterministically with a scripted rng', () => {
    const values = Array.from({ length: 81 }, (_, index) => (index < 10 ? 0 : 1));
    const game = newGame('easy', scripted(values));
    expect(countMines(game)).toBe(10);
    for (let x = 0; x < 9; x += 1) {
      expect(game.board[0][x].mine).toBe(true);
    }
    expect(game.board[1][0].mine).toBe(true);
  });
});

describe('mine reveal', () => {
  it('counts adjacent mines in the eight neighbours', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    expect(adjacentMines(game, 0, 3)).toBe(2);
    expect(adjacentMines(game, 4, 3)).toBe(3);
    expect(adjacentMines(game, 8, 8)).toBe(0);
  });

  it('starts the clock on the first reveal and flood fills an empty area', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const opened = reveal(game, 8, 8, 1000);
    expect(opened.state).toBe('playing');
    expect(opened.startedAtMs).toBe(1000);
    expect(opened.revealedSafe).toBe(35);
    expect(opened.board[8][8].revealed).toBe(true);
    expect(opened.board[5][5].revealed).toBe(true);
    expect(opened.board[0][0].revealed).toBe(false);
  });

  it('keeps the mine field intact when clicking on a mine for the first time', () => {
    const game = newGameWithMines('easy', [
      [0, 0], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    ]);
    const opened = reveal(game, 0, 0, 100);
    expect(opened.board[0][0].mine).toBe(false);
    expect(opened.board[0][0].revealed).toBe(true);
    expect(opened.state).toBe('playing');
    expect(countMines(opened)).toBe(10);
  });

  it('loses when a revealed mine is clicked after the game started', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const started = reveal(game, 8, 8, 0);
    const lost = reveal(started, 0, 4, 100);
    expect(lost.state).toBe('lost');
    expect(lost.endedAtMs).toBe(100);
    expect(lost.board[4][0].revealed).toBe(true);
  });

  it('does not reveal a flagged cell and does not restart after the end', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const flagged = flag(game, 1, 1);
    const opened = reveal(flagged, 1, 1, 0);
    expect(opened.board[1][1].revealed).toBe(false);
    const started = reveal(game, 8, 8, 0);
    const won = revealAllSafe(started);
    expect(won.state).toBe('won');
    const again = reveal(won, 5, 5, 10);
    expect(again).toBe(won);
  });

  it('wins when every safe cell is revealed and flags the rest', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const started = reveal(game, 8, 8, 0);
    const won = revealAllSafe(started);
    expect(won.state).toBe('won');
    expect(won.endedAtMs).toBe(500);
    for (const [x, y] of EASY_MINES) {
      expect(won.board[y][x].flagged).toBe(true);
    }
  });
});

describe('mine flag and chord', () => {
  it('toggles a flag and counts it, but ignores revealed cells', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const one = flag(game, 1, 1);
    expect(one.board[1][1].flagged).toBe(true);
    expect(flagsOn(one)).toBe(1);
    const two = flag(one, 1, 1);
    expect(two.board[1][1].flagged).toBe(false);
    const started = reveal(game, 8, 8, 0);
    const revealedCell = flag(started, 8, 8);
    expect(revealedCell).toBe(started);
    const lost = reveal(started, 0, 4, 10);
    const afterEnd = flag(lost, 5, 5);
    expect(afterEnd.board[5][5].flagged).toBe(false);
  });

  it('chords only when the neighbour flags match the number', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const started = reveal(game, 8, 8, 0);
    // Cell (0,3) shows 2: its mine neighbours are (0,4) and (1,4).
    const atZeroThree = reveal(started, 0, 3, 0);
    const one = flag(atZeroThree, 0, 4);
    const wrong = chord(one, 0, 3, 20);
    expect(wrong).toBe(one);
    const two = flag(one, 1, 4);
    const correct = chord(two, 0, 3, 20);
    expect(correct.revealedSafe).toBeGreaterThan(two.revealedSafe);
    expect(correct.board[4][0].flagged).toBe(true);
    expect(correct.board[3][1].revealed).toBe(true);
  });

  it('chording into a wrong flag set can reveal a mine and lose', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    const started = reveal(game, 8, 8, 0);
    const atZeroThree = reveal(started, 0, 3, 0);
    // A safe cell is flagged instead of (1,4), so the chord opens the mine.
    const wrong = flag(flag(atZeroThree, 0, 4), 0, 2);
    const lost = chord(wrong, 0, 3, 20);
    expect(lost.state).toBe('lost');
    expect(lost.board[1][4].revealed).toBe(true);
  });
});

describe('mine clock', () => {
  it('reports zero before the first reveal and freezes at the end', () => {
    const game = newGameWithMines('easy', EASY_MINES);
    expect(elapsedMs(game, 999)).toBe(0);
    const started = reveal(game, 8, 8, 1000);
    expect(elapsedMs(started, 2500)).toBe(1500);
    const lost = reveal(started, 0, 4, 3000);
    expect(elapsedMs(lost, 9000)).toBe(2000);
  });
});

describe('mine progress', () => {
  it('keeps a valid best and rejects a bad blob', () => {
    expect(decodeMineBest(null)).toBeNull();
    expect(decodeMineBest('')).toBeNull();
    expect(decodeMineBest('{"v":1,"best":{"easy":1,"medium":2,"hard":3}}'))
      .toEqual({ v: 1, best: { easy: 1, medium: 2, hard: 3 } });
    expect(decodeMineBest('{"v":2,"best":{"easy":1,"medium":2,"hard":3}}')).toBeNull();
    expect(decodeMineBest('{"v":1,"best":{"easy":-1,"medium":0,"hard":0}}')).toBeNull();
    expect(decodeMineBest('{"v":1,"best":{"easy":1,"medium":2}}')).toBeNull();
    expect(decodeMineBest('{"v":1,"best":{"easy":1,"medium":2,"hard":3,"x":4}}')).toBeNull();
  });

  it('round trips through a memory store', () => {
    const store = memory();
    const best = { v: 1 as const, best: { easy: 42_000, medium: 0, hard: 90_000 } };
    saveMineBest(store, best);
    expect(loadMineBest(store)).toEqual(best);
    expect(store.getItem(MINE_STORAGE_KEY)).toContain('"easy":42000');
    saveMineBest(store, emptyMineBest());
    expect(loadMineBest(store)).toEqual(emptyMineBest());
  });
});

describe('mine route', () => {
  it('adds the card on the play list without a new home card', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const list = readFileSync('src/pages/PlayListPage.tsx', 'utf8');
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(app).toContain("plainRoute('/play/mine'");
    expect(home.match(/'\/play'/g)).toHaveLength(1);
    expect(home).not.toContain('/play/mine');
    expect(list).toContain("'/play/mine'");
    expect(script).toContain("'play/mine'");
  });
});

function revealAllSafe(game: MineGame, now = 500): MineGame {
  let next = game;
  for (let y = 0; y < game.height; y += 1) {
    for (let x = 0; x < game.width; x += 1) {
      if (next.board[y][x].mine || next.board[y][x].revealed) continue;
      next = reveal(next, x, y, now);
      if (next.state !== 'playing') return next;
    }
  }
  return next;
}

function scripted(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 1;
    index += 1;
    return value;
  };
}

function memory(): MineStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
}
