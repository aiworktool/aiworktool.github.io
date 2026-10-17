import { MineBoard } from '../play/MineBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function MinePage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.mine.title} note={m.play.mine.note} sound={sound}>
      <MineBoard copy={m.play.mine} sound={sound.on} />
    </PlayFrame>
  );
}
