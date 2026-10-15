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

function collect(pattern: RegExp, text: string): RegexResult {
  const matches: RegexMatch[] = [];
  const started = performance.now();
  let found = pattern.exec(text);
  while (found) {
    if (matches.length >= MAX_MATCHES) return { ok: false, message: '匹配超过 200 次，已停止。' };
    if (performance.now() - started > MAX_MS) return { ok: false, message: '表达式可能过慢，已停止。' };
    matches.push({ text: found[0], groups: found.slice(1).map((group) => group ?? '') });
    if (!pattern.global) break;
    if (found[0] === '') pattern.lastIndex += 1;
    found = pattern.exec(text);
  }
  return { ok: true, matches };
}

export function testRegex(pattern: string, text: string, flags: RegexFlags): RegexResult {
  const longPattern = rejectLength(pattern, REGEX_PATTERN_MAX, '表达式超过 1 KB，请缩短后再测试。');
  if (longPattern) return longPattern;
  const longText = rejectLength(text, REGEX_TEXT_MAX, '待测文本超过 20 万字符，请缩短后再测试。');
  if (longText) return longText;
  if (!pattern) return { ok: false, message: '请先填写表达式。' };
  try {
    return collect(new RegExp(pattern, flagText(flags)), text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : '无法编译';
    return { ok: false, message: `这个表达式无法使用。${detail}` };
  }
}
