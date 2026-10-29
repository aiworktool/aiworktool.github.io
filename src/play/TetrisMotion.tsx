import { useEffect, useRef, useState } from 'react';
import type { Copy } from '../i18n/zh';
import type { TetrisGame } from './tetrisLogic';
import { cameraDenied, startPoseCamera } from './tetrisPoseCam';
import type { PoseAction } from './tetrisPose';

type TetrisCopy = Copy['play']['tetris'];
type Phase = 'off' | 'opening' | 'on' | 'denied' | 'failed';

export function TetrisMotion({
  copy,
  onAction,
  onMove,
  onLine,
  onActive,
  readGame,
}: {
  copy: TetrisCopy;
  onAction: (action: Exclude<PoseAction, 'none'>) => void;
  onMove: (dir: 'left' | 'right') => void;
  onLine: (row: number) => void;
  onActive: (active: boolean) => void;
  readGame: () => TetrisGame;
}) {
  const [phase, setPhase] = useState<Phase>('off');
  const [live, setLive] = useState<PoseAction>('none');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onActionRef = useRef(onAction);
  const onMoveRef = useRef(onMove);
  const onLineRef = useRef(onLine);
  const readGameRef = useRef(readGame);
  const stopRef = useRef<(() => void) | null>(null);
  const liveRef = useRef<PoseAction>('none');
  const gen = useRef(0);
  onActionRef.current = onAction;
  onMoveRef.current = onMove;
  onLineRef.current = onLine;
  readGameRef.current = readGame;

  function note(action: PoseAction) {
    if (liveRef.current === action) return;
    liveRef.current = action;
    setLive(action);
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
      const stop = await startPoseCamera(video, canvas, {
        onAction: (action) => onActionRef.current(action),
        onMove: (dir) => onMoveRef.current(dir),
        onLine: (row) => onLineRef.current(row),
        onLive: note,
        readGame: () => readGameRef.current(),
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
    <div className="tetris-pose">
      <button type="button" aria-pressed={phase === 'on'} onClick={() => { void toggle(); }}>
        {phase === 'on' || phase === 'opening' ? copy.poseOff : copy.pose}
      </button>
      <p className="time-hint">{poseHint(copy, phase)}</p>
      <div className={showCam ? 'tetris-cam on' : 'tetris-cam'}>
        <video ref={videoRef} playsInline muted autoPlay />
        <canvas ref={canvasRef} />
        <div className="tetris-zones" aria-hidden="true">
          <span>({copy.poseLeft})</span>
          <span className={live === 'rotateCw' ? 'active' : undefined}>({copy.poseRight})</span>
          <span className={live === 'drop' ? 'active' : undefined}>({copy.poseDrop})</span>
        </div>
      </div>
    </div>
  );
}

function poseHint(copy: TetrisCopy, phase: Phase): string {
  if (phase === 'opening') return copy.poseOpening;
  if (phase === 'on') return copy.poseReady;
  if (phase === 'denied') return copy.poseDenied;
  if (phase === 'failed') return copy.poseFailed;
  return copy.poseReady;
}
