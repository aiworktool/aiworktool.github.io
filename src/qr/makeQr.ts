import QRCode from 'qrcode';
import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';

export const QR_MAX_CHARS = 2_000;

export type QrResult = { ok: true; url: string } | { ok: false; message: string };

export async function makeQr(input: string, lang: Lang = 'zh'): Promise<QrResult> {
  const copy = text(lang).qr;
  const value = input.trim();
  if (!value) return { ok: false, message: copy.empty };
  if (value.length > QR_MAX_CHARS) return { ok: false, message: copy.tooLong };
  try {
    const url = await QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    });
    return { ok: true, url };
  } catch {
    return { ok: false, message: copy.tooBig };
  }
}
