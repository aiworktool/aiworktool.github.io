import { useEffect, useRef, useState } from 'react';
import { AppFailure, codeOf, errorText } from '../errors';
import { formatClock } from '../format';
import { AUDIO_MAX_SECONDS } from './limits';
import { loadAudioBlob } from './audioDecode';
import { pickRecorderMime } from './recorderMime';
import { useI18n } from '../pages/useI18n';
import { useJob } from '../pages/jobContext';

export function RecorderPanel() {
  const job = useJob();
  const { m } = useI18n();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef(0);
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const busy = job.state.phase === 'loading' || job.state.phase === 'transcribing' || job.state.phase === 'paused';

  useEffect(() => () => window.clearInterval(timerRef.current), []);

  async function start() {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickRecorderMime((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void finish(elapsedRef.current >= AUDIO_MAX_SECONDS * 1000);
      };
      const startedAt = performance.now();
      recorder.start();
      job.beginRecording();
      timerRef.current = window.setInterval(() => {
        const ms = performance.now() - startedAt;
        setElapsed(ms);
        elapsedRef.current = ms;
        if (ms >= AUDIO_MAX_SECONDS * 1000) recorder.stop();
      }, 200);
    } catch (err) {
      const code = err instanceof AppFailure ? err.code : codeOf(err);
      const text = code === 'mic-denied'
        ? errorText('mic-denied')
        : m.record.noMic;
      job.fail(text);
    }
  }

  async function finish(limitHit: boolean) {
    window.clearInterval(timerRef.current);
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
    try {
      const decoded = await loadAudioBlob(blob);
      job.takeAudio(decoded.pcm, decoded.durationSec, limitHit);
    } catch (err) {
      job.fail(errorText(codeOf(err), 'audio'));
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  return (
    <section className="panel">
      <p className="timer">{formatClock(elapsed)}</p>
      {job.state.phase === 'recording' ? (
        <button type="button" onClick={stop}>{m.record.stopRec}</button>
      ) : (
        <button type="button" onClick={() => void start()} disabled={busy}>{m.record.startRec}</button>
      )}
      {job.state.limitNote && <p>{m.record.limit}</p>}
    </section>
  );
}
