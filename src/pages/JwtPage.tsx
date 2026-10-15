import { useState } from 'react';
import { decodeJwt, type JwtView } from '../codec/jwt';
import { CodecBox } from './CodecBox';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function JwtPage() {
  const { m, lang } = useI18n();
  const copy = m.jwt;
  const [text, setText] = useState('');
  const [view, setView] = useState<JwtView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useLangChange(() => {
    if (error) run();
  });

  function run() {
    const next = decodeJwt(text, lang);
    if (!next.ok) {
      setView(null);
      setError(next.message);
      return;
    }
    setError(null);
    setView(next.view);
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <CodecBox text={text} setText={setText} placeholder={copy.placeholder} label={copy.label} />
      <div className="row">
        <button type="button" onClick={run}>{copy.run}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {view && (
        <>
          <h2>{copy.header}</h2>
          <pre className="json-box result-box">{view.header}</pre>
          <h2>{copy.payload}</h2>
          <pre className="json-box result-box">{view.payload}</pre>
          {view.notes.map((note) => <p key={note}>{note}</p>)}
        </>
      )}
    </ToolPage>
  );
}
