import { describe, expect, it } from 'vitest';
import { layoutPage, type PdfTextItem } from './lineLayout';

const item = (partial: Partial<PdfTextItem> & { str: string }): PdfTextItem => ({
  x: 0,
  y: 0,
  width: 10,
  height: 11,
  bold: false,
  ...partial,
});

describe('layoutPage', () => {
  it('把同一行的片段按 x 合并成一行', () => {
    const lines = layoutPage([
      item({ str: '你', x: 0, y: 50 }),
      item({ str: '好', x: 12, y: 50 }),
      item({ str: '世', x: 24, y: 50 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('你好世');
  });

  it('同一行片段之间空隙较大时补空格', () => {
    const lines = layoutPage([
      item({ str: 'left', x: 0, width: 20, y: 50 }),
      item({ str: 'right', x: 28, width: 20, y: 50 }),
    ]);
    expect(lines[0].text).toBe('left right');
  });

  it('不同 y 按从上到下拆成多行', () => {
    const lines = layoutPage([
      item({ str: '一行', y: 90 }),
      item({ str: '二行', y: 70 }),
      item({ str: '三行', y: 50 }),
    ]);
    expect(lines.map((l) => l.text)).toEqual(['一行', '二行', '三行']);
  });

  it('行内按从左到右排列，不受 y 抖动影响', () => {
    const lines = layoutPage([
      item({ str: '右', x: 12, y: 50 }),
      item({ str: '左', x: 0, y: 50.4 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('左右');
  });

  it('空隙大到像另一栏时另起一行', () => {
    const lines = layoutPage([
      item({ str: '左栏', x: 0, width: 20, y: 80 }),
      item({ str: '右栏', x: 80, width: 20, y: 80 }),
    ]);
    expect(lines.map((l) => l.text)).toEqual(['左栏', '右栏']);
  });

  it('y 的微小抖动仍算同一行', () => {
    const lines = layoutPage([
      item({ str: '甲', x: 0, y: 50, height: 12 }),
      item({ str: '乙', x: 12, y: 50.4, height: 13 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('甲乙');
  });

  it('行内任一片段加粗则该行加粗', () => {
    const lines = layoutPage([
      item({ str: '普通', y: 50, bold: false }),
      item({ str: '加粗', y: 50, bold: true }),
    ]);
    expect(lines[0].bold).toBe(true);
  });

  it('字号取行内最大值', () => {
    const lines = layoutPage([
      item({ str: '小', y: 50, height: 10 }),
      item({ str: '大', y: 50, height: 18 }),
    ]);
    expect(lines[0].size).toBe(18);
  });

  it('忽略纯空白的片段', () => {
    const lines = layoutPage([item({ str: '   ' }), item({ str: '有字', y: 50 })]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('有字');
  });
});
