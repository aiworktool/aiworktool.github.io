import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { langFromPath, localize, type Lang } from '../i18n/lang';
import { text } from '../i18n/text';
import type { Copy } from '../i18n/zh';

export function useI18n(): { lang: Lang; m: Copy; to: (path: string) => string } {
  const { pathname } = useLocation();
  const lang = langFromPath(pathname);
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);
  return { lang, m: text(lang), to: (path) => localize(path, lang) };
}
