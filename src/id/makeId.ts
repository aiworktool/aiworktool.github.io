import type { Lang } from '../i18n/lang';
import { text } from '../i18n/text';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*-_=+';

export type PasswordSets = { upper: boolean; lower: boolean; digit: boolean; symbol: boolean };

export function makeUuids(
  count: number,
  lang: Lang = 'zh',
): { ok: true; values: string[] } | { ok: false; message: string } {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return { ok: false, message: text(lang).uuid.badCount };
  }
  return { ok: true, values: Array.from({ length: count }, () => crypto.randomUUID()) };
}

export function makePassword(
  length: number,
  sets: PasswordSets,
  lang: Lang = 'zh',
): { ok: true; value: string } | { ok: false; message: string } {
  const copy = text(lang).password;
  if (!Number.isInteger(length) || length < 8 || length > 64) return { ok: false, message: copy.badLength };
  const pools = chosenPools(sets);
  if (!pools.length) return { ok: false, message: copy.needSet };
  const chars = pools.map(pick);
  while (chars.length < length) chars.push(pick(pools.join('')));
  return { ok: true, value: shuffle(chars).join('') };
}

function chosenPools(sets: PasswordSets): string[] {
  const pools = [sets.upper && UPPER, sets.lower && LOWER, sets.digit && DIGIT, sets.symbol && SYMBOL];
  return pools.filter((pool): pool is string => Boolean(pool));
}

function pick(chars: string): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return chars[buf[0] % chars.length];
}

function shuffle(chars: string[]): string[] {
  const order = new Uint32Array(chars.length);
  crypto.getRandomValues(order);
  return chars
    .map((char, index) => ({ char, order: order[index] }))
    .sort((a, b) => a.order - b.order)
    .map((item) => item.char);
}
