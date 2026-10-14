import { describe, expect, it } from 'vitest';
import { downloadModelFile } from './downloadModel';

const MB = 1024 * 1024;

function server(bytes: Uint8Array, allowRange: boolean) {
  const calls: string[] = [];
  const native: typeof fetch = async (_input, init) => {
    const method = init?.method ?? 'GET';
    const range = new Headers(init?.headers).get('Range');
    calls.push(`${method} ${range ?? '-'}`);
    const headers = {
      'content-type': 'application/octet-stream',
      'content-length': String(bytes.byteLength),
    };
    if (method === 'HEAD') return new Response(null, { status: 200, headers });
    if (range && allowRange) {
      const match = /bytes=(\d+)-(\d+)/.exec(range);
      const start = Number(match?.[1] ?? 0);
      const end = Number(match?.[2] ?? bytes.byteLength - 1);
      const slice = bytes.slice(start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': String(slice.byteLength),
          'content-range': `bytes ${start}-${end}/${bytes.byteLength}`,
        },
      });
    }
    return new Response(bytes.slice(), { status: 200, headers });
  };
  return { native, calls };
}

describe('parallel model download', () => {
  it('downloads an 8 MB file as two ranges', async () => {
    const bytes = new Uint8Array(8 * MB);
    bytes[0] = 7;
    bytes[4 * MB] = 9;
    bytes[bytes.length - 1] = 3;
    const { native, calls } = server(bytes, true);
    const result = await downloadModelFile(native, 'https://example.com/models/a.onnx', undefined, () => {});
    expect(result.kind).toBe('bytes');
    if (result.kind !== 'bytes') return;
    expect(result.bytes[0]).toBe(7);
    expect(result.bytes[4 * MB]).toBe(9);
    expect(result.bytes[result.bytes.length - 1]).toBe(3);
    expect(result.bytes.byteLength).toBe(bytes.byteLength);
    expect(calls.filter((call) => call.startsWith('GET bytes='))).toHaveLength(2);
  });

  it('falls back to one request when ranges are ignored', async () => {
    const bytes = new Uint8Array(8 * MB);
    bytes[100] = 4;
    const { native, calls } = server(bytes, false);
    const result = await downloadModelFile(native, 'https://example.com/models/a.onnx', undefined, () => {});
    expect(result.kind).toBe('bytes');
    if (result.kind !== 'bytes') return;
    expect(result.bytes[100]).toBe(4);
    expect(calls.filter((call) => call === 'GET -')).toHaveLength(1);
  });

  it('still downloads when the size probe is rejected', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const native: typeof fetch = async (_input, init) => {
      if (init?.method === 'HEAD') return new Response(null, { status: 405 });
      return new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'application/octet-stream', 'content-length': '4' },
      });
    };
    const result = await downloadModelFile(native, 'https://example.com/models/a.json', undefined, () => {});
    expect(result.kind).toBe('bytes');
    if (result.kind !== 'bytes') return;
    expect(Array.from(result.bytes)).toEqual([1, 2, 3, 4]);
  });

  it('leaves files under 8 MB on a single request', async () => {
    const bytes = new Uint8Array(32);
    bytes[3] = 1;
    const { native, calls } = server(bytes, true);
    const result = await downloadModelFile(native, 'https://example.com/models/a.json', undefined, () => {});
    expect(result.kind).toBe('bytes');
    if (result.kind !== 'bytes') return;
    expect(result.bytes[3]).toBe(1);
    expect(calls.some((call) => call.startsWith('GET bytes='))).toBe(false);
  });
});
