/**
 * MeshPrefabRegistry — every mesh in the pirate lobby is a prefab.
 *
 * After classification, each mesh is tagged:
 *   userData.prefab = { id, kind, layer, name, sculptable, source }
 *
 * Sand/beach meshes are sculptable (height-adjustable with shovel).
 */
import * as THREE from 'three';
import {
  classifyMeshName,
  type MapChunkKind,
  type MapChunkLayer,
} from '@shared/definitions/mapSceneComposition';

export interface MeshPrefab {
  id: string;
  kind: MapChunkKind;
  layer: MapChunkLayer;
  name: string;
  /** Beach/sand can be height-edited with shovel */
  sculptable: boolean;
  /** Structural / harvest / living role */
  role: 'structure' | 'nature' | 'prop' | 'living' | 'vehicle' | 'terrain' | 'water' | 'vfx';
  mesh: THREE.Mesh;
}

export interface PrefabRegistryResult {
  prefabs: MeshPrefab[];
  byKind: Partial<Record<MapChunkKind, MeshPrefab[]>>;
  sculptable: MeshPrefab[];
  counts: Record<string, number>;
}

const SCULPTABLE_KINDS = new Set<MapChunkKind>([
  'beach',
  'path',
  'island',
  'island_chunk',
]);

function roleFor(kind: MapChunkKind, layer: MapChunkLayer): MeshPrefab['role'] {
  if (layer === 'ocean' || layer === 'ocean_floor' || kind === 'ocean' || kind === 'ocean_floor') return 'water';
  if (layer === 'living') return 'living';
  if (layer === 'vehicle') return 'vehicle';
  if (layer === 'vfx') return 'vfx';
  if (layer === 'structure' || layer === 'camp') return 'structure';
  if (layer === 'nature') return 'nature';
  if (layer === 'island_base' || layer === 'beach') return 'terrain';
  return 'prop';
}

/**
 * Tag every mesh under root as a prefab. Returns registry for editor HUD.
 */
export function registerMeshPrefabs(
  root: THREE.Object3D,
  mapId = 'grudge-open-world',
): PrefabRegistryResult {
  const prefabs: MeshPrefab[] = [];
  const byKind: PrefabRegistryResult['byKind'] = {};
  const sculptable: MeshPrefab[] = [];
  const counts: Record<string, number> = {};
  let seq = 0;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    // Prefer existing classification from MapChunkClassifier
    const existing = mesh.userData.grudgeChunk as
      | { chunkId?: string; kind?: MapChunkKind; layer?: MapChunkLayer; name?: string }
      | undefined;

    const label = `${mesh.name} ${(mesh.material as THREE.Material)?.name ?? ''}`;
    const classified = existing?.kind
      ? { kind: existing.kind, layer: existing.layer ?? 'prop' as MapChunkLayer }
      : classifyMeshName(label);

    // Sand / beach detection by material name
    let kind = classified.kind;
    let layer = classified.layer;
    if (/sand|beach|shore/i.test(label) && kind === 'unknown') {
      kind = 'beach';
      layer = 'beach';
    }

    const id = existing?.chunkId ?? `${mapId}_prefab_${kind}_${seq++}`;
    const name = existing?.name || mesh.name || kind;
    const sculptableMesh =
      SCULPTABLE_KINDS.has(kind)
      || layer === 'beach'
      || /sand|beach|shore|dirt|path/i.test(label);

    const prefab: MeshPrefab = {
      id,
      kind,
      layer,
      name,
      sculptable: sculptableMesh,
      role: roleFor(kind, layer),
      mesh,
    };

    mesh.userData.prefab = {
      id,
      kind,
      layer,
      name,
      sculptable: sculptableMesh,
      role: prefab.role,
      source: 'mesh_prefab',
    };
    mesh.userData.grudgeChunk = {
      chunkId: id,
      kind,
      layer,
      name,
      chunkable: true,
      prefab: true,
    };
    // Beach/sand: allow shovel height edit
    mesh.userData.sculptable = sculptableMesh;
    mesh.userData.sculptAxis = 'y'; // world Y height

    prefabs.push(prefab);
    if (!byKind[kind]) byKind[kind] = [];
    byKind[kind]!.push(prefab);
    counts[kind] = (counts[kind] ?? 0) + 1;
    if (sculptableMesh) sculptable.push(prefab);
  });

  console.log(
    `[MeshPrefab] ${prefabs.length} prefabs · sculptable sand/beach: ${sculptable.length}`,
    counts,
  );

  return { prefabs, byKind, sculptable, counts };
}

/** Sculpt sand/beach mesh vertices along world Y (local height depending on rotation). */
export function sculptSandPrefab(
  mesh: THREE.Mesh,
  worldHit: THREE.Vector3,
  deltaY: number,
  radius = 2.0,
): number {
  if (!mesh.userData.sculptable) return 0;
  const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
  if (!pos) return 0;

  const local = mesh.worldToLocal(worldHit.clone());
  // Prefer Y as height; if mesh is flat on XZ in local, use Y
  let touched = 0;
  const r2 = radius * radius;

  // Detect if geometry is XZ plane (Y up) or XY plane (Z up like ThreeTerrain)
  let ySpread = 0;
  let zSpread = 0;
  const sample = Math.min(pos.count, 32);
  let yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
  for (let i = 0; i < sample; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
    zMin = Math.min(zMin, z); zMax = Math.max(zMax, z);
  }
  ySpread = yMax - yMin;
  zSpread = zMax - zMin;
  const heightIsZ = zSpread > ySpread * 1.5;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    let dist2: number;
    if (heightIsZ) {
      dist2 = (vx - local.x) ** 2 + (vy - local.y) ** 2;
    } else {
      dist2 = (vx - local.x) ** 2 + (vz - local.z) ** 2;
    }
    if (dist2 > r2) continue;
    const w = 1 - Math.sqrt(dist2) / radius;
    const fall = w * w * (3 - 2 * w);
    if (heightIsZ) {
      pos.setZ(i, vz + deltaY * fall);
    } else {
      pos.setY(i, vy + deltaY * fall);
    }
    touched++;
  }

  if (touched > 0) {
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeBoundingBox();
  }
  return touched;
}
