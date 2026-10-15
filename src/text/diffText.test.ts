import { describe, expect, it } from 'vitest';
import { comparePlainText } from './diffText';

describe('comparePlainText', () => {
  it('marks the changed character and keeps equal lines', () => {
    const result = comparePlainText('alpha\nbeta', 'alpha\nbetb');
    expect(result.ok && result.same).toBe(false);
    if (!result.ok) return;
    expect(result.rows[0]).toEqual({ left: 'alpha', right: 'alpha', changed: false });
    expect(result.rows[1]).toEqual({ left: 'beta', right: 'betb', changed: true });
  });

  it('reports identical text without rows', () => {
    const result = comparePlainText('same', 'same');
    expect(result).toEqual({ ok: true, same: true, rows: [], truncated: false });
  });

  it('keeps later lines aligned when one line is inserted', () => {
    const result = comparePlainText('a\nb\nc\nd', 'a\nb\nX\nc\nd');
    expect(result.ok && result.rows.map((row) => [row.left, row.right, row.changed])).toEqual([
      ['b', 'b', false],
      ['', 'X', true],
      ['c', 'c', false],
    ]);
  });

  it('shows a change that sits after the first 200 lines', () => {
    const head = Array.from({ length: 250 }, (_, index) => `line ${index}`).join('\n');
    const result = comparePlainText(`${head}\nOLD`, `${head}\nNEW`);
    expect(result.ok && result.same).toBe(false);
    if (!result.ok) return;
    expect(result.rows.some((row) => row.left === 'OLD' && row.right === 'NEW')).toBe(true);
    expect(result.rows.length).toBeLessThan(20);
  });

  it('rejects an empty pair and an oversized side', () => {
    expect(comparePlainText('  ', '\n').ok).toBe(false);
    expect(comparePlainText('a'.repeat(200_001), 'a').ok).toBe(false);
  });
});
