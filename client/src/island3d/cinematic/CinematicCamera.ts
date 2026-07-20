/**
 * CinematicCamera — sole writer of camera.position / lookAt during flybys.
 * Pair with Island3DEngine.beginCinematicCamera() / endCinematicCamera().
 *
 * Does NOT use OrbitControls while active (WebGL Insights Ch.23).
 */
import * as THREE from 'three';

export interface CinematicWaypoint {
  id: string;
  label: string;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  duration: number;
  titleCard?: string;
  proofId?: string;
}

export interface CinematicPlayOpts {
  /** Abort flag checked each frame */
  shouldCancel?: () => boolean;
  onWaypoint?: (wp: CinematicWaypoint, index: number) => void;
  onFrame?: (t: number, wp: CinematicWaypoint) => void;
}

function smoothstep(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
}

/**
 * Animate camera through waypoints. Resolves when complete or cancelled.
 */
export async function playCinematicPath(
  camera: THREE.PerspectiveCamera,
  waypoints: CinematicWaypoint[],
  opts: CinematicPlayOpts = {},
): Promise<{ completed: boolean; reached: number }> {
  if (waypoints.length === 0) return { completed: true, reached: 0 };

  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  let fromPos = camera.position.clone();
  let fromLook = new THREE.Vector3(0, 0, 0);
  // Infer look-at from current camera orientation
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  fromLook.copy(camera.position).addScaledVector(dir, 40);

  let reached = 0;
  for (let i = 0; i < waypoints.length; i++) {
    if (opts.shouldCancel?.()) {
      return { completed: false, reached };
    }
    const wp = waypoints[i];
    opts.onWaypoint?.(wp, i);
    const startPos = fromPos;
    const startLook = fromLook;
    const dur = Math.max(0.2, wp.duration);
    const t0 = performance.now();

    await new Promise<void>((resolve) => {
      const step = () => {
        if (opts.shouldCancel?.()) {
          resolve();
          return;
        }
        const u = Math.min(1, (performance.now() - t0) / (dur * 1000));
        const e = smoothstep(u);
        tmpPos.lerpVectors(startPos, wp.position, e);
        tmpLook.lerpVectors(startLook, wp.lookAt, e);
        camera.position.copy(tmpPos);
        camera.lookAt(tmpLook);
        opts.onFrame?.(e, wp);
        if (u >= 1) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    fromPos = wp.position.clone();
    fromLook = wp.lookAt.clone();
    reached = i + 1;
  }
  return { completed: true, reached };
}

/** Capture current canvas as PNG data URL (force one render first). */
export function captureCanvasPng(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): string {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

/** Start MediaRecorder on the game canvas. */
export function startCanvasRecorder(
  canvas: HTMLCanvasElement,
  opts?: { fps?: number; bits?: number },
): {
  recorder: MediaRecorder;
  chunks: BlobPart[];
  stop: () => Promise<Blob | null>;
} | null {
  try {
    const stream = canvas.captureStream(opts?.fps ?? 30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: opts?.bits ?? 6_000_000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(200);
    return {
      recorder,
      chunks,
      stop: () =>
        new Promise((resolve) => {
          if (recorder.state === 'inactive') {
            resolve(chunks.length ? new Blob(chunks, { type: 'video/webm' }) : null);
            return;
          }
          recorder.onstop = () => {
            resolve(chunks.length ? new Blob(chunks, { type: 'video/webm' }) : null);
          };
          recorder.stop();
        }),
    };
  } catch {
    return null;
  }
}
