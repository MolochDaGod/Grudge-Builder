/**
 * Warlords map landmarks — towers, fortress, jungle rocks on SI world scale.
 *
 * Props are calibrated with fitWorldPropToHeightM (NOT hero 1.8 fit).
 * Colliders = world Box3 for simple blocking / nav exclusion.
 * Navmesh: mark walkable false under footprint or punch holes via sampleHeight.
 */
import * as THREE from 'three';
import { loadGltfCached, cloneGltfScene, prepareMeshPerformance } from '@/lib/three/SharedGltfPipeline';
import { ASSET_CDN_BASE } from '@/lib/assetConfig';
import {
  fitWorldPropToHeightM,
  boxColliderFromObject,
  measureObjectWorldHeight,
  type WorldPropKind,
} from '../zoneWorldScale';

export interface MapLandmarkDef {
  id: string;
  kind: WorldPropKind;
  /** CDN or same-origin path */
  path: string;
  /** Target height metres after SI fit */
  targetHeightM: number;
  /** Placement XZ (world m); Y sampled from terrain */
  x: number;
  z: number;
  yaw?: number;
  /** Optional multipack node name */
  nodeName?: string;
}

/** Production defaults — R2 keys already uploaded for warlords vital pack. */
export const DEFAULT_HOME_LANDMARKS: MapLandmarkDef[] = [
  {
    id: 'high_black_tower',
    kind: 'tower',
    path: '/models/warlords/towers/the_high_black_tower.glb',
    targetHeightM: 32,
    x: 48,
    z: -36,
    yaw: Math.PI * 0.15,
  },
  {
    id: 'fortress_island',
    kind: 'fortress',
    path: '/models/warlords/fortresses/fortress_island.glb',
    targetHeightM: 22,
    x: -55,
    z: 40,
    yaw: -0.4,
  },
  {
    id: 'jungle_rocks_a',
    kind: 'rock',
    path: '/models/warlords/nature/rocks.glb',
    targetHeightM: 2.4,
    x: 22,
    z: 28,
  },
  {
    id: 'jungle_rocks_b',
    kind: 'rock',
    path: '/models/warlords/nature/rocks.glb',
    targetHeightM: 3.1,
    x: -18,
    z: -42,
    yaw: 1.2,
  },
  {
    id: 'jungle_rocks_c',
    kind: 'rock',
    path: '/models/warlords/nature/rocks.glb',
    targetHeightM: 1.9,
    x: 35,
    z: 12,
    yaw: -0.7,
  },
];

export interface PlacedLandmark {
  id: string;
  kind: WorldPropKind;
  root: THREE.Group;
  collider: THREE.Box3;
  heightM: number;
  scale: number;
}

export interface LandmarkLoadResult {
  root: THREE.Group;
  landmarks: PlacedLandmark[];
  colliders: THREE.Box3[];
}

function resolveUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${ASSET_CDN_BASE}${p}`;
}

async function loadPropRoot(def: MapLandmarkDef): Promise<THREE.Object3D | null> {
  const candidates = [
    def.path,
    resolveUrl(def.path),
  ];
  for (const url of candidates) {
    try {
      const gltf = await loadGltfCached(url.startsWith('http') || url.startsWith('/') ? url : resolveUrl(url));
      let scene = cloneGltfScene(gltf);
      if (def.nodeName) {
        const node = scene.getObjectByName(def.nodeName);
        if (node) {
          const g = new THREE.Group();
          g.add(node.clone(true));
          scene = g as THREE.Group;
        }
      }
      prepareMeshPerformance(scene, {
        castShadow: true,
        receiveShadow: true,
        frustumCulled: true,
      });
      return scene;
    } catch {
      /* try next */
    }
  }
  console.warn(`[WarlordsMapLandmarks] failed to load ${def.id} ${def.path}`);
  return null;
}

/**
 * Place landmarks on terrain with SI scale + AABB colliders.
 */
export async function loadWarlordsMapLandmarks(
  scene: THREE.Scene,
  opts: {
    landmarks?: MapLandmarkDef[];
    sampleHeight: (x: number, z: number) => number | null;
    /** Skip if path missing — still returns empty group */
    enabled?: boolean;
  },
): Promise<LandmarkLoadResult> {
  const group = new THREE.Group();
  group.name = 'warlords_map_landmarks';
  scene.add(group);

  const landmarks: PlacedLandmark[] = [];
  const colliders: THREE.Box3[] = [];
  if (opts.enabled === false) {
    return { root: group, landmarks, colliders };
  }

  const defs = opts.landmarks ?? DEFAULT_HOME_LANDMARKS;
  for (const def of defs) {
    const y = opts.sampleHeight(def.x, def.z);
    if (y === null || !Number.isFinite(y)) continue;
    const obj = await loadPropRoot(def);
    if (!obj) continue;

    const wrapper = new THREE.Group();
    wrapper.name = `landmark_${def.id}`;
    wrapper.add(obj);

    const scale = fitWorldPropToHeightM(wrapper, def.kind, def.targetHeightM);
    wrapper.position.set(def.x, y, def.z);
    if (def.yaw != null) wrapper.rotation.y = def.yaw;

    group.add(wrapper);

    const collider = boxColliderFromObject(wrapper);
    // Slight vertical pad so feet don't stick into mesh
    collider.min.y -= 0.05;
    colliders.push(collider);

    const heightM = measureObjectWorldHeight(wrapper);
    landmarks.push({
      id: def.id,
      kind: def.kind,
      root: wrapper,
      collider,
      heightM,
      scale,
    });

    console.info(
      `[MapLandmark] ${def.id} kind=${def.kind} h=${heightM.toFixed(2)}m scale=${scale.toFixed(4)} ` +
        `@ (${def.x.toFixed(1)}, ${y.toFixed(1)}, ${def.z.toFixed(1)})`,
    );
  }

  return { root: group, landmarks, colliders };
}

/** True if point XZ is inside any landmark footprint (for nav blocked cells). */
export function pointInLandmarkColliders(
  x: number,
  z: number,
  colliders: THREE.Box3[],
  margin = 0.5,
): boolean {
  for (const b of colliders) {
    if (
      x >= b.min.x - margin
      && x <= b.max.x + margin
      && z >= b.min.z - margin
      && z <= b.max.z + margin
    ) {
      return true;
    }
  }
  return false;
}
