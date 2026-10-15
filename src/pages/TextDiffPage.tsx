import { useState } from 'react';
import { comparePlainText, type TextCompare } from '../text/diffText';
import { DiffLines } from './DiffLines';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

export default function TextDiffPage() {
  const { m, lang } = useI18n();
  const copy = m.textDiff;
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<TextCompare, { ok: true }> | null>(null);
  useLangChange(() => {
    if (result || error) compare();
  });

  function compare() {
    const next = comparePlainText(left, right, lang);
    if (!next.ok) {
      setError(next.message);
      setResult(null);
      return;
    }
    setError(null);
    setResult(next);
  }

  return (
    <ToolPage title={copy.title} note={copy.privacy}>
      <div className="diff-columns">
        <textarea
          className="json-box"
          value={left}
          spellCheck={false}
          aria-label={copy.left}
          placeholder={copy.left}
          onChange={(event) => setLeft(event.target.value)}
        />
        <textarea
          className="json-box"
          value={right}
          spellCheck={false}
          aria-label={copy.right}
          placeholder={copy.right}
          onChange={(event) => setRight(event.target.value)}
        />
      </div>
      <div className="row">
        <button type="button" onClick={compare}>{copy.compare}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && <p>{result.same ? copy.same : copy.different}</p>}
      {result && !result.same && (
        <div className="diff-columns">
          <DiffLines rows={result.rows} side="left" label={copy.leftColumn} />
          <DiffLines rows={result.rows} side="right" label={copy.rightColumn} />
        </div>
      )}
    </ToolPage>
  );
}
