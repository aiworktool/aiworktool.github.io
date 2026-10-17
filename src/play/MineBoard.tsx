import { useEffect, useRef, useState } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { playClick } from './clickTone';
import {
  adjacentMines, chord, elapsedMs, flag, flagsOn, newGame, reveal,
  type MineDifficulty, type MineGame,
} from './mineLogic';
import {
  browserMineStore, loadMineBest, saveMineBest, type MineBest,
} from './mineProgress';
import './mine.css';

type MineCopy = Copy['play']['mine'];

const DIFF_ORDER: readonly MineDifficulty[] = ['easy', 'medium', 'hard'];

type MineActions = {
  pick: (x: number, y: number) => void;
  restart: () => void;
  difficulty: (item: MineDifficulty) => void;
  toggleFlag: () => void;
};

export function MineBoard({ copy, sound }: { copy: MineCopy; sound: boolean }) {
  const [game, setGame] = useState(() => newGame('easy', Math.random));
  const [best, setBest] = useState<MineBest>(() => loadMineBest(browserMineStore()));
  const [flagMode, setFlagMode] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    if (game.state !== 'playing') return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [game.state]);

  useEffect(() => {
    if (game.state !== 'won') return;
    const time = elapsedMs(game, Date.now());
    const current = best.best[game.difficulty];
    if (current !== 0 && time >= current) return;
    const next = { ...best, best: { ...best.best, [game.difficulty]: time } };
    setBest(next);
    saveMineBest(browserMineStore(), next);
  }, [game, best]);

  const act = useRef<MineActions | null>(null);
  act.current = {
    pick: (x, y) => pickCell(gameRef.current, x, y, flagMode, setGame, sound),
    restart: () => restart(setGame, sound, gameRef.current.difficulty),
    difficulty: (item) => chooseDifficulty(item, setGame, sound),
    toggleFlag: () => { setFlagMode((value) => !value); playClick(sound, 440); },
  };

  useEffect(() => bindKeys(act), []);

  const remaining = Math.max(0, game.mines - flagsOn(game));
  const elapsed = elapsedMs(game, now);
  const record = best.best[game.difficulty];

  return (
    <div>
      <div className="mine-toolbar">
        {DIFF_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={game.difficulty === item}
            onClick={() => act.current?.difficulty(item)}
          >
            {copy[item]}
          </button>
        ))}
        <button type="button" aria-pressed={flagMode} onClick={() => act.current?.toggleFlag()}>
          {flagMode ? copy.flagOn : copy.flagOff}
        </button>
        <button type="button" onClick={() => act.current?.restart()}>{copy.restart}</button>
      </div>
      <div className="play-status">
        <strong>{fill(copy.minesLeft, { n: remaining })}</strong>
        <span>{fill(copy.time, { t: formatTime(elapsed, copy) })}</span>
        <span>{record > 0 ? fill(copy.best, { t: formatTime(record, copy) }) : copy.bestNone}</span>
      </div>
      <p>{copy.hint}</p>
      <div
        className="mine-board"
        role="grid"
        aria-label={copy.board}
        style={{ gridTemplateColumns: `repeat(${game.width}, 1fr)` }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {game.board.map((row, y) => row.map((cell, x) => (
          <button
            key={`${y}-${x}`}
            type="button"
            className={cellClass(cell, x, y, game)}
            aria-label={cellLabel(copy, cell, x, y, game)}
            onClick={() => act.current?.pick(x, y)}
            onContextMenu={(event) => {
              event.preventDefault();
              if (gameRef.current.state !== 'won' && gameRef.current.state !== 'lost' && !cell.revealed) {
                setGame(flag(gameRef.current, x, y));
                playClick(sound, 380);
              }
            }}
          >
            {cellContent(cell, x, y, game)}
          </button>
        )))}
      </div>
      <p role="status" aria-live="polite">{statusText(copy, game)}</p>
    </div>
  );
}

export function formatTime(ms: number, copy: MineCopy): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return fill(copy.sec, { n: totalSec });
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return fill(copy.min, { m, s });
}

function pickCell(
  game: MineGame,
  x: number,
  y: number,
  flagMode: boolean,
  setGame: (next: MineGame) => void,
  sound: boolean,
): void {
  if (game.state === 'won' || game.state === 'lost') return;
  const cell = game.board[y][x];
  if (flagMode) {
    if (!cell.revealed) setGame(flag(game, x, y));
  } else if (cell.revealed && !cell.mine) {
    setGame(chord(game, x, y, Date.now()));
  } else if (!cell.revealed) {
    setGame(reveal(game, x, y, Date.now()));
  }
  playClick(sound, 440);
}

function chooseDifficulty(
  difficulty: MineDifficulty,
  setGame: (next: MineGame) => void,
  sound: boolean,
): void {
  setGame(newGame(difficulty, Math.random));
  playClick(sound, 520);
}

function restart(setGame: (next: MineGame) => void, sound: boolean, difficulty: MineDifficulty): void {
  setGame(newGame(difficulty, Math.random));
  playClick(sound, 520);
}

function cellClass(
  cell: { mine: boolean; revealed: boolean; flagged: boolean },
  x: number,
  y: number,
  game: MineGame,
): string {
  if (!cell.revealed) return `mine-cell${cell.flagged ? ' is-flag' : ''}`;
  if (cell.mine) return 'mine-cell is-revealed is-mine';
  const count = adjacentMines(game, x, y);
  return `mine-cell is-revealed${count > 0 ? ` n-${count}` : ''}`;
}

function cellContent(
  cell: { mine: boolean; revealed: boolean; flagged: boolean },
  x: number,
  y: number,
  game: MineGame,
): string {
  if (cell.flagged) return '⚑';
  if (!cell.revealed) return '';
  if (cell.mine) return '●';
  const count = adjacentMines(game, x, y);
  return count > 0 ? String(count) : '';
}

function cellLabel(
  copy: MineCopy,
  cell: { mine: boolean; revealed: boolean; flagged: boolean },
  x: number,
  y: number,
  game: MineGame,
): string {
  const base = fill(copy.cell, { x: x + 1, y: y + 1 });
  if (cell.flagged) return base + copy.flag;
  if (!cell.revealed) return base;
  if (cell.mine) return base + copy.mine;
  const count = adjacentMines(game, x, y);
  return count > 0 ? base + fill(copy.number, { n: count }) : base;
}

function statusText(copy: MineCopy, game: MineGame): string {
  if (game.state === 'won') return copy.won;
  if (game.state === 'lost') return copy.lost;
  return copy.idle;
}

function bindKeys(act: { current: MineActions | null }): () => void {
  function onKey(event: KeyboardEvent) {
    if (typingTarget(event.target)) return;
    if (event.key === '1') { act.current?.difficulty('easy'); return; }
    if (event.key === '2') { act.current?.difficulty('medium'); return; }
    if (event.key === '3') { act.current?.difficulty('hard'); return; }
    if (event.key === 'f' || event.key === 'F') { act.current?.toggleFlag(); return; }
    if (event.key === 'r' || event.key === 'R') { act.current?.restart(); return; }
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
