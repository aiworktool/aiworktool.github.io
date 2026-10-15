import { useState } from 'react';
import {
  colorFromHex, colorFromHsl, colorFromRgb, formatHex, formatHsl, formatRgb, type ColorView,
} from '../color/convertColor';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

const START = colorFromHex('#1f6b4a') as ColorView;

export default function ColorPage() {
  const { m, lang } = useI18n();
  const copy = m.color;
  const [hex, setHex] = useState(START.hex);
  const [rgb, setRgb] = useState(formatRgb(START));
  const [hsl, setHsl] = useState(formatHsl(START));
  const [swatch, setSwatch] = useState(START.hex);
  const [error, setError] = useState<string | null>(null);

  function onHex(value: string) {
    setHex(value);
    const body = value.trim().replace(/^#/, '');
    if (body.length !== 3 && body.length !== 6) {
      setError(null);
      return;
    }
    apply(colorFromHex(value, lang), 'hex');
  }

  function onRgb(value: string) {
    setRgb(value);
    if (value.replace(/rgb\(|\)/gi, '').split(/[, ]+/).filter(Boolean).length !== 3) {
      setError(null);
      return;
    }
    apply(colorFromRgb(value, lang), 'rgb');
  }

  function onHsl(value: string) {
    setHsl(value);
    if (value.replace(/hsl\(|\)|%/gi, '').split(/[, ]+/).filter(Boolean).length !== 3) {
      setError(null);
      return;
    }
    apply(colorFromHsl(value, lang), 'hsl');
  }

  function apply(color: ColorView | { message: string }, source: 'hex' | 'rgb' | 'hsl') {
    if ('message' in color) {
      setError(color.message);
      return;
    }
    setError(null);
    setSwatch(color.hex);
    if (source !== 'hex') setHex(formatHex(color));
    if (source !== 'rgb') setRgb(formatRgb(color));
    if (source !== 'hsl') setHsl(formatHsl(color));
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <div className="swatch" style={{ background: swatch }} role="img" aria-label={copy.swatch} />
      <label className="time-field">
        <span>{copy.hex}</span>
        <input type="text" value={hex} aria-label={copy.hex} onChange={(event) => onHex(event.target.value)} />
      </label>
      <label className="time-field">
        <span>{copy.rgb}</span>
        <input type="text" value={rgb} aria-label={copy.rgb} onChange={(event) => onRgb(event.target.value)} />
      </label>
      <label className="time-field">
        <span>{copy.hsl}</span>
        <input type="text" value={hsl} aria-label={copy.hsl} onChange={(event) => onHsl(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
    </ToolPage>
  );
}
