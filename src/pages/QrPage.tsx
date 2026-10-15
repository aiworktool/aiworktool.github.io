import { useState } from 'react';
import { makeQr } from '../qr/makeQr';
import { ToolPage } from './ToolPage';

export default function QrPage() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const result = await makeQr(text);
    if (!result.ok) {
      setImage(null);
      setError(result.message);
      return;
    }
    setError(null);
    setImage(result.url);
  }

  function download() {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = 'qr.png';
    link.click();
  }

  return (
    <ToolPage title="二维码生成" note="这段文字只在本机生成二维码，不上传。">
      <textarea
        className="json-box"
        value={text}
        spellCheck={false}
        placeholder="在这里粘贴文字或链接"
        aria-label="二维码内容"
        onChange={(event) => setText(event.target.value)}
      />
      <div className="row">
        <button type="button" onClick={() => void generate()}>生成</button>
        <button type="button" onClick={download} disabled={!image}>下载 PNG</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {image && <img className="qr-preview" src={image} alt="生成的二维码" />}
    </ToolPage>
  );
}
