import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { currentLang } from '../i18n/lang';
import { text } from '../i18n/text';
import { copyText } from '../format';
import { TranscribeClient } from '../gpu/transcribeClient';
import { toTxt } from './exportText';
import { saveTranscriptFile, startTranscription, switchWhisperModel } from './jobCommands';
import { initialSession, sessionReducer } from './sessionReducer';
import type { LanguageMode, ModelChoice, Segment, SourceMode } from './types';
import { MODEL_STORAGE_KEY } from './types';
import { useTranscriptPersistence } from './useTranscriptPersistence';

function readModel(): ModelChoice {
  return localStorage.getItem(MODEL_STORAGE_KEY) === 'small' ? 'small' : 'base';
}

export function useTranscriptJob(mode: SourceMode) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const [model, setModel] = useState<ModelChoice>(readModel);
  const [language, setLanguage] = useState<LanguageMode>('zh');
  const [persistWarned, setPersistWarned] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const clientRef = useRef<TranscribeClient | null>(null);
  const pcmRef = useRef<Float32Array | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const client = new TranscribeClient();
    clientRef.current = client;
    return () => client.terminate();
  }, [mode]);

  useTranscriptPersistence(mode, state, dispatch, setPersistWarned);

  const takeAudio = useCallback((pcm: Float32Array, durationSec: number, limitHit: boolean) => {
    pcmRef.current = pcm;
    dispatch({ type: 'audio-ready', durationSec, limitHit });
  }, []);

  const start = useCallback(() => {
    void startTranscription({
      client: clientRef.current,
      pcm: pcmRef.current,
      model,
      language,
      runId,
      dispatch,
    });
  }, [language, model]);

  const chooseModel = useCallback((next: ModelChoice) => {
    switchWhisperModel({ next, model, client: clientRef.current, runId, dispatch, setModel });
  }, [model]);

  const cancel = useCallback(() => {
    runId.current += 1;
    clientRef.current?.cancel();
    dispatch({ type: 'abort' });
  }, []);

  const copyAll = useCallback(async () => {
    try {
      await copyText(toTxt(state.segments));
      dispatch({ type: 'exported' });
      setNotice(null);
    } catch {
      setNotice(text(currentLang()).record.copyFailed);
    }
  }, [state.segments]);

  const saveTxt = useCallback(() => {
    saveTranscriptFile(mode, state.segments, 'txt');
    dispatch({ type: 'exported' });
  }, [mode, state.segments]);

  const saveSrt = useCallback(() => {
    saveTranscriptFile(mode, state.segments, 'srt');
    dispatch({ type: 'exported' });
  }, [mode, state.segments]);

  return {
    state,
    model,
    language,
    setLanguage,
    persistWarned,
    notice,
    takeAudio,
    fail: (message: string) => dispatch({ type: 'fail', message }),
    start,
    chooseModel,
    cancel,
    pause: () => clientRef.current?.pause(),
    resume: () => {
      clientRef.current?.resume();
      dispatch({ type: 'resumed' });
    },
    beginRecording: () => dispatch({ type: 'recording' }),
    edit: (segments: Segment[]) => dispatch({ type: 'edit', segments }),
    copyAll,
    saveTxt,
    saveSrt,
  };
}

export type TranscriptJob = ReturnType<typeof useTranscriptJob>;
