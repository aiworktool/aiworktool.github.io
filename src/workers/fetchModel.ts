import { downloadModelFile, isHtmlResponse } from './downloadModel';
import { expectedSha256 } from './modelIntegrity';

const CACHE_NAME = 'local-models-v1';

type ProgressFn = (loaded: number, total: number, networkBytes: number) => void;
type FileProgress = { loaded: number; total: number };
type NativeFetch = typeof fetch;

const files = new Map<string, FileProgress>();
const inflight = new Map<string, Promise<Response>>();
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

function note(url: string, loaded: number, total: number, delta: number): void {
  networkBytes += delta;
  files.set(url, { loaded, total: total || loaded });
  emit();
}

function copyBytes(bytes: Uint8Array): ArrayBuffer {
  const payload = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(payload).set(bytes);
  return payload;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', copyBytes(bytes));
  const hex: string[] = [];
  for (const byte of new Uint8Array(digest)) hex.push(byte.toString(16).padStart(2, '0'));
  return hex.join('');
}

function bytesToResponse(bytes: Uint8Array, contentType: string): Response {
  const payload = copyBytes(bytes);
  return new Response(payload, {
    status: 200,
    headers: {
      'content-type': contentType || 'application/octet-stream',
      'content-length': String(payload.byteLength),
    },
  });
}

async function cachedModel(cache: Cache, url: string): Promise<Response | null> {
  const cached = await cache.match(url);
  if (!cached) return null;
  if (!isHtmlResponse(cached)) return cached;
  await cache.delete(url);
  return null;
}

function callerSignal(init?: RequestInit): AbortSignal | undefined {
  const signal = init?.signal ?? undefined;
  if (!activeSignal) return signal;
  if (!signal) return activeSignal;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([activeSignal, signal]);
  return activeSignal;
}

async function fetchIntoCache(native: NativeFetch, url: string, signal?: AbortSignal): Promise<Response> {
  const result = await downloadModelFile(native, url, signal, (loaded, total, delta) => {
    note(url, loaded, total, delta);
  });
  if (result.kind === 'passthrough') return result.response;
  const expected = expectedSha256(url);
  if (expected) {
    const actual = await sha256Hex(result.bytes);
    if (actual !== expected) throw new Error('model checksum mismatch');
  }
  const stored = bytesToResponse(result.bytes, result.contentType);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, stored.clone());
  return stored;
}

async function shareDownload(native: NativeFetch, url: string, signal?: AbortSignal): Promise<Response> {
  const current = inflight.get(url);
  if (current) return (await current).clone();
  const job = fetchIntoCache(native, url, signal);
  inflight.set(url, job);
  try {
    return (await job).clone();
  } finally {
    inflight.delete(url);
  }
}

async function trackedFetch(
  native: NativeFetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = requestUrl(input);
  const method = (init?.method || 'GET').toUpperCase();
  if (!isModelUrl(url) || method !== 'GET') return native(input, init);
  const signal = callerSignal(init);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const cache = await caches.open(CACHE_NAME);
  const cached = await cachedModel(cache, url);
  if (cached) {
    const size = Number(cached.headers.get('content-length') || 0);
    files.set(url, { loaded: size, total: size });
    emit();
    return cached;
  }
  return shareDownload(native, url, signal);
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
