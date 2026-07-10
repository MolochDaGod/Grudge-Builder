/**
 * BoardGrid3D — game-board XY grid on the home island.
 *
 * Snaps heroes / props to cell centers, draws subtle lines + A1-style labels
 * so placement matches “square on the map” fantasy (not floating over ocean).
 */
import * as THREE from 'three';
import { getTerrainHeightAt } from './IslandTerrainGenerator';

export const BOARD_CELL_M = 4;

export interface BoardGridOptions {
  worldSizeM: number;
  cellM?: number;
  /** Label every N cells (performance) */
  labelEvery?: number;
  showLabels?: boolean;
  showLines?: boolean;
  lineColor?: number;
  lineOpacity?: number;
}

export interface BoardCell {
  /** 0-based column (X axis east) */
  col: number;
  /** 0-based row (Z axis south) */
  row: number;
  /** Chess-like label e.g. D12 */
  label: string;
  /** World-space center XZ on flat board; Y sampled from terrain when mesh given */
  x: number;
  z: number;
}

function colLabel(col: number): string {
  // 0 → A, 25 → Z, 26 → AA …
  let n = col;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function worldToBoardCell(
  x: number,
  z: number,
  worldSizeM: number,
  cellM = BOARD_CELL_M,
): BoardCell {
  const half = worldSizeM / 2;
  const col = Math.floor((x + half) / cellM);
  const row = Math.floor((z + half) / cellM);
  const max = Math.floor(worldSizeM / cellM) - 1;
  const c = Math.max(0, Math.min(max, col));
  const r = Math.max(0, Math.min(max, row));
  const cx = -half + (c + 0.5) * cellM;
  const cz = -half + (r + 0.5) * cellM;
  return {
    col: c,
    row: r,
    label: `${colLabel(c)}${r + 1}`,
    x: cx,
    z: cz,
  };
}

/** Snap world XZ to board cell center */
export function snapToBoardCell(
  x: number,
  z: number,
  worldSizeM: number,
  cellM = BOARD_CELL_M,
): { x: number; z: number; cell: BoardCell } {
  const cell = worldToBoardCell(x, z, worldSizeM, cellM);
  return { x: cell.x, z: cell.z, cell };
}

function makeLabelSprite(text: string, color = '#f6c945'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(8, 12, 112, 40);
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(6, 3, 1);
  sp.renderOrder = 12;
  return sp;
}

/**
 * Build board grid helper group. Call after terrain exists; samples Y per vertex.
 */
export function createBoardGrid3D(
  terrainMesh: THREE.Mesh,
  opts: BoardGridOptions,
): THREE.Group {
  const worldSizeM = opts.worldSizeM;
  const cellM = opts.cellM ?? BOARD_CELL_M;
  const labelEvery = opts.labelEvery ?? 8;
  const showLabels = opts.showLabels !== false;
  const showLines = opts.showLines !== false;
  const half = worldSizeM / 2;
  const n = Math.floor(worldSizeM / cellM);

  const root = new THREE.Group();
  root.name = 'board_grid_xy';

  if (showLines) {
    const pts: number[] = [];
    // Vertical lines (constant X)
    for (let c = 0; c <= n; c++) {
      const x = -half + c * cellM;
      for (let r = 0; r < n; r++) {
        const z0 = -half + r * cellM;
        const z1 = z0 + cellM;
        const y0 = (getTerrainHeightAt(terrainMesh, x, z0) ?? 2) + 0.08;
        const y1 = (getTerrainHeightAt(terrainMesh, x, z1) ?? 2) + 0.08;
        pts.push(x, y0, z0, x, y1, z1);
      }
    }
    // Horizontal lines (constant Z)
    for (let r = 0; r <= n; r++) {
      const z = -half + r * cellM;
      for (let c = 0; c < n; c++) {
        const x0 = -half + c * cellM;
        const x1 = x0 + cellM;
        const y0 = (getTerrainHeightAt(terrainMesh, x0, z) ?? 2) + 0.08;
        const y1 = (getTerrainHeightAt(terrainMesh, x1, z) ?? 2) + 0.08;
        pts.push(x0, y0, z, x1, y1, z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: opts.lineColor ?? 0xc9a227,
        transparent: true,
        opacity: opts.lineOpacity ?? 0.18,
        depthWrite: false,
      }),
    );
    lines.name = 'board_grid_lines';
    lines.renderOrder = 5;
    root.add(lines);
  }

  if (showLabels) {
    const labels = new THREE.Group();
    labels.name = 'board_grid_labels';
    for (let c = 0; c < n; c += labelEvery) {
      for (let r = 0; r < n; r += labelEvery) {
        const cell = worldToBoardCell(
          -half + (c + 0.5) * cellM,
          -half + (r + 0.5) * cellM,
          worldSizeM,
          cellM,
        );
        const y = (getTerrainHeightAt(terrainMesh, cell.x, cell.z) ?? 2) + 1.2;
        const sp = makeLabelSprite(cell.label);
        sp.position.set(cell.x, y, cell.z);
        labels.add(sp);
      }
    }
    root.add(labels);
  }

  // Origin marker at camp-ish center (0,0 board mid)
  const mid = worldToBoardCell(0, 0, worldSizeM, cellM);
  const midY = (getTerrainHeightAt(terrainMesh, mid.x, mid.z) ?? 2) + 0.2;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(cellM * 0.35, cellM * 0.42, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf6c945,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(mid.x, midY, mid.z);
  ring.name = 'board_origin_ring';
  root.add(ring);

  return root;
}

/**
 * Plant feet on terrain at snapped board cell.
 */
export function boardSpawnPosition(
  terrainMesh: THREE.Mesh,
  preferredX: number,
  preferredZ: number,
  worldSizeM: number,
  cellM = BOARD_CELL_M,
): { position: THREE.Vector3; cell: BoardCell } {
  const { x, z, cell } = snapToBoardCell(preferredX, preferredZ, worldSizeM, cellM);
  const y = getTerrainHeightAt(terrainMesh, x, z) ?? 2;
  return {
    position: new THREE.Vector3(x, y, z),
    cell,
  };
}
