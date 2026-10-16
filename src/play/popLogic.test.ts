import { describe, expect, it } from 'vitest';
import { localPoint } from './boardPointer';
import { bubbleRadius, hitBubble, leftCount, makeSheet, popAt, POP_COLS, POP_ROWS } from './popLogic';

describe('bubble sheet', () => {
  it('pops the bubble under the pointer and leaves the sheet unchanged', () => {
    const sheet = makeSheet(2);
    expect(sheet).toHaveLength(POP_COLS * POP_ROWS);
    expect(leftCount(sheet)).toBe(sheet.length);
    const width = 640;
    const height = 480;
    const first = sheet[0];
    const hit = hitBubble(sheet, first.x * width, first.y * height, width, height);
    expect(hit).toBe(first.id);
    const popped = popAt(sheet, first.id);
    expect(leftCount(popped)).toBe(sheet.length - 1);
    expect(sheet[0].popped).toBe(false);
    expect(hitBubble(popped, first.x * width, first.y * height, width, height)).toBeNull();
    expect(hitBubble(sheet, 1, 1, width, height)).toBeNull();
    expect(bubbleRadius(width, height)).toBeGreaterThan(10);
  });

  it('maps a pointer into the board box', () => {
    const point = localPoint(
      { getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 80 }) },
      40,
      50,
    );
    expect(point).toEqual({ x: 30, y: 30, width: 100, height: 80 });
  });
});
