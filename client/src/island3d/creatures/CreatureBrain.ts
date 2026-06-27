/**
 * CreatureBrain — pathfinding, roaming, and aggro decision layer for island wildlife.
 */
import * as THREE from 'three';
import type { TerrainNavMesh } from '../navigation/TerrainNavMesh';
import type { CreatureAI, CreatureDef } from './CreatureManifest';

export type AggroDecision = 'ignore' | 'flee' | 'chase' | 'alert';

export interface BrainContext {
  navMesh: TerrainNavMesh | null;
  sampleHeight?: (x: number, z: number) => number | null;
  rand: () => number;
}

export class CreatureBrain {
  path: THREE.Vector3[] = [];
  pathIndex = 0;
  private lastPathTarget = new THREE.Vector3();

  clearPath(): void {
    this.path = [];
    this.pathIndex = 0;
  }

  planPath(
    ctx: BrainContext,
    from: THREE.Vector3,
    to: THREE.Vector3,
  ): boolean {
    this.clearPath();
    if (!ctx.navMesh) {
      this.path = [to.clone()];
      this.pathIndex = 0;
      return true;
    }

    const navPath = ctx.navMesh.findPath(from.x, from.z, to.x, to.z);
    if (!navPath || navPath.points.length < 2) {
      this.path = [to.clone()];
      this.pathIndex = 0;
      return false;
    }

    this.path = navPath.points.map((p) => p.clone());
    this.pathIndex = 1;
    this.lastPathTarget.copy(to);
    return true;
  }

  pickRoamTarget(
    spawnPos: THREE.Vector3,
    roamRadius: number,
    ctx: BrainContext,
  ): THREE.Vector3 {
    const angle = ctx.rand() * Math.PI * 2;
    const dist = 8 + ctx.rand() * roamRadius;
    const target = new THREE.Vector3(
      spawnPos.x + Math.cos(angle) * dist,
      spawnPos.y,
      spawnPos.z + Math.sin(angle) * dist,
    );

    if (ctx.navMesh && !ctx.navMesh.isWalkable(target.x, target.z)) {
      for (let i = 0; i < 6; i++) {
        const a = ctx.rand() * Math.PI * 2;
        const d = 8 + ctx.rand() * roamRadius;
        target.set(
          spawnPos.x + Math.cos(a) * d,
          spawnPos.y,
          spawnPos.z + Math.sin(a) * d,
        );
        if (ctx.navMesh.isWalkable(target.x, target.z)) break;
      }
    }

    return target;
  }

  decideAggro(
    def: CreatureDef,
    dist: number,
    provoked: boolean,
    ctx: BrainContext,
  ): AggroDecision {
    if (dist > def.alertRadius) return 'ignore';

    if (def.ai === 'passive' || def.ai === 'fish') return 'flee';
    if (def.ai === 'aggressive') return 'chase';

    if (provoked) return 'chase';

    const chance = def.aggroChance ?? 0.35;
    if (ctx.rand() < chance) return 'chase';
    return def.huntable ? 'alert' : 'ignore';
  }

  followPath(
    position: THREE.Vector3,
    speed: number,
    dt: number,
    ctx: BrainContext,
    swimY?: number,
  ): boolean {
    if (this.path.length === 0) return true;

    const waypoint = this.path[this.pathIndex] ?? this.path[this.path.length - 1];
    const dx = waypoint.x - position.x;
    const dz = waypoint.z - position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.2) {
      if (this.pathIndex < this.path.length - 1) {
        this.pathIndex++;
        return false;
      }
      this.clearPath();
      return true;
    }

    const step = Math.min(speed * dt, dist);
    position.x += (dx / dist) * step;
    position.z += (dz / dist) * step;

    if (swimY !== undefined) {
      position.y = swimY;
    } else if (ctx.sampleHeight) {
      const y = ctx.sampleHeight(position.x, position.z);
      if (y !== null) position.y = y;
    } else if (waypoint.y > -50) {
      position.y = waypoint.y;
    }

    return false;
  }

  getFacingYaw(position: THREE.Vector3, target: THREE.Vector3): number {
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    return Math.atan2(dx, dz);
  }
}