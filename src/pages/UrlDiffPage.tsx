import { useState } from 'react';
import { fill } from '../i18n/lang';
import { compareUrlStatusText, compareUrls, type UrlRow } from '../url/diffUrl';
import { DiffLines } from './DiffLines';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

function CompareBlock({ title, rows, empty }: { title: string; rows: UrlRow[]; empty?: string }) {
  const { m } = useI18n();
  if (rows.length === 0 && !empty) return null;
  return (
    <>
      <h2>{title}</h2>
      {rows.length === 0 ? <p>{empty}</p> : (
        <div className="diff-columns">
          <DiffLines rows={rows} side="left" label={fill(m.url.leftColumn, { title })} />
          <DiffLines rows={rows} side="right" label={fill(m.url.rightColumn, { title })} />
        </div>
      )}
    </>
  );
}

export default function UrlDiffPage() {
  const { m, lang } = useI18n();
  const copy = m.url;
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [domainRows, setDomainRows] = useState<UrlRow[]>([]);
  const [paramRows, setParamRows] = useState<UrlRow[]>([]);
  const [compared, setCompared] = useState(false);
  useLangChange(() => {
    if (compared) compare();
  });

  function compare() {
    const result = compareUrls(left, right, lang);
    if (!result.ok) {
      setError(result.message);
      setSummary(null);
      setDomainRows([]);
      setParamRows([]);
      setCompared(false);
      return;
    }
    setError(null);
    setSummary(compareUrlStatusText(result.status, lang));
    setDomainRows(result.domainRows);
    setParamRows(result.paramRows);
    setCompared(true);
  }

  const paramEmpty = compared && paramRows.length === 0 ? copy.noParams : undefined;

  return (
    <ToolPage title={copy.title} note={copy.privacy}>
      <div className="diff-columns">
        <textarea
          className="json-box"
          value={left}
          spellCheck={false}
          placeholder={copy.left}
          aria-label={copy.left}
          onChange={(event) => setLeft(event.target.value)}
        />
        <textarea
          className="json-box"
          value={right}
          spellCheck={false}
          placeholder={copy.right}
          aria-label={copy.right}
          onChange={(event) => setRight(event.target.value)}
        />
      </div>
      <div className="row">
        <button type="button" onClick={compare}>{copy.compare}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {summary && <p>{summary}</p>}
      <CompareBlock title={copy.domain} rows={domainRows} />
      <CompareBlock title={copy.params} rows={paramRows} empty={paramEmpty} />
    </ToolPage>
  );
}
