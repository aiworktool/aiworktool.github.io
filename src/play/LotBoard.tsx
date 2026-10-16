import { useRef, useState } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { playClick } from './clickTone';
import {
  carSpot, exitSpot, isFailed, isWon, playTap, playUndo, startPlay, type PlayState,
} from './lotLogic';
import { LEVELS_EACH, levelsFor, type LotDifficulty } from './lotPacks';
import { browserLotStore } from './lotProgress';
import {
  advanceClearedLevel, isSliceOpen, levelIdAfterClear, loadLotSave, saveLotSave,
  selectLotDifficulty, selectLotLevel, type LotSave, type LotSlice,
} from './lotSave';
import { CAR_COLORS, type Car, type Dir, type Exit, type Level } from './lotTypes';
import './lot.css';

type LotCopy = Copy['play']['lot'];
type Note = 'hint' | 'blocked' | 'won' | 'failed';

export function LotBoard({ copy, sound }: { copy: LotCopy; sound: boolean }) {
  const store = useRef(browserLotStore());
  const initial = useRef(loadLotSave(store.current));
  const [progress, setProgress] = useState(initial.current);
  const progressRef = useRef(progress);
  const difficulty = progress.difficulty;
  const pack = levelsFor(difficulty);
  const slice = progress[difficulty];
  const [index, setIndex] = useState(slice.current);
  const [play, setPlay] = useState(() => openingPlay(initial.current));
  const [note, setNote] = useState<Note>('hint');
  const level = pack[index];
  const won = isWon(play.cars);
  const failed = isFailed(play.moves, level.moveLimit, play.cars);

  function commit(next: LotSave) {
    progressRef.current = next;
    setProgress(next);
    saveLotSave(store.current, next);
  }

  function choose(nextIndex: number) {
    const save = progressRef.current;
    const levels = levelsFor(save.difficulty);
    if (!isSliceOpen(save[save.difficulty], nextIndex)) return;
    setIndex(nextIndex);
    setPlay(startPlay(levels[nextIndex]));
    setNote('hint');
    commit(selectLotLevel(save, nextIndex));
  }

  function chooseDifficulty(next: LotDifficulty) {
    const save = progressRef.current;
    if (save.difficulty === next) return;
    const picked = selectLotDifficulty(save, next);
    const levelIndex = picked[next].current;
    setIndex(levelIndex);
    setPlay(startPlay(levelsFor(next)[levelIndex]));
    setNote('hint');
    commit(picked);
  }

  function onCar(carId: number) {
    const result = playTap(level, play, carId);
    if (result.kind === 'locked') return;
    if (result.kind === 'blocked') {
      setNote('blocked');
      playClick(sound, 180);
      return;
    }
    if (result.won) {
      settleWin(result.play);
      return;
    }
    setPlay(result.play);
    setNote(result.failed ? 'failed' : 'hint');
    playClick(sound, 420);
  }

  function settleWin(wonPlay: PlayState) {
    setNote('won');
    const saved = advanceClearedLevel(progressRef.current, index, wonPlay.moves);
    const nextIndex = levelIdAfterClear(index + 1) - 1;
    const onNext = saved[saved.difficulty].current === nextIndex && nextIndex !== index;
    if (onNext) {
      setIndex(nextIndex);
      setPlay(startPlay(levelsFor(saved.difficulty)[nextIndex]));
    } else {
      setPlay(wonPlay);
    }
    commit(saved);
    playClick(sound, 640);
  }

  function undo() {
    const next = playUndo(play);
    if (next === play) return;
    setPlay(next);
    setNote('hint');
  }

  return (
    <div className="lot-game">
      <LotStatus
        copy={copy}
        index={index}
        play={play}
        limit={level.moveLimit}
        best={slice.best[index] ?? 0}
        note={note}
        allClear={slice.cleared.length === LEVELS_EACH}
      />
      <DifficultyBar copy={copy} difficulty={difficulty} onPick={chooseDifficulty} />
      <LotPicker copy={copy} slice={slice} index={index} onPick={choose} />
      <LotGrid copy={copy} level={level} play={play} locked={won || failed} onCar={onCar} />
      <div className="row lot-actions">
        <button type="button" onClick={undo} disabled={play.past.length === 0}>{copy.undo}</button>
        <button type="button" onClick={() => { setPlay(startPlay(level)); setNote('hint'); }}>
          {copy.restart}
        </button>
        {won && isSliceOpen(slice, index + 1) ? (
          <button type="button" onClick={() => choose(index + 1)}>{copy.next}</button>
        ) : null}
      </div>
    </div>
  );
}

function LotStatus({
  copy, index, play, limit, best, note, allClear,
}: {
  copy: LotCopy;
  index: number;
  play: PlayState;
  limit: number;
  best: number;
  note: Note;
  allClear: boolean;
}) {
  const left = Math.max(0, limit - play.moves);
  return (
    <div>
      <div className="play-status">
        <strong>{fill(copy.level, { n: index + 1 })}</strong>
        <span>{fill(copy.moves, { n: left })}</span>
        {best > 0 ? <span>{fill(copy.best, { n: best })}</span> : null}
      </div>
      <p role="status">{noteText(copy, note)}</p>
      {allClear ? <p>{copy.doneAll}</p> : null}
    </div>
  );
}

