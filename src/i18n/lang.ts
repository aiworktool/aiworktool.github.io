export type Lang = 'zh' | 'en';

export function langFromPath(pathname: string): Lang {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh';
}

export function localize(path: string, lang: Lang): string {
  const bare = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'zh') return bare;
  if (bare === '/') return '/en';
  return `/en${bare}`;
}

export function switchLang(pathname: string, lang: Lang): string {
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const base = trimmed === '/en' ? '/' : trimmed.startsWith('/en/') ? trimmed.slice(3) : trimmed;
  return localize(base || '/', lang);
}

export function currentLang(): Lang {
  if (typeof location === 'undefined') return 'zh';
  return langFromPath(location.pathname);
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
