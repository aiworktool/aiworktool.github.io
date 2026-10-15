import { useEffect, useState, type ReactNode } from 'react';
import { copyText } from '../format';
import { INPUT_MAX_CHARS, type InstantView } from '../time/timeTools';

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function useTextField() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onChange(value: string) {
    if (value.length > INPUT_MAX_CHARS) {
      setError('输入超过 200 个字符。');
      return;
    }
    setText(value);
    setError(null);
  }

  return { text, setText, error, setError, onChange };
}

export function rowsOf(view: InstantView): { label: string; value: string }[] {
  return [
    { label: '本地时间', value: view.local },
    { label: 'Unix 秒', value: String(view.unixSeconds) },
    { label: 'Unix 毫秒', value: String(view.unixMillis) },
    { label: 'ISO', value: view.iso },
    ...view.zones.map((zone) => ({ label: zone.label, value: zone.text })),
  ];
}

export function CopyButton({ label, text }: { label: string; text: string }) {
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
      {copied ? '已复制' : '复制'}
    </button>
  );
}

export function ValueList({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="time-list">
      {rows.map((row) => (
        <div className="time-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd className="time-value">{row.value}</dd>
          <CopyButton label={`复制${row.label}`} text={row.value} />
        </div>
      ))}
    </dl>
  );
}

export function TimeSection({
  title,
  level,
  children,
}: {
  title: string;
  level: 'h2' | 'h3';
  children: ReactNode;
}) {
  const Title = level;
  return (
    <section className="time-section">
      <Title>{title}</Title>
      {children}
    </section>
  );
}
