import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FilePicker } from './FilePicker';
import { ToolPage } from './ToolPage';
import { buildDocument, packDoc, type Page } from '../pdf/buildDocx';
import { layoutPage, type PdfTextItem } from '../pdf/lineLayout';
import { useI18n } from './useI18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_MB = 60;
const MAX_PAGES = 400;

type Done = { url: string; download: string; input: string; pages: number; chars: number };

function baseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

function isPasswordError(e: unknown): boolean {
  return e instanceof pdfjsLib.PasswordException;
}

export default function PdfToWordPage() {
  const { m } = useI18n();
  const w = m.pdf;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const runId = useRef(0);
  const doneUrl = useRef('');

  useEffect(() => () => {
    if (doneUrl.current) URL.revokeObjectURL(doneUrl.current);
  }, []);

  function remember(next: Done | null) {
    if (doneUrl.current) URL.revokeObjectURL(doneUrl.current);
    doneUrl.current = next?.url ?? '';
    setDone(next);
  }

  function onFile(file: File | undefined) {
    remember(null);
    setPreview('');
    setError(null);
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(w.big);
      return;
    }
    const id = runId.current + 1;
    runId.current = id;
    setBusy(true);
    void run(file, id);
  }

  async function run(file: File, id: number) {
    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    try {
      const data = await file.arrayBuffer();
      if (id !== runId.current) return;
      task = pdfjsLib.getDocument({ data });
      const pdf = await task.promise;
      if (id !== runId.current) return;
      if (pdf.numPages > MAX_PAGES) {
        setError(w.tooManyPages);
        setBusy(false);
        return;
      }
      const pages: Page[] = [];
      let chars = 0;
      const allText: string[] = [];
      for (let n = 1; n <= pdf.numPages; n += 1) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        const items: PdfTextItem[] = [];
        for (const item of content.items) {
          if (!('str' in item)) continue;
          const t = item.transform;
          items.push({
            str: item.str,
            x: t[4],
            y: t[5],
            width: item.width,
            height: item.height,
            bold: /[Bb]old/.test(item.fontName || ''),
          });
        }
        const lines = layoutPage(items);
        pages.push({ lines });
        for (const line of lines) chars += line.text.length;
        allText.push(lines.map((l) => l.text).join('\n'));
      }
      if (chars === 0) {
        setError(w.empty);
        setBusy(false);
        return;
      }
      setPreview(allText.join('\n'));
      const doc = buildDocument(pages);
      const blob = await packDoc(doc);
      if (id !== runId.current) return;
      const url = URL.createObjectURL(blob);
      remember({ url, download: `${baseName(file.name)}.docx`, input: file.name, pages: pdf.numPages, chars });
      setBusy(false);
    } catch (err) {
      if (id !== runId.current) return;
      setError(isPasswordError(err) ? w.protected : w.openFailed);
      setBusy(false);
    } finally {
      await task?.destroy();
    }
  }

  return (
    <ToolPage title={w.toWordTitle} note={w.toWordNote}>
      <div className="panel drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
        e.preventDefault();
        onFile(e.dataTransfer.files?.[0]);
      }}>
        <FilePicker accept="application/pdf,.pdf" fileName={done ? done.input : ''} onFile={onFile} />
        <p className="time-hint">{w.drop}</p>
      </div>
      {busy && <p>{w.busy}</p>}
      {error && <p role="alert">{error}</p>}
      {done && (
        <>
          <p>{w.summary.replace('{pages}', String(done.pages)).replace('{chars}', String(done.chars))}</p>
          <div className="row">
            <a className="download-link" href={done.url} download={done.download}>{w.download}</a>
          </div>
        </>
      )}
      {preview && (
        <details className="panel">
          <summary>{w.preview}</summary>
          <textarea className="result-box" readOnly value={preview} />
        </details>
      )}
    </ToolPage>
  );
}
