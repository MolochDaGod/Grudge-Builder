/**
 * Motion reconstruct — from screen-recording brief / NL / pose sequence
 * into rigid-body-safe ReconstructedMotion.
 *
 * Deterministic templates + structure for AI-filled poses.
 */

import type {
  MocapReconstructRequest,
  MotionPoseFrame,
  ReconstructedMotion,
  MotionDeployManifest,
  ScreenRecordingMotionBrief,
} from "./types";
import { DEFAULT_RIGID_BODY_ANIM_POLICY } from "./types";
import { bonesForSkeleton, IDENTITY_QUAT, mapPoseToSkeleton } from "./skeletons";
import { sanitizeMotionFrames, mergePolicy } from "./rigidBodyGuard";

export const MOCAP_PIPELINE_VERSION = "1.0.0";

function clampDuration(sec: number): number {
  return Math.max(2, Math.min(10, sec || 3));
}

function eulerToQuat(x: number, y: number, z: number): [number, number, number, number] {
  const cx = Math.cos(x * 0.5);
  const sx = Math.sin(x * 0.5);
  const cy = Math.cos(y * 0.5);
  const sy = Math.sin(y * 0.5);
  const cz = Math.cos(z * 0.5);
  const sz = Math.sin(z * 0.5);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

function deg(...d: number[]): number[] {
  return d.map((v) => (v * Math.PI) / 180);
}

/** Procedural attack-like motion for 2–10s (windup → multi-active → recovery) */
export function templateFromIntent(
  intent: string,
  durationSec: number,
  skeleton: "mixamorig" | "bip001" = "mixamorig",
): MotionPoseFrame[] {
  const d = clampDuration(durationSec);
  const n = Math.min(48, Math.max(8, Math.round(d * 6)));
  const frames: MotionPoseFrame[] = [];
  const R = (arm: "r" | "l", x: number, y: number, z: number) => {
    const q = eulerToQuat(...(deg(x, y, z) as [number, number, number]));
    if (skeleton === "bip001") {
      return arm === "r"
        ? {
            Bip001_R_UpperArm: q,
            Bip001_R_Forearm: eulerToQuat(...(deg(0, 0, z * 0.4) as [number, number, number])),
          }
        : {
            Bip001_L_UpperArm: q,
            Bip001_L_Forearm: eulerToQuat(...(deg(0, 0, -z * 0.4) as [number, number, number])),
          };
    }
    return arm === "r"
      ? {
          mixamorigRightArm: q,
          mixamorigRightForeArm: eulerToQuat(
            ...(deg(0, 0, z * 0.4) as [number, number, number]),
          ),
        }
      : {
          mixamorigLeftArm: q,
          mixamorigLeftForeArm: eulerToQuat(
            ...(deg(0, 0, -z * 0.4) as [number, number, number]),
          ),
        };
  };

  const hips = skeleton === "bip001" ? "Bip001_Pelvis" : "mixamorigHips";
  const spine = skeleton === "bip001" ? "Bip001_Spine2" : "mixamorigSpine2";

  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const t = u * d;
    let phase: MotionPoseFrame["phase"] = "active";
    let pose: Record<string, [number, number, number, number]> = {
      [hips]: IDENTITY_QUAT,
      [spine]: IDENTITY_QUAT,
    };

    if (intent === "combo" || intent === "attack") {
      // 2-hit structure over duration
      const hit = u < 0.45 ? 0 : 1;
      const local = hit === 0 ? u / 0.45 : (u - 0.45) / 0.55;
      if (local < 0.25) phase = "windup";
      else if (local < 0.55) phase = "active";
      else phase = "recovery";

      const swing =
        phase === "windup"
          ? -40
          : phase === "active"
            ? 80 * Math.sin((local - 0.25) / 0.3 * Math.PI)
            : 10;
      const yaw = hit === 0 ? -15 : 20;
      pose = {
        ...pose,
        [hips]: eulerToQuat(...(deg(0, yaw * (phase === "active" ? 1 : 0.3), 0) as [number, number, number])),
        [spine]: eulerToQuat(...(deg(5, yaw * 0.5, 0) as [number, number, number])),
        ...R("r", -20 + swing * 0.3, swing * 0.2, -50 - swing),
        ...R("l", 10, 0, 25),
      };
    } else if (intent === "loco" || intent === "walk" || intent === "run") {
      phase = "active";
      const gait = Math.sin(u * Math.PI * 4);
      const leg = skeleton === "bip001"
        ? {
            Bip001_L_Thigh: eulerToQuat(...(deg(gait * 30, 0, 0) as [number, number, number])),
            Bip001_R_Thigh: eulerToQuat(...(deg(-gait * 30, 0, 0) as [number, number, number])),
            Bip001_L_UpperArm: eulerToQuat(...(deg(-gait * 20, 0, 10) as [number, number, number])),
            Bip001_R_UpperArm: eulerToQuat(...(deg(gait * 20, 0, -10) as [number, number, number])),
          }
        : {
            mixamorigLeftUpLeg: eulerToQuat(...(deg(gait * 30, 0, 0) as [number, number, number])),
            mixamorigRightUpLeg: eulerToQuat(...(deg(-gait * 30, 0, 0) as [number, number, number])),
            mixamorigLeftArm: eulerToQuat(...(deg(-gait * 20, 0, 10) as [number, number, number])),
            mixamorigRightArm: eulerToQuat(...(deg(gait * 20, 0, -10) as [number, number, number])),
          };
      pose = { ...pose, ...leg };
    } else if (intent === "dodge") {
      phase = u < 0.3 ? "windup" : u < 0.7 ? "active" : "recovery";
      pose = {
        ...pose,
        [hips]: eulerToQuat(...(deg(15, 0, -35 * Math.sin(u * Math.PI)) as [number, number, number])),
      };
    } else if (intent === "cast") {
      phase = u < 0.4 ? "windup" : u < 0.7 ? "active" : "recovery";
      pose = {
        ...pose,
        ...R("r", -70, -10, -30),
        ...R("l", -70, 10, 30),
        [spine]: eulerToQuat(...(deg(-8, 0, 0) as [number, number, number])),
      };
    } else {
      // emote / misc — light arm raise wave
      const w = Math.sin(u * Math.PI * 2) * 40;
      pose = { ...pose, ...R("r", -30, 0, -90 + w) };
    }

    frames.push({ t, pose, phase, confidence: 0.75 });
  }
  return frames;
}

