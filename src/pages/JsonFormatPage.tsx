import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copyText } from '../format';
import { compressJsonText, formatJsonText } from '../json/formatJson';
import { SiteFooter } from './SiteFooter';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';
import { useLangChange } from './useLangChange';

export default function JsonFormatPage() {
  const { m, lang, to } = useI18n();
  const copy = m.json;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  usePageTitle(copy.title);
  useLangChange(() => {
    setCopied(false);
    if (!error) return;
    const result = formatJsonText(text, lang);
    setError(result.ok ? null : result.message);
  });

  function apply(mode: 'format' | 'compress') {
    const result = mode === 'format' ? formatJsonText(text, lang) : compressJsonText(text, lang);
    setCopied(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setText(result.text);
  }

  async function copyResult() {
    if (!text.trim()) {
      setError(copy.empty);
      return;
    }
    await copyText(text);
    setCopied(true);
  }

  return (
    <main>
      <p><Link to={to('/')}>{m.backHome}</Link></p>
      <h1>{copy.title}</h1>
      <p className="privacy">{m.localText}</p>
      <textarea
        className="json-box"
        value={text}
        spellCheck={false}
        placeholder={copy.placeholder}
        onChange={(event) => {
          setText(event.target.value);
          setCopied(false);
        }}
      />
      <div className="row">
        <button type="button" onClick={() => apply('format')}>{copy.format}</button>
        <button type="button" onClick={() => apply('compress')}>{copy.compress}</button>
        <button type="button" onClick={() => void copyResult()}>{m.copy}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {copied && <p>{m.copied}</p>}
      <SiteFooter />
    </main>
  );
}
