import { useEffect, useRef, useState } from 'react';
import type { RegexFlags, RegexMatch, RegexResult } from '../codec/regexTool';
import { CodecBox } from './CodecBox';
import { ToolPage } from './ToolPage';

const EMPTY_FLAGS: RegexFlags = { global: true, ignoreCase: false, multiline: false };

function FlagBox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="option">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {label}
    </label>
  );
}

export default function RegexPage() {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [flags, setFlags] = useState<RegexFlags>(EMPTY_FLAGS);
  const [matches, setMatches] = useState<RegexMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  function apply(result: RegexResult) {
    if (!result.ok) {
      setMatches(null);
      setError(result.message);
      return;
    }
    setError(null);
    setMatches(result.matches);
  }

  function run() {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../codec/regex.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    const timer = window.setTimeout(() => {
      worker.terminate();
      setMatches(null);
      setError('表达式可能过慢，已停止。');
    }, 800);
    worker.onmessage = (event: MessageEvent<RegexResult>) => {
      window.clearTimeout(timer);
      worker.terminate();
      apply(event.data);
    };
    worker.postMessage({ pattern, text, flags });
  }

  function toggle(key: keyof RegexFlags) {
    setFlags((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <ToolPage title="正则测试" note="这里是 JavaScript 正则，和 Java、Go、Python 有差异。文字只在本机处理，不上传。">
      <CodecBox text={pattern} setText={setPattern} placeholder="表达式，例如 \\d+" label="正则表达式" compact />
      <CodecBox text={text} setText={setText} placeholder="待测文本" label="待测文本" />
      <div className="row">
        <FlagBox label="全局" checked={flags.global} onToggle={() => toggle('global')} />
        <FlagBox label="忽略大小写" checked={flags.ignoreCase} onToggle={() => toggle('ignoreCase')} />
        <FlagBox label="多行" checked={flags.multiline} onToggle={() => toggle('multiline')} />
      </div>
      <div className="row">
        <button type="button" onClick={run}>测试</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {matches && matches.length === 0 && <p>没有匹配。</p>}
      {matches && matches.length > 0 && (
        <ol className="match-list">
          {matches.map((match, index) => (
            <li key={`${match.text}-${index}`}>
              {match.text || '（空匹配）'}
              {match.groups.length > 0 && <span> 捕获：{match.groups.join('，')}</span>}
            </li>
          ))}
        </ol>
      )}
    </ToolPage>
  );
}
