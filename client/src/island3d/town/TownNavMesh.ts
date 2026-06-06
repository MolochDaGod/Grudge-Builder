/**
 * TownNavMesh — lightweight A* grid pathfinding for town NPC movement.
 *
 * Builds a walkable grid from the town's navmesh config:
 *   - bounds define the walkable area
 *   - obstacles carve out impassable cells
 *   - cellSize controls grid resolution
 *
 * If a NavMesh mesh was extracted from the GLB (TownSceneLoader),
 * it can be used for more precise walkability via raycasting.
 * Otherwise, the flat-grid approach works well for placeholder towns.
 */

import * as THREE from 'three';
import type { TownNavMeshConfig } from '@shared/definitions/factionTowns';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NavGrid {
  /** Grid width (cells) */
  width: number;
  /** Grid height (cells) */
  height: number;
  /** Cell size in world units */
  cellSize: number;
  /** World-space origin (minX, minZ) */
  origin: [number, number];
  /** Walkability grid: true = walkable */
  cells: boolean[];
}

export interface PathResult {
  /** Ordered list of world-space positions */
  waypoints: THREE.Vector3[];
  /** Whether a path was found */
  found: boolean;
}

// ── Grid Builder ─────────────────────────────────────────────────────────────

export function buildNavGrid(config: TownNavMeshConfig): NavGrid {
  const [minX, minZ, maxX, maxZ] = config.bounds;
  const { cellSize, obstacles } = config;

  const width = Math.ceil((maxX - minX) / cellSize);
  const height = Math.ceil((maxZ - minZ) / cellSize);
  const cells = new Array<boolean>(width * height).fill(true);

  // Carve out obstacles
  for (const [cx, cz, halfW, halfD] of obstacles) {
    const obsMinX = cx - halfW;
    const obsMaxX = cx + halfW;
    const obsMinZ = cz - halfD;
    const obsMaxZ = cz + halfD;

    const gridMinX = Math.floor((obsMinX - minX) / cellSize);
    const gridMaxX = Math.ceil((obsMaxX - minX) / cellSize);
    const gridMinZ = Math.floor((obsMinZ - minZ) / cellSize);
    const gridMaxZ = Math.ceil((obsMaxZ - minZ) / cellSize);

    for (let gz = gridMinZ; gz < gridMaxZ; gz++) {
      for (let gx = gridMinX; gx < gridMaxX; gx++) {
        if (gx >= 0 && gx < width && gz >= 0 && gz < height) {
          cells[gz * width + gx] = false;
        }
      }
    }
  }

  return { width, height, cellSize, origin: [minX, minZ], cells };
}

// ── Coordinate Conversion ────────────────────────────────────────────────────

function worldToGrid(grid: NavGrid, worldX: number, worldZ: number): [number, number] {
  const gx = Math.floor((worldX - grid.origin[0]) / grid.cellSize);
  const gz = Math.floor((worldZ - grid.origin[1]) / grid.cellSize);
  return [
    Math.max(0, Math.min(grid.width - 1, gx)),
    Math.max(0, Math.min(grid.height - 1, gz)),
  ];
}

function gridToWorld(grid: NavGrid, gx: number, gz: number): THREE.Vector3 {
  return new THREE.Vector3(
    grid.origin[0] + (gx + 0.5) * grid.cellSize,
    0,
    grid.origin[1] + (gz + 0.5) * grid.cellSize,
  );
}

function isWalkable(grid: NavGrid, gx: number, gz: number): boolean {
  if (gx < 0 || gx >= grid.width || gz < 0 || gz >= grid.height) return false;
  return grid.cells[gz * grid.width + gx];
}

// ── A* Pathfinding ───────────────────────────────────────────────────────────

interface AStarNode {
  gx: number;
  gz: number;
  g: number;  // cost from start
  h: number;  // heuristic to goal
  f: number;  // g + h
  parent: AStarNode | null;
}

const NEIGHBORS: [number, number][] = [
  [0, -1], [0, 1], [-1, 0], [1, 0],    // cardinal
  [-1, -1], [-1, 1], [1, -1], [1, 1],  // diagonal
];

const SQRT2 = Math.SQRT2;

/**
 * Find a path from start to goal using A* on the nav grid.
 * Returns world-space waypoints. Max 2000 iterations to avoid stalls.
 */
