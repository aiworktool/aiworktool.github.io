export type Segment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type TranscriptRecord = {
  segments: Segment[];
  exported: boolean;
};

export type SourceMode = 'record' | 'file';

export type ModelChoice = 'base' | 'small';

export type LanguageMode = 'zh' | 'auto';

export const MODEL_STORAGE_KEY = 'whisper-variant';

export const MODEL_ID: Record<ModelChoice, string> = {
  base: 'Xenova/whisper-base',
  small: 'Xenova/whisper-small',
};

export const MATTING_MODEL_ID = 'Xenova/modnet';
