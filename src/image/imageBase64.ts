import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function imageFileError(file: File, lang: Lang = 'zh'): string | null {
  const copy = text(lang).image64;
  if (!file.type.startsWith('image/')) return copy.notImage;
  if (file.size > IMAGE_MAX_BYTES) return copy.tooBig;
  return null;
}

export function imageDataUrl(
  input: string,
  lang: Lang = 'zh',
): { ok: true; url: string } | { ok: false; message: string } {
  const copy = text(lang).image64;
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: text(lang).pasteFirst };
  if (trimmed.startsWith('data:image/')) return sizedUrl(trimmed, payloadOf(trimmed), copy.tooBig, copy.bad);
  const compact = trimmed.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    return { ok: false, message: copy.bad };
  }
  return sizedUrl(`data:image/png;base64,${compact}`, compact, copy.tooBig, copy.bad);
}

function sizedUrl(
  url: string,
  payload: string,
  tooBig: string,
  bad: string,
): { ok: true; url: string } | { ok: false; message: string } {
  if (!payload || decodedSize(payload) > IMAGE_MAX_BYTES) {
    return { ok: false, message: payload ? tooBig : bad };
  }
  return { ok: true, url };
}

function payloadOf(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1).replace(/\s/g, '');
}

function decodedSize(payload: string): number {
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}
