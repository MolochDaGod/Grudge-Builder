/**
 * Model Loader — GLTF/GLB loading, animation caching, mixer management
 *
 * Follows the annihilate engine patterns:
 *   - fadeToAction() for smooth animation blending
 *   - Animation clip caching to avoid re-downloads
 *   - AnimationMixer per character with clip name → action mapping
 *
 * SKELETON COMPATIBILITY:
 *   Character models use bare Mixamo bone names ("Hips", "Spine", etc.)
 *   Animation GLBs use prefixed names ("mixamorig:Hips", "mixamorig5:Hips")
 *   The loader automatically remaps animation track names to match the
 *   target character skeleton at load time, so any Mixamo-rigged character
 *   can play any Mixamo animation regardless of prefix conventions.
 *
 * Three.js GLTFLoader is used (already a project dependency via tower-wars).
 */

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveModelUrl } from "@/lib/modelManifest";

// ── Skeleton bone-name remapping ─────────────────────────────────────────────
//
// Mixamo exports use various prefixes: "mixamorig:", "mixamorig1:", "mixamorig5:"
// Our character models have bare bone names ("Hips", "LeftFoot", etc.)
// We strip all Mixamo prefixes from animation tracks so they match the target.

/** Known Mixamo bone-name prefixes (order matters — longest first) */
const MIXAMO_PREFIXES = [
  "mixamorig10:",
  "mixamorig9:",
  "mixamorig8:",
  "mixamorig7:",
  "mixamorig6:",
  "mixamorig5:",
  "mixamorig4:",
  "mixamorig3:",
  "mixamorig2:",
  "mixamorig1:",
  "mixamorig:",
];

/**
 * Strip any Mixamo prefix from a bone name.
 * "mixamorig:Hips" → "Hips"
 * "mixamorig5:LeftFoot" → "LeftFoot"
 * "Hips" → "Hips" (no-op if already bare)
 */
function stripMixamoPrefix(boneName: string): string {
  for (const prefix of MIXAMO_PREFIXES) {
    if (boneName.startsWith(prefix)) {
      return boneName.slice(prefix.length);
    }
  }
  return boneName;
}

/**
 * Remap all track names in an AnimationClip to use bare bone names.
 * Track names are formatted as "boneName.property" (e.g. "mixamorig:Hips.position").
 * This mutates the clip in place for efficiency.
 */
function remapClipBoneNames(clip: THREE.AnimationClip): THREE.AnimationClip {
  for (const track of clip.tracks) {
    // Track name format: "boneName.property" or "boneName[index].property"
    const dotIdx = track.name.indexOf(".");
    if (dotIdx === -1) continue;

    const boneName = track.name.substring(0, dotIdx);
    const property = track.name.substring(dotIdx);
    const stripped = stripMixamoPrefix(boneName);

    if (stripped !== boneName) {
      track.name = stripped + property;
    }
  }
  return clip;
}

/**
 * Build a bone-name map from a loaded character scene.
 * Returns the set of bone names present on the target mesh.
 */
function collectBoneNames(root: THREE.Object3D): Set<string> {
  const names = new Set<string>();
  root.traverse((node) => {
    if (node.name) names.add(node.name);
  });
  return names;
}

// ── Cache ────────────────────────────────────────────────────────────────────

const gltfCache = new Map<string, GLTF>();
const clipCache = new Map<string, THREE.AnimationClip>();
const loader = new GLTFLoader();

// ── Load a full GLTF model (mesh + embedded animations) ─────────────────────

export interface LoadedModel {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
}

export async function loadCharacterModel(path: string): Promise<LoadedModel> {
  const url = resolveModelUrl(path);
  let gltf = gltfCache.get(url);

  if (!gltf) {
    gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
    gltfCache.set(url, gltf);
  }

  // Clone the scene so multiple characters can use the same model
  const scene = gltf.scene.clone(true);

  // Enable shadows on all meshes
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      // Ensure materials render correctly
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if ((mat as THREE.MeshStandardMaterial).metalness !== undefined) {
            // Clamp metalness for better look under basic lighting
            (mat as THREE.MeshStandardMaterial).metalness = Math.min(
              (mat as THREE.MeshStandardMaterial).metalness,
              0.6
            );
          }
        });
      }
    }
  });

  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map<string, THREE.AnimationAction>();

  // Register embedded animation clips (remap bone names for consistency)
  const remappedClips: THREE.AnimationClip[] = [];
  for (const clip of gltf.animations) {
    remapClipBoneNames(clip);
    remappedClips.push(clip);
    const action = mixer.clipAction(clip, scene);
    actions.set(clip.name, action);
  }

  return { scene, clips: remappedClips, mixer, actions };
}

// ── Load a standalone animation GLB (extract clip only) ─────────────────────

