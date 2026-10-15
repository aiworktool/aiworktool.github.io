import { useState } from 'react';
import { compareUrlStatusText, compareUrls, type UrlRow } from '../url/diffUrl';
import { DiffLines } from './DiffLines';
import { ToolPage } from './ToolPage';

function CompareBlock({ title, rows, empty }: { title: string; rows: UrlRow[]; empty?: string }) {
  if (rows.length === 0 && !empty) return null;
  return (
    <>
      <h2>{title}</h2>
      {rows.length === 0 ? <p>{empty}</p> : (
        <div className="diff-columns">
          <DiffLines rows={rows} side="left" label={`左边的${title}`} />
          <DiffLines rows={rows} side="right" label={`右边的${title}`} />
        </div>
      )}
    </>
  );
}

export default function UrlDiffPage() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [domainRows, setDomainRows] = useState<UrlRow[]>([]);
  const [paramRows, setParamRows] = useState<UrlRow[]>([]);
  const [compared, setCompared] = useState(false);

  function compare() {
    const result = compareUrls(left, right);
    if (!result.ok) {
      setError(result.message);
      setSummary(null);
      setDomainRows([]);
      setParamRows([]);
      setCompared(false);
      return;
    }
    setError(null);
    setSummary(compareUrlStatusText(result.status));
    setDomainRows(result.domainRows);
    setParamRows(result.paramRows);
    setCompared(true);
  }

  const paramEmpty = compared && paramRows.length === 0 ? '两边都没有请求参数。' : undefined;

  return (
    <ToolPage title="URL 参数比较" note="这两段地址只在本机比较，不上传。">
      <div className="diff-columns">
        <textarea
          className="json-box"
          value={left}
          spellCheck={false}
          placeholder="左边的 URL"
          aria-label="左边的 URL"
          onChange={(event) => setLeft(event.target.value)}
        />
        <textarea
          className="json-box"
          value={right}
          spellCheck={false}
          placeholder="右边的 URL"
          aria-label="右边的 URL"
          onChange={(event) => setRight(event.target.value)}
        />
      </div>
      <div className="row">
        <button type="button" onClick={compare}>比较</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {summary && <p>{summary}</p>}
      <CompareBlock title="域名和路径" rows={domainRows} />
      <CompareBlock title="请求参数" rows={paramRows} empty={paramEmpty} />
    </ToolPage>
  );
}
