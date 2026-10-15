import { useRef } from 'react';
import { useI18n } from './useI18n';

export function FilePicker({
  accept,
  disabled = false,
  fileName,
  onFile,
}: {
  accept: string;
  disabled?: boolean;
  fileName: string;
  onFile: (file: File | undefined) => void;
}) {
  const { m } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="file-picker">
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {m.chooseFile}
      </button>
      <span>{fileName || m.noFile}</span>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
