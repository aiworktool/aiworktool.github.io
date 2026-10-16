import { useEffect, useRef, useState } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { localPoint } from './boardPointer';
import { playClick } from './clickTone';
import { drawDots } from './tapDraw';
import {
  dropDot, hitDotPx, makeDot, ROUND_MS, stepDots, type Dot,
} from './tapLogic';
import {
  browserBestStore, loadBest, raiseBest, saveBest, TAP_BEST_KEY, TAP_BEST_MAX,
} from './playBest';

type TapCopy = Copy['play']['tap'];

export function TapBoard({ copy, sound }: { copy: TapCopy; sound: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dots = useRef<Dot[]>([]);
  const nextId = useRef(1);
  const missed = useRef(0);
  const started = useRef(0);
  const secondRef = useRef(30);
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => loadBest(browserBestStore(), TAP_BEST_KEY, TAP_BEST_MAX));
  const scoreRef = useRef(0);
  const bestRef = useRef(best);
  const [left, setLeft] = useState(30);
  const [gone, setGone] = useState(0);

  useEffect(() => watchDots({
    phase, canvasRef, dots, nextId, missed, started, secondRef, setLeft, setGone, setPhase,
  }), [phase]);

  function start() {
    dots.current = [];
    nextId.current = 1;
    missed.current = 0;
    started.current = performance.now();
    secondRef.current = 30;
    scoreRef.current = 0;
    setScore(0);
    setGone(0);
    setLeft(30);
    setPhase('play');
  }

  function tap(event: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== 'play') return;
    const point = localPoint(event.currentTarget, event.clientX, event.clientY);
    const id = hitDotPx(dots.current, point.x, point.y, performance.now(), point.width, point.height);
    if (id == null) return;
    dots.current = dropDot(dots.current, id);
    noteTap(scoreRef, bestRef, setScore, setBest);
    playClick(sound, 680);
    drawDots(canvasRef.current, dots.current, performance.now());
  }

  return (
    <div>
      <div className="play-status">
        <strong>{fill(copy.score, { n: score })}</strong>
        <span>{fill(copy.best, { n: best })}</span>
        <span>{fill(copy.seconds, { n: left })}</span>
        {phase === 'done' && <span>{fill(copy.missed, { n: gone })}</span>}
      </div>
      {phase === 'idle' && <p>{copy.idle}</p>}
      {phase === 'done' && <p>{copy.end}</p>}
      <canvas
        ref={canvasRef}
        className="play-canvas"
        role="application"
        tabIndex={0}
        aria-label={copy.board}
        onPointerDown={tap}
      />
      <div className="row">
        {phase !== 'play' && (
          <button type="button" onClick={start}>{phase === 'done' ? copy.again : copy.start}</button>
        )}
      </div>
    </div>
  );
}

function noteTap(
  scoreRef: { current: number },
  bestRef: { current: number },
  setScore: (value: number) => void,
  setBest: (value: number) => void,
): void {
  scoreRef.current += 1;
  setScore(scoreRef.current);
  const raised = raiseBest(bestRef.current, scoreRef.current, TAP_BEST_MAX);
  if (raised === bestRef.current) return;
  bestRef.current = raised;
  setBest(raised);
  saveBest(browserBestStore(), TAP_BEST_KEY, raised, TAP_BEST_MAX);
}

type WatchInput = {
  phase: 'idle' | 'play' | 'done';
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dots: React.RefObject<Dot[]>;
  nextId: React.RefObject<number>;
  missed: React.RefObject<number>;
  started: React.RefObject<number>;
  secondRef: React.RefObject<number>;
  setLeft: (value: number) => void;
  setGone: (value: number) => void;
  setPhase: (value: 'done') => void;
};

function watchDots(input: WatchInput): () => void {
  const canvas = input.canvasRef.current;
  if (!canvas || input.phase !== 'play') return () => undefined;
  let frame = 0;
  let lastSpawn = 0;
  const tick = (now: number) => {
    const remain = Math.max(0, ROUND_MS - (now - input.started.current));
    publishSecond(remain, input.secondRef, input.setLeft);
    const alive = advanceDots(input, now, remain, lastSpawn);
    lastSpawn = alive.spawnedAt;
    drawDots(canvas, input.dots.current, now);
    if (remain <= 0) {
      input.setGone(input.missed.current);
      input.setPhase('done');
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function publishSecond(
  remain: number,
  secondRef: React.RefObject<number>,
  setLeft: (value: number) => void,
): void {
  const second = Math.ceil(remain / 1000);
  if (second === secondRef.current) return;
  secondRef.current = second;
  setLeft(second);
}

function advanceDots(input: WatchInput, now: number, remain: number, lastSpawn: number): { spawnedAt: number } {
  let alive = stepDots(input.dots.current, now, () => {
    input.missed.current += 1;
  });
  let spawnedAt = lastSpawn;
  if (remain > 400 && alive.length < 4 && now - lastSpawn >= 420) {
    alive = [...alive, makeDot(input.nextId.current, now, Math.random)];
    input.nextId.current += 1;
    spawnedAt = now;
  }
  input.dots.current = alive;
  return { spawnedAt };
}
