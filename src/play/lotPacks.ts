import { HIGH_LEVELS } from './lotLevelsHigh';
import { LEVELS } from './lotLevels';
import { MID_LEVELS } from './lotLevelsMid';
import type { Level } from './lotTypes';

export type LotDifficulty = 'low' | 'mid' | 'high';

export const LOT_DIFFICULTIES: readonly LotDifficulty[] = ['low', 'mid', 'high'];
export const LEVELS_EACH = 10;

export function levelsFor(difficulty: LotDifficulty): Level[] {
  if (difficulty === 'mid') return MID_LEVELS;
  if (difficulty === 'high') return HIGH_LEVELS;
  return LEVELS;
}
