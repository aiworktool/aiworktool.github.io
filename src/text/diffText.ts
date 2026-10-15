import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import type { SideRow } from '../json/diffJson';
import { alignLines } from './lineDiff';

export const TEXT_MAX_CHARS = 200_000;
const MAX_SHOWN = 200;
const CONTEXT = 1;

export type TextCompare =
  | { ok: false; message: string }
  | { ok: true; same: boolean; rows: SideRow[]; truncated: boolean };

export function comparePlainText(left: string, right: string, lang: Lang = 'zh'): TextCompare {
  const copy = text(lang).textDiff;
  if (!left.trim() && !right.trim()) return { ok: false, message: copy.empty };
  if (left.length > TEXT_MAX_CHARS || right.length > TEXT_MAX_CHARS) {
    return { ok: false, message: copy.tooBig };
  }
  if (left === right) return { ok: true, same: true, rows: [], truncated: false };
  const aligned = pairEdits(alignLines(left.split('\n'), right.split('\n')));
  return { ok: true, same: false, ...focusChanges(aligned, lang) };
}

function pairEdits(rows: SideRow[]): SideRow[] {
  const paired: SideRow[] = [];
  let index = 0;
  while (index < rows.length) {
    if (!isSplit(rows[index])) {
      paired.push(rows[index]);
      index += 1;
      continue;
    }
    const removed: string[] = [];
    const added: string[] = [];
    while (index < rows.length && isSplit(rows[index])) {
      if (rows[index].left) removed.push(rows[index].left);
      if (rows[index].right) added.push(rows[index].right);
      index += 1;
    }
    const length = Math.max(removed.length, added.length);
    for (let slot = 0; slot < length; slot += 1) {
      const source = removed[slot] ?? '';
      const target = added[slot] ?? '';
      paired.push({ left: source, right: target, changed: source !== target });
    }
  }
  return paired;
}

function isSplit(row: SideRow): boolean {
  return row.changed && (!row.left || !row.right);
}

function focusChanges(rows: SideRow[], lang: Lang): { rows: SideRow[]; truncated: boolean } {
  const keep = new Set<number>();
  rows.forEach((row, index) => {
    if (!row.changed) return;
    for (let near = index - CONTEXT; near <= index + CONTEXT; near += 1) {
      if (near >= 0 && near < rows.length) keep.add(near);
    }
  });
  const picked = [...keep].sort((a, b) => a - b);
  const shown: SideRow[] = [];
  let truncated = false;
  let previous = -2;
  for (const index of picked) {
    if (shown.length >= MAX_SHOWN) {
      truncated = true;
      break;
    }
    if (previous >= 0 && index > previous + 1) shown.push(gap(lang));
    shown.push(rows[index]);
    previous = index;
  }
  if (truncated) shown.push(gap(lang));
  return { rows: shown, truncated };
}

function gap(lang: Lang): SideRow {
  const omitted = fill(text(lang).textDiff.omitted, {});
  return { left: omitted, right: omitted, changed: false };
}
