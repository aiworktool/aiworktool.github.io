import { useState } from 'react';
import { convertTimeInput, formatLocal, type InstantView } from '../time/timeTools';
import { useTextField, ValueList, rowsOf } from './TimeBits';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export function TimeTools({ embedded = false }: { embedded?: boolean }) {
  const { m, lang } = useI18n();
  const copy = m.time;
  const field = useTextField();
  const [view, setView] = useState<InstantView | null>(null);

  function show(input: string) {
    const result = convertTimeInput(input, lang);
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

  useLangChange(() => {
    if (view) show(field.text);
    else field.setError(null);
  });

  return (
    <section className={embedded ? 'panel time-module' : 'time-module'} aria-label={copy.title}>
      {embedded && <p className="tool-group">{copy.title}</p>}
      <input
        type="text"
        value={field.text}
        spellCheck={false}
        aria-label={copy.field}
        placeholder={copy.placeholder}
        onChange={(event) => {
          setView(null);
          field.onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') show(field.text);
        }}
      />
      <p className="time-hint">{copy.hint}</p>
      <div className="row">
        <button type="button" onClick={() => show(field.text)}>{copy.convert}</button>
        <button type="button" onClick={fillNow}>{copy.now}</button>
      </div>
      {field.error && <p role="alert">{field.error}</p>}
      {view && <ValueList rows={rowsOf(view, copy)} />}
    </section>
  );
}
