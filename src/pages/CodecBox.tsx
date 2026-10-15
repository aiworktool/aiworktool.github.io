import { copyText } from '../format';
import { useI18n } from './useI18n';

export function CodecBox({
  text,
  setText,
  placeholder,
  label,
  compact = false,
}: {
  text: string;
  setText: (value: string) => void;
  placeholder: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <textarea
      className={compact ? 'json-box compact-box' : 'json-box'}
      value={text}
      spellCheck={false}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => setText(event.target.value)}
    />
  );
}

function CopyLabel({ text }: { text: string }) {
  const { m } = useI18n();
  return <button type="button" onClick={() => void copyText(text)}>{m.copy}</button>;
}

export function CopyResult({ text }: { text: string }) {
  return (
    <>
      <pre className="json-box result-box">{text}</pre>
      <div className="row">
        <CopyLabel text={text} />
      </div>
    </>
  );
}
