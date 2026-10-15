export const JSON_MAX_CHARS = 1_000_000;

export type FormatResult = { ok: true; text: string } | { ok: false; message: string };

function parseJson(input: string): { ok: true; value: unknown } | { ok: false; message: string } {
  if (input.length > JSON_MAX_CHARS) {
    return { ok: false, message: '这段文字超过 1 MB，请缩短后再处理。' };
  }
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: '请先粘贴 JSON。' };
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch (err) {
    const detail = err instanceof Error ? err.message : '无法解析';
    return { ok: false, message: `这不是合法的 JSON。${detail}` };
  }
}

export function formatJsonText(input: string): FormatResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, text: JSON.stringify(parsed.value, null, 2) };
}

export function compressJsonText(input: string): FormatResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return parsed;
  return { ok: true, text: JSON.stringify(parsed.value) };
}
