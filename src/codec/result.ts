export const TEXT_MAX_CHARS = 1_000_000;
export const JWT_MAX_CHARS = 64 * 1024;
export const REGEX_TEXT_MAX = 200_000;
export const REGEX_PATTERN_MAX = 1024;

export type CodecResult = { ok: true; text: string } | { ok: false; message: string };

export function rejectLength(input: string, max: number, message: string): { ok: false; message: string } | null {
  if (input.length > max) return { ok: false, message };
  return null;
}
