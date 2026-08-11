/**
 * Motion capture · combo · rigid-body safety · deploy types
 *
 * Pipeline: screen recording (2–10s) → motion notes / pose frames →
 * AI reconstruct on target skeleton → rigid-body validate → bake → redeploy.
 */

/** Supported skeleton families for retarget / deploy */
export type SkeletonFamily = "mixamorig" | "bip001" | "toon" | "generic";

/** Source of motion for AI reconstruction */
export type MotionSourceKind =
  | "screen_recording" // 2–10s capture of real motion / animation
  | "reference_clip" // existing baked JSON / GLB clip
  | "nl_description" // plain language of the motion
  | "pose_sequence" // explicit keyframe poses (from vision or manual)
  | "combo_chain"; // multi-hit authored chain

/** How root motion interacts with physics / CCT */
export type RootMotionMode =
  | "none" // pure in-place; controller owns XZ
  | "hips_xz_delta" // extract XZ deltas from hips, apply to controller
  | "hips_full" // rare — only props / cutscenes
  | "baked_locked"; // Y-hip locked, no position tracks (fleet default)

/** One keyframe in a mocap or reconstructed clip */
export interface MotionPoseFrame {
  /** Time in seconds from clip start */
  t: number;
  /** Duration of this frame until next (optional; derived from t if missing) */
  duration?: number;
  /**
   * Local bone rotations xyzw. Keys must match target skeleton family.
   * Prefer rotation-only — position on bones breaks skinned meshes.
   */
  pose: Record<string, [number, number, number, number]>;
  /** Optional root translation [x,y,z] — gameplay root, not skinned bone position */
  root?: [number, number, number];
  /** Phase tag for combos / VFX beats */
  phase?: "windup" | "active" | "recovery" | "transition" | "idle";
  /** Confidence 0–1 when from vision / AI */
  confidence?: number;
}

/** 2–10s screen recording ingest brief */
export interface ScreenRecordingMotionBrief {
  kind: "screen_recording";
  /** Human description of what happens in the video */
  description: string;
  /** Clip length seconds — clamp 2..10 for this pipeline */
  durationSec: number;
  /** Optional sample rate used when extracting frames client-side */
  sampleFps?: number;
  /**
   * Optional sparse poses from client vision / manual mark-up.
   * If empty, AI reconstructs from description alone.
   */
  poses?: MotionPoseFrame[];
  /** Optional base64 JPEG keyframes (first/mid/last) for vision models */
  keyframeImages?: string[];
  /** Semantic intent */
  intent?: "attack" | "combo" | "loco" | "dodge" | "cast" | "emote" | "misc";
  weaponHint?: string;
  sourceUrl?: string;
  notes?: string;
}

/** Combo step — one clip in a multi-hit chain */
export interface ComboStepDef {
  id: string;
  /** Fleet clip key or slot */
  clipKey: string;
  /** Playback slot when mapped to AnimationManager */
  bodySlot?: string;
  durationSec?: number;
  /** Input window after previous step (sec) to continue chain */
  linkWindowSec?: number;
  cancelWindowSec?: number;
  /** Root motion impulse for this hit */
  rootImpulse?: { x?: number; y?: number; z?: number };
  /** VFX / move-language emits at local times */
  beats?: Array<{ at: number; emit: string; primary?: boolean }>;
  phase?: { windup: number; active: number; recovery: number };
  weight?: "light" | "medium" | "heavy";
  sourceArt?: string[];
}

/** Full combo definition (weapon skill multi-hit) */
export interface ComboDef {
  id: string;
  label: string;
  weaponType?: string;
  animPack?: string;
  steps: ComboStepDef[];
  /** Max chain length (default steps.length) */
  maxChain?: number;
  /** If true, wraps last → first for infinite practice */
  loopPractice?: boolean;
  rigidBody: RigidBodyAnimPolicy;
  version: string;
}

/**
 * Rules so skinned mesh + Rapier character body do not break.
 * Physics owns world transform; clip owns local bone quats.
 */
