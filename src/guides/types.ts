export const guideSlugs = [
  'honor-of-kings',
  'delta-force',
  'game-for-peace',
  'tft',
  'genshin',
  'valorant-mobile',
] as const;

export type GuideSlug = (typeof guideSlugs)[number];

export type Guide = {
  slug: GuideSlug;
  title: string;
  summary: string;
  what: string[];
  firstDays: string[];
  resources: string[];
  pitfalls: string[];
  disclaimer: string;
};

export type GuideBook = Record<GuideSlug, Guide>;
