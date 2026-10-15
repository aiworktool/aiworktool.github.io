import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import { rejectLength, TEXT_MAX_CHARS, type CodecResult } from './result';

export function encodeUrl(input: string, lang: Lang = 'zh'): CodecResult {
  const copy = text(lang);
  const limited = rejectLength(input, TEXT_MAX_CHARS, copy.urlCodec.tooBigEncode);
  if (limited) return limited;
  if (!input) return { ok: false, message: copy.pasteFirst };
  return { ok: true, text: encodeURIComponent(input) };
}

export function decodeUrl(input: string, lang: Lang = 'zh'): CodecResult {
  const copy = text(lang);
  const limited = rejectLength(input, TEXT_MAX_CHARS, copy.urlCodec.tooBigDecode);
  if (limited) return limited;
  if (!input) return { ok: false, message: copy.pasteFirst };
  try {
    return { ok: true, text: decodeURIComponent(input) };
  } catch {
    return { ok: false, message: copy.urlCodec.bad };
  }
}
