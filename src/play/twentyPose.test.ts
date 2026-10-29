import { describe, expect, it } from 'vitest';
import {
  nextHeightBase, nextTorsoGate, torsoDir,
  type PosePoint, type TorsoBody,
} from './twentyPose';
import { boardFrame, torsoOutline } from './twentyPoseDraw';

const point = (x: number, y: number, visibility = 1): PosePoint => ({ x, y, visibility });

function body(partial: Partial<TorsoBody> = {}): TorsoBody {
  return {
    leftShoulder: point(0.38, 0.35),
    rightShoulder: point(0.62, 0.35),
    leftHip: point(0.4, 0.62),
    rightHip: point(0.6, 0.62),
    ...partial,
  };
}

describe('torsoDir', () => {
  const base = { y: 0.485, ready: true };

  it('moves left and right from the shoulder midline', () => {
    expect(torsoDir(body({
      leftShoulder: point(0.22, 0.35),
      rightShoulder: point(0.46, 0.35),
    }), base)).toBe('left');
    expect(torsoDir(body({
      leftShoulder: point(0.54, 0.35),
      rightShoulder: point(0.78, 0.35),
    }), base)).toBe('right');
  });

  it('moves up and down from the standing height base', () => {
    expect(torsoDir(body({
      leftShoulder: point(0.38, 0.28),
      rightShoulder: point(0.62, 0.28),
      leftHip: point(0.4, 0.55),
      rightHip: point(0.6, 0.55),
    }), base)).toBe('up');
    expect(torsoDir(body({
      leftShoulder: point(0.38, 0.42),
      rightShoulder: point(0.62, 0.42),
      leftHip: point(0.4, 0.7),
      rightHip: point(0.6, 0.7),
    }), base)).toBe('down');
  });

  it('stays idle near the center', () => {
    expect(torsoDir(body(), base)).toBe('none');
  });
});

describe('nextHeightBase', () => {
  it('locks a baseline while idle and keeps it while leaning', () => {
    const first = nextHeightBase({ y: 0, ready: false }, body(), 'none');
    const held = nextHeightBase(first, body({
      leftShoulder: point(0.22, 0.35),
      rightShoulder: point(0.46, 0.35),
    }), 'left');
    expect(first.ready).toBe(true);
    expect(held.y).toBe(first.y);
  });
});

describe('nextTorsoGate', () => {
  it('fires once until the torso returns to center', () => {
    const first = nextTorsoGate({ last: 'none', at: 0 }, 'left', 1000);
    const held = nextTorsoGate(first.gate, 'left', 1600);
    const center = nextTorsoGate(held.gate, 'none', 1700);
    const again = nextTorsoGate(center.gate, 'left', 2300);
    expect(first.fire).toBe('left');
    expect(held.fire).toBeNull();
    expect(again.fire).toBe('left');
  });
});

describe('twenty pose draw', () => {
  it('fills nearly the whole camera with the board', () => {
    const frame = boardFrame(800, 800);
    expect(frame.w).toBeGreaterThan(780);
    expect(frame.h).toBe(frame.w);
  });

  it('builds a closed torso outline from shoulders and hips', () => {
    const pts = torsoOutline(body(), 100, 100);
    expect(pts).toHaveLength(4);
    expect(pts[0].x).toBeLessThan(pts[1].x);
    expect(pts[0].y).toBeLessThan(pts[3].y);
  });
});
