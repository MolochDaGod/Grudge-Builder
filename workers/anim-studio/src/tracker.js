import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { landmarksToMixamoPose, landmarksToRoot } from "./landmarkToMixamo.js";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarker = null;
let loading = null;

export async function getPoseLandmarker() {
  if (landmarker) return landmarker;
  if (loading) return loading;
  loading = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.35,
        minPosePresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });
    } catch {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    }
    return landmarker;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };
    video.src = url;
  });
}

function seek(video, t) {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - t) < 0.001) return resolve();
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.addEventListener("error", () => reject(new Error("seek failed")), { once: true });
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.001));
  });
}

export async function trackVideoFile(file, opts = {}) {
  const sampleFps = Math.max(4, Math.min(24, opts.sampleFps ?? 12));
  const maxDur = Math.max(0.5, Math.min(30, opts.maxDurationSec ?? 10));
  const mirror = !!opts.mirror;
  const lm = await getPoseLandmarker();
  const { video, url } = await loadVideo(file);
  const duration = Math.min(video.duration || 0, maxDur);
  if (!duration || !Number.isFinite(duration)) {
    URL.revokeObjectURL(url);
    throw new Error("Video has no duration — use mp4/webm");
  }

  const step = 1 / sampleFps;
  const times = [];
  for (let t = 0; t <= duration + 1e-6; t += step) times.push(Math.min(t, duration));
  if (times[times.length - 1] < duration - 0.02) times.push(duration);

  const poses = [];
  let ts = 0;
  for (let i = 0; i < times.length; i++) {
    if (opts.signal?.aborted) {
      URL.revokeObjectURL(url);
      throw new Error("Tracking cancelled");
    }
    const t = times[i];
    await seek(video, t);
    ts = Math.max(ts + 1, Math.round(t * 1000));
    let result;
    try {
      result = lm.detectForVideo(video, ts);
    } catch {
      ts += 33;
      result = lm.detectForVideo(video, ts);
    }
    const row = result.landmarks?.[0];
    opts.onProgress?.({
      t,
      duration,
      frameIndex: i,
      totalFrames: times.length,
      hasPose: !!row?.length,
      pct: ((i + 1) / times.length) * 100,
    });
    if (!row?.length) {
      if (poses.length) {
        const prev = poses[poses.length - 1];
        poses.push({ t, pose: { ...prev.pose }, root: prev.root, confidence: 0.2 });
      }
      continue;
    }
    const landmarks = row.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility,
    }));
    poses.push({
      t,
      pose: landmarksToMixamoPose(landmarks, { mirror }),
      root: landmarksToRoot(landmarks),
      confidence: 0.9,
    });
  }
  URL.revokeObjectURL(url);

  if (poses.length < 2) {
    throw new Error("No poses detected — use clearer full-body footage");
  }
  for (let i = 0; i < poses.length; i++) {
    const next = poses[i + 1]?.t ?? poses[i].t + step;
    poses[i].duration = Math.max(0.04, next - poses[i].t);
  }
  const polished = smoothPoses(poses, 0.48);
  for (let i = 0; i < polished.length; i++) {
    const next = polished[i + 1]?.t ?? polished[i].t + step;
    polished[i].duration = Math.max(0.04, next - polished[i].t);
  }
  return {
    durationSec: duration,
    sampleFps,
    frameCount: polished.length,
    poses: polished,
    mirror,
  };
}

function nq(q) {
  if (!q || q.length < 4) return [0, 0, 0, 1];
  const L = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / L, q[1] / L, q[2] / L, q[3] / L];
}
function slerp(a, b, t) {
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    bx = -bx; by = -by; bz = -bz; bw = -bw; cos = -cos;
  }
  if (cos > 0.9995) {
    return nq([ax + t * (bx - ax), ay + t * (by - ay), az + t * (bz - az), aw + t * (bw - aw)]);
  }
  const half = Math.acos(Math.min(1, cos));
  const s = Math.sin(half);
  const rA = Math.sin((1 - t) * half) / s;
  const rB = Math.sin(t * half) / s;
  return nq([ax * rA + bx * rB, ay * rA + by * rB, az * rA + bz * rB, aw * rA + bw * rB]);
}
function smoothPoses(frames, amount = 0.45) {
  if (frames.length < 2) return frames;
  const a = Math.max(0, Math.min(0.85, amount));
  const out = [];
  let prev = null;
  for (const f of frames) {
    const pose = {};
    const keys = new Set([...Object.keys(f.pose || {}), ...(prev ? Object.keys(prev) : [])]);
    for (const k of keys) {
      const cur = nq((f.pose && f.pose[k]) || [0, 0, 0, 1]);
      if (!prev || !prev[k]) pose[k] = cur;
      else {
        const conf = f.confidence ?? 0.9;
        const t = 1 - Math.min(0.9, a * (1.15 - conf));
        pose[k] = slerp(prev[k], cur, t);
      }
    }
    out.push({
      ...f,
      pose,
      root: f.root ? [f.root[0], 0, f.root[2]] : undefined,
    });
    prev = pose;
  }
  if (out.length >= 3) {
    const mid = a * 0.35;
    for (let i = 1; i < out.length - 1; i++) {
      const pose = {};
      for (const k of Object.keys(out[i].pose)) {
        const ab = slerp(
          out[i - 1].pose[k] || out[i].pose[k],
          out[i + 1].pose[k] || out[i].pose[k],
          0.5,
        );
        pose[k] = slerp(out[i].pose[k], ab, mid);
      }
      out[i] = { ...out[i], pose };
    }
  }
  return out;
}

/** Warm model in idle time for snappier first track */
export function preloadPoseModel() {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      getPoseLandmarker().catch(() => {});
    }, { timeout: 4000 });
  } else {
    setTimeout(() => getPoseLandmarker().catch(() => {}), 1200);
  }
}
