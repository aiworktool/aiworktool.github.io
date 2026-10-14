import { AppFailure, codeOf } from '../errors';
import type { ModelChoice } from '../transcribe/types';
import { configureEnv } from './configureEnv';
import {
  installModelFetch,
  networkBytesDownloaded,
  resetModelProgress,
  setActiveSignal,
} from './fetchModel';
import { loadWhisper, runWhisper } from './whisperRun';

type LoadMsg = { type: 'load'; taskId: number; model: ModelChoice };
type TranscribeMsg = {
  type: 'transcribe';
  taskId: number;
  pcm: ArrayBuffer;
  language: 'zh' | 'auto';
};

const scope = self as DedicatedWorkerGlobalScope;
const flags = { paused: false, cancelled: false };
let loadAbort = new AbortController();
let activeTask = 0;

configureEnv();
installModelFetch((loaded, total) => {
  scope.postMessage({
    type: 'progress',
    taskId: activeTask,
    phase: 'download',
    loaded,
    total,
    cached: networkBytesDownloaded() === 0,
  });
});

function postError(taskId: number, err: unknown): void {
  const code = codeOf(err);
  scope.postMessage({ type: 'error', taskId, code });
}

async function handleLoad(message: LoadMsg): Promise<void> {
  activeTask = message.taskId;
  resetModelProgress();
  loadAbort = new AbortController();
  setActiveSignal(loadAbort.signal);
  try {
    await loadWhisper(message.model);
    if (loadAbort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    scope.postMessage({
      type: 'progress',
      taskId: message.taskId,
      phase: 'download',
      loaded: 1,
      total: 1,
      cached: networkBytesDownloaded() === 0,
    });
    scope.postMessage({ type: 'loaded', taskId: message.taskId });
  } catch (err) {
    postError(message.taskId, err);
  } finally {
    setActiveSignal(undefined);
  }
}

async function handleTranscribe(message: TranscribeMsg): Promise<void> {
  activeTask = message.taskId;
  flags.paused = false;
  flags.cancelled = false;
  try {
    const segments = await runWhisper({
      pcm: new Float32Array(message.pcm),
      language: message.language,
      taskId: message.taskId,
      paused: () => flags.paused,
      cancelled: () => flags.cancelled,
      onPaused: () => scope.postMessage({ type: 'paused', taskId: message.taskId }),
      onChunk: (preview) => {
        scope.postMessage({ type: 'preview', taskId: message.taskId, preview });
      },
      onInfer: (done, total, etaMs) => {
        scope.postMessage({
          type: 'progress',
          taskId: message.taskId,
          phase: 'infer',
          done,
          total,
          etaMs,
        });
      },
    });
    scope.postMessage({ type: 'done', taskId: message.taskId, segments });
  } catch (err) {
    postError(message.taskId, err instanceof AppFailure ? err : err);
  }
}

const queue: Array<LoadMsg | TranscribeMsg> = [];
let pumping = false;

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  while (queue.length > 0) {
    const message = queue.shift();
    if (!message) break;
    if (message.type === 'load') await handleLoad(message);
    if (message.type === 'transcribe') await handleTranscribe(message);
  }
  pumping = false;
}

scope.onmessage = (event: MessageEvent) => {
  const data = event.data as { type: string; taskId?: number };
  if (data.type === 'pause') flags.paused = true;
  if (data.type === 'resume') flags.paused = false;
  if (data.type === 'cancel-task') flags.cancelled = true;
  if (data.type === 'cancel-load') loadAbort.abort();
  if (data.type === 'load' || data.type === 'transcribe') {
    queue.push(data as LoadMsg | TranscribeMsg);
    void pump();
  }
};
