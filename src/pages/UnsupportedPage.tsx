import { Link } from 'react-router-dom';
import { useI18n } from './useI18n';

export function UnsupportedPage() {
  const { m, to } = useI18n();
  return (
    <main>
      <h1>{m.record.unsupportedTitle}</h1>
      <p>{m.record.unsupported}</p>
      <p><Link to={to('/')}>{m.backHome}</Link></p>
    </main>
  );
}
