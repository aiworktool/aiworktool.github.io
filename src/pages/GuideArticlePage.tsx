import { Link, useParams } from 'react-router-dom';
import { guideBySlug } from '../guides/book';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

export default function GuideArticlePage() {
  const { slug } = useParams();
  const { m, lang, to } = useI18n();
  const copy = m.guides;
  const guide = guideBySlug(lang, slug);
  if (!guide) {
    return (
      <ToolPage title={copy.title} note={copy.note}>
        <p role="alert">{copy.missing}</p>
      </ToolPage>
    );
  }
  return (
    <ToolPage title={guide.title} note={copy.note}>
      <p><Link to={to('/guides')}>{copy.backList}</Link></p>
      <p>{guide.summary}</p>
      <GuideBlock heading={copy.what} lines={guide.what} />
      <GuideBlock heading={copy.firstDays} lines={guide.firstDays} />
      <GuideBlock heading={copy.resources} lines={guide.resources} />
      <GuideBlock heading={copy.pitfalls} lines={guide.pitfalls} />
      <p>{guide.disclaimer}</p>
    </ToolPage>
  );
}

function GuideBlock({ heading, lines }: { heading: string; lines: string[] }) {
  return (
    <section className="guide-block">
      <h2>{heading}</h2>
      <ul>
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  );
}
