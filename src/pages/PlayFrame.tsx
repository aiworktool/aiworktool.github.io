import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';
import '../play/play.css';

export function PlayFrame({
  title, note, sound, children,
}: {
  title: string;
  note: string;
  sound: { on: boolean; toggle: () => void };
  children: ReactNode;
}) {
  const { m, to } = useI18n();
  const label = sound.on ? m.play.soundOn : m.play.soundOff;
  return (
    <ToolPage title={title} note={note}>
      <p><Link to={to('/play')}>{m.play.backList}</Link></p>
      <button type="button" className="play-sound" aria-pressed={sound.on} onClick={sound.toggle}>
        {label}
      </button>
      {children}
    </ToolPage>
  );
}