export async function loadAnimationClip(path: string): Promise<THREE.AnimationClip | null> {
  const url = resolveModelUrl(path);

  const cached = clipCache.get(url);
  if (cached) return cached;

  try {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    if (gltf.animations.length === 0) {
      console.warn(`No animations in ${path}`);
      return null;
    }

    const clip = remapClipBoneNames(gltf.animations[0]);
    clipCache.set(url, clip);
    return clip;
  } catch (err) {
    console.warn(`Failed to load animation: ${path}`, err);
    return null;
  }
}

// ── Apply an external animation clip to an existing mixer ───────────────────

export function applyAnimationToMixer(
  mixer: THREE.AnimationMixer,
  root: THREE.Object3D,
  clip: THREE.AnimationClip,
  name: string,
): THREE.AnimationAction {
  // Rename clip so we can reference it by our state name
  clip.name = name;
  const action = mixer.clipAction(clip, root);
  return action;
}

// ── fadeToAction — smooth animation blending (annihilate pattern) ────────────

/**
 * Crossfade from the current action to a new action.
 * If duration is 0, hard-switches instantly.
 *
 * @param currentAction The currently playing action (may be null on first call)
 * @param nextAction The action to transition to
 * @param duration Crossfade duration in seconds (default 0.15)
 * @param loop Whether the next action should loop
 * @param speed Time scale for the next action (default 1)
 * @returns The new active action
 */
export function fadeToAction(
  currentAction: THREE.AnimationAction | null,
  nextAction: THREE.AnimationAction,
  duration: number = 0.15,
  loop: boolean = true,
  speed: number = 1,
): THREE.AnimationAction {
  nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  nextAction.clampWhenFinished = !loop;
  nextAction.timeScale = speed;

  if (currentAction && currentAction !== nextAction) {
    if (duration > 0) {
      nextAction.reset().play();
      currentAction.crossFadeTo(nextAction, duration, true);
    } else {
      currentAction.stop();
      nextAction.reset().play();
    }
  } else {
    nextAction.reset().play();
  }

  return nextAction;
}

// ── AnimationController — manages animation state for one character ──────────

export class AnimationController {
  mixer: THREE.AnimationMixer;
  root: THREE.Object3D;
  actions: Map<string, THREE.AnimationAction> = new Map();
  currentAction: THREE.AnimationAction | null = null;
  currentState: string = "";

  private onFinishCallback: (() => void) | null = null;

  constructor(mixer: THREE.AnimationMixer, root: THREE.Object3D) {
    this.mixer = mixer;
    this.root = root;

    // Listen for animation finished events (one-shot animations)
    this.mixer.addEventListener("finished", () => {
      this.onFinishCallback?.();
    });
  }

  /** Register a clip under a state name */
  registerClip(name: string, clip: THREE.AnimationClip): void {
    const action = applyAnimationToMixer(this.mixer, this.root, clip, name);
    this.actions.set(name, action);
  }

  /** Play a named animation state with crossfade */
  play(
    stateName: string,
    opts?: { fadeDuration?: number; speed?: number; loop?: boolean; onFinish?: () => void },
  ): boolean {
    const action = this.actions.get(stateName);
    if (!action) {
      console.warn(`Animation state "${stateName}" not registered`);
      return false;
    }

    if (this.currentState === stateName && this.currentAction?.isRunning()) {
      return true; // Already playing
    }

    const loop = opts?.loop ?? true;
    const speed = opts?.speed ?? 1;
    const fadeDuration = opts?.fadeDuration ?? 0.15;

    this.onFinishCallback = opts?.onFinish ?? null;
    this.currentAction = fadeToAction(this.currentAction, action, fadeDuration, loop, speed);
    this.currentState = stateName;
    return true;
  }

  /** Stop all animations */
  stop(): void {
    this.mixer.stopAllAction();
    this.currentAction = null;
    this.currentState = "";
  }

  /** Update the mixer (call every frame with delta time) */
  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** Check if current animation has finished (for one-shot anims) */
  isFinished(): boolean {
    if (!this.currentAction) return true;
    return !this.currentAction.isRunning();
  }

  dispose(): void {
    this.stop();
    this.actions.clear();
  }
}

// ── Preload utility ─────────────────────────────────────────────────────────

/**
 * Preload a set of animation clips and register them on a controller.
 * Loads in parallel for speed.
 */
export async function preloadAnimations(
  controller: AnimationController,
  animMap: Record<string, string>, // stateName → GLB path
): Promise<void> {
  const entries = Object.entries(animMap);
  const results = await Promise.allSettled(
    entries.map(([name, path]) => loadAnimationClip(path).then((clip) => ({ name, clip }))),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.clip) {
      controller.registerClip(result.value.name, result.value.clip);
    }
  }
}

// ── Cache management ────────────────────────────────────────────────────────

export function clearModelCache(): void {
  gltfCache.clear();
  clipCache.clear();
}

export function getModelCacheSize(): number {
  return gltfCache.size + clipCache.size;
}
