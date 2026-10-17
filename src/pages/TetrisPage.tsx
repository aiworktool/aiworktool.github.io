import { TetrisBoard } from '../play/TetrisBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function TetrisPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.tetris.title} note={m.play.tetris.note} sound={sound}>
      <TetrisBoard copy={m.play.tetris} sound={sound.on} />
    </PlayFrame>
  );
}
