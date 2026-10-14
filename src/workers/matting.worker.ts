import { codeOf } from '../errors';
import { configureEnv } from './configureEnv';
import {
  installModelFetch,
  networkBytesDownloaded,
  resetModelProgress,
  setActiveSignal,
} from './fetchModel';
import { loadMatting, runMatting } from './modnetRun';

type LoadMsg = { type: 'load'; taskId: number };
type RunMsg = { type: 'matting'; taskId: number; rgba: ArrayBuffer; width: number; height: number };

const scope = self as DedicatedWorkerGlobalScope;
let activeTask = 0;
let loadAbort = new AbortController();

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
  scope.postMessage({ type: 'error', taskId, code: codeOf(err) });
}

async function handleLoad(message: LoadMsg): Promise<void> {
  activeTask = message.taskId;
  resetModelProgress();
  loadAbort = new AbortController();
  setActiveSignal(loadAbort.signal);
  try {
    await loadMatting();
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

async function handleRun(message: RunMsg): Promise<void> {
  activeTask = message.taskId;
  try {
    const rgba = new Uint8ClampedArray(message.rgba);
    const alpha = await runMatting(rgba, message.width, message.height);
    const copy = new Float32Array(alpha);
    scope.postMessage(
      { type: 'done', taskId: message.taskId, alpha: copy.buffer },
      [copy.buffer],
    );
  } catch (err) {
    postError(message.taskId, err);
  }
}

const queue: Array<LoadMsg | RunMsg> = [];
let pumping = false;

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  while (queue.length > 0) {
    const message = queue.shift();
    if (!message) break;
    if (message.type === 'load') await handleLoad(message);
    if (message.type === 'matting') await handleRun(message);
  }
  pumping = false;
}

scope.onmessage = (event: MessageEvent) => {
  const data = event.data as { type: string };
  if (data.type === 'cancel-load') loadAbort.abort();
  if (data.type === 'load' || data.type === 'matting') {
    queue.push(data as LoadMsg | RunMsg);
    void pump();
  }
};
