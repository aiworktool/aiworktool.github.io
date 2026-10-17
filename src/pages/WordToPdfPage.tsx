import { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';
import { safeDocHtml } from '../pdf/safeHtml';
import { FilePicker } from './FilePicker';
import { ToolPage } from './ToolPage';
import { useI18n } from './useI18n';

const MAX_MB = 40;

function baseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

export default function WordToPdfPage() {
  const { m } = useI18n();
  const w = m.word;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState('');
  const [name, setName] = useState('');
  const runId = useRef(0);
  const titleBeforePrint = useRef('');

  useEffect(() => () => {
    delete document.body.dataset.printWord;
    if (titleBeforePrint.current) document.title = titleBeforePrint.current;
  }, []);

  function onFile(file: File | undefined) {
    setHtml('');
    setError(null);
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(w.big);
      return;
    }
    if (!/\.docx$/i.test(file.name)) {
      setError(w.openFailed);
      return;
    }
    const id = runId.current + 1;
    runId.current = id;
    setBusy(true);
    void run(file, id);
  }

  async function run(file: File, id: number) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (id !== runId.current) return;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      if (id !== runId.current) return;
      const value = safeDocHtml(result.value || '').trim();
      if (!value) {
        setError(w.empty);
        setBusy(false);
        return;
      }
      setHtml(value);
      setName(file.name);
      setBusy(false);
    } catch {
      if (id !== runId.current) return;
      setError(w.openFailed);
      setBusy(false);
    }
  }

  function restoreTitle() {
    if (!titleBeforePrint.current) return;
    document.title = titleBeforePrint.current;
    titleBeforePrint.current = '';
  }

  function printPdf() {
    titleBeforePrint.current = document.title;
    document.title = baseName(name);
    document.body.dataset.printWord = '1';
    window.print();
    window.onafterprint = () => {
      delete document.body.dataset.printWord;
      restoreTitle();
      window.onafterprint = null;
    };
    setTimeout(() => {
      delete document.body.dataset.printWord;
      restoreTitle();
    }, 30000);
  }

  return (
    <ToolPage title={w.toPdfTitle} note={w.toPdfNote}>
      <div className="panel drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
        e.preventDefault();
        onFile(e.dataTransfer.files?.[0]);
      }}>
        <FilePicker
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          fileName={name}
          onFile={onFile}
        />
        <p className="time-hint">{w.drop}</p>
      </div>
      {busy && <p>{w.busy}</p>}
      {error && <p role="alert">{error}</p>}
      {html && (
        <>
          <div className="row">
            <button type="button" onClick={printPdf}>{w.print}</button>
          </div>
          <p className="time-hint">{w.printHint}</p>
          <div className="panel print-only">
            <h2>{w.preview}</h2>
            <div className="doc-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </>
      )}
    </ToolPage>
  );
}
