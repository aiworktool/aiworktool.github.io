import type { Lang } from '../i18n/lang';
import { enGuides } from './en';
import { guideSlugs, type Guide, type GuideSlug } from './types';
import { zhGuides } from './zh';

export function guidesFor(lang: Lang): Guide[] {
  const book = lang === 'en' ? enGuides : zhGuides;
  return guideSlugs.map((slug) => book[slug]);
}

export function guideBySlug(lang: Lang, slug: string | undefined): Guide | null {
  if (!isGuideSlug(slug)) return null;
  const book = lang === 'en' ? enGuides : zhGuides;
  return book[slug];
}

function isGuideSlug(slug: string | undefined): slug is GuideSlug {
  return !!slug && (guideSlugs as readonly string[]).includes(slug);
}
