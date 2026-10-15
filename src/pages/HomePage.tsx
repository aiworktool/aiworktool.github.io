import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter, ModnetNote, WhisperNote } from './SiteFooter';
import { TimeTools } from './TimeTools';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';

type Card = { name: string; note: string; href: string; extra?: 'whisper' | 'modnet' };
type Entry = { kind: 'card'; card: Card } | { kind: 'clock' };

export function HomePage() {
  const { m, to } = useI18n();
  const home = m.home;
  const [query, setQuery] = useState('');
  usePageTitle(m.siteName);
  const hit = (name: string, note: string) => {
    const needle = query.trim().toLowerCase();
    return !needle || name.toLowerCase().includes(needle) || note.toLowerCase().includes(needle);
  };
  const showClock = hit(m.time.title, m.time.placeholder);
  const visible = catalog(home, to).filter((entry) => (
    entry.kind === 'clock' ? showClock : hit(entry.card.name, entry.card.note)
  ));

  return (
    <main>
      <h1>{m.siteName}</h1>
      <p className="privacy">{home.privacy}</p>
      <label className="time-field home-search">
        <span>{home.search}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {visible.length > 0 && (
        <div className="tool-grid">
          {visible.map((entry) => (entry.kind === 'clock' ? (
            <div key="clock" className="tool-span"><TimeTools embedded /></div>
          ) : (
            <ToolCard key={entry.card.href} card={entry.card} />
          )))}
        </div>
      )}
      {visible.length === 0 && <p>{home.searchEmpty}</p>}
      <p>{home.limit}</p>
      <SiteFooter />
    </main>
  );
}

function ToolCard({ card }: { card: Card }) {
  return (
    <Link className="tool-card" to={card.href}>
      <strong>{card.name}</strong>
      <p>{card.note}</p>
      {card.extra === 'whisper' && <WhisperNote />}
      {card.extra === 'modnet' && <ModnetNote />}
    </Link>
  );
}

function catalog(home: ReturnType<typeof useI18n>['m']['home'], to: (path: string) => string): Entry[] {
  const card = (name: string, note: string, path: string, extra?: Card['extra']): Entry => ({
    kind: 'card',
    card: { name, note, href: to(path), extra },
  });
  return [
    card(home.jsonFormat, home.jsonFormatNote, '/json'),
    card(home.jsonDiff, home.jsonDiffNote, '/json-diff'),
    card(home.urlDiff, home.urlDiffNote, '/url-diff'),
    card(home.textDiff, home.textDiffNote, '/text-diff'),
    card(home.qr, home.qrNote, '/qr'),
    card(home.cron, home.cronNote, '/cron'),
    { kind: 'clock' },
    card(home.base64, home.base64Note, '/base64'),
    card(home.urlCodec, home.urlCodecNote, '/url'),
    card(home.jwt, home.jwtNote, '/jwt'),
    card(home.sha, home.shaNote, '/sha256'),
    card(home.uuid, home.uuidNote, '/uuid'),
    card(home.password, home.passwordNote, '/password'),
    card(home.image64, home.image64Note, '/image-base64'),
    card(home.color, home.colorNote, '/color'),
    card(home.regex, home.regexNote, '/regex'),
    card(home.record, home.recordNote, '/record', 'whisper'),
    card(home.file, home.fileNote, '/audio-file', 'whisper'),
    card(home.matting, home.mattingNote, '/matting', 'modnet'),
  ];
}
