import { useEffect, useRef, useState } from 'react';
import type { Copy } from '../i18n/zh';
import type { Board, Dir } from './twentyLogic';
import { cameraDenied, startTwentyCamera } from './twentyPoseCam';
import type { TorsoDir } from './twentyPose';

type TwentyCopy = Copy['play']['twenty'];
type Phase = 'off' | 'opening' | 'on' | 'denied' | 'failed';

export function TwentyMotion({
  copy,
  onMove,
  onActive,
  readBoard,
}: {
  copy: TwentyCopy;
  onMove: (dir: Dir) => void;
  onActive: (active: boolean) => void;
  readBoard: () => Board;
}) {
  const [phase, setPhase] = useState<Phase>('off');
  const [live, setLive] = useState<TorsoDir>('none');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onMoveRef = useRef(onMove);
  const readBoardRef = useRef(readBoard);
  const stopRef = useRef<(() => void) | null>(null);
  const liveRef = useRef<TorsoDir>('none');
  const gen = useRef(0);
  onMoveRef.current = onMove;
  readBoardRef.current = readBoard;

  function note(dir: TorsoDir) {
    if (liveRef.current === dir) return;
    liveRef.current = dir;
    setLive(dir);
  }

  useEffect(() => {
    onActive(phase === 'opening' || phase === 'on');
  }, [onActive, phase]);

  useEffect(() => () => {
    gen.current += 1;
    stopRef.current?.();
  }, []);

  async function toggle() {
    if (phase === 'on' || phase === 'opening') {
      gen.current += 1;
      stopRef.current?.();
      stopRef.current = null;
      note('none');
      setPhase('off');
      return;
    }
    const id = gen.current + 1;
    gen.current = id;
    setPhase('opening');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setPhase('failed');
      return;
    }
    try {
      const stop = await startTwentyCamera(video, canvas, {
        onMove: (dir) => onMoveRef.current(dir),
        onLive: note,
        readBoard: () => readBoardRef.current(),
      });
      if (gen.current !== id) {
        stop();
        return;
      }
      stopRef.current = stop;
      setPhase('on');
    } catch (error) {
      if (gen.current !== id) return;
      setPhase(cameraDenied(error) ? 'denied' : 'failed');
    }
  }

  const showCam = phase === 'opening' || phase === 'on';
  return (
    <div className="twenty-pose">
      <button
        type="button"
        aria-pressed={phase === 'on'}
        onClick={() => { void toggle(); }}
      >
        {phase === 'on' || phase === 'opening' ? copy.poseOff : copy.pose}
      </button>
      <p className="time-hint">{poseHint(copy, phase)}</p>
      <div className={showCam ? 'twenty-cam on' : 'twenty-cam'}>
        <video ref={videoRef} playsInline muted autoPlay />
        <canvas ref={canvasRef} />
        <div className="twenty-zones" aria-hidden="true">
          <span className={live === 'left' ? 'active' : undefined}>←</span>
          <span className={live === 'up' || live === 'down' ? 'active' : undefined}>
            {live === 'down' ? '↓' : '↑'}
          </span>
          <span className={live === 'right' ? 'active' : undefined}>→</span>
        </div>
      </div>
    </div>
  );
}

function poseHint(copy: TwentyCopy, phase: Phase): string {
  if (phase === 'opening') return copy.poseOpening;
  if (phase === 'on') return copy.poseReady;
  if (phase === 'denied') return copy.poseDenied;
  if (phase === 'failed') return copy.poseFailed;
  return copy.poseReady;
}
