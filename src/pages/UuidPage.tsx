import { useState } from 'react';
import { makeUuids } from '../id/makeId';
import { CopyButton } from './TimeBits';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function UuidPage() {
  const { m, lang } = useI18n();
  const copy = m.uuid;
  const [count, setCount] = useState('1');
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useLangChange(() => {
    if (error) generate();
  });

  function generate() {
    const result = makeUuids(Number(count), lang);
    if (!result.ok) {
      setError(result.message);
      setValues([]);
      return;
    }
    setError(null);
    setValues(result.values);
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <label className="time-field">
        <span>{copy.count}</span>
        <input type="number" min={1} max={20} value={count} onChange={(event) => setCount(event.target.value)} />
      </label>
      <div className="row">
        <button type="button" onClick={generate}>{copy.generate}</button>
        {values.length > 0 && <CopyButton label={copy.copyAll} text={values.join('\n')} />}
      </div>
      {error && <p role="alert">{error}</p>}
      {values.length > 0 && <pre className="result-box">{values.join('\n')}</pre>}
    </ToolPage>
  );
}
