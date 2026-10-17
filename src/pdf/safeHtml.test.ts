import { describe, expect, it } from 'vitest';
import { safeDocHtml } from './safeHtml';

describe('safeDocHtml', () => {
  it('保留段落和加粗', () => {
    expect(safeDocHtml('<p>你好<strong>世界</strong></p>')).toBe('<p>你好<strong>世界</strong></p>');
  });

  it('去掉脚本和事件', () => {
    const html = '<p onclick="alert(1)">文字</p><script>alert(1)</script>';
    expect(safeDocHtml(html)).toBe('<p>文字</p>');
  });

  it('只保留 http 和 mailto 链接', () => {
    const html = '<a href="javascript:alert(1)">坏</a><a href="https://example.com">好</a>';
    expect(safeDocHtml(html)).toBe('<a>坏</a><a href="https://example.com">好</a>');
  });

  it('只保留图片数据', () => {
    const html = '<img src="data:image/png;base64,aaa" onerror="alert(1)"><img src="javascript:alert(1)">';
    expect(safeDocHtml(html)).toBe('<img src="data:image/png;base64,aaa" alt="">');
  });
});
