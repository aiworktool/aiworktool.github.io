export const URL_MAX_CHARS = 100_000;
const MAX_ROWS = 200;

export type Param = { key: string; value: string };
export type UrlLocation = {
  protocol: string | null;
  host: string | null;
  port: string | null;
  segments: string[];
};
export type ParsedQuery = { location: UrlLocation; params: Param[] };
export type UrlRow = { left: string; right: string; changed: boolean };
export type UrlStatus =
  | 'empty'
  | 'same'
  | 'params-same'
  | 'same-no-params'
  | 'address'
  | 'address-no-params'
  | 'params'
  | 'params-domain-same'
  | 'both';

export type UrlOutcome =
  | { ok: false; message: string }
  | {
    ok: true;
    status: UrlStatus;
    domainRows: UrlRow[];
    paramRows: UrlRow[];
    truncated: boolean;
  };

const EMPTY_LOCATION: UrlLocation = { protocol: null, host: null, port: null, segments: [] };

function readParams(search: URLSearchParams): Param[] {
  const params: Param[] = [];
  search.forEach((value, key) => params.push({ key, value }));
  return params;
}

function defaultPort(protocol: string | null): string | null {
  if (protocol === 'http') return '80';
  if (protocol === 'https') return '443';
  return null;
}

function pathSegments(pathname: string): string[] {
  if (!pathname || pathname === '/') return ['/'];
  const parts = pathname.split('/').filter((part) => part.length > 0);
  return parts.length > 0 ? parts : ['/'];
}

function locationFromUrl(url: URL, withOrigin: boolean): UrlLocation {
  if (!withOrigin) {
    return { protocol: null, host: null, port: null, segments: pathSegments(url.pathname) };
  }
  const protocol = url.protocol.replace(/:$/, '');
  return {
    protocol,
    host: url.hostname,
    port: url.port || defaultPort(protocol),
    segments: pathSegments(url.pathname),
  };
}

function splitRequest(text: string): ParsedQuery {
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('//');
  if (absolute) {
    const url = new URL(text.startsWith('//') ? `https:${text}` : text);
    return { location: locationFromUrl(url, true), params: readParams(url.searchParams) };
  }
  if (text.startsWith('/')) {
    const url = new URL(text, 'http://local.invalid');
    return { location: locationFromUrl(url, false), params: readParams(url.searchParams) };
  }
  const bare = text.startsWith('?') ? text.slice(1) : text;
  const hash = bare.indexOf('#');
  const query = hash >= 0 ? bare.slice(0, hash) : bare;
  return { location: EMPTY_LOCATION, params: readParams(new URLSearchParams(query)) };
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

function cell(label: string, value: string | null): string {
  if (value === null) return '';
  return `${label}=${value}`;
}

function pair(label: string, left: string | null, right: string | null): UrlRow | null {
  if (left === null && right === null) return null;
  return { left: cell(label, left), right: cell(label, right), changed: left !== right };
}

export function alignLocation(left: UrlLocation, right: UrlLocation): UrlRow[] {
  const rows: UrlRow[] = [];
  const fields: [string, string | null, string | null][] = [
    ['协议', left.protocol, right.protocol],
    ['主机', left.host, right.host],
    ['端口', left.port, right.port],
  ];
  for (const [label, source, target] of fields) {
    const row = pair(label, source, target);
    if (row) rows.push(row);
  }
  const count = Math.max(left.segments.length, right.segments.length);
  for (let index = 0; index < count; index += 1) {
    const label = `路径${index + 1}`;
    const row = pair(label, left.segments[index] ?? null, right.segments[index] ?? null);
    if (row) rows.push(row);
  }
  return rows;
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

function statusOf(domainRows: UrlRow[], paramRows: UrlRow[]): UrlStatus {
  const domainDiffers = domainRows.some((row) => row.changed);
  const paramsDiffer = paramRows.some((row) => row.changed);
  const hasDomain = domainRows.length > 0;
  const hasParams = paramRows.length > 0;
  if (!hasDomain && !hasParams) return 'empty';
  if (domainDiffers && paramsDiffer) return 'both';
  if (domainDiffers) return hasParams ? 'address' : 'address-no-params';
  if (paramsDiffer) return hasDomain ? 'params-domain-same' : 'params';
  if (!hasParams) return 'same-no-params';
  if (!hasDomain) return 'params-same';
  return 'same';
}

export function compareUrls(left: string, right: string): UrlOutcome {
  const parsedLeft = parseRequest(left);
  if (!parsedLeft.ok) return { ok: false, message: `左边：${parsedLeft.message}` };
  const parsedRight = parseRequest(right);
  if (!parsedRight.ok) return { ok: false, message: `右边：${parsedRight.message}` };
  const domainRows = alignLocation(parsedLeft.parsed.location, parsedRight.parsed.location);
  const paramRows = alignParams(parsedLeft.parsed.params, parsedRight.parsed.params);
  const bounded = boundRows(paramRows);
  return {
    ok: true,
    status: statusOf(domainRows, paramRows),
    domainRows,
    paramRows: bounded.rows,
    truncated: bounded.truncated,
  };
}

export function compareUrlStatusText(status: UrlStatus): string {
  if (status === 'same') return '域名、路径和参数完全相同。';
  if (status === 'params-same') return '请求参数完全相同。';
  if (status === 'same-no-params') return '域名和路径相同，两边都没有请求参数。';
  if (status === 'address') return '域名或路径不同，参数相同。';
  if (status === 'address-no-params') return '域名或路径不同，两边都没有请求参数。';
  if (status === 'params-domain-same') return '参数不同，域名和路径相同。';
  if (status === 'params') return '参数不同。';
  if (status === 'both') return '域名或路径不同，参数也不同。';
  return '两边都没有可比较的内容。';
}
