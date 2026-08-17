/**
 * Boss-arena play SSOT — SI size + surface layers for Hoth / woods / desert / lava.
 *
 * Extends worldSurfaceLayers (terrain / water / lava / column). Not a second physics system.
 * Runtime bake: island3d/zone/prepareBossArenaPlay.ts → PhysicsWorld + BVH walk collider.
 */
import {
  WORLD_SURFACE,
  tagSurfaceMesh,
  type WorldSurfaceLayer,
} from './worldSurfaceLayers';

/** Playable XZ band (metres). Author SI stays; only 100× / tiny maps are rescaled. */
export const BOSS_ARENA_SIZE = {
  humanHeightM: WORLD_SURFACE.humanHeightM,
  xzMinM: 28,
  xzMaxM: 140,
  xzTargetM: 64,
  /** Above this, treat as cm-as-m (100×) */
  xzCmAsM: 400,
  yPlant: true,
} as const;

export type BossArenaLayer = Extract<
  WorldSurfaceLayer,
  'terrain' | 'water' | 'lava' | 'seafloor' | 'column' | 'building' | 'ignore'
>;

export const BOSS_ARENA_WALK_LAYERS: ReadonlySet<BossArenaLayer> = new Set([
  'terrain',
  'lava',
  'seafloor',
]);

export const BOSS_ARENA_SOLID_LAYERS: ReadonlySet<BossArenaLayer> = new Set([
  'terrain',
  'lava',
  'seafloor',
  'column',
  'building',
]);

export const BOSS_ARENA_SENSOR_LAYERS: ReadonlySet<BossArenaLayer> = new Set([
  'water',
  'lava',
]);

/** Classify a mesh by name + material (desert WalkableFloor / Hoth Water / IceColumn / lava base). */
export function classifyBossArenaMesh(label: string, size?: { x: number; y: number; z: number }): BossArenaLayer {
  const s = String(label || '').toLowerCase();
  if (/sky|skydome|skybox|cloud|atmosphere|perspective|ortographic|camera|light/.test(s)) {
    return 'ignore';
  }
  if (/lava|magma|molten|ember/.test(s)) return 'lava';
  if (/water|ocean|sea|pond|river|pool/.test(s)) return 'water';
  if (/seafloor|groundunder|lower_bottom|bottom_main/.test(s)) return 'seafloor';
  if (/column|pillar|collumn|coloumn/.test(s)) return 'column';
  if (/wall|door|border|borde|spike|trap|outer/.test(s)) return 'building';
  if (
    /walkable|floor|ground|platform|terrain|base_main|main_base|sand|ice_block|central_platform/.test(
      s,
    )
  ) {
    return 'terrain';
  }
  if (/rock|stone|ice(?!column)/.test(s)) return 'terrain';

  if (size) {
    const xz = Math.max(size.x, size.z, 0.001);
    const flat = size.y < xz * 0.28;
    const tall = size.y > xz * 0.7;
    if (flat) return 'terrain';
    if (tall) return 'column';
  }
  return 'terrain';
}

export function colliderRoleForArenaLayer(
  layer: BossArenaLayer,
): 'ground' | 'wall' | 'ice' | 'sensor_trigger' | null {
  if (layer === 'ignore') return null;
  if (layer === 'water') return 'sensor_trigger';
  if (layer === 'column' || layer === 'building') return 'wall';
  if (layer === 'lava') return 'ground';
  return 'ground';
}

export interface ArenaSizeResult {
  scale: number;
  xzM: number;
  yM: number;
  planted: boolean;
  reason: 'si_ok' | 'cm_as_m' | 'upscale' | 'downscale';
}

/**
 * Plant min.y ≈ 0. Scale only if the XZ span is outside the playable SI band.
 */
export function decideArenaScale(xzM: number, targetExtentM = BOSS_ARENA_SIZE.xzTargetM): ArenaSizeResult {
  const xz = Math.max(0.01, xzM);
  if (xz >= BOSS_ARENA_SIZE.xzCmAsM) {
    return { scale: 0.01, xzM: xz * 0.01, yM: 0, planted: true, reason: 'cm_as_m' };
  }
  if (xz < 12) {
    const s = targetExtentM / xz;
    return { scale: s, xzM: targetExtentM, yM: 0, planted: true, reason: 'upscale' };
  }
  if (xz > BOSS_ARENA_SIZE.xzMaxM * 1.6) {
    const s = targetExtentM / xz;
    return { scale: s, xzM: targetExtentM, yM: 0, planted: true, reason: 'downscale' };
  }
  return { scale: 1, xzM: xz, yM: 0, planted: true, reason: 'si_ok' };
}

export function tagBossArenaMesh(
  obj: { userData: Record<string, unknown> },
  layer: BossArenaLayer,
): void {
  obj.userData.grudgeLayer = layer;
  obj.userData.bossArenaLayer = layer;
  tagSurfaceMesh(obj, layer);
}
