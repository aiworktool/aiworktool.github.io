import { useEffect, useRef, useState } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { localPoint } from './boardPointer';
import { playClick } from './clickTone';
import { drawBubbles, type Burst } from './popDraw';
import { hitBubble, leftCount, makeSheet, popAt, type Bubble } from './popLogic';
import {
  browserBestStore, loadBest, POP_BEST_KEY, POP_BEST_MAX, raiseBest, saveBest,
} from './playBest';

type PopCopy = Copy['play']['pop'];

export function PopBoard({ copy, sound }: { copy: PopCopy; sound: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bursts = useRef<Burst[]>([]);
  const [seed, setSeed] = useState(1);
  const [sheet, setSheet] = useState(() => makeSheet(1));
  const [total, setTotal] = useState(0);
  const [best, setBest] = useState(() => loadBest(browserBestStore(), POP_BEST_KEY, POP_BEST_MAX));
  const totalRef = useRef(0);
  const bestRef = useRef(best);
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const left = leftCount(sheet);

  useEffect(() => watchBubbles(canvasRef.current, sheetRef, bursts), [sheet]);

  function popFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = localPoint(event.currentTarget, event.clientX, event.clientY);
    const id = hitBubble(sheetRef.current, point.x, point.y, point.width, point.height);
    const bubble = sheetRef.current.find((item) => item.id === id);
    if (!bubble || bubble.popped) return;
    const next = popAt(sheetRef.current, bubble.id);
    sheetRef.current = next;
    setSheet(next);
    notePop(totalRef, bestRef, setTotal, setBest);
    bursts.current.push({ x: bubble.x, y: bubble.y, t: performance.now() });
    playClick(sound, 460 + (bubble.id % 6) * 36);
  }

  function again() {
    const nextSeed = seed + 1;
    const next = makeSheet(nextSeed);
    sheetRef.current = next;
    bursts.current = [];
    setSeed(nextSeed);
    setSheet(next);
  }

  return (
    <div>
      <div className="play-status">
        <strong>{fill(copy.count, { n: total })}</strong>
        <span>{fill(copy.best, { n: best })}</span>
        <span>{fill(copy.left, { n: left })}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="play-canvas"
        role="application"
        tabIndex={0}
        aria-label={copy.sheet}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          popFrom(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) popFrom(event);
        }}
      />
      {left === 0 && (
        <div className="row">
          <p>{copy.done}</p>
          <button type="button" onClick={again}>{copy.again}</button>
        </div>
      )}
    </div>
  );
}

function notePop(
  totalRef: { current: number },
  bestRef: { current: number },
  setTotal: (value: number) => void,
  setBest: (value: number) => void,
): void {
  totalRef.current += 1;
  setTotal(totalRef.current);
  const raised = raiseBest(bestRef.current, totalRef.current, POP_BEST_MAX);
  if (raised === bestRef.current) return;
  bestRef.current = raised;
  setBest(raised);
  saveBest(browserBestStore(), POP_BEST_KEY, raised, POP_BEST_MAX);
}

function watchBubbles(
  canvas: HTMLCanvasElement | null,
  sheetRef: { current: Bubble[] },
  bursts: { current: Burst[] },
): () => void {
  if (!canvas) return () => undefined;
  let frame = 0;
  const paint = (now: number) => {
    bursts.current = bursts.current.filter((burst) => now - burst.t < 240);
    drawBubbles(canvas, sheetRef.current, bursts.current, now);
    if (bursts.current.length > 0) frame = requestAnimationFrame(paint);
  };
  frame = requestAnimationFrame(paint);
  const observer = new ResizeObserver(() => {
    drawBubbles(canvas, sheetRef.current, bursts.current, performance.now());
  });
  observer.observe(canvas);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}
