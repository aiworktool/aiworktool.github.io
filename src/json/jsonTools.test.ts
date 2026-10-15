import { describe, expect, it } from 'vitest';
import { alignJsonLines, compareJsonText } from './diffJson';
import { compressJsonText, formatJsonText, JSON_MAX_CHARS } from './formatJson';

describe('json format and compare', () => {
  it('pretty-prints an object with two-space indent', () => {
    const result = formatJsonText('{"b":1,"a":[2]}');
    expect(result).toEqual({ ok: true, text: '{\n  "b": 1,\n  "a": [\n    2\n  ]\n}' });
  });

  it('rejects empty text, invalid json, and oversized text', () => {
    expect(formatJsonText('  ')).toEqual({ ok: false, message: '请先粘贴 JSON。' });
    const invalid = formatJsonText('{');
    expect(invalid.ok).toBe(false);
    const huge = formatJsonText('1'.repeat(JSON_MAX_CHARS + 1));
    expect(huge).toEqual({ ok: false, message: '这段文字超过 1 MB，请缩短后再处理。' });
  });

  it('compresses json onto one line and keeps key order', () => {
    const result = compressJsonText('{\n  "b": 1,\n  "a": [2]\n}');
    expect(result).toEqual({ ok: true, text: '{"b":1,"a":[2]}' });
    expect(compressJsonText('  ')).toEqual({ ok: false, message: '请先粘贴 JSON。' });
  });

  it('treats reordered keys as the same data', () => {
    const result = compareJsonText('{"b":1,"a":2}', '{"a":2,"b":1}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe('format-only');
    expect(result.left).toContain('"b"');
  });

  it('marks different values and keeps the shared edges', () => {
    const result = compareJsonText('{"n":1}', '{"n":2}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe('different');
    expect(alignJsonLines('{\n  "a": 1\n}', '{\n  "a": 2\n}')).toEqual([
      { left: '{', right: '{', changed: false },
      { left: '  "a": 1', right: '  "a": 2', changed: true },
      { left: '}', right: '}', changed: false },
    ]);
  });
});
