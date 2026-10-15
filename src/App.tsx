import { Component, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { currentLang } from './i18n/lang';
import { text } from './i18n/text';
import { LangSwitch } from './pages/LangSwitch';
import { useI18n } from './pages/useI18n';
import { GateScreen, useWebGpuGate } from './pages/WebGpuGate';
import { HomePage } from './pages/HomePage';

const RecordPage = lazy(() => import('./pages/RecordPage'));
const FilePage = lazy(() => import('./pages/FilePage'));
const MattingPage = lazy(() => import('./matting/MattingPage'));
const JsonFormatPage = lazy(() => import('./pages/JsonFormatPage'));
const JsonDiffPage = lazy(() => import('./pages/JsonDiffPage'));
const UrlDiffPage = lazy(() => import('./pages/UrlDiffPage'));
const TimePage = lazy(() => import('./pages/TimePage'));
const Base64Page = lazy(() => import('./pages/Base64Page'));
const UrlCodecPage = lazy(() => import('./pages/UrlCodecPage'));
const Sha256Page = lazy(() => import('./pages/Sha256Page'));
const JwtPage = lazy(() => import('./pages/JwtPage'));
const RegexPage = lazy(() => import('./pages/RegexPage'));
const QrPage = lazy(() => import('./pages/QrPage'));
const TextDiffPage = lazy(() => import('./pages/TextDiffPage'));
const UuidPage = lazy(() => import('./pages/UuidPage'));
const PasswordPage = lazy(() => import('./pages/PasswordPage'));
const ImageBase64Page = lazy(() => import('./pages/ImageBase64Page'));
const CronPage = lazy(() => import('./pages/CronPage'));
const ColorPage = lazy(() => import('./pages/ColorPage'));

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p>{text(currentLang()).pageError}</p>;
    return this.props.children;
  }
}

function Opening() {
  const { m } = useI18n();
  return <p>{m.opening}</p>;
}

function Guarded({ children }: { children: ReactNode }) {
  const state = useWebGpuGate();
  if (state !== 'ok') return <GateScreen state={state} />;
  return <Suspense fallback={<Opening />}>{children}</Suspense>;
}

function toolRoute(path: string, page: ReactNode) {
  const element = <Guarded>{page}</Guarded>;
  return localizedRoutes(path, element);
}

function plainRoute(path: string, page: ReactNode) {
  const element = <Suspense fallback={<Opening />}>{page}</Suspense>;
  return localizedRoutes(path, element);
}

function localizedRoutes(path: string, element: ReactNode) {
  return (
    <>
      <Route path={path} element={element} />
      <Route path={`${path}/`} element={element} />
      <Route path={`/en${path}`} element={element} />
      <Route path={`/en${path}/`} element={element} />
    </>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <LangSwitch />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/en" element={<HomePage />} />
          <Route path="/en/" element={<HomePage />} />
          {toolRoute('/record', <RecordPage />)}
          {toolRoute('/audio-file', <FilePage />)}
          {toolRoute('/matting', <MattingPage />)}
          {plainRoute('/json', <JsonFormatPage />)}
          {plainRoute('/json-diff', <JsonDiffPage />)}
          {plainRoute('/url-diff', <UrlDiffPage />)}
          {plainRoute('/time', <TimePage />)}
          {plainRoute('/base64', <Base64Page />)}
          {plainRoute('/url', <UrlCodecPage />)}
          {plainRoute('/sha256', <Sha256Page />)}
          {plainRoute('/jwt', <JwtPage />)}
          {plainRoute('/regex', <RegexPage />)}
          {plainRoute('/qr', <QrPage />)}
          {plainRoute('/text-diff', <TextDiffPage />)}
          {plainRoute('/uuid', <UuidPage />)}
          {plainRoute('/password', <PasswordPage />)}
          {plainRoute('/image-base64', <ImageBase64Page />)}
          {plainRoute('/cron', <CronPage />)}
          {plainRoute('/color', <ColorPage />)}
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
