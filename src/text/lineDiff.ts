import type { SideRow } from '../json/diffJson';

const MAX_LINES = 4000;
const MAX_MYERS = 400;

export function alignLines(left: string[], right: string[]): SideRow[] {
  return align(left, right, 0);
}

function align(left: string[], right: string[], depth: number): SideRow[] {
  if (!left.length) return right.map((line) => row('', line, true));
  if (!right.length) return left.map((line) => row(line, '', true));
  if (depth > 30 || left.length > MAX_LINES || right.length > MAX_LINES) return indexAlign(left, right);
  const anchors = uniqueAnchors(left, right);
  if (!anchors.length) {
    return left.length <= MAX_MYERS && right.length <= MAX_MYERS ? myers(left, right) : indexAlign(left, right);
  }
  return stitch(left, right, anchors, depth);
}

function stitch(left: string[], right: string[], anchors: [number, number][], depth: number): SideRow[] {
  const rows: SideRow[] = [];
  let leftAt = 0;
  let rightAt = 0;
  for (const [nextLeft, nextRight] of anchors) {
    rows.push(...align(left.slice(leftAt, nextLeft), right.slice(rightAt, nextRight), depth + 1));
    rows.push(row(left[nextLeft], right[nextRight], false));
    leftAt = nextLeft + 1;
    rightAt = nextRight + 1;
  }
  rows.push(...align(left.slice(leftAt), right.slice(rightAt), depth + 1));
  return rows;
}

function uniqueAnchors(left: string[], right: string[]): [number, number][] {
  const rightAt = uniqueIndex(right);
  const leftCount = counts(left);
  const pairs: [number, number][] = [];
  left.forEach((line, index) => {
    if (leftCount.get(line) !== 1) return;
    const match = rightAt.get(line);
    if (match !== undefined) pairs.push([index, match]);
  });
  return increasing(pairs);
}

function counts(lines: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) map.set(line, (map.get(line) ?? 0) + 1);
  return map;
}

function uniqueIndex(lines: string[]): Map<string, number> {
  const seen = counts(lines);
  const map = new Map<string, number>();
  lines.forEach((line, index) => {
    if (seen.get(line) === 1) map.set(line, index);
  });
  return map;
}

function increasing(pairs: [number, number][]): [number, number][] {
  const tails: number[] = [];
  const tailAt: number[] = [];
  const previous = pairs.map(() => -1);
  pairs.forEach((pair, index) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (tails[mid] < pair[1]) low = mid + 1;
      else high = mid;
    }
    previous[index] = low > 0 ? tailAt[low - 1] : -1;
    tails[low] = pair[1];
    tailAt[low] = index;
  });
  const picked: [number, number][] = [];
  let cursor = tailAt[tails.length - 1] ?? -1;
  while (cursor >= 0) {
    picked.push(pairs[cursor]);
    cursor = previous[cursor];
  }
  return picked.reverse();
}

function indexAlign(left: string[], right: string[]): SideRow[] {
  const rows: SideRow[] = [];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const source = left[index] ?? '';
    const target = right[index] ?? '';
    rows.push(row(source, target, source !== target));
  }
  return rows;
}

function myers(left: string[], right: string[]): SideRow[] {
  const trace: Map<number, number>[] = [];
  const score = new Map<number, number>([[1, 0]]);
  const max = left.length + right.length;
  for (let depth = 0; depth <= max; depth += 1) {
    trace.push(new Map(score));
    for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
      const x = step(score, diagonal, depth);
      const y = x - diagonal;
      const end = slide(left, right, x, y);
      score.set(diagonal, end.x);
      if (end.x >= left.length && end.y >= right.length) return replay(trace, left, right);
    }
  }
  return indexAlign(left, right);
}

function step(score: Map<number, number>, diagonal: number, depth: number): number {
  const down = score.get(diagonal + 1) ?? 0;
  const left = (score.get(diagonal - 1) ?? 0) + 1;
  if (diagonal === -depth || (diagonal !== depth && down > left - 1)) return down;
  return left;
}

function slide(left: string[], right: string[], x: number, y: number): { x: number; y: number } {
  let nextX = x;
  let nextY = y;
  while (nextX < left.length && nextY < right.length && left[nextX] === right[nextY]) {
    nextX += 1;
    nextY += 1;
  }
  return { x: nextX, y: nextY };
}

function replay(trace: Map<number, number>[], left: string[], right: string[]): SideRow[] {
  const rows: SideRow[] = [];
  let x = left.length;
  let y = right.length;
  for (let depth = trace.length - 1; depth > 0; depth -= 1) {
    const diagonal = x - y;
    const previous = cameFrom(trace[depth], diagonal, depth);
    const prevX = trace[depth].get(previous) ?? 0;
    const prevY = prevX - previous;
    while (x > prevX && y > prevY) {
      x -= 1;
      y -= 1;
      rows.push(row(left[x], right[y], false));
    }
    if (x === prevX) {
      y -= 1;
      rows.push(row('', right[y], true));
    } else {
      x -= 1;
      rows.push(row(left[x], '', true));
    }
  }
  while (x > 0 && y > 0) {
    x -= 1;
    y -= 1;
    rows.push(row(left[x], right[y], false));
  }
  return rows.reverse();
}

function cameFrom(score: Map<number, number>, diagonal: number, depth: number): number {
  const down = score.get(diagonal + 1) ?? 0;
  const across = score.get(diagonal - 1) ?? 0;
  if (diagonal === -depth || (diagonal !== depth && down > across)) return diagonal + 1;
  return diagonal - 1;
}

function row(left: string, right: string, changed: boolean): SideRow {
  return { left, right, changed };
}
