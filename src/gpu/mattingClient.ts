import { AppFailure } from '../errors';
import type { ErrorCode } from '../errors';

type DownloadProgress = { loaded: number; total: number; cached: boolean };

type Pending = {
  taskId: number;
  resolve: (value: Float32Array | void) => void;
  reject: (err: unknown) => void;
  onDownload?: (progress: DownloadProgress) => void;
};

type WorkerData = {
  type: string;
  taskId?: number;
  code?: ErrorCode;
  loaded?: number;
  total?: number;
  cached?: boolean;
  phase?: string;
  alpha?: ArrayBuffer;
};

export class MattingClient {
  private worker: Worker;
  private taskId = 0;
  private pending: Pending | null = null;

  constructor() {
    this.worker = new Worker(new URL('../workers/matting.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<WorkerData>) => {
      this.onMessage(event.data);
    };
  }

  load(onDownload: (progress: DownloadProgress) => void): Promise<void> {
    const taskId = ++this.taskId;
    return new Promise((resolve, reject) => {
      this.pending = {
        taskId,
        resolve: () => resolve(),
        reject,
        onDownload,
      };
      this.worker.postMessage({ type: 'load', taskId });
    });
  }

  run(rgba: Uint8ClampedArray, width: number, height: number): Promise<Float32Array> {
    const taskId = ++this.taskId;
    const copy = new Uint8ClampedArray(rgba);
    return new Promise((resolve, reject) => {
      this.pending = {
        taskId,
        resolve: (value) => resolve(value as Float32Array),
        reject,
      };
      this.worker.postMessage(
        { type: 'matting', taskId, rgba: copy.buffer, width, height },
        [copy.buffer],
      );
    });
  }

  cancel(): void {
    this.worker.postMessage({ type: 'cancel-load' });
    this.pending?.reject(new AppFailure('aborted'));
    this.pending = null;
  }

  terminate(): void {
    this.worker.terminate();
    this.pending = null;
  }

  private onMessage(data: WorkerData): void {
    const pending = this.pending;
    if (!pending || data.taskId !== pending.taskId) return;
    if (data.type === 'progress' && data.phase === 'download') {
      pending.onDownload?.({
        loaded: data.loaded ?? 0,
        total: data.total ?? 0,
        cached: Boolean(data.cached),
      });
    }
    if (data.type === 'loaded') {
      pending.resolve();
      this.pending = null;
    }
    if (data.type === 'done' && data.alpha) {
      pending.resolve(new Float32Array(data.alpha));
      this.pending = null;
    }
    if (data.type === 'error') {
      pending.reject(new AppFailure(data.code ?? 'gpu-lost'));
      this.pending = null;
    }
  }
}
