import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { askPersist } from '../storage/persistStorage';
import { loadTranscript, saveTranscript } from '../storage/transcriptDb';
import type { SessionAction, SessionState } from './sessionReducer';
import type { SourceMode } from './types';

export function useTranscriptPersistence(
  mode: SourceMode,
  state: SessionState,
  dispatch: Dispatch<SessionAction>,
  setPersistWarned: (warned: boolean) => void,
): void {
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
    let alive = true;
    void loadTranscript(mode).then((record) => {
      if (!alive) return;
      if (record) {
        dispatch({ type: 'hydrate', segments: record.segments, exported: record.exported });
      }
      hydrated.current = true;
    });
    void askPersist().then((ok) => {
      if (alive && !ok) setPersistWarned(true);
    });
    return () => {
      alive = false;
    };
  }, [mode, dispatch, setPersistWarned]);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      void saveTranscript(mode, { segments: state.segments, exported: state.exported });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [mode, state.segments, state.exported]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (state.exported || state.segments.length === 0) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [state.exported, state.segments.length]);
}
