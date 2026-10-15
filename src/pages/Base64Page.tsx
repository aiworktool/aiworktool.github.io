import { useState } from 'react';
import { decodeBase64, encodeBase64 } from '../codec/base64';
import { CodecBox, CopyResult } from './CodecBox';
import { ToolPage } from './ToolPage';

export default function Base64Page() {
  const [text, setText] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(mode: 'encode' | 'decode') {
    const next = mode === 'encode' ? encodeBase64(text, urlSafe) : decodeBase64(text, urlSafe);
    if (!next.ok) {
      setResult('');
      setError(next.message);
      return;
    }
    setError(null);
    setResult(next.text);
  }

  return (
    <ToolPage title="Base64" note="这段文字只在本机处理，不上传。">
      <CodecBox text={text} setText={setText} placeholder="在这里粘贴文本或 Base64" label="Base64 输入" />
      <label className="option">
        <input type="checkbox" checked={urlSafe} onChange={(event) => setUrlSafe(event.target.checked)} />
        URL 安全（把 + / 换成 - _）
      </label>
      <div className="row">
        <button type="button" onClick={() => run('encode')}>编码</button>
        <button type="button" onClick={() => run('decode')}>解码</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <CopyResult text={result} />}
    </ToolPage>
  );
}
