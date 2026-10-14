import { AppFailure } from '../errors';
import type { Rect } from './crop';

export function rgbaToCanvas(rgba: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppFailure('decode-failed');
  const copy = new Uint8ClampedArray(rgba);
  ctx.putImageData(new ImageData(copy, width, height), 0, 0);
  return canvas;
}

function blobOf(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new AppFailure('decode-failed'));
    }, type, quality);
  });
}

export function exportPng(source: HTMLCanvasElement): Promise<Blob> {
  return blobOf(source, 'image/png');
}

export async function exportJpeg(
  source: HTMLCanvasElement,
  crop: Rect,
  color: string,
  outW: number,
  outH: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppFailure('decode-failed');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, outW, outH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
  return blobOf(canvas, 'image/jpeg', 0.92);
}
