/**
 * ShovelTerrainSculptor — Valheim-like terrain height editing with the harvest shovel.
 *
 * ThreeTerrain stores ground in mesh-local XY and height in Z (scene rotated −90° X).
 * Brush raises / lowers / levels vertices with a smooth radial falloff.
 */
import * as THREE from 'three';

export type ShovelSculptMode = 'raise' | 'lower' | 'level';

export interface ShovelSculptOptions {
  /** Brush radius in meters (ground plane). */
  radius?: number;
  /** Peak height delta per stroke (raise/lower). */
  strength?: number;
  /** Soft edge fraction of radius (0–1). */
  feather?: number;
  /** Clamp absolute height (mesh-local Z). */
  minHeight?: number;
  maxHeight?: number;
  /** Level mode target height; if omitted, uses average under brush. */
  levelHeight?: number;
}

export interface ShovelSculptResult {
  ok: boolean;
  mode: ShovelSculptMode;
  center: THREE.Vector3;
  verticesTouched: number;
  deltaApplied: number;
}

/** 2 m wide circle → radius 1 m (shared with hoe / farm ground tools). */
const DEFAULTS = {
  radius: 1.0,
  strength: 0.45,
  feather: 0.4,
  minHeight: -80,
  maxHeight: 280,
};

const _localHit = new THREE.Vector3();

/**
 * Convert a world-space surface hit into mesh-local geometry coords.
 * Geometry: X/Y = ground plane, Z = height.
 */
export function worldHitToTerrainLocal(
  terrainMesh: THREE.Mesh,
  worldPoint: THREE.Vector3,
  out = _localHit,
): THREE.Vector3 {
  return terrainMesh.worldToLocal(out.copy(worldPoint));
}

/**
 * Smooth falloff weight (1 at center → 0 at radius). Cosine-style soft edge.
 */
function brushWeight(dist: number, radius: number, feather: number): number {
  if (dist >= radius) return 0;
  const hard = radius * (1 - Math.max(0.05, Math.min(0.95, feather)));
  if (dist <= hard) return 1;
  const t = (dist - hard) / Math.max(0.001, radius - hard);
  // Smoothstep then cosine for Valheim-ish mound
  const s = t * t * (3 - 2 * t);
  return 0.5 * (1 + Math.cos(Math.PI * s));
}

/**
 * Apply one shovel stroke at a world-space hit point on the terrain mesh.
 */
export function sculptTerrainAt(
  terrainMesh: THREE.Mesh,
  worldHit: THREE.Vector3,
  mode: ShovelSculptMode,
  options: ShovelSculptOptions = {},
): ShovelSculptResult {
  const radius = options.radius ?? DEFAULTS.radius;
  const strength = options.strength ?? DEFAULTS.strength;
  const feather = options.feather ?? DEFAULTS.feather;
  const minH = options.minHeight ?? DEFAULTS.minHeight;
  const maxH = options.maxHeight ?? DEFAULTS.maxHeight;

  const pos = terrainMesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
  if (!pos || pos.count < 3) {
    return { ok: false, mode, center: worldHit.clone(), verticesTouched: 0, deltaApplied: 0 };
  }

  const local = worldHitToTerrainLocal(terrainMesh, worldHit);
  const cx = local.x;
  const cy = local.y;
  const radiusSq = radius * radius;

  // Level mode: average height under brush if no explicit target
  let targetLevel = options.levelHeight;
  if (mode === 'level' && targetLevel === undefined) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - cx;
      const dy = pos.getY(i) - cy;
      if (dx * dx + dy * dy > radiusSq) continue;
      sum += pos.getZ(i);
      n++;
    }
    targetLevel = n > 0 ? sum / n : local.z;
  }

  let touched = 0;
  let maxDelta = 0;
  const sign = mode === 'raise' ? 1 : mode === 'lower' ? -1 : 0;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const dx = vx - cx;
    const dy = vy - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq > radiusSq) continue;

    const dist = Math.sqrt(distSq);
    const w = brushWeight(dist, radius, feather);
    if (w <= 0.001) continue;

    const current = pos.getZ(i);
    let next = current;

    if (mode === 'level') {
      const t = targetLevel ?? current;
      next = current + (t - current) * w * Math.min(1, strength / Math.max(0.15, Math.abs(t - current) + 0.15));
    } else {
      next = current + sign * strength * w;
    }

    next = Math.max(minH, Math.min(maxH, next));
    if (Math.abs(next - current) < 1e-5) continue;
    pos.setZ(i, next);
    touched++;
    maxDelta = Math.max(maxDelta, Math.abs(next - current));
  }

  if (touched > 0) {
    pos.needsUpdate = true;
    terrainMesh.geometry.computeVertexNormals();
    // BVH / bounds for raycasts (height samples + next strokes)
    terrainMesh.geometry.computeBoundingSphere();
    terrainMesh.geometry.computeBoundingBox();
  }

  return {
    ok: touched > 0,
    mode,
    center: worldHit.clone(),
    verticesTouched: touched,
    deltaApplied: maxDelta,
  };
}

/**
 * Raycast terrain mesh from camera NDC and sculpt if hit.
 */
export function sculptTerrainFromRay(
  terrainMesh: THREE.Mesh,
  raycaster: THREE.Raycaster,
  mode: ShovelSculptMode,
  options?: ShovelSculptOptions,
): ShovelSculptResult | null {
  const hits = raycaster.intersectObject(terrainMesh, true);
  if (hits.length === 0) return null;
  return sculptTerrainAt(terrainMesh, hits[0].point, mode, options);
}

/**
 * Brush presets. Canonical play brush is **2 m wide** (radius 1 m).
 * small/large stay available for editor-style tuning.
 */
export const SHOVEL_BRUSH = {
  /** Canonical Warlords / Valheim ground tool — 2 m diameter */
  standard: { radius: 1.0, strength: 0.45, feather: 0.4 },
  small: { radius: 0.75, strength: 0.35, feather: 0.35 },
  medium: { radius: 1.0, strength: 0.45, feather: 0.4 },
  large: { radius: 1.5, strength: 0.55, feather: 0.45 },
} as const;

/** @deprecated use SHOVEL_BRUSH.standard — kept as alias for 2 m circle */
export const GROUND_TOOL_BRUSH = SHOVEL_BRUSH.standard;
