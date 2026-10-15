import { describe, expect, it } from 'vitest';
import { formatJsonText } from '../json/formatJson';
import { langFromPath, localize, switchLang } from './lang';

describe('language paths', () => {
  it('keeps Chinese urls and prefixes English urls', () => {
    expect(langFromPath('/json/')).toBe('zh');
    expect(langFromPath('/en/json')).toBe('en');
    expect(localize('/json', 'en')).toBe('/en/json');
    expect(localize('/', 'en')).toBe('/en');
    expect(switchLang('/en/qr/', 'zh')).toBe('/qr');
    expect(switchLang('/time', 'en')).toBe('/en/time');
  });

  it('translates json errors when English is requested', () => {
    expect(formatJsonText('  ', 'en')).toEqual({ ok: false, message: 'Paste JSON first.' });
    expect(formatJsonText('  ')).toEqual({ ok: false, message: '请先粘贴 JSON。' });
  });
});
