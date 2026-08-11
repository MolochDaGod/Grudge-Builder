/**
 * Execute AnimPlan against a host (Three.js mixer / AnimationDirector / TVS).
 */

import type { AnimOp, AnimPlan, ProceduralPreset } from "./intentSchema";
import { explainTopic } from "./nlCompiler";

/** Minimal THREE-like types so we don't hard-depend on the package at compile time */
export interface MixerLike {
  update(delta: number): void;
  clipAction(clip: ClipLike, root?: unknown): ActionLike;
  existingAction?(clip: ClipLike, root?: unknown): ActionLike | null;
  stopAllAction?(): void;
  uncacheRoot?(root: unknown): void;
  addEventListener?(type: string, cb: (e: unknown) => void): void;
}

export interface ActionLike {
  play(): ActionLike;
  stop(): ActionLike;
  reset(): ActionLike;
  fadeIn(d: number): ActionLike;
  fadeOut(d: number): ActionLike;
  crossFadeTo(other: ActionLike, duration: number, warp?: boolean): ActionLike;
  setEffectiveWeight(w: number): ActionLike;
  setEffectiveTimeScale(s: number): ActionLike;
  isRunning(): boolean;
  clampWhenFinished: boolean;
  loop: number | string;
  paused: boolean;
  weight: number;
  timeScale: number;
  getClip?(): ClipLike;
}

export interface ClipLike {
  name: string;
  duration: number;
  uuid?: string;
  optimize?(): void;
}

export interface Object3DLike {
  position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  rotation: { y: number };
  quaternion?: { setFromEuler?(e: unknown): void };
}

/**
 * Host contract — wire this from Animator SPA, grudge-game world, or TVS bridge.
 */
export interface AnimWorkerHost {
  /** Resolve semantic slot → clip (and optional already-created action) */
  resolveClip?(slot: string): ClipLike | null | undefined;
  getMixer?(): MixerLike | null | undefined;
  getRoot?(): Object3DLike | null | undefined;
  listClips?(): string[];
  /** Prefer director when present (Grudge AnimationDirector) */
  setGaitTarget?(moving: boolean, sprinting?: boolean): void;
  playOneShot?(clip: ClipLike | string, opts?: { fade?: number; timeScale?: number }): void;
  playLoop?(clip: ClipLike | string, fade?: number): void;
  stopAll?(fade?: number): void;
  createProceduralClip?(
    name: string,
    preset: ProceduralPreset,
    duration: number,
  ): ClipLike | null;
  /** THREE namespace if procedural factory runs on client */
  THREE?: {
    AnimationClip: new (name: string, duration: number, tracks: unknown[]) => ClipLike;
    NumberKeyframeTrack: new (name: string, times: number[], values: number[]) => unknown;
    VectorKeyframeTrack: new (name: string, times: number[], values: number[]) => unknown;
    QuaternionKeyframeTrack: new (name: string, times: number[], values: number[]) => unknown;
    LoopOnce: number | string;
    LoopRepeat: number | string;
    Euler: new (x: number, y: number, z: number) => unknown;
    Quaternion: new () => { setFromEuler(e: unknown): { x: number; y: number; z: number; w: number } };
  };
  onLog?(msg: string): void;
}

export interface ExecResult {
  ok: boolean;
  messages: string[];
  errors: string[];
}

export function executePlan(plan: AnimPlan, host: AnimWorkerHost): ExecResult {
  const messages: string[] = [];
  const errors: string[] = [];

  if (plan.reply) messages.push(plan.reply);

  for (const op of plan.ops) {
    try {
      const msg = executeOp(op, host);
      if (msg) messages.push(msg);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      errors.push(`${op.op}: ${m}`);
      host.onLog?.(`[anim-worker] error ${op.op}: ${m}`);
    }
  }

  return { ok: errors.length === 0, messages, errors };
}

