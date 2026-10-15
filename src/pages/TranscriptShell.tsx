import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatBytes, formatClock } from '../format';
import { fill } from '../i18n/lang';
import { deleteAt, mergeAdjacent } from '../transcribe/editor';
import type { ModelChoice, Segment, SourceMode } from '../transcribe/types';
import type { SessionState } from '../transcribe/sessionReducer';
import { useTranscriptJob } from '../transcribe/useTranscriptJob';
import { JobProvider } from './jobContext';
import { SiteFooter, WhisperNote } from './SiteFooter';
import { useI18n } from './useI18n';
import { usePageTitle } from './usePageTitle';

function downloadLabel(state: SessionState): string {
  const loaded = formatBytes(state.downloadLoaded);
  if (!state.downloadTotal) return loaded;
  return `${loaded} / ${formatBytes(state.downloadTotal)}`;
}

function Editor({
  segments,
  disabled,
  onChange,
}: {
  segments: Segment[];
  disabled: boolean;
  onChange: (segments: Segment[]) => void;
}) {
  const { m } = useI18n();
  return (
    <ol className="editor">
      {segments.map((segment, index) => (
        <li key={segment.id}>
          <span>{formatClock(segment.startMs)}</span>
          <textarea
            value={segment.text}
            disabled={disabled}
            onChange={(event) => {
              const next = segments.map((item, itemIndex) =>
                itemIndex === index ? { ...item, text: event.target.value } : item,
              );
              onChange(next);
            }}
          />
          <button
            type="button"
            disabled={disabled || index === segments.length - 1}
            onClick={() => onChange(mergeAdjacent(segments, index))}
          >
            {m.record.merge}
          </button>
          <button type="button" disabled={disabled} onClick={() => onChange(deleteAt(segments, index))}>
            {m.record.remove}
          </button>
        </li>
      ))}
    </ol>
  );
}

const TITLES = { record: 'recordTitle', file: 'fileTitle' } as const;

export function TranscriptShell({ mode, children }: { mode: SourceMode; children: ReactNode }) {
  const job = useTranscriptJob(mode);
  const { state } = job;
  const { m, to } = useI18n();
  const copy = m.record;
  const title = copy[TITLES[mode]];
  usePageTitle(title);
  const busy = state.phase === 'loading' || state.phase === 'transcribing' || state.phase === 'paused';
  const editingLocked = busy || state.phase === 'recording';
  const clock = state.durationSec === null ? '' : formatClock(state.durationSec * 1000);

  return (
    <JobProvider value={job}>
      <main>
        <p><Link to={to('/')}>{m.backHome}</Link></p>
        <h1>{title}</h1>
        <p className="privacy">{copy.privacy}</p>
        {job.persistWarned && <p>{copy.persist}</p>}
        {children}
        <section className="panel">
          <label>
            {copy.language}
            <select
              value={job.language}
              disabled={editingLocked}
              onChange={(event) => job.setLanguage(event.target.value as 'zh' | 'auto')}
            >
              <option value="zh">{copy.chinese}</option>
              <option value="auto">{copy.auto}</option>
            </select>
          </label>
          <fieldset>
            <legend>{copy.model}</legend>
            {(['base', 'small'] as ModelChoice[]).map((choice) => (
              <label key={choice}>
                <input
                  type="radio"
                  name="model"
                  checked={job.model === choice}
                  onChange={() => job.chooseModel(choice)}
                  disabled={state.phase === 'recording'}
                />
                {choice === 'base' ? copy.base : copy.small}
              </label>
            ))}
          </fieldset>
          {state.durationSec !== null && <p>{fill(copy.duration, { time: clock })}</p>}
          {state.segments.length > 0 && state.durationSec === null && !busy && <p>{copy.draft}</p>}
          {state.phase === 'loading' && (
            <p>
              {copy.modelLine}
              {state.downloadCached ? copy.cached : downloadLabel(state)}
            </p>
          )}
          {(state.phase === 'transcribing' || state.phase === 'paused') && (
            <p>
              {fill(copy.progress, { done: state.inferDone, total: state.inferTotal })}
              {state.etaMs !== null ? fill(copy.eta, { time: formatClock(state.etaMs) }) : ''}
            </p>
          )}
          <div className="row">
            <button
              type="button"
              disabled={state.durationSec === null || (state.phase !== 'ready' && state.phase !== 'done')}
              onClick={() => void job.start()}
            >
              {copy.start}
            </button>
            {state.phase === 'transcribing' && <button type="button" onClick={job.pause}>{copy.pause}</button>}
            {state.phase === 'paused' && <button type="button" onClick={job.resume}>{copy.resume}</button>}
            {busy && <button type="button" onClick={job.cancel}>{copy.cancel}</button>}
          </div>
          {state.error && <p role="alert">{state.error}</p>}
          {job.notice && <p role="alert">{job.notice}</p>}
        </section>
        {state.preview.length > 0 && (
          <section>
            <h2>{copy.preview}</h2>
            <ol className="preview">
              {state.preview.map((segment) => (
                <li key={segment.id}>{segment.text}</li>
              ))}
            </ol>
          </section>
        )}
        {state.segments.length > 0 && (
          <section>
            <h2>{copy.transcript}</h2>
            <Editor segments={state.segments} disabled={editingLocked} onChange={job.edit} />
            <div className="row">
              <button type="button" onClick={() => void job.copyAll()}>{copy.copyAll}</button>
              <button type="button" onClick={job.saveTxt}>{copy.downloadTxt}</button>
              <button type="button" onClick={job.saveSrt}>{copy.downloadSrt}</button>
            </div>
          </section>
        )}
        <WhisperNote />
        <SiteFooter />
      </main>
    </JobProvider>
  );
}
