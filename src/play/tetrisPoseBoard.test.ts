import { describe, expect, it } from 'vitest';
import { cellsOf } from './tetrisLogic';
import { senseSpans } from './tetrisPoseBoard';

describe('senseSpans', () => {
  it('keeps a square on one bottom edge', () => {
    const spans = senseSpans(cellsOf({ id: 2, rotation: 0, x: 4, y: 3 }));
    expect(spans).toEqual([{ x: 4, y: 4, w: 2 }]);
  });

  it('steps under a staggered piece instead of cutting the lower cells', () => {
    const spans = senseSpans(cellsOf({ id: 5, rotation: 0, x: 3, y: 6 }));
    expect(spans).toEqual([
      { x: 3, y: 6, w: 1 },
      { x: 4, y: 7, w: 2 },
    ]);
  });

  it('ignores cells above the bucket', () => {
    expect(senseSpans([[1, -1], [1, 0]])).toEqual([{ x: 1, y: 0, w: 1 }]);
  });
});
