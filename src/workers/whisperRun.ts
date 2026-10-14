import { pipeline } from '@huggingface/transformers';
import { countChunks, splitChunks } from '../transcribe/chunkAudio';
import { withIds } from '../transcribe/editor';
import { acceptChunk } from '../transcribe/mergeChunks';
import type { LanguageMode, ModelChoice, Segment } from '../transcribe/types';
import { MODEL_ID } from '../transcribe/types';
import { AppFailure } from '../errors';

type ChunkHandler = (preview: Segment[]) => void;
type InferHandler = (done: number, total: number, etaMs: number | null) => void;

type Asr = {
  (
    audio: Float32Array,
    options: {
      return_timestamps: true;
      task: 'transcribe';
      language?: string;
    },
  ): Promise<{ chunks?: { text: string; timestamp: [number, number | null] }[] }>;
  dispose?: () => Promise<void>;
};

let currentId = '';
let transcriber: Asr | null = null;

async function waitWhilePaused(
  paused: () => boolean,
  cancelled: () => boolean,
  onPaused: () => void,
): Promise<boolean> {
  if (!paused()) return true;
  onPaused();
  while (paused()) {
    if (cancelled()) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !cancelled();
}

export async function loadWhisper(model: ModelChoice): Promise<void> {
  const id = MODEL_ID[model];
  if (transcriber && currentId === id) return;
  if (transcriber?.dispose) await transcriber.dispose();
  transcriber = null;
  currentId = '';
  // WebGPU 上 q8 和 fp16 都会把这段录音解成无意义文本，wasm 量化档与 CPU 结果一致。
  const loaded = await pipeline('automatic-speech-recognition', id, {
    device: 'wasm',
    dtype: 'q8',
  });
  const generation = (loaded as { model?: { generation_config?: { max_initial_timestamp_index?: number } } })
    .model?.generation_config;
  if (generation) generation.max_initial_timestamp_index = 50;
  transcriber = loaded as unknown as Asr;
  currentId = id;
}

export async function runWhisper(options: {
  pcm: Float32Array;
  language: LanguageMode;
  taskId: number;
  paused: () => boolean;
  cancelled: () => boolean;
  onPaused: () => void;
  onChunk: ChunkHandler;
  onInfer: InferHandler;
}): Promise<Segment[]> {
  if (!transcriber) throw new AppFailure('download-failed');
  const chunks = splitChunks(options.pcm);
  const total = countChunks(options.pcm.length);
  const drafts: Array<Omit<Segment, 'id'>> = [];
  const started = performance.now();
  for (let index = 0; index < chunks.length; index += 1) {
    const keepGoing = await waitWhilePaused(options.paused, options.cancelled, options.onPaused);
    if (!keepGoing || options.cancelled()) throw new DOMException('Aborted', 'AbortError');
    const chunk = chunks[index];
    const audio = new Float32Array(chunk.samples);
    const result = await transcriber(audio, {
      return_timestamps: true,
      task: 'transcribe',
      ...(options.language === 'zh' ? { language: 'zh' } : {}),
    });
    drafts.push(
      ...acceptChunk(result.chunks ?? [], chunk.startSec, index > 0),
    );
    options.onChunk(withIds(drafts, `preview-${options.taskId}`));
    const done = index + 1;
    const etaMs = done === 0 ? null : ((performance.now() - started) / done) * (total - done);
    options.onInfer(done, total, done === 0 ? null : etaMs);
  }
  return withIds(drafts, `seg-${options.taskId}`);
}