export function findPath(
  grid: NavGrid,
  startWorld: THREE.Vector3,
  goalWorld: THREE.Vector3,
): PathResult {
  const [sx, sz] = worldToGrid(grid, startWorld.x, startWorld.z);
  const [gx, gz] = worldToGrid(grid, goalWorld.x, goalWorld.z);

  // Trivial case
  if (sx === gx && sz === gz) {
    return { waypoints: [goalWorld.clone()], found: true };
  }

  // Goal not walkable — find nearest walkable cell
  if (!isWalkable(grid, gx, gz)) {
    return { waypoints: [], found: false };
  }

  const openSet = new Map<string, AStarNode>();
  const closedSet = new Set<string>();

  const key = (x: number, z: number) => `${x},${z}`;
  const heuristic = (ax: number, az: number) => {
    const dx = Math.abs(ax - gx);
    const dz = Math.abs(az - gz);
    return dx + dz + (SQRT2 - 2) * Math.min(dx, dz); // octile distance
  };

  const startNode: AStarNode = { gx: sx, gz: sz, g: 0, h: heuristic(sx, sz), f: 0, parent: null };
  startNode.f = startNode.h;
  openSet.set(key(sx, sz), startNode);

  let iterations = 0;
  const MAX_ITERATIONS = 2000;

  while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Pick lowest f
    let current: AStarNode | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) current = node;
    }
    if (!current) break;

    // Goal reached
    if (current.gx === gx && current.gz === gz) {
      return { waypoints: reconstructPath(grid, current), found: true };
    }

    const cKey = key(current.gx, current.gz);
    openSet.delete(cKey);
    closedSet.add(cKey);

    // Expand neighbors
    for (const [dx, dz] of NEIGHBORS) {
      const nx = current.gx + dx;
      const nz = current.gz + dz;
      const nKey = key(nx, nz);

      if (closedSet.has(nKey)) continue;
      if (!isWalkable(grid, nx, nz)) continue;

      // Diagonal movement blocked if either cardinal neighbor is blocked
      if (dx !== 0 && dz !== 0) {
        if (!isWalkable(grid, current.gx + dx, current.gz) ||
            !isWalkable(grid, current.gx, current.gz + dz)) continue;
      }

      const moveCost = (dx !== 0 && dz !== 0) ? SQRT2 : 1;
      const tentativeG = current.g + moveCost;

      const existing = openSet.get(nKey);
      if (existing && tentativeG >= existing.g) continue;

      const newNode: AStarNode = {
        gx: nx, gz: nz,
        g: tentativeG,
        h: heuristic(nx, nz),
        f: tentativeG + heuristic(nx, nz),
        parent: current,
      };
      openSet.set(nKey, newNode);
    }
  }

  return { waypoints: [], found: false };
}

function reconstructPath(grid: NavGrid, endNode: AStarNode): THREE.Vector3[] {
  const path: THREE.Vector3[] = [];
  let current: AStarNode | null = endNode;
  while (current) {
    path.unshift(gridToWorld(grid, current.gx, current.gz));
    current = current.parent;
  }
  return path;
}

// ── Utility ──────────────────────────────────────────────────────────────────

/**
 * Check if a world position is walkable on the nav grid.
 */
export function isPositionWalkable(grid: NavGrid, worldX: number, worldZ: number): boolean {
  const [gx, gz] = worldToGrid(grid, worldX, worldZ);
  return isWalkable(grid, gx, gz);
}

/**
 * Clamp a world position to the nearest walkable cell.
 */
export function clampToWalkable(grid: NavGrid, worldX: number, worldZ: number): THREE.Vector3 {
  const [gx, gz] = worldToGrid(grid, worldX, worldZ);
  if (isWalkable(grid, gx, gz)) {
    return new THREE.Vector3(worldX, 0, worldZ);
  }

  // BFS for nearest walkable cell
  const visited = new Set<string>();
  const queue: [number, number][] = [[gx, gz]];
  visited.add(`${gx},${gz}`);

  while (queue.length > 0) {
    const [cx, cz] = queue.shift()!;
    for (const [dx, dz] of NEIGHBORS) {
      const nx = cx + dx;
      const nz = cz + dz;
      const k = `${nx},${nz}`;
      if (visited.has(k)) continue;
      visited.add(k);
      if (isWalkable(grid, nx, nz)) {
        return gridToWorld(grid, nx, nz);
      }
      queue.push([nx, nz]);
    }
  }

  return new THREE.Vector3(worldX, 0, worldZ); // fallback
}

/**
 * Debug: create a visual mesh of the nav grid (green = walkable, red = blocked).
 */
export function createNavGridDebugMesh(grid: NavGrid): THREE.Group {
  const group = new THREE.Group();
  group.name = 'navgrid_debug';

  const walkMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.15 });
  const blockMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.25 });
  const cellGeo = new THREE.PlaneGeometry(grid.cellSize * 0.9, grid.cellSize * 0.9);
  cellGeo.rotateX(-Math.PI / 2);

  for (let gz = 0; gz < grid.height; gz++) {
    for (let gx = 0; gx < grid.width; gx++) {
      const walkable = grid.cells[gz * grid.width + gx];
      const mesh = new THREE.Mesh(cellGeo, walkable ? walkMat : blockMat);
      const worldPos = gridToWorld(grid, gx, gz);
      mesh.position.copy(worldPos);
      mesh.position.y = 0.02;
      group.add(mesh);
    }
  }

  return group;
}
