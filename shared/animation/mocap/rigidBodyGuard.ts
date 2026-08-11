/**
 * Rigid-body + skinned-mesh safety for motion clips.
 * Prevents broken skins, hip float, and physics desync.
 */

import type {
  MotionPoseFrame,
  MotionValidationResult,
  RigidBodyAnimPolicy,
  SkeletonFamily,
} from "./types";
import { DEFAULT_RIGID_BODY_ANIM_POLICY } from "./types";
import { bonesForSkeleton, IDENTITY_QUAT } from "./skeletons";

function normQuat(
  q: number[],
): [number, number, number, number] | null {
  if (!Array.isArray(q) || q.length < 4) return null;
  const x = Number(q[0]);
  const y = Number(q[1]);
  const z = Number(q[2]);
  const w = Number(q[3]);
  if (![x, y, z, w].every(Number.isFinite)) return null;
  const len = Math.hypot(x, y, z, w);
  if (len < 1e-6) return null;
  return [x / len, y / len, z / len, w / len];
}

function quatAngle(a: number[], b: number[]): number {
  // angle between unit quats
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  dot = Math.min(1, Math.max(-1, Math.abs(dot)));
  return 2 * Math.acos(dot);
}

/**
 * Sanitize frames: normalize quats, drop position-as-bone keys, clamp steps.
 */
export function sanitizeMotionFrames(
  frames: MotionPoseFrame[],
  skeleton: SkeletonFamily,
  policy: RigidBodyAnimPolicy = DEFAULT_RIGID_BODY_ANIM_POLICY,
): { frames: MotionPoseFrame[]; result: MotionValidationResult } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allowed = new Set(bonesForSkeleton(skeleton));
  const maxStep = policy.maxAngularStepRad ?? 1.2;
  let sanitized = false;

  if (!frames.length) {
    return {
      frames: [],
      result: {
        ok: false,
        errors: ["No frames in motion"],
        warnings: [],
      },
    };
  }

  const duration = frames[frames.length - 1]?.t ?? 0;
  if (duration > 10.5) {
    warnings.push(`Duration ${duration.toFixed(2)}s > 10s pipeline limit — will clamp`);
  }
  if (duration > 0 && duration < 0.4) {
    warnings.push(`Very short clip ${duration.toFixed(2)}s — may need hold frames`);
  }

  const out: MotionPoseFrame[] = [];
  let prevPose: Record<string, number[]> = {};

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const pose: Record<string, [number, number, number, number]> = {};
    const src = f.pose || {};

    for (const [key, raw] of Object.entries(src)) {
      // Reject obvious position-style 3-vectors as bone keys
      if (Array.isArray(raw) && raw.length === 3) {
        warnings.push(`Dropped position-like key "${key}" (rigid/skin safety)`);
        sanitized = true;
        continue;
      }
      if (!allowed.has(key) && !key.startsWith("mixamorig") && !key.startsWith("Bip001")) {
        // try keep if mixamo/bip001 style anyway
        if (policy.requireAllKeysPresent) {
          warnings.push(`Unknown bone "${key}" dropped`);
          sanitized = true;
          continue;
        }
      }
      if (allowed.size && !allowed.has(key)) {
        // map loose names later — drop unknown for hard safety
        warnings.push(`Bone "${key}" not in ${skeleton} allow-list — dropped`);
        sanitized = true;
        continue;
      }

      let q = normQuat(raw as number[]);
      if (!q) {
        q = [...IDENTITY_QUAT];
        warnings.push(`Invalid quat on ${key} frame ${i} → identity`);
        sanitized = true;
      }

      if (prevPose[key]) {
        const ang = quatAngle(prevPose[key], q);
        if (ang > maxStep) {
          // slerp halfway toward new to soften break
          const t = 0.5;
          const blended = slerp(prevPose[key], q, t);
          q = blended;
          warnings.push(
            `Angular step ${ang.toFixed(2)}rad on ${key}@${i} softened (mesh tear guard)`,
          );
          sanitized = true;
        }
      }
      pose[key] = q;
    }

    // Ensure hips exist for root hierarchy stability
    const hipsKey =
      skeleton === "bip001" ? "Bip001_Pelvis" : "mixamorigHips";
    if (!pose[hipsKey] && allowed.has(hipsKey)) {
      pose[hipsKey] = [...IDENTITY_QUAT];
      sanitized = true;
    }

    let root = f.root;
    if (policy.rootMotion === "baked_locked" && root) {
      // lock Y to 0 relative — keep optional XZ for controller extract
      root = [root[0] || 0, 0, root[2] || 0];
      sanitized = true;
    }
    if (policy.rootMotion === "none") {
      root = undefined;
    }

    const t = Number.isFinite(f.t) ? Math.max(0, f.t) : i * 0.1;
    out.push({
      t: Math.min(t, 10),
      duration: f.duration,
      pose,
      root: root as [number, number, number] | undefined,
      phase: f.phase,
      confidence: f.confidence,
    });
    prevPose = pose;
  }

  // Sort by t and recompute durations
  out.sort((a, b) => a.t - b.t);
  for (let i = 0; i < out.length; i++) {
    const nextT = i + 1 < out.length ? out[i + 1].t : out[i].t + 0.12;
    out[i].duration = Math.max(0.05, Math.min(2, nextT - out[i].t));
  }

  if (out.length > 64) {
    warnings.push(`Capped ${out.length} frames to 64`);
    out.length = 64;
    sanitized = true;
  }

  const ok = errors.length === 0 && out.length > 0;
  return {
    frames: out,
    result: { ok, errors, warnings, sanitized },
  };
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
  let cosHalf = ax * bx + ay * by + az * bz + aw * bw;
  if (cosHalf < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cosHalf = -cosHalf;
  }
  if (cosHalf > 0.9995) {
    const x = ax + t * (bx - ax);
    const y = ay + t * (by - ay);
    const z = az + t * (bz - az);
    const w = aw + t * (bw - aw);
    const n = Math.hypot(x, y, z, w) || 1;
    return [x / n, y / n, z / n, w / n];
  }
  const half = Math.acos(cosHalf);
  const sinHalf = Math.sin(half);
  const rA = Math.sin((1 - t) * half) / sinHalf;
  const rB = Math.sin(t * half) / sinHalf;
  return [
    ax * rA + bx * rB,
    ay * rA + by * rB,
    az * rA + bz * rB,
    aw * rA + bw * rB,
  ];
}

/** Validate policy against a deploy manifest-ish object */
export function validateRigidBodyPolicy(
  policy: RigidBodyAnimPolicy,
): MotionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!policy.rotationOnlyBones) {
    errors.push("rotationOnlyBones must be true for skinned fleet characters");
  }
  if (policy.rootMotion === "hips_full") {
    warnings.push("hips_full root motion can fight CCT — prefer baked_locked");
  }
  if (policy.humanHeightM < 0.5 || policy.humanHeightM > 3) {
    errors.push("humanHeightM out of SI range");
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function mergePolicy(
  partial?: Partial<RigidBodyAnimPolicy>,
): RigidBodyAnimPolicy {
  return { ...DEFAULT_RIGID_BODY_ANIM_POLICY, ...partial };
}
