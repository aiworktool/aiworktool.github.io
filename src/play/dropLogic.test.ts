import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CUP_H, CUP_W, DANGER_Y, MAX_SCORE, MAX_TIER, OVER_DELAY_MS, aimDelta, armDrop, clampAim,
  isDropKey, mergeStep, newGame, nudgeAim, overAfterSettle, release, restingAboveLine, spawnTier,
  tierRadius, tierScore, type Ball, type DropState, type PointerArm,
} from './dropLogic';
import { ballPose, breathShape, impactOf } from './dropFeel';
import { MERGE_BLEND_MS, POP_LIFE_MS } from './dropMerge';
import { STEP_MS, needsSim, stepDrop } from './dropPhysics';
import {
  DROP_STORAGE_KEY, MAX_PROGRESS_CHARS, decodeProgress, loadProgress, saveProgress,
  stateFromProgress, toProgress, type DropStore,
} from './dropProgress';

describe('drop aim', () => {
  it('clamps the aim inside the walls', () => {
    expect(clampAim(-20, 0)).toBe(tierRadius(0));
    expect(clampAim(CUP_W + 40, 3)).toBe(CUP_W - tierRadius(3));
    expect(clampAim(CUP_W / 2, 0)).toBe(CUP_W / 2);
    expect(tierRadius(0)).toBeLessThan(tierRadius(MAX_TIER));
    const widest = tierRadius(MAX_TIER) * 2 + tierRadius(MAX_TIER - 1) * 2;
    expect(CUP_W).toBe(widest);
    expect(tierRadius(MAX_TIER) * 4).toBeGreaterThan(CUP_W);
    const start = newGame(0, () => 0);
    const pinned = { ...start, aim: tierRadius(start.current) };
    expect(nudgeAim(pinned, -1).aim).toBe(tierRadius(pinned.current));
    const dropped = release({ ...start, aim: -40 });
    expect(dropped.balls[0].x).toBe(tierRadius(dropped.balls[0].tier));
    expect(dropped.balls[0].x).toBeLessThanOrEqual(CUP_W - tierRadius(dropped.balls[0].tier));
    expect(aimDelta('ArrowLeft')).toBe(-1);
    expect(aimDelta('d')).toBe(1);
    expect(aimDelta('x')).toBeNull();
    expect(isDropKey(' ')).toBe(true);
    expect(isDropKey('ArrowDown')).toBe(true);
  });
});

describe('drop merge', () => {
  it('merges two equal balls into the next tier once', () => {
    const before = [ball(1, 0, 80, 400, 10, 20), ball(2, 0, 96, 400, 30, 40)];
    const merged = mergeStep(before, 3);
    expect(merged.balls).toHaveLength(1);
    expect(merged.balls[0].tier).toBe(1);
    expect(merged.balls[0].x).toBe(88);
    expect(merged.balls[0].y).toBe(400);
    expect(merged.balls[0].vx).toBeCloseTo(16);
    expect(merged.balls[0].vy).toBeCloseTo(24);
    expect(merged.score).toBe(tierScore(1));
    expect(before[0].tier).toBe(0);
    expect(tierScore(4)).toBe(4);
    expect(tierScore(0)).toBe(0);
  });

  it('does not skip a tier in one contact', () => {
    const merged = mergeStep([
      ball(1, 0, 80, 200),
      ball(2, 0, 96, 200),
      ball(3, 1, 88, 220),
    ], 4);
    expect(merged.balls.map((item) => item.tier).sort()).toEqual([1, 1]);
    expect(merged.balls.some((item) => item.tier >= 2)).toBe(false);
    expect(merged.score).toBe(tierScore(1));
  });

  it('does not merge different tiers or a ball with itself', () => {
    const different = mergeStep([ball(1, 0, 80, 200), ball(2, 1, 90, 200)], 3);
    expect(different.score).toBe(0);
    expect(different.balls.map((item) => item.tier).sort()).toEqual([0, 1]);
    const one = ball(7, 0, 80, 200);
    const self = mergeStep([one, { ...one }], 8);
    expect(self.score).toBe(0);
    expect(self.balls).toHaveLength(1);
    expect(self.balls[0].tier).toBe(0);
    const biggest = mergeStep([ball(1, MAX_TIER, 140, 300), ball(2, MAX_TIER, 150, 300)], 3);
    expect(biggest.score).toBe(0);
    expect(biggest.balls).toHaveLength(2);
  });
});

