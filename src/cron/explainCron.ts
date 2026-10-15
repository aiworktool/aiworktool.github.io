import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import { formatLocal } from '../time/timeTools';

const YEAR_MINUTES = 366 * 24 * 60;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

type Field = { raw: string; values: number[]; any: boolean };

export type CronExplain =
  | { ok: false; message: string }
  | { ok: true; fields: { label: string; text: string }[]; next: string[] };

export function explainCron(input: string, lang: Lang = 'zh', from = new Date()): CronExplain {
  const copy = text(lang).cron;
  const parts = input.trim().split(/\s+/);
  if (parts.length !== 5) return { ok: false, message: copy.bad };
  const minute = parseField(parts[0], 0, 59);
  const hour = parseField(parts[1], 0, 23);
  const day = parseField(parts[2], 1, 31);
  const month = parseField(parts[3], 1, 12, MONTHS);
  const week = parseWeek(parts[4]);
  if (!minute || !hour || !day || !month || !week) return { ok: false, message: copy.bad };
  const labels = [copy.minute, copy.hour, copy.day, copy.month, copy.week];
  const fields = [minute, hour, day, month, week].map((field, index) => ({
    label: labels[index],
    text: describe(field, lang),
  }));
  const next = nextRuns({ minute, hour, day, month, week }, from).map((date) => formatLocal(date.getTime()));
  return { ok: true, fields, next };
}

function describe(field: Field, lang: Lang): string {
  const copy = text(lang).cron;
  if (field.values.length <= 12) return fill(copy.fieldValue, { raw: field.raw, list: field.values.join(',') });
  return fill(copy.fieldMany, { raw: field.raw, count: field.values.length });
}

function nextRuns(
  fields: { minute: Field; hour: Field; day: Field; month: Field; week: Field },
  from: Date,
): Date[] {
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const found: Date[] = [];
  for (let step = 0; step < YEAR_MINUTES && found.length < 5; step += 1) {
    if (matches(cursor, fields)) found.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return found;
}

function matches(
  date: Date,
  fields: { minute: Field; hour: Field; day: Field; month: Field; week: Field },
): boolean {
  if (!fields.minute.values.includes(date.getMinutes())) return false;
  if (!fields.hour.values.includes(date.getHours())) return false;
  if (!fields.month.values.includes(date.getMonth() + 1)) return false;
  const dayOk = fields.day.values.includes(date.getDate());
  const weekOk = fields.week.values.includes(date.getDay());
  if (fields.day.any && fields.week.any) return true;
  if (fields.day.any) return weekOk;
  if (fields.week.any) return dayOk;
  return dayOk || weekOk;
}

function parseWeek(raw: string): Field | null {
  if (raw === '*') return { raw, values: [0, 1, 2, 3, 4, 5, 6], any: true };
  const values = expand(withNames(raw, DAYS, 0), 0, 7);
  if (!values) return null;
  const days = [...new Set(values.map((value) => (value === 7 ? 0 : value)))].sort((a, b) => a - b);
  return { raw, values: days, any: false };
}

function parseField(raw: string, min: number, max: number, names?: string[]): Field | null {
  const values = expand(names ? withNames(raw, names, 1) : raw, min, max);
  if (!values) return null;
  return { raw, values, any: raw === '*' };
}

function withNames(raw: string, names: string[], offset: number): string {
  return raw.replace(/[A-Za-z]{3,}/g, (word) => {
    const index = names.indexOf(word.toLowerCase().slice(0, 3));
    return index < 0 ? word : String(index + offset);
  });
}

function expand(raw: string, min: number, max: number): number[] | null {
  const values = new Set<number>();
  for (const piece of raw.split(',')) {
    const got = expandPiece(piece, min, max);
    if (!got) return null;
    for (const value of got) values.add(value);
  }
  return values.size ? [...values].sort((a, b) => a - b) : null;
}

function expandPiece(piece: string, min: number, max: number): number[] | null {
  const match = /^(\*|\d+)(?:-(\d+))?(?:\/(\d+))?$/.exec(piece);
  if (!match || (match[1] === '*' && match[2])) return null;
  const step = match[3] ? Number(match[3]) : 1;
  if (step < 1) return null;
  const start = match[1] === '*' ? min : Number(match[1]);
  const end = match[2] ? Number(match[2]) : (match[3] || match[1] === '*' ? max : start);
  if (start < min || end > max || start > end) return null;
  const out: number[] = [];
  for (let value = start; value <= end; value += step) out.push(value);
  return out;
}
