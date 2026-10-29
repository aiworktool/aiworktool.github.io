import type { Board, Dir } from './twentyLogic';
import { paintTwenty } from './twentyPoseDraw';
import {
  nextHeightBase, nextTorsoGate, torsoDir,
  type HeightBase, type TorsoBody, type TorsoDir, type TorsoGate,
} from './twentyPose';

const MODEL = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/',
  'pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
].join('');
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

type Landmark = { x: number; y: number; visibility?: number };
type PoseHost = {
  onMove: (dir: Dir) => void;
  onLive: (dir: TorsoDir) => void;
  readBoard: () => Board;
};
type PoseRun = {
  gate: TorsoGate;
  base: HeightBase;
};
type Landmarker = {
  detectForVideo: (video: HTMLVideoElement, time: number) => { landmarks: Landmark[][] };
  close: () => void;
};

export function cameraDenied(error: unknown): boolean {
  return error instanceof DOMException
    && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
}

export async function startTwentyCamera(
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
    base: { y: 0, ready: false },
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
  const body = readBody(marks);
  let live: TorsoDir = 'none';
  if (body) {
    live = torsoDir(body, run.base);
    run.base = nextHeightBase(run.base, body, live);
    const stepped = nextTorsoGate(run.gate, live, now);
    run.gate = stepped.gate;
    if (stepped.fire) host.onMove(stepped.fire);
  }
  host.onLive(live);
  drawOverlay(canvas, video, host.readBoard(), live, body);
  return now;
}

function mirrored(marks: Landmark[] | undefined): Landmark[] | undefined {
  if (!marks || marks.length <= RIGHT_HIP) return undefined;
  return marks.map((mark) => ({
    x: 1 - mark.x,
    y: mark.y,
    visibility: mark.visibility ?? 0,
  }));
}

function readBody(marks: Landmark[] | undefined): TorsoBody | null {
  if (!marks) return null;
  const body = {
    leftShoulder: point(marks[LEFT_SHOULDER]),
    rightShoulder: point(marks[RIGHT_SHOULDER]),
    leftHip: point(marks[LEFT_HIP]),
    rightHip: point(marks[RIGHT_HIP]),
  };
  if ([body.leftShoulder, body.rightShoulder, body.leftHip, body.rightHip]
    .some((item) => item.visibility < 0.5)) return null;
  return body;
}

function point(mark: Landmark) {
  return { x: mark.x, y: mark.y, visibility: mark.visibility ?? 0 };
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
  board: Board,
  live: TorsoDir,
  body: TorsoBody | null,
): void {
  const width = video.clientWidth;
  const height = video.clientHeight;
  if (width < 2 || height < 2) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintTwenty(ctx, width, height, board, live, body);
}
