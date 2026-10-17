export type Lang = 'zh' | 'en';

export function langFromPath(pathname: string): Lang {
  return pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en';
}

export function localize(path: string, lang: Lang): string {
  const bare = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'en') return bare;
  if (bare === '/') return '/zh';
  return `/zh${bare}`;
}

export function switchLang(pathname: string, lang: Lang): string {
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const base = trimmed === '/zh' ? '/' : trimmed.startsWith('/zh/') ? trimmed.slice(3) : trimmed;
  return localize(base || '/', lang);
}

export function currentLang(): Lang {
  if (typeof location === 'undefined') return 'en';
  return langFromPath(location.pathname);
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
