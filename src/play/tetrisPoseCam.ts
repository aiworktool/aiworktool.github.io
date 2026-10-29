import type { TetrisGame } from './tetrisLogic';
import { paintPose, type PoseMark } from './tetrisPoseDraw';
import {
  acceptDrop, canSenseFollow, dropCleared, nextPoseGate, nextPoseMove,
  poseAction, poseLean, senseRow,
  type MoveGate, type PoseAction, type PoseBody, type PoseGate, type PoseMove,
} from './tetrisPose';

const MODEL = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/',
  'pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
].join('');
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

type Landmark = { x: number; y: number; visibility?: number };
type Live = (action: PoseAction) => void;
type MoveHandler = (dir: Exclude<PoseMove, 'none'>) => void;
type PoseHost = {
  onAction: (action: Exclude<PoseAction, 'none'>) => void;
  onMove: MoveHandler;
  onLive: Live;
  onLine: (row: number) => void;
  readGame: () => TetrisGame;
};
type PoseRun = {
  gate: PoseGate;
  move: MoveGate;
  dropReady: boolean;
};
type Landmarker = {
  detectForVideo: (video: HTMLVideoElement, time: number) => { landmarks: Landmark[][] };
  close: () => void;
};

export function cameraDenied(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
}

export async function startPoseCamera(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  host: PoseHost,
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'user' },
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  });
  try {
    video.srcObject = stream;
    await video.play();
    const landmarker = await openLandmarker();
    return watchPose(video, canvas, landmarker, stream, host);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    throw error;
  }
}

function watchPose(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  landmarker: Landmarker,
  stream: MediaStream,
  host: PoseHost,
): () => void {
  let frame = 0;
  let stopped = false;
  let lastTime = 0;
  const run: PoseRun = {
    gate: { last: 'none', at: 0 },
    move: { dir: 'none', at: 0 },
    dropReady: false,
  };
  const loop = () => {
    if (stopped) return;
    frame = requestAnimationFrame(loop);
    lastTime = stepPose(video, canvas, landmarker, run, lastTime, host);
  };
  frame = requestAnimationFrame(loop);
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    landmarker.close();
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
}

function stepPose(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  landmarker: Landmarker,
  run: PoseRun,
  lastTime: number,
  host: PoseHost,
): number {
  if (video.readyState < 2) return lastTime;
  const now = Math.max(lastTime + 1, performance.now());
  const marks = mirrored(landmarker.detectForVideo(video, now).landmarks[0]);
  applyPose(marks, run, now, host);
  drawOverlay(canvas, video, marks, host.readGame());
  return now;
}

function applyPose(marks: PoseMark[] | undefined, run: PoseRun, now: number, host: PoseHost): void {
  const body = readBody(marks);
  const lean = body ? poseLean(body) : 'none';
  let shown: PoseAction = 'none';
  if (body) {
    const raw = poseAction(body);
    const drop = acceptDrop(run.dropReady, raw, dropCleared(body));
    run.dropReady = drop.ready;
    shown = drop.action;
    if (run.dropReady && canSenseFollow(body)) host.onLine(senseRow(body));
  }
  const stepped = nextPoseGate(run.gate, shown, now);
  run.gate = stepped.gate;
  if (stepped.fire && stepped.fire !== 'none') {
    if (stepped.fire === 'drop') run.dropReady = false;
    host.onAction(stepped.fire);
  }
  if (!stepped.fire) {
    const moved = nextPoseMove(run.move, lean, now);
    run.move = moved.gate;
    if (moved.fire && moved.gate.dir !== 'none') host.onMove(moved.gate.dir);
  }
  host.onLive(shown);
}

function mirrored(marks: Landmark[] | undefined): PoseMark[] | undefined {
  if (!marks || marks.length <= RIGHT_WRIST) return undefined;
  return marks.map((mark) => ({
    x: 1 - mark.x,
    y: mark.y,
    visibility: mark.visibility ?? 0,
  }));
}

function readBody(marks: PoseMark[] | undefined): PoseBody | null {
  if (!marks) return null;
  const body = {
    nose: marks[NOSE],
    leftShoulder: marks[LEFT_SHOULDER],
    rightShoulder: marks[RIGHT_SHOULDER],
    leftWrist: marks[LEFT_WRIST],
    rightWrist: marks[RIGHT_WRIST],
  };
  const tracked = [body.leftWrist, body.rightWrist, body.leftShoulder, body.rightShoulder];
  if (tracked.some((point) => point.visibility < 0.5)) return null;
  return body;
}

async function openLandmarker(): Promise<Landmarker> {
  const vision = await import('@mediapipe/tasks-vision');
  const base = new URL('/pose/', window.location.origin).href;
  try {
    return await vision.PoseLandmarker.createFromOptions(
      await vision.FilesetResolver.forVisionTasks(base),
      poseOptions('GPU'),
    );
  } catch {
    return await vision.PoseLandmarker.createFromOptions(
      await vision.FilesetResolver.forVisionTasks(base),
      poseOptions('CPU'),
    );
  }
}

function poseOptions(delegate: 'GPU' | 'CPU') {
  return {
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: 'VIDEO' as const,
    numPoses: 1,
  };
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  marks: PoseMark[] | undefined,
  game: TetrisGame,
): void {
  const width = video.clientWidth;
  const height = video.clientHeight;
  if (width < 2 || height < 2) return;
  const ctx = fitOverlay(canvas, width, height);
  if (!ctx) return;
  paintPose(ctx, width, height, marks, game);
}

function fitOverlay(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