function executeOp(op: AnimOp, host: AnimWorkerHost): string {
  switch (op.op) {
    case "list_clips": {
      const clips = host.listClips?.() || [];
      return clips.length
        ? `Clips: ${clips.join(", ")}`
        : "No clips registered on host.";
    }
    case "explain":
      return explainTopic(op.topic);
    case "set_gait": {
      if (host.setGaitTarget) {
        host.setGaitTarget(op.moving, op.sprinting);
        return `Gait: moving=${op.moving} sprinting=${!!op.sprinting}`;
      }
      // Fallback: play walk/run/idle
      const slot = !op.moving ? "idle" : op.sprinting ? "sprint" : "walk";
      return playSlot(host, slot, { loop: true, fade: 0.25 });
    }
    case "play":
      return playSlot(host, op.slot, {
        loop: op.loop !== false,
        fade: op.fade ?? 0.25,
        timeScale: op.timeScale ?? 1,
      });
    case "oneshot":
      return oneShot(host, op.slot, op.fade ?? 0.15, op.timeScale ?? 1);
    case "stop": {
      if (host.stopAll && !op.slot) {
        host.stopAll(op.fade);
        return "Stopped all";
      }
      const mixer = host.getMixer?.();
      const clip = host.resolveClip?.(op.slot || "idle");
      if (mixer && clip) {
        const action = mixer.clipAction(clip);
        if (op.fade && op.fade > 0) action.fadeOut(op.fade);
        else action.stop();
        return `Stopped ${op.slot || "all"}`;
      }
      host.stopAll?.(op.fade);
      return "Stop requested";
    }
    case "crossfade": {
      const mixer = host.getMixer?.();
      const a = host.resolveClip?.(op.from);
      const b = host.resolveClip?.(op.to);
      if (!mixer || !a || !b) {
        // degrade to play target
        return playSlot(host, op.to, { loop: true, fade: op.duration ?? 0.35 });
      }
      const fromA = mixer.clipAction(a);
      const toA = mixer.clipAction(b);
      fromA.play();
      toA.reset().play();
      fromA.crossFadeTo(toA, op.duration ?? 0.35, true);
      return `Crossfade ${op.from} → ${op.to}`;
    }
    case "move_root": {
      const root = host.getRoot?.();
      if (!root) return "No root Object3D on host";
      const dx = op.x ?? 0;
      const dy = op.y ?? 0;
      const dz = op.z ?? 0;
      if (op.relative !== false) {
        root.position.x += dx;
        root.position.y += dy;
        root.position.z += dz;
      } else {
        root.position.set(dx, dy, dz);
      }
      return `Root → (${root.position.x.toFixed(2)}, ${root.position.y.toFixed(2)}, ${root.position.z.toFixed(2)})`;
    }
    case "face": {
      const root = host.getRoot?.();
      if (!root) return "No root for face";
      const rad = op.degrees !== false ? (op.yaw * Math.PI) / 180 : op.yaw;
      root.rotation.y = rad;
      return `Face yaw=${op.yaw}${op.degrees !== false ? "°" : "rad"}`;
    }
    case "create_clip": {
      let clip =
        host.createProceduralClip?.(op.name, op.preset, op.duration ?? 1.2) ||
        null;
      if (!clip && host.THREE) {
        clip = buildProceduralClip(host.THREE, op.name, op.preset, op.duration ?? 1.2);
      }
      if (!clip) return "Could not create procedural clip (need THREE or host factory)";
      if (op.play !== false) {
        const mixer = host.getMixer?.();
        if (mixer) {
          const action = mixer.clipAction(clip);
          const THREE = host.THREE;
          if (THREE) action.loop = THREE.LoopOnce;
          action.clampWhenFinished = true;
          action.reset().fadeIn(0.15).play();
        } else if (host.playOneShot) {
          host.playOneShot(clip, { fade: 0.15 });
        }
      }
      return `Created procedural clip "${op.name}" (${op.preset})`;
    }
    case "set_weight": {
      const mixer = host.getMixer?.();
      const clip = host.resolveClip?.(op.slot);
      if (!mixer || !clip) return `No action for ${op.slot}`;
      mixer.clipAction(clip).setEffectiveWeight(op.weight);
      return `Weight ${op.slot}=${op.weight}`;
    }
    case "set_timescale": {
      const mixer = host.getMixer?.();
      const clip = host.resolveClip?.(op.slot);
      if (!mixer || !clip) return `No action for ${op.slot}`;
      mixer.clipAction(clip).setEffectiveTimeScale(op.timeScale);
      return `TimeScale ${op.slot}=${op.timeScale}`;
    }
    case "pause": {
      const mixer = host.getMixer?.();
      // Pause all known clips by listing
      const names = host.listClips?.() || [];
      if (mixer && names.length) {
        for (const n of names) {
          const c = host.resolveClip?.(n);
          if (c) mixer.clipAction(c).paused = op.paused;
        }
      }
      return op.paused ? "Paused" : "Unpaused";
    }
    case "reset_pose": {
      host.stopAll?.(0);
      host.getMixer?.()?.stopAllAction?.();
      const idle = host.resolveClip?.("idle");
      if (idle && host.getMixer?.()) {
        const a = host.getMixer()!.clipAction(idle);
        a.reset().setEffectiveWeight(1).play();
        a.timeScale = 0;
        // sample bind-ish: weight 1 time 0
        host.getMixer()!.update(0);
        a.timeScale = 1;
      }
      return "Pose reset toward idle";
    }
    default:
      return `Unknown op`;
  }
}

