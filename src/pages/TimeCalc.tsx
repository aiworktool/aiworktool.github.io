import { useState } from 'react';
import { diffDateTimes, shiftDateTime, type Direction, type InstantView } from '../time/timeTools';
import { CopyButton, TimeSection, useTextField, ValueList, rowsOf } from './TimeBits';

function readAmounts(days: string, hours: string, minutes: string): [number, number, number] | null {
  const values = [days, hours, minutes].map((text) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    if (!/^\d{1,6}$/.test(trimmed)) return null;
    const value = Number(trimmed);
    return value <= 100_000 ? value : null;
  });
  if (values.some((value) => value === null)) return null;
  return values as [number, number, number];
}

export function DiffSection({ level }: { level: 'h2' | 'h3' }) {
  const start = useTextField();
  const end = useTextField();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  function calculate() {
    const fieldError = start.error || end.error;
    if (fieldError) {
      setError(fieldError);
      setText(null);
      return;
    }
    const result = diffDateTimes(start.text, end.text);
    if (!result.ok) {
      setError(result.message);
      setText(null);
      return;
    }
    setError(null);
    setText(result.text);
  }

  return (
    <TimeSection title="计算间隔" level={level}>
      <div className="time-fields">
        <label className="time-field">
          <span>开始</span>
          <input
            type="text"
            value={start.text}
            spellCheck={false}
            placeholder="2023-01-01 00:00:00"
            onChange={(event) => {
              setError(null);
              setText(null);
              start.onChange(event.target.value);
            }}
          />
        </label>
        <label className="time-field">
          <span>结束</span>
          <input
            type="text"
            value={end.text}
            spellCheck={false}
            placeholder="2023-01-03 01:02:03"
            onChange={(event) => {
              setError(null);
              setText(null);
              end.onChange(event.target.value);
            }}
          />
        </label>
      </div>
      <div className="row">
        <button type="button" onClick={calculate}>计算间隔</button>
      </div>
      {(start.error || end.error || error) && (
        <p role="alert">{start.error || end.error || error}</p>
      )}
      {text && (
        <div className="time-result">
          <span>{text}</span>
          <CopyButton label="复制时间间隔" text={text} />
        </div>
      )}
    </TimeSection>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="time-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ShiftSection({ level }: { level: 'h2' | 'h3' }) {
  const source = useTextField();
  const days = useTextField();
  const hours = useTextField();
  const minutes = useTextField();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<InstantView | null>(null);

  function run(direction: Direction) {
    const fieldError = source.error || days.error || hours.error || minutes.error;
    if (fieldError) {
      setError(fieldError);
      setView(null);
      return;
    }
    const amounts = readAmounts(days.text, hours.text, minutes.text);
    if (!amounts) {
      setError('天数、小时和分钟请填 0 到 100000 的整数。');
      setView(null);
      return;
    }
    const result = shiftDateTime(source.text, amounts[0], amounts[1], amounts[2], direction);
    if (!result.ok) {
      setError(result.message);
      setView(null);
      return;
    }
    setError(null);
    setView(result.view);
  }

  function change(apply: (value: string) => void): (value: string) => void {
    return (value) => {
      setError(null);
      setView(null);
      apply(value);
    };
  }

  return (
    <TimeSection title="时间加减" level={level}>
      <p className="time-hint">天按 24 小时计算。</p>
      <label className="time-field">
        <span>起始时间</span>
        <input
          type="text"
          value={source.text}
          spellCheck={false}
          placeholder="2023-01-01 00:00:00"
          onChange={(event) => change(source.onChange)(event.target.value)}
        />
      </label>
      <div className="duration-fields">
        <AmountField label="天" value={days.text} onChange={change(days.onChange)} />
        <AmountField label="小时" value={hours.text} onChange={change(hours.onChange)} />
        <AmountField label="分钟" value={minutes.text} onChange={change(minutes.onChange)} />
      </div>
      <div className="row">
        <button type="button" onClick={() => run('add')}>加上</button>
        <button type="button" onClick={() => run('sub')}>减去</button>
      </div>
      {(source.error || days.error || hours.error || minutes.error || error) && (
        <p role="alert">{source.error || days.error || hours.error || minutes.error || error}</p>
      )}
      {view && <ValueList rows={rowsOf(view)} />}
    </TimeSection>
  );
}
