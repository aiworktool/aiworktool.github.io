import { AppFailure } from '../errors';
import type { ErrorCode } from '../errors';
import type { LanguageMode, ModelChoice, Segment } from '../transcribe/types';

type DownloadProgress = { loaded: number; total: number; cached: boolean };
type InferProgress = { done: number; total: number; etaMs: number | null };

type Pending = {
  taskId: number;
  kind: 'load' | 'transcribe';
  resolve: (value: Segment[] | void) => void;
  reject: (err: unknown) => void;
  onDownload?: (progress: DownloadProgress) => void;
  onInfer?: (progress: InferProgress) => void;
  onPreview?: (preview: Segment[]) => void;
  onPaused?: () => void;
};

type WorkerData = {
  type: string;
  taskId?: number;
  code?: ErrorCode;
  loaded?: number;
  total?: number;
  cached?: boolean;
  done?: number;
  etaMs?: number | null;
  preview?: Segment[];
  segments?: Segment[];
  phase?: string;
};

export class TranscribeClient {
  private worker: Worker;
  private taskId = 0;
  private pending: Pending | null = null;

  constructor() {
    this.worker = new Worker(new URL('../workers/transcribe.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<WorkerData>) => {
      this.onMessage(event.data);
    };
  }

  load(model: ModelChoice, onDownload: (progress: DownloadProgress) => void): Promise<void> {
    const taskId = ++this.taskId;
    return new Promise((resolve, reject) => {
      this.pending = {
        taskId,
        kind: 'load',
        resolve: () => resolve(),
        reject,
        onDownload,
      };
      this.worker.postMessage({ type: 'load', taskId, model });
    });
  }

  transcribe(options: {
    pcm: Float32Array;
    language: LanguageMode;
    onInfer: (progress: InferProgress) => void;
    onPreview: (preview: Segment[]) => void;
    onPaused: () => void;
  }): Promise<Segment[]> {
    const taskId = ++this.taskId;
    const copy = new Float32Array(options.pcm);
    return new Promise((resolve, reject) => {
      this.pending = {
        taskId,
        kind: 'transcribe',
        resolve: (value) => resolve((value ?? []) as Segment[]),
        reject,
        onInfer: options.onInfer,
        onPreview: options.onPreview,
        onPaused: options.onPaused,
      };
      this.worker.postMessage({ type: 'transcribe', taskId, language: options.language, pcm: copy.buffer }, [
        copy.buffer,
      ]);
    });
  }

  pause(): void {
    this.worker.postMessage({ type: 'pause' });
  }

  resume(): void {
    this.worker.postMessage({ type: 'resume' });
  }

  cancel(): void {
    const kind = this.pending?.kind;
    this.worker.postMessage({ type: kind === 'load' ? 'cancel-load' : 'cancel-task' });
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
    if (data.type === 'progress' && data.phase === 'infer') {
      pending.onInfer?.({ done: data.done ?? 0, total: data.total ?? 0, etaMs: data.etaMs ?? null });
    }
    if (data.type === 'preview' && data.preview) pending.onPreview?.(data.preview);
    if (data.type === 'paused') pending.onPaused?.();
    if (data.type === 'loaded') this.settle(undefined);
    if (data.type === 'done') this.settle(data.segments ?? []);
    if (data.type === 'error') this.fail(new AppFailure(data.code ?? 'gpu-lost'));
  }

  private settle(value: Segment[] | void): void {
    this.pending?.resolve(value);
    this.pending = null;
  }

  private fail(err: unknown): void {
    this.pending?.reject(err);
    this.pending = null;
  }
}
