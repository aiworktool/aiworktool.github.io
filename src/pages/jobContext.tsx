import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { TranscriptJob } from '../transcribe/useTranscriptJob';

type JobValue = TranscriptJob;

const JobContext = createContext<JobValue | null>(null);

export function JobProvider({ value, children }: { value: JobValue; children: ReactNode }) {
  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJob(): JobValue {
  const value = useContext(JobContext);
  if (!value) throw new Error('转写页面尚未准备好');
  return value;
}
