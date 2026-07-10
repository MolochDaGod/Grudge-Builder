/**
 * Home-island mine seed generation.
 *
 * - Craftpix multi-profession mines (≥1–2)
 * - Ultimate Fantasy RTS **stone quarry** Mine.fbx — miner-only harvestables
 * - Character enters → 4s blackout → loot bag
 */
import { HOME_ISLAND_WORLD_SIZE_M, hashSeedString, seededRandomFromString } from './homeIslandSeed';
import { warlordsMineEntrances } from './warlordsEraAssets';
import {
  UFRTS_STONE_MINE,
  ufrtsModelPath,
} from './ultimateFantasyRtsCatalog';

export const HOME_ISLAND_MINE_MIN_COUNT = 2;
export const HOME_ISLAND_MINE_MAX_COUNT = 4;
/** At least one stone quarry when using UFRTS pack */
export const HOME_ISLAND_STONE_QUARRY_MIN = 1;
/** Seconds hero is "inside" the mine (hidden) before loot bag */
export const MINE_RUN_DURATION_SEC = 4;
/** Interact radius meters */
export const MINE_INTERACT_RANGE_M = 6;

export type MineLootProfession = 'miner' | 'engineer' | 'mystic';

/** World mine kind */
export type MineKind = 'mixed' | 'stone_quarry';

export interface MineLootItem {
  itemId: string;
  name: string;
  quantity: number;
  profession: MineLootProfession;
  tier: number;
}

export interface HomeIslandMineSeed {
  id: string;
  kind: MineKind;
  /** Index into craftpix entrances (mixed only) */
  variantIndex: number;
  modelPath: string;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
  tier: number;
  /** Target fit height m */
  targetHeightM: number;
  label: string;
}

const MINER_LOOT = [
  { itemId: 'stone_chunk', name: 'Stone Chunk', profession: 'miner' as const, tier: 1 },
  { itemId: 'coal_ore', name: 'Coal Ore', profession: 'miner' as const, tier: 1 },
  { itemId: 'iron_ore', name: 'Iron Ore', profession: 'miner' as const, tier: 2 },
  { itemId: 'copper_ore', name: 'Copper Ore', profession: 'miner' as const, tier: 2 },
  { itemId: 'gold_ore', name: 'Gold Ore', profession: 'miner' as const, tier: 3 },
  { itemId: 'raw_gem', name: 'Raw Gem', profession: 'miner' as const, tier: 3 },
];

/** Stone quarry — miner profession only */
const STONE_QUARRY_LOOT = [
  { itemId: 'stone_chunk', name: 'Stone Chunk', profession: 'miner' as const, tier: 1 },
  { itemId: 'rough_granite', name: 'Rough Granite', profession: 'miner' as const, tier: 1 },
  { itemId: 'limestone_block', name: 'Limestone Block', profession: 'miner' as const, tier: 1 },
  { itemId: 'slate_slab', name: 'Slate Slab', profession: 'miner' as const, tier: 2 },
  { itemId: 'marble_chunk', name: 'Marble Chunk', profession: 'miner' as const, tier: 2 },
  { itemId: 'quarry_rubble', name: 'Quarry Rubble', profession: 'miner' as const, tier: 1 },
];

const ENGINEER_LOOT = [
  { itemId: 'scrap_metal', name: 'Scrap Metal', profession: 'engineer' as const, tier: 1 },
  { itemId: 'rusty_bolt', name: 'Rusty Bolt', profession: 'engineer' as const, tier: 1 },
  { itemId: 'gear_fragment', name: 'Gear Fragment', profession: 'engineer' as const, tier: 2 },
  { itemId: 'mineral_slag', name: 'Mineral Slag', profession: 'engineer' as const, tier: 2 },
];

const MYSTIC_LOOT = [
  { itemId: 'arcane_dust', name: 'Arcane Dust', profession: 'mystic' as const, tier: 1 },
  { itemId: 'crystal_shard', name: 'Crystal Shard', profession: 'mystic' as const, tier: 2 },
  { itemId: 'emerald_chip', name: 'Emerald Chip', profession: 'mystic' as const, tier: 2 },
  { itemId: 'diamond_dust', name: 'Diamond Dust', profession: 'mystic' as const, tier: 3 },
];

function placePoint(
  rng: () => number,
  campX: number,
  campZ: number,
  campR: number,
  half: number,
  existing: HomeIslandMineSeed[],
): { x: number; z: number } | null {
  for (let a = 0; a < 40; a++) {
    const ang = rng() * Math.PI * 2;
    const dist = campR + 40 + rng() * (half * 0.55);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    if (Math.abs(x) > half * 0.88 || Math.abs(z) > half * 0.88) continue;
    if (Math.hypot(x - campX, z - campZ) < campR + 25) continue;
    if (existing.some((m) => Math.hypot(m.x - x, m.z - z) < 55)) continue;
    return { x, z };
  }
  return null;
}

