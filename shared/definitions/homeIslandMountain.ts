/**
 * Home-island mountain landmark — one Ultimate Fantasy RTS mountain mesh per island.
 * Complements dungeon triad / event cave; this is the visible mountain massif.
 */
import { HOME_ISLAND_WORLD_SIZE_M, seededRandomFromString } from './homeIslandSeed';
import {
  pickHomeIslandMountain,
  type UfrtsAssetDef,
  ufrtsModelPath,
} from './ultimateFantasyRtsCatalog';

export interface HomeIslandMountainSeed {
  id: string;
  assetId: string;
  label: string;
  modelPath: string;
  targetHeightM: number;
  x: number;
  z: number;
  rotationY: number;
  /** Prefer northern / highland placement */
  region: 'north' | 'northeast' | 'northwest';
}

/**
 * Pick exactly one mountain variant for the island (deterministic).
 * Placed in mountain sector away from camp.
 */
export function generateHomeIslandMountain(
  seed: string,
  opts?: {
    worldSizeM?: number;
    campX?: number;
    campZ?: number;
    campClearRadiusM?: number;
    mountainPercent?: { x: number; y: number };
  },
): HomeIslandMountainSeed {
  const world = opts?.worldSizeM ?? HOME_ISLAND_WORLD_SIZE_M;
  const half = world / 2;
  const campX = opts?.campX ?? 0;
  const campZ = opts?.campZ ?? 0;
  const campR = opts?.campClearRadiusM ?? 90;
  const rng = seededRandomFromString(`${seed}_ufrts_mountain_v1`);
  const asset: UfrtsAssetDef = pickHomeIslandMountain(seed);

  // Prefer north / layout mountain percent when provided
  let x: number;
  let z: number;
  if (opts?.mountainPercent) {
    x = (opts.mountainPercent.x / 100 - 0.5) * world;
    z = (opts.mountainPercent.y / 100 - 0.5) * world;
  } else {
    // Northern highlands bias
    const ang = -Math.PI / 2 + (rng() - 0.5) * 0.9;
    const dist = Math.min(half * 0.62, campR + 120 + rng() * 80);
    x = Math.cos(ang) * dist;
    z = Math.sin(ang) * dist;
  }

  // Keep off camp
  if (Math.hypot(x - campX, z - campZ) < campR + 50) {
    const ang = -Math.PI / 2;
    x = campX + Math.cos(ang) * (campR + 140);
    z = campZ + Math.sin(ang) * (campR + 140);
  }

  // Clamp to island
  x = Math.max(-half * 0.75, Math.min(half * 0.75, x));
  z = Math.max(-half * 0.75, Math.min(half * 0.75, z));

  const region: HomeIslandMountainSeed['region'] =
    x < -40 ? 'northwest' : x > 40 ? 'northeast' : 'north';

  return {
    id: `mtn_${seed.slice(0, 8)}`,
    assetId: asset.id,
    label: asset.label,
    modelPath: ufrtsModelPath(asset, true),
    targetHeightM: asset.targetHeightM,
    x,
    z,
    rotationY: rng() * Math.PI * 2,
    region,
  };
}
