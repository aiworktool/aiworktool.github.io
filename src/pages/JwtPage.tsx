import { useState } from 'react';
import { decodeJwt, type JwtView } from '../codec/jwt';
import { CodecBox } from './CodecBox';
import { ToolPage } from './ToolPage';

export default function JwtPage() {
  const [text, setText] = useState('');
  const [view, setView] = useState<JwtView | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const next = decodeJwt(text);
    if (!next.ok) {
      setView(null);
      setError(next.message);
      return;
    }
    setError(null);
    setView(next.view);
  }

  return (
    <ToolPage title="JWT 解码" note="只解码，不验证签名，不能用来判断这枚令牌是真是假。文字只在本机处理，不上传。">
      <CodecBox text={text} setText={setText} placeholder="在这里粘贴 JWT" label="JWT 输入" />
      <div className="row">
        <button type="button" onClick={run}>解码</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {view && (
        <>
          <h2>头部</h2>
          <pre className="json-box result-box">{view.header}</pre>
          <h2>载荷</h2>
          <pre className="json-box result-box">{view.payload}</pre>
          {view.notes.map((note) => <p key={note}>{note}</p>)}
        </>
      )}
    </ToolPage>
  );
}
