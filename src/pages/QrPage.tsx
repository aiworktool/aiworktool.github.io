import { useState } from 'react';
import { makeQr } from '../qr/makeQr';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function QrPage() {
  const { m, lang } = useI18n();
  const copy = m.qr;
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useLangChange(() => {
    if (image || error) void generate();
  });

  async function generate() {
    const result = await makeQr(text, lang);
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
    <ToolPage title={copy.title} note={copy.note}>
      <textarea
        className="json-box"
        value={text}
        spellCheck={false}
        placeholder={copy.placeholder}
        aria-label={copy.label}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="row">
        <button type="button" onClick={() => void generate()}>{copy.generate}</button>
        <button type="button" onClick={download} disabled={!image}>{copy.download}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {image && <img className="qr-preview" src={image} alt={copy.alt} />}
    </ToolPage>
  );
}
