import { DropBoard } from '../play/DropBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function DropPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.drop.title} note={m.play.drop.note} sound={sound}>
      <DropBoard copy={m.play.drop} sound={sound.on} />
    </PlayFrame>
  );
}
