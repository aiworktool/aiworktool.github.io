import { codeOf, errorText } from '../errors';
import { downloadBlob } from '../format';
import type { TranscribeClient } from '../gpu/transcribeClient';
import { countChunks } from './chunkAudio';
import { toSrt } from './exportSrt';
import { toTxt } from './exportText';
import type { SessionAction } from './sessionReducer';
import type { LanguageMode, ModelChoice, SourceMode } from './types';
import { MODEL_STORAGE_KEY } from './types';

type Dispatch = (action: SessionAction) => void;

const SMALL_WARNING =
  '高精度模型约 460 MB，占用更多内存，低内存机器可能导致标签页崩溃。仍要切换吗？';

export async function startTranscription(input: {
  client: TranscribeClient | null;
  pcm: Float32Array | null;
  model: ModelChoice;
  language: LanguageMode;
  runId: { current: number };
  dispatch: Dispatch;
}): Promise<void> {
  const { client, pcm } = input;
  if (!client || !pcm) return;
  const id = ++input.runId.current;
  input.dispatch({ type: 'load-start' });
  try {
    await client.load(input.model, (progress) => input.dispatch({ type: 'download', ...progress }));
    if (id !== input.runId.current) return;
    input.dispatch({ type: 'infer-start', total: countChunks(pcm.length) });
    const segments = await client.transcribe({
      pcm,
      language: input.language,
      onInfer: (progress) => input.dispatch({ type: 'infer', ...progress }),
      onPreview: (preview) => input.dispatch({ type: 'preview', preview }),
      onPaused: () => input.dispatch({ type: 'paused' }),
    });
    if (id !== input.runId.current) return;
    input.dispatch({ type: 'done', segments });
  } catch (err) {
    if (id !== input.runId.current) return;
    if (codeOf(err) === 'aborted') input.dispatch({ type: 'abort' });
    else input.dispatch({ type: 'fail', message: errorText(codeOf(err), 'audio') });
  }
}

export function switchWhisperModel(input: {
  next: ModelChoice;
  model: ModelChoice;
  client: TranscribeClient | null;
  runId: { current: number };
  dispatch: Dispatch;
  setModel: (model: ModelChoice) => void;
}): void {
  if (input.next === input.model) return;
  if (input.next === 'small' && !window.confirm(SMALL_WARNING)) return;
  const id = ++input.runId.current;
  input.client?.cancel();
  localStorage.setItem(MODEL_STORAGE_KEY, input.next);
  input.setModel(input.next);
  if (!input.client) return;
  input.dispatch({ type: 'load-start' });
  void input.client
    .load(input.next, (progress) => input.dispatch({ type: 'download', ...progress }))
    .then(() => {
      if (id === input.runId.current) input.dispatch({ type: 'abort' });
    })
    .catch((err: unknown) => {
      if (id !== input.runId.current) return;
      if (codeOf(err) === 'aborted') input.dispatch({ type: 'abort' });
      else input.dispatch({ type: 'fail', message: errorText(codeOf(err), 'audio') });
    });
}

export function saveTranscriptFile(mode: SourceMode, segments: Parameters<typeof toTxt>[0], kind: 'txt' | 'srt'): void {
  const base = mode === 'record' ? 'recording' : 'transcript';
  if (kind === 'txt') {
    const blob = new Blob([toTxt(segments)], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${base}.txt`);
    return;
  }
  const blob = new Blob([toSrt(segments)], { type: 'application/x-subrip;charset=utf-8' });
  downloadBlob(blob, `${base}.srt`);
}
