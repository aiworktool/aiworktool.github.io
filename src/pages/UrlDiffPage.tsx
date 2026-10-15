import { useState } from 'react';
import { compareUrlStatusText, compareUrls, type UrlRow } from '../url/diffUrl';
import { DiffLines } from './DiffLines';
import { ToolPage } from './ToolPage';

export default function UrlDiffPage() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<string | null>(null);
  const [rows, setRows] = useState<UrlRow[]>([]);

  function compare() {
    const result = compareUrls(left, right);
    if (!result.ok) {
      setError(result.message);
      setSummary(null);
      setAddresses(null);
      setRows([]);
      return;
    }
    setError(null);
    setSummary(compareUrlStatusText(result.status));
    const showAddress = result.status === 'address' || result.status === 'params-address';
    setAddresses(showAddress ? `左边：${result.leftAddress}\n右边：${result.rightAddress}` : null);
    setRows(result.status === 'params' || result.status === 'params-address' ? result.rows : []);
  }

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
      {addresses && <pre className="json-box result-box">{addresses}</pre>}
      {rows.length > 0 && (
        <div className="diff-columns">
          <DiffLines rows={rows} side="left" label="左边的参数" />
          <DiffLines rows={rows} side="right" label="右边的参数" />
        </div>
      )}
    </ToolPage>
  );
}
