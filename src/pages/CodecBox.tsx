import { copyText } from '../format';

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

export function CopyResult({ text }: { text: string }) {
  return (
    <>
      <pre className="json-box result-box">{text}</pre>
      <div className="row">
        <button type="button" onClick={() => void copyText(text)}>复制</button>
      </div>
    </>
  );
}
