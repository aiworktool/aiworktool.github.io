import { useState } from 'react';
import { imageDataUrl, imageFileError } from '../image/imageBase64';
import { CopyButton } from './TimeBits';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

export default function ImageBase64Page() {
  const { m, lang } = useI18n();
  const copy = m.image64;
  const [file, setFile] = useState<File | null>(null);
  const [encoded, setEncoded] = useState('');
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(next: File | undefined) {
    if (!next) return;
    const message = imageFileError(next, lang);
    setError(message);
    setFile(message ? null : next);
  }

  function toBase64() {
    if (!file) return;
    const message = imageFileError(file, lang);
    if (message) {
      setError(message);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEncoded(String(reader.result ?? ''));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function fromBase64() {
    const result = imageDataUrl(source, lang);
    if (!result.ok) {
      setPreview(null);
      setError(result.message);
      return;
    }
    setError(null);
    setPreview(result.url);
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <label className="time-field">
        <span>{copy.choose}</span>
        <input type="file" accept="image/*" onChange={(event) => choose(event.target.files?.[0])} />
      </label>
      <div className="row">
        <button type="button" onClick={toBase64} disabled={!file}>{copy.toBase64}</button>
      </div>
      {encoded && (
        <>
          <pre className="result-box">{encoded}</pre>
          <CopyButton label={m.copy} text={encoded} />
        </>
      )}
      <textarea
        className="json-box compact-box"
        value={source}
        spellCheck={false}
        placeholder={copy.placeholder}
        aria-label={copy.placeholder}
        onChange={(event) => setSource(event.target.value)}
      />
      <div className="row">
        <button type="button" onClick={fromBase64}>{copy.fromBase64}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {preview && <img className="preview-image" src={preview} alt={copy.alt} />}
    </ToolPage>
  );
}
