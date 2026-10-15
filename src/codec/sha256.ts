import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import { rejectLength, TEXT_MAX_CHARS, type CodecResult } from './result';

export async function sha256Hex(input: string, lang: Lang = 'zh'): Promise<CodecResult> {
  const copy = text(lang);
  const limited = rejectLength(input, TEXT_MAX_CHARS, copy.sha.tooBig);
  if (limited) return limited;
  if (!input) return { ok: false, message: copy.pasteFirst };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { ok: true, text: hex };
}
