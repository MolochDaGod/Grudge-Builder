/**
 * modelKit — universal 3D asset pipeline for the Grudge Studio Forge.
 *
 * One entry point (`loadModel`) that imports any common DCC/web format and
 * returns a normalized THREE.Group ready to drop into a scene:
 *
 *   glTF / GLB   — GLTFLoader  (+ DRACO geometry, KTX2/Basis textures, Meshopt)
 *   FBX          — FBXLoader   (Mixamo / Maya / Blender exports, with animations)
 *   OBJ (+ MTL)  — OBJLoader   (optional companion .mtl for materials)
 *   STL          — STLLoader   (3D-print / CAD meshes → MeshStandardMaterial)
 *   PLY          — PLYLoader   (scanned / point-derived meshes)
 *   DAE          — ColladaLoader
 *   3MF          — ThreeMFLoader
 *
 * Best-practice decisions baked in:
 *   - Loader modules are loaded on demand (`import()`), so the format decoders
 *     are code-split and never ship in the main bundle.
 *   - glTF gets DRACO + KTX2 + Meshopt decoders wired up — the standard trio
 *     produced by the `gltf-transform` / `gltfpack` optimization pipeline.
 *   - KTX2 needs the live WebGLRenderer to pick a GPU transcode target, so
 *     call `configureRenderer(gl)` once (the OpeningScene does this on create).
 *   - `normalizeModel` recenters, grounds, uniformly scales-to-fit, enables
 *     shadows, and tags color textures as sRGB so every format renders with a
 *     consistent footprint and correct color.
 *   - `disposeObject` frees geometries, materials, and textures to avoid the
 *     GPU-memory leaks that are easy to hit when swapping models in a viewer.
 *
 * Mirrors the import conventions already used by `modelLoader.ts`
 * (`three/examples/jsm/loaders/*.js`).
 */

import * as THREE from "three";

// ── Formats ──────────────────────────────────────────────────────────────────

export type ModelFormat =
  | "glb"
  | "gltf"
  | "fbx"
  | "obj"
  | "stl"
  | "ply"
  | "dae"
  | "3mf"
  | "unknown";

/** Extensions the pipeline can import (lower-case, no leading dot). */
export const SUPPORTED_EXTENSIONS: readonly Exclude<ModelFormat, "unknown">[] = [
  "glb",
  "gltf",
  "fbx",
  "obj",
  "stl",
  "ply",
  "dae",
  "3mf",
] as const;

/** Comma-separated `accept` string for an <input type="file">. */
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",");

export interface LoadedAsset {
  /** Always a Group so callers have a single, stable root to add/remove. */
  object: THREE.Group;
  /** Embedded animation clips (FBX/glTF/Collada). Empty for OBJ/STL/PLY. */
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
  /** Bounding-box dimensions (world units, after normalization). */
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

// ── Decoder configuration ────────────────────────────────────────────────────

/** Matches the DRACO decoder version already pinned in `modelLoader.ts`. */
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
/** Basis/KTX2 transcoder shipped with the pinned three version. */
const KTX2_TRANSCODER_PATH =
  "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/basis/";

let _renderer: THREE.WebGLRenderer | null = null;

/**
 * Provide the live renderer so the KTX2 loader can detect the best supported
 * GPU texture format. Call once after the WebGLRenderer exists.
 */
export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  _renderer = renderer;
}

// ── Extension / format detection ──────────────────────────────────────────────

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

// ── glTF loader (DRACO + KTX2 + Meshopt) ──────────────────────────────────────

let _gltfLoaderPromise: Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader> | null =
  null;

async function getGLTFLoader() {
  if (!_gltfLoaderPromise) {
    _gltfLoaderPromise = (async () => {
      const [{ GLTFLoader }, { DRACOLoader }, { KTX2Loader }, meshopt] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/loaders/DRACOLoader.js"),
        import("three/examples/jsm/loaders/KTX2Loader.js"),
        import("three/examples/jsm/libs/meshopt_decoder.module.js"),
      ]);

      const loader = new GLTFLoader();

      const draco = new DRACOLoader();
      draco.setDecoderPath(DRACO_DECODER_PATH);
      loader.setDRACOLoader(draco);

      // KTX2 / Basis-compressed textures need a GPU target from the renderer.
      if (_renderer) {
        const ktx2 = new KTX2Loader();
        ktx2.setTranscoderPath(KTX2_TRANSCODER_PATH);
        ktx2.detectSupport(_renderer);
        loader.setKTX2Loader(ktx2);
      }

      // Meshopt-compressed buffers (gltfpack output).
      loader.setMeshoptDecoder(meshopt.MeshoptDecoder);

      return loader;
    })();
  }
  return _gltfLoaderPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const mesh = new THREE.Mesh(geometry, material);
  return asGroup(mesh);
}

