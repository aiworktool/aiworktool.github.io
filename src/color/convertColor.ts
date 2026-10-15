import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';

export type Rgb = { r: number; g: number; b: number };

export type ColorView = Rgb & { hex: string; h: number; s: number; l: number };

export function colorFromHex(input: string, lang: Lang = 'zh'): ColorView | { message: string } {
  const hex = input.trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { message: text(lang).color.bad };
  return view(
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  );
}

export function colorFromRgb(input: string, lang: Lang = 'zh'): ColorView | { message: string } {
  const parts = input.replace(/rgb\(|\)/gi, '').split(/[, ]+/).filter(Boolean);
  if (parts.length !== 3) return { message: text(lang).color.bad };
  const [r, g, b] = parts.map(Number);
  if (![r, g, b].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    return { message: text(lang).color.bad };
  }
  return view(r, g, b);
}

export function colorFromHsl(input: string, lang: Lang = 'zh'): ColorView | { message: string } {
  const parts = input.replace(/hsl\(|\)|%/gi, '').split(/[, ]+/).filter(Boolean);
  if (parts.length !== 3) return { message: text(lang).color.bad };
  const [h, s, l] = parts.map(Number);
  if (![h, s, l].every((value) => Number.isFinite(value))) return { message: text(lang).color.bad };
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return { message: text(lang).color.bad };
  return { ...hslToRgb(h, s, l), h: Math.round(h), s: Math.round(s), l: Math.round(l) };
}

export function formatHex(color: Rgb): string {
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}`;
}

export function formatRgb(color: Rgb): string {
  return `${color.r}, ${color.g}, ${color.b}`;
}

export function formatHsl(color: { h: number; s: number; l: number }): string {
  return `${color.h}, ${color.s}%, ${color.l}%`;
}

function view(r: number, g: number, b: number): ColorView {
  const hsl = rgbToHsl(r, g, b);
  return { r, g, b, ...hsl, hex: formatHex({ r, g, b }) };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const light = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(light * 100) };
  const delta = max - min;
  const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: Math.round(hue * 60), s: Math.round(sat * 100), l: Math.round(light * 100) };
}

function hslToRgb(h: number, s: number, l: number): Rgb & { hex: string } {
  const sat = s / 100;
  const light = l / 100;
  const channel = (index: number) => {
    const hue = ((h / 30) + index) % 12;
    const chroma = sat * Math.min(light, 1 - light);
    const value = light - chroma * Math.max(Math.min(hue - 3, 9 - hue, 1), -1);
    return Math.round(value * 255);
  };
  const rgb = { r: channel(0), g: channel(8), b: channel(4) };
  return { ...rgb, hex: formatHex(rgb) };
}

function byte(value: number): string {
  return value.toString(16).padStart(2, '0');
}
