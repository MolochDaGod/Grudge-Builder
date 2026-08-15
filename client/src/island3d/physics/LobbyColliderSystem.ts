/**
 * LobbyColliderSystem — BVH-accelerated walk collider for pre-built lobby GLTF maps.
 * Mirrors game/world ground sampling: one merged mesh, firstHitOnly raycasts.
 */
import * as THREE from 'three';
import {
  MeshBVH,
  StaticGeometryGenerator,
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from 'three-mesh-bvh';
import type { LobbyLoadResult } from '../engine/LobbyIslandLoader';
import { isWalkableLayer } from '../terrain/LobbySurfaceLayers';

let bvhPatched = false;

export function ensureBVHRaycast(): void {
  if (bvhPatched) return;
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  bvhPatched = true;
}

export interface LobbyColliderResult {
  /** Invisible merged mesh used for ground height raycasts */
  colliderMesh: THREE.Mesh;
  /** Fast height lookup */
  sampleHeight: (x: number, z: number, maxY?: number) => number | null;
  dispose: () => void;
}

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3(0, -1, 0);
const _ray = new THREE.Raycaster();

export function buildLobbyCollider(
  lobby: LobbyLoadResult,
  walkableMeshes?: THREE.Mesh[],
): LobbyColliderResult {
  const sources = walkableMeshes?.length
    ? walkableMeshes
    : collectWalkableMeshes(lobby.scene);
  return buildWalkableColliderFromMeshes(sources, 'lobby-ground-collider');
}

/** Triangle count for Rapier trimesh budget (docs/RAPIER_FLEET.md). */
export function meshTriangleCount(mesh: THREE.Mesh): number {
  const geo = mesh.geometry as THREE.BufferGeometry | undefined;
  if (!geo) return 0;
  const idx = geo.getIndex();
  if (idx) return idx.count / 3;
  const pos = geo.getAttribute('position');
  return pos ? pos.count / 3 : 0;
}

const _nearBox = new THREE.Box3();

/** Keep the first physics layer to meshes near spawn (browser rest). */
export function selectNearMeshes(
  meshes: THREE.Mesh[],
  spawn: THREE.Vector3,
  radiusM: number,
): THREE.Mesh[] {
  const near: THREE.Mesh[] = [];
  let closest: THREE.Mesh | null = null;
  let closestD = Infinity;
  for (const mesh of meshes) {
    if (!mesh?.isMesh || !mesh.geometry) continue;
    try {
      mesh.updateMatrixWorld(true);
      _nearBox.setFromObject(mesh);
    } catch {
      continue;
    }
    const d = _nearBox.distanceToPoint(spawn);
    if (d < closestD) {
      closestD = d;
      closest = mesh;
    }
    if (d <= radiusM || _nearBox.containsPoint(spawn)) near.push(mesh);
  }
  if (near.length > 0) return near;
  return closest ? [closest] : [];
}

/**
 * BVH walk collider from any walkable mesh list (zone / lobby / procedural).
 * Same MeshBVH merge as lobby — one firstHitOnly height sampler.
 */
export function buildWalkableColliderFromMeshes(
  sources: THREE.Mesh[],
  name = 'scene-walk-collider',
): LobbyColliderResult {
  ensureBVHRaycast();

  const usable = sources.filter((m) => m?.isMesh && m.geometry);
  if (usable.length === 0) {
    const empty = new THREE.BufferGeometry();
    const colliderMesh = new THREE.Mesh(
      empty,
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    colliderMesh.name = name;
    return {
      colliderMesh,
      sampleHeight: () => null,
      dispose: () => {
        empty.dispose();
        colliderMesh.material.dispose();
      },
    };
  }

  const generator = new StaticGeometryGenerator(usable);
  generator.attributes = ['position'];
  const merged = generator.generate();
  merged.boundsTree = new MeshBVH(merged, { setBoundingBox: true });

  const colliderMesh = new THREE.Mesh(
    merged,
    new THREE.MeshBasicMaterial({ visible: false, wireframe: false }),
  );
  colliderMesh.name = name;
  colliderMesh.frustumCulled = false;

  _ray.firstHitOnly = true;

  const sampleHeight = (x: number, z: number, maxY = 2800): number | null => {
    _origin.set(x, maxY, z);
    _ray.set(_origin, _dir);
    const hits = _ray.intersectObject(colliderMesh, false);
    return hits.length > 0 ? hits[0].point.y : null;
  };

  return {
    colliderMesh,
    sampleHeight,
    dispose: () => {
      merged.disposeBoundsTree?.();
      merged.dispose();
      colliderMesh.material.dispose();
    },
  };
}

function collectWalkableMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.name === 'lobby-ground-proxy') return;
    const layer = obj.userData.grudgeLayer as string | undefined;
    if (layer && isWalkableLayer(layer)) {
      meshes.push(obj);
      return;
    }
    // Fallback before layer pass: include horizontal-ish geometry
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
    const box = obj.geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y < Math.max(size.x, size.z) * 0.3) meshes.push(obj);
  });
  return meshes;
}