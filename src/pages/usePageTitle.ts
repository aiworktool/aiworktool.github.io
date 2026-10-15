import { useEffect } from 'react';
import { useI18n } from './useI18n';

export function usePageTitle(title: string): void {
  const { m } = useI18n();
  useEffect(() => {
    document.title = title === m.siteName ? m.siteName : `${title} · ${m.siteName}`;
  }, [title, m.siteName]);
}
