import type { Car, Dir, Exit, Level } from './lotTypes';

const STEP: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

export function inLot(level: Level, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < level.w && y < level.h;
}

export function carCells(car: Car): { x: number; y: number }[] {
  const { dx, dy } = STEP[car.dir];
  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < car.len; i += 1) {
    cells.push({ x: car.x - dx * i, y: car.y - dy * i });
  }
  return cells;
}

export function facesExit(level: Level, dir: Dir, x: number, y: number): boolean {
  return level.exits.some((exit) => exitMatches(level, exit, dir, x, y));
}

function exitMatches(level: Level, exit: Exit, dir: Dir, x: number, y: number): boolean {
  if (exit.dir !== dir) return false;
  if (dir === 'N') return y === 0 && exit.at === x;
  if (dir === 'S') return y === level.h - 1 && exit.at === x;
  if (dir === 'W') return x === 0 && exit.at === y;
  return x === level.w - 1 && exit.at === y;
}

export function cloneCars(cars: Car[]): Car[] {
  return cars.map((car) => ({ ...car })).sort((a, b) => a.id - b.id);
}

export function slideCar(level: Level, cars: Car[], carId: number): Car[] | null {
  const car = cars.find((item) => item.id === carId);
  if (!car) return null;
  const others = cars.filter((item) => item.id !== carId);
  const moved = drive(level, car, others);
  if (!moved) return null;
  if (moved === 'out') return cloneCars(others);
  return cloneCars(others.concat(moved));
}

function drive(level: Level, car: Car, others: Car[]): Car | 'out' | null {
  const { dx, dy } = STEP[car.dir];
  let x = car.x;
  let y = car.y;
  let steps = 0;
  const guardLimit = level.w + level.h + 2;
  for (let guard = 0; guard < guardLimit; guard += 1) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inLot(level, nx, ny)) {
      if (facesExit(level, car.dir, x, y)) return 'out';
      break;
    }
    if (occupied(others, nx, ny)) break;
    x = nx;
    y = ny;
    steps += 1;
  }
  if (steps === 0) return null;
  return { ...car, x, y };
}

function occupied(cars: Car[], x: number, y: number): boolean {
  return cars.some((car) => carCells(car).some((cell) => cell.x === x && cell.y === y));
}

export function isWon(cars: Car[]): boolean {
  return cars.length === 0;
}

export function isFailed(moves: number, limit: number, cars: Car[]): boolean {
  return cars.length > 0 && moves >= limit;
}

export function cellsOverlap(cars: Car[]): boolean {
  const seen = new Set<string>();
  for (const car of cars) {
    for (const cell of carCells(car)) {
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
  }
  return false;
}

export function hasExitAhead(level: Level, car: Car): boolean {
  const { dx, dy } = STEP[car.dir];
  let x = car.x;
  let y = car.y;
  const guardLimit = level.w + level.h + 2;
  for (let n = 0; n < guardLimit; n += 1) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inLot(level, nx, ny)) return facesExit(level, car.dir, x, y);
    x = nx;
    y = ny;
  }
  return false;
}

export function levelProblems(level: Level): string[] {
  const problems: string[] = [];
  if (level.w < 3 || level.h < 3 || level.w > 8 || level.h > 8) problems.push('size');
  if (level.cars.length < 1 || level.cars.length > 8) problems.push('cars');
  if (level.moveLimit < 1 || level.moveLimit > 30) problems.push('limit');
  const ids = new Set(level.cars.map((car) => car.id));
  if (ids.size !== level.cars.length) problems.push('ids');
  problems.push(...exitProblems(level), ...placementProblems(level));
  return problems;
}

function exitProblems(level: Level): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const exit of level.exits) {
    const lane = exit.dir === 'N' || exit.dir === 'S' ? level.w : level.h;
    if (!Number.isInteger(exit.at) || exit.at < 0 || exit.at >= lane) {
      problems.push(`exit ${exit.dir}${exit.at}`);
    }
    const key = `${exit.dir}:${exit.at}`;
    if (seen.has(key)) problems.push(`dup ${key}`);
    seen.add(key);
  }
  return problems;
}

function placementProblems(level: Level): string[] {
  const problems: string[] = [];
  if (cellsOverlap(level.cars)) problems.push('overlap');
  for (const car of level.cars) {
    if (!carFits(level, car)) problems.push(`car ${car.id} out`);
    if (car.color < 0 || car.color > 7) problems.push(`car ${car.id} color`);
    if (!hasExitAhead(level, car)) problems.push(`car ${car.id} no exit`);
  }
  return problems;
}

function carFits(level: Level, car: Car): boolean {
  if (car.len !== 2 && car.len !== 3) return false;
  return carCells(car).every((cell) => inLot(level, cell.x, cell.y));
}

export type GridSpot = { col: number; row: number; w: number; h: number };

export function carSpot(car: Car): GridSpot {
  const { dx, dy } = STEP[car.dir];
  const tailX = car.x - dx * (car.len - 1);
  const tailY = car.y - dy * (car.len - 1);
  const horizontal = dx !== 0;
  return {
    col: Math.min(car.x, tailX) + 2,
    row: Math.min(car.y, tailY) + 2,
    w: horizontal ? car.len : 1,
    h: horizontal ? 1 : car.len,
  };
}

export function exitSpot(level: Level, exit: Exit): { col: number; row: number } {
  if (exit.dir === 'N') return { col: exit.at + 2, row: 1 };
  if (exit.dir === 'S') return { col: exit.at + 2, row: level.h + 2 };
  if (exit.dir === 'W') return { col: 1, row: exit.at + 2 };
  return { col: level.w + 2, row: exit.at + 2 };
}

export type PlaySnap = { cars: Car[]; moves: number };

export type PlayState = { cars: Car[]; moves: number; past: PlaySnap[] };

export type TapResult =
  | { kind: 'blocked' }
  | { kind: 'locked' }
  | { kind: 'moved'; play: PlayState; won: boolean; failed: boolean };

export function startPlay(level: Level): PlayState {
  return { cars: cloneCars(level.cars), moves: 0, past: [] };
}

export function playTap(level: Level, play: PlayState, carId: number): TapResult {
  if (isWon(play.cars) || isFailed(play.moves, level.moveLimit, play.cars)) {
    return { kind: 'locked' };
  }
  const next = slideCar(level, play.cars, carId);
  if (!next) return { kind: 'blocked' };
  const moves = play.moves + 1;
  return {
    kind: 'moved',
    won: isWon(next),
    failed: isFailed(moves, level.moveLimit, next),
    play: { cars: next, moves, past: play.past.concat({ cars: play.cars, moves: play.moves }) },
  };
}

export function playUndo(play: PlayState): PlayState {
  const prev = play.past[play.past.length - 1];
  if (!prev) return play;
  return { cars: prev.cars, moves: prev.moves, past: play.past.slice(0, -1) };
}
