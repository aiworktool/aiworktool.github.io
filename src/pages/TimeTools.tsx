import { useState } from 'react';
import { convertTimeInput, formatLocal, type InstantView } from '../time/timeTools';
import { useTextField, ValueList, rowsOf } from './TimeBits';

export function TimeTools({ embedded = false }: { embedded?: boolean }) {
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
    <section className={embedded ? 'panel time-module' : 'time-module'} aria-label="时间工具">
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
        onKeyDown={(event) => {
          if (event.key === 'Enter') show(field.text);
        }}
      />
      <p className="time-hint">不带时区的日期按本机时间。10 位数字按秒，13 位按毫秒。</p>
      <div className="row">
        <button type="button" onClick={() => show(field.text)}>转换</button>
        <button type="button" onClick={fillNow}>填入现在</button>
      </div>
      {field.error && <p role="alert">{field.error}</p>}
      {view && <ValueList rows={rowsOf(view)} />}
    </section>
  );
}
