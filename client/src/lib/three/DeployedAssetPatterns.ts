/**
 * Deployed world-asset patterns adapted from threejs-games demos
 * (castles + texture, birds, putOnSolids, RPG/survival scene boot).
 *
 * SSOT doc: docs/THREEJS_GAMES_DEPLOYED_ASSETS.md
 *
 * Rules:
 *  - 1 unit = 1 m
 *  - Never fit castles/props to human 1.8 m — use WORLD_PROP_HEIGHT_BANDS
 *  - Texture override is for FBX/GLB with missing maps (concrete/stone atlas)
 *  - plantOnSolids raycasts down onto terrain/buildings
 *  - Flyers use mixers; do not placeFeetOnTerrain
 */
import * as THREE from "three";
import {
  fitMeshHeightToMeters,
  WORLD_PROP_HEIGHT_BANDS,
  type WorldPropKind,
} from "@/island3d/zoneWorldScale";
import { loadAndCloneGltf, type LoadPriority } from "./SharedGltfPipeline";

const _down = new THREE.Vector3(0, -1, 0);
const _origin = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();

/** Height of an object in world units after current scale. */
export function objectHeightM(obj: THREE.Object3D): number {
  obj.updateMatrixWorld(true);
  _box.setFromObject(obj);
  return Math.max(0, _box.max.y - _box.min.y);
}

/**
 * Uniform scale so object height ≈ targetHeightM (threejs-games `size` param).
 * Use WORLD_PROP_HEIGHT_BANDS for buildings — never 1.8 for castles.
 */
export function fitObjectToHeightM(
  obj: THREE.Object3D,
  targetHeightM: number,
): number {
  const h = objectHeightM(obj);
  const s = fitMeshHeightToMeters(h, targetHeightM);
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);
  return s;
}

/** Fit using a named prop band (fortress / building / tower / …). */
export function fitObjectToPropBand(
  obj: THREE.Object3D,
  kind: WorldPropKind,
  target: "min" | "default" | "max" = "default",
): number {
  const band = WORLD_PROP_HEIGHT_BANDS[kind];
  const h =
    target === "min" ? band.min : target === "max" ? band.max : band.default;
  return fitObjectToHeightM(obj, h);
}

/**
 * Rebind all meshes to a shared texture (castle concrete atlas pattern).
 * When `map` is null, only fixes missing normals.
 */
export async function applyTextureOverride(
  root: THREE.Object3D,
  textureUrl: string | null,
  opts?: { color?: number; roughness?: number; metalness?: number },
): Promise<void> {
  let map: THREE.Texture | null = null;
  if (textureUrl) {
    const loader = new THREE.TextureLoader();
    map = await loader.loadAsync(textureUrl);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
  }
  const color = opts?.color ?? 0xffffff;
  const roughness = opts?.roughness ?? 0.85;
  const metalness = opts?.metalness ?? 0.05;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (!mesh.geometry.getAttribute("normal")) {
      mesh.geometry.computeVertexNormals();
    }
    if (map) {
      const mat = new THREE.MeshStandardMaterial({
        map,
        color,
        roughness,
        metalness,
      });
      mesh.material = mat;
    }
  });
}

/**
 * threejs-games `putOnSolids` — plant object so its lowest point sits on
 * the first downward hit of `solids` (terrain, buildings).
 */
export function plantOnSolids(
  obj: THREE.Object3D,
  solids: THREE.Object3D | THREE.Object3D[],
  adjustment = 0,
): number {
  obj.updateMatrixWorld(true);
  _box.setFromObject(obj);
  const footLocal = _box.min.y;
  _origin.set(obj.position.x, obj.position.y + 200, obj.position.z);
  _ray.set(_origin, _down);
  _ray.far = 400;
  const targets = Array.isArray(solids) ? solids : [solids];
  const hits = _ray.intersectObjects(targets, true).filter((h) => {
    const n = h.face?.normal;
    return !n || n.y > 0.2;
  });
  if (!hits.length) return obj.position.y;
  const groundY = hits[0]!.point.y;
  // After scale, keep base on ground: world min.y = groundY + adjustment
  const lift = groundY + adjustment - footLocal;
  obj.position.y += lift;
  return obj.position.y;
}

