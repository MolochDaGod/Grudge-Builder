/**
 * LobbyIslandLoader — loads a pre-built GLTF map as the lobby island scene.
 *
 * Supports the PolygonPirates pirate islands GLTF and any other lobby-style
 * pre-made map. Handles scene insertion, shadow setup, bounding box calculation,
 * and provides camera framing helpers.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
/** Same-origin proxy → assets.grudge-studio.com (see vercel.json /api/assets). */
const PIRATE_GLTF_BASE = import.meta.env.DEV
  ? '/models/lobby/pirate-islands/'
  : '/api/assets/models/lobby/pirate-islands/';

// ─── Known lobby maps ────────────────────────────────────────────────────────

export interface LobbyMapDef {
  id: string;
  name: string;
  /** Path relative to public root */
  gltfPath: string;
  /** Suggested camera position */
  cameraPosition: THREE.Vector3;
  /** Suggested camera look-at target */
  cameraTarget: THREE.Vector3;
  /** Overall scale multiplier (some models need adjusting) */
  scale: number;
  /** Y offset to align with water level */
  yOffset: number;
}

export const LOBBY_MAPS: LobbyMapDef[] = [
  {
    id: 'pirate-islands',
    name: 'Pirate Islands',
    // Chicken Gun PolygonPirates — separated GLTF (scene.gltf + scene.bin + textures/).
    // NOT a single .glb; GLTFLoader resolves bin/textures relative to gltfPath directory.
    gltfPath: `${PIRATE_GLTF_BASE}scene.gltf`,
    cameraPosition: new THREE.Vector3(100, 120, 200),
    cameraTarget: new THREE.Vector3(0, 20, 0),
    scale: 1,
    yOffset: 0,
  },
];

// ─── Loader ──────────────────────────────────────────────────────────────────

export interface LobbyLoadResult {
  scene: THREE.Group;
  boundingBox: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  animations: THREE.AnimationClip[];
}

/**
 * Load a lobby GLTF map and prepare it for rendering.
 */
export async function loadLobbyMap(
  mapDef: LobbyMapDef,
  onProgress?: (pct: number) => void,
): Promise<LobbyLoadResult> {
  const loader = new GLTFLoader();
  const base = mapDef.gltfPath.replace(/[^/]+$/, '');
  loader.setPath(base);

  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(
      'scene.gltf',
      resolve,
      (event) => {
        if (event.total > 0 && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
      reject,
    );
  });

  const scene = gltf.scene as THREE.Group;

  // Apply scale & offset
  scene.scale.setScalar(mapDef.scale);
  scene.position.y = mapDef.yOffset;

  // Enable shadows on all meshes
  scene.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // Ensure materials are double-sided for low-poly assets
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
            mat.side = THREE.DoubleSide;
          }
        }
      }
    }
  });

  // Compute bounding box
  const boundingBox = new THREE.Box3().setFromObject(scene);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  boundingBox.getCenter(center);
  boundingBox.getSize(size);

  return {
    scene,
    boundingBox,
    center,
    size,
    animations: gltf.animations || [],
  };
}

/**
 * Get a lobby map definition by ID, falling back to the first available.
 */
export function getLobbyMap(id?: string): LobbyMapDef {
  return LOBBY_MAPS.find((m) => m.id === id) || LOBBY_MAPS[0];
}
