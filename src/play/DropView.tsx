import type { PointerEvent } from 'react';
import { fill } from '../i18n/lang';
import type { Copy } from '../i18n/zh';
import { BallFace } from './dropFace';
import { ballPose, breathShape } from './dropFeel';
import { POP_LIFE_MS, mergeBlend } from './dropMerge';
import {
  CUP_H, CUP_W, DANGER_Y, TIER_COUNT, holdY, tierRadius, type DropState, type ScorePop,
} from './dropLogic';

type PointKind = 'down' | 'move' | 'up' | 'click';

type DropCopy = Copy['play']['drop'];

export function DropLayout({
  copy, game, now, onPoint,
}: {
  copy: DropCopy;
  game: DropState;
  now: number;
  onPoint: (target: HTMLDivElement, clientX: number, kind: PointKind) => void;
}) {
  return (
    <div className="drop-game">
      <aside className="drop-side">
        <div className="drop-badge">
          <strong aria-live="polite" aria-label={fill(copy.score, { n: game.score })}>
            {game.score}
          </strong>
        </div>
        <p className="drop-kicker">{fill(copy.best, { n: game.best })}</p>
        <div className="drop-next">
          <p className="drop-kicker">{copy.next}</p>
          <span className="drop-next-slot">
            <FixedBall tier={game.next} px={tierRadius(game.next) * 2} />
          </span>
        </div>
        <div className="drop-order">
          <p className="drop-kicker drop-order-label">{copy.order}</p>
          <ol className="drop-order-list">
            {Array.from({ length: TIER_COUNT }, (_, tier) => (
              <li key={tier}>
                <FixedBall tier={tier} px={legendPx(tier)} />
              </li>
            ))}
          </ol>
        </div>
      </aside>
      <div className="drop-stage">
        <div
          className="drop-shell"
          style={{ aspectRatio: `${CUP_W + 32} / ${CUP_H + 18}` }}
        >
          <div className="drop-wall drop-wall-l" aria-hidden="true" />
          <CupField copy={copy} game={game} now={now} onPoint={onPoint} />
          <div className="drop-wall drop-wall-r" aria-hidden="true" />
          <div className="drop-floor" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function CupField({
  copy, game, now, onPoint,
}: {
  copy: DropCopy;
  game: DropState;
  now: number;
  onPoint: (target: HTMLDivElement, clientX: number, kind: PointKind) => void;
}) {
  const aiming = game.phase === 'aim';
  const shapes = breathShape(game.balls, now);
  function point(event: PointerEvent<HTMLDivElement>, kind: PointKind) {
    if (event.button > 0) return;
    onPoint(event.currentTarget, event.clientX, kind);
  }
  return (
    <div
      className="drop-field"
      role="group"
      aria-label={copy.board}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        point(event, 'down');
      }}
      onPointerMove={(event) => point(event, 'move')}
      onPointerUp={(event) => point(event, 'up')}
      onClick={(event) => {
        if (event.button > 0) return;
        onPoint(event.currentTarget, event.clientX, 'click');
      }}
    >
      <div className="drop-danger" style={{ top: `${(DANGER_Y / CUP_H) * 100}%` }} />
      {aiming ? <div className="drop-guide" style={{ left: `${(game.aim / CUP_W) * 100}%` }} /> : null}
      {aiming ? (
        <CupBall tier={game.current} x={game.aim} y={holdY(game.current)} now={now} />
      ) : null}
      {game.balls.map((ball) => (
        <CupBall
          key={ball.id}
          ball={ball}
          now={now}
          blend={mergeBlend(game.waits, ball.id)}
          shape={shapes.get(ball.id)}
        />
      ))}
      {game.pops.map((pop) => (
        <ScoreBubble key={pop.id} pop={pop} />
      ))}
    </div>
  );
}

function CupBall({
  tier, x, y, now, ball, blend = 0, shape = UNIT_SHAPE,
}: {
  tier?: number;
  x?: number;
  y?: number;
  now: number;
  ball?: DropState['balls'][number];
  blend?: number;
  shape?: { sx: number; sy: number };
}) {
  const shown = ball ?? { id: 0, tier: tier ?? 0, x: x ?? 0, y: y ?? 0, vx: 0, vy: 0, rest: false };
  const pose = ballPose(shown, now);
  const swell = 1 + blend * 0.12;
  const diameter = tierRadius(shown.tier) * 2;
  const sx = (pose.sx * shape.sx * swell).toFixed(3);
  const sy = (pose.sy * shape.sy * swell).toFixed(3);
  return (
    <span
      className={`drop-ball in-cup drop-c${shown.tier}`}
      style={{
        left: `${(shown.x / CUP_W) * 100}%`,
        top: `${(shown.y / CUP_H) * 100}%`,
        width: `${(diameter / CUP_W) * 100}%`,
        height: `${(diameter / CUP_H) * 100}%`,
        transform: `translate(-50%, -50%) scale(${sx}, ${sy}) rotate(${pose.rot}deg)`,
      }}
    >
      <BallFace tier={shown.tier} />
    </span>
  );
}

const UNIT_SHAPE = { sx: 1, sy: 1 };

const POP_RISE = 86;

function ScoreBubble({ pop }: { pop: ScorePop }) {
  const t = Math.min(1, pop.age / POP_LIFE_MS);
  const y = pop.y - t * POP_RISE;
  return (
    <span
      className="drop-pop"
      aria-hidden="true"
      style={{
        left: `${(pop.x / CUP_W) * 100}%`,
        top: `${(y / CUP_H) * 100}%`,
        opacity: 1 - t,
        transform: `translate(-50%, -50%) scale(${1 - t * 0.28})`,
      }}
    >
      +{pop.points}
    </span>
  );
}

function FixedBall({ tier, px }: { tier: number; px: number }) {
  return (
    <span className={`drop-ball drop-c${tier}`} style={{ width: px, height: px }}>
      <BallFace tier={tier} />
    </span>
  );
}

function legendPx(tier: number): number {
  return Math.round(14 + tier * 1.6);
}