describe('drop game over', () => {
  it('ends only when a resting ball stays above the line', () => {
    const piled = stack([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2]);
    expect(piled.some((item) => item.y < DANGER_Y)).toBe(true);
    expect(restingAboveLine(piled)).toBe(true);
    const moving = piled.map((item) => ({ ...item, rest: false, vy: 80 }));
    expect(restingAboveLine(moving)).toBe(false);
    expect(overAfterSettle(moving, OVER_DELAY_MS)).toBe(false);
    expect(overAfterSettle(piled, OVER_DELAY_MS - 1)).toBe(false);
    expect(overAfterSettle(piled, OVER_DELAY_MS)).toBe(true);
    const floor = stack([0]);
    expect(floor[0].y).toBeGreaterThan(DANGER_Y);
    expect(overAfterSettle(floor, 10_000)).toBe(false);
    const lost = stepDrop(dropping(piled, OVER_DELAY_MS, 7), STEP_MS);
    expect(lost.phase).toBe('over');
    expect(lost.score).toBe(0);
    expect(lost.best).toBe(7);
    const falling = stepDrop(dropping([{
      ...floor[0], y: DANGER_Y - 20, vy: 400, rest: false,
    }], 9_000, 0), STEP_MS);
    expect(falling.phase).toBe('drop');
  });

  it('puts the next ball in hand while the last one is still falling', () => {
    const state = { ...newGame(0, () => 0), current: 1, next: 2, aim: CUP_W / 2 };
    const spawned = release(state, () => 0);
    expect(spawned.phase).toBe('aim');
    expect(spawned.balls).toHaveLength(1);
    expect(spawned.balls[0].rest).toBe(false);
    expect(spawned.balls[0].tier).toBe(1);
    expect(spawned.current).toBe(2);
    expect(spawned.next).toBe(spawnTier(() => 0));
    expect(spawned.score).toBe(0);
    const again = release(spawned, () => 0.2);
    expect(again.balls).toHaveLength(2);
    expect(again.phase).toBe('aim');
    expect(again.current).toBe(spawned.next);
    const fresh = newGame(MAX_SCORE + 5, () => 0.2);
    expect(fresh.best).toBe(MAX_SCORE);
    expect(fresh.score).toBe(0);
    expect(fresh.balls).toEqual([]);
    expect(fresh.phase).toBe('aim');
  });
});

describe('drop progress', () => {
  it('rejects a bad version, huge text, or an out-of-range tier', () => {
    expect(DROP_STORAGE_KEY).toBe('handy-drop-v2');
    expect(decodeProgress(null)).toBeNull();
    expect(decodeProgress('')).toBeNull();
    expect(decodeProgress('not json')).toBeNull();
    expect(decodeProgress('x'.repeat(MAX_PROGRESS_CHARS + 1))).toBeNull();
    expect(decodeProgress(saved({ v: 1 }))).toBeNull();
    expect(decodeProgress(saved({ v: 3 }))).toBeNull();
    expect(decodeProgress(saved({ score: 4, best: 0 }))).toBeNull();
    expect(decodeProgress(saved({ score: 1.5, best: 2 }))).toBeNull();
    expect(decodeProgress(saved({ current: 99 }))).toBeNull();
    expect(decodeProgress(saved({ next: -1 }))).toBeNull();
    expect(decodeProgress(saved({ extra: 1 }))).toBeNull();
    expect(decodeProgress('{"v":2,"score":0}')).toBeNull();
    expect(decodeProgress(saved({ balls: [{ t: 40, x: 140, y: 400 }] }))).toBeNull();
    expect(decodeProgress(saved({ balls: [{ t: 0, x: 1, y: 430 }] }))).toBeNull();
    expect(decodeProgress(saved({ balls: [{ t: 0, x: 140, y: 900 }] }))).toBeNull();
    const mixed = [{ t: 0, x: 140, y: 430 }, { t: 11, x: 140, y: 400 }];
    expect(decodeProgress(saved({ balls: mixed }))).toBeNull();
  });

  it('keeps a valid cup and does not delete a v1 blob', () => {
    const raw = saved({
      score: 4,
      best: 9,
      current: 1,
      next: 0,
      balls: [{ t: 2, x: 80, y: 400 }],
    });
    const loaded = decodeProgress(raw);
    expect(loaded?.score).toBe(4);
    expect(loaded?.balls).toEqual([{ t: 2, x: 80, y: 400 }]);
    const above = decodeProgress(saved({ balls: [{ t: 0, x: 140, y: 40 }] }));
    expect(above).not.toBeNull();
    if (!above || !loaded) return;
    expect(stateFromProgress(above).phase).toBe('over');
    expect(stateFromProgress(loaded).phase).toBe('aim');
    const store = memory();
    store.setItem('handy-drop-v1', '{"v":1}');
    expect(loadProgress(store)).toBeNull();
    saveProgress(store, loaded);
    expect(store.getItem('handy-drop-v1')).toBe('{"v":1}');
    expect(loadProgress(store)).toEqual(loaded);
    expect(store.getItem(DROP_STORAGE_KEY)).toContain('"v":2');
    const state: DropState = {
      ...newGame(9, () => 0),
      score: 4,
      best: 9,
      current: 1,
      next: 0,
      balls: [{ id: 3, tier: 2, x: 80, y: 400, vx: 0, vy: 0, rest: true }],
    };
    expect(toProgress(state)).toEqual(loaded);
  });
});