function noteText(copy: LotCopy, note: Note): string {
  if (note === 'won') return copy.won;
  if (note === 'failed') return copy.failed;
  if (note === 'blocked') return copy.blocked;
  return copy.hint;
}

function openingPlay(save: LotSave) {
  const pack = levelsFor(save.difficulty);
  return startPlay(pack[save[save.difficulty].current]);
}

function DifficultyBar({
  copy, difficulty, onPick,
}: {
  copy: LotCopy;
  difficulty: LotDifficulty;
  onPick: (difficulty: LotDifficulty) => void;
}) {
  const options: { id: LotDifficulty; label: string }[] = [
    { id: 'low', label: copy.diffLow },
    { id: 'mid', label: copy.diffMid },
    { id: 'high', label: copy.diffHigh },
  ];
  return (
    <div className="lot-diffs" role="group" aria-label={copy.difficulty}>
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.id === difficulty}
          onClick={() => onPick(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function LotPicker({
  copy, slice, index, onPick,
}: {
  copy: LotCopy;
  slice: LotSlice;
  index: number;
  onPick: (index: number) => void;
}) {
  return (
    <div className="lot-levels" role="group" aria-label={copy.pick}>
      {slice.best.map((_, levelIndex) => (
        <LevelButton
          key={levelIndex}
          copy={copy}
          levelIndex={levelIndex}
          open={isSliceOpen(slice, levelIndex)}
          current={levelIndex === index}
          clear={slice.cleared.includes(levelIndex)}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function LevelButton({
  copy, levelIndex, open, current, clear, onPick,
}: {
  copy: LotCopy;
  levelIndex: number;
  open: boolean;
  current: boolean;
  clear: boolean;
  onPick: (index: number) => void;
}) {
  const label = fill(copy.level, { n: levelIndex + 1 });
  return (
    <button
      type="button"
      className={clear ? 'is-clear' : undefined}
      aria-pressed={current}
      aria-label={open ? label : `${label}. ${copy.locked}`}
      disabled={!open}
      onClick={() => onPick(levelIndex)}
    >
      {levelIndex + 1}
    </button>
  );
}

function LotGrid({
  copy, level, play, locked, onCar,
}: {
  copy: LotCopy;
  level: Level;
  play: PlayState;
  locked: boolean;
  onCar: (carId: number) => void;
}) {
  const cols = level.w + 2;
  const rows = level.h + 2;
  return (
    <div className="lot-scroll">
      <div
        className="lot-board"
        role="group"
        aria-label={copy.board}
        style={{
          gridTemplateColumns: `repeat(${cols}, 44px)`,
          gridTemplateRows: `repeat(${rows}, 44px)`,
        }}
      >
        {roadCells(level.w, level.h)}
        {level.exits.map((exit) => (
          <ExitMark key={`${exit.dir}${exit.at}`} copy={copy} level={level} exit={exit} />
        ))}
        {play.cars.map((car) => (
          <CarButton key={car.id} copy={copy} car={car} disabled={locked} onCar={onCar} />
        ))}
      </div>
    </div>
  );
}

function roadCells(w: number, h: number) {
  const cells = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      cells.push(
        <span key={`r${x}-${y}`} className="lot-road" style={{ gridColumn: x + 2, gridRow: y + 2 }} />,
      );
    }
  }
  return cells;
}

function ExitMark({
  copy, level, exit,
}: {
  copy: LotCopy;
  level: Level;
  exit: Exit;
}) {
  const spot = exitSpot(level, exit);
  const label = fill(copy.exit, { dir: dirName(copy, exit.dir) });
  return (
    <span
      className={`lot-exit lot-exit-${exit.dir}`}
      style={{ gridColumn: spot.col, gridRow: spot.row }}
      role="img"
      aria-label={label}
    >
      <span className="lot-nose" />
    </span>
  );
}

function CarButton({
  copy, car, disabled, onCar,
}: {
  copy: LotCopy;
  car: Car;
  disabled: boolean;
  onCar: (carId: number) => void;
}) {
  const spot = carSpot(car);
  const label = fill(copy.car, { n: car.id, dir: dirName(copy, car.dir) });
  return (
    <button
      type="button"
      className={`lot-car lot-car-${car.dir}${car.len === 3 ? ' lot-len-3' : ''}`}
      style={{
        gridColumn: `${spot.col} / span ${spot.w}`,
        gridRow: `${spot.row} / span ${spot.h}`,
      }}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCar(car.id)}
    >
      <span className="lot-wheel lot-w1" />
      <span className="lot-wheel lot-w2" />
      <span className="lot-wheel lot-w3" />
      <span className="lot-wheel lot-w4" />
      {car.len === 3 && (
        <>
          <span className="lot-wheel lot-w5" />
          <span className="lot-wheel lot-w6" />
        </>
      )}
      <span className="lot-body" style={{ background: CAR_COLORS[car.color % CAR_COLORS.length] }}>
        <span className="lot-cabin" />
        <span className="lot-hood"><i /><i /></span>
        <span className="lot-tail"><i /><i /></span>
      </span>
    </button>
  );
}

function dirName(copy: LotCopy, dir: Dir): string {
  if (dir === 'N') return copy.dirN;
  if (dir === 'E') return copy.dirE;
  if (dir === 'S') return copy.dirS;
  return copy.dirW;
}
