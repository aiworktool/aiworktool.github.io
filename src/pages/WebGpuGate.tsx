import { useEffect, useState } from 'react';
import { detectWebGpu } from '../gpu/detectWebGpu';
import { UnsupportedPage } from './UnsupportedPage';

export function useWebGpuGate(): 'checking' | 'ok' | 'no' {
  const [state, setState] = useState<'checking' | 'ok' | 'no'>('checking');
  useEffect(() => {
    let alive = true;
    void detectWebGpu().then((ok) => {
      if (alive) setState(ok ? 'ok' : 'no');
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export function GateScreen({ state }: { state: 'checking' | 'ok' | 'no' }) {
  if (state === 'checking') return <p>正在检查 WebGPU…</p>;
  if (state === 'no') return <UnsupportedPage />;
  return null;
}
