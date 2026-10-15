import { currentLang } from './i18n/lang';
import { text } from './i18n/text';

export type ErrorCode =
  | 'no-webgpu'
  | 'mic-denied'
  | 'file-too-big'
  | 'audio-too-long'
  | 'decode-failed'
  | 'download-failed'
  | 'quota'
  | 'gpu-lost'
  | 'oom'
  | 'aborted';

export class AppFailure extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.name = 'AppFailure';
    this.code = code;
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

export function codeOf(err: unknown): ErrorCode {
  if (err instanceof AppFailure) return err.code;
  if (isAbortError(err)) return 'aborted';
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return 'quota';
  }
  if (
    err instanceof DOMException &&
    (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
  ) {
    return 'mic-denied';
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('out of memory') || msg.includes('oom')) return 'oom';
  if (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('failed to fetch') ||
    msg.includes('unexpected token') ||
    msg.includes('checksum')
  ) {
    return 'download-failed';
  }
  return 'gpu-lost';
}

export function errorText(code: ErrorCode, kind: 'audio' | 'image' = 'audio'): string {
  const copy = text(currentLang()).errors;
  switch (code) {
    case 'no-webgpu':
      return copy.noWebgpu;
    case 'mic-denied':
      return copy.mic;
    case 'file-too-big':
      return kind === 'image' ? copy.imageBig : copy.audioBig;
    case 'audio-too-long':
      return copy.audioLong;
    case 'decode-failed':
      return kind === 'image' ? copy.imageOpen : copy.audioOpen;
    case 'download-failed':
      return copy.download;
    case 'quota':
      return copy.quota;
    case 'oom':
      return copy.oom;
    case 'gpu-lost':
      return copy.gpu;
    case 'aborted':
      return '';
  }
}
