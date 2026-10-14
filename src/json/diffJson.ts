import { formatJsonText, JSON_MAX_CHARS } from './formatJson';

export type DiffKind = 'same' | 'remove' | 'add';
export type DiffLine = { kind: DiffKind; text: string };
export type CompareStatus = 'identical' | 'format-only' | 'different';

export type CompareOutcome =
  | { ok: false; message: string }
  | {
    ok: true;
    status: CompareStatus;
    left: string;
    right: string;
    lines: DiffLine[];
    truncated: boolean;
  };

const MAX_DIFF_LINES = 200;

export function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== 'object') return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortJsonValue((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export function diffLines(left: string, right: string): DiffLine[] {
  const source = left.split('\n');
  const target = right.split('\n');
  let start = 0;
  while (start < source.length && start < target.length && source[start] === target[start]) {
    start += 1;
  }
  let endSource = source.length - 1;
  let endTarget = target.length - 1;
  while (endSource >= start && endTarget >= start && source[endSource] === target[endTarget]) {
    endSource -= 1;
    endTarget -= 1;
  }
  const lines: DiffLine[] = [];
  for (let index = 0; index < start; index += 1) lines.push({ kind: 'same', text: source[index] });
  for (let index = start; index <= endSource; index += 1) {
    lines.push({ kind: 'remove', text: source[index] });
  }
  for (let index = start; index <= endTarget; index += 1) lines.push({ kind: 'add', text: target[index] });
  for (let index = endSource + 1; index < source.length; index += 1) {
    lines.push({ kind: 'same', text: source[index] });
  }
  return lines;
}

function boundDiff(lines: DiffLine[]): { lines: DiffLine[]; truncated: boolean } {
  if (lines.length <= MAX_DIFF_LINES) return { lines, truncated: false };
  return {
    lines: [...lines.slice(0, MAX_DIFF_LINES), { kind: 'same', text: '…其余差异已省略' }],
    truncated: true,
  };
}

function statusOf(left: string, right: string, leftValue: unknown, rightValue: unknown): CompareStatus {
  if (left === right) return 'identical';
  const sameData = JSON.stringify(sortJsonValue(leftValue)) === JSON.stringify(sortJsonValue(rightValue));
  return sameData ? 'format-only' : 'different';
}

export function compareJsonText(left: string, right: string): CompareOutcome {
  if (left.length > JSON_MAX_CHARS || right.length > JSON_MAX_CHARS) {
    return { ok: false, message: '有一边超过 1 MB，请缩短后再比较。' };
  }
  const formattedLeft = formatJsonText(left);
  const formattedRight = formatJsonText(right);
  if (!formattedLeft.ok) return { ok: false, message: `左边：${formattedLeft.message}` };
  if (!formattedRight.ok) return { ok: false, message: `右边：${formattedRight.message}` };
  const leftValue = JSON.parse(formattedLeft.text) as unknown;
  const rightValue = JSON.parse(formattedRight.text) as unknown;
  const bounded = boundDiff(diffLines(formattedLeft.text, formattedRight.text));
  return {
    ok: true,
    status: statusOf(formattedLeft.text, formattedRight.text, leftValue, rightValue),
    left: formattedLeft.text,
    right: formattedRight.text,
    lines: bounded.lines,
    truncated: bounded.truncated,
  };
}

export function compareStatusText(status: CompareStatus): string {
  if (status === 'identical') return '两段格式化后完全一致。';
  if (status === 'format-only') return '数据相同，只是键的顺序不同。';
  return '数据不同。';
}