describe('drop pointer', () => {
  it('releases one ball for pointerup and ignores the click from that gesture', () => {
    const idle: PointerArm = { down: false, swallowClick: false };
    const down = armDrop('down', idle);
    const up = armDrop('up', down.arm);
    const click = armDrop('click', up.arm);
    expect(down.drop).toBe(false);
    expect(up.drop).toBe(true);
    expect(click.drop).toBe(false);
    expect(click.ignore).toBe(true);
    const second = armDrop('up', armDrop('down', click.arm).arm);
    expect(second.drop).toBe(true);
    expect(armDrop('up', idle).drop).toBe(false);
    expect(armDrop('move', down.arm).drop).toBe(false);
  });
});

describe('drop delay', () => {
  it('starts merging on contact and finishes after a short blend', () => {
    let state = dropping(touchingPair(0, 0), 0, 0);
    const gapBefore = Math.abs(state.balls[0].x - state.balls[1].x);
    state = stepDrop(state, STEP_MS);
    expect(state.balls).toHaveLength(2);
    expect(state.score).toBe(0);
    expect(state.waits).toHaveLength(1);
    expect(state.waits[0].ms).toBeGreaterThan(0);
    expect(Math.abs(state.balls[0].x - state.balls[1].x)).toBeLessThan(gapBefore);
    expect(state.balls.map((item) => item.tier).sort()).toEqual([0, 0]);
    const steps = Math.ceil(MERGE_BLEND_MS / STEP_MS) + 2;
    for (let i = 0; i < steps; i += 1) state = stepDrop(state, STEP_MS);
    expect(state.balls).toHaveLength(1);
    expect(state.balls[0].tier).toBe(1);
    expect(state.score).toBe(tierScore(1));
    expect(state.pops.some((pop) => pop.points === tierScore(1))).toBe(true);
    const scored = state.score;
    for (let i = 0; i < 8; i += 1) state = stepDrop(state, STEP_MS);
    expect(state.score).toBe(scored);
    expect(toProgress(state)).not.toHaveProperty('pops');
    expect(toProgress(state)).not.toHaveProperty('waits');
    let faded = state;
    const fadeSteps = Math.ceil(POP_LIFE_MS / STEP_MS) + 2;
    for (let i = 0; i < fadeSteps; i += 1) faded = stepDrop(faded, STEP_MS);
    expect(faded.pops).toEqual([]);
  });

  it('still merges equal balls after they bounce apart', () => {
    let state = stepDrop(dropping(touchingPair(0, 0), 0, 0), STEP_MS);
    expect(state.balls).toHaveLength(2);
    expect(state.score).toBe(0);
    state = {
      ...state,
      balls: [
        { ...state.balls[0], x: tierRadius(0) + 4 },
        { ...state.balls[1], x: CUP_W - tierRadius(0) - 4 },
      ],
    };
    for (let i = 0; i < 24; i += 1) state = stepDrop(state, STEP_MS);
    expect(state.balls).toHaveLength(1);
    expect(state.balls[0].tier).toBe(1);
    expect(state.score).toBe(tierScore(1));
    expect(state.pops.some((pop) => pop.points === tierScore(1))).toBe(true);
  });

  it('does not merge different tiers that overlap', () => {
    let state = dropping([
      ball(1, 0, 120, 200),
      ball(2, 1, 130, 200),
    ], 0, 0);
    for (let i = 0; i < 40; i += 1) state = stepDrop(state, STEP_MS);
    expect(state.score).toBe(0);
    expect(state.balls).toHaveLength(2);
    expect(state.pops).toEqual([]);
  });
});

