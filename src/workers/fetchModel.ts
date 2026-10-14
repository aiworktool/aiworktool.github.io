const CACHE_NAME = 'local-models-v1';

type ProgressFn = (loaded: number, total: number, networkBytes: number) => void;

type FileProgress = { loaded: number; total: number };

const files = new Map<string, FileProgress>();
let networkBytes = 0;
let onProgress: ProgressFn | null = null;
let installed = false;
let activeSignal: AbortSignal | undefined;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return new URL(input, self.location.origin).href;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isModelUrl(url: string): boolean {
  return new URL(url).pathname.startsWith('/models/');
}

function emit(): void {
  let loaded = 0;
  let total = 0;
  for (const item of files.values()) {
    loaded += item.loaded;
    total += item.total;
  }
  onProgress?.(loaded, total, networkBytes);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

async function storeResponse(url: string, response: Response, signal?: AbortSignal): Promise<Response> {
  const total = Number(response.headers.get('content-length') || 0);
  const body = response.body;
  if (!body) return response;
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  files.set(url, { loaded: 0, total });
  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException('Aborted', 'AbortError');
    }
    const step = await reader.read();
    if (step.done) break;
    parts.push(step.value);
    loaded += step.value.byteLength;
    networkBytes += step.value.byteLength;
    files.set(url, { loaded, total: total || loaded });
    emit();
  }
  const bytes = concat(parts);
  const payload = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(payload).set(bytes);
  const headers = new Headers(response.headers);
  headers.set('content-length', String(payload.byteLength));
  const stored = new Response(payload, { status: response.status, headers });
  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, stored.clone());
  return stored;
}

function isHtml(response: Response): boolean {
  const type = (response.headers.get('content-type') || '').toLowerCase();
  return type.includes('text/html');
}

async function cachedModel(cache: Cache, url: string): Promise<Response | null> {
  const cached = await cache.match(url);
  if (!cached) return null;
  if (!isHtml(cached)) return cached;
  await cache.delete(url);
  return null;
}

async function trackedFetch(
  native: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = requestUrl(input);
  if (!isModelUrl(url)) return native(input, init);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cachedModel(cache, url);
  if (cached) {
    const size = Number(cached.headers.get('content-length') || 0);
    files.set(url, { loaded: size, total: size });
    emit();
    return cached;
  }
  if (activeSignal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await native(input, init);
  if (isHtml(response)) throw new Error('model file was not found locally');
  if (!response.ok) return response;
  try {
    return await storeResponse(url, response, activeSignal ?? init?.signal ?? undefined);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw err;
    }
    throw err;
  }
}

export function resetModelProgress(): void {
  files.clear();
  networkBytes = 0;
}

export function setActiveSignal(signal: AbortSignal | undefined): void {
  activeSignal = signal;
}

export function installModelFetch(progress: ProgressFn): void {
  onProgress = progress;
  if (installed) return;
  installed = true;
  const native = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => trackedFetch(native, input, init);
}

export function networkBytesDownloaded(): number {
  return networkBytes;
}
