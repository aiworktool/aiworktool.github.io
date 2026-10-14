import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatBytes, formatClock } from '../format';
import { deleteAt, mergeAdjacent } from '../transcribe/editor';
import type { ModelChoice, Segment, SourceMode } from '../transcribe/types';
import type { SessionState } from '../transcribe/sessionReducer';
import { useTranscriptJob } from '../transcribe/useTranscriptJob';
import { JobProvider } from './jobContext';
import { SiteFooter } from './SiteFooter';

function downloadLabel(state: SessionState): string {
  const loaded = formatBytes(state.downloadLoaded);
  if (!state.downloadTotal) return loaded;
  return `${loaded} / ${formatBytes(state.downloadTotal)}`;
}

const TITLES: Record<SourceMode, string> = {
  record: '录音转文字',
  file: '录音文件转文字',
};

function Editor({
  segments,
  disabled,
  onChange,
}: {
  segments: Segment[];
  disabled: boolean;
  onChange: (segments: Segment[]) => void;
}) {
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
            与下一段合并
          </button>
          <button type="button" disabled={disabled} onClick={() => onChange(deleteAt(segments, index))}>
            删除
          </button>
        </li>
      ))}
    </ol>
  );
}

export function TranscriptShell({ mode, children }: { mode: SourceMode; children: ReactNode }) {
  const job = useTranscriptJob(mode);
  const { state } = job;
  const busy = state.phase === 'loading' || state.phase === 'transcribing' || state.phase === 'paused';
  const editingLocked = busy || state.phase === 'recording';

  return (
    <JobProvider value={job}>
      <main>
        <p><Link to="/">返回首页</Link></p>
        <h1>{TITLES[mode]}</h1>
        <p className="privacy">素材只在本机处理，不上传。</p>
        {job.persistWarned && <p>浏览器可能在空间不足时清除已下载的模型。</p>}
        {children}
        <section className="panel">
          <label>
            语言
            <select
              value={job.language}
              disabled={editingLocked}
              onChange={(event) => job.setLanguage(event.target.value as 'zh' | 'auto')}
            >
              <option value="zh">中文</option>
              <option value="auto">自动检测</option>
            </select>
          </label>
          <fieldset>
            <legend>模型</legend>
            {(['base', 'small'] as ModelChoice[]).map((choice) => (
              <label key={choice}>
                <input
                  type="radio"
                  name="model"
                  checked={job.model === choice}
                  onChange={() => job.chooseModel(choice)}
                  disabled={state.phase === 'recording'}
                />
                {choice === 'base' ? '默认 base' : '高精度 small'}
              </label>
            ))}
          </fieldset>
          {state.durationSec !== null && <p>音频时长 {formatClock(state.durationSec * 1000)}</p>}
          {state.segments.length > 0 && state.durationSec === null && !busy && (
            <p>
              这是上次留在这台电脑上的文稿。要重新转写，请再选一次文件，或再录一段。
            </p>
          )}
          {state.phase === 'loading' && (
            <p>
              模型：
              {state.downloadCached ? '已缓存，无需下载' : downloadLabel(state)}
            </p>
          )}
          {(state.phase === 'transcribing' || state.phase === 'paused') && (
            <p>
              转写 {state.inferDone}/{state.inferTotal}
              {state.etaMs !== null ? `，预计剩余 ${formatClock(state.etaMs)}` : ''}
            </p>
          )}
          <div className="row">
            <button
              type="button"
              disabled={state.durationSec === null || (state.phase !== 'ready' && state.phase !== 'done')}
              onClick={() => void job.start()}
            >
              开始转写
            </button>
            {state.phase === 'transcribing' && <button type="button" onClick={job.pause}>暂停</button>}
            {state.phase === 'paused' && <button type="button" onClick={job.resume}>继续</button>}
            {busy && <button type="button" onClick={job.cancel}>取消</button>}
          </div>
          {state.error && <p role="alert">{state.error}</p>}
          {job.notice && <p role="alert">{job.notice}</p>}
        </section>
        {state.preview.length > 0 && (
          <section>
            <h2>转写预览</h2>
            <ol className="preview">
              {state.preview.map((segment) => (
                <li key={segment.id}>{segment.text}</li>
              ))}
            </ol>
          </section>
        )}
        {state.segments.length > 0 && (
          <section>
            <h2>文稿</h2>
            <Editor segments={state.segments} disabled={editingLocked} onChange={job.edit} />
            <div className="row">
              <button type="button" onClick={() => void job.copyAll()}>复制全文</button>
              <button type="button" onClick={job.saveTxt}>下载 TXT</button>
              <button type="button" onClick={job.saveSrt}>下载 SRT</button>
            </div>
          </section>
        )}
        <SiteFooter />
      </main>
    </JobProvider>
  );
}
