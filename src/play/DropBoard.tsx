import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Copy } from '../i18n/zh';
import { localPoint } from './boardPointer';
import { playClick } from './clickTone';
import { DropLayout } from './DropView';
import { STEP_MS, needsSim, stepDrop } from './dropPhysics';
import {
  CUP_W, aimDelta, armDrop, isDropKey, moveAim, newGame, nudgeAim, release,
  type DropState, type PointerArm,
} from './dropLogic';
import { browserDropStore, loadProgress, saveProgress, stateFromProgress, toProgress } from './dropProgress';
import './drop.css';

type DropCopy = Copy['play']['drop'];
type GameSetter = Dispatch<SetStateAction<DropState>>;
type SimRef = { current: DropState };
type SoundRef = { current: boolean };

export function DropBoard({ copy, sound }: { copy: DropCopy; sound: boolean }) {
  const [game, setGame] = useState(loadInitial);
  const [now, setNow] = useState(0);
  const simRef = useRef(game);
  const soundRef = useRef(sound);
  const arm = useRef<PointerArm>({ down: false, swallowClick: false });
  const savedRaw = useRef('');
  soundRef.current = sound;

  useEffect(() => {
    if (game.phase === 'drop') return;
    const progress = toProgress(game);
    const raw = JSON.stringify(progress);
    if (raw === savedRaw.current) return;
    savedRaw.current = raw;
    saveProgress(browserDropStore(), progress);
  }, [game]);
  useEffect(() => runLoop(simRef, soundRef, setGame, setNow), []);
  useEffect(() => bindKeys(simRef, soundRef, setGame), []);

  function onPoint(target: HTMLDivElement, clientX: number, kind: 'down' | 'move' | 'up' | 'click') {
    const sim = simRef.current;
    if (sim.phase === 'over') return;
    const box = localPoint(target, clientX, 0);
    if (box.width <= 0) return;
    const taken = armDrop(kind, arm.current);
    arm.current = taken.arm;
    if (taken.ignore) return;
    let next = moveAim(sim, (box.x / box.width) * CUP_W);
    const before = next;
    if (taken.drop) next = release(next);
    commit(simRef, setGame, next, taken.drop && next !== before, sound);
  }

  return (
    <div>
      <DropLayout copy={copy} game={game} now={now} onPoint={onPoint} />
      <p className="drop-how">{copy.how}</p>
      <p className="drop-how">{copy.scoreRule}</p>
      <p role="status" className="drop-status">{game.phase === 'over' ? copy.over : copy.idle}</p>
      <div className="row">
        <button type="button" className="drop-restart" onClick={() => restart(simRef, setGame, sound)}>
          {copy.restart}
        </button>
      </div>
    </div>
  );
}

function loadInitial(): DropState {
  const saved = loadProgress(browserDropStore());
  if (!saved) return newGame(0, Math.random);
  return stateFromProgress(saved);
}

function restart(simRef: SimRef, setGame: GameSetter, sound: boolean): void {
  const next = newGame(simRef.current.best, Math.random);
  simRef.current = next;
  setGame(next);
  playClick(sound, 520);
}

function commit(
  simRef: SimRef,
  setGame: GameSetter,
  next: DropState,
  dropped: boolean,
  sound: boolean,
): void {
  const prev = simRef.current;
  if (next === prev) return;
  simRef.current = next;
  setGame(next);
  if (dropped) playClick(sound, 480);
}

function runLoop(
  simRef: SimRef,
  soundRef: SoundRef,
  setGame: GameSetter,
  setNow: (value: number) => void,
): () => void {
  let frame = 0;
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    setNow(now);
    acc += Math.min(48, now - last);
    last = now;
    let guard = 0;
    while (acc >= STEP_MS && guard < 3 && needsSim(simRef.current)) {
      acc -= STEP_MS;
      guard += 1;
      const prev = simRef.current;
      const next = stepDrop(prev, STEP_MS);
      if (next === prev) break;
      simRef.current = next;
      setGame(next);
      if (next.score > prev.score) playClick(soundRef.current, 660);
      else if (next.phase === 'over') playClick(soundRef.current, 240);
    }
    if (!needsSim(simRef.current)) acc = 0;
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}

function bindKeys(simRef: SimRef, soundRef: SoundRef, setGame: GameSetter): () => void {
  function onKey(event: KeyboardEvent) {
    if (typingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    const delta = aimDelta(event.key);
    if (delta != null) {
      event.preventDefault();
      commit(simRef, setGame, nudgeAim(simRef.current, delta), false, soundRef.current);
      return;
    }
    if (!isDropKey(event.key) || event.repeat || isButton(event.target)) return;
    event.preventDefault();
    const next = release(simRef.current);
    commit(simRef, setGame, next, next !== simRef.current, soundRef.current);
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function isButton(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement;
}
