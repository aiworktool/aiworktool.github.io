import { fill, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import { REGEX_PATTERN_MAX, REGEX_TEXT_MAX, rejectLength } from './result';

export type RegexFlags = { global: boolean; ignoreCase: boolean; multiline: boolean };
export type RegexMatch = { text: string; groups: string[] };
export type RegexResult =
  | { ok: true; matches: RegexMatch[] }
  | { ok: false; message: string };

const MAX_MATCHES = 200;
const MAX_MS = 500;

function flagText(flags: RegexFlags): string {
  return `${flags.global ? 'g' : ''}${flags.ignoreCase ? 'i' : ''}${flags.multiline ? 'm' : ''}`;
}

function collect(pattern: RegExp, source: string, lang: Lang): RegexResult {
  const copy = text(lang).regex;
  const matches: RegexMatch[] = [];
  const started = performance.now();
  let found = pattern.exec(source);
  while (found) {
    if (matches.length >= MAX_MATCHES) return { ok: false, message: copy.tooMany };
    if (performance.now() - started > MAX_MS) return { ok: false, message: copy.slow };
    matches.push({ text: found[0], groups: found.slice(1).map((group) => group ?? '') });
    if (!pattern.global) break;
    if (found[0] === '') pattern.lastIndex += 1;
    found = pattern.exec(source);
  }
  return { ok: true, matches };
}

export function testRegex(pattern: string, source: string, flags: RegexFlags, lang: Lang = 'zh'): RegexResult {
  const copy = text(lang).regex;
  const longPattern = rejectLength(pattern, REGEX_PATTERN_MAX, copy.patternTooBig);
  if (longPattern) return longPattern;
  const longText = rejectLength(source, REGEX_TEXT_MAX, copy.textTooBig);
  if (longText) return longText;
  if (!pattern) return { ok: false, message: copy.empty };
  try {
    return collect(new RegExp(pattern, flagText(flags)), source, lang);
  } catch (err) {
    const detail = err instanceof Error ? err.message : copy.cannotCompile;
    return { ok: false, message: fill(copy.cannot, { detail }) };
  }
}
