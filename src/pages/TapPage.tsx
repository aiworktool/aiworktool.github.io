import { TapBoard } from '../play/TapBoard';
import { usePlaySound } from '../play/usePlaySound';
import { PlayFrame } from './PlayFrame';
import { useI18n } from './useI18n';

export default function TapPage() {
  const { m } = useI18n();
  const sound = usePlaySound();
  return (
    <PlayFrame title={m.play.tap.title} note={m.play.tap.note} sound={sound}>
      <TapBoard copy={m.play.tap} sound={sound.on} />
    </PlayFrame>
  );
}
