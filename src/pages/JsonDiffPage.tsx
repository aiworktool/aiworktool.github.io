import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fill } from '../i18n/lang';
import { compareJsonText, compareStatusText, type SideRow } from '../json/diffJson';
import { formatJsonText } from '../json/formatJson';
import { DiffLines } from './DiffLines';
import { SiteFooter } from './SiteFooter';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';
import { usePageTitle } from './usePageTitle';

export default function JsonDiffPage() {
  const { m, lang, to } = useI18n();
  const copy = m.json;
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [rows, setRows] = useState<SideRow[]>([]);
  usePageTitle(copy.diffTitle);
  useLangChange(() => {
    if (summary || rows.length > 0) compare();
  });

  function clearMarks() {
    setRows([]);
    setSummary(null);
  }

  function formatBoth() {
    const nextLeft = formatJsonText(left, lang);
    const nextRight = formatJsonText(right, lang);
    clearMarks();
    if (nextLeft.ok) setLeft(nextLeft.text);
    if (nextRight.ok) setRight(nextRight.text);
    if (!nextLeft.ok) setError(fill(copy.leftSide, { message: nextLeft.message }));
    else if (!nextRight.ok) setError(fill(copy.rightSide, { message: nextRight.message }));
    else setError(null);
  }

  function compare() {
    const result = compareJsonText(left, right, lang);
    if (!result.ok) {
      setError(result.message);
      clearMarks();
      return;
    }
    setError(null);
    setLeft(result.left);
    setRight(result.right);
    setSummary(compareStatusText(result.status, lang));
    setRows(result.status === 'identical' ? [] : result.rows);
  }

  const marked = rows.length > 0;

  return (
    <main>
      <p><Link to={to('/')}>{m.backHome}</Link></p>
      <h1>{copy.diffTitle}</h1>
      <p className="privacy">{copy.privacyPair}</p>
      <div className="diff-columns">
        {marked ? (
          <DiffLines rows={rows} side="left" label={copy.left} />
        ) : (
          <textarea
            className="json-box"
            value={left}
            spellCheck={false}
            placeholder={copy.left}
            aria-label={copy.left}
            onChange={(event) => setLeft(event.target.value)}
          />
        )}
        {marked ? (
          <DiffLines rows={rows} side="right" label={copy.right} />
        ) : (
          <textarea
            className="json-box"
            value={right}
            spellCheck={false}
            placeholder={copy.right}
            aria-label={copy.right}
            onChange={(event) => setRight(event.target.value)}
          />
        )}
      </div>
      <div className="row">
        <button type="button" onClick={formatBoth}>{copy.format}</button>
        <button type="button" onClick={compare}>{copy.compare}</button>
        {marked && <button type="button" onClick={clearMarks}>{copy.editAgain}</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {summary && <p>{summary}</p>}
      <SiteFooter />
    </main>
  );
}
