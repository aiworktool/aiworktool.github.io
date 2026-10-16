import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enDisclaimer, enGuides } from './en';
import { guideSlugs } from './types';
import { zhDisclaimer, zhGuides } from './zh';

const sections = ['what', 'firstDays', 'resources', 'pitfalls'] as const;

describe('game guides', () => {
  it('keeps Chinese and English guides aligned', () => {
    expect(zhDisclaimer).toBe(
      '这是根据公开玩法整理的入门提示，会随版本变化，不是官方攻略。',
    );
    expect(enDisclaimer.length).toBeGreaterThan(0);
    for (const slug of guideSlugs) {
      expect(zhGuides[slug].slug).toBe(slug);
      expect(enGuides[slug].slug).toBe(slug);
      expect(zhGuides[slug].disclaimer).toBe(zhDisclaimer);
      expect(enGuides[slug].disclaimer).toBe(enDisclaimer);
      expect(zhGuides[slug].title.length).toBeGreaterThan(0);
      expect(enGuides[slug].title.length).toBeGreaterThan(0);
      for (const section of sections) {
        expect(zhGuides[slug][section].length).toBeGreaterThan(1);
        expect(enGuides[slug][section].length).toBe(zhGuides[slug][section].length);
      }
    }
  });

  it('registers every guide path for the static host', () => {
    const script = readFileSync('scripts/pages-fallback.mjs', 'utf8');
    expect(script).toContain("'guides'");
    for (const slug of guideSlugs) {
      expect(script).toContain(`'guides/${slug}'`);
    }
  });
});
