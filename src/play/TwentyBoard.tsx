import { useEffect, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { playClick } from './clickTone';
import {
  dirFromKey, hasLost, hasWon, restartGame, stepGame, swipeDir, type Dir, type TwentyGame,
} from './twentyLogic';
import { browserTwentyStore, loadProgress, saveProgress, type TwentyProgress } from './twentyProgress';
import './twenty.css';

type TwentyCopy = Copy['play']['twenty'];
type Point = { x: number; y: number; id: number };
type GameSetter = Dispatch<SetStateAction<TwentyGame>>;

export function TwentyBoard({ copy, sound }: { copy: TwentyCopy; sound: boolean }) {
  const [game, setGame] = useState(loadInitial);
  const gameRef = useRef(game);
  const origin = useRef<Point | null>(null);
  const act = useRef<(dir: Dir) => void>(() => {});
  gameRef.current = game;
  act.current = (dir) => playMove(dir, sound, gameRef, setGame);

  useEffect(() => {
    saveProgress(browserTwentyStore(), toProgress(game));
  }, [game]);
  useEffect(() => bindKeys(act), []);

  const status = statusText(copy, game);
  return (
    <div>
      <div className="play-status">
        <strong aria-live="polite">{fill(copy.score, { n: game.score })}</strong>
        <span>{fill(copy.best, { n: game.best })}</span>
      </div>
      <p>{copy.how}</p>
      <p role="status">{status}</p>
      <div className="twenty-scroll">
        <BoardGrid
          label={copy.board}
          board={game.board}
          onPointerDown={(event) => pointerDown(event, origin)}
          onPointerUp={(event) => pointerUp(event, origin, act)}
          onPointerCancel={() => { origin.current = null; }}
        />
      </div>
      <div className="row twenty-actions">
        <button type="button" onClick={() => playRestart(sound, gameRef, setGame)}>{copy.restart}</button>
      </div>
    </div>
  );
}

function BoardGrid({
  label, board, onPointerDown, onPointerUp, onPointerCancel,
}: {
  label: string;
  board: TwentyGame['board'];
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
}) {
  return (
    <div
      className="twenty-board"
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {board.map((row, y) => row.map((value, x) => <Tile key={`${y}-${x}`} value={value} />))}
    </div>
  );
}

function Tile({ value }: { value: number }) {
  if (value <= 0) return <div className="twenty-cell" aria-hidden="true" />;
  const tone = value >= 2048 ? 'twenty-v2048' : `twenty-v${value}`;
  return <div className={`twenty-cell twenty-tile ${tone}`}>{value}</div>;
}

function statusText(copy: TwentyCopy, game: TwentyGame): string {
  if (hasLost(game.board)) return copy.lose;
  if (hasWon(game.board)) return copy.win;
  return copy.idle;
}

function loadInitial(): TwentyGame {
  const saved = loadProgress(browserTwentyStore());
  if (!saved) return restartGame(0, Math.random);
  return { board: saved.board, score: saved.score, best: saved.best };
}

function toProgress(game: TwentyGame): TwentyProgress {
  return { v: 1, score: game.score, best: game.best, board: game.board };
}

function playMove(
  dir: Dir,
  sound: boolean,
  gameRef: { current: TwentyGame },
  setGame: GameSetter,
): void {
  const next = stepGame(gameRef.current, dir, Math.random);
  if (next === gameRef.current) return;
  gameRef.current = next;
  setGame(next);
  playClick(sound, 440);
}

function playRestart(sound: boolean, gameRef: { current: TwentyGame }, setGame: GameSetter): void {
  const next = restartGame(gameRef.current.best, Math.random);
  gameRef.current = next;
  setGame(next);
  playClick(sound, 520);
}

function bindKeys(act: { current: (dir: Dir) => void }): () => void {
  function onKey(event: KeyboardEvent) {
    if (typingTarget(event.target)) return;
    const dir = dirFromKey(event.key);
    if (!dir) return;
    event.preventDefault();
    act.current(dir);
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

function pointerDown(event: PointerEvent<HTMLDivElement>, origin: { current: Point | null }): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function pointerUp(
  event: PointerEvent<HTMLDivElement>,
  origin: { current: Point | null },
  act: { current: (dir: Dir) => void },
): void {
  const start = origin.current;
  origin.current = null;
  if (!start || start.id !== event.pointerId) return;
  const dir = swipeDir(start.x, start.y, event.clientX, event.clientY);
  if (dir) act.current(dir);
}
