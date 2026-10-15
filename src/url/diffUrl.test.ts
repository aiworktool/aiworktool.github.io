import { describe, expect, it } from 'vitest';
import { alignParams, compareUrls, URL_MAX_CHARS } from './diffUrl';

describe('url param compare', () => {
  it('matches the same params even when the order differs', () => {
    const result = compareUrls('https://a.com/x?b=2&a=1', 'https://a.com/x?a=1&b=2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe('same');
    expect(result.rows.every((row) => !row.changed)).toBe(true);
  });

  it('marks changed, missing, and repeated params', () => {
    expect(alignParams(
      [{ key: 'a', value: '1' }, { key: 'a', value: '2' }, { key: 'b', value: 'x' }],
      [{ key: 'a', value: '1' }, { key: 'c', value: '3' }],
    )).toEqual([
      { left: 'a=1', right: 'a=1', changed: false },
      { left: 'a=2', right: '', changed: true },
      { left: 'b=x', right: '', changed: true },
      { left: '', right: 'c=3', changed: true },
    ]);
  });

  it('decodes query text and treats a bare query as params', () => {
    const result = compareUrls('q=%E4%BD%A0&n=a+b', '?q=你&n=a b');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe('same');
  });

  it('reports a different path when the params match', () => {
    const result = compareUrls('/api/v1?id=1', '/api/v2?id=1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe('address');
    expect(result.leftAddress).toBe('/api/v1');
    expect(result.rightAddress).toBe('/api/v2');
  });

  it('rejects an empty side and an oversized side', () => {
    expect(compareUrls('', 'a=1')).toEqual({ ok: false, message: '左边：请先粘贴 URL。' });
    const huge = compareUrls('a=1', 'b='.padEnd(URL_MAX_CHARS + 1, 'x'));
    expect(huge.ok).toBe(false);
  });
});
