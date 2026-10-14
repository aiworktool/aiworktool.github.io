import { AppFailure } from '../errors';
import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS, SAMPLE_RATE } from './limits';

function mixdown(audio: AudioBuffer): Float32Array {
  const length = audio.length;
  const mixed = new Float32Array(length);
  const channels = audio.numberOfChannels;
  for (let channel = 0; channel < channels; channel += 1) {
    const data = audio.getChannelData(channel);
    for (let i = 0; i < length; i += 1) mixed[i] += data[i] / channels;
  }
  return mixed;
}

function resample(mixed: Float32Array, fromRate: number, durationSec: number): Float32Array {
  const outLen = Math.max(1, Math.ceil(durationSec * SAMPLE_RATE));
  const out = new Float32Array(outLen);
  const ratio = fromRate / SAMPLE_RATE;
  const last = mixed.length - 1;
  for (let i = 0; i < outLen; i += 1) {
    const position = i * ratio;
    const left = Math.min(last, Math.floor(position));
    const right = Math.min(last, left + 1);
    const t = position - left;
    out[i] = mixed[left] * (1 - t) + mixed[right] * t;
  }
  return out;
}

export async function loadAudioBlob(blob: Blob): Promise<{ pcm: Float32Array; durationSec: number }> {
  if (blob.size > AUDIO_MAX_BYTES) throw new AppFailure('file-too-big');
  const ctx = new AudioContext();
  try {
    const raw = await blob.arrayBuffer();
    let audio: AudioBuffer;
    try {
      audio = await ctx.decodeAudioData(raw.slice(0));
    } catch {
      throw new AppFailure('decode-failed');
    }
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      throw new AppFailure('decode-failed');
    }
    if (audio.duration > AUDIO_MAX_SECONDS) throw new AppFailure('audio-too-long');
    const pcm = resample(mixdown(audio), audio.sampleRate, audio.duration);
    return { pcm, durationSec: audio.duration };
  } finally {
    await ctx.close();
  }
}
