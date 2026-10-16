import { PopBoard } from '../play/PopBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function PopPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.pop.title} note={m.play.pop.note} sound={sound}>
      <PopBoard copy={m.play.pop} sound={sound.on} />
    </PlayFrame>
  );
}
