/**
 * MotionDeployService — reconstruct from 2–10s mocap brief, validate rigid body,
 * build THREE.AnimationClip, play on mixer, optional redeploy package.
 */
import * as THREE from "three";
import {
  reconstructMotionLocal,
  buildDeployManifest,
  motionToTrackDump,
  type MocapReconstructRequest,
  type ReconstructedMotion,
  type MotionDeployManifest,
  type ComboDef,
  buildComboFromMotions,
  resolveComboStep,
  DEFAULT_RIGID_BODY_ANIM_POLICY,
  MOCAP_PIPELINE_VERSION,
} from "@shared/animation/mocap";

const WORKER_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_ANIM_WORKER_URL) ||
  "https://anim-ai-worker.grudge.workers.dev";

export interface DeployPlayOpts {
  mixer: THREE.AnimationMixer;
  root?: THREE.Object3D;
  fade?: number;
  loop?: boolean;
  timeScale?: number;
}

export class MotionDeployService {
  readonly version = MOCAP_PIPELINE_VERSION;
  private lastMotion: ReconstructedMotion | null = null;
  private lastManifest: MotionDeployManifest | null = null;
  private clipCache = new Map<string, THREE.AnimationClip>();

  getLastMotion() {
    return this.lastMotion;
  }
  getLastManifest() {
    return this.lastManifest;
  }

