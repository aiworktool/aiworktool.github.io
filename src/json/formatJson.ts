import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';

export const JSON_MAX_CHARS = 1_000_000;

export type FormatResult = { ok: true; text: string } | { ok: false; message: string };

function parseJson(input: string, lang: Lang): { ok: true; value: unknown } | { ok: false; message: string } {
  const copy = text(lang).json;
  if (input.length > JSON_MAX_CHARS) return { ok: false, message: copy.tooBig };
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: copy.empty };
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch (err) {
    const detail = err instanceof Error ? err.message : copy.cannotParse;
    return { ok: false, message: fill(copy.invalid, { detail }) };
  }
}

export function formatJsonText(input: string, lang: Lang = 'zh'): FormatResult {
  const parsed = parseJson(input, lang);
  if (!parsed.ok) return parsed;
  return { ok: true, text: JSON.stringify(parsed.value, null, 2) };
}

export function compressJsonText(input: string, lang: Lang = 'zh'): FormatResult {
  const parsed = parseJson(input, lang);
  if (!parsed.ok) return parsed;
  return { ok: true, text: JSON.stringify(parsed.value) };
}
