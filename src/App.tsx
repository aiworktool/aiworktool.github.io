import { Component, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GateScreen, useWebGpuGate } from './pages/WebGpuGate';
import { HomePage } from './pages/HomePage';

const RecordPage = lazy(() => import('./pages/RecordPage'));
const FilePage = lazy(() => import('./pages/FilePage'));
const MattingPage = lazy(() => import('./matting/MattingPage'));

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p>页面出现问题。请刷新后重试。</p>;
    return this.props.children;
  }
}

function Guarded({ children }: { children: ReactNode }) {
  const state = useWebGpuGate();
  if (state !== 'ok') return <GateScreen state={state} />;
  return <Suspense fallback={<p>正在打开工具…</p>}>{children}</Suspense>;
}

function toolRoute(path: string, page: ReactNode) {
  const element = <Guarded>{page}</Guarded>;
  return (
    <>
      <Route path={path} element={element} />
      <Route path={`${path}/`} element={element} />
    </>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {toolRoute('/record', <RecordPage />)}
          {toolRoute('/audio-file', <FilePage />)}
          {toolRoute('/matting', <MattingPage />)}
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
