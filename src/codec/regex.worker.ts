import type { Lang } from '../i18n/lang';
import { testRegex, type RegexFlags } from './regexTool';

type Request = { pattern: string; text: string; flags: RegexFlags; lang?: Lang };

self.onmessage = (event: MessageEvent<Request>) => {
  const { pattern, text, flags, lang } = event.data;
  self.postMessage(testRegex(pattern, text, flags, lang ?? 'zh'));
};
