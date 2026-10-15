import { describe, expect, it } from 'vitest';
import { makeQr, QR_MAX_CHARS } from './makeQr';

describe('qr code', () => {
  it('draws a png for a short link', async () => {
    const result = await makeQr('https://aiworktool.github.io');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('rejects empty text and text over the limit', async () => {
    expect(await makeQr('  ')).toEqual({ ok: false, message: '请先输入要生成二维码的文字。' });
    const huge = await makeQr('a'.repeat(QR_MAX_CHARS + 1));
    expect(huge).toEqual({ ok: false, message: '这段文字超过 2000 个字符，请缩短后再生成。' });
  });
});
