import { useRef, useState } from 'react';
import { decodeBase64, encodeBase64 } from '../codec/base64';
import { CodecBox, CopyResult } from './CodecBox';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function Base64Page() {
  const { m, lang } = useI18n();
  const copy = m.base64;
  const [text, setText] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const modeRef = useRef<'encode' | 'decode' | null>(null);
  useLangChange(() => {
    if (error && modeRef.current) run(modeRef.current);
  });

  function run(mode: 'encode' | 'decode') {
    modeRef.current = mode;
    const next = mode === 'encode' ? encodeBase64(text, urlSafe, lang) : decodeBase64(text, urlSafe, lang);
    if (!next.ok) {
      setResult('');
      setError(next.message);
      return;
    }
    setError(null);
    setResult(next.text);
  }

  return (
    <ToolPage title={copy.title} note={m.localText}>
      <CodecBox text={text} setText={setText} placeholder={copy.placeholder} label={copy.label} />
      <label className="option">
        <input type="checkbox" checked={urlSafe} onChange={(event) => setUrlSafe(event.target.checked)} />
        {copy.urlSafe}
      </label>
      <div className="row">
        <button type="button" onClick={() => run('encode')}>{copy.encode}</button>
        <button type="button" onClick={() => run('decode')}>{copy.decode}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <CopyResult text={result} />}
    </ToolPage>
  );
}
