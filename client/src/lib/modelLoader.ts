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
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
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

// Wire DRACOLoader for Draco-compressed GLBs (from gltf-transform pipeline)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
loader.setDRACOLoader(dracoLoader);

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

  // SkeletonUtils.clone properly handles SkinnedMesh + skeleton bindings.
  // The plain Object3D.clone(true) breaks skeleton→bone references, causing
  // models to render as distorted white blobs.
  const scene = (SkeletonUtils as any).clone(gltf.scene) as THREE.Group;

  // Clone materials per-instance so tinting/metalness edits on one character
  // don't corrupt all other instances that share the cached GLTF.
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else {
          mesh.material = mesh.material.clone();
        }
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if ((mat as THREE.MeshStandardMaterial).metalness !== undefined) {
            (mat as THREE.MeshStandardMaterial).metalness = Math.min(
              (mat as THREE.MeshStandardMaterial).metalness, 0.6,
            );
          }
        });
      }
    }
  });

  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map<string, THREE.AnimationAction>();

  // Clone animation clips so Mixamo prefix stripping doesn't mutate the cache.
  const clonedClips: THREE.AnimationClip[] = [];
  for (const clip of gltf.animations) {
    const cloned = clip.clone();
    remapClipBoneNames(cloned);
    clonedClips.push(cloned);
    const action = mixer.clipAction(cloned, scene);
    actions.set(cloned.name, action);
  }

  return { scene, clips: clonedClips, mixer, actions };
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

  hasClip(stateName: string): boolean {
    return this.actions.has(stateName);
  }

  get loadedStates(): string[] {
    return Array.from(this.actions.keys());
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

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL MULTI-FORMAT PIPELINE
//
// Consolidated here so the deployed app ships ONE model-loading module.
// `loadModel` / `loadModelFromFile` import any common format and return a
// normalized THREE.Group:
//
//   glTF / GLB   — reuses the GLTFLoader + DRACO above (+ lazy KTX2, Meshopt)
//   FBX          — FBXLoader (with animations)
//   OBJ (+ MTL)  — OBJLoader
//   STL / PLY    — raw geometry → MeshStandardMaterial
//   DAE          — ColladaLoader
//   3MF          — ThreeMFLoader
//
// Non-glTF decoders are dynamically imported (code-split).
// ═══════════════════════════════════════════════════════════════════════════

export type ModelFormat =
  | "glb" | "gltf" | "fbx" | "obj" | "stl" | "ply" | "dae" | "3mf" | "unknown";

export const SUPPORTED_EXTENSIONS: readonly Exclude<ModelFormat, "unknown">[] = [
  "glb", "gltf", "fbx", "obj", "stl", "ply", "dae", "3mf",
] as const;

/** Comma-separated `accept` string for an <input type="file">. */
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",");

export interface LoadedAsset {
  object: THREE.Group;
  animations: THREE.AnimationClip[];
  format: ModelFormat;
  url: string;
}

export interface ModelStats {
  meshes: number;
  triangles: number;
  vertices: number;
  materials: number;
  textures: number;
  size: { x: number; y: number; z: number };
  boundingRadius: number;
  animations: number;
}

export interface LoadOptions {
  /** Companion .mtl URL for OBJ files (optional). */
  mtlUrl?: string;
  /** Progress callback (0–1 when computable). */
  onProgress?: (fraction: number) => void;
  /** Override the detected format (useful for blob: URLs without an extension). */
  formatHint?: ModelFormat;
}

/** Basis/KTX2 transcoder shipped with the pinned three version. */
const KTX2_TRANSCODER_PATH =
  "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/basis/";

let _renderer: THREE.WebGLRenderer | null = null;
let _meshoptReady = false;
let _ktx2Attached = false;

/** Provide the live renderer so KTX2 can pick a GPU transcode target. */
export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  _renderer = renderer;
}

