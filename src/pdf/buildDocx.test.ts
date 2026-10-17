import { describe, expect, it } from 'vitest';
import { Packer } from 'docx';
import { buildDocument } from './buildDocx';

describe('buildDocument', () => {
  it('生成可下载的 docx', async () => {
    const doc = buildDocument([{
      lines: [{ text: '你好', bold: false, size: 12 }],
    }]);
    const buf = await Packer.toBuffer(doc);
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    expect(buf.byteLength).toBeGreaterThan(100);
  });
});
