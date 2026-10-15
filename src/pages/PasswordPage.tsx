import { useState } from 'react';
import { makePassword, type PasswordSets } from '../id/makeId';
import { CopyButton } from './TimeBits';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

const INITIAL: PasswordSets = { upper: true, lower: true, digit: true, symbol: true };

export default function PasswordPage() {
  const { m, lang } = useI18n();
  const copy = m.password;
  const [length, setLength] = useState('16');
  const [sets, setSets] = useState(INITIAL);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof PasswordSets) {
    setSets((current) => ({ ...current, [key]: !current[key] }));
  }

  function generate() {
    const result = makePassword(Number(length), sets, lang);
    if (!result.ok) {
      setError(result.message);
      setValue('');
      return;
    }
    setError(null);
    setValue(result.value);
  }

  return (
    <ToolPage title={copy.title} note={copy.note}>
      <label className="time-field">
        <span>{copy.length}</span>
        <input type="number" min={8} max={64} value={length} onChange={(event) => setLength(event.target.value)} />
      </label>
      <div className="checks">
        <SetBox name={copy.upper} checked={sets.upper} onChange={() => toggle('upper')} />
        <SetBox name={copy.lower} checked={sets.lower} onChange={() => toggle('lower')} />
        <SetBox name={copy.digit} checked={sets.digit} onChange={() => toggle('digit')} />
        <SetBox name={copy.symbol} checked={sets.symbol} onChange={() => toggle('symbol')} />
      </div>
      <div className="row">
        <button type="button" onClick={generate}>{copy.generate}</button>
        {value && <CopyButton label={copy.generate} text={value} />}
      </div>
      {error && <p role="alert">{error}</p>}
      {value && <pre className="result-box">{value}</pre>}
    </ToolPage>
  );
}

function SetBox({ name, checked, onChange }: { name: string; checked: boolean; onChange: () => void }) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {name}
    </label>
  );
}
