import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';
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

function clockNote(label: string, value: unknown, lang: Lang): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const ms = value > 1e12 ? value : value * 1000;
  const year = new Date(ms).getFullYear();
  if (year < 1970 || year > 2100) return null;
  return fill(text(lang).jwt.noteLine, { label, time: formatLocal(ms) });
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

export function decodeJwt(input: string, lang: Lang = 'zh'): JwtResult {
  const copy = text(lang);
  const limited = rejectLength(input, JWT_MAX_CHARS, copy.jwt.tooBig);
  if (limited) return limited;
  const token = input.trim().replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, message: copy.pasteFirst };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, message: copy.jwt.notJwt };
  const header = readJson(parts[0], copy.jwt.headerB64, copy.jwt.headerJson);
  if (!header.ok) return header;
  const payload = readJson(parts[1], copy.jwt.payloadB64, copy.jwt.payloadJson);
  if (!payload.ok) return payload;
  const body = payload.value;
  const notes = [
    clockNote(copy.jwt.issued, body && typeof body === 'object' ? (body as { iat?: unknown }).iat : null, lang),
    clockNote(copy.jwt.expires, body && typeof body === 'object' ? (body as { exp?: unknown }).exp : null, lang),
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
