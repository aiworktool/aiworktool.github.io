import { TranscriptShell } from './TranscriptShell';
import { RecorderPanel } from '../transcribe/RecorderPanel';

export default function RecordPage() {
  return (
    <TranscriptShell mode="record">
      <RecorderPanel />
    </TranscriptShell>
  );
}
