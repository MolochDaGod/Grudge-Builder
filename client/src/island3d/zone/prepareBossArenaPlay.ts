/**
 * Bake a boss-arena GLB into SI play: layers, walk BVH, Rapier colliders.
 * Uses worldSurfaceLayers + PhysicsWorld — same session rebind as zone maps.
 */
import * as THREE from 'three';
import {
  BOSS_ARENA_SIZE,
  BOSS_ARENA_SOLID_LAYERS,
  BOSS_ARENA_WALK_LAYERS,
  classifyBossArenaMesh,
  colliderRoleForArenaLayer,
  decideArenaScale,
  tagBossArenaMesh,
  type BossArenaLayer,
} from '@shared/definitions/bossArenaPlay';
import {
  buildWalkableColliderFromMeshes,
  meshTriangleCount,
  type LobbyColliderResult,
} from '../physics/LobbyColliderSystem';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

const RAPIER_TRI_BUDGET = 80_000;

export interface BossArenaPlaySurface {
  sampleHeight: (x: number, z: number, maxY?: number) => number | null;
  walkableMeshes: THREE.Mesh[];
  layerCounts: Record<string, number>;
  size: { xzM: number; yM: number; scale: number; reason: string };
  waterLevel: number | null;
  bodyIds: string[];
  dispose: () => void;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

function meshLabel(mesh: THREE.Mesh): string {
  const mat = mesh.material;
  const matName = Array.isArray(mat)
    ? mat.map((m) => m.name).join(' ')
    : (mat as THREE.Material)?.name ?? '';
  const parts: string[] = [];
  let o: THREE.Object3D | null = mesh;
  for (let i = 0; i < 4 && o; i++) {
    if (o.name) parts.push(o.name);
    o = o.parent;
  }
  return `${parts.join(' ')} ${matName}`;
}

function meshLocalSize(mesh: THREE.Mesh): { x: number; y: number; z: number } {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  _box.copy(mesh.geometry.boundingBox!);
  _box.getSize(_size);
  return { x: _size.x, y: _size.y, z: _size.z };
}

/** Scale + plant so play is SI metres (do not hero-fit). */
export function plantBossArenaSi(root: THREE.Object3D, targetExtentM = BOSS_ARENA_SIZE.xzTargetM) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const xz = Math.max(size.x, size.z, 0.01);
  const decided = decideArenaScale(xz, targetExtentM);
  if (decided.scale !== 1) {
    root.scale.multiplyScalar(decided.scale);
    root.updateMatrixWorld(true);
  }
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  root.updateMatrixWorld(true);
  const box3 = new THREE.Box3().setFromObject(root);
  box3.getSize(size);
  return {
    ...decided,
    xzM: Math.max(size.x, size.z),
    yM: size.y,
    planted: true,
  };
}

export function prepareBossArenaPlay(opts: {
  visual: THREE.Object3D;
  physics?: PhysicsWorld | null;
  targetExtentM?: number;
}): BossArenaPlaySurface {
  const size = plantBossArenaSi(opts.visual, opts.targetExtentM);
  const walkable: THREE.Mesh[] = [];
  const solids: THREE.Mesh[] = [];
  const layerCounts: Record<string, number> = {};
  let waterY: number | null = null;

  opts.visual.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
    const layer = classifyBossArenaMesh(meshLabel(obj), meshLocalSize(obj)) as BossArenaLayer;
    tagBossArenaMesh(obj, layer);
    layerCounts[layer] = (layerCounts[layer] ?? 0) + 1;
    if (layer === 'ignore') {
      obj.userData.grudgeWalkable = false;
      return;
    }
    if (layer === 'water') {
      obj.userData.grudgeWalkable = false;
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      waterY = waterY == null ? wp.y : Math.min(waterY, wp.y);
    }
    if (BOSS_ARENA_WALK_LAYERS.has(layer)) {
      walkable.push(obj);
      obj.userData.grudgeWalkable = true;
    }
    if (BOSS_ARENA_SOLID_LAYERS.has(layer) || layer === 'water') {
      solids.push(obj);
    }
  });

  const walk = buildWalkableColliderFromMeshes(walkable, 'boss-arena-walk');
  const bodyIds: string[] = [];
  if (opts.physics) {
    opts.visual.updateMatrixWorld(true);
    for (const mesh of solids) {
      const layer = mesh.userData.bossArenaLayer as BossArenaLayer;
      const role = colliderRoleForArenaLayer(layer);
      if (!role) continue;
      const tris = meshTriangleCount(mesh);
      if (tris <= 0 || tris > RAPIER_TRI_BUDGET) continue;
      try {
        mesh.updateMatrixWorld(true);
        const body = opts.physics.addTerrainCollider(mesh, { role });
        bodyIds.push(body.id);
      } catch (err) {
        console.warn('[BossArena] collider skipped', mesh.name, err);
      }
    }
  }

  console.info('[BossArena] play bake', {
    size,
    layers: layerCounts,
    walkable: walkable.length,
    bodies: bodyIds.length,
  });

  return {
    sampleHeight: walk.sampleHeight,
    walkableMeshes: walkable,
    layerCounts,
    size,
    waterLevel: waterY,
    bodyIds,
    dispose: () => {
      walk.dispose();
      if (opts.physics) {
        for (const id of bodyIds) opts.physics.removeBody(id);
      }
    },
  };
}
