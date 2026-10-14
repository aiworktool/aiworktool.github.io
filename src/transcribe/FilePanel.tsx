import { useState } from 'react';
import { codeOf, errorText } from '../errors';
import { loadAudioBlob } from './audioDecode';
import { useJob } from '../pages/jobContext';

export function FilePanel() {
  const job = useJob();
  const [name, setName] = useState('');
  const busy =
    job.state.phase === 'loading' ||
    job.state.phase === 'transcribing' ||
    job.state.phase === 'paused' ||
    job.state.phase === 'recording';

  async function take(file: File | undefined) {
    if (!file || busy) return;
    try {
      const decoded = await loadAudioBlob(file);
      setName(file.name);
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
      <p>选择一个已有录音，或把文件拖到这里。一次一个。</p>
      <input
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm"
        disabled={busy}
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {name && <p>已选择：{name}</p>}
    </section>
  );
}
