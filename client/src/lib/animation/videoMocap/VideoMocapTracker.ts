/**
 * VideoMocapTracker — watch a recorded video, track full-body pose (MediaPipe),
 * mirror to mixamorig frames for save / AnimationClip deploy.
 */
import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { MotionPoseFrame } from "@shared/animation/mocap";
import { smoothPoseSequence, dropLowConfidence } from "@shared/animation/mocap";
import {
  landmarksToMixamoPose,
  landmarksToRoot,
  type Landmark,
} from "./landmarkToMixamo";

export type TrackProgress = {
  t: number;
  duration: number;
  frameIndex: number;
  totalFrames: number;
  hasPose: boolean;
};

export type VideoTrackOptions = {
  /** Sample rate for pose extraction (default 12) */
  sampleFps?: number;
  /** Mirror L/R (useful when video faces camera) */
  mirror?: boolean;
  /** Max seconds to process (default 10, min 0.5) */
  maxDurationSec?: number;
  /** Include root XZ deltas (still Y-locked for feet) */
  includeRoot?: boolean;
  onProgress?: (p: TrackProgress) => void;
  signal?: AbortSignal;
};

export type VideoTrackResult = {
  durationSec: number;
  sampleFps: number;
  frameCount: number;
  poses: MotionPoseFrame[];
  videoWidth: number;
  videoHeight: number;
  mirror: boolean;
};

let _landmarker: PoseLandmarker | null = null;
let _loading: Promise<PoseLandmarker> | null = null;

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (_landmarker) return _landmarker;
  if (_loading) return _loading;
  _loading = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    _landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.35,
      minPosePresenceConfidence: 0.35,
      minTrackingConfidence: 0.35,
    });
    return _landmarker;
  })();
  try {
    return await _loading;
  } catch {
    // CPU fallback
    const vision = await FilesetResolver.forVisionTasks(WASM);
    _landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    return _landmarker;
  } finally {
    _loading = null;
  }
}

function loadVideo(file: File | Blob | string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const url = typeof file === "string" ? file : URL.createObjectURL(file);
    const revoke = typeof file !== "string";

    video.onloadedmetadata = () => {
      resolve(video);
    };
    video.onerror = () => {
      if (revoke) URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };
    video.src = url;
  });
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - t) < 0.001) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener(
      "error",
      () => {
        video.removeEventListener("seeked", onSeeked);
        reject(new Error("seek failed"));
      },
      { once: true },
    );
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.001));
  });
}

/**
 * Track entire video → MotionPoseFrame[] (mixamorig).
 */
export async function trackVideoFile(
  file: File | Blob | string,
  opts: VideoTrackOptions = {},
): Promise<VideoTrackResult> {
  const sampleFps = Math.max(4, Math.min(24, opts.sampleFps ?? 12));
  const maxDur = Math.max(0.5, Math.min(30, opts.maxDurationSec ?? 10));
  const mirror = opts.mirror ?? false;
  const includeRoot = opts.includeRoot !== false;

  const landmarker = await getPoseLandmarker();
  const video = await loadVideo(file);
  const duration = Math.min(video.duration || 0, maxDur);
  if (!duration || !Number.isFinite(duration)) {
    throw new Error("Video has no duration — try another format (mp4/webm)");
  }

  const step = 1 / sampleFps;
  const times: number[] = [];
  for (let t = 0; t <= duration + 1e-6; t += step) {
    times.push(Math.min(t, duration));
  }
  // ensure last frame
  if (times[times.length - 1] < duration - 0.02) times.push(duration);

  const poses: MotionPoseFrame[] = [];
  let timestampMs = 0;

  for (let i = 0; i < times.length; i++) {
    if (opts.signal?.aborted) throw new Error("Tracking cancelled");
    const t = times[i];
    await seek(video, t);

    // MediaPipe needs monotonically increasing timestamps in VIDEO mode
    timestampMs = Math.max(timestampMs + 1, Math.round(t * 1000));

    let result: PoseLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, timestampMs);
    } catch {
      // reset landmarker clock on glitch
      timestampMs += 33;
      result = landmarker.detectForVideo(video, timestampMs);
    }

    const lm = result.landmarks?.[0];
    opts.onProgress?.({
      t,
      duration,
      frameIndex: i,
      totalFrames: times.length,
      hasPose: !!lm?.length,
    });

    if (!lm?.length) {
      // hold previous pose or identity skip
      if (poses.length) {
        const prev = poses[poses.length - 1];
        poses.push({
          t,
          pose: { ...prev.pose },
          root: prev.root,
          confidence: 0.2,
          phase: "transition",
        });
      }
      continue;
    }

    const landmarks: Landmark[] = lm.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility,
    }));

    const pose = landmarksToMixamoPose(landmarks, { mirror });
    const root = includeRoot
      ? landmarksToRoot(landmarks)
      : ([0, 0, 0] as [number, number, number]);

    poses.push({
      t,
      pose,
      root,
      confidence: 0.9,
      phase: "active",
    });
  }

  // Revoke blob URL
  if (typeof file !== "string" && video.src.startsWith("blob:")) {
    URL.revokeObjectURL(video.src);
  }

  if (poses.length < 2) {
    throw new Error(
      "No poses detected — use clearer full-body footage, better lighting, or longer clip",
    );
  }

  // durations between frames
  for (let i = 0; i < poses.length; i++) {
    const next = poses[i + 1]?.t ?? poses[i].t + step;
    poses[i].duration = Math.max(0.04, next - poses[i].t);
  }

  // Quality: drop junk frames + temporal SLERP smooth (rigid-safe quats)
  let polished = dropLowConfidence(poses, 0.22);
  polished = smoothPoseSequence(polished, 0.48);
  for (let i = 0; i < polished.length; i++) {
    const next = polished[i + 1]?.t ?? polished[i].t + step;
    polished[i].duration = Math.max(0.04, next - polished[i].t);
  }

  return {
    durationSec: duration,
    sampleFps,
    frameCount: polished.length,
    poses: polished,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    mirror,
  };
}

/**
 * Live webcam tracking (one frame) — for studio mirror preview.
 */
export async function trackVideoElementFrame(
  video: HTMLVideoElement,
  timestampMs: number,
  opts?: { mirror?: boolean },
): Promise<MotionPoseFrame | null> {
  const landmarker = await getPoseLandmarker();
  const result = landmarker.detectForVideo(video, timestampMs);
  const lm = result.landmarks?.[0];
  if (!lm?.length) return null;
  const landmarks: Landmark[] = lm.map((p) => ({
    x: p.x,
    y: p.y,
    z: p.z,
    visibility: p.visibility,
  }));
  return {
    t: timestampMs / 1000,
    pose: landmarksToMixamoPose(landmarks, { mirror: opts?.mirror }),
    root: landmarksToRoot(landmarks),
    confidence: 0.9,
    phase: "active",
  };
}
