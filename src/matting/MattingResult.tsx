import { downloadBlob } from '../format';
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
            {item.name}
          </button>
        ))}
        <button type="button" onClick={onTransparent} aria-pressed={transparent}>
          查看透明底
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
            {item.name}
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
      <p>参考线在裁切框内 10% 和 40% 处，只供对照，不会自动吸附。</p>
      <div className="row">
        <button type="button" onClick={() => void savePng(source)}>下载透明 PNG</button>
        <button type="button" onClick={() => void saveJpg(source, crop, color.hex, preset)}>
          下载证件照 JPG
        </button>
      </div>
    </>
  );
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