/** Attach Meshopt + (if a renderer is set) KTX2 to the shared glTF loader. Idempotent. */
async function ensureGltfDecoders(): Promise<void> {
  if (!_meshoptReady) {
    const meshopt = await import("three/examples/jsm/libs/meshopt_decoder.module.js");
    loader.setMeshoptDecoder(meshopt.MeshoptDecoder);
    _meshoptReady = true;
  }
  if (_renderer && !_ktx2Attached) {
    const { KTX2Loader } = await import("three/examples/jsm/loaders/KTX2Loader.js");
    const ktx2 = new KTX2Loader().setTranscoderPath(KTX2_TRANSCODER_PATH);
    ktx2.detectSupport(_renderer);
    loader.setKTX2Loader(ktx2);
    _ktx2Attached = true;
  }
}

export function getExtension(url: string): string {
  const clean = url.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

export function detectFormat(url: string): ModelFormat {
  const ext = getExtension(url);
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as ModelFormat)
    : "unknown";
}

export function isSupported(url: string): boolean {
  return detectFormat(url) !== "unknown";
}

/** Ensure the loaded root is a Group so callers have a stable handle. */
function asGroup(object: THREE.Object3D): THREE.Group {
  if ((object as THREE.Group).isGroup) return object as THREE.Group;
  const group = new THREE.Group();
  group.name = object.name || "model";
  group.add(object);
  return group;
}

/** Wrap raw geometry (STL/PLY) in a mesh with a sensible default material. */
function geometryToGroup(geometry: THREE.BufferGeometry): THREE.Group {
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const material = new THREE.MeshStandardMaterial({
    color: 0xbfc4cc,
    metalness: 0.1,
    roughness: 0.55,
    flatShading: !geometry.getAttribute("normal"),
  });
  return asGroup(new THREE.Mesh(geometry, material));
}

function wrapProgress(onProgress?: (f: number) => void) {
  if (!onProgress) return undefined;
  return (event: ProgressEvent) => {
    if (event.lengthComputable && event.total > 0) {
      onProgress(Math.min(1, event.loaded / event.total));
    }
  };
}

async function loadGLTFAsset(url: string, opts: LoadOptions) {
  await ensureGltfDecoders();
  const gltf = await loader.loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(gltf.scene), animations: gltf.animations ?? [] };
}

async function loadFBXAsset(url: string, opts: LoadOptions) {
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  const obj = await new FBXLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(obj), animations: obj.animations ?? [] };
}

async function loadOBJAsset(url: string, opts: LoadOptions) {
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
  const objLoader = new OBJLoader();
  if (opts.mtlUrl) {
    const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
    const materials = await new MTLLoader().loadAsync(opts.mtlUrl);
    materials.preload();
    objLoader.setMaterials(materials);
  }
  const obj = await objLoader.loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(obj), animations: [] as THREE.AnimationClip[] };
}

async function loadSTLAsset(url: string, opts: LoadOptions) {
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const geometry = await new STLLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: geometryToGroup(geometry), animations: [] as THREE.AnimationClip[] };
}

async function loadPLYAsset(url: string, opts: LoadOptions) {
  const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");
  const geometry = await new PLYLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: geometryToGroup(geometry), animations: [] as THREE.AnimationClip[] };
}

async function loadDAEAsset(url: string, opts: LoadOptions) {
  const { ColladaLoader } = await import("three/examples/jsm/loaders/ColladaLoader.js");
  const collada = await new ColladaLoader().loadAsync(url, wrapProgress(opts.onProgress));
  const scene = collada.scene as unknown as THREE.Group;
  return { object: asGroup(scene), animations: (scene.animations ?? []) as THREE.AnimationClip[] };
}

async function load3MFAsset(url: string, opts: LoadOptions) {
  const { ThreeMFLoader } = await import("three/examples/jsm/loaders/3MFLoader.js");
  const obj = await new ThreeMFLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(obj), animations: [] as THREE.AnimationClip[] };
}

/**
 * Load any supported 3D format from a URL (including `blob:`/object URLs).
 * Returns a normalized-ready Group plus any embedded animation clips.
 */