function inferIntent(text: string): string {
  const t = text.toLowerCase();
  if (/\b(combo|two hit|3 hit|multi)\b/.test(t)) return "combo";
  if (/\b(attack|slash|strike|punch|swing)\b/.test(t)) return "attack";
  if (/\b(walk|run|sprint|locomotion)\b/.test(t)) return "loco";
  if (/\b(dodge|roll|evade)\b/.test(t)) return "dodge";
  if (/\b(cast|spell|magic)\b/.test(t)) return "cast";
  return "misc";
}

/**
 * Local reconstruct (no network). Used by client + as worker fallback.
 */
export function reconstructMotionLocal(
  req: MocapReconstructRequest,
): ReconstructedMotion {
  const policy = mergePolicy(req.rigidBody);
  const targetSkel = req.target.skeleton === "bip001" ? "bip001" : "mixamorig";
  const bones = [...bonesForSkeleton(targetSkel)];
  const brief = req.brief;
  let duration = 3;
  let description = "";
  let intent = "misc";
  let poses: MotionPoseFrame[] = [];
  let source: ReconstructedMotion["source"] = "nl_description";
  let confidence = 0.55;

  if (brief.kind === "screen_recording") {
    const b = brief as ScreenRecordingMotionBrief;
    source = "screen_recording";
    duration = clampDuration(b.durationSec);
    description = b.description || "";
    intent = b.intent || inferIntent(description);
    if (b.poses?.length) {
      poses = b.poses.map((p) => ({
        ...p,
        pose: mapPoseToSkeleton(
          p.pose as Record<string, number[]>,
          "mixamorig",
          targetSkel,
        ),
      }));
      confidence = 0.85;
    }
  } else if (brief.kind === "pose_sequence") {
    source = "pose_sequence";
    duration = clampDuration(brief.durationSec || 3);
    description = brief.description || "pose sequence";
    intent = inferIntent(description);
    poses = (brief.poses || []).map((p) => ({
      ...p,
      pose: mapPoseToSkeleton(
        p.pose as Record<string, number[]>,
        "mixamorig",
        targetSkel,
      ),
    }));
    confidence = poses.length ? 0.9 : 0.4;
  } else {
    source = brief.kind === "reference_clip" ? "reference_clip" : "nl_description";
    duration = clampDuration(brief.durationSec || 3);
    description = brief.description || "";
    intent = inferIntent(description);
  }

  if (!poses.length) {
    poses = templateFromIntent(intent, duration, targetSkel);
    confidence = Math.min(confidence, 0.65);
  }

  const { frames, result } = sanitizeMotionFrames(poses, targetSkel, policy);
  const usedBones = new Set<string>();
  for (const f of frames) {
    for (const k of Object.keys(f.pose)) usedBones.add(k);
  }
  const boneList = bones.filter((b) => usedBones.has(b));
  if (!boneList.length) boneList.push(...bones.slice(0, 1));

  const workerFrames = frames.map((f) => {
    const pose: Record<string, number[]> = {};
    for (const b of boneList) {
      pose[b] = f.pose[b] || [...IDENTITY_QUAT];
    }
    const out: {
      duration: number;
      pose: Record<string, number[]>;
      root?: number[];
    } = {
      duration: f.duration ?? 0.12,
      pose,
    };
    if (f.root) out.root = f.root;
    return out;
  });

  const id =
    req.target.fleetClipKey ||
    `mocap_${intent}_${Date.now().toString(36)}`;

  return {
    id,
    name: req.target.slot || intent,
    skeleton: targetSkel,
    durationSec: frames.length
      ? frames[frames.length - 1].t + (frames[frames.length - 1].duration || 0.1)
      : duration,
    frames,
    bones: boneList,
    rootMotion: policy.rootMotion,
    source,
    confidence,
    validation: result,
    workerClip: { bones: boneList, frames: workerFrames },
    reply: result.ok
      ? `Reconstructed ${intent} (${source}) ${duration.toFixed(1)}s → ${targetSkel}, ${frames.length} frames, conf=${confidence.toFixed(2)}`
      : `Reconstruct failed: ${result.errors.join("; ")}`,
  };
}