export interface RigidBodyAnimPolicy {
  /** Never write bone.position tracks (except optional hips under policy) */
  rotationOnlyBones: boolean;
  /** Lock scale tracks to 1,1,1 */
  lockScale: boolean;
  rootMotion: RootMotionMode;
  /** Max |quat| drift / frame before reject */
  maxAngularStepRad?: number;
  /** Reject if bone missing from skeleton */
  requireAllKeysPresent?: boolean;
  /** Feet plant: re-ground after sample */
  reGroundFeet: boolean;
  /** center XZ on pelvis, not full AABB */
  centerXZOnPelvis: boolean;
  /** SI human height fit before anim */
  humanHeightM: number;
  /** Rapier role for character while anim plays */
  physicsRole: "kinematic_player" | "dynamic_prop" | "none";
  notes: string[];
}

export const DEFAULT_RIGID_BODY_ANIM_POLICY: RigidBodyAnimPolicy = {
  rotationOnlyBones: true,
  lockScale: true,
  rootMotion: "baked_locked",
  maxAngularStepRad: 1.2,
  requireAllKeysPresent: false,
  reGroundFeet: true,
  centerXZOnPelvis: true,
  humanHeightM: 1.8,
  physicsRole: "kinematic_player",
  notes: [
    "Controller/CCT owns world XZ translation",
    "Strip hip/bone position tracks from baked packs",
    "SkeletonUtils.clone per instance — never Object3D.clone for skins",
    "One AnimationMixer per instance",
    "Sample once after load then re-ground feet",
  ],
};

/** Target for AI reconstruct + deploy */
export interface MotionTargetSpec {
  skeleton: SkeletonFamily;
  /** Semantic slot (attack, walk, …) or free name */
  slot: string;
  fleetClipKey?: string;
  animPack?: string;
  weaponType?: string;
  loop?: boolean;
  timeScale?: number;
}

/** Result of rigid-body / skeleton validation */
export interface MotionValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Auto-fixed clip if sanitizer ran */
  sanitized?: boolean;
}

/** Reconstructed motion ready for THREE.AnimationClip / grudox / bake */
export interface ReconstructedMotion {
  id: string;
  name: string;
  skeleton: SkeletonFamily;
  durationSec: number;
  frames: MotionPoseFrame[];
  bones: string[];
  rootMotion: RootMotionMode;
  source: MotionSourceKind;
  confidence: number;
  validation: MotionValidationResult;
  /** Grudox / anim-ai worker clip shape */
  workerClip: {
    bones: string[];
    frames: Array<{
      duration: number;
      pose: Record<string, number[]>;
      root?: number[];
    }>;
  };
  reply: string;
  model?: string;
}

/** Deploy package for CDN / public/anims/baked / runtime mixer */
export interface MotionDeployManifest {
  version: string;
  motionId: string;
  fleetClipKey: string;
  skeleton: SkeletonFamily;
  pack: string;
  /** Relative path under /anims/baked/ */
  bakedRel?: string;
  /** CDN URL after upload */
  cdnUrl?: string;
  comboId?: string;
  comboStepIndex?: number;
  rigidBody: RigidBodyAnimPolicy;
  validation: MotionValidationResult;
  deployAt: string;
  redeployOf?: string;
  status: "draft" | "validated" | "baked" | "live" | "rejected";
}

/** AI system request for mocap reconstruct */
export interface MocapReconstructRequest {
  brief: ScreenRecordingMotionBrief | {
    kind: "nl_description" | "pose_sequence" | "reference_clip";
    description?: string;
    durationSec?: number;
    poses?: MotionPoseFrame[];
    referenceClipKey?: string;
  };
  target: MotionTargetSpec;
  rigidBody?: Partial<RigidBodyAnimPolicy>;
  /** If true, force deterministic template when AI fails */
  allowTemplateFallback?: boolean;
}

export interface MocapReconstructResponse {
  ok: boolean;
  motion?: ReconstructedMotion;
  deploy?: MotionDeployManifest;
  error?: string;
}
