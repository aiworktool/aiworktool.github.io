export type Dir = 'N' | 'E' | 'S' | 'W';

export type Car = {
  id: number;
  len: 2 | 3;
  dir: Dir;
  x: number;
  y: number;
  color: number;
};

export type Exit = { dir: Dir; at: number };

export type Level = {
  w: number;
  h: number;
  exits: Exit[];
  cars: Car[];
  moveLimit: number;
};

export const CAR_COLORS = [
  '#1f6b4a',
  '#c4783a',
  '#3d6f8c',
  '#8f3d4b',
  '#5c4d7a',
  '#2f6f6a',
  '#a56b2b',
  '#6e4a3a',
];
