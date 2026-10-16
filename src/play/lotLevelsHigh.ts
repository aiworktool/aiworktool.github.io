import type { Car, Dir, Exit, Level } from './lotTypes';

function car(id: number, len: 2 | 3, dir: Dir, x: number, y: number, color: number): Car {
  return { id, len, dir, x, y, color };
}

function level(w: number, h: number, moveLimit: number, exits: Exit[], cars: Car[]): Level {
  return { w, h, moveLimit, exits, cars };
}

export const HIGH_LEVELS: Level[] = [
  level(6, 5, 4, [
    { dir: 'W', at: 3 }, { dir: 'N', at: 2 }, { dir: 'W', at: 0 }, { dir: 'S', at: 0 },
  ], [
    car(1, 2, 'W', 4, 3, 0),
    car(2, 2, 'N', 2, 2, 1),
    car(3, 2, 'W', 1, 0, 2),
    car(4, 2, 'S', 0, 1, 3),
  ]),
  level(6, 5, 5, [
    { dir: 'E', at: 0 }, { dir: 'S', at: 4 }, { dir: 'E', at: 2 }, { dir: 'E', at: 4 },
  ], [
    car(1, 2, 'E', 2, 0, 0),
    car(2, 2, 'S', 4, 1, 1),
    car(3, 2, 'E', 3, 2, 2),
    car(4, 2, 'S', 4, 3, 3),
    car(5, 2, 'E', 5, 4, 4),
  ]),
  level(6, 6, 6, [
    { dir: 'E', at: 0 }, { dir: 'S', at: 4 }, { dir: 'E', at: 2 }, { dir: 'E', at: 4 }, { dir: 'S', at: 5 },
  ], [
    car(1, 2, 'E', 2, 0, 0),
    car(2, 2, 'S', 4, 1, 1),
    car(3, 2, 'E', 3, 2, 2),
    car(4, 2, 'S', 4, 3, 3),
    car(5, 2, 'E', 4, 4, 4),
    car(6, 2, 'S', 5, 5, 5),
  ]),
  level(6, 6, 7, [
    { dir: 'W', at: 4 }, { dir: 'S', at: 4 }, { dir: 'N', at: 1 },
    { dir: 'E', at: 2 }, { dir: 'E', at: 0 }, { dir: 'N', at: 3 },
  ], [
    car(1, 2, 'W', 3, 4, 0),
    car(2, 2, 'S', 4, 3, 1),
    car(3, 2, 'N', 1, 3, 2),
    car(4, 3, 'E', 2, 2, 3),
    car(5, 2, 'E', 1, 0, 4),
    car(6, 2, 'N', 3, 1, 5),
  ]),
  level(6, 6, 8, [
    { dir: 'E', at: 4 }, { dir: 'S', at: 1 }, { dir: 'N', at: 4 },
    { dir: 'W', at: 2 }, { dir: 'E', at: 0 }, { dir: 'N', at: 0 }, { dir: 'E', at: 1 },
  ], [
    car(1, 2, 'E', 2, 4, 0),
    car(2, 2, 'S', 1, 3, 1),
    car(3, 2, 'N', 4, 3, 2),
    car(4, 3, 'W', 2, 2, 3),
    car(5, 2, 'E', 5, 0, 4),
    car(6, 2, 'N', 0, 1, 5),
    car(7, 2, 'E', 4, 1, 6),
  ]),
  level(6, 6, 8, [
    { dir: 'E', at: 4 }, { dir: 'S', at: 1 }, { dir: 'N', at: 4 },
    { dir: 'W', at: 2 }, { dir: 'E', at: 0 }, { dir: 'N', at: 0 }, { dir: 'E', at: 1 },
  ], [
    car(1, 2, 'E', 2, 4, 0),
    car(2, 3, 'S', 1, 3, 1),
    car(3, 2, 'N', 4, 3, 2),
    car(4, 3, 'W', 2, 2, 3),
    car(5, 2, 'E', 5, 0, 4),
    car(6, 2, 'N', 0, 1, 5),
    car(7, 2, 'E', 4, 1, 6),
  ]),
  level(6, 6, 9, [
    { dir: 'E', at: 4 }, { dir: 'S', at: 1 }, { dir: 'N', at: 4 },
    { dir: 'W', at: 2 }, { dir: 'E', at: 0 }, { dir: 'S', at: 5 }, { dir: 'S', at: 3 },
  ], [
    car(1, 2, 'E', 2, 4, 0),
    car(2, 2, 'S', 1, 3, 1),
    car(3, 2, 'N', 4, 3, 2),
    car(4, 3, 'W', 2, 2, 3),
    car(5, 2, 'E', 4, 0, 4),
    car(6, 2, 'E', 2, 0, 5),
    car(7, 2, 'S', 5, 1, 6),
    car(8, 2, 'S', 3, 5, 7),
  ]),
  level(6, 6, 9, [
    { dir: 'E', at: 4 }, { dir: 'S', at: 1 }, { dir: 'N', at: 4 },
    { dir: 'W', at: 2 }, { dir: 'E', at: 0 }, { dir: 'S', at: 5 }, { dir: 'N', at: 0 },
  ], [
    car(1, 2, 'E', 2, 4, 0),
    car(2, 3, 'S', 1, 3, 1),
    car(3, 3, 'N', 4, 3, 2),
    car(4, 3, 'W', 2, 2, 3),
    car(5, 2, 'E', 4, 0, 4),
    car(6, 2, 'E', 2, 0, 5),
    car(7, 2, 'S', 5, 1, 6),
    car(8, 2, 'N', 0, 1, 7),
  ]),
  level(6, 6, 9, [
    { dir: 'E', at: 4 }, { dir: 'S', at: 1 }, { dir: 'N', at: 4 },
    { dir: 'W', at: 2 }, { dir: 'E', at: 0 }, { dir: 'S', at: 5 }, { dir: 'E', at: 5 },
  ], [
    car(1, 2, 'E', 2, 4, 0),
    car(2, 3, 'S', 1, 3, 1),
    car(3, 2, 'N', 4, 3, 2),
    car(4, 3, 'W', 2, 2, 3),
    car(5, 2, 'E', 4, 0, 4),
    car(6, 3, 'E', 2, 0, 5),
    car(7, 2, 'S', 5, 1, 6),
    car(8, 2, 'E', 5, 5, 7),
  ]),
  level(6, 6, 10, [
    { dir: 'E', at: 4 }, { dir: 'S', at: 1 }, { dir: 'N', at: 4 },
    { dir: 'W', at: 2 }, { dir: 'E', at: 0 }, { dir: 'S', at: 5 }, { dir: 'E', at: 5 },
  ], [
    car(1, 2, 'E', 2, 4, 0),
    car(2, 3, 'S', 1, 3, 1),
    car(3, 3, 'N', 4, 3, 2),
    car(4, 3, 'W', 2, 2, 3),
    car(5, 2, 'E', 4, 0, 4),
    car(6, 2, 'E', 2, 0, 5),
    car(7, 2, 'S', 5, 1, 6),
    car(8, 2, 'E', 1, 5, 7),
  ]),
];
