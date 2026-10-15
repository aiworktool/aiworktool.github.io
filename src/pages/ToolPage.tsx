import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { usePageTitle } from './usePageTitle';

export function ToolPage({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  usePageTitle(title);
  return (
    <main>
      <p><Link to="/">返回首页</Link></p>
      <h1>{title}</h1>
      <p className="privacy">{note}</p>
      {children}
      <SiteFooter />
    </main>
  );
}
