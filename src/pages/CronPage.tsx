import { useState } from 'react';
import { explainCron, type CronExplain } from '../cron/explainCron';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function CronPage() {
  const { m, lang } = useI18n();
  const copy = m.cron;
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CronExplain, { ok: true }> | null>(null);
  useLangChange(() => {
    if (result || error) explain();
  });

  function explain() {
    const next = explainCron(input, lang);
    if (!next.ok) {
      setError(next.message);
      setResult(null);
      return;
    }
    setError(null);
    setResult(next);
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <input
        className="wide-input"
        type="text"
        value={input}
        placeholder={copy.placeholder}
        aria-label={copy.placeholder}
        onChange={(event) => setInput(event.target.value)}
      />
      <div className="row">
        <button type="button" onClick={explain}>{copy.explain}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && (
        <ul>
          {result.fields.map((field) => <li key={field.label}>{field.label} {field.text}</li>)}
        </ul>
      )}
      {result && <h2>{copy.next}</h2>}
      {result && result.next.length === 0 && <p>{copy.none}</p>}
      {result && result.next.length > 0 && (
        <ol>{result.next.map((time) => <li key={time}>{time}</li>)}</ol>
      )}
    </ToolPage>
  );
}
