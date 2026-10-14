import { AppFailure } from '../errors';
import { IMAGE_MAX_BYTES } from '../transcribe/limits';
import { scaledSize } from './scaledSize';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function canvasOf(bitmap: ImageBitmap): { rgba: Uint8ClampedArray; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new AppFailure('decode-failed');
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { rgba: image.data, width: canvas.width, height: canvas.height };
}

export async function prepareImage(file: File): Promise<{
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  if (file.size > IMAGE_MAX_BYTES) throw new AppFailure('file-too-big');
  if (file.type && !IMAGE_TYPES.has(file.type)) throw new AppFailure('decode-failed');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new AppFailure('decode-failed');
  }
  const next = scaledSize(bitmap.width, bitmap.height);
  let working = bitmap;
  if (next.width !== bitmap.width || next.height !== bitmap.height) {
    working = await createImageBitmap(bitmap, {
      resizeWidth: next.width,
      resizeHeight: next.height,
      resizeQuality: 'high',
    });
    bitmap.close();
  }
  const result = canvasOf(working);
  working.close();
  return result;
}
