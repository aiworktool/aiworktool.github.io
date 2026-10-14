import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import { AppFailure } from '../errors';
import { resizeBilinear, sigmoidPlane } from '../matting/resize';
import { MATTING_MODEL_ID } from '../transcribe/types';

type TensorLike = { dims: number[]; data: ArrayLike<number>; type?: string };

type MattingModel = {
  (input: { input: unknown }): Promise<unknown>;
  dispose?: () => Promise<void>;
};

let processor: ((image: RawImage) => Promise<{ pixel_values: unknown }>) | null = null;
let model: MattingModel | null = null;

function findTensor(value: unknown): TensorLike | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as TensorLike;
  if (Array.isArray(candidate.dims) && candidate.data && candidate.dims.length >= 2) {
    return candidate;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = findTensor(child);
    if (found) return found;
  }
  return null;
}

function float16ToFloat32(bits: number): number {
  const sign = (bits & 0x8000) >> 15;
  const exponent = (bits & 0x7c00) >> 10;
  const fraction = bits & 0x03ff;
  if (exponent === 0) {
    return (sign ? -1 : 1) * 2 ** -14 * (fraction / 1024);
  }
  if (exponent === 31) return fraction ? Number.NaN : (sign ? -Infinity : Infinity);
  return (sign ? -1 : 1) * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

function toFloat32(data: ArrayLike<number>, type: string | undefined): Float32Array {
  if (data instanceof Float32Array) return data;
  if (type === 'float16' && data instanceof Uint16Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 1) out[i] = float16ToFloat32(data[i]);
    return out;
  }
  return Float32Array.from(data);
}

function planeOf(tensor: TensorLike): { data: Float32Array; width: number; height: number } {
  const height = tensor.dims[tensor.dims.length - 2];
  const width = tensor.dims[tensor.dims.length - 1];
  const plane = width * height;
  const source = toFloat32(tensor.data, tensor.type);
  return { data: source.subarray(source.length - plane), width, height };
}

export async function loadMatting(): Promise<void> {
  if (processor && model) return;
  const loadedProcessor = await AutoProcessor.from_pretrained(MATTING_MODEL_ID);
  const loadedModel = await AutoModel.from_pretrained(MATTING_MODEL_ID, {
    dtype: 'fp32',
    device: 'webgpu',
  });
  processor = loadedProcessor as typeof processor;
  model = loadedModel as unknown as MattingModel;
}

export async function runMatting(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<Float32Array> {
  if (!processor || !model) throw new AppFailure('download-failed');
  const image = new RawImage(rgba, width, height, 4).rgb();
  const { pixel_values: pixelValues } = await processor(image);
  const outputs = await model({ input: pixelValues });
  const tensor = findTensor(outputs);
  if (!tensor) throw new AppFailure('gpu-lost');
  const plane = planeOf(tensor);
  const alpha = sigmoidPlane(plane.data);
  return resizeBilinear(alpha, plane.width, plane.height, width, height);
}
