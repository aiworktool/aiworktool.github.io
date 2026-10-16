import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HIGH_LEVELS } from './lotLevelsHigh';
import { LEVELS } from './lotLevels';
import { MID_LEVELS } from './lotLevelsMid';
import {
  carCells, cellsOverlap, cloneCars, inLot, isFailed, isWon, levelProblems, playTap, playUndo,
  slideCar, startPlay,
} from './lotLogic';
import {
  decodeProgress, emptyProgress, loadProgress, LOT_STORAGE_KEY, markClear, MAX_PROGRESS_CHARS,
  saveProgress, withCurrent, type LotStore,
} from './lotProgress';
import {
  advanceClearedLevel, clearLotLevel, decodeLotSave, emptyLotSave, isSliceOpen, levelIdAfterClear,
  loadLotSave, LOT_STORAGE_KEY_V2, MAX_LOT_V2_CHARS, saveLotSave, selectLotDifficulty, selectLotLevel,
} from './lotSave';
import { applyMoves, solveLot } from './lotSolve';
import type { Car, Level } from './lotTypes';

describe('lot rules', () => {
  it('stops against another car and does not mutate the source', () => {
    const level = wallLevel();
    const cars = cloneCars(level.cars);
    const before = JSON.stringify(cars);
    const blocked = slideCar(level, cars, 1);
    expect(blocked?.[0]).toMatchObject({ id: 1, x: 2, y: 0 });
    expect(carCells(blocked![0]).some((cell) => cell.x === 3)).toBe(false);
    expect(JSON.stringify(cars)).toBe(before);
    expect(slideCar(level, cars, 9)).toBeNull();
  });

  it('leaves only through a matching exit and stays inside otherwise', () => {
    const level = LEVELS[0];
    const start = startPlay(level);
    expect(playTap(level, start, 2).kind).toBe('blocked');
    const first = playTap(level, start, 1);
    expect(first.kind).toBe('moved');
    if (first.kind !== 'moved') return;
    expect(first.play.cars.map((car) => car.id)).toEqual([2]);
    expect(first.play.moves).toBe(1);
    expect(staysInside(level, first.play.cars)).toBe(true);
    const back = playUndo(first.play);
    expect(back.moves).toBe(0);
    expect(back.cars).toHaveLength(2);
    const second = playTap(level, first.play, 2);
    expect(second.kind).toBe('moved');
    if (second.kind === 'moved') expect(second.won).toBe(true);
    const edge = playTap(LEVELS[1], startPlay(LEVELS[1]), 1);
    expect(edge.kind).toBe('moved');
    if (edge.kind === 'moved') expect(edge.play.cars.map((car) => car.id)).not.toContain(1);
  });

  it('refuses the wrong edge and locks the board when moves run out', () => {
    const east = slideCar(facingWall(), facingWall().cars, 1);
    expect(east).not.toBeNull();
    expect(east!.some((car) => car.id === 1)).toBe(true);
    expect(staysInside(facingWall(), east!)).toBe(true);
    expect(slideCar(facingWall(), east!, 1)).toBeNull();
    const west = slideCar(facingAway(), facingAway().cars, 1);
    expect(west!.map((car) => car.id)).toEqual([1]);
    expect(west![0]).toMatchObject({ x: 0, y: 0 });
    const tight = { ...twoFree(), moveLimit: 1 };
    const step = playTap(tight, startPlay(tight), 1);
    expect(step.kind).toBe('moved');
    if (step.kind !== 'moved') return;
    expect(step.failed).toBe(true);
    expect(isFailed(step.play.moves, tight.moveLimit, step.play.cars)).toBe(true);
    expect(playTap(tight, step.play, 2).kind).toBe('locked');
    const undone = playUndo(step.play);
    expect(isFailed(undone.moves, tight.moveLimit, undone.cars)).toBe(false);
    const fresh = startPlay(tight);
    expect(playUndo(fresh)).toBe(fresh);
  });
});

