import { describe, expect, it } from 'vitest';
import { decodeBase64, encodeBase64 } from './base64';
import { decodeJwt } from './jwt';
import { testRegex } from './regexTool';
import { TEXT_MAX_CHARS } from './result';
import { sha256Hex } from './sha256';
import { decodeUrl, encodeUrl } from './urlCodec';

describe('codec tools', () => {
  it('round-trips utf-8 base64 and url-safe form', () => {
    const encoded = encodeBase64('你好', false);
    expect(encoded).toEqual({ ok: true, text: '5L2g5aW9' });
    expect(decodeBase64('5L2g5aW9', false)).toEqual({ ok: true, text: '你好' });
    const safe = encodeBase64('???', true);
    expect(safe.ok).toBe(true);
    if (!safe.ok) return;
    expect(safe.text.includes('+') || safe.text.includes('/')).toBe(false);
    expect(decodeBase64(safe.text, true)).toEqual({ ok: true, text: '???' });
  });

  it('rejects bad base64 and oversized text', () => {
    expect(encodeBase64('', false)).toEqual({ ok: false, message: '请先粘贴内容。' });
    expect(decodeBase64('@@@', false).ok).toBe(false);
    const huge = encodeBase64('a'.repeat(TEXT_MAX_CHARS + 1), false);
    expect(huge.ok).toBe(false);
  });

  it('encodes query text and rejects a broken percent escape', () => {
    expect(encodeUrl('a b你')).toEqual({ ok: true, text: 'a%20b%E4%BD%A0' });
    expect(decodeUrl('a%20b%E4%BD%A0')).toEqual({ ok: true, text: 'a b你' });
    expect(decodeUrl('%')).toEqual({ ok: false, message: '百分号转义不完整。' });
  });

  it('hashes abc with sha-256', async () => {
    const result = await sha256Hex('abc');
    expect(result).toEqual({
      ok: true,
      text: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    });
    expect(await sha256Hex('')).toEqual({ ok: false, message: '请先粘贴内容。' });
  });

  it('decodes a jwt payload without checking the signature', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, '');
    const payload = btoa(JSON.stringify({ sub: 'a', exp: 1700000000 })).replace(/=+$/, '');
    const result = decodeJwt(`${header}.${payload}.`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.view.payload).toContain('"sub": "a"');
    expect(result.view.notes.some((note) => note.startsWith('过期时间：'))).toBe(true);
    expect(decodeJwt('not-a-jwt')).toEqual({ ok: false, message: '这不是三段式的 JWT。' });
  });

  it('lists regex captures and rejects a broken pattern', () => {
    const found = testRegex('(\\d+)', 'a 12 b', { global: true, ignoreCase: false, multiline: false });
    expect(found).toEqual({ ok: true, matches: [{ text: '12', groups: ['12'] }] });
    const broken = testRegex('(', '', { global: false, ignoreCase: false, multiline: false });
    expect(broken.ok).toBe(false);
    if (broken.ok) return;
    expect(broken.message.startsWith('这个表达式无法使用。')).toBe(true);
  });
});