export type DeployedLoadOpts = {
  url: string;
  /** Target height metres (castle fortress often 40–50). */
  targetHeightM?: number;
  /** Or use a prop band instead of raw metres. */
  propKind?: WorldPropKind;
  propBandTarget?: "min" | "default" | "max";
  /** Shared atlas when model has no maps (e.g. concrete). */
  textureUrl?: string | null;
  priority?: LoadPriority;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

/**
 * Load GLB/GLTF from CDN/same-origin, fit height, optional texture override.
 * Mirrors threejs-games `loadModel` for GLB path (FBX still via modelLoader).
 */
export async function loadDeployedGltf(opts: DeployedLoadOpts): Promise<{
  root: THREE.Group;
  heightM: number;
}> {
  const { scene } = await loadAndCloneGltf(opts.url, {
    priority: opts.priority ?? "medium",
    castShadow: opts.castShadow ?? true,
    receiveShadow: opts.receiveShadow ?? true,
    cloneMaterials: true,
  });
  const root = scene as THREE.Group;
  root.name = root.name || "DeployedAsset";

  if (opts.propKind) {
    fitObjectToPropBand(root, opts.propKind, opts.propBandTarget ?? "default");
  } else if (opts.targetHeightM != null && opts.targetHeightM > 0) {
    fitObjectToHeightM(root, opts.targetHeightM);
  }

  if (opts.textureUrl) {
    await applyTextureOverride(root, opts.textureUrl);
  }

  return { root, heightM: objectHeightM(root) };
}

/** Shuffled grid coords (threejs-games getEmptyCoords). */
export function shuffleCoords(opts: {
  mapSize?: number;
  fieldSize?: number;
  emptyCenter?: number;
  jitter?: number;
}): THREE.Vector3[] {
  const mapSize = opts.mapSize ?? 400;
  const fieldSize = opts.fieldSize ?? 20;
  const emptyCenter = opts.emptyCenter ?? 0;
  const jitter = opts.jitter ?? fieldSize * 0.4;
  const half = mapSize * 0.5;
  const coords: THREE.Vector3[] = [];
  for (let x = -half; x < half; x += fieldSize) {
    for (let z = -half; z < half; z += fieldSize) {
      if (
        emptyCenter > 0 &&
        Math.abs(x) < emptyCenter &&
        Math.abs(z) < emptyCenter
      ) {
        continue;
      }
      coords.push(
        new THREE.Vector3(
          x + (Math.random() - 0.5) * jitter,
          0,
          z + (Math.random() - 0.5) * jitter,
        ),
      );
    }
  }
  for (let i = coords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = coords[i]!;
    coords[i] = coords[j]!;
    coords[j] = t;
  }
  return coords;
}

export type AmbientFlyer = {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  update: (dt: number) => void;
  dispose: () => void;
};

/**
 * Ambient birds (threejs-games birds + RPG FlamingoAI lite).
 * Plays first animation clip; gentle circle orbit — not biped grounded.
 */
export async function spawnAmbientFlyer(opts: {
  url: string;
  position: THREE.Vector3;
  scale?: number;
  cruiseAlt?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
}): Promise<AmbientFlyer> {
  const { scene, animations } = await loadAndCloneGltf(opts.url, {
    priority: "low",
    castShadow: true,
    receiveShadow: false,
    cloneMaterials: false,
  });
  const root = scene as THREE.Group;
  const s = opts.scale ?? 0.4;
  root.scale.setScalar(s);
  const alt = opts.cruiseAlt ?? 8;
  const center = opts.position.clone();
  root.position.set(center.x, center.y + alt, center.z);

  let mixer: THREE.AnimationMixer | null = null;
  if (animations?.length) {
    mixer = new THREE.AnimationMixer(root);
    const clip = animations[0]!;
    mixer.clipAction(clip).play();
  }

  const radius = opts.orbitRadius ?? 12;
  const speed = opts.orbitSpeed ?? 0.25;
  let t = Math.random() * Math.PI * 2;

  return {
    root,
    mixer,
    update(dt: number) {
      mixer?.update(dt);
      t += dt * speed;
      root.position.x = center.x + Math.cos(t) * radius;
      root.position.z = center.z + Math.sin(t) * radius;
      root.position.y = center.y + alt + Math.sin(t * 2) * 0.6;
      root.rotation.y = -t + Math.PI / 2;
    },
    dispose() {
      mixer?.stopAllAction();
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
    },
  };
}

/**
 * Spawn several ambient flyers from URL list + coords (RPG flamingo flock).
 */
export async function spawnAmbientFlyers(opts: {
  urls: string[];
  coords: THREE.Vector3[];
  count: number;
  scale?: number;
  cruiseAlt?: number;
}): Promise<AmbientFlyer[]> {
  const out: AmbientFlyer[] = [];
  const n = Math.min(opts.count, opts.coords.length, opts.urls.length * 20);
  for (let i = 0; i < n; i++) {
    const url = opts.urls[i % opts.urls.length]!;
    const pos = opts.coords[i]!;
    try {
      const bird = await spawnAmbientFlyer({
        url,
        position: pos,
        scale: opts.scale,
        cruiseAlt: opts.cruiseAlt,
      });
      out.push(bird);
    } catch (e) {
      console.warn("[DeployedAsset] flyer failed", url, e);
    }
  }
  return out;
}
