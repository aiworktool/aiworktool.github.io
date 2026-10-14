import { describe, expect, it } from 'vitest';
import { planByteRanges, totalFromContentRange } from './modelRange';

function covers(size: number): void {
  const ranges = planByteRanges(size);
  expect(ranges).not.toBeNull();
  if (!ranges) return;
  expect(ranges[0].start).toBe(0);
  expect(ranges[ranges.length - 1].end).toBe(size - 1);
  for (let index = 1; index < ranges.length; index += 1) {
    expect(ranges[index].start).toBe(ranges[index - 1].end + 1);
  }
}

describe('model byte ranges', () => {
  it('keeps small files in one request', () => {
    expect(planByteRanges(8 * 1024 * 1024 - 1)).toBeNull();
  });

  it('splits large files into contiguous parts', () => {
    covers(8 * 1024 * 1024);
    expect(planByteRanges(8 * 1024 * 1024)).toHaveLength(2);
    covers(23 * 1024 * 1024);
    expect(planByteRanges(23 * 1024 * 1024)).toHaveLength(5);
    covers(54 * 1024 * 1024);
    expect(planByteRanges(54 * 1024 * 1024)).toHaveLength(8);
  });

  it('reads the total size from a content-range header', () => {
    expect(totalFromContentRange('bytes 0-0/25888640')).toBe(25888640);
    expect(totalFromContentRange('bytes */25888640')).toBeNull();
    expect(totalFromContentRange(null)).toBeNull();
  });
});
