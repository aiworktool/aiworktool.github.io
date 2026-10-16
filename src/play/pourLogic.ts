export const TUBE_CAP = 4;

export type Tube = number[];
export type Move = { from: number; to: number };

const EASY_PAIRS: Tube[] = [
  [0, 0, 1, 1],
  [1, 1, 0, 0],
  [2, 2, 3, 3],
  [3, 3, 2, 2],
  [],
];

const EASY_TOPS: Tube[] = [
  [0, 0, 0, 1],
  [1, 1, 1, 0],
  [2, 2, 2, 3],
  [3, 3, 3, 2],
  [],
];

const MIXED: Tube[] = [
  [0, 0, 0, 3],
  [1, 1, 1, 0],
  [2, 2, 2, 1],
  [3, 3, 3, 2],
  [],
];

export const LEVELS: Tube[][] = [EASY_TOPS, EASY_PAIRS, MIXED];

export function cloneTubes(tubes: Tube[]): Tube[] {
  return tubes.map((tube) => tube.slice());
}

export function topRun(tube: Tube): { color: number; count: number } | null {
  if (tube.length === 0) return null;
  const color = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i -= 1) count += 1;
  return { color, count };
}

export function canPour(tubes: Tube[], from: number, to: number): number {
  if (from === to || !tubes[from] || !tubes[to]) return 0;
  const run = topRun(tubes[from]);
  if (!run) return 0;
  const space = TUBE_CAP - tubes[to].length;
  if (space <= 0) return 0;
  const destTop = tubes[to][tubes[to].length - 1];
  if (destTop !== undefined && destTop !== run.color) return 0;
  return Math.min(run.count, space);
}

export function pour(tubes: Tube[], from: number, to: number): Tube[] | null {
  const amount = canPour(tubes, from, to);
  if (amount <= 0) return null;
  const next = cloneTubes(tubes);
  const color = next[from][next[from].length - 1];
  for (let i = 0; i < amount; i += 1) {
    next[from].pop();
    next[to].push(color);
  }
  return next;
}

export function isSolved(tubes: Tube[]): boolean {
  return tubes.every((tube) => {
    if (tube.length === 0) return true;
    if (tube.length !== TUBE_CAP) return false;
    return tube.every((color) => color === tube[0]);
  });
}

export function tubeKey(tubes: Tube[]): string {
  return tubes.map((tube) => tube.join(',')).join('|');
}

export function solve(start: Tube[], limit = 20000): Move[] | null {
  if (isSolved(start)) return [];
  const parent = new Map<string, { prev: string; move: Move } | null>();
  const states = new Map<string, Tube[]>();
  const queue: string[] = [];
  const root = tubeKey(start);
  parent.set(root, null);
  states.set(root, cloneTubes(start));
  queue.push(root);
  let seen = 0;
  while (queue.length > 0 && seen < limit) {
    const key = queue.shift();
    if (!key) break;
    const found = expandTube(key, parent, states, queue);
    seen += 1;
    if (found) return replay(parent, found);
  }
  return null;
}

function expandTube(
  key: string,
  parent: Map<string, { prev: string; move: Move } | null>,
  states: Map<string, Tube[]>,
  queue: string[],
): string | null {
  const tubes = states.get(key);
  if (!tubes) return null;
  states.delete(key);
  for (let from = 0; from < tubes.length; from += 1) {
    for (let to = 0; to < tubes.length; to += 1) {
      const next = pour(tubes, from, to);
      if (!next) continue;
      const child = tubeKey(next);
      if (parent.has(child)) continue;
      parent.set(child, { prev: key, move: { from, to } });
      if (isSolved(next)) return child;
      states.set(child, next);
      queue.push(child);
    }
  }
  return null;
}

function replay(parent: Map<string, { prev: string; move: Move } | null>, key: string): Move[] {
  const moves: Move[] = [];
  let cursor = parent.get(key);
  while (cursor) {
    moves.push(cursor.move);
    cursor = parent.get(cursor.prev);
  }
  moves.reverse();
  return moves;
}
