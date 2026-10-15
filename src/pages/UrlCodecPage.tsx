import { useRef, useState } from 'react';
import { decodeUrl, encodeUrl } from '../codec/urlCodec';
import { CodecBox, CopyResult } from './CodecBox';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function UrlCodecPage() {
  const { m, lang } = useI18n();
  const copy = m.urlCodec;
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const modeRef = useRef<'encode' | 'decode' | null>(null);
  useLangChange(() => {
    if (error && modeRef.current) run(modeRef.current);
  });

  function run(mode: 'encode' | 'decode') {
    modeRef.current = mode;
    const next = mode === 'encode' ? encodeUrl(text, lang) : decodeUrl(text, lang);
    if (!next.ok) {
      setResult('');
      setError(next.message);
      return;
    }
    setError(null);
    setResult(next.text);
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <CodecBox text={text} setText={setText} placeholder={copy.placeholder} label={copy.label} />
      <div className="row">
        <button type="button" onClick={() => run('encode')}>{copy.encode}</button>
        <button type="button" onClick={() => run('decode')}>{copy.decode}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <CopyResult text={result} />}
    </ToolPage>
  );
}