function playSlot(
  host: AnimWorkerHost,
  slot: string,
  opts: { loop?: boolean; fade?: number; timeScale?: number },
): string {
  if (host.playLoop && opts.loop !== false) {
    host.playLoop(slot, opts.fade);
    return `Play loop ${slot}`;
  }
  const mixer = host.getMixer?.();
  const clip = host.resolveClip?.(slot);
  if (!mixer || !clip) {
    // try oneshot path / director
    if (host.playOneShot) {
      host.playOneShot(slot, opts);
      return `Play (oneshot fallback) ${slot}`;
    }
    throw new Error(`No clip for slot "${slot}"`);
  }
  const action = mixer.clipAction(clip);
  if (host.THREE) {
    action.loop = opts.loop === false ? host.THREE.LoopOnce : host.THREE.LoopRepeat;
  }
  if (opts.timeScale != null) action.setEffectiveTimeScale(opts.timeScale);
  action.reset().fadeIn(opts.fade ?? 0.25).play();
  return `Play ${slot}`;
}

function oneShot(
  host: AnimWorkerHost,
  slot: string,
  fade: number,
  timeScale: number,
): string {
  if (host.playOneShot) {
    host.playOneShot(slot, { fade, timeScale });
    return `One-shot ${slot}`;
  }
  const mixer = host.getMixer?.();
  const clip = host.resolveClip?.(slot);
  if (!mixer || !clip) throw new Error(`No clip for oneshot "${slot}"`);
  const action = mixer.clipAction(clip);
  if (host.THREE) action.loop = host.THREE.LoopOnce;
  action.clampWhenFinished = true;
  action.setEffectiveTimeScale(timeScale);
  action.reset().fadeIn(fade).play();
  return `One-shot ${slot}`;
}

/** Simple root-level procedural tracks (works without a full skeleton) */
export function buildProceduralClip(
  THREE: NonNullable<AnimWorkerHost["THREE"]>,
  name: string,
  preset: ProceduralPreset,
  duration: number,
): ClipLike {
  const times = [0, duration / 2, duration];
  const tracks: unknown[] = [];

  switch (preset) {
    case "bounce": {
      tracks.push(
        new THREE.VectorKeyframeTrack(".position", times, [
          0, 0, 0, 0, 0.35, 0, 0, 0, 0,
        ]),
      );
      break;
    }
    case "spin": {
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
      const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 2, 0));
      tracks.push(
        new THREE.QuaternionKeyframeTrack(".quaternion", times, [
          q0.x, q0.y, q0.z, q0.w,
          q1.x, q1.y, q1.z, q1.w,
          q2.x, q2.y, q2.z, q2.w,
        ]),
      );
      break;
    }
    case "nod": {
      const e0 = new THREE.Euler(0, 0, 0);
      const e1 = new THREE.Euler(0.35, 0, 0);
      const q0 = new THREE.Quaternion().setFromEuler(e0);
      const q1 = new THREE.Quaternion().setFromEuler(e1);
      tracks.push(
        new THREE.QuaternionKeyframeTrack(".quaternion", times, [
          q0.x, q0.y, q0.z, q0.w,
          q1.x, q1.y, q1.z, q1.w,
          q0.x, q0.y, q0.z, q0.w,
        ]),
      );
      break;
    }
    case "look_left":
    case "look_right": {
      const sign = preset === "look_left" ? 1 : -1;
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sign * 0.6, 0));
      tracks.push(
        new THREE.QuaternionKeyframeTrack(".quaternion", times, [
          q0.x, q0.y, q0.z, q0.w,
          q1.x, q1.y, q1.z, q1.w,
          q0.x, q0.y, q0.z, q0.w,
        ]),
      );
      break;
    }
    case "wave":
    case "breathe":
    default: {
      // Subtle vertical breathe on root
      tracks.push(
        new THREE.VectorKeyframeTrack(".position", times, [
          0, 0, 0, 0, 0.04, 0, 0, 0, 0,
        ]),
      );
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
      const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.08));
      tracks.push(
        new THREE.QuaternionKeyframeTrack(".quaternion", times, [
          q0.x, q0.y, q0.z, q0.w,
          q1.x, q1.y, q1.z, q1.w,
          q0.x, q0.y, q0.z, q0.w,
        ]),
      );
      break;
    }
  }

  const clip = new THREE.AnimationClip(name, duration, tracks);
  clip.optimize?.();
  return clip;
}
