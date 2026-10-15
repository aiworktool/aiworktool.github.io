import { useState } from 'react';
import { codeOf, errorText } from '../errors';
import { loadAudioBlob } from './audioDecode';
import { FilePicker } from '../pages/FilePicker';
import { useJob } from '../pages/jobContext';
import { useI18n } from '../pages/useI18n';

export function FilePanel() {
  const job = useJob();
  const { m } = useI18n();
  const [name, setName] = useState('');
  const busy =
    job.state.phase === 'loading' ||
    job.state.phase === 'transcribing' ||
    job.state.phase === 'paused' ||
    job.state.phase === 'recording';

  async function take(file: File | undefined) {
    if (!file || busy) return;
    setName(file.name);
    try {
      const decoded = await loadAudioBlob(file);
      job.takeAudio(decoded.pcm, decoded.durationSec, false);
    } catch (err) {
      job.fail(errorText(codeOf(err), 'audio'));
    }
  }

  return (
    <section
      className="panel drop"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!busy) void take(event.dataTransfer.files[0]);
      }}
    >
      <p>{m.record.drop}</p>
      <FilePicker
        accept="audio/*,.mp3,.wav,.m4a,.webm"
        disabled={busy}
        fileName={name}
        onFile={(file) => void take(file)}
      />
    </section>
  );
}
