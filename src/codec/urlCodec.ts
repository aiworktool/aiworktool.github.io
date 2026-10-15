import { rejectLength, TEXT_MAX_CHARS, type CodecResult } from './result';

export function encodeUrl(input: string): CodecResult {
  const limited = rejectLength(input, TEXT_MAX_CHARS, '这段文字超过 1 MB，请缩短后再编码。');
  if (limited) return limited;
  if (!input) return { ok: false, message: '请先粘贴内容。' };
  return { ok: true, text: encodeURIComponent(input) };
}

export function decodeUrl(input: string): CodecResult {
  const limited = rejectLength(input, TEXT_MAX_CHARS, '这段文字超过 1 MB，请缩短后再解码。');
  if (limited) return limited;
  if (!input) return { ok: false, message: '请先粘贴内容。' };
  try {
    return { ok: true, text: decodeURIComponent(input) };
  } catch {
    return { ok: false, message: '百分号转义不完整。' };
  }
}
