import { TwentyBoard } from '../play/TwentyBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function TwentyPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.twenty.title} note={m.play.twenty.note} sound={sound}>
      <TwentyBoard copy={m.play.twenty} sound={sound.on} />
    </PlayFrame>
  );
}
