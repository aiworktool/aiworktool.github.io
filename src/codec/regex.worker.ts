import { testRegex, type RegexFlags } from './regexTool';

type Request = { pattern: string; text: string; flags: RegexFlags };

self.onmessage = (event: MessageEvent<Request>) => {
  const { pattern, text, flags } = event.data;
  self.postMessage(testRegex(pattern, text, flags));
};
