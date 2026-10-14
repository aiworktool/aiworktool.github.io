export const JSON_MAX_CHARS = 1_000_000;

export type FormatResult = { ok: true; text: string } | { ok: false; message: string };

export function formatJsonText(input: string): FormatResult {
  if (input.length > JSON_MAX_CHARS) {
    return { ok: false, message: '这段文字超过 1 MB，请缩短后再格式化。' };
  }
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: '请先粘贴 JSON。' };
  try {
    const value = JSON.parse(trimmed) as unknown;
    return { ok: true, text: JSON.stringify(value, null, 2) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : '无法解析';
    return { ok: false, message: `这不是合法的 JSON。${detail}` };
  }
}
