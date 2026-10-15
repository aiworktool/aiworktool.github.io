import { downloadBlob } from '../format';
import { useI18n } from '../pages/useI18n';
import type { Copy } from '../i18n/zh';
import { aspectOf, BACKGROUNDS, PRESETS, type BackgroundColor, type Preset } from './presets';
import { exportJpeg, exportPng } from './exportImage';
import { MattingPreview } from './MattingPreview';
import type { Rect } from './crop';

export function MattingResult({
  source,
  crop,
  preset,
  color,
  transparent,
  onColor,
  onTransparent,
  onPreset,
  onCrop,
}: {
  source: HTMLCanvasElement;
  crop: Rect;
  preset: Preset;
  color: BackgroundColor;
  transparent: boolean;
  onColor: (id: string) => void;
  onTransparent: () => void;
  onPreset: (id: string) => void;
  onCrop: (crop: Rect) => void;
}) {
  const { m } = useI18n();
  const copy = m.matting;
  return (
    <>
      <div className="row">
        {BACKGROUNDS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onColor(item.id)}
            aria-pressed={item.id === color.id}
          >
            {colorName(item.id, copy)}
          </button>
        ))}
        <button type="button" onClick={onTransparent} aria-pressed={transparent}>
          {copy.transparentView}
        </button>
      </div>
      <div className="row">
        {PRESETS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onPreset(item.id)}
            aria-pressed={item.id === preset.id}
          >
            {presetName(item.id, copy)}
          </button>
        ))}
      </div>
      <MattingPreview
        source={source}
        color={color.hex}
        transparent={transparent}
        crop={crop}
        aspect={aspectOf(preset)}
        onCrop={onCrop}
      />
      <p>{copy.guide}</p>
      <div className="row">
        <button type="button" onClick={() => void savePng(source)}>{copy.png}</button>
        <button type="button" onClick={() => void saveJpg(source, crop, color.hex, preset)}>
          {copy.jpg}
        </button>
      </div>
    </>
  );
}

function colorName(id: string, copy: Copy['matting']): string {
  if (id === 'white') return copy.white;
  if (id === 'blue') return copy.blue;
  if (id === 'red') return copy.red;
  return id;
}

function presetName(id: string, copy: Copy['matting']): string {
  if (id === '1inch') return copy.inch1;
  if (id === 'small1') return copy.small1;
  if (id === '2inch') return copy.inch2;
  if (id === 'us-visa') return copy.visa;
  return id;
}

async function savePng(source: HTMLCanvasElement): Promise<void> {
  downloadBlob(await exportPng(source), 'cutout.png');
}

async function saveJpg(
  source: HTMLCanvasElement,
  crop: Rect,
  color: string,
  preset: Preset,
): Promise<void> {
  const blob = await exportJpeg(source, crop, color, preset.width, preset.height);
  downloadBlob(blob, 'id-photo.jpg');
}