describe('drop physics', () => {
  it('lands a ball in the cup and merges the next equal ball', () => {
    let state: DropState = { ...newGame(0, () => 0), current: 0, next: 0, aim: CUP_W / 2 };
    state = release(state, () => 0);
    state = settle(state);
    expect(state.phase).toBe('aim');
    expect(state.balls).toHaveLength(1);
    expect(state.balls[0].rest).toBe(true);
    expect(state.balls[0].y).toBeGreaterThan(CUP_H - tierRadius(0) - 2);
    state = release({ ...state, aim: CUP_W / 2 }, () => 0);
    state = settle(state);
    expect(state.phase).toBe('aim');
    expect(state.balls).toHaveLength(1);
    expect(state.balls[0].tier).toBe(1);
    expect(state.score).toBe(tierScore(1));
    expect(state.balls[0].rest).toBe(true);
  });

  it('squashes a landing ball and the ball it touches, less on a larger ball', () => {
    const base = ball(1, 8, CUP_W / 2, CUP_H - tierRadius(8));
    base.rest = true;
    const falling = ball(2, 0, CUP_W / 2, base.y - tierRadius(8) - tierRadius(0) - 6, 0, 980);
    let state = dropping([base, falling], 0, 0);
    let peakSmall = 0;
    let peakLarge = 0;
    for (let i = 0; i < 90; i += 1) {
      state = stepDrop(state, STEP_MS);
      peakSmall = Math.max(peakSmall, state.balls.find((item) => item.id === 2)?.squash ?? 0);
      peakLarge = Math.max(peakLarge, state.balls.find((item) => item.id === 1)?.squash ?? 0);
    }
    expect(peakSmall).toBeGreaterThan(0.15);
    expect(peakLarge).toBeGreaterThan(0.04);
    expect(impactOf(900, 8, 0)).toBeGreaterThan(impactOf(900, 8, 8));
    const shaped = { id: 1, x: 0, y: 0, vx: 0, vy: 0, rest: true, squash: 0.8, jolt: 0 };
    const smallPose = ballPose({ ...shaped, tier: 0 }, 0);
    const largePose = ballPose({ ...shaped, tier: MAX_TIER }, 0);
    expect(Math.abs(1 - smallPose.sy)).toBeGreaterThan(Math.abs(1 - largePose.sy));
    expect(smallPose.sy).toBeLessThan(0.72);
    expect(smallPose.sy).toBeGreaterThan(0.54);
    let dropped = release({ ...newGame(0, () => 0), current: 0, next: 1, aim: CUP_W / 2 }, () => 0);
    let flattest = 1;
    let tallest = 1;
    for (let i = 0; i < 90; i += 1) {
      dropped = stepDrop(dropped, STEP_MS);
      for (const item of dropped.balls) {
        const pose = ballPose(item, i * 16);
        flattest = Math.min(flattest, pose.sy);
        if (item.vy > 240 && (item.squash ?? 0) < 0.05) tallest = Math.max(tallest, pose.sy);
      }
    }
    expect(flattest).toBeLessThan(0.69);
    expect(flattest).toBeGreaterThan(0.52);
    expect(tallest).toBeGreaterThan(1.18);
  });

  it('drops a ball that is only touching the side of another ball', () => {
    const base = ball(1, 4, CUP_W / 2, CUP_H - tierRadius(4));
    base.rest = true;
    const side = ball(2, 1, base.x + tierRadius(4) + tierRadius(1), base.y);
    side.rest = true;
    let state = dropping([base, side], 0, 0);
    for (let i = 0; i < 50; i += 1) state = stepDrop(state, STEP_MS);
    const moved = state.balls.find((item) => item.id === 2);
    expect(moved).toBeTruthy();
    expect(moved!.y).toBeGreaterThan(side.y + 8);
  });

  it('breathes contacting balls in opposite directions', () => {
    const left = ball(1, 2, 140, 240);
    const right = ball(2, 2, 140 + tierRadius(2) * 2, 240);
    const shapes = breathShape([left, right], 880);
    const a = shapes.get(1);
    const b = shapes.get(2);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    const grow = (a?.sx ?? 1) - 1;
    const other = (b?.sx ?? 1) - 1;
    expect(grow * other).toBeLessThan(0);
    expect(Math.abs(grow)).toBeGreaterThan(0.03);
    expect(Math.abs(grow)).toBeLessThan(0.12);
    expect(Math.abs(other)).toBeGreaterThan(0.03);
    expect(Math.abs(other)).toBeLessThan(0.12);
    expect((a?.sx ?? 0) * (a?.sy ?? 0)).toBeGreaterThan(0.97);
    expect((a?.sx ?? 0) * (a?.sy ?? 0)).toBeLessThan(1.03);
    expect((b?.sx ?? 0) * (b?.sy ?? 0)).toBeGreaterThan(0.97);
    expect((b?.sx ?? 0) * (b?.sy ?? 0)).toBeLessThan(1.03);
  });

  it('keeps one breath period and does not speed up', () => {
    const lone = ball(1, 2, 80, 80);
    const period = 560 * 2 * Math.PI;
    const shapeAt = (t: number) => breathShape([lone], t).get(1);
    for (const t of [880, 10_000, 1_000_000]) {
      const start = shapeAt(t);
      const later = shapeAt(t + period);
      expect(start?.sx).toBeCloseTo(later?.sx ?? 0, 5);
      expect(start?.sy).toBeCloseTo(later?.sy ?? 0, 5);
    }
    const advance = (t: number) => {
      const at = (time: number) => (shapeAt(time)?.sx ?? 1) - 1;
      return (at(t + 1000) + at(t - 1000)) / (2 * at(t));
    };
    const early = advance(4000);
    expect(Math.abs(early)).toBeGreaterThan(0.1);
    expect(advance(14_000)).toBeCloseTo(early, 5);
    expect(advance(10_004_000)).toBeCloseTo(early, 5);
  });

  it('does not flip breath direction when the pile shifts', () => {
    const left = ball(1, 2, 140, 240);
    const right = ball(2, 2, 140 + tierRadius(2) * 2, 240);
    const before = breathShape([left, right], 880).get(1);
    left.y = 420;
    const after = breathShape([left, right], 880).get(1);
    expect(after?.sx).toBeCloseTo(before?.sx ?? 0, 5);
    expect(after?.sy).toBeCloseTo(before?.sy ?? 0, 5);
  });

  it('does not let a small ball lift a heavier ball', () => {
    const heavy = ball(1, 8, CUP_W / 2, 280);
    heavy.rest = true;
    const light = ball(2, 0, heavy.x, heavy.y + tierRadius(8) - 6, 0, -300);
    let state = dropping([heavy, light], 0, 0);
    for (let i = 0; i < 25; i += 1) state = stepDrop(state, STEP_MS);
    const moved = state.balls.find((item) => item.id === 1);
    expect(moved).toBeTruthy();
    expect(moved!.y).toBeGreaterThanOrEqual(heavy.y - 1);
  });

  it('sleeps after merges instead of retriggering squash', () => {
    let state: DropState = { ...newGame(0, () => 0), current: 0, next: 0, aim: CUP_W / 2 };
    const rng = () => 0;
    for (let n = 0; n < 18; n += 1) {
      const aim = 40 + (n % 7) * 48;
      state = release({ ...state, current: n % 3 === 2 ? 1 : 0, aim }, rng);
      for (let i = 0; i < 30; i += 1) state = stepDrop(state, STEP_MS);
    }
    for (let i = 0; i < 900 && needsSim(state); i += 1) state = stepDrop(state, STEP_MS);
    expect(state.score).toBeGreaterThan(0);
    expect(needsSim(state)).toBe(false);
    for (const item of state.balls) {
      expect(item.rest).toBe(true);
      expect(item.squash ?? 0).toBeLessThan(0.03);
      expect(item.jolt ?? 0).toBeLessThan(0.03);
      expect(item.hit ?? 0).toBeLessThan(0.03);
    }
    const period = 560 * 2 * Math.PI;
    const early = breathShape(state.balls, 20_000);
    const later = breathShape(state.balls, 20_000 + period);
    for (const item of state.balls) {
      expect(later.get(item.id)?.sx).toBeCloseTo(early.get(item.id)?.sx ?? 0, 5);
      expect(later.get(item.id)?.sy).toBeCloseTo(early.get(item.id)?.sy ?? 0, 5);
    }
  });

  it('does not let smaller neighbors shove a large ball upward', () => {
    const big = tierRadius(6);
    const mid = tierRadius(5);
    const heavy = ball(1, 6, CUP_W / 2, CUP_H - big - mid - 8, 0, 0, true);
    const under = ball(2, 5, heavy.x, CUP_H - mid, 0, -80, true);
    const left = ball(3, 4, heavy.x - big * 0.35, heavy.y + big * 0.72, 0, -40, true);
    const right = ball(4, 3, heavy.x + big * 0.4, heavy.y + big * 0.66, 0, -20, true);
    const nest = ball(5, 1, heavy.x - 8, heavy.y + big * 0.2, 0, 30, true);
    let state = dropping([heavy, under, left, right, nest], 0, 0);
    const startY = heavy.y;
    let highest = startY;
    for (let i = 0; i < 240; i += 1) {
      state = stepDrop(state, STEP_MS);
      const moved = state.balls.find((item) => item.id === 1);
      if (moved) highest = Math.min(highest, moved.y);
    }
    const end = state.balls.find((item) => item.id === 1);
    expect(end).toBeTruthy();
    expect(highest).toBeGreaterThanOrEqual(startY - 1);
    expect(end!.y).toBeGreaterThanOrEqual(startY - 1);
  });

  it('does not let a wall-pinned smaller ball lift a larger one', () => {
    const big = tierRadius(6);
    const mid = tierRadius(5);
    const heavy = ball(1, 6, big + 8, CUP_H - big - mid + 10, 0, 0, true);
    const pinned = ball(2, 5, mid, CUP_H - mid, 40, -120, true);
    let state = dropping([heavy, pinned], 0, 0);
    const startY = heavy.y;
    let highest = startY;
    for (let i = 0; i < 240; i += 1) {
      state = stepDrop(state, STEP_MS);
      const moved = state.balls.find((item) => item.id === 1);
      if (moved) highest = Math.min(highest, moved.y);
    }
    const end = state.balls.find((item) => item.id === 1);
    expect(end).toBeTruthy();
    expect(end!.tier).toBe(6);
    expect(highest).toBeGreaterThanOrEqual(startY - 1);
    expect(end!.y).toBeGreaterThanOrEqual(startY - 1);
  });

  it('settles in a pocket instead of bouncing', () => {
    const bigR = tierRadius(8);
    const smallR = tierRadius(2);
    const heavy = ball(1, 8, CUP_W / 2, CUP_H - bigR, 0, 0, true);
    const light = ball(2, 2, heavy.x + bigR + smallR - 0.2, CUP_H - smallR, 0, 0, true);
    let state = dropping([heavy, light], 0, 0);
    for (let i = 0; i < 240; i += 1) state = stepDrop(state, STEP_MS);
    expect(needsSim(state)).toBe(false);
    const settled = state.balls.find((item) => item.id === 2);
    expect(settled?.rest).toBe(true);
    const y = settled?.y ?? 0;
    for (let i = 0; i < 30; i += 1) state = stepDrop(state, STEP_MS);
    const later = state.balls.find((item) => item.id === 2);
    expect(later?.y).toBeCloseTo(y, 4);
    expect(later?.squash ?? 0).toBeLessThan(0.03);
  });

  it('rolls a small ball down a large ball shoulder', () => {
    for (const side of [-1, 1]) {
      const bigR = tierRadius(8);
      const smallR = tierRadius(2);
      const heavy = ball(1, 8, CUP_W / 2, CUP_H - bigR, 0, 0, true);
      const theta = 0.65;
      const reach = bigR + smallR;
      const light = ball(
        2,
        2,
        heavy.x + side * Math.sin(theta) * reach,
        heavy.y - Math.cos(theta) * reach,
        0,
        0,
        true,
      );
      let state = dropping([heavy, light], 0, 0);
      for (let i = 0; i < 180; i += 1) state = stepDrop(state, STEP_MS);
      const small = state.balls.find((item) => item.id === 2);
      const big = state.balls.find((item) => item.id === 1);
      expect(small).toBeTruthy();
      expect(big).toBeTruthy();
      expect(small!.y).toBeGreaterThan(light.y + 24);
      const dist = Math.hypot((small?.x ?? 0) - (big?.x ?? 0), (small?.y ?? 0) - (big?.y ?? 0));
      expect(dist).toBeGreaterThanOrEqual(bigR + smallR - 1);
    }
  });

  it('pulls a buried small ball out without lifting the large one', () => {
    const heavy = ball(1, 8, CUP_W / 2, CUP_H - tierRadius(8), 0, 0, true);
    const ra = tierRadius(8);
    const rb = tierRadius(0);
    const light = ball(2, 0, heavy.x - 16, heavy.y + 22, 0, 0, true);
    const buried = Math.hypot(light.x - heavy.x, light.y - heavy.y);
    expect(buried).toBeLessThan(ra + rb - 8);
    let state = dropping([heavy, light], 0, 0);
    for (let i = 0; i < 80; i += 1) state = stepDrop(state, STEP_MS);
    const big = state.balls.find((item) => item.id === 1);
    const small = state.balls.find((item) => item.id === 2);
    expect(big).toBeTruthy();
    expect(small).toBeTruthy();
    const dist = Math.hypot((big?.x ?? 0) - (small?.x ?? 0), (big?.y ?? 0) - (small?.y ?? 0));
    expect(dist).toBeGreaterThanOrEqual(ra + rb - 1);
    expect(big!.y).toBeGreaterThanOrEqual(heavy.y - 1);
  });

  it('pushes a small ball out of a large resting ball', () => {
    const heavy = ball(1, 8, CUP_W / 2, CUP_H - tierRadius(8));
    heavy.rest = true;
    const ra = tierRadius(8);
    const rb = tierRadius(0);
    const light = ball(2, 0, heavy.x + ra - 10, heavy.y);
    light.rest = true;
    let state = dropping([heavy, light], 0, 0);
    for (let i = 0; i < 80; i += 1) state = stepDrop(state, STEP_MS);
    const big = state.balls.find((item) => item.id === 1);
    const small = state.balls.find((item) => item.id === 2);
    expect(big).toBeTruthy();
    expect(small).toBeTruthy();
    const dist = Math.hypot((big?.x ?? 0) - (small?.x ?? 0), (big?.y ?? 0) - (small?.y ?? 0));
    expect(dist).toBeGreaterThanOrEqual(ra + rb - 1);
    const shift = Math.hypot((big?.x ?? 0) - heavy.x, (big?.y ?? 0) - heavy.y);
    expect(shift).toBeLessThan(4);
  });
});