export async function loadModel(url: string, opts: LoadOptions = {}): Promise<LoadedAsset> {
  const format = opts.formatHint ?? detectFormat(url);
  let result: Omit<LoadedAsset, "format" | "url">;
  switch (format) {
    case "glb":
    case "gltf": result = await loadGLTFAsset(url, opts); break;
    case "fbx": result = await loadFBXAsset(url, opts); break;
    case "obj": result = await loadOBJAsset(url, opts); break;
    case "stl": result = await loadSTLAsset(url, opts); break;
    case "ply": result = await loadPLYAsset(url, opts); break;
    case "dae": result = await loadDAEAsset(url, opts); break;
    case "3mf": result = await load3MFAsset(url, opts); break;
    default:
      throw new Error(
        `Unsupported model format "${format}" for ${url}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`,
      );
  }
  return { ...result, format, url };
}

/**
 * Load a model from a dropped/selected File. Uses the file name for format
 * detection and an object URL for transfer, revoking it once parsed.
 */
export async function loadModelFromFile(file: File, opts: LoadOptions = {}): Promise<LoadedAsset> {
  const format = detectFormat(file.name);
  if (format === "unknown") {
    throw new Error(`Unsupported file "${file.name}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const asset = await loadModel(url, { ...opts, formatHint: format });
    return { ...asset, url: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface NormalizeOptions {
  /** Largest bounding-box dimension after scaling (world units). Default 2.5. */
  targetSize?: number;
  /** Drop the model so its base sits on y = 0. Default true. */
  grounded?: boolean;
  /** Enable shadow casting/receiving on meshes. Default true. */
  shadows?: boolean;
}

export interface NormalizeResult {
  scale: number;
  center: THREE.Vector3;
  size: THREE.Vector3;
}

/**
 * Recenter, uniformly scale-to-fit, ground, shadow-enable, and color-correct a
 * freshly loaded model so every format renders with a consistent footprint.
 */
export function normalizeModel(object: THREE.Object3D, opts: NormalizeOptions = {}): NormalizeResult {
  const { targetSize = 2.5, grounded = true, shadows = true } = opts;
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  object.position.sub(center);
  object.scale.setScalar(scale);
  if (grounded) object.position.y += (size.y / 2) * scale;
  if (shadows) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        markColorTexturesSRGB(mesh);
      }
    });
  }
  return { scale, center, size };
}

/** Tag base-color / emissive textures as sRGB (formats other than glTF miss this). */
function markColorTexturesSRGB(mesh: THREE.Mesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of materials) {
    if (!mat) continue;
    const std = mat as THREE.MeshStandardMaterial;
    for (const key of ["map", "emissiveMap"] as const) {
      const tex = std[key] as THREE.Texture | null | undefined;
      if (tex && tex.colorSpace !== THREE.SRGBColorSpace) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      }
    }
    mat.needsUpdate = true;
  }
}

function trianglesOf(geometry: THREE.BufferGeometry): number {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  if (!position) return 0;
  return Math.floor((index ? index.count : position.count) / 3);
}

/** Walk a model and summarize mesh/material/texture/triangle counts + bounds. */
export function getModelStats(object: THREE.Object3D, animations: THREE.AnimationClip[] = []): ModelStats {
  let meshes = 0;
  let triangles = 0;
  let vertices = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    meshes++;
    triangles += trianglesOf(mesh.geometry);
    const pos = mesh.geometry.getAttribute("position");
    if (pos) vertices += pos.count;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      materials.add(mat);
      for (const value of Object.values(mat)) {
        if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
      }
    }
  });
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    meshes,
    triangles,
    vertices,
    materials: materials.size,
    textures: textures.size,
    size: { x: size.x, y: size.y, z: size.z },
    boundingRadius: size.length() / 2,
    animations: animations.length,
  };
}

/** Recursively dispose geometries, materials, and their textures (GPU cleanup). */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) disposeMaterial(mat);
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
  }
  material.dispose();
}
