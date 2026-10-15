import { useEffect, useRef, useState } from 'react';
import type { RegexFlags, RegexMatch, RegexResult } from '../codec/regexTool';
import { fill } from '../i18n/lang';
import { CodecBox } from './CodecBox';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import { useLangChange } from './useLangChange';

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
  const { m, lang } = useI18n();
  const copy = m.regex;
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [flags, setFlags] = useState<RegexFlags>(EMPTY_FLAGS);
  const [matches, setMatches] = useState<RegexMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  useLangChange(() => {
    if (error) run();
  });

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
      setError(copy.slow);
    }, 800);
    worker.onmessage = (event: MessageEvent<RegexResult>) => {
      window.clearTimeout(timer);
      worker.terminate();
      apply(event.data);
    };
    worker.postMessage({ pattern, text, flags, lang });
  }

  function toggle(key: keyof RegexFlags) {
    setFlags((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <CodecBox text={pattern} setText={setPattern} placeholder={copy.pattern} label={copy.patternLabel} compact />
      <CodecBox text={text} setText={setText} placeholder={copy.text} label={copy.textLabel} />
      <div className="row">
        <FlagBox label={copy.global} checked={flags.global} onToggle={() => toggle('global')} />
        <FlagBox label={copy.ignoreCase} checked={flags.ignoreCase} onToggle={() => toggle('ignoreCase')} />
        <FlagBox label={copy.multiline} checked={flags.multiline} onToggle={() => toggle('multiline')} />
      </div>
      <div className="row">
        <button type="button" onClick={run}>{copy.run}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {matches && matches.length === 0 && <p>{copy.none}</p>}
      {matches && matches.length > 0 && (
        <ol className="match-list">
          {matches.map((match, index) => (
            <li key={`${match.text}-${index}`}>
              {match.text || copy.emptyMatch}
              {match.groups.length > 0 && (
                <span>{fill(copy.groups, { groups: match.groups.join(lang === 'en' ? ', ' : '，') })}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </ToolPage>
  );
}
