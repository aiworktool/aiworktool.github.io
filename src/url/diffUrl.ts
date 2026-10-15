export const URL_MAX_CHARS = 100_000;
const MAX_ROWS = 200;

export type Param = { key: string; value: string };
export type ParsedQuery = { address: string | null; params: Param[] };
export type UrlRow = { left: string; right: string; changed: boolean };
export type UrlStatus = 'empty' | 'same' | 'address' | 'params' | 'params-address';

export type UrlOutcome =
  | { ok: false; message: string }
  | {
    ok: true;
    status: UrlStatus;
    rows: UrlRow[];
    truncated: boolean;
    leftAddress: string | null;
    rightAddress: string | null;
  };

function readParams(search: URLSearchParams): Param[] {
  const params: Param[] = [];
  search.forEach((value, key) => params.push({ key, value }));
  return params;
}

function splitRequest(text: string): ParsedQuery {
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('//');
  if (absolute) {
    const url = new URL(text.startsWith('//') ? `https:${text}` : text);
    return { address: `${url.origin}${url.pathname}`, params: readParams(url.searchParams) };
  }
  if (text.startsWith('/')) {
    const url = new URL(text, 'http://local.invalid');
    return { address: url.pathname, params: readParams(url.searchParams) };
  }
  const bare = text.startsWith('?') ? text.slice(1) : text;
  const hash = bare.indexOf('#');
  const query = hash >= 0 ? bare.slice(0, hash) : bare;
  return { address: null, params: readParams(new URLSearchParams(query)) };
}

export function parseRequest(input: string): { ok: true; parsed: ParsedQuery } | { ok: false; message: string } {
  if (input.length > URL_MAX_CHARS) {
    return { ok: false, message: '这一边超过 10 万字符，请缩短后再比较。' };
  }
  const text = input.trim();
  if (!text) return { ok: false, message: '请先粘贴 URL。' };
  try {
    return { ok: true, parsed: splitRequest(text) };
  } catch {
    return { ok: false, message: '无法解析这个地址。' };
  }
}

function groupParams(params: Param[]): { keys: string[]; values: Map<string, string[]> } {
  const keys: string[] = [];
  const values = new Map<string, string[]>();
  for (const param of params) {
    const list = values.get(param.key);
    if (list) list.push(param.value);
    else {
      keys.push(param.key);
      values.set(param.key, [param.value]);
    }
  }
  return { keys, values };
}

function cell(key: string, value: string | null): string {
  if (value === null) return '';
  return `${key}=${value}`;
}

export function alignParams(left: Param[], right: Param[]): UrlRow[] {
  const source = groupParams(left);
  const target = groupParams(right);
  const keys = [...source.keys];
  for (const key of target.keys) {
    if (!source.values.has(key)) keys.push(key);
  }
  const rows: UrlRow[] = [];
  for (const key of keys) {
    const leftValues = source.values.get(key) ?? [];
    const rightValues = target.values.get(key) ?? [];
    const count = Math.max(leftValues.length, rightValues.length);
    for (let index = 0; index < count; index += 1) {
      const leftValue = index < leftValues.length ? leftValues[index] : null;
      const rightValue = index < rightValues.length ? rightValues[index] : null;
      rows.push({
        left: cell(key, leftValue),
        right: cell(key, rightValue),
        changed: leftValue !== rightValue,
      });
    }
  }
  return rows;
}

function boundRows(rows: UrlRow[]): { rows: UrlRow[]; truncated: boolean } {
  if (rows.length <= MAX_ROWS) return { rows, truncated: false };
  return {
    rows: [...rows.slice(0, MAX_ROWS), { left: '…其余参数已省略', right: '…其余参数已省略', changed: false }],
    truncated: true,
  };
}

function statusOf(rows: UrlRow[], leftAddress: string | null, rightAddress: string | null): UrlStatus {
  const paramsDiffer = rows.some((row) => row.changed);
  const addressDiffers = Boolean(leftAddress && rightAddress && leftAddress !== rightAddress);
  if (paramsDiffer) return addressDiffers ? 'params-address' : 'params';
  if (addressDiffers) return 'address';
  if (rows.length === 0) return 'empty';
  return 'same';
}

export function compareUrls(left: string, right: string): UrlOutcome {
  const parsedLeft = parseRequest(left);
  if (!parsedLeft.ok) return { ok: false, message: `左边：${parsedLeft.message}` };
  const parsedRight = parseRequest(right);
  if (!parsedRight.ok) return { ok: false, message: `右边：${parsedRight.message}` };
  const rows = alignParams(parsedLeft.parsed.params, parsedRight.parsed.params);
  const bounded = boundRows(rows);
  return {
    ok: true,
    status: statusOf(rows, parsedLeft.parsed.address, parsedRight.parsed.address),
    rows: bounded.rows,
    truncated: bounded.truncated,
    leftAddress: parsedLeft.parsed.address,
    rightAddress: parsedRight.parsed.address,
  };
}

export function compareUrlStatusText(status: UrlStatus): string {
  if (status === 'empty') return '两边都没有请求参数。';
  if (status === 'same') return '请求参数完全相同。';
  if (status === 'address') return '参数相同，地址不同。';
  if (status === 'params-address') return '参数不同，地址也不同。';
  return '参数不同。';
}
