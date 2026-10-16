import { cloneCars, isWon, slideCar } from './lotLogic';
import type { Car, Level } from './lotTypes';

export type LotMove = { carId: number };

type Node = { key: string; cars: Car[] };
type Parent = Map<string, { prev: string; move: LotMove } | null>;

export function solveLot(level: Level, limit = 80000): LotMove[] | null {
  const start = cloneCars(level.cars);
  if (isWon(start)) return [];
  const root = stateKey(start);
  const parent: Parent = new Map([[root, null]]);
  const queue: Node[] = [{ key: root, cars: start }];
  let head = 0;
  let seen = 0;
  while (head < queue.length && seen < limit) {
    const item = queue[head];
    head += 1;
    seen += 1;
    const found = branch(level, item, parent, queue);
    if (found !== null) return replay(parent, found);
  }
  return null;
}

function branch(level: Level, item: Node, parent: Parent, queue: Node[]): string | null {
  for (const car of item.cars) {
    const next = slideCar(level, item.cars, car.id);
    if (!next) continue;
    const key = stateKey(next);
    if (parent.has(key)) continue;
    parent.set(key, { prev: item.key, move: { carId: car.id } });
    if (isWon(next)) return key;
    queue.push({ key, cars: next });
  }
  return null;
}

function stateKey(cars: Car[]): string {
  if (cars.length === 0) return '#';
  return cars.map((car) => `${car.id}:${car.x},${car.y}`).sort().join('|');
}

function replay(parent: Parent, key: string): LotMove[] {
  const moves: LotMove[] = [];
  let cursor = parent.get(key);
  while (cursor) {
    moves.push(cursor.move);
    cursor = parent.get(cursor.prev);
  }
  moves.reverse();
  return moves;
}

export function applyMoves(level: Level, moves: LotMove[]): Car[] | null {
  let cars = cloneCars(level.cars);
  for (const move of moves) {
    const next = slideCar(level, cars, move.carId);
    if (!next) return null;
    cars = next;
  }
  return cars;
}
