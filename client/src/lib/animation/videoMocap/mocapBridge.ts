/**
 * Cross-app mocap handoff — Anim Studio ↔ Warlords ↔ Grudox.
 * Uses localStorage (same browser) + optional postMessage.
 */
import type { ReconstructedMotion } from "@shared/animation/mocap";
import { getMotionDeployService } from "../MotionDeployService";
import * as THREE from "three";

/** Shared storage key across grudge-studio subdomains where possible */
export const MOCAP_HANDOFF_KEY = "grudge_mocap_handoff_v1";
export const MOCAP_LIBRARY_KEY = "grudge_video_mocap_library_v1";

export type MocapHandoffPayload = {
  v: 1;
  at: string;
  motion: ReconstructedMotion;
  sourceHost?: string;
  intent?: string;
};

export function publishMocapHandoff(motion: ReconstructedMotion, intent?: string): void {
  const payload: MocapHandoffPayload = {
    v: 1,
    at: new Date().toISOString(),
    motion,
    sourceHost: typeof location !== "undefined" ? location.host : undefined,
    intent,
  };
  try {
    localStorage.setItem(MOCAP_HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
  try {
    window.dispatchEvent(new CustomEvent("grudge:mocap-handoff", { detail: payload }));
  } catch {
    /* */
  }
}

export function consumeMocapHandoff(): MocapHandoffPayload | null {
  try {
    const raw = localStorage.getItem(MOCAP_HANDOFF_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as MocapHandoffPayload;
    if (p?.v !== 1 || !p.motion?.frames?.length) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearMocapHandoff(): void {
  try {
    localStorage.removeItem(MOCAP_HANDOFF_KEY);
  } catch {
    /* */
  }
}

/** Build THREE clip from handoff / library motion */
export function motionToThreeClip(motion: ReconstructedMotion): THREE.AnimationClip {
  return getMotionDeployService().toAnimationClip(motion);
}

/**
 * Import bake JSON (from Anim Studio download) into a ReconstructedMotion-like object.
 */
export function importBakeJson(json: unknown): ReconstructedMotion | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const tracks = o.tracks as
    | Array<{ name: string; times: number[]; values: number[] }>
    | undefined;
  if (!tracks?.length) return null;

  const duration = Number(o.duration) || 1;
  // Reconstruct frames from quaternion tracks
  const boneTimes = new Map<string, { times: number[]; values: number[] }>();
  for (const t of tracks) {
    const bone = String(t.name || "").replace(/\.quaternion$/, "");
    if (!bone || !t.times?.length) continue;
    boneTimes.set(bone, { times: t.times, values: t.values });
  }
  if (!boneTimes.size) return null;

  // Use first track times as frame clock
  const first = [...boneTimes.values()][0];
  const frames = first.times.map((t, i) => {
    const pose: Record<string, [number, number, number, number]> = {};
    for (const [bone, tv] of boneTimes) {
      const vi = i * 4;
      pose[bone] = [
        tv.values[vi] ?? 0,
        tv.values[vi + 1] ?? 0,
        tv.values[vi + 2] ?? 0,
        tv.values[vi + 3] ?? 1,
      ];
    }
    const next = first.times[i + 1] ?? t + 0.1;
    return {
      t,
      duration: Math.max(0.04, next - t),
      pose,
      confidence: 0.85,
    };
  });

  const id = String(o.name || `import_${Date.now().toString(36)}`);
  return {
    id,
    name: id,
    skeleton: (o.skeleton as "mixamorig") || "mixamorig",
    durationSec: duration,
    frames,
    bones: [...boneTimes.keys()],
    rootMotion: "baked_locked",
    source: "pose_sequence",
    confidence: 0.85,
    validation: { ok: true, errors: [], warnings: ["imported_bake_json"], sanitized: true },
    workerClip: {
      bones: [...boneTimes.keys()],
      frames: frames.map((f) => ({
        duration: f.duration,
        pose: f.pose as Record<string, number[]>,
      })),
    },
    reply: `Imported bake JSON ${id} (${frames.length} frames)`,
  };
}

/** Deep-link helper to Anim Studio */
export function animStudioUrl(path = "/"): string {
  return `https://anim.grudge-studio.com${path.startsWith("/") ? path : `/${path}`}`;
}

export function animStudioPagesUrl(path = "/"): string {
  return `https://anim-studio.pages.dev${path.startsWith("/") ? path : `/${path}`}`;
}
