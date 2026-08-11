/**
 * Temporal smoothing for mocap pose sequences — largest quality win vs raw MediaPipe.
 * SLERP consecutive quats + optional one-euro-ish low-pass on confidence gaps.
 */

import type { MotionPoseFrame } from "./types";
import { IDENTITY_QUAT } from "./skeletons";

function nq(q: number[]): [number, number, number, number] {
  if (!Array.isArray(q) || q.length < 4) return [...IDENTITY_QUAT];
  const x = Number(q[0]),
    y = Number(q[1]),
    z = Number(q[2]),
    w = Number(q[3]);
  const L = Math.hypot(x, y, z, w) || 1;
  return [x / L, y / L, z / L, w / L];
}

function slerp(
  a: number[],
  b: number[],
  t: number,
): [number, number, number, number] {
  let ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3];
  let bx = b[0],
    by = b[1],
    bz = b[2],
    bw = b[3];
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cos = -cos;
  }
  if (cos > 0.9995) {
    const x = ax + t * (bx - ax);
    const y = ay + t * (by - ay);
    const z = az + t * (bz - az);
    const w = aw + t * (bw - aw);
    return nq([x, y, z, w]);
  }
  const half = Math.acos(Math.min(1, cos));
  const sinHalf = Math.sin(half);
  const rA = Math.sin((1 - t) * half) / sinHalf;
  const rB = Math.sin(t * half) / sinHalf;
  return nq([ax * rA + bx * rB, ay * rA + by * rB, az * rA + bz * rB, aw * rA + bw * rB]);
}

/**
 * Smooth pose frames in place-order.
 * @param amount 0 = none, 1 = heavy blend with previous (default 0.45)
 */
export function smoothPoseSequence(
  frames: MotionPoseFrame[],
  amount = 0.45,
): MotionPoseFrame[] {
  if (frames.length < 2 || amount <= 0) return frames;
  const a = Math.max(0, Math.min(0.85, amount));
  const out: MotionPoseFrame[] = [];
  let prevPose: Record<string, [number, number, number, number]> | null = null;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const pose: Record<string, [number, number, number, number]> = {};
    const keys = new Set([
      ...Object.keys(f.pose || {}),
      ...(prevPose ? Object.keys(prevPose) : []),
    ]);
    for (const k of keys) {
      const cur = nq((f.pose && f.pose[k]) || IDENTITY_QUAT);
      if (!prevPose || !prevPose[k]) {
        pose[k] = cur;
      } else {
        // Blend toward current; low confidence holds more of previous
        const conf = f.confidence ?? 0.9;
        const hold = a * (1.15 - conf);
        const t = 1 - Math.min(0.9, hold);
        pose[k] = slerp(prevPose[k], cur, t);
      }
    }
    // Pass 2: mild blend with next (bilateral) for mid frames
    out.push({
      ...f,
      pose,
      root: f.root
        ? ([
            f.root[0],
            0,
            f.root[2],
          ] as [number, number, number])
        : undefined,
    });
    prevPose = pose;
  }

  // Forward-backward smooth (two-pass)
  if (out.length >= 3 && a > 0.2) {
    const mid = a * 0.35;
    for (let i = 1; i < out.length - 1; i++) {
      const prev = out[i - 1].pose;
      const next = out[i + 1].pose;
      const cur = out[i].pose;
      const pose: Record<string, [number, number, number, number]> = {};
      for (const k of Object.keys(cur)) {
        const ab = slerp(prev[k] || cur[k], next[k] || cur[k], 0.5);
        pose[k] = slerp(cur[k], ab, mid);
      }
      out[i] = { ...out[i], pose };
    }
  }

  return out;
}

/** Drop frames with very low confidence and retime neighbors */
export function dropLowConfidence(
  frames: MotionPoseFrame[],
  minConf = 0.25,
): MotionPoseFrame[] {
  if (frames.length < 3) return frames;
  const kept = frames.filter((f, i) => {
    if (i === 0 || i === frames.length - 1) return true;
    return (f.confidence ?? 1) >= minConf;
  });
  if (kept.length < 2) return frames;
  // recompute durations
  for (let i = 0; i < kept.length; i++) {
    const nextT = kept[i + 1]?.t ?? kept[i].t + 0.1;
    kept[i] = {
      ...kept[i],
      duration: Math.max(0.04, nextT - kept[i].t),
    };
  }
  return kept;
}
