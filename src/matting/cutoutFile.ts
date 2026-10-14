import { codeOf, errorText } from '../errors';
import type { MattingClient } from '../gpu/mattingClient';
import { initialCrop, type Rect } from './crop';
import { applyAlpha, decontaminate } from './decontaminate';
import { rgbaToCanvas } from './exportImage';
import { prepareImage } from './prepareImage';

export async function cutoutFile(
  file: File,
  client: MattingClient,
  aspect: number,
  onLoad: () => void,
  onDownload: (progress: { loaded: number; total: number; cached: boolean }) => void,
  onInfer: () => void,
): Promise<{ canvas: HTMLCanvasElement; crop: Rect }> {
  const image = await prepareImage(file);
  onLoad();
  await client.load(onDownload);
  onInfer();
  const alpha = await client.run(image.rgba, image.width, image.height);
  const rgba = decontaminate(applyAlpha(image.rgba, alpha), image.width, image.height);
  return {
    canvas: rgbaToCanvas(rgba, image.width, image.height),
    crop: initialCrop(image.width, image.height, aspect),
  };
}

export function cutoutError(err: unknown): string | null {
  if (codeOf(err) === 'aborted') return null;
  return errorText(codeOf(err), 'image');
}
