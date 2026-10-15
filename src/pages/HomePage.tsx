import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter, ModnetNote, WhisperNote } from './SiteFooter';
import { TimeTools } from './TimeTools';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';

type Card = { name: string; note: string; href: string; extra?: 'whisper' | 'modnet' };

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
  const groups = catalog(home, to);
  const anyCard = groups.some((group) => group.cards.some((card) => hit(card.name, card.note)));

  return (
    <main>
      <h1>{m.siteName}</h1>
      <p className="privacy">{home.privacy}</p>
      <label className="time-field home-search">
        <span>{home.search}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {groups.map((group) => (
        <Group
          key={group.title}
          title={group.title}
          cards={group.cards.filter((card) => hit(card.name, card.note))}
          clock={group.clock && showClock ? <TimeTools embedded /> : null}
        />
      ))}
      {!anyCard && !showClock && <p>{home.searchEmpty}</p>}
      <p>{home.limit}</p>
      <SiteFooter />
    </main>
  );
}

function Group({ title, cards, clock }: { title: string; cards: Card[]; clock: ReactNode }) {
  if (!cards.length && !clock) return null;
  return (
    <section>
      <h2 className="tool-group">{title}</h2>
      {clock}
      {cards.length > 0 && (
        <div className="tool-grid">
          {cards.map((card) => <ToolCard key={card.href} card={card} />)}
        </div>
      )}
    </section>
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

function catalog(home: ReturnType<typeof useI18n>['m']['home'], to: (path: string) => string) {
  const card = (name: string, note: string, path: string, extra?: Card['extra']): Card => ({
    name, note, href: to(path), extra,
  });
  return [
    { title: home.jsonGroup, clock: false, cards: [
      card(home.jsonFormat, home.jsonFormatNote, '/json'),
      card(home.jsonDiff, home.jsonDiffNote, '/json-diff'),
    ] },
    { title: home.urlGroup, clock: false, cards: [card(home.urlDiff, home.urlDiffNote, '/url-diff')] },
    { title: home.textGroup, clock: false, cards: [card(home.textDiff, home.textDiffNote, '/text-diff')] },
    { title: home.qrGroup, clock: false, cards: [card(home.qr, home.qrNote, '/qr')] },
    { title: home.timeGroup, clock: true, cards: [card(home.cron, home.cronNote, '/cron')] },
    { title: home.codecGroup, clock: false, cards: [
      card(home.base64, home.base64Note, '/base64'),
      card(home.urlCodec, home.urlCodecNote, '/url'),
      card(home.jwt, home.jwtNote, '/jwt'),
      card(home.sha, home.shaNote, '/sha256'),
      card(home.uuid, home.uuidNote, '/uuid'),
      card(home.password, home.passwordNote, '/password'),
      card(home.image64, home.image64Note, '/image-base64'),
    ] },
    { title: home.colorGroup, clock: false, cards: [card(home.color, home.colorNote, '/color')] },
    { title: home.regex, clock: false, cards: [card(home.regex, home.regexNote, '/regex')] },
    { title: home.record, clock: false, cards: [card(home.record, home.recordNote, '/record', 'whisper')] },
    { title: home.file, clock: false, cards: [card(home.file, home.fileNote, '/audio-file', 'whisper')] },
    { title: home.matting, clock: false, cards: [card(home.matting, home.mattingNote, '/matting', 'modnet')] },
  ];
}
