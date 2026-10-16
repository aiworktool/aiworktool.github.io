import { useState } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { playClick } from './clickTone';
import { cloneTubes, isSolved, LEVELS, pour, type Tube } from './pourLogic';
import {
  browserBestStore, loadBestList, lowerBest, POUR_BEST_KEY, POUR_BEST_MAX, POUR_LAYOUTS, saveBestList,
} from './playBest';

type PourCopy = Copy['play']['pour'];

const COLORS = ['#1f6b4a', '#c4783a', '#3d6f8c', '#a33b4a'];

export function PourBoard({ copy, sound }: { copy: PourCopy; sound: boolean }) {
  const [level, setLevel] = useState(0);
  const [tubes, setTubes] = useState(() => cloneTubes(LEVELS[0]));
  const [history, setHistory] = useState<Tube[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [bests, setBests] = useState(() => readPourBests());
  const won = isSolved(tubes);

  function pick(index: number) {
    if (won) return;
    if (selected == null || selected === index) {
      choose(index, selected, tubes, setSelected, setBlocked);
      return;
    }
    const next = pour(tubes, selected, index);
    if (!next) {
      setBlocked(true);
      setSelected(tubes[index].length > 0 ? index : null);
      playClick(sound, 180);
      return;
    }
    setHistory((items) => [...items.slice(-99), tubes]);
    setTubes(next);
    if (isSolved(next)) notePour(level, history.length + 1, setBests);
    setSelected(null);
    setBlocked(false);
    playClick(sound, 390);
  }

  function undo() {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(history.slice(0, -1));
    setTubes(prev);
    setSelected(null);
    setBlocked(false);
  }

  function nextLayout() {
    const index = (level + 1) % LEVELS.length;
    setLevel(index);
    setTubes(cloneTubes(LEVELS[index]));
    setHistory([]);
    setSelected(null);
    setBlocked(false);
  }

  const status = won ? copy.won : blocked ? copy.blocked : copy.hint;
  return (
    <div>
      <div className="play-status">
        <strong>{fill(copy.layout, { n: level + 1 })}</strong>
        <span>{fill(copy.moves, { n: history.length })}</span>
        <span>{pourBestText(copy, bests[level] ?? 0)}</span>
      </div>
      <p role="status">{status}</p>
      <div className="pour-row">
        {tubes.map((tube, index) => (
          <TubeButton
            key={index}
            copy={copy}
            index={index}
            tube={tube}
            pressed={selected === index}
            onPick={pick}
          />
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={undo} disabled={history.length === 0}>{copy.undo}</button>
        <button type="button" onClick={nextLayout}>{copy.next}</button>
      </div>
    </div>
  );
}

function readPourBests(): number[] {
  const saved = loadBestList(browserBestStore(), POUR_BEST_KEY, POUR_LAYOUTS, POUR_BEST_MAX);
  return saved ?? Array.from({ length: POUR_LAYOUTS }, () => 0);
}

function notePour(level: number, moves: number, setBests: (value: number[]) => void): void {
  const current = readPourBests();
  const better = lowerBest(current[level] ?? 0, moves, POUR_BEST_MAX);
  if (better === current[level]) return;
  const next = current.slice();
  next[level] = better;
  saveBestList(browserBestStore(), POUR_BEST_KEY, next, POUR_BEST_MAX);
  setBests(next);
}

function pourBestText(copy: PourCopy, best: number): string {
  if (best <= 0) return copy.bestNone;
  return fill(copy.best, { n: best });
}

function choose(
  index: number,
  selected: number | null,
  tubes: Tube[],
  setSelected: (value: number | null) => void,
  setBlocked: (value: boolean) => void,
): void {
  if (selected === index) {
    setSelected(null);
    return;
  }
  if (tubes[index].length === 0) return;
  setSelected(index);
  setBlocked(false);
}

function TubeButton({
  copy, index, tube, pressed, onPick,
}: {
  copy: PourCopy;
  index: number;
  tube: Tube;
  pressed: boolean;
  onPick: (index: number) => void;
}) {
  const name = fill(copy.tube, { n: index + 1 });
  const extra = tube.length === 0 ? copy.empty : pressed ? copy.selected : '';
  return (
    <button
      type="button"
      className="pour-tube"
      aria-pressed={pressed}
      aria-label={extra ? `${name} ${extra}` : name}
      onClick={() => onPick(index)}
    >
      {tube.map((color, layer) => (
        <span key={`${index}-${layer}`} className="tube-cell" style={{ background: COLORS[color] }} />
      ))}
    </button>
  );
}
