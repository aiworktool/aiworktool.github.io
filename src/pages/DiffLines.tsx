import type { ReactNode } from 'react';
import { splitCharSpan } from '../diff/charSpan';

export type DiffRow = { left: string; right: string; changed: boolean };

type DiffLinesProps = {
  rows: DiffRow[];
  side: 'left' | 'right';
  label: string;
};

export function DiffLines({ rows, side, label }: DiffLinesProps) {
  return (
    <pre className="json-box aligned-box" aria-label={label}>
      {rows.map((row, index) => (
        <div key={index} className={row.changed ? `diff-mark ${side}` : 'diff-mark'}>
          {renderLine(row, side)}
        </div>
      ))}
    </pre>
  );
}

function renderLine(row: DiffRow, side: 'left' | 'right'): ReactNode {
  const text = row[side];
  if (!row.changed) return text || ' ';
  const parts = splitCharSpan(row.left, row.right)?.[side];
  if (!parts?.mark) return text || ' ';
  return (
    <>
      {parts.before}
      <mark className={`diff-char ${side}`}>{parts.mark}</mark>
      {parts.after}
    </>
  );
}
