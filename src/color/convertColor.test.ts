import { describe, expect, it } from 'vitest';
import { colorFromHex, colorFromHsl, colorFromRgb } from './convertColor';

describe('convertColor', () => {
  it('turns red hex into rgb and hsl', () => {
    const color = colorFromHex('#f00');
    expect(color).toMatchObject({ hex: '#ff0000', r: 255, g: 0, b: 0, h: 0, s: 100, l: 50 });
  });

  it('reads rgb and hsl back to the same hex', () => {
    expect(colorFromRgb('255, 0, 0')).toMatchObject({ hex: '#ff0000' });
    expect(colorFromHsl('0, 100%, 50%')).toMatchObject({ hex: '#ff0000', r: 255 });
  });

  it('rejects a color it cannot read', () => {
    expect(colorFromHex('zz')).toEqual({ message: '这个颜色无法识别。' });
  });
});
