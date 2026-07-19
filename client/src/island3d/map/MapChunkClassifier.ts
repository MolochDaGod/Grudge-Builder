/**
 * MapChunkClassifier — walk a loaded scene and tag every mesh as a chunkable asset.
 *
 * Applies userData.grudgeChunk = { chunkId, kind, layer, name } so tools, streaming,
 * and editor mode understand houses, rocks, docks, etc. as discrete assets.
 */
import * as THREE from 'three';
import {
  classifyMeshName,
  type MapChunkAsset,
  type MapChunkKind,
  type MapChunkLayer,
} from '@shared/definitions/mapSceneComposition';

export interface ClassifiedChunk {
  chunkId: string;
  kind: MapChunkKind;
  layer: MapChunkLayer;
  name: string;
  mesh: THREE.Mesh;
  worldPosition: THREE.Vector3;
  size: THREE.Vector3;
}

export interface ClassifyResult {
  chunks: ClassifiedChunk[];
  byKind: Partial<Record<MapChunkKind, ClassifiedChunk[]>>;
  byLayer: Partial<Record<MapChunkLayer, ClassifiedChunk[]>>;
  counts: Record<string, number>;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _pos = new THREE.Vector3();

/**
 * Classify all meshes under `root`. Tags each mesh with userData.grudgeChunk.
 */
export function classifySceneChunks(
  root: THREE.Object3D,
  mapId = 'scene',
): ClassifyResult {
  const chunks: ClassifiedChunk[] = [];
  const byKind: ClassifyResult['byKind'] = {};
  const byLayer: ClassifyResult['byLayer'] = {};
  const counts: Record<string, number> = {};
  let seq = 0;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const label = `${mesh.name} ${(mesh.material as THREE.Material)?.name ?? ''}`;
    const { kind, layer } = classifyMeshName(label);
    // Rock formations: large rocks get rock_formation kind
    let finalKind = kind;
    if (kind === 'rock' && mesh.geometry) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        _box.copy(mesh.geometry.boundingBox);
        _box.getSize(_size);
        const max = Math.max(_size.x, _size.y, _size.z);
        if (max > 4) finalKind = 'rock_formation';
      }
    }

    const chunkId = `${mapId}_${finalKind}_${seq++}`;
    mesh.getWorldPosition(_pos);
    _size.set(1, 1, 1);
    if (mesh.geometry) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        _box.copy(mesh.geometry.boundingBox);
        _box.applyMatrix4(mesh.matrixWorld);
        _box.getSize(_size);
      }
    }

    const entry: ClassifiedChunk = {
      chunkId,
      kind: finalKind,
      layer,
      name: mesh.name || finalKind,
      mesh,
      worldPosition: _pos.clone(),
      size: _size.clone(),
    };

    mesh.userData.grudgeChunk = {
      chunkId,
      kind: finalKind,
      layer,
      name: entry.name,
      chunkable: true,
    };
    mesh.userData.collider = mesh.userData.collider ?? (layer === 'structure' || layer === 'nature' || layer === 'island_base');

    chunks.push(entry);
    if (!byKind[finalKind]) byKind[finalKind] = [];
    byKind[finalKind]!.push(entry);
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer]!.push(entry);
    counts[finalKind] = (counts[finalKind] ?? 0) + 1;
  });

  return { chunks, byKind, byLayer, counts };
}

/** Summarize classification for HUD / debug */
export function formatClassifySummary(result: ClassifyResult): string {
  const parts = Object.entries(result.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k}:${n}`);
  return `${result.chunks.length} chunks · ${parts.join(' · ')}`;
}

/** Convert classified meshes into MapChunkAsset records (for save / export) */
export function classifiedToAssets(result: ClassifyResult): MapChunkAsset[] {
  return result.chunks.map((c) => ({
    chunkId: c.chunkId,
    kind: c.kind,
    layer: c.layer,
    name: c.name,
    source: {
      type: 'gltf_mesh' as const,
      meshNamePattern: c.name,
    },
    transform: {
      position: [c.worldPosition.x, c.worldPosition.y, c.worldPosition.z] as [number, number, number],
    },
    sizeM: [c.size.x, c.size.y, c.size.z] as [number, number, number],
    chunkable: true,
    tags: [c.kind, c.layer],
  }));
}