describe('drop route', () => {
  it('adds the card on the play list without a new home card', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const home = readFileSync('src/pages/HomePage.tsx', 'utf8');
    const list = readFileSync('src/pages/PlayListPage.tsx', 'utf8');
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(app).toContain("plainRoute('/play/drop'");
    expect(home.match(/'\/play'/g)).toHaveLength(1);
    expect(home).not.toContain('/play/drop');
    expect(list).toContain("'/play/drop'");
    expect(script).toContain("'play/drop'");
  });
});

function ball(
  id: number,
  tier: number,
  x: number,
  y: number,
  vx = 0,
  vy = 0,
  rest = false,
): Ball {
  return { id, tier, x, y, vx, vy, rest };
}

function stack(tiers: number[]): Ball[] {
  const balls: Ball[] = [];
  let top = CUP_H;
  tiers.forEach((tier, index) => {
    const radius = tierRadius(tier);
    const y = top - radius;
    balls.push({ id: index + 1, tier, x: CUP_W / 2, y, vx: 0, vy: 0, rest: true });
    top = y - radius;
  });
  return balls;
}

function dropping(balls: Ball[], calmMs: number, best: number): DropState {
  return {
    ...newGame(best, () => 0),
    phase: 'drop',
    balls,
    calmMs,
    nextId: 40,
  };
}

function settle(state: DropState): DropState {
  let next = state;
  for (let i = 0; i < 500 && needsSim(next); i += 1) {
    const stepped = stepDrop(next, STEP_MS);
    if (stepped === next) break;
    next = stepped;
  }
  return next;
}

function touchingPair(tierA: number, tierB: number): Ball[] {
  const left = 120;
  return [
    ball(1, tierA, left, 200),
    ball(2, tierB, left + tierRadius(tierA) + tierRadius(tierB), 200),
  ];
}

function saved(extra: Record<string, unknown>): string {
  return JSON.stringify({
    v: 2,
    score: 0,
    best: 0,
    current: 0,
    next: 1,
    balls: [],
    ...extra,
  });
}

function memory(): DropStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
}
