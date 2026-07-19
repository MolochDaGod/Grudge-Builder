/**
 * MapCompositionLoader — apply a MapSceneComposition onto a Three.js scene.
 *
 * 1. Classify base GLTF meshes into chunkable assets
 * 2. Set water / ocean-floor heights from composition.water
 * 3. Place modular overlay chunks (dock, tent, trees, living agents as markers)
 *
 * Full agent spawning still uses TownNPCController / CreatureManager;
 * this loader places visual props and tags the scene graph.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  type MapSceneComposition,
  type MapChunkAsset,
  getComposition,
  GRUDGE_OPEN_WORLD_COMPOSITION,
} from '@shared/definitions/mapSceneComposition';
import { createOceanMesh } from '../terrain/WaterMaterial';
import { classifySceneChunks, formatClassifySummary, type ClassifyResult } from './MapChunkClassifier';
export interface CompositionLoadResult {
  composition: MapSceneComposition;
  root: THREE.Group;
  ocean: THREE.Mesh | null;
  classification: ClassifyResult | null;
  placedOverlays: THREE.Object3D[];
  waterLevel: number;
  oceanFloorLevel: number;
  summary: string;
}

const gltfCache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();

async function loadGlb(url: string): Promise<THREE.Object3D> {
  const cached = gltfCache.get(url);
  if (cached) return SkeletonUtils.clone(cached) as THREE.Object3D;

  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
  const scene = gltf.scene as THREE.Group;
  gltfCache.set(url, scene);
  return SkeletonUtils.clone(scene) as THREE.Object3D;
}

function applyTransform(obj: THREE.Object3D, chunk: MapChunkAsset): void {
  const t = chunk.transform;
  if (!t) return;
  obj.position.set(t.position[0], t.position[1], t.position[2]);
  if (t.rotationY != null) obj.rotation.y = t.rotationY;
  if (t.scale != null) {
    if (typeof t.scale === 'number') obj.scale.setScalar(t.scale);
    else obj.scale.set(t.scale[0], t.scale[1], t.scale[2]);
  }
}

/**
 * Load composition by map id (defaults to grudge-open-world).
 * If `existingRoot` is provided (already-loaded pirate GLTF), only classify + overlay.
 */
export async function loadMapComposition(
  scene: THREE.Scene,
  mapId = 'grudge-open-world',
  existingRoot?: THREE.Object3D | null,
  onProgress?: (pct: number, label: string) => void,
): Promise<CompositionLoadResult> {
  const composition = getComposition(mapId) ?? GRUDGE_OPEN_WORLD_COMPOSITION;
  const root = new THREE.Group();
  root.name = `map_composition_${composition.mapId}`;
  scene.add(root);

  let classification: ClassifyResult | null = null;
  const placedOverlays: THREE.Object3D[] = [];
  let ocean: THREE.Mesh | null = null;

  onProgress?.(5, 'Composition SSOT');

  // Classify existing base map meshes into chunkable assets
  if (existingRoot) {
    onProgress?.(20, 'Classifying base meshes');
    classification = classifySceneChunks(existingRoot, composition.mapId);
    console.log(
      `[MapComposition] ${formatClassifySummary(classification)}`,
      classification.counts,
    );
  }

  // Ocean: mark only — Island3DEngine attaches TI PirateLobbyOcean for lobby.
  // Keep a placeholder for non-lobby callers.
  onProgress?.(40, 'Ocean');
  const { waterLevel, oceanFloorLevel, shallowColor, deepColor, strength } = composition.water;
  ocean = createOceanMesh({
    waterLevel,
    size: 2400,
    segments: 64,
    strength: strength ?? 1.2,
    shallowColor: shallowColor != null ? new THREE.Color(shallowColor) : undefined,
    deepColor: deepColor != null ? new THREE.Color(deepColor) : undefined,
  });
  ocean.name = 'composition_ocean_placeholder';
  ocean.userData.grudgeChunk = {
    chunkId: `${composition.mapId}_ocean`,
    kind: 'ocean',
    layer: 'ocean',
    chunkable: false,
  };
  ocean.userData.grudgeKeepOcean = true;
  ocean.userData.waterLevel = waterLevel;
  ocean.userData.oceanFloorLevel = oceanFloorLevel;
  // Not added to scene for lobby (engine replaces with PirateLobbyOcean); still returned
  // for waterLevel metadata consumers.

  // Place overlay chunks (modular props — our creation layer)
  const overlays = composition.chunks.filter(
    (c) =>
      c.source.type === 'cdn_glb'
      || c.source.type === 'multipack_node',
  );

  let done = 0;
  for (const chunk of overlays) {
    try {
      let obj: THREE.Object3D | null = null;
      if (chunk.source.type === 'cdn_glb' && chunk.source.path) {
        obj = await loadGlb(chunk.source.path);
      } else if (chunk.source.type === 'multipack_node' && chunk.source.path) {
        try {
          const pack = await loadGlb(chunk.source.path);
          if (chunk.source.nodeName) {
            const node = pack.getObjectByName(chunk.source.nodeName);
            obj = node ? node.clone(true) : pack;
          } else {
            obj = pack;
          }
        } catch {
          obj = null;
        }
      }
      if (!obj) continue;
      applyTransform(obj, chunk);
      obj.name = chunk.chunkId;
      obj.userData.grudgeChunk = {
        chunkId: chunk.chunkId,
        kind: chunk.kind,
        layer: chunk.layer,
        name: chunk.name,
        chunkable: chunk.chunkable,
        interact: chunk.interact,
      };
      obj.traverse((ch) => {
        if ((ch as THREE.Mesh).isMesh) {
          ch.castShadow = true;
          ch.receiveShadow = true;
        }
      });
      root.add(obj);
      placedOverlays.push(obj);
    } catch (err) {
      console.warn(`[MapComposition] Skip chunk ${chunk.chunkId}`, err);
    }
    done++;
    onProgress?.(40 + Math.round((done / Math.max(1, overlays.length)) * 50), chunk.name);
  }

  onProgress?.(100, 'Done');

  const summary = [
    composition.displayName,
    `waterY=${waterLevel}`,
    `floorY=${oceanFloorLevel}`,
    classification ? formatClassifySummary(classification) : 'no-base-classify',
    `overlays=${placedOverlays.length}`,
    `weather=${composition.weather.preset}`,
  ].join(' · ');

  console.log(`[MapComposition] ${summary}`);

  return {
    composition,
    root,
    ocean,
    classification,
    placedOverlays,
    waterLevel,
    oceanFloorLevel,
    summary,
  };
}

export function getWaterHeights(mapId = 'grudge-open-world'): {
  waterLevel: number;
  oceanFloorLevel: number;
} {
  const c = getComposition(mapId) ?? GRUDGE_OPEN_WORLD_COMPOSITION;
  return {
    waterLevel: c.water.waterLevel,
    oceanFloorLevel: c.water.oceanFloorLevel,
  };
}
