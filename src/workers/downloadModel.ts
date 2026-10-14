import { concatBytes, planByteRanges, RANGE_PARALLEL, type ByteRange } from './modelRange';

export type DownloadResult =
  | { kind: 'passthrough'; response: Response }
  | { kind: 'bytes'; bytes: Uint8Array; contentType: string };

type NativeFetch = typeof fetch;
type OnProgress = (loaded: number, total: number, networkDelta: number) => void;

class RangeUnsupported extends Error {
  constructor() {
    super('range unsupported');
    this.name = 'RangeUnsupported';
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function isHtmlResponse(response: Response): boolean {
  const type = (response.headers.get('content-type') || '').toLowerCase();
  return type.includes('text/html');
}

function linkSignal(outer: AbortSignal | undefined, inner: AbortSignal): AbortSignal {
  if (!outer) return inner;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([outer, inner]);
  return inner;
}

async function readStream(
  response: Response,
  signal: AbortSignal | undefined,
  onChunk: (delta: number) => void,
): Promise<Uint8Array> {
  const body = response.body;
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException('Aborted', 'AbortError');
    }
    const step = await reader.read();
    if (step.done) break;
    parts.push(step.value);
    onChunk(step.value.byteLength);
  }
  return concatBytes(parts);
}

async function probe(
  native: NativeFetch,
  url: string,
  signal: AbortSignal | undefined,
): Promise<{ size: number; contentType: string } | DownloadResult> {
  try {
    const response = await native(url, { method: 'HEAD', signal });
    if (isHtmlResponse(response)) throw new Error('model file was not found locally');
    if (response.status === 404 || response.status === 410) {
      return { kind: 'passthrough', response };
    }
    if (!response.ok) return { size: 0, contentType: 'application/octet-stream' };
    const size = Number(response.headers.get('content-length') || 0);
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return { size: Number.isFinite(size) ? size : 0, contentType };
  } catch (err) {
    if (isAbort(err) || (err instanceof Error && err.message.includes('not found'))) throw err;
    return { size: 0, contentType: 'application/octet-stream' };
  }
}

async function readWhole(
  native: NativeFetch,
  url: string,
  signal: AbortSignal | undefined,
  contentType: string,
  onProgress: OnProgress,
): Promise<DownloadResult> {
  const response = await native(url, { signal });
  if (isHtmlResponse(response)) throw new Error('model file was not found locally');
  if (!response.ok) return { kind: 'passthrough', response };
  const total = Number(response.headers.get('content-length') || 0);
  let loaded = 0;
  onProgress(0, total, 0);
  const bytes = await readStream(response, signal, (delta) => {
    loaded += delta;
    onProgress(loaded, total || loaded, delta);
  });
  const type = response.headers.get('content-type') || contentType;
  return { kind: 'bytes', bytes, contentType: type };
}

async function fetchPart(
  native: NativeFetch,
  url: string,
  range: ByteRange,
  signal: AbortSignal,
  onChunk: (delta: number) => void,
): Promise<Uint8Array> {
  const response = await native(url, {
    headers: { Range: `bytes=${range.start}-${range.end}` },
    signal,
  });
  if (isHtmlResponse(response)) throw new Error('model file was not found locally');
  if (response.status !== 206) {
    await response.body?.cancel();
    throw new RangeUnsupported();
  }
  const bytes = await readStream(response, signal, onChunk);
  const expected = range.end - range.start + 1;
  if (bytes.byteLength !== expected) throw new RangeUnsupported();
  return bytes;
}

async function readRanges(
  native: NativeFetch,
  url: string,
  ranges: ByteRange[],
  signal: AbortSignal | undefined,
  onProgress: OnProgress,
): Promise<Uint8Array> {
  const total = ranges[ranges.length - 1].end + 1;
  const pieces = new Array<Uint8Array>(ranges.length);
  let loaded = 0;
  let next = 0;
  const group = new AbortController();
  const stop = linkSignal(signal, group.signal);
  onProgress(0, total, 0);
  const workers = Math.min(RANGE_PARALLEL, ranges.length);
  const tasks = Array.from({ length: workers }, async () => {
    while (next < ranges.length) {
      const index = next;
      next += 1;
      pieces[index] = await fetchPart(native, url, ranges[index], stop, (delta) => {
        loaded += delta;
        onProgress(loaded, total, delta);
      });
    }
  });
  try {
    await Promise.all(tasks);
  } catch (err) {
    group.abort();
    await Promise.allSettled(tasks);
    throw err;
  }
  return concatBytes(pieces);
}

export async function downloadModelFile(
  native: NativeFetch,
  url: string,
  signal: AbortSignal | undefined,
  onProgress: OnProgress,
): Promise<DownloadResult> {
  const head = await probe(native, url, signal);
  if ('kind' in head) return head;
  const ranges = planByteRanges(head.size);
  if (!ranges) return readWhole(native, url, signal, head.contentType, onProgress);
  try {
    const bytes = await readRanges(native, url, ranges, signal, onProgress);
    return { kind: 'bytes', bytes, contentType: head.contentType };
  } catch (err) {
    if (!(err instanceof RangeUnsupported)) throw err;
    return readWhole(native, url, signal, head.contentType, onProgress);
  }
}
