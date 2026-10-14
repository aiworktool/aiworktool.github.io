import { useEffect } from 'react';

export const SITE_NAME = '便捷工具';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  }, [title]);
}
