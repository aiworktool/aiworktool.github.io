const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

export function pickRecorderMime(isSupported: (mime: string) => boolean): string {
  return MIME_CANDIDATES.find((mime) => isSupported(mime)) ?? '';
}
