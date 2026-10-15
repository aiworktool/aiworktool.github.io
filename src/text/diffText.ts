import { alignJsonLines, type SideRow } from '../json/diffJson';
import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';

export const TEXT_MAX_CHARS = 200_000;
const MAX_DIFF_LINES = 200;

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
  return { ok: true, same: false, ...boundRows(alignJsonLines(left, right), lang) };
}

function boundRows(rows: SideRow[], lang: Lang): { rows: SideRow[]; truncated: boolean } {
  if (rows.length <= MAX_DIFF_LINES) return { rows, truncated: false };
  const omitted = text(lang).textDiff.omitted;
  return {
    truncated: true,
    rows: [
      ...rows.slice(0, MAX_DIFF_LINES),
      { left: fill(omitted, {}), right: fill(omitted, {}), changed: false },
    ],
  };
}
