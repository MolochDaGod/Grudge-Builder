/**
 * Island A* Pathfinder
 * Operates on the 200×200 tile grid, returns paths in world coordinates (0-100).
 */

import type { IslandTileGrid } from './islandTileGrid';
import { GRID_CONFIG } from './islandTileGrid';

export interface WorldPos {
  x: number; // 0-100
  y: number; // 0-100
}

// ── Coordinate conversion ─────────────────────────────────────

export function worldToTileCoord(wx: number, wy: number): { tx: number; ty: number } {
  return {
    tx: Math.min(GRID_CONFIG.gridWidth - 1, Math.max(0, Math.round((wx / 100) * (GRID_CONFIG.gridWidth - 1)))),
    ty: Math.min(GRID_CONFIG.gridHeight - 1, Math.max(0, Math.round((wy / 100) * (GRID_CONFIG.gridHeight - 1)))),
  };
}

export function tileToWorldCoord(tx: number, ty: number): WorldPos {
  return {
    x: (tx / (GRID_CONFIG.gridWidth - 1)) * 100,
    y: (ty / (GRID_CONFIG.gridHeight - 1)) * 100,
  };
}

// ── Binary min-heap ───────────────────────────────────────────

interface HeapNode { key: number; f: number; }

class MinHeap {
  private data: HeapNode[] = [];
  private posMap = new Map<number, number>(); // key → index in data

  get size() { return this.data.length; }

  push(key: number, f: number) {
    const idx = this.data.length;
    this.data.push({ key, f });
    this.posMap.set(key, idx);
    this.bubbleUp(idx);
  }

  pop(): number | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    this.posMap.delete(top.key);
    if (this.data.length > 0) {
      this.data[0] = last;
      this.posMap.set(last.key, 0);
      this.sinkDown(0);
    }
    return top.key;
  }

  has(key: number): boolean {
    return this.posMap.has(key);
  }

  decreaseKey(key: number, newF: number) {
    const idx = this.posMap.get(key);
    if (idx === undefined) return;
    this.data[idx].f = newF;
    this.bubbleUp(idx);
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f >= this.data[parent].f) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  private sinkDown(i: number) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  private swap(a: number, b: number) {
    const tmp = this.data[a];
    this.data[a] = this.data[b];
    this.data[b] = tmp;
    this.posMap.set(this.data[a].key, a);
    this.posMap.set(this.data[b].key, b);
  }
}

// ── 8-directional neighbors ───────────────────────────────────

const DIRS = [
  { dx: -1, dy: 0, cost: 1 },
  { dx: 1, dy: 0, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: -1, dy: -1, cost: 1.414 },
  { dx: 1, dy: -1, cost: 1.414 },
  { dx: -1, dy: 1, cost: 1.414 },
  { dx: 1, dy: 1, cost: 1.414 },
];

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  // Octile distance (consistent with 8-dir movement)
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}

function tileKey(tx: number, ty: number): number {
  return ty * GRID_CONFIG.gridWidth + tx;
}

// ── Find nearest walkable tile ────────────────────────────────

export function findNearestWalkable(grid: IslandTileGrid, tx: number, ty: number): { tx: number; ty: number } | null {
  if (tx >= 0 && tx < grid.width && ty >= 0 && ty < grid.height && grid.tiles[ty][tx].isWalkable) {
    return { tx, ty };
  }

  // BFS expanding outward
  const visited = new Set<number>();
  const queue: { tx: number; ty: number }[] = [{ tx, ty }];
  visited.add(tileKey(tx, ty));

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const dir of DIRS) {
      const nx = curr.tx + dir.dx;
      const ny = curr.ty + dir.dy;
      if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue;
      const key = tileKey(nx, ny);
      if (visited.has(key)) continue;
      visited.add(key);
      if (grid.tiles[ny][nx].isWalkable) return { tx: nx, ty: ny };
      if (visited.size > 2000) return null; // safety limit
      queue.push({ tx: nx, ty: ny });
    }
  }
  return null;
}

// ── A* pathfinding ────────────────────────────────────────────

/**
 * Find a walkable path between two world positions (0-100 coords).
 * Returns an array of world-coordinate waypoints, simplified to reduce
 * point count. Returns empty array if no path exists.
 */
export function findPath(
  grid: IslandTileGrid,
  from: WorldPos,
  to: WorldPos,
  maxIterations: number = 20000,
): WorldPos[] {
  const startTile = worldToTileCoord(from.x, from.y);
  const endTile = worldToTileCoord(to.x, to.y);

  // Snap start/end to nearest walkable tile if needed
  const walkableStart = findNearestWalkable(grid, startTile.tx, startTile.ty);
  const walkableEnd = findNearestWalkable(grid, endTile.tx, endTile.ty);
  if (!walkableStart || !walkableEnd) return [];

  const sx = walkableStart.tx;
  const sy = walkableStart.ty;
  const ex = walkableEnd.tx;
  const ey = walkableEnd.ty;

  if (sx === ex && sy === ey) return [to];

  const w = grid.width;
  const h = grid.height;
  const startKey = tileKey(sx, sy);
  const endKey = tileKey(ex, ey);

  const gScore = new Float32Array(w * h).fill(Infinity);
  const cameFrom = new Int32Array(w * h).fill(-1);

  gScore[startKey] = 0;

  const open = new MinHeap();
  open.push(startKey, heuristic(sx, sy, ex, ey));

  let iterations = 0;

  while (open.size > 0 && iterations < maxIterations) {
    iterations++;
    const currentKey = open.pop()!;
    if (currentKey === endKey) break;

    const cx = currentKey % w;
    const cy = Math.floor(currentKey / w);
    const currentG = gScore[currentKey];

    for (const dir of DIRS) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (!grid.tiles[ny][nx].isWalkable) continue;

      // For diagonals, check that both cardinal tiles are walkable (no corner-cutting)
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!grid.tiles[cy][cx + dir.dx]?.isWalkable || !grid.tiles[cy + dir.dy]?.[cx]?.isWalkable) {
          continue;
        }
      }

      const nKey = tileKey(nx, ny);
      const tentativeG = currentG + dir.cost;

      if (tentativeG < gScore[nKey]) {
        gScore[nKey] = tentativeG;
        cameFrom[nKey] = currentKey;
        const f = tentativeG + heuristic(nx, ny, ex, ey);
        if (open.has(nKey)) {
          open.decreaseKey(nKey, f);
        } else {
          open.push(nKey, f);
        }
      }
    }
  }

  // Reconstruct path
  if (cameFrom[endKey] === -1 && startKey !== endKey) return []; // no path

  const tilePath: { tx: number; ty: number }[] = [];
  let current = endKey;
  while (current !== -1) {
    tilePath.push({ tx: current % w, ty: Math.floor(current / w) });
    current = cameFrom[current];
  }
  tilePath.reverse();

  // Simplify: keep only direction-change waypoints + start/end
  const simplified = simplifyPath(tilePath);

  // Convert to world coords
  return simplified.map(p => tileToWorldCoord(p.tx, p.ty));
}

/** Remove redundant waypoints where direction doesn't change */
function simplifyPath(path: { tx: number; ty: number }[]): { tx: number; ty: number }[] {
  if (path.length <= 2) return path;

  const result = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    const dx1 = curr.tx - prev.tx;
    const dy1 = curr.ty - prev.ty;
    const dx2 = next.tx - curr.tx;
    const dy2 = next.ty - curr.ty;
    if (dx1 !== dx2 || dy1 !== dy2) {
      result.push(curr);
    }
  }
  result.push(path[path.length - 1]);
  return result;
}
