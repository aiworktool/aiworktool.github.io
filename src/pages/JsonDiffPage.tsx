import { useState } from 'react';
import { Link } from 'react-router-dom';
import { compareJsonText, compareStatusText, type DiffLine } from '../json/diffJson';
import { formatJsonText } from '../json/formatJson';
import { SiteFooter } from './SiteFooter';
import { usePageTitle } from './usePageTitle';

const TITLE = 'JSON 格式化比较';

function DiffList({ lines }: { lines: DiffLine[] }) {
  return (
    <pre className="diff-list">
      {lines.map((line, index) => (
        <div key={`${line.kind}-${index}`} className={`diff-line ${line.kind}`}>
          {line.kind === 'add' ? '+ ' : line.kind === 'remove' ? '- ' : '  '}
          {line.text}
        </div>
      ))}
    </pre>
  );
}

export default function JsonDiffPage() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [lines, setLines] = useState<DiffLine[]>([]);
  usePageTitle(TITLE);

  function formatBoth() {
    const nextLeft = formatJsonText(left);
    const nextRight = formatJsonText(right);
    setSummary(null);
    setLines([]);
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
      setSummary(null);
      setLines([]);
      return;
    }
    setError(null);
    setLeft(result.left);
    setRight(result.right);
    setSummary(compareStatusText(result.status));
    setLines(result.status === 'identical' ? [] : result.lines);
  }

  return (
    <main>
      <p><Link to="/">返回首页</Link></p>
      <h1>{TITLE}</h1>
      <p className="privacy">这两段文字只在本机处理，不上传。</p>
      <div className="diff-columns">
        <textarea
          className="json-box"
          value={left}
          spellCheck={false}
          placeholder="左边的 JSON"
          aria-label="左边的 JSON"
          onChange={(event) => setLeft(event.target.value)}
        />
        <textarea
          className="json-box"
          value={right}
          spellCheck={false}
          placeholder="右边的 JSON"
          aria-label="右边的 JSON"
          onChange={(event) => setRight(event.target.value)}
        />
      </div>
      <div className="row">
        <button type="button" onClick={formatBoth}>格式化</button>
        <button type="button" onClick={compare}>比较</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {summary && <p>{summary}</p>}
      {lines.length > 0 && <DiffList lines={lines} />}
      <SiteFooter />
    </main>
  );
}
