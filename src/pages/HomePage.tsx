import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { TimeTools } from './TimeTools';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';

type Card = { name: string; note: string; href: string };
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
  const clockText = [
    m.time.title, m.time.placeholder, m.time.hint, m.time.convert, m.time.now,
    m.time.local, m.time.beijing, m.time.tokyo, m.time.newYork,
  ];
  const showClock = clockText.some((part) => hit(part, ''));
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
    </Link>
  );
}

function catalog(home: ReturnType<typeof useI18n>['m']['home'], to: (path: string) => string): Entry[] {
  const card = (name: string, note: string, path: string): Entry => ({
    kind: 'card',
    card: { name, note, href: to(path) },
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
    card(home.pdfToWord, home.pdfToWordNote, '/pdf-to-word'),
    card(home.wordToPdf, home.wordToPdfNote, '/word-to-pdf'),
    card(home.play, home.playNote, '/play'),
    card(home.record, home.recordNote, '/record'),
    card(home.file, home.fileNote, '/audio-file'),
    card(home.regex, home.regexNote, '/regex'),
    card(home.matting, home.mattingNote, '/matting'),
  ];
}
