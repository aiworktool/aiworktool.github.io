import { Link } from 'react-router-dom';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

export default function PlayListPage() {
  const { m, to } = useI18n();
  const copy = m.play;
  return (
    <ToolPage title={copy.title} note={copy.note}>
      <div className="tool-grid">
        <Link className="tool-card" to={to('/play/tap')}>
          <strong>{copy.tap.title}</strong>
          <p>{copy.tap.blurb}</p>
        </Link>
        <Link className="tool-card" to={to('/play/pour')}>
          <strong>{copy.pour.title}</strong>
          <p>{copy.pour.blurb}</p>
        </Link>
        <Link className="tool-card" to={to('/play/lot')}>
          <strong>{copy.lot.title}</strong>
          <p>{copy.lot.blurb}</p>
        </Link>
        <Link className="tool-card" to={to('/play/twenty')}>
          <strong>{copy.twenty.title}</strong>
          <p>{copy.twenty.blurb}</p>
        </Link>
        <Link className="tool-card" to={to('/play/drop')}>
          <strong>{copy.drop.title}</strong>
          <p>{copy.drop.blurb}</p>
        </Link>
        <Link className="tool-card" to={to('/play/mine')}>
          <strong>{copy.mine.title}</strong>
          <p>{copy.mine.blurb}</p>
        </Link>
        <Link className="tool-card" to={to('/play/tetris')}>
          <strong>{copy.tetris.title}</strong>
          <p>{copy.tetris.blurb}</p>
        </Link>
      </div>
    </ToolPage>
  );
}
