export type Rgb = readonly [number, number, number];

export type Preset = {
  id: string;
  name: string;
  width: number;
  height: number;
};

export type BackgroundColor = {
  id: string;
  name: string;
  hex: string;
  rgb: Rgb;
};

export const PRESETS: readonly Preset[] = [
  { id: '1inch', name: '一寸', width: 295, height: 413 },
  { id: 'small1', name: '小一寸', width: 260, height: 378 },
  { id: '2inch', name: '二寸', width: 413, height: 579 },
  { id: 'us-visa', name: '美国签证 2×2 英寸', width: 600, height: 600 },
];

export const BACKGROUNDS: readonly BackgroundColor[] = [
  { id: 'white', name: '白', hex: '#FFFFFF', rgb: [255, 255, 255] },
  { id: 'blue', name: '蓝', hex: '#438EDB', rgb: [67, 142, 219] },
  { id: 'red', name: '红', hex: '#FF0000', rgb: [255, 0, 0] },
];

export const DEFAULT_BACKGROUND = BACKGROUNDS[0];

export function aspectOf(preset: Preset): number {
  return preset.width / preset.height;
}

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}
