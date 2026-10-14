import type { Segment } from './types';

export type Phase =
  | 'idle'
  | 'recording'
  | 'ready'
  | 'loading'
  | 'transcribing'
  | 'paused'
  | 'done';

export type SessionState = {
  phase: Phase;
  error: string | null;
  preview: Segment[];
  segments: Segment[];
  exported: boolean;
  downloadLoaded: number;
  downloadTotal: number;
  downloadCached: boolean;
  inferDone: number;
  inferTotal: number;
  etaMs: number | null;
  durationSec: number | null;
  limitNote: string | null;
};

export const initialSession: SessionState = {
  phase: 'idle',
  error: null,
  preview: [],
  segments: [],
  exported: true,
  downloadLoaded: 0,
  downloadTotal: 0,
  downloadCached: false,
  inferDone: 0,
  inferTotal: 0,
  etaMs: null,
  durationSec: null,
  limitNote: null,
};

export type SessionAction =
  | { type: 'hydrate'; segments: Segment[]; exported: boolean }
  | { type: 'recording' }
  | { type: 'audio-ready'; durationSec: number; limitHit: boolean }
  | { type: 'reset-audio' }
  | { type: 'load-start' }
  | { type: 'download'; loaded: number; total: number; cached: boolean }
  | { type: 'infer-start'; total: number }
  | { type: 'infer'; done: number; total: number; etaMs: number | null }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'preview'; preview: Segment[] }
  | { type: 'done'; segments: Segment[] }
  | { type: 'fail'; message: string }
  | { type: 'abort' }
  | { type: 'edit'; segments: Segment[] }
  | { type: 'exported' };

function backToAudio(state: SessionState): Phase {
  return state.durationSec === null ? 'idle' : 'ready';
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'hydrate':
      if (state.phase !== 'idle' || state.durationSec !== null) return state;
      return { ...state, segments: action.segments, exported: action.exported };
    case 'recording':
      return { ...state, phase: 'recording', error: null, limitNote: null };
    case 'audio-ready':
      return {
        ...state,
        phase: 'ready',
        error: null,
        preview: [],
        segments: [],
        exported: true,
        durationSec: action.durationSec,
        limitNote: action.limitHit ? '已录满 30 分钟，录音已停止。' : null,
      };
    case 'reset-audio':
      return { ...state, phase: 'idle', durationSec: null, limitNote: null, error: null };
    case 'load-start':
      return {
        ...state,
        phase: 'loading',
        error: null,
        preview: [],
        downloadLoaded: 0,
        downloadTotal: 0,
        downloadCached: false,
        etaMs: null,
      };
    case 'download':
      return {
        ...state,
        downloadLoaded: action.loaded,
        downloadTotal: action.total,
        downloadCached: action.cached,
      };
    case 'infer-start':
      return {
        ...state,
        phase: 'transcribing',
        inferDone: 0,
        inferTotal: action.total,
        etaMs: null,
      };
    case 'infer':
      return {
        ...state,
        phase: 'transcribing',
        inferDone: action.done,
        inferTotal: action.total,
        etaMs: action.etaMs,
      };
    case 'paused':
      return { ...state, phase: 'paused' };
    case 'resumed':
      return { ...state, phase: 'transcribing' };
    case 'preview':
      return { ...state, preview: action.preview };
    case 'done':
      return {
        ...state,
        phase: 'done',
        segments: action.segments,
        preview: [],
        exported: false,
        error: null,
      };
    case 'fail':
      return {
        ...state,
        phase: backToAudio(state),
        error: action.message,
        preview: [],
      };
    case 'abort':
      return { ...state, phase: backToAudio(state), error: null, preview: [] };
    case 'edit':
      return { ...state, segments: action.segments, exported: false };
    case 'exported':
      return { ...state, exported: true };
    default:
      return state;
  }
}
