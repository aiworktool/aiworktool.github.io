import { useState } from 'react';
import { sha256Hex } from '../codec/sha256';
import { CodecBox, CopyResult } from './CodecBox';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

export default function Sha256Page() {
  const { m, lang } = useI18n();
  const copy = m.sha;
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const next = await sha256Hex(text, lang);
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
        <button type="button" onClick={() => void run()}>{copy.run}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <CopyResult text={result} />}
    </ToolPage>
  );
}
