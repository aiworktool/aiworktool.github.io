import { describe, expect, it } from 'vitest';
import {
  acceptDrop, canSenseFollow, dropCleared, nextPoseGate, nextPoseMove,
  poseAction, poseLean, senseRow,
  type PoseBody, type PosePoint,
} from './tetrisPose';

const point = (x: number, y: number, visibility = 1): PosePoint => ({ x, y, visibility });

function body(partial: Partial<PoseBody> = {}): PoseBody {
  return {
    nose: point(0.5, 0.32),
    leftShoulder: point(0.38, 0.4),
    rightShoulder: point(0.62, 0.4),
    leftWrist: point(0.36, 0.7),
    rightWrist: point(0.64, 0.7),
    ...partial,
  };
}

describe('poseAction', () => {
  it('rotates only for a clap in front of the chest center', () => {
    expect(poseAction(body({
      leftWrist: point(0.46, 0.52),
      rightWrist: point(0.54, 0.53),
    }))).toBe('rotateCw');
    expect(poseAction(body({
      leftWrist: point(0.18, 0.5),
      rightWrist: point(0.28, 0.52),
    }))).toBe('none');
  });

  it('does not treat a single raised arm as a rotate', () => {
    expect(poseAction(body({ leftWrist: point(0.2, 0.2) }))).toBe('none');
  });

  it('drops when both wrists are below the shoulders and apart', () => {
    expect(poseAction(body({
      leftWrist: point(0.3, 0.7),
      rightWrist: point(0.72, 0.74),
    }))).toBe('drop');
  });

  it('ignores a pose with a hidden joint', () => {
    expect(poseAction(body({ leftWrist: point(0.46, 0.52, 0.1) }))).toBe('none');
  });
});

describe('poseLean', () => {
  it('moves left when both hands are slightly up and shifted left', () => {
    expect(poseLean(body({
      leftWrist: point(0.18, 0.48),
      rightWrist: point(0.42, 0.5),
    }))).toBe('left');
  });

  it('moves right when both hands are slightly up and shifted right', () => {
    expect(poseLean(body({
      leftWrist: point(0.58, 0.48),
      rightWrist: point(0.82, 0.5),
    }))).toBe('right');
  });

  it('does not move while hands stay down or only one arm is up', () => {
    expect(poseLean(body())).toBe('none');
    expect(poseLean(body({ leftWrist: point(0.2, 0.48) }))).toBe('none');
  });
});

describe('senseRow', () => {
  it('maps wrists at the shoulders to the top and a deep lower to the bottom', () => {
    expect(senseRow(body())).toBeGreaterThan(10);
    expect(senseRow(body({
      leftWrist: point(0.36, 0.4),
      rightWrist: point(0.64, 0.4),
    }))).toBe(0);
  });
});

describe('acceptDrop', () => {
  it('fires once then stays locked until the hands rise again', () => {
    const first = acceptDrop(true, 'drop', false);
    const held = acceptDrop(first.ready, 'drop', false);
    const flicker = acceptDrop(held.ready, 'none', false);
    const still = acceptDrop(flicker.ready, 'drop', false);
    const cleared = acceptDrop(still.ready, 'none', true);
    const again = acceptDrop(cleared.ready, 'drop', false);
    expect(first.action).toBe('drop');
    expect(held.action).toBe('none');
    expect(still.action).toBe('none');
    expect(again.action).toBe('drop');
    expect(dropCleared(body({
      leftWrist: point(0.36, 0.4),
      rightWrist: point(0.64, 0.4),
    }))).toBe(true);
  });
});

describe('canSenseFollow', () => {
  it('follows only while hands are slightly up, not while hard-dropping', () => {
    expect(canSenseFollow(body({
      leftWrist: point(0.36, 0.38),
      rightWrist: point(0.64, 0.39),
    }))).toBe(true);
    expect(canSenseFollow(body({
      leftWrist: point(0.3, 0.7),
      rightWrist: point(0.72, 0.74),
    }))).toBe(false);
  });
});

describe('nextPoseGate', () => {
  it('fires once until the arms return to rest', () => {
    const first = nextPoseGate({ last: 'none', at: 0 }, 'rotateCw', 1000);
    const held = nextPoseGate(first.gate, 'rotateCw', 2000);
    const released = nextPoseGate(held.gate, 'none', 2100);
    const again = nextPoseGate(released.gate, 'rotateCw', 2600);
    expect(first.fire).toBe('rotateCw');
    expect(held.fire).toBeNull();
    expect(again.fire).toBe('rotateCw');
  });

  it('waits out the cooldown before another action', () => {
    const first = nextPoseGate({ last: 'none', at: 0 }, 'drop', 1000);
    const soon = nextPoseGate({ last: 'none', at: first.gate.at }, 'rotateCw', 1200);
    expect(first.fire).toBe('drop');
    expect(soon.fire).toBeNull();
  });
});

describe('nextPoseMove', () => {
  it('repeats a raised-hand move on a short interval and stops at center', () => {
    const first = nextPoseMove({ dir: 'none', at: 0 }, 'left', 1000);
    const held = nextPoseMove(first.gate, 'left', 1100);
    const later = nextPoseMove(held.gate, 'left', 1200);
    const center = nextPoseMove(later.gate, 'none', 1400);
    expect(first.fire).toBe(true);
    expect(held.fire).toBe(false);
    expect(later.fire).toBe(true);
    expect(center.fire).toBe(false);
  });
});
