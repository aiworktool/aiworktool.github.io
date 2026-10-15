import { formatLocal } from '../time/timeTools';
import { JWT_MAX_CHARS, rejectLength } from './result';

export type JwtView = { header: string; payload: string; notes: string[] };
export type JwtResult = { ok: true; view: JwtView } | { ok: false; message: string };

function decodePart(part: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) return null;
  const rest = part.length % 4;
  const padded = part.replaceAll('-', '+').replaceAll('_', '/') + (rest === 0 ? '' : '='.repeat(4 - rest));
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function clockNote(label: string, value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const ms = value > 1e12 ? value : value * 1000;
  const year = new Date(ms).getFullYear();
  if (year < 1970 || year > 2100) return null;
  return `${label}：${formatLocal(ms)}`;
}

type PartResult = { ok: true; value: unknown } | { ok: false; message: string };

function readJson(text: string, badBase64: string, badJson: string): PartResult {
  const decoded = decodePart(text);
  if (decoded === null) return { ok: false, message: badBase64 };
  try {
    return { ok: true, value: JSON.parse(decoded) as unknown };
  } catch {
    return { ok: false, message: badJson };
  }
}

export function decodeJwt(input: string): JwtResult {
  const limited = rejectLength(input, JWT_MAX_CHARS, '这段令牌超过 64 KB，请缩短后再解码。');
  if (limited) return limited;
  const token = input.trim().replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, message: '请先粘贴内容。' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, message: '这不是三段式的 JWT。' };
  const header = readJson(parts[0], '头部不是合法的 Base64URL。', '头部不是 JSON。');
  if (!header.ok) return header;
  const payload = readJson(parts[1], '载荷不是合法的 Base64URL。', '载荷不是 JSON。');
  if (!payload.ok) return payload;
  const body = payload.value;
  const notes = [
    clockNote('签发时间', body && typeof body === 'object' ? (body as { iat?: unknown }).iat : null),
    clockNote('过期时间', body && typeof body === 'object' ? (body as { exp?: unknown }).exp : null),
  ].filter((note): note is string => note !== null);
  return {
    ok: true,
    view: {
      header: JSON.stringify(header.value, null, 2),
      payload: JSON.stringify(payload.value, null, 2),
      notes,
    },
  };
}
