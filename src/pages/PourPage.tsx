import { PourBoard } from '../play/PourBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function PourPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.pour.title} note={m.play.pour.note} sound={sound}>
      <PourBoard copy={m.play.pour} sound={sound.on} />
    </PlayFrame>
  );
}
