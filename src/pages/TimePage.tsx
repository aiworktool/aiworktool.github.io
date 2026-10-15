import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { TimeTools } from './TimeTools';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';

export default function TimePage() {
  const { m, to } = useI18n();
  usePageTitle(m.time.title);
  return (
    <main>
      <p><Link to={to('/')}>{m.backHome}</Link></p>
      <h1>{m.time.title}</h1>
      <p className="privacy">{m.time.privacy}</p>
      <TimeTools />
      <SiteFooter />
    </main>
  );
}
