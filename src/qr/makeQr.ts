import QRCode from 'qrcode';

export const QR_MAX_CHARS = 2_000;

export type QrResult = { ok: true; url: string } | { ok: false; message: string };

export async function makeQr(input: string): Promise<QrResult> {
  const text = input.trim();
  if (!text) return { ok: false, message: '请先输入要生成二维码的文字。' };
  if (text.length > QR_MAX_CHARS) {
    return { ok: false, message: '这段文字超过 2000 个字符，请缩短后再生成。' };
  }
  try {
    const url = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    });
    return { ok: true, url };
  } catch {
    return { ok: false, message: '这段内容装不进一张二维码，请缩短后再生成。' };
  }
}
