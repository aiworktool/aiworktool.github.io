import { useEffect, useRef, useState } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { playClick } from './clickTone';
import {
  cellsOf, dropIntervalMs, followSenseLine, ghostY, hardDrop, movePiece, newGame, rotatePiece, tick,
  TETRIS_H, TETRIS_W, type PieceId, type TetrisGame,
} from './tetrisLogic';
import { browserBestStore, loadBest, raiseBest, saveBest } from './playBest';
import { TetrisMotion } from './TetrisMotion';
import './tetris.css';

type TetrisCopy = Copy['play']['tetris'];

const CELL = 24;
const TETRIS_BEST_KEY = 'handy-tetris-v1';
const TETRIS_BEST_MAX = 9_999_999;
const NEXT_SIZE = 4;

const COLORS: Record<PieceId, string> = {
  1: '#3fb6e8',
  2: '#f0c33c',
  3: '#b06ae0',
  4: '#57c267',
  5: '#e9553f',
  6: '#4f7df0',
  7: '#e08a3c',
};

type TetrisActions = {
  left: () => void;
  right: () => void;
  soft: () => void;
  rotateCw: () => void;
  rotateCcw: () => void;
  drop: () => void;
  restart: () => void;
};

export function TetrisBoard({ copy, sound }: { copy: TetrisCopy; sound: boolean }) {
  const [game, setGame] = useState<TetrisGame>(() => newGame(Math.random));
  const [best, setBest] = useState(() => loadBest(browserBestStore(), TETRIS_BEST_KEY, TETRIS_BEST_MAX));
  const gameRef = useRef(game);
  gameRef.current = game;
  const boardRef = useRef<HTMLCanvasElement | null>(null);
  const nextRef = useRef<HTMLCanvasElement | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const [poseOn, setPoseOn] = useState(false);
  const act = useRef<TetrisActions | null>(null);
  act.current = {
    left: () => step(movePiece(gameRef.current, -1, 0), 420),
    right: () => step(movePiece(gameRef.current, 1, 0), 420),
    soft: () => step(tick(gameRef.current, Math.random), 420),
    rotateCw: () => step(rotatePiece(gameRef.current, 1), 420),
    rotateCcw: () => step(rotatePiece(gameRef.current, -1), 420),
    drop: () => step(hardDrop(gameRef.current, Math.random), 560),
    restart: () => {
      gameRef.current = newGame(Math.random);
      setGame(gameRef.current);
      playClick(sound, 520);
    },
  };

  function step(next: TetrisGame, pitch: number) {
    if (next === gameRef.current) return;
    gameRef.current = next;
    setGame(next);
    playClick(sound, pitch);
  }

  useEffect(() => {
    if (game.over || !game.piece) return;
    const id = window.setInterval(() => act.current?.soft(), dropIntervalMs(game.level));
    return () => window.clearInterval(id);
  }, [game.level, game.over]);

  useEffect(() => {
    drawBoard(boardRef.current, game);
    drawNext(nextRef.current, game);
    if (game.over) playClick(sound, 240);
  }, [game, sound]);

  useEffect(() => {
    if (!game.over) return;
    const value = raiseBest(best, game.score, TETRIS_BEST_MAX);
    if (value === best) return;
    setBest(value);
    saveBest(browserBestStore(), TETRIS_BEST_KEY, value, TETRIS_BEST_MAX);
  }, [game.over, best, game.score]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typingTarget(event.target)) return;
      if (event.key === 'ArrowLeft') { act.current?.left(); event.preventDefault(); return; }
      if (event.key === 'ArrowRight') { act.current?.right(); event.preventDefault(); return; }
      if (event.key === 'ArrowDown') { act.current?.soft(); event.preventDefault(); return; }
      if (event.key === 'ArrowUp' || event.key === 'x' || event.key === 'X') {
        act.current?.rotateCw(); event.preventDefault(); return;
      }
      if (event.key === 'z' || event.key === 'Z') { act.current?.rotateCcw(); event.preventDefault(); return; }
      if (event.key === ' ') { act.current?.drop(); event.preventDefault(); return; }
      if (event.key === 'r' || event.key === 'R') { act.current?.restart(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const displayBest = Math.max(best, game.score);

  return (
    <div className="tetris-board">
      <div className="tetris-top">
        <canvas
          ref={nextRef}
          width={NEXT_SIZE * CELL}
          height={NEXT_SIZE * CELL}
          role="img"
          aria-label={copy.next}
        />
      </div>
      <div className="play-status">
        <strong>{fill(copy.score, { n: game.score })}</strong>
        <span>{fill(copy.lines, { n: game.lines })}</span>
        <span>{fill(copy.level, { n: game.level })}</span>
        <span>{displayBest > 0 ? fill(copy.best, { n: displayBest }) : copy.bestNone}</span>
      </div>
      <div
        className={poseOn ? 'tetris-stage is-hidden' : 'tetris-stage'}
        onPointerDown={(event) => { swipe.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
            if (dx < 0) act.current?.left(); else act.current?.right();
          } else if (Math.abs(dy) > 20) {
            if (dy > 0) act.current?.soft(); else act.current?.rotateCw();
          }
        }}
      >
        <canvas
          ref={boardRef}
          width={TETRIS_W * CELL}
          height={TETRIS_H * CELL}
          role="img"
          aria-label={copy.board}
        />
      </div>
      <TetrisMotion
        copy={copy}
        readGame={() => gameRef.current}
        onActive={setPoseOn}
        onLine={(row) => {
          const next = followSenseLine(gameRef.current, row);
          if (next === gameRef.current) return;
          gameRef.current = next;
          setGame(next);
        }}
        onMove={(dir) => {
          if (dir === 'left') act.current?.left();
          else act.current?.right();
        }}
        onAction={(action) => {
          if (action === 'rotateCcw') act.current?.rotateCcw();
          else if (action === 'rotateCw') act.current?.rotateCw();
          else act.current?.drop();
        }}
      />
      <div className="tetris-controls">
        <button type="button" onClick={(event) => blurAnd(event, () => act.current?.left())}>{copy.left}</button>
        <button type="button" onClick={(event) => blurAnd(event, () => act.current?.rotateCw())}>{copy.rotate}</button>
        <button type="button" onClick={(event) => blurAnd(event, () => act.current?.right())}>{copy.right}</button>
        <button type="button" onClick={(event) => blurAnd(event, () => act.current?.soft())}>{copy.soft}</button>
        <button type="button" onClick={(event) => blurAnd(event, () => act.current?.drop())}>{copy.hard}</button>
        <button type="button" onClick={(event) => blurAnd(event, () => act.current?.restart())}>{copy.restart}</button>
      </div>
      <p role="status" aria-live="polite">{game.over ? copy.over : copy.idle}</p>
    </div>
  );
}

function blurAnd(event: { currentTarget: HTMLButtonElement }, run: () => void): void {
  event.currentTarget.blur();
  run();
}

function fitCanvas(canvas: HTMLCanvasElement | null, width: number, height: number): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawBoard(canvas: HTMLCanvasElement | null, game: TetrisGame): void {
  const ctx = fitCanvas(canvas, TETRIS_W * CELL, TETRIS_H * CELL);
  if (!ctx) return;
  ctx.clearRect(0, 0, TETRIS_W * CELL, TETRIS_H * CELL);
  ctx.fillStyle = '#e9e2d3';
  ctx.fillRect(0, 0, TETRIS_W * CELL, TETRIS_H * CELL);
  for (let y = 0; y < TETRIS_H; y += 1) {
    for (let x = 0; x < TETRIS_W; x += 1) {
      const value = game.board[y][x];
      if (value !== 0) drawCell(ctx, x, y, COLORS[value as PieceId], 1);
    }
  }
  if (game.piece) {
    const ghost = ghostY(game);
    for (const [x, y] of pieceCells(game.piece.id, game.piece.rotation, game.piece.x, ghost)) {
      drawCell(ctx, x, y, COLORS[game.piece.id], 0.25);
    }
    for (const [x, y] of pieceCells(game.piece.id, game.piece.rotation, game.piece.x, game.piece.y)) {
      drawCell(ctx, x, y, COLORS[game.piece.id], 1);
    }
  }
}

function drawNext(canvas: HTMLCanvasElement | null, game: TetrisGame): void {
  const ctx = fitCanvas(canvas, NEXT_SIZE * CELL, NEXT_SIZE * CELL);
  if (!ctx) return;
  ctx.clearRect(0, 0, NEXT_SIZE * CELL, NEXT_SIZE * CELL);
  ctx.fillStyle = '#e9e2d3';
  ctx.fillRect(0, 0, NEXT_SIZE * CELL, NEXT_SIZE * CELL);
  const cells = pieceCells(game.next, 0, 0, 0);
  const minX = Math.min(...cells.map(([x]) => x));
  const maxX = Math.max(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const maxY = Math.max(...cells.map(([, y]) => y));
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const offsetX = Math.floor((NEXT_SIZE - boxW) / 2) - minX;
  const offsetY = Math.floor((NEXT_SIZE - boxH) / 2) - minY;
  for (const [x, y] of pieceCells(game.next, 0, offsetX, offsetY)) {
    drawCell(ctx, x, y, COLORS[game.next], 1);
  }
}

function pieceCells(id: PieceId, rotation: number, x: number, y: number): Array<[number, number]> {
  return cellsOf({ id, rotation: rotation as 0 | 1 | 2 | 3, x, y });
}

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  ctx.globalAlpha = 1;
}

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}
