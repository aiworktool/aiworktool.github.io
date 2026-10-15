import { useEffect, useRef } from 'react';
import { useI18n } from './useI18n';

export function useLangChange(onChange: () => void): void {
  const { lang } = useI18n();
  const saved = useRef(onChange);
  saved.current = onChange;
  const seen = useRef(lang);

  useEffect(() => {
    if (seen.current === lang) return;
    seen.current = lang;
    saved.current();
  }, [lang]);
}
