import { TranscriptShell } from './TranscriptShell';
import { FilePanel } from '../transcribe/FilePanel';

export default function FilePage() {
  return (
    <TranscriptShell mode="file">
      <FilePanel />
    </TranscriptShell>
  );
}
