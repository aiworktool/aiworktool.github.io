import { useState } from 'react';
import { convertTimeInput, describeInstant, formatLocal, type InstantView } from '../time/timeTools';
import { DiffSection, ShiftSection } from './TimeCalc';
import { TimeSection, useNow, useTextField, ValueList, rowsOf } from './TimeBits';

function ClockSection({ level }: { level: 'h2' | 'h3' }) {
  const now = useNow();
  const result = describeInstant(now);
  return (
    <TimeSection title="当前时间" level={level}>
      {result.ok ? <ValueList rows={rowsOf(result.view)} /> : <p role="alert">{result.message}</p>}
    </TimeSection>
  );
}

function ConvertSection({ level }: { level: 'h2' | 'h3' }) {
  const field = useTextField();
  const [view, setView] = useState<InstantView | null>(null);

  function show(input: string) {
    const result = convertTimeInput(input);
    if (!result.ok) {
      field.setError(result.message);
      setView(null);
      return;
    }
    field.setError(null);
    setView(result.view);
  }

  function fillNow() {
    const local = formatLocal(Date.now());
    field.setText(local);
    show(local);
  }

  return (
    <TimeSection title="时间戳转换" level={level}>
      <p className="time-hint">不带时区的日期按本机时间。10 位数字按秒，13 位按毫秒。</p>
      <input
        type="text"
        value={field.text}
        spellCheck={false}
        aria-label="时间戳或日期"
        placeholder="1700000000 或 2023-11-15 06:13:20"
        onChange={(event) => {
          setView(null);
          field.onChange(event.target.value);
        }}
      />
      <div className="row">
        <button type="button" onClick={() => show(field.text)}>转换</button>
        <button type="button" onClick={fillNow}>填入现在</button>
      </div>
      {field.error && <p role="alert">{field.error}</p>}
      {view && <ValueList rows={rowsOf(view)} />}
    </TimeSection>
  );
}

export function TimeTools({ embedded = false }: { embedded?: boolean }) {
  const level = embedded ? 'h3' : 'h2';
  return (
    <section className={embedded ? 'panel time-module' : 'time-module'} aria-label="时间工具">
      {embedded && <h2>时间工具</h2>}
      {embedded && <p className="privacy">这些时间只在本机计算，不上传。</p>}
      <ClockSection level={level} />
      <ConvertSection level={level} />
      <DiffSection level={level} />
      <ShiftSection level={level} />
    </section>
  );
}
