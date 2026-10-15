import { useEffect, useState } from 'react';
import { copyText } from '../format';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { INPUT_MAX_CHARS, type InstantView } from '../time/timeTools';
import { useI18n } from './useI18n';

export function useTextField() {
  const { m } = useI18n();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onChange(value: string) {
    if (value.length > INPUT_MAX_CHARS) {
      setError(m.time.tooLong);
      return;
    }
    setText(value);
    setError(null);
  }

  return { text, setText, error, setError, onChange };
}

export function rowsOf(view: InstantView, copy: Copy['time']): { label: string; value: string }[] {
  return [
    { label: copy.local, value: view.local },
    { label: copy.unixSeconds, value: String(view.unixSeconds) },
    { label: copy.unixMillis, value: String(view.unixMillis) },
    { label: 'ISO', value: view.iso },
    ...view.zones.map((zone) => ({ label: zone.label, value: zone.text })),
  ];
}

export function CopyButton({ label, text }: { label: string; text: string }) {
  const { m } = useI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setCopied(false);
  }, [text]);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        void copyText(text).then(() => setCopied(true)).catch(() => setCopied(false));
      }}
    >
      {copied ? m.copied : m.copy}
    </button>
  );
}

export function ValueList({ rows }: { rows: { label: string; value: string }[] }) {
  const { m } = useI18n();
  const copy = m.time;
  return (
    <dl className="time-list">
      {rows.map((row) => (
        <div className="time-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd className="time-value">{row.value}</dd>
          <CopyButton label={fill(copy.copyLabel, { label: row.label })} text={row.value} />
        </div>
      ))}
    </dl>
  );
}