  /**
   * Reconstruct motion: prefer worker AI, fallback to local templates.
   */
  async reconstruct(
    req: MocapReconstructRequest,
  ): Promise<ReconstructedMotion> {
    const allowFallback = req.allowTemplateFallback !== false;
    try {
      const res = await fetch(`${WORKER_BASE}/mocap/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.motion) {
          this.lastMotion = data.motion as ReconstructedMotion;
          if (data.deploy) this.lastManifest = data.deploy as MotionDeployManifest;
          return this.lastMotion;
        }
      }
    } catch (e) {
      console.warn("[MotionDeploy] worker reconstruct failed", e);
    }

    if (!allowFallback) {
      throw new Error("Mocap reconstruct failed and fallback disabled");
    }
    const motion = reconstructMotionLocal(req);
    this.lastMotion = motion;
    this.lastManifest = buildDeployManifest(motion, {
      pack: req.target.animPack || "mocap",
    });
    return motion;
  }

  /**
   * Screen recording path: 2–10s description (+ optional poses).
   */
  async fromScreenRecording(opts: {
    description: string;
    durationSec: number;
    intent?: "attack" | "combo" | "loco" | "dodge" | "cast" | "emote" | "misc";
    poses?: import("@shared/animation/mocap").MotionPoseFrame[];
    skeleton?: "mixamorig" | "bip001";
    slot?: string;
    fleetClipKey?: string;
  }): Promise<ReconstructedMotion> {
    const durationSec = Math.max(2, Math.min(10, opts.durationSec));
    return this.reconstruct({
      brief: {
        kind: "screen_recording",
        description: opts.description,
        durationSec,
        intent: opts.intent,
        poses: opts.poses,
      },
      target: {
        skeleton: opts.skeleton || "mixamorig",
        slot: opts.slot || opts.intent || "attack",
        fleetClipKey: opts.fleetClipKey,
        animPack: "mocap",
      },
      rigidBody: DEFAULT_RIGID_BODY_ANIM_POLICY,
      allowTemplateFallback: true,
    });
  }

  /**
   * Full video watch → track → mirror to mixamorig → validated motion (save-ready).
   * Uses MediaPipe pose tracking in the browser (no upload of raw video required).
   */
  async fromRecordedVideo(
    file: File | Blob,
    opts?: {
      sampleFps?: number;
      mirror?: boolean;
      maxDurationSec?: number;
      fleetClipKey?: string;
      name?: string;
      onProgress?: (p: {
        t: number;
        duration: number;
        frameIndex: number;
        totalFrames: number;
        hasPose: boolean;
      }) => void;
      signal?: AbortSignal;
    },
  ): Promise<ReconstructedMotion> {
    const { trackVideoFile } = await import("./videoMocap/VideoMocapTracker");
    const tracked = await trackVideoFile(file, {
      sampleFps: opts?.sampleFps ?? 12,
      mirror: opts?.mirror ?? false,
      maxDurationSec: opts?.maxDurationSec ?? 10,
      onProgress: opts?.onProgress,
      signal: opts?.signal,
    });

    const fleetClipKey =
      opts?.fleetClipKey ||
      `vidmocap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    // Prefer local reconstruct with real poses (worker may drop fidelity / timeout)
    const motion = reconstructMotionLocal({
      brief: {
        kind: "pose_sequence",
        description: opts?.name || (file instanceof File ? file.name : "recorded video"),
        durationSec: tracked.durationSec,
        poses: tracked.poses,
      },
      target: {
        skeleton: "mixamorig",
        slot: "special",
        fleetClipKey,
        animPack: "video_mocap",
      },
      rigidBody: DEFAULT_RIGID_BODY_ANIM_POLICY,
      allowTemplateFallback: false,
    });

    motion.source = "screen_recording";
    motion.confidence = Math.min(
      0.95,
      0.55 + tracked.poses.filter((p) => (p.confidence ?? 0) > 0.5).length / Math.max(1, tracked.poses.length) * 0.4,
    );
    motion.reply = `Tracked video ${tracked.durationSec.toFixed(1)}s → ${tracked.frameCount} poses @ ${tracked.sampleFps}fps${tracked.mirror ? " (mirrored)" : ""}`;

    this.lastMotion = motion;
    this.lastManifest = buildDeployManifest(motion, { pack: "video_mocap" });
    this.lastManifest = {
      ...this.lastManifest,
      status: motion.validation.ok ? "validated" : "rejected",
    };
    return motion;
  }

  /** Build THREE.AnimationClip (rotation-only tracks) */
  toAnimationClip(motion: ReconstructedMotion): THREE.AnimationClip {
    const cached = this.clipCache.get(motion.id);
    if (cached) return cached;

    const dump = motionToTrackDump(motion);
    const tracks: THREE.KeyframeTrack[] = dump.tracks.map(
      (t) =>
        new THREE.QuaternionKeyframeTrack(
          t.name,
          t.times,
          t.values,
        ),
    );
    const clip = new THREE.AnimationClip(
      motion.name || motion.id,
      dump.duration,
      tracks,
    );
    clip.optimize?.();
    this.clipCache.set(motion.id, clip);
    return clip;
  }

  /** Play reconstructed motion on a character mixer */
  play(motion: ReconstructedMotion, opts: DeployPlayOpts): THREE.AnimationAction {
    const clip = this.toAnimationClip(motion);
    const action = opts.mixer.clipAction(clip, opts.root);
    action.reset();
    action.setLoop(
      opts.loop ? THREE.LoopRepeat : THREE.LoopOnce,
      opts.loop ? Infinity : 1,
    );
    action.clampWhenFinished = !opts.loop;
    if (opts.timeScale != null) action.setEffectiveTimeScale(opts.timeScale);
    action.fadeIn(opts.fade ?? 0.15).play();
    return action;
  }

  /**
   * Full pass: reconstruct → validate → play → return deploy manifest for CDN bake.
   */
  async reconstructAndDeploy(
    req: MocapReconstructRequest,
    play?: DeployPlayOpts,
  ): Promise<{
    motion: ReconstructedMotion;
    manifest: MotionDeployManifest;
    action?: THREE.AnimationAction;
    clip?: THREE.AnimationClip;
  }> {
    const motion = await this.reconstruct(req);
    const manifest =
      this.lastManifest ||
      buildDeployManifest(motion, { pack: req.target.animPack || "mocap" });
    this.lastManifest = {
      ...manifest,
      status: motion.validation.ok ? "validated" : "rejected",
    };

    let action: THREE.AnimationAction | undefined;
    let clip: THREE.AnimationClip | undefined;
    if (play && motion.validation.ok) {
      clip = this.toAnimationClip(motion);
      action = this.play(motion, play);
      this.lastManifest = { ...this.lastManifest, status: "live" };
    }

    return { motion, manifest: this.lastManifest, action, clip };
  }

  /**
   * Redeploy: re-run reconstruct with same brief, mark redeployOf.
   */
  async redeploy(
    previous: ReconstructedMotion,
    req: MocapReconstructRequest,
    play?: DeployPlayOpts,
  ) {
    const result = await this.reconstructAndDeploy(req, play);
    result.manifest = {
      ...result.manifest,
      redeployOf: previous.id,
      status: result.motion.validation.ok ? "live" : "rejected",
    };
    this.lastManifest = result.manifest;
    return result;
  }

  /** Compile multi-motion combo def */
  compileCombo(
    id: string,
    label: string,
    motionIds: string[],
  ): ComboDef {
    return buildComboFromMotions(id, label, motionIds);
  }

  resolveComboStep = resolveComboStep;

  /**
   * Export bake-ready JSON (rotation-only, fleet shape).
   */
  toBakeJson(motion: ReconstructedMotion): object {
    const dump = motionToTrackDump(motion);
    return {
      name: motion.id,
      duration: dump.duration,
      skeleton: motion.skeleton,
      rootMotion: motion.rootMotion,
      tracks: dump.tracks.map((t) => ({
        type: "quaternion",
        name: t.name,
        times: t.times,
        values: t.values,
      })),
      meta: {
        source: motion.source,
        confidence: motion.confidence,
        pipeline: MOCAP_PIPELINE_VERSION,
        validation: motion.validation,
      },
    };
  }
}

let _svc: MotionDeployService | null = null;
export function getMotionDeployService(): MotionDeployService {
  if (!_svc) _svc = new MotionDeployService();
  return _svc;
}
