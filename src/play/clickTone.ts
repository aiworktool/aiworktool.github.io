let audio: AudioContext | null = null;
let lastAt = 0;

export function playClick(enabled: boolean, pitch = 520): void {
  if (!enabled || typeof window === 'undefined') return;
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  const nowMs = performance.now();
  if (nowMs - lastAt < 45) return;
  lastAt = nowMs;
  if (!audio) audio = new Ctx();
  if (audio.state === 'suspended') void audio.resume();
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(pitch, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}
