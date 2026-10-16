import { Link } from 'react-router-dom';
import { guidesFor } from '../guides/book';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

export default function GuideListPage() {
  const { m, lang, to } = useI18n();
  const copy = m.guides;
  return (
    <ToolPage title={copy.title} note={copy.note}>
      <div className="tool-grid">
        {guidesFor(lang).map((guide) => (
          <Link key={guide.slug} className="tool-card" to={to(`/guides/${guide.slug}`)}>
            <strong>{guide.title}</strong>
            <p>{guide.summary}</p>
          </Link>
        ))}
      </div>
    </ToolPage>
  );
}
