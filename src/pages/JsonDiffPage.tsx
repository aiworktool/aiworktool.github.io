import { useState } from 'react';
import { Link } from 'react-router-dom';
import { compareJsonText, compareStatusText, type SideRow } from '../json/diffJson';
import { formatJsonText } from '../json/formatJson';
import { DiffLines } from './DiffLines';
import { SiteFooter } from './SiteFooter';
import { usePageTitle } from './usePageTitle';

const TITLE = 'JSON 格式化比较';

export default function JsonDiffPage() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [rows, setRows] = useState<SideRow[]>([]);
  usePageTitle(TITLE);

  function clearMarks() {
    setRows([]);
    setSummary(null);
  }

  function formatBoth() {
    const nextLeft = formatJsonText(left);
    const nextRight = formatJsonText(right);
    clearMarks();
    if (nextLeft.ok) setLeft(nextLeft.text);
    if (nextRight.ok) setRight(nextRight.text);
    if (!nextLeft.ok) setError(`左边：${nextLeft.message}`);
    else if (!nextRight.ok) setError(`右边：${nextRight.message}`);
    else setError(null);
  }

  function compare() {
    const result = compareJsonText(left, right);
    if (!result.ok) {
      setError(result.message);
      clearMarks();
      return;
    }
    setError(null);
    setLeft(result.left);
    setRight(result.right);
    setSummary(compareStatusText(result.status));
    setRows(result.status === 'identical' ? [] : result.rows);
  }

  const marked = rows.length > 0;

  return (
    <main>
      <p><Link to="/">返回首页</Link></p>
      <h1>{TITLE}</h1>
      <p className="privacy">这两段文字只在本机处理，不上传。</p>
      <div className="diff-columns">
        {marked ? (
          <DiffLines rows={rows} side="left" label="左边的 JSON" />
        ) : (
          <textarea
            className="json-box"
            value={left}
            spellCheck={false}
            placeholder="左边的 JSON"
            aria-label="左边的 JSON"
            onChange={(event) => setLeft(event.target.value)}
          />
        )}
        {marked ? (
          <DiffLines rows={rows} side="right" label="右边的 JSON" />
        ) : (
          <textarea
            className="json-box"
            value={right}
            spellCheck={false}
            placeholder="右边的 JSON"
            aria-label="右边的 JSON"
            onChange={(event) => setRight(event.target.value)}
          />
        )}
      </div>
      <div className="row">
        <button type="button" onClick={formatBoth}>格式化</button>
        <button type="button" onClick={compare}>比较</button>
        {marked && <button type="button" onClick={clearMarks}>继续编辑</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {summary && <p>{summary}</p>}
      <SiteFooter />
    </main>
  );
}
