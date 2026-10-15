import { describe, expect, it } from 'vitest';
import {
  convertTimeInput,
  diffDateTimes,
  formatInZone,
  formatLocal,
  parseInstant,
  shiftDateTime,
} from './timeTools';

const UNIX = 1_700_000_000_000;

describe('time tools', () => {
  it('treats 10-digit values as seconds and 13-digit values as milliseconds', () => {
    const seconds = convertTimeInput('1700000000');
    const millis = convertTimeInput('1700000000000');
    expect(seconds.ok && millis.ok).toBe(true);
    if (!seconds.ok || !millis.ok) return;
    expect(seconds.view.ms).toBe(UNIX);
    expect(millis.view.ms).toBe(UNIX);
    expect(seconds.view.unixSeconds).toBe(1700000000);
    expect(seconds.view.unixMillis).toBe(UNIX);
    expect(seconds.view.iso).toBe('2023-11-14T22:13:20.000Z');
    expect(seconds.view.utc).toBe('2023-11-14 22:13:20');
    expect(seconds.view.zones).toEqual([
      { label: '北京', text: '2023-11-15 06:13:20' },
      { label: 'UTC', text: '2023-11-14 22:13:20' },
      { label: '东京', text: '2023-11-15 07:13:20' },
      { label: '纽约', text: '2023-11-14 17:13:20' },
    ]);
    expect(seconds.view.local).toBe(formatLocal(UNIX));
  });

  it('parses ISO instants and local YYYY-MM-DD HH:mm:ss', () => {
    expect(parseInstant('2023-11-14T22:13:20.000Z')).toEqual({ ok: true, ms: UNIX });
    expect(parseInstant('2023-11-15T06:13:20+08:00')).toEqual({ ok: true, ms: UNIX });
    expect(parseInstant('2023-11-14 22:13:20Z')).toEqual({ ok: true, ms: UNIX });
    expect(parseInstant('2023-11-14')).toEqual({ ok: true, ms: Date.parse('2023-11-14T00:00:00.000Z') });
    const local = parseInstant('2023-11-15 06:13:20');
    expect(local).toEqual({ ok: true, ms: new Date(2023, 10, 15, 6, 13, 20).getTime() });
    expect(parseInstant('2023-11-15T06:13:20')).toEqual(local);
    expect(parseInstant('  1700000000.5  ')).toEqual({ ok: true, ms: UNIX + 500 });
  });

  it('uses Intl zones, including New York daylight time', () => {
    const summer = Date.parse('2023-07-01T16:00:00.000Z');
    expect(formatInZone(summer, 'America/New_York')).toBe('2023-07-01 12:00:00');
    expect(formatInZone(summer, 'Asia/Shanghai')).toBe('2023-07-02 00:00:00');
  });

  it('rejects long, empty, invalid, and out-of-range input without throwing', () => {
    expect(() => parseInstant('x'.repeat(201))).not.toThrow();
    expect(parseInstant('x'.repeat(201))).toEqual({ ok: false, message: '输入超过 200 个字符。' });
    expect(parseInstant('   ')).toEqual({ ok: false, message: '请填写时间。' });
    expect(parseInstant('abc')).toEqual({ ok: false, message: '无法识别这个时间。' });
    expect(parseInstant('2023-02-31 00:00:00')).toEqual({ ok: false, message: '无法识别这个时间。' });
    expect(parseInstant('9999999999').ok).toBe(false);
    expect(parseInstant('1969-01-01T00:00:00.000Z')).toEqual({
      ok: false,
      message: '这个时间超出了 1970 到 2100 年。',
    });
    expect(parseInstant('10000000000')).toEqual({ ok: true, ms: 10_000_000_000 });
    expect(parseInstant('1000000000')).toEqual({ ok: true, ms: 1_000_000_000_000 });
  });

  it('diffs two datetimes into days, hours, minutes, and seconds', () => {
    expect(diffDateTimes('2023-01-01 00:00:00', '2023-01-03 01:02:03')).toEqual({
      ok: true,
      diff: { days: 2, hours: 1, minutes: 2, seconds: 3, totalSeconds: 176523, ahead: true },
      text: '相差 2 天 1 小时 2 分 3 秒',
    });
    const backward = diffDateTimes('2023-01-03 01:02:03', '2023-01-01 00:00:00');
    expect(backward.ok).toBe(true);
    if (!backward.ok) return;
    expect(backward.diff.ahead).toBe(false);
    expect(backward.diff.days).toBe(2);
    expect(backward.text.startsWith('结束早于开始')).toBe(true);
    expect(diffDateTimes('', '2023-01-01 00:00:00')).toEqual({ ok: false, message: '请填写开始时间。' });
  });

  it('adds and subtracts a duration of whole days, hours, and minutes', () => {
    const start = parseInstant('2023-01-01 00:00:00');
    const added = shiftDateTime('2023-01-01 00:00:00', 2, 0, 0, 'add');
    const subtracted = shiftDateTime('2023-01-01 00:00:00', 0, 0, 90, 'sub');
    expect(start.ok && added.ok && subtracted.ok).toBe(true);
    if (!start.ok || !added.ok || !subtracted.ok) return;
    expect(added.view.ms).toBe(start.ms + 2 * 86400000);
    expect(added.view.local).toBe(formatLocal(start.ms + 2 * 86400000));
    expect(subtracted.view.ms).toBe(start.ms - 90 * 60 * 1000);
    expect(shiftDateTime('2023-01-01 00:00:00', 1.5, 0, 0, 'add')).toEqual({
      ok: false,
      message: '天数、小时和分钟请填 0 到 100000 的整数。',
    });
    expect(shiftDateTime('2090-01-01 00:00:00', 100000, 0, 0, 'add').ok).toBe(false);
    expect(shiftDateTime('not-a-time', 1, 0, 0, 'add')).toEqual({
      ok: false,
      message: '无法识别这个时间。',
    });
  });
});