/**
 * Place ≥2 mines: at least one stone quarry (UFRTS Mine.fbx) + craftpix mixed.
 */
export function generateHomeIslandMines(
  seed: string,
  opts?: {
    worldSizeM?: number;
    campX?: number;
    campZ?: number;
    campClearRadiusM?: number;
    minCount?: number;
    includeStoneQuarry?: boolean;
  },
): HomeIslandMineSeed[] {
  const world = opts?.worldSizeM ?? HOME_ISLAND_WORLD_SIZE_M;
  const half = world / 2;
  const campX = opts?.campX ?? 0;
  const campZ = opts?.campZ ?? 0;
  const campR = opts?.campClearRadiusM ?? 90;
  const minCount = Math.max(HOME_ISLAND_MINE_MIN_COUNT, opts?.minCount ?? HOME_ISLAND_MINE_MIN_COUNT);
  const includeQuarry = opts?.includeStoneQuarry !== false;
  const rng = seededRandomFromString(`${seed}_mines_v2`);
  const entrances = warlordsMineEntrances();
  const mines: HomeIslandMineSeed[] = [];

  // 1) Stone quarry first (miner-only)
  if (includeQuarry) {
    const pt = placePoint(rng, campX, campZ, campR, half, mines);
    const x = pt?.x ?? campR + 80;
    const z = pt?.z ?? -campR * 0.35;
    mines.push({
      id: `quarry_${seed.slice(0, 8)}_0`,
      kind: 'stone_quarry',
      variantIndex: 0,
      modelPath: ufrtsModelPath(UFRTS_STONE_MINE, true), // prefer GLB after convert
      x,
      z,
      rotationY: rng() * Math.PI * 2,
      scale: 1,
      tier: 1 + Math.floor(rng() * 2),
      targetHeightM: UFRTS_STONE_MINE.targetHeightM,
      label: UFRTS_STONE_MINE.label,
    });
  }

  const count =
    minCount + Math.floor(rng() * (HOME_ISLAND_MINE_MAX_COUNT - minCount + 1));

  let attempts = 0;
  while (mines.length < count && attempts < 80) {
    attempts++;
    const pt = placePoint(rng, campX, campZ, campR, half, mines);
    if (!pt) continue;

    const variantIndex = Math.floor(rng() * entrances.length) % entrances.length;
    const ent = entrances[variantIndex]!;
    mines.push({
      id: `mine_${seed.slice(0, 8)}_${mines.length}`,
      kind: 'mixed',
      variantIndex,
      modelPath: ent.path,
      x: pt.x,
      z: pt.z,
      rotationY: rng() * Math.PI * 2,
      scale: 1,
      tier: 1 + Math.floor(rng() * 3),
      targetHeightM: 5.5 + Math.floor(rng() * 2),
      label: ent.label ?? 'Mine Entrance',
    });
  }

  while (mines.length < HOME_ISLAND_MINE_MIN_COUNT) {
    const i = mines.length;
    const ent = entrances[i % entrances.length]!;
    mines.push({
      id: `mine_fallback_${i}`,
      kind: 'mixed',
      variantIndex: i % entrances.length,
      modelPath: ent.path,
      x: (i === 0 ? -1 : 1) * (campR + 70),
      z: -campR * 0.4,
      rotationY: i * 1.2,
      scale: 1,
      tier: 1,
      targetHeightM: 6,
      label: 'Mine Entrance',
    });
  }

  return mines;
}

/** Roll loot bag after a 4s mine run */
export function rollMineLootBag(
  mine: HomeIslandMineSeed,
  seedExtra = '',
): MineLootItem[] {
  const rng = seededRandomFromString(`${mine.id}_loot_${seedExtra}_${Date.now() % 10000}`);
  const bag: MineLootItem[] = [];

  const pick = <T extends { itemId: string; name: string; profession: MineLootProfession; tier: number }>(
    pool: T[],
    n: number,
  ) => {
    for (let i = 0; i < n; i++) {
      const item = pool[Math.floor(rng() * pool.length)]!;
      if (item.tier > mine.tier + 1) continue;
      bag.push({
        ...item,
        quantity: 1 + Math.floor(rng() * (2 + mine.tier)),
      });
    }
  };

  if (mine.kind === 'stone_quarry') {
    // Miner profession harvestables only
    pick(STONE_QUARRY_LOOT, 4 + Math.floor(rng() * 3));
    return bag;
  }

  pick(MINER_LOOT, 3 + Math.floor(rng() * 2));
  pick(ENGINEER_LOOT, 1 + Math.floor(rng() * 2));
  if (rng() > 0.35) pick(MYSTIC_LOOT, 1 + Math.floor(rng() * 2));

  return bag;
}

export function mineSeedDocHash(seed: string): number {
  return hashSeedString(`mines:${seed}`);
}
