import { useState } from 'react';
import { decodeUrl, encodeUrl } from '../codec/urlCodec';
import { CodecBox, CopyResult } from './CodecBox';
import { ToolPage } from './ToolPage';

export default function UrlCodecPage() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(mode: 'encode' | 'decode') {
    const next = mode === 'encode' ? encodeUrl(text) : decodeUrl(text);
    if (!next.ok) {
      setResult('');
      setError(next.message);
      return;
    }
    setError(null);
    setResult(next.text);
  }

  return (
    <ToolPage title="URL 编码" note="按查询参数的规则处理，空格会变成 %20。这不是给整段网址用的。文字只在本机处理，不上传。">
      <CodecBox text={text} setText={setText} placeholder="在这里粘贴查询参数" label="URL 编码输入" />
      <div className="row">
        <button type="button" onClick={() => run('encode')}>编码</button>
        <button type="button" onClick={() => run('decode')}>解码</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <CopyResult text={result} />}
    </ToolPage>
  );
}
