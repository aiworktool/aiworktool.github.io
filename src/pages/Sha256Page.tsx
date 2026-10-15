import { useState } from 'react';
import { sha256Hex } from '../codec/sha256';
import { CodecBox, CopyResult } from './CodecBox';
import { ToolPage } from './ToolPage';

export default function Sha256Page() {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const next = await sha256Hex(text);
    if (!next.ok) {
      setResult('');
      setError(next.message);
      return;
    }
    setError(null);
    setResult(next.text);
  }

  return (
    <ToolPage title="SHA-256" note="只计算摘要，不能解密。计算只在本机进行，不上传。">
      <CodecBox text={text} setText={setText} placeholder="在这里粘贴要计算的文本" label="SHA-256 输入" />
      <div className="row">
        <button type="button" onClick={() => void run()}>计算</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <CopyResult text={result} />}
    </ToolPage>
  );
}
