import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';

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

export function parseRequest(
  input: string,
  lang: Lang = 'zh',
): { ok: true; parsed: ParsedQuery } | { ok: false; message: string } {
  const copy = text(lang).url;
  if (input.length > URL_MAX_CHARS) return { ok: false, message: copy.tooBig };
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: copy.empty };
  try {
    return { ok: true, parsed: splitRequest(trimmed) };
  } catch {
    return { ok: false, message: copy.bad };
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

export function alignLocation(left: UrlLocation, right: UrlLocation, lang: Lang = 'zh'): UrlRow[] {
  const copy = text(lang).url;
  const rows: UrlRow[] = [];
  const fields: [string, string | null, string | null][] = [
    [copy.protocol, left.protocol, right.protocol],
    [copy.host, left.host, right.host],
    [copy.port, left.port, right.port],
  ];
  for (const [label, source, target] of fields) {
    const row = pair(label, source, target);
    if (row) rows.push(row);
  }
  const count = Math.max(left.segments.length, right.segments.length);
  for (let index = 0; index < count; index += 1) {
    const label = fill(copy.path, { n: index + 1 });
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

function boundRows(rows: UrlRow[], lang: Lang): { rows: UrlRow[]; truncated: boolean } {
  if (rows.length <= MAX_ROWS) return { rows, truncated: false };
  const omitted = text(lang).url.omitted;
  return {
    rows: [...rows.slice(0, MAX_ROWS), { left: omitted, right: omitted, changed: false }],
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

export function compareUrls(left: string, right: string, lang: Lang = 'zh'): UrlOutcome {
  const copy = text(lang).url;
  const parsedLeft = parseRequest(left, lang);
  if (!parsedLeft.ok) return { ok: false, message: fill(copy.leftSide, { message: parsedLeft.message }) };
  const parsedRight = parseRequest(right, lang);
  if (!parsedRight.ok) return { ok: false, message: fill(copy.rightSide, { message: parsedRight.message }) };
  const domainRows = alignLocation(parsedLeft.parsed.location, parsedRight.parsed.location, lang);
  const paramRows = alignParams(parsedLeft.parsed.params, parsedRight.parsed.params);
  const bounded = boundRows(paramRows, lang);
  return {
    ok: true,
    status: statusOf(domainRows, paramRows),
    domainRows,
    paramRows: bounded.rows,
    truncated: bounded.truncated,
  };
}

export function compareUrlStatusText(status: UrlStatus, lang: Lang = 'zh'): string {
  const copy = text(lang).url;
  if (status === 'same') return copy.same;
  if (status === 'params-same') return copy.paramsSame;
  if (status === 'same-no-params') return copy.sameNoParams;
  if (status === 'address') return copy.address;
  if (status === 'address-no-params') return copy.addressNoParams;
  if (status === 'params-domain-same') return copy.paramsDomainSame;
  if (status === 'params') return copy.paramsDiffer;
  if (status === 'both') return copy.both;
  return copy.none;
}
