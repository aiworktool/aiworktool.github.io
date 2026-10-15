import { describe, expect, it } from 'vitest';
import { makePassword, makeUuids } from './makeId';

describe('makeUuids', () => {
  it('returns the requested count of uuid strings', () => {
    const result = makeUuids(3);
    expect(result.ok && result.values).toHaveLength(3);
    if (!result.ok) return;
    expect(result.values[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects a count outside 1 to 20', () => {
    expect(makeUuids(0).ok).toBe(false);
    expect(makeUuids(21).ok).toBe(false);
  });
});

describe('makePassword', () => {
  const sets = { upper: true, lower: true, digit: true, symbol: false };

  it('uses only the selected sets and the requested length', () => {
    const result = makePassword(12, sets);
    expect(result.ok && result.value).toHaveLength(12);
    if (!result.ok) return;
    expect(result.value).toMatch(/^[A-Za-z2-9]+$/);
    expect(result.value).toMatch(/[A-Z]/);
    expect(result.value).toMatch(/[a-z]/);
    expect(result.value).toMatch(/[2-9]/);
  });

  it('rejects a short length and an empty character set', () => {
    expect(makePassword(7, sets).ok).toBe(false);
    expect(makePassword(8, { upper: false, lower: false, digit: false, symbol: false }).ok).toBe(false);
  });
});
