import { rejectLength, TEXT_MAX_CHARS, type CodecResult } from './result';

export async function sha256Hex(input: string): Promise<CodecResult> {
  const limited = rejectLength(input, TEXT_MAX_CHARS, '这段文字超过 1 MB，请缩短后再计算。');
  if (limited) return limited;
  if (!input) return { ok: false, message: '请先粘贴内容。' };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { ok: true, text: hex };
}
