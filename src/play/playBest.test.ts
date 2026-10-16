import { describe, expect, it } from 'vitest';
import {
  BEST_VERSION,
  POUR_BEST_MAX,
  POUR_LAYOUTS,
  decodeBest,
  loadBest,
  loadBestList,
  lowerBest,
  raiseBest,
  saveBest,
  saveBestList,
  type BestStore,
} from './playBest';

describe('local best scores', () => {
  it('keeps a higher score and ignores a lower one', () => {
    expect(raiseBest(4, 9, 100)).toBe(9);
    expect(raiseBest(9, 4, 100)).toBe(9);
    expect(raiseBest(9, 9, 100)).toBe(9);
    expect(raiseBest(1, 1.5, 100)).toBe(1);
    expect(raiseBest(1, 101, 100)).toBe(1);
  });

  it('keeps the fewer pours and treats zero as no record', () => {
    expect(lowerBest(0, 6, POUR_BEST_MAX)).toBe(6);
    expect(lowerBest(6, 4, POUR_BEST_MAX)).toBe(4);
    expect(lowerBest(4, 8, POUR_BEST_MAX)).toBe(4);
    expect(lowerBest(4, 0, POUR_BEST_MAX)).toBe(4);
  });

  it('rejects a bad blob and reloads a saved one', () => {
    const store = memoryStore();
    expect(loadBest(store, 'handy-pop-v1', 100)).toBe(0);
    expect(decodeBest('{"v":1}', 1, 100)).toBeNull();
    expect(decodeBest('{"v":2,"best":[3]}', 1, 100)).toBeNull();
    expect(decodeBest('{"v":1,"best":[-1]}', 1, 100)).toBeNull();
    expect(decodeBest('{"v":1,"best":[1,2]}', 1, 100)).toBeNull();
    expect(decodeBest(`{"v":${BEST_VERSION},"best":[3],"extra":1}`, 1, 100)).toBeNull();
    saveBest(store, 'handy-pop-v1', 12, 100);
    expect(loadBest(store, 'handy-pop-v1', 100)).toBe(12);
    store.set('handy-pop-v1', 'not-json');
    expect(loadBest(store, 'handy-pop-v1', 100)).toBe(0);
  });

  it('stores one fewest-move record for each pour layout', () => {
    const store = memoryStore();
    const key = 'handy-pour-v1';
    const first = [4, 0, 0];
    saveBestList(store, key, first, POUR_BEST_MAX);
    expect(loadBestList(store, key, POUR_LAYOUTS, POUR_BEST_MAX)).toEqual(first);
    const next = first.slice();
    next[1] = lowerBest(0, 7, POUR_BEST_MAX);
    saveBestList(store, key, next, POUR_BEST_MAX);
    expect(loadBestList(store, key, POUR_LAYOUTS, POUR_BEST_MAX)).toEqual([4, 7, 0]);
    store.set(key, '{"v":1,"best":[1,2]}');
    expect(loadBestList(store, key, POUR_LAYOUTS, POUR_BEST_MAX)).toBeNull();
  });
});

function memoryStore(): BestStore & { set: (key: string, value: string) => void } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    set: (key, value) => {
      data.set(key, value);
    },
  };
}
