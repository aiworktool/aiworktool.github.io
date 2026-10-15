import { Link } from 'react-router-dom';
import { useI18n } from './useI18n';

export function WhisperNote() {
  const { m } = useI18n();
  return <p className="model-note">{m.record.whisper}</p>;
}

export function ModnetNote() {
  const { m } = useI18n();
  return <p className="model-note">{m.matting.note}</p>;
}

export function SiteFooter() {
  const { m, to } = useI18n();
  return (
    <footer>
      <p><Link to={to('/')}>{m.siteName}</Link></p>
    </footer>
  );
}
