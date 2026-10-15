import { formatJsonText, JSON_MAX_CHARS } from './formatJson';

export type CompareStatus = 'identical' | 'format-only' | 'different';
export type SideRow = { left: string; right: string; changed: boolean };

export type CompareOutcome =
  | { ok: false; message: string }
  | {
    ok: true;
    status: CompareStatus;
    left: string;
    right: string;
    rows: SideRow[];
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

export function alignJsonLines(left: string, right: string): SideRow[] {
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
  const rows: SideRow[] = [];
  for (let index = 0; index < start; index += 1) {
    rows.push({ left: source[index], right: target[index], changed: false });
  }
  const midSource = source.slice(start, endSource + 1);
  const midTarget = target.slice(start, endTarget + 1);
  const midLength = Math.max(midSource.length, midTarget.length);
  for (let index = 0; index < midLength; index += 1) {
    const leftLine = midSource[index] ?? '';
    const rightLine = midTarget[index] ?? '';
    rows.push({ left: leftLine, right: rightLine, changed: leftLine !== rightLine });
  }
  const tail = source.length - (endSource + 1);
  for (let index = 0; index < tail; index += 1) {
    rows.push({
      left: source[endSource + 1 + index],
      right: target[endTarget + 1 + index],
      changed: false,
    });
  }
  return rows;
}

function boundRows(rows: SideRow[]): { rows: SideRow[]; truncated: boolean } {
  if (rows.length <= MAX_DIFF_LINES) return { rows, truncated: false };
  return {
    rows: [
      ...rows.slice(0, MAX_DIFF_LINES),
      { left: '…其余差异已省略', right: '…其余差异已省略', changed: false },
    ],
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
  const bounded = boundRows(alignJsonLines(formattedLeft.text, formattedRight.text));
  return {
    ok: true,
    status: statusOf(formattedLeft.text, formattedRight.text, leftValue, rightValue),
    left: formattedLeft.text,
    right: formattedRight.text,
    rows: bounded.rows,
    truncated: bounded.truncated,
  };
}

export function compareStatusText(status: CompareStatus): string {
  if (status === 'identical') return '两段格式化后完全一致。';
  if (status === 'format-only') return '数据相同，只是键的顺序不同。';
  return '数据不同。';
}
