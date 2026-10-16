import { describe, expect, it } from 'vitest';
import { dropDot, hitDotPx, isAlive, makeDot, stepDots } from './tapLogic';

describe('tap dots', () => {
  it('hits a living dot and ignores an empty spot', () => {
    const dot = makeDot(3, 1000, () => 0);
    expect(dot.x).toBeCloseTo(0.1);
    expect(isAlive(dot, 1000)).toBe(true);
    expect(isAlive(dot, 1000 + dot.life)).toBe(false);
    const width = 400;
    const height = 400;
    expect(hitDotPx([dot], dot.x * width, dot.y * height, 1000, width, height)).toBe(3);
    expect(hitDotPx([dot], 2, 2, 1000, width, height)).toBeNull();
    expect(hitDotPx([dot], dot.x * width, dot.y * height, 1000 + dot.life, width, height)).toBeNull();
    expect(dropDot([dot], 3)).toEqual([]);
  });

  it('prefers the later dot and counts expirations once', () => {
    const under = makeDot(1, 0, () => 0.5);
    const over = { ...makeDot(2, 0, () => 0.5), r: 0.2 };
    expect(hitDotPx([under, over], over.x * 300, over.y * 300, 10, 300, 300)).toBe(2);
    let expired = 0;
    const alive = stepDots([under], under.born + under.life, () => { expired += 1; });
    expect(alive).toEqual([]);
    expect(expired).toBe(1);
  });
});