describe('lot levels', () => {
  it('solves all ten levels within the move cap', () => {
    expect(LEVELS).toHaveLength(10);
    LEVELS.forEach((level, index) => {
      expect(levelProblems(level), `level ${index + 1}`).toEqual([]);
      const moves = solveLot(level);
      expect(moves, `level ${index + 1}`).not.toBeNull();
      expect(level.moveLimit).toBeGreaterThanOrEqual(moves!.length);
      expect(level.moveLimit).toBe(moves!.length + 2);
      const end = applyMoves(level, moves!);
      expect(isWon(end!)).toBe(true);
      expect(replayClean(level, moves!)).toBe(true);
    });
    const knot = solveLot(LEVELS[5]);
    const counts = new Map<number, number>();
    for (const move of knot!) counts.set(move.carId, (counts.get(move.carId) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeGreaterThanOrEqual(2);
  });

  it('rejects a sealed lane and an overlap', () => {
    const sealed: Level = {
      w: 3, h: 3, moveLimit: 2, exits: [{ dir: 'N', at: 0 }],
      cars: [{ id: 1, len: 2, dir: 'E', x: 2, y: 1, color: 0 }],
    };
    expect(levelProblems(sealed).some((item) => item.includes('no exit'))).toBe(true);
    const piled: Level = {
      w: 4, h: 3, moveLimit: 2, exits: [{ dir: 'E', at: 0 }],
      cars: [
        { id: 1, len: 2, dir: 'E', x: 1, y: 0, color: 0 },
        { id: 2, len: 2, dir: 'E', x: 2, y: 0, color: 1 },
      ],
    };
    expect(levelProblems(piled)).toContain('overlap');
  });
});

describe('lot progress', () => {
  it('drops bad saves and keeps a valid prefix', () => {
    expect(decodeProgress(null)).toEqual(emptyProgress());
    expect(decodeProgress('{' ).current).toBe(0);
    expect(decodeProgress('x'.repeat(MAX_PROGRESS_CHARS + 1)).cleared).toEqual([]);
    const zeros = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const good = { v: 1, cleared: [0], current: 1, best: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    expect(decodeProgress(JSON.stringify(good)).current).toBe(1);
    expect(decodeProgress(JSON.stringify({ ...good, v: 2 })).cleared).toEqual([]);
    expect(decodeProgress(JSON.stringify({ ...good, coins: 1 })).cleared).toEqual([]);
    expect(decodeProgress(JSON.stringify({ ...good, cleared: [0, 2] })).current).toBe(0);
    expect(decodeProgress(JSON.stringify({ ...good, current: 3 })).cleared).toEqual([]);
    expect(decodeProgress(JSON.stringify({ ...good, best: zeros })).cleared).toEqual([]);
    expect(decodeProgress(JSON.stringify({ ...good, best: [99, 0, 0, 0, 0, 0, 0, 0, 0, 0] })).current)
      .toBe(0);
    expect(decodeProgress(JSON.stringify([good])).current).toBe(0);
    const fresh = emptyProgress();
    const won = markClear(fresh, 0, 2);
    expect(fresh.cleared).toEqual([]);
    expect(won).toMatchObject({ cleared: [0], current: 1, best: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    expect(markClear(won, 0, 1).best[0]).toBe(1);
    expect(markClear(won, 0, 2).best[0]).toBe(2);
    expect(markClear(won, 0, 1).current).toBe(1);
    expect(markClear(emptyProgress(), 2, 1)).toEqual(emptyProgress());
    expect(withCurrent(emptyProgress(), 1).current).toBe(0);
    const store = memory();
    saveProgress(store, won);
    expect(loadProgress(store)).toEqual(won);
    expect(store.getItem(LOT_STORAGE_KEY)).toContain('"v":1');
    const boom: LotStore = {
      getItem() { throw new Error('closed'); },
      setItem() { throw new Error('closed'); },
    };
    expect(loadProgress(boom)).toEqual(emptyProgress());
    expect(() => saveProgress(boom, won)).not.toThrow();
    expect(loadProgress(null)).toEqual(emptyProgress());
  });
});

describe('lot difficulties', () => {
  it('solves thirty levels with the spare-move rule for each difficulty', () => {
    expectLimits(LEVELS, 2);
    expectLimits(MID_LEVELS, 1);
    expectLimits(HIGH_LEVELS, 0);
    const keys = new Set<string>();
    for (const level of [...LEVELS, ...MID_LEVELS, ...HIGH_LEVELS]) {
      const key = `${level.w}x${level.h}:${JSON.stringify(level.exits)}:${JSON.stringify(level.cars)}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
    MID_LEVELS.forEach((level, index) => {
      const low = LEVELS[index];
      const moreCars = level.cars.length > low.cars.length;
      const longer = level.moveLimit - 1 > low.moveLimit - 2;
      expect(moreCars || longer, `mid ${index + 1}`).toBe(true);
      expect(occupied(HIGH_LEVELS[index])).toBeGreaterThan(occupied(level));
    });
  });

  it('drops a bad v2 save and migrates a valid v1 only into low', () => {
    expect(decodeLotSave(null)).toBeNull();
    expect(decodeLotSave('{' )).toBeNull();
    expect(decodeLotSave('x'.repeat(MAX_LOT_V2_CHARS + 1))).toBeNull();
    const fresh = emptyLotSave();
    const badShape = { ...fresh, coins: 1 };
    expect(decodeLotSave(JSON.stringify(badShape))).toBeNull();
    expect(decodeLotSave(JSON.stringify({ ...fresh, v: 1 }))).toBeNull();
    const ahead = emptyLotSave();
    ahead.low.current = 4;
    expect(decodeLotSave(JSON.stringify(ahead))).toBeNull();
    const gap = emptyLotSave();
    gap.mid.cleared = [0, 2];
    expect(decodeLotSave(JSON.stringify(gap))).toBeNull();
    const huge = emptyLotSave();
    huge.high.best = [99, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    huge.high.cleared = [0];
    expect(decodeLotSave(JSON.stringify(huge))).toBeNull();
    const fraction = emptyLotSave();
    fraction.low.best = [1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    fraction.low.cleared = [0];
    expect(decodeLotSave(JSON.stringify(fraction))).toBeNull();
    const store = memory();
    const v1 = {
      v: 1, cleared: [0, 1, 2, 3, 4, 5], current: 6,
      best: [2, 3, 4, 4, 5, 5, 0, 0, 0, 0],
    };
    store.setItem(LOT_STORAGE_KEY, JSON.stringify(v1));
    store.setItem(LOT_STORAGE_KEY_V2, '{"v":2}');
    expect(loadLotSave(store).low.cleared).toEqual([]);
    expect(store.getItem(LOT_STORAGE_KEY)).toContain('"v":1');
    store.setItem(LOT_STORAGE_KEY_V2, '');
    const migrated = loadLotSave(store);
    expect(migrated.difficulty).toBe('low');
    expect(migrated.low).toMatchObject({ cleared: v1.cleared, current: 6 });
    expect(migrated.mid).toEqual(emptyLotSave().mid);
    expect(migrated.high).toEqual(emptyLotSave().high);
    expect(isSliceOpen(migrated.mid, 0)).toBe(true);
    expect(isSliceOpen(migrated.mid, 1)).toBe(false);
    expect(store.getItem(LOT_STORAGE_KEY)).toContain('"v":1');
    expect(store.getItem(LOT_STORAGE_KEY_V2)).toContain('"v":2');
    const won = clearLotLevel(migrated, 6, 4);
    expect(won.low.cleared).toContain(6);
    expect(isSliceOpen(won.mid, 1)).toBe(false);
    expect(won.high.cleared).toEqual([]);
    const mid = selectLotDifficulty(won, 'mid');
    expect(mid.low.cleared).toEqual(won.low.cleared);
    expect(mid.difficulty).toBe('mid');
    expect(isSliceOpen(mid.mid, 1)).toBe(false);
    const broken = memory();
    broken.setItem(LOT_STORAGE_KEY, '{');
    expect(loadLotSave(broken).low.current).toBe(0);
    expect(broken.getItem(LOT_STORAGE_KEY_V2)).toBeNull();
    saveLotSave(null, migrated);
    expect(loadLotSave(null)).toEqual(emptyLotSave());
  });
});

describe('lot auto advance', () => {
  it('opens the next level of the same difficulty and stays on level 10', () => {
    expect(levelIdAfterClear(1)).toBe(2);
    expect(levelIdAfterClear(5)).toBe(6);
    expect(levelIdAfterClear(10)).toBe(10);

    let save = emptyLotSave();
    for (let index = 0; index < 4; index += 1) save = advanceClearedLevel(save, index, 1);
    save = advanceClearedLevel(save, 4, 3);
    expect(levelIdAfterClear(5)).toBe(6);
    expect(save.low.cleared).toEqual([0, 1, 2, 3, 4]);
    expect(save.low.current).toBe(5);
    expect(save.low.best[4]).toBe(3);
    expect(isSliceOpen(save.low, 5)).toBe(true);
    expect(isSliceOpen(save.low, 6)).toBe(false);
    expect(save.difficulty).toBe('low');
    expect(save.mid).toEqual(emptyLotSave().mid);
    expect(save.high).toEqual(emptyLotSave().high);

    const replay = advanceClearedLevel(selectLotLevel(save, 4), 4, 1);
    expect(replay.low.cleared).toEqual([0, 1, 2, 3, 4]);
    expect(replay.low.current).toBe(5);
    expect(replay.low.best[4]).toBe(1);
    expect(levelIdAfterClear(5)).toBe(6);
    expect(isSliceOpen(replay.mid, 1)).toBe(false);
    expect(isSliceOpen(replay.high, 1)).toBe(false);

    for (let index = 5; index < 10; index += 1) save = advanceClearedLevel(save, index, 1);
    expect(levelIdAfterClear(10)).toBe(10);
    expect(save.low.current).toBe(9);
    expect(save.low.cleared).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(isSliceOpen(save.low, 10)).toBe(false);
    const stayed = advanceClearedLevel(save, 9, 1);
    expect(stayed.low.current).toBe(9);
    expect(stayed.low.cleared).toHaveLength(10);
    expect(stayed.difficulty).toBe('low');
    expect(stayed.mid.cleared).toEqual([]);
    expect(stayed.high.cleared).toEqual([]);
  });
});

describe('lot routes', () => {
  it('adds the lot page without touching the home entry', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const list = readFileSync('src/pages/PlayListPage.tsx', 'utf8');
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(app).toContain("import('./pages/LotPage')");
    expect(app).toContain("plainRoute('/play/lot'");
    expect(app).not.toContain("from './play/");
    expect(home.match(/'\/play'/g)).toHaveLength(1);
    expect(home).not.toContain('/play/lot');
    expect(list).not.toContain("'/play/pop'");
    expect(app).toContain("plainRoute('/play/pop'");
    expect(list).toContain("'/play/tap'");
    expect(list).toContain("'/play/pour'");
    expect(list).toContain("'/play/lot'");
    for (const route of ['play', 'play/pop', 'play/tap', 'play/pour', 'play/lot']) {
      expect(script).toContain(`'${route}'`);
    }
    const names = [
      'src/play/lotLogic.ts', 'src/play/lotLevels.ts', 'src/play/LotBoard.tsx', 'src/pages/LotPage.tsx',
    ];
    for (const name of names) {
      const source = readFileSync(name, 'utf8');
      expect(source).not.toContain('Car Out');
      expect(source).not.toMatch(/fetch\(|\.png|\.jpg|\.webp/);
    }
  });
});

function expectLimits(levels: Level[], spare: number) {
  expect(levels).toHaveLength(10);
  levels.forEach((level, index) => {
    expect(levelProblems(level), `level ${index + 1}`).toEqual([]);
    const moves = solveLot(level);
    expect(moves, `level ${index + 1}`).not.toBeNull();
    expect(level.moveLimit).toBe(moves!.length + spare);
    const end = applyMoves(level, moves!);
    expect(isWon(end!)).toBe(true);
    expect(replayClean(level, moves!)).toBe(true);
  });
}

function occupied(level: Level): number {
  return level.cars.reduce((sum, car) => sum + car.len, 0);
}

function wallLevel(): Level {
  return {
    w: 5, h: 3, moveLimit: 3, exits: [{ dir: 'E', at: 0 }],
    cars: [
      { id: 1, len: 2, dir: 'E', x: 1, y: 0, color: 0 },
      { id: 2, len: 2, dir: 'S', x: 3, y: 1, color: 1 },
    ],
  };
}

function facingWall(): Level {
  return {
    w: 4, h: 3, moveLimit: 3, exits: [{ dir: 'S', at: 0 }],
    cars: [{ id: 1, len: 2, dir: 'E', x: 1, y: 1, color: 0 }],
  };
}

function facingAway(): Level {
  return {
    w: 4, h: 3, moveLimit: 3, exits: [{ dir: 'E', at: 0 }],
    cars: [{ id: 1, len: 2, dir: 'W', x: 1, y: 0, color: 0 }],
  };
}

function twoFree(): Level {
  return {
    w: 4, h: 3, moveLimit: 2, exits: [{ dir: 'E', at: 0 }, { dir: 'E', at: 1 }],
    cars: [
      { id: 1, len: 2, dir: 'E', x: 1, y: 0, color: 0 },
      { id: 2, len: 2, dir: 'E', x: 1, y: 1, color: 1 },
    ],
  };
}

function staysInside(level: Level, cars: Car[]): boolean {
  return cars.every((car) => carCells(car).every((cell) => inLot(level, cell.x, cell.y)));
}

function replayClean(level: Level, moves: { carId: number }[]): boolean {
  let cars = cloneCars(level.cars);
  for (const move of moves) {
    const next = slideCar(level, cars, move.carId);
    if (!next || cellsOverlap(next) || !staysInside(level, next)) return false;
    cars = next;
  }
  return isWon(cars);
}

function memory(): LotStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
}