function wrapProgress(onProgress?: (f: number) => void) {
  if (!onProgress) return undefined;
  return (event: ProgressEvent) => {
    if (event.lengthComputable && event.total > 0) {
      onProgress(Math.min(1, event.loaded / event.total));
    }
  };
}

// ── Loaders by format ──────────────────────────────────────────────────────────

async function loadGLTF(url: string, opts: LoadOptions): Promise<Omit<LoadedAsset, "format" | "url">> {
  const loader = await getGLTFLoader();
  const gltf = await loader.loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(gltf.scene), animations: gltf.animations ?? [] };
}

async function loadFBX(url: string, opts: LoadOptions) {
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  const obj = await new FBXLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(obj), animations: obj.animations ?? [] };
}

async function loadOBJ(url: string, opts: LoadOptions) {
  const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
  const loader = new OBJLoader();
  if (opts.mtlUrl) {
    const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
    const materials = await new MTLLoader().loadAsync(opts.mtlUrl);
    materials.preload();
    loader.setMaterials(materials);
  }
  const obj = await loader.loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(obj), animations: [] as THREE.AnimationClip[] };
}

async function loadSTL(url: string, opts: LoadOptions) {
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const geometry = await new STLLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: geometryToGroup(geometry), animations: [] as THREE.AnimationClip[] };
}

async function loadPLY(url: string, opts: LoadOptions) {
  const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");
  const geometry = await new PLYLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: geometryToGroup(geometry), animations: [] as THREE.AnimationClip[] };
}

async function loadDAE(url: string, opts: LoadOptions) {
  const { ColladaLoader } = await import("three/examples/jsm/loaders/ColladaLoader.js");
  const collada = await new ColladaLoader().loadAsync(url, wrapProgress(opts.onProgress));
  const scene = collada.scene as unknown as THREE.Group;
  return { object: asGroup(scene), animations: (scene.animations ?? []) as THREE.AnimationClip[] };
}

async function load3MF(url: string, opts: LoadOptions) {
  const { ThreeMFLoader } = await import("three/examples/jsm/loaders/3MFLoader.js");
  const obj = await new ThreeMFLoader().loadAsync(url, wrapProgress(opts.onProgress));
  return { object: asGroup(obj), animations: [] as THREE.AnimationClip[] };
}

// ── Public: load any model ─────────────────────────────────────────────────────

/**
 * Load any supported 3D format from a URL (including `blob:`/object URLs).
 * Returns a normalized-ready Group plus any embedded animation clips.
 */
export async function loadModel(url: string, opts: LoadOptions = {}): Promise<LoadedAsset> {
  const format = opts.formatHint ?? detectFormat(url);

  let result: Omit<LoadedAsset, "format" | "url">;
  switch (format) {
    case "glb":
    case "gltf":
      result = await loadGLTF(url, opts);
      break;
    case "fbx":
      result = await loadFBX(url, opts);
      break;
    case "obj":
      result = await loadOBJ(url, opts);
      break;
    case "stl":
      result = await loadSTL(url, opts);
      break;
    case "ply":
      result = await loadPLY(url, opts);
      break;
    case "dae":
      result = await loadDAE(url, opts);
      break;
    case "3mf":
      result = await load3MF(url, opts);
      break;
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
    throw new Error(
      `Unsupported file "${file.name}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    );
  }
  const url = URL.createObjectURL(file);
  try {
    const asset = await loadModel(url, { ...opts, formatHint: format });
    return { ...asset, url: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Normalization ───────────────────────────────────────────────────────────

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

  // Measure before transforming.
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  // Recenter on origin, then apply uniform scale.
  object.position.sub(center);
  object.scale.setScalar(scale);

  if (grounded) {
    // After centering+scaling, the base sits at -size.y/2 * scale.
    object.position.y += (size.y / 2) * scale;
  }

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

// ── Stats ──────────────────────────────────────────────────────────────────────

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

// ── Disposal ───────────────────────────────────────────────────────────────────

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
