import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copyText } from '../format';
import { compressJsonText, formatJsonText } from '../json/formatJson';
import { SiteFooter } from './SiteFooter';
import { usePageTitle } from './usePageTitle';

const TITLE = 'JSON 格式化';

export default function JsonFormatPage() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  usePageTitle(TITLE);

  function apply(mode: 'format' | 'compress') {
    const result = mode === 'format' ? formatJsonText(text) : compressJsonText(text);
    setCopied(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setText(result.text);
  }

  async function copy() {
    if (!text.trim()) {
      setError('请先粘贴 JSON。');
      return;
    }
    await copyText(text);
    setCopied(true);
  }

  return (
    <main>
      <p><Link to="/">返回首页</Link></p>
      <h1>{TITLE}</h1>
      <p className="privacy">这段文字只在本机处理，不上传。</p>
      <textarea
        className="json-box"
        value={text}
        spellCheck={false}
        placeholder="在这里粘贴 JSON"
        onChange={(event) => {
          setText(event.target.value);
          setCopied(false);
        }}
      />
      <div className="row">
        <button type="button" onClick={() => apply('format')}>格式化</button>
        <button type="button" onClick={() => apply('compress')}>压缩</button>
        <button type="button" onClick={() => void copy()}>复制</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {copied && <p>已复制。</p>}
      <SiteFooter />
    </main>
  );
}
