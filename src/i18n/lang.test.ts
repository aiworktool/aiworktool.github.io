import { describe, expect, it } from 'vitest';
import { formatJsonText } from '../json/formatJson';
import { langFromPath, localize, switchLang } from './lang';

describe('language paths', () => {
  it('keeps English urls by default and prefixes Chinese urls', () => {
    expect(langFromPath('/json/')).toBe('en');
    expect(langFromPath('/zh/json')).toBe('zh');
    expect(localize('/json', 'en')).toBe('/json');
    expect(localize('/', 'zh')).toBe('/zh');
    expect(switchLang('/zh/qr/', 'zh')).toBe('/zh/qr');
    expect(switchLang('/zh/qr/', 'en')).toBe('/qr');
    expect(switchLang('/time', 'en')).toBe('/time');
    expect(switchLang('/time', 'zh')).toBe('/zh/time');
  });

  it('translates json errors when English is requested', () => {
    expect(formatJsonText('  ', 'en')).toEqual({ ok: false, message: 'Paste JSON first.' });
    expect(formatJsonText('  ')).toEqual({ ok: false, message: '请先粘贴 JSON。' });
  });
});
