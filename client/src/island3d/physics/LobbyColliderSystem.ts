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
  ensureBVHRaycast();

  const sources = walkableMeshes?.length
    ? walkableMeshes
    : collectWalkableMeshes(lobby.scene);

  const generator = new StaticGeometryGenerator(sources);
  generator.attributes = ['position'];
  const merged = generator.generate();
  merged.boundsTree = new MeshBVH(merged, { setBoundingBox: true });

  const colliderMesh = new THREE.Mesh(
    merged,
    new THREE.MeshBasicMaterial({ visible: false, wireframe: false }),
  );
  colliderMesh.name = 'lobby-ground-collider';
  colliderMesh.frustumCulled = false;

  _ray.firstHitOnly = true;

  const sampleHeight = (x: number, z: number, maxY = 400): number | null => {
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