export function buildDeployManifest(
  motion: ReconstructedMotion,
  opts?: {
    pack?: string;
    comboId?: string;
    comboStepIndex?: number;
    redeployOf?: string;
  },
): MotionDeployManifest {
  const pack = opts?.pack || "mocap";
  const key = motion.id;
  const ok = motion.validation.ok && motion.frames.length > 0;
  return {
    version: MOCAP_PIPELINE_VERSION,
    motionId: motion.id,
    fleetClipKey: key,
    skeleton: motion.skeleton,
    pack,
    bakedRel: `anims/baked/${pack}/${key}.json`,
    comboId: opts?.comboId,
    comboStepIndex: opts?.comboStepIndex,
    rigidBody: DEFAULT_RIGID_BODY_ANIM_POLICY,
    validation: motion.validation,
    deployAt: new Date().toISOString(),
    redeployOf: opts?.redeployOf,
    status: ok ? "validated" : "rejected",
  };
}

/**
 * Convert reconstructed motion to THREE-friendly track dump
 * (times + quaternion values per bone) for AnimationClip construction client-side.
 */
export function motionToTrackDump(motion: ReconstructedMotion): {
  name: string;
  duration: number;
  tracks: Array<{ name: string; times: number[]; values: number[] }>;
} {
  const times = motion.frames.map((f) => f.t);
  const duration = motion.durationSec;
  const tracks: Array<{ name: string; times: number[]; values: number[] }> = [];

  for (const bone of motion.bones) {
    const values: number[] = [];
    for (const f of motion.frames) {
      const q = f.pose[bone] || IDENTITY_QUAT;
      values.push(q[0], q[1], q[2], q[3]);
    }
    tracks.push({
      name: `${bone}.quaternion`,
      times: [...times],
      values,
    });
  }
  return { name: motion.name, duration, tracks };
}
