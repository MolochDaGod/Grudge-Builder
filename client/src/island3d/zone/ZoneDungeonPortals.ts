/**
 * ZoneDungeonPortals — visualize + interact dungeon_entrance nodes from zone population.
 */
import * as THREE from 'three';
import {
  getNodesByCategory,
  type ZonePopulation,
  type DungeonEntranceNode,
} from '@shared/definitions/zoneServerNodes';
import { CavePortal3D } from '../objects/CavePortal3D';

export interface ZoneDungeonPortalsResult {
  portals: CavePortal3D[];
  update: (dt: number, playerPos: THREE.Vector3) => void;
  tryInteract: () => boolean;
  dispose: () => void;
  /** Active portal showing Press E */
  get canInteract(): boolean;
  get nearestHint(): string | null;
}

function sampleGroundY(
  mesh: THREE.Object3D | null | undefined,
  x: number,
  z: number,
  fallback = 1,
): number {
  if (!mesh) return fallback;
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, 900, z),
    new THREE.Vector3(0, -1, 0),
  );
  const hits = ray.intersectObject(mesh, true);
  return hits.length > 0 ? hits[0].point.y : fallback;
}

/** Map entrance model tag → optional GLB override (cave default in CavePortal3D) */
function entranceModelUrl(model: DungeonEntranceNode['entranceModel']): string | undefined {
  switch (model) {
    case 'portal':
      return undefined; // swirl-only + default cave
    case 'gate':
    case 'ruins':
    case 'tree_hollow':
    case 'cave':
    default:
      return undefined;
  }
}

export function spawnZoneDungeonPortals(
  scene: THREE.Scene,
  population: ZonePopulation,
  islandMeshes: Map<string, THREE.Object3D>,
  onEnter: (dungeonId: string, dungeonName: string) => void,
): ZoneDungeonPortalsResult {
  const nodes = getNodesByCategory<DungeonEntranceNode>(population, 'dungeon_entrance');
  const portals: CavePortal3D[] = [];

  for (const node of nodes) {
    const parentMesh = node.parentIslandId
      ? islandMeshes.get(node.parentIslandId)
      : undefined;
    // Prefer any island mesh for height if parent missing
    let mesh: THREE.Object3D | undefined = parentMesh ?? undefined;
    if (!mesh && islandMeshes.size > 0) {
      mesh = islandMeshes.values().next().value;
    }

    const y = sampleGroundY(mesh, node.position[0], node.position[2], node.position[1] || 1);

    const portal = new CavePortal3D({
      id: node.id,
      dungeonName: node.dungeonName,
      dungeonType: node.tier,
      minLevel: node.minLevel,
      x: node.position[0],
      z: node.position[2],
      active: node.state === 'active',
      entranceModel: entranceModelUrl(node.entranceModel),
    });
    portal.group.position.y = y;
    portal.onEnter = () => {
      onEnter(node.dungeonId, node.dungeonName);
    };
    scene.add(portal.group);
    portals.push(portal);
  }

  console.log(`[ZoneDungeon] Spawned ${portals.length} dungeon entrance portals`);

  return {
    portals,
    update(dt, playerPos) {
      for (const p of portals) p.update(dt, playerPos);
    },
    tryInteract() {
      for (const p of portals) {
        if (p.interact()) return true;
      }
      return false;
    },
    dispose() {
      for (const p of portals) {
        scene.remove(p.group);
        p.dispose?.();
      }
      portals.length = 0;
    },
    get canInteract() {
      return portals.some((p) => p.canInteract);
    },
    get nearestHint() {
      const near = portals.find((p) => p.canInteract);
      return near ? near.portalData.dungeonName : null;
    },
  };
}
