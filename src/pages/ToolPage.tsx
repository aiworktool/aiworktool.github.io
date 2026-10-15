import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';

export function ToolPage({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  const { m, to } = useI18n();
  usePageTitle(title);
  return (
    <main>
      <p><Link to={to('/')}>{m.backHome}</Link></p>
      <h1>{title}</h1>
      <p className="privacy">{note}</p>
      {children}
      <SiteFooter />
    </main>
  );
}
