import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import { rejectLength, TEXT_MAX_CHARS, type CodecResult } from './result';

const CHUNK = 0x8000;

function bytesToBinary(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return binary;
}

function toUrlSafe(encoded: string): string {
  return encoded.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromUrlSafe(encoded: string): string {
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const rest = padded.length % 4;
  return rest === 0 ? padded : padded + '='.repeat(4 - rest);
}

export function encodeBase64(input: string, urlSafe: boolean, lang: Lang = 'zh'): CodecResult {
  const copy = text(lang);
  const limited = rejectLength(input, TEXT_MAX_CHARS, copy.base64.tooBigEncode);
  if (limited) return limited;
  if (!input) return { ok: false, message: copy.pasteFirst };
  const encoded = btoa(bytesToBinary(new TextEncoder().encode(input)));
  return { ok: true, text: urlSafe ? toUrlSafe(encoded) : encoded };
}

export function decodeBase64(input: string, urlSafe: boolean, lang: Lang = 'zh'): CodecResult {
  const copy = text(lang);
  const limited = rejectLength(input, TEXT_MAX_CHARS, copy.base64.tooBigDecode);
  if (limited) return limited;
  const compact = input.replace(/\s/g, '');
  if (!compact) return { ok: false, message: copy.pasteFirst };
  const normalized = urlSafe ? fromUrlSafe(compact) : compact;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return { ok: false, message: copy.base64.invalid };
  }
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, text: decoded };
  } catch (err) {
    const invalid = err instanceof DOMException && err.name === 'InvalidCharacterError';
    return { ok: false, message: invalid ? copy.base64.invalid : copy.base64.notText };
  }
}
