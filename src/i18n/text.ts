import { en } from './en';
import type { Lang } from './lang';
import { zh, type Copy } from './zh';

export function text(lang: Lang = 'zh'): Copy {
  return lang === 'en' ? en : zh;
}
