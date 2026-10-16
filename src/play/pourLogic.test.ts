import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canPour, cloneTubes, isSolved, LEVELS, pour, solve, TUBE_CAP, type Move, type Tube } from './pourLogic';

describe('pour colors', () => {
  it('pours a matching run without changing the original tubes', () => {
    const start = cloneTubes(LEVELS[0]);
    expect(canPour(start, 0, 4)).toBe(1);
    const next = pour(start, 0, 4);
    expect(next?.[0]).toEqual([0, 0, 0]);
    expect(next?.[4]).toEqual([1]);
    expect(start[0]).toEqual([0, 0, 0, 1]);
    expect(pour(start, 0, 0)).toBeNull();
    expect(canPour(start, 0, 1)).toBe(0);
  });

  it('solves every layout within a short walk', () => {
    for (const level of LEVELS) {
      expect(colorCounts(level)).toEqual([4, 4, 4, 4]);
      expect(level.some((tube) => tube.length === 0)).toBe(true);
      expect(isSolved(level)).toBe(false);
      const moves = solve(level);
      expect(moves).not.toBeNull();
      expect(moves!.length).toBeGreaterThan(0);
      expect(moves!.length).toBeLessThanOrEqual(16);
      expect(isSolved(applyMoves(level, moves!))).toBe(true);
      expect(level[0].length).toBeLessThanOrEqual(TUBE_CAP);
    }
  });
});

describe('play routes', () => {
  it('keeps the games off the home chunk and on the static host', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(app).toContain("import('./pages/PlayListPage')");
    expect(app).toContain("import('./pages/PopPage')");
    expect(app).toContain("import('./pages/TapPage')");
    expect(app).toContain("import('./pages/PourPage')");
    expect(app).not.toContain("from './play/");
    expect(home).toContain("'/play'");
    expect(home).not.toContain('PopBoard');
    for (const route of ['play', 'play/pop', 'play/tap', 'play/pour']) {
      expect(script).toContain(`'${route}'`);
    }
  });
});

function colorCounts(tubes: Tube[]): number[] {
  const tally = [0, 0, 0, 0];
  for (const tube of tubes) {
    for (const color of tube) tally[color] += 1;
  }
  return tally;
}

function applyMoves(start: Tube[], moves: Move[]): Tube[] {
  return moves.reduce((tubes, move) => pour(tubes, move.from, move.to) ?? tubes, start);
}
