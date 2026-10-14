import { describe, expect, it } from 'vitest';
import { countChunks, splitChunks } from './transcribe/chunkAudio';
import { deleteAt, mergeAdjacent } from './transcribe/editor';
import { toSrt } from './transcribe/exportSrt';
import { toTxt } from './transcribe/exportText';
import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS, IMAGE_MAX_BYTES } from './transcribe/limits';
import { acceptChunk } from './transcribe/mergeChunks';
import { pickRecorderMime } from './transcribe/recorderMime';
import { initialSession, sessionReducer } from './transcribe/sessionReducer';
import type { Segment } from './transcribe/types';
import { cropInside, initialCrop, moveCrop, resizeCrop } from './matting/crop';
import { applyAlpha, decontaminate } from './matting/decontaminate';
import { hexToRgb, PRESETS } from './matting/presets';
import { resizeBilinear } from './matting/resize';
import { scaledSize } from './matting/scaledSize';

const segments: Segment[] = [
  { id: 'a', startMs: 0, endMs: 1000, text: '甲' },
  { id: 'b', startMs: 1000, endMs: 2500, text: '乙' },
  { id: 'c', startMs: 2500, endMs: 4000, text: '丙' },
];

describe('audio limits and chunks', () => {
  it('rejects only when size or duration is over the cap', () => {
    expect(AUDIO_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(IMAGE_MAX_BYTES).toBe(20 * 1024 * 1024);
    expect(AUDIO_MAX_SECONDS).toBe(1800);
  });

  it('splits 30 second audio into one chunk and overlaps the next', () => {
    expect(countChunks(16_000 * 30)).toBe(1);
    expect(splitChunks(new Float32Array(16_000 * 30))).toHaveLength(1);
    const longer = new Float32Array(16_000 * 40);
    const chunks = splitChunks(longer);
    expect(chunks).toHaveLength(countChunks(longer.length));
    expect(chunks[1].startSec).toBe(25);
  });

  it('drops overlap text from later chunks', () => {
    const kept = acceptChunk(
      [
        { text: ' 重叠 ', timestamp: [1, 2] },
        { text: '新内容', timestamp: [6, 8] },
      ],
      25,
      true,
    );
    expect(kept).toEqual([{ startMs: 31_000, endMs: 33_000, text: '新内容' }]);
  });
});

describe('transcript edit and export', () => {
  it('merges adjacent timestamps and deletes without renumbering gaps in srt', () => {
    const merged = mergeAdjacent(segments, 0);
    expect(merged[0]).toMatchObject({ startMs: 0, endMs: 2500, text: '甲\n乙' });
    const removed = deleteAt(segments, 0);
    const srt = toSrt(removed);
    expect(srt.startsWith('1\n')).toBe(true);
    expect(srt).toContain('乙');
    expect(srt).not.toContain('甲');
    expect(toTxt(segments)).toBe('甲\n\n乙\n\n丙');
    expect(toTxt(segments)).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('keeps the saved transcript when the current task is cancelled', () => {
    const withAudio = sessionReducer(initialSession, {
      type: 'audio-ready',
      durationSec: 12,
      limitHit: false,
    });
    const ready = sessionReducer(withAudio, { type: 'done', segments });
    const running = sessionReducer(ready, { type: 'preview', preview: [segments[0]] });
    const cancelled = sessionReducer(running, { type: 'abort' });
    expect(cancelled.segments).toEqual(segments);
    expect(cancelled.preview).toEqual([]);
    expect(cancelled.phase).toBe('ready');
    const replaced = sessionReducer(ready, {
      type: 'audio-ready',
      durationSec: 4,
      limitHit: false,
    });
    expect(replaced.segments).toEqual([]);
    expect(replaced.durationSec).toBe(4);
  });
});

describe('matting geometry and color', () => {
  it('locks preset pixels and background hex values', () => {
    expect(PRESETS.map((item) => [item.width, item.height])).toEqual([
      [295, 413],
      [260, 378],
      [413, 579],
      [600, 600],
    ]);
    expect(hexToRgb('#438EDB')).toEqual([67, 142, 219]);
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
  });

  it('shrinks the long edge to 2048 and keeps the crop inside the image', () => {
    expect(scaledSize(4000, 2000)).toEqual({ width: 2048, height: 1024 });
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    const crop = initialCrop(800, 600, 295 / 413);
    expect(cropInside(crop, 800, 600)).toBe(true);
    const moved = moveCrop(crop, 10_000, 10_000, 800, 600);
    expect(cropInside(moved, 800, 600)).toBe(true);
    const resized = resizeCrop(crop, 10_000, 295 / 413, 800, 600);
    expect(cropInside(resized, 800, 600)).toBe(true);
  });

  it('replaces a contaminated edge pixel with the nearby foreground color', () => {
    const rgba = new Uint8ClampedArray([
      10, 20, 30, 255,
      200, 10, 10, 10,
    ]);
    const cleaned = decontaminate(rgba, 2, 1, 1);
    expect(cleaned[4]).toBeGreaterThan(10);
    expect(cleaned[7]).toBe(10);
    const masked = applyAlpha(rgba, new Float32Array([1, 0]));
    expect(masked[3]).toBe(255);
    expect(masked[7]).toBe(0);
  });

  it('scales a flat mask without changing its average', () => {
    const src = new Float32Array([1, 0, 0, 1]);
    const dst = resizeBilinear(src, 2, 2, 2, 2);
    expect(Array.from(dst)).toEqual([1, 0, 0, 1]);
  });
});

describe('recorder mime', () => {
  it('prefers opus webm', () => {
    expect(pickRecorderMime((mime) => mime.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickRecorderMime(() => false)).toBe('');
  });
});
