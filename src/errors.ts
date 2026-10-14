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
  switch (code) {
    case 'no-webgpu':
      return '当前浏览器不能使用 WebGPU。请改用桌面版 Chrome 或 Edge 113 及以上。';
    case 'mic-denied':
      return '没有麦克风权限。请在浏览器的网站设置里允许麦克风，然后重新录音。';
    case 'file-too-big':
      return kind === 'image'
        ? '图片超过 20 MB，请换一张更小的图片。'
        : '文件超过 100 MB，请换一个更小的音频。';
    case 'audio-too-long':
      return '音频超过 30 分钟。请先裁短后再试，这里不会截断文件。';
    case 'decode-failed':
      return kind === 'image'
        ? '这张图片打不开。请换一张 JPG、PNG 或 WebP。'
        : '这个音频打不开。请换一个浏览器能播放的 mp3、wav、m4a 或 webm。';
    case 'download-failed':
      return '模型没有下载完成。请检查网络后重试。若当前是离线状态，请先联网下载一次。';
    case 'quota':
      return '浏览器缓存空间不足，模型没有存下来。请清理本站数据后重试。';
    case 'oom':
      return '内存不足，本次处理已停止。可以关掉其他占用显卡的标签页，或改回默认模型后再试。文稿仍保留。';
    case 'gpu-lost':
      return '显卡中断了这次处理。请关掉其他占用显卡的标签页后重试。已编辑的文稿仍保留。';
    case 'aborted':
      return '';
  }
}
