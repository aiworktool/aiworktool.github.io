import { LotBoard } from '../play/LotBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function LotPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.lot.title} note={m.play.lot.note} sound={sound}>
      <LotBoard copy={m.play.lot} sound={sound.on} />
    </PlayFrame>
  );
}
