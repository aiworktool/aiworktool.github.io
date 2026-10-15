import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatBytes } from '../format';
import { MattingClient } from '../gpu/mattingClient';
import { FilePicker } from '../pages/FilePicker';
import { ModnetNote, SiteFooter } from '../pages/SiteFooter';
import { useI18n } from '../pages/useI18n';
import { usePageTitle } from '../pages/usePageTitle';
import { askPersist } from '../storage/persistStorage';
import { initialCrop, type Rect } from './crop';
import { cutoutError, cutoutFile } from './cutoutFile';
import { MattingResult } from './MattingResult';
import { aspectOf, BACKGROUNDS, DEFAULT_BACKGROUND, PRESETS } from './presets';

type Phase = 'idle' | 'loading' | 'processing' | 'result';

export default function MattingPage() {
  const clientRef = useRef<MattingClient | null>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [cached, setCached] = useState(false);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const { m, to } = useI18n();
  const copy = m.matting;
  usePageTitle(copy.title);
  const [colorId, setColorId] = useState(DEFAULT_BACKGROUND.id);
  const [transparent, setTransparent] = useState(false);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const client = new MattingClient();
    clientRef.current = client;
    void askPersist().then((ok) => {
      if (!ok) setWarn(true);
    });
    return () => client.terminate();
  }, []);

  const preset = PRESETS.find((item) => item.id === presetId) ?? PRESETS[0];
  const color = BACKGROUNDS.find((item) => item.id === colorId) ?? DEFAULT_BACKGROUND;

  async function onFile(file: File | undefined) {
    const client = clientRef.current;
    if (!file || !client || busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      const result = await cutoutFile(
        file,
        client,
        aspectOf(preset),
        () => setPhase('loading'),
        (progress) => {
          setLoaded(progress.loaded);
          setTotal(progress.total);
          setCached(progress.cached);
        },
        () => setPhase('processing'),
      );
      sourceRef.current = result.canvas;
      setSource(result.canvas);
      setCrop(result.crop);
      setPhase('result');
    } catch (err) {
      setError(cutoutError(err));
      setPhase(sourceRef.current ? 'result' : 'idle');
    } finally {
      busyRef.current = false;
    }
  }

  function choosePreset(id: string) {
    const next = PRESETS.find((item) => item.id === id) ?? PRESETS[0];
    setPresetId(next.id);
    if (source) setCrop(initialCrop(source.width, source.height, aspectOf(next)));
  }

  return (
    <main>
      <p><Link to={to('/')}>{m.backHome}</Link></p>
      <h1>{copy.title}</h1>
      <p className="privacy">{copy.privacy}</p>
      {warn && <p>{copy.persist}</p>}
      <FileDrop
        disabled={phase === 'loading' || phase === 'processing'}
        onFile={(file) => void onFile(file)}
        hint={copy.drop}
      />
      {phase === 'loading' && (
        <p>
          {copy.modelLine}{cached ? copy.cached : progressText(loaded, total)}
          <button type="button" onClick={() => clientRef.current?.cancel()}>{copy.cancel}</button>
        </p>
      )}
      {phase === 'processing' && <p>{copy.working}</p>}
      {error && <p role="alert">{error}</p>}
      {phase === 'result' && source && crop && (
        <MattingResult
          source={source}
          crop={crop}
          preset={preset}
          color={color}
          transparent={transparent}
          onColor={setColorId}
          onTransparent={() => setTransparent((value) => !value)}
          onPreset={choosePreset}
          onCrop={setCrop}
        />
      )}
      <ModnetNote />
      <SiteFooter />
    </main>
  );
}

function progressText(loaded: number, total: number): string {
  if (!total) return formatBytes(loaded);
  return `${formatBytes(loaded)} / ${formatBytes(total)}`;
}

function FileDrop({
  disabled,
  onFile,
  hint,
}: {
  disabled: boolean;
  onFile: (file: File | undefined) => void;
  hint: string;
}) {
  const [name, setName] = useState('');

  function pick(file: File | undefined) {
    setName(file?.name ?? '');
    onFile(file);
  }

  return (
    <section
      className="panel drop"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (!disabled) pick(event.dataTransfer.files[0]);
      }}
    >
      <p>{hint}</p>
      <FilePicker
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={disabled}
        fileName={name}
        onFile={pick}
      />
    </section>
  );
}
