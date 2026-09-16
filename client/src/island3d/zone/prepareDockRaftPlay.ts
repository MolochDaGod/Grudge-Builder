/**
 * Bake scene (9) dock/atoll into SI play — same Rapier + BVH path as boss arenas.
 */
import * as THREE from 'three';
import {
  tagBossArenaMesh,
  colliderRoleForArenaLayer,
  type BossArenaLayer,
} from '@shared/definitions/bossArenaPlay';
import {
  plantBossArenaSi,
  type BossArenaPlaySurface,
} from './prepareBossArenaPlay';
import {
  classifyDockRaftMesh,
  DOCK_RAFT_SOLID,
  DOCK_RAFT_WALK,
  isDockRaftOceanLabel,
  isDockRaftPalmLabel,
  isDockRaftRaftLabel,
  type DockRaftLayer,
} from '@shared/definitions/dockRaftTestMap';
import { buildWalkableColliderFromMeshes, meshTriangleCount } from '../physics/LobbyColliderSystem';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

const RAPIER_TRI_BUDGET = 80_000;
const _box = new THREE.Box3();
const _size = new THREE.Vector3();

function meshLabel(mesh: THREE.Mesh): string {
  const mat = mesh.material;
  const matName = Array.isArray(mat)
    ? mat.map((m) => m.name).join(' ')
    : (mat as THREE.Material)?.name ?? '';
  const parts: string[] = [];
  let o: THREE.Object3D | null = mesh;
  for (let i = 0; i < 5 && o; i++) {
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

export interface DockRaftPlaySurface extends BossArenaPlaySurface {
  palmAnchors: THREE.Vector3[];
  dockAnchor: THREE.Vector3 | null;
  raftAnchor: THREE.Vector3 | null;
}

export function prepareDockRaftPlay(opts: {
  visual: THREE.Object3D;
  physics?: PhysicsWorld | null;
}): DockRaftPlaySurface {
  const size = plantBossArenaSi(opts.visual, 96);
  const walkable: THREE.Mesh[] = [];
  const solids: THREE.Mesh[] = [];
  const layerCounts: Record<string, number> = {};
  const palmAnchors: THREE.Vector3[] = [];
  let dockAnchor: THREE.Vector3 | null = null;
  let raftAnchor: THREE.Vector3 | null = null;
  let waterY: number | null = null;

  opts.visual.traverse((obj) => {
    const label = obj instanceof THREE.Mesh ? meshLabel(obj) : obj.name;
    if (isDockRaftPalmLabel(label) && obj.parent && /modulo|palm/i.test(obj.name)) {
      const p = new THREE.Vector3();
      obj.getWorldPosition(p);
      if (p.lengthSq() > 1) palmAnchors.push(p);
    }
    if (isDockRaftRaftLabel(label) && !raftAnchor) {
      const p = new THREE.Vector3();
      obj.getWorldPosition(p);
      raftAnchor = p;
    }
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
    const layer = classifyDockRaftMesh(label, meshLocalSize(obj));
    tagBossArenaMesh(obj, layer as BossArenaLayer);
    layerCounts[layer] = (layerCounts[layer] ?? 0) + 1;

    if (layer === 'dock' || layer === 'deck') {
      const p = new THREE.Vector3();
      obj.getWorldPosition(p);
      dockAnchor = p;
    }

    if (layer === 'ignore' || isDockRaftPalmLabel(label) || isDockRaftRaftLabel(label)) {
      obj.userData.grudgeWalkable = false;
      if (isDockRaftRaftLabel(label)) obj.visible = false;
      return;
    }

    if (layer === 'water' || isDockRaftOceanLabel(label)) {
      obj.userData.grudgeWalkable = false;
      obj.visible = false;
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      waterY = waterY == null ? wp.y : Math.min(waterY, wp.y);
      return;
    }

    if (DOCK_RAFT_WALK.has(layer as DockRaftLayer)) {
      walkable.push(obj);
      obj.userData.grudgeWalkable = true;
    }
    if (DOCK_RAFT_SOLID.has(layer as DockRaftLayer)) {
      solids.push(obj);
    }
  });

  const walk = buildWalkableColliderFromMeshes(walkable, 'dock-raft-walk');
  const bodyIds: string[] = [];
  if (opts.physics) {
    opts.visual.updateMatrixWorld(true);
    for (const mesh of solids) {
      const layer = mesh.userData.bossArenaLayer as BossArenaLayer;
      const role = colliderRoleForArenaLayer(layer === 'dock' || layer === 'deck' ? 'terrain' : layer);
      if (!role) continue;
      const tris = meshTriangleCount(mesh);
      if (tris <= 0 || tris > RAPIER_TRI_BUDGET) continue;
      try {
        mesh.updateMatrixWorld(true);
        const body = opts.physics.addTerrainCollider(mesh, { role });
        bodyIds.push(body.id);
      } catch (err) {
        console.warn('[DockRaft] collider skipped', mesh.name, err);
      }
    }
  }

  const uniquePalms: THREE.Vector3[] = [];
  for (const p of palmAnchors) {
    if (uniquePalms.every((q) => q.distanceTo(p) > 2.5)) uniquePalms.push(p);
  }

  console.info('[DockRaft] play bake', {
    size,
    layers: layerCounts,
    walkable: walkable.length,
    palms: uniquePalms.length,
    dock: dockAnchor,
    raft: raftAnchor,
    waterY,
  });

  return {
    sampleHeight: walk.sampleHeight,
    walkableMeshes: walkable,
    layerCounts,
    size,
    waterLevel: waterY,
    bodyIds,
    palmAnchors: uniquePalms,
    dockAnchor,
    raftAnchor,
    dispose: () => {
      walk.dispose();
      if (opts.physics) {
        for (const id of bodyIds) opts.physics.removeBody(id);
      }
    },
  };
}
