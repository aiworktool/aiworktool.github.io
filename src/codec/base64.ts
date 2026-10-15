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

export function encodeBase64(input: string, urlSafe: boolean): CodecResult {
  const limited = rejectLength(input, TEXT_MAX_CHARS, '这段文字超过 1 MB，请缩短后再编码。');
  if (limited) return limited;
  if (!input) return { ok: false, message: '请先粘贴内容。' };
  const encoded = btoa(bytesToBinary(new TextEncoder().encode(input)));
  return { ok: true, text: urlSafe ? toUrlSafe(encoded) : encoded };
}

export function decodeBase64(input: string, urlSafe: boolean): CodecResult {
  const limited = rejectLength(input, TEXT_MAX_CHARS, '这段文字超过 1 MB，请缩短后再解码。');
  if (limited) return limited;
  const compact = input.replace(/\s/g, '');
  if (!compact) return { ok: false, message: '请先粘贴内容。' };
  const normalized = urlSafe ? fromUrlSafe(compact) : compact;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    return { ok: false, message: '这不是合法的 Base64。' };
  }
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, text };
  } catch (err) {
    const invalid = err instanceof DOMException && err.name === 'InvalidCharacterError';
    return { ok: false, message: invalid ? '这不是合法的 Base64。' : '结果不是文本，已停止。' };
  }
}
