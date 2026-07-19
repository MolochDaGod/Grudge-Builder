/**
 * ShipwreckPathfinder — A* grid pathfinding for shipwreck island.
 * Reuses TownNavMesh grid math; carves obstacles from blocking prefabs.
 */
import * as THREE from 'three';
import {
  buildNavGrid,
  findPath,
  type NavGrid,
  type PathResult,
} from '../town/TownNavMesh';
import type { ShipwreckSceneDef, Xyz } from '@shared/definitions/shipwreckScene';

export interface ShipwreckPathfinder {
  grid: NavGrid;
  findPath: (from: Xyz | THREE.Vector3, to: Xyz | THREE.Vector3) => PathResult;
  isWalkableWorld: (x: number, z: number) => boolean;
  rebuild: (scene: ShipwreckSceneDef) => void;
  getDebugMesh: () => THREE.Group;
  dispose: () => void;
}

function toV3(p: Xyz | THREE.Vector3): THREE.Vector3 {
  if (p instanceof THREE.Vector3) return p;
  return new THREE.Vector3(p.x, p.y, p.z);
}

export function createShipwreckPathfinder(scene: ShipwreckSceneDef): ShipwreckPathfinder {
  let grid = buildGridFromScene(scene);
  let debugGroup: THREE.Group | null = null;

  function rebuild(next: ShipwreckSceneDef) {
    grid = buildGridFromScene(next);
    if (debugGroup) {
      while (debugGroup.children.length) {
        const c = debugGroup.children[0];
        debugGroup.remove(c);
        (c as THREE.Mesh).geometry?.dispose();
      }
      paintDebug(debugGroup, grid);
    }
  }

  return {
    get grid() {
      return grid;
    },
    findPath(from, to) {
      return findPath(grid, toV3(from), toV3(to));
    },
    isWalkableWorld(x, z) {
      const [minX, minZ] = [grid.origin[0], grid.origin[1]];
      const gx = Math.floor((x - minX) / grid.cellSize);
      const gz = Math.floor((z - minZ) / grid.cellSize);
      if (gx < 0 || gz < 0 || gx >= grid.width || gz >= grid.height) return false;
      return grid.cells[gz * grid.width + gx];
    },
    rebuild,
    getDebugMesh() {
      if (!debugGroup) {
        debugGroup = new THREE.Group();
        debugGroup.name = 'ShipwreckNavDebug';
        paintDebug(debugGroup, grid);
      }
      return debugGroup;
    },
    dispose() {
      if (debugGroup) {
        debugGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            (m.material as THREE.Material)?.dispose?.();
          }
        });
        debugGroup = null;
      }
    },
  };
}

function buildGridFromScene(scene: ShipwreckSceneDef): NavGrid {
  const obstacles: [number, number, number, number][] = [];
  for (const pf of scene.prefabs) {
    if (!pf.blocksNav) continue;
    const p = pf.transform.position;
    const sc = typeof pf.transform.scale === 'number'
      ? pf.transform.scale
      : Array.isArray(pf.transform.scale)
        ? Math.max(...pf.transform.scale)
        : 1;
    const half = Math.max(1.2, sc * 2.2);
    obstacles.push([p.x, p.z, half, half]);
  }
  // Keep player wake relatively open — light carve only
  return buildNavGrid({
    bounds: scene.navBounds,
    cellSize: scene.navCellSize,
    obstacles,
  });
}

function paintDebug(group: THREE.Group, grid: NavGrid) {
  const geo = new THREE.PlaneGeometry(grid.cellSize * 0.9, grid.cellSize * 0.9);
  const walk = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  const block = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  for (let gz = 0; gz < grid.height; gz++) {
    for (let gx = 0; gx < grid.width; gx++) {
      const ok = grid.cells[gz * grid.width + gx];
      // Only draw blocked + sparse walk sample for perf
      if (ok && (gx + gz) % 3 !== 0) continue;
      const m = new THREE.Mesh(geo, ok ? walk : block);
      m.rotation.x = -Math.PI / 2;
      m.position.set(
        grid.origin[0] + (gx + 0.5) * grid.cellSize,
        0.05,
        grid.origin[1] + (gz + 0.5) * grid.cellSize,
      );
      group.add(m);
    }
  }
}
