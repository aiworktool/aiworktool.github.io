export const INPUT_MAX_CHARS = 200;
export const DURATION_MAX = 100_000;

const HOUR_MS = 60 * 60 * 1000;
const MIN_INSTANT_MS = Date.UTC(1970, 0, 1) - 14 * HOUR_MS;
const MAX_INSTANT_MS = Date.UTC(2100, 11, 31, 23, 59, 59, 999) + 14 * HOUR_MS;

export const ZONES = [
  { timeZone: 'Asia/Shanghai', label: '北京' },
  { timeZone: 'UTC', label: 'UTC' },
  { timeZone: 'Asia/Tokyo', label: '东京' },
  { timeZone: 'America/New_York', label: '纽约' },
] as const;

export type Fail = { ok: false; message: string };
export type Direction = 'add' | 'sub';

export type ZoneTime = { label: string; text: string };

export type InstantView = {
  ms: number;
  unixSeconds: number;
  unixMillis: number;
  local: string;
  utc: string;
  iso: string;
  zones: ZoneTime[];
};

export type InstantResult = { ok: true; view: InstantView } | Fail;

export type DiffParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  ahead: boolean;
};

export type DiffResult = { ok: true; diff: DiffParts; text: string } | Fail;

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;
const NUMBER_RE = /^(\d{1,16})(?:\.(\d{1,3}))?$/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const SPACED_ZONE_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?)(Z|[+-]\d{2}:\d{2})$/;

function fail(message: string): Fail {
  return { ok: false, message };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function pack(year: number, month: number, day: number, hour: number, minute: number, second: number): string {
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function formatLocal(ms: number): string {
  const date = new Date(ms);
  return pack(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
}

export function formatUtc(ms: number): string {
  const date = new Date(ms);
  return pack(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}

function zonePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const value = parts.find((part) => part.type === type)?.value ?? '';
  return value.padStart(2, '0');
}

export function formatInZone(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  let hour = zonePart(parts, 'hour');
  if (hour === '24') hour = '00';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = zonePart(parts, 'month');
  const day = zonePart(parts, 'day');
  return `${year}-${month}-${day} ${hour}:${zonePart(parts, 'minute')}:${zonePart(parts, 'second')}`;
}

function checkRange(ms: number): { ok: true; ms: number } | Fail {
  if (!Number.isFinite(ms)) return fail('无法识别这个时间。');
  const rounded = Math.round(ms);
  if (rounded < MIN_INSTANT_MS || rounded > MAX_INSTANT_MS) {
    return fail('这个时间超出了 1970 到 2100 年。');
  }
  return { ok: true, ms: rounded };
}

function parseTimestamp(text: string): { ok: true; ms: number } | Fail {
  const match = NUMBER_RE.exec(text);
  if (!match) return fail('无法识别这个时间。');
  const digits = match[1];
  const fraction = match[2];
  if (digits.length > 13) return fail('无法识别这个时间。');
  if (digits.length >= 11) {
    if (fraction) return fail('无法识别这个时间。');
    return checkRange(Number(digits));
  }
  const extra = fraction ? Number(fraction.padEnd(3, '0')) : 0;
  return checkRange(Number(digits) * 1000 + extra);
}

function calendarMatches(
  date: Date,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): boolean {
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute
    && date.getSeconds() === second;
}

function parseLocal(text: string): { ok: true; ms: number } | Fail {
  const match = LOCAL_RE.exec(text);
  if (!match) return fail('无法识别这个时间。');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millis = match[7] ? Number(match[7].padEnd(3, '0')) : 0;
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return fail('无法识别这个时间。');
  }
  const date = new Date(year, month - 1, day, hour, minute, second, millis);
  if (!calendarMatches(date, year, month, day, hour, minute, second)) {
    return fail('无法识别这个时间。');
  }
  return checkRange(date.getTime());
}

function parseIso(text: string): { ok: true; ms: number } | Fail {
  if (!ISO_RE.test(text)) return fail('无法识别这个时间。');
  const ms = Date.parse(text);
  if (!Number.isFinite(ms)) return fail('无法识别这个时间。');
  return checkRange(ms);
}

export function parseInstant(input: string): { ok: true; ms: number } | Fail {
  if (input.length > INPUT_MAX_CHARS) return fail('输入超过 200 个字符。');
  const text = input.trim();
  if (!text) return fail('请填写时间。');
  if (NUMBER_RE.test(text)) return parseTimestamp(text);
  const zoned = SPACED_ZONE_RE.exec(text);
  if (zoned) return parseIso(`${zoned[1]}T${zoned[2]}${zoned[3]}`);
  if (LOCAL_RE.test(text)) return parseLocal(text);
  return parseIso(text);
}

export function describeInstant(ms: number): InstantResult {
  const ranged = checkRange(ms);
  if (!ranged.ok) return ranged;
  const instant = ranged.ms;
  return {
    ok: true,
    view: {
      ms: instant,
      unixSeconds: Math.floor(instant / 1000),
      unixMillis: instant,
      local: formatLocal(instant),
      utc: formatUtc(instant),
      iso: new Date(instant).toISOString(),
      zones: ZONES.map((zone) => ({ label: zone.label, text: formatInZone(instant, zone.timeZone) })),
    },
  };
}

export function convertTimeInput(input: string): InstantResult {
  const parsed = parseInstant(input);
  if (!parsed.ok) return parsed;
  return describeInstant(parsed.ms);
}

export function diffInstants(startMs: number, endMs: number): DiffParts {
  const delta = endMs - startMs;
  let rest = Math.abs(Math.trunc(delta / 1000));
  const totalSeconds = rest;
  const days = Math.floor(rest / 86400);
  rest -= days * 86400;
  const hours = Math.floor(rest / 3600);
  rest -= hours * 3600;
  const minutes = Math.floor(rest / 60);
  const seconds = rest - minutes * 60;
  return { days, hours, minutes, seconds, totalSeconds, ahead: delta >= 0 };
}

export function formatDiffText(diff: DiffParts): string {
  const body = `${diff.days} 天 ${diff.hours} 小时 ${diff.minutes} 分 ${diff.seconds} 秒`;
  return diff.ahead ? `相差 ${body}` : `结束早于开始，相差 ${body}`;
}

function labelFail(message: string, label: string): Fail {
  if (message === '请填写时间。') return fail(`请填写${label}。`);
  if (message.includes('这个时间')) return fail(message.replace('这个时间', label));
  if (message.startsWith('输入超过')) return fail(`${label}超过 200 个字符。`);
  return fail(`${label}：${message}`);
}

export function diffDateTimes(start: string, end: string): DiffResult {
  const left = parseInstant(start);
  if (!left.ok) return labelFail(left.message, '开始时间');
  const right = parseInstant(end);
  if (!right.ok) return labelFail(right.message, '结束时间');
  const diff = diffInstants(left.ms, right.ms);
  return { ok: true, diff, text: formatDiffText(diff) };
}

function validAmount(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= DURATION_MAX;
}

export function shiftDateTime(
  input: string,
  days: number,
  hours: number,
  minutes: number,
  direction: Direction,
): InstantResult {
  const parsed = parseInstant(input);
  if (!parsed.ok) return parsed;
  if (!validAmount(days) || !validAmount(hours) || !validAmount(minutes)) {
    return fail('天数、小时和分钟请填 0 到 100000 的整数。');
  }
  const delta = (days * 86400 + hours * 3600 + minutes * 60) * 1000;
  const ms = direction === 'sub' ? parsed.ms - delta : parsed.ms + delta;
  return describeInstant(ms);
}
