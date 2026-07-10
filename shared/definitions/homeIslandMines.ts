/**
 * Home-island mine seed generation — Craftpix mine entrances.
 * At least 2 mines per island, deterministic from island seed.
 * Character enters mine → 4s blackout → bag of miner/engineer/mystic loot.
 */
import { HOME_ISLAND_WORLD_SIZE_M, hashSeedString, seededRandomFromString } from './homeIslandSeed';
import { warlordsMineEntrances } from './warlordsEraAssets';

export const HOME_ISLAND_MINE_MIN_COUNT = 2;
export const HOME_ISLAND_MINE_MAX_COUNT = 4;
/** Seconds hero is "inside" the mine (hidden) before loot bag */
export const MINE_RUN_DURATION_SEC = 4;
/** Interact radius meters */
export const MINE_INTERACT_RANGE_M = 6;

export type MineLootProfession = 'miner' | 'engineer' | 'mystic';

export interface MineLootItem {
  itemId: string;
  name: string;
  quantity: number;
  profession: MineLootProfession;
  tier: number;
}

export interface HomeIslandMineSeed {
  id: string;
  /** Index into warlords mine entrance variants 0–3 */
  variantIndex: number;
  modelPath: string;
  /** World XZ */
  x: number;
  z: number;
  rotationY: number;
  scale: number;
  /** Loot tier bias 1–5 */
  tier: number;
}

const MINER_LOOT = [
  { itemId: 'stone_chunk', name: 'Stone Chunk', profession: 'miner' as const, tier: 1 },
  { itemId: 'coal_ore', name: 'Coal Ore', profession: 'miner' as const, tier: 1 },
  { itemId: 'iron_ore', name: 'Iron Ore', profession: 'miner' as const, tier: 2 },
  { itemId: 'copper_ore', name: 'Copper Ore', profession: 'miner' as const, tier: 2 },
  { itemId: 'gold_ore', name: 'Gold Ore', profession: 'miner' as const, tier: 3 },
  { itemId: 'raw_gem', name: 'Raw Gem', profession: 'miner' as const, tier: 3 },
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

/**
 * Place ≥2 mines outside camp clear zone, prefer rock/high ground ring.
 */
export function generateHomeIslandMines(
  seed: string,
  opts?: {
    worldSizeM?: number;
    campX?: number;
    campZ?: number;
    campClearRadiusM?: number;
    minCount?: number;
  },
): HomeIslandMineSeed[] {
  const world = opts?.worldSizeM ?? HOME_ISLAND_WORLD_SIZE_M;
  const half = world / 2;
  const campX = opts?.campX ?? 0;
  const campZ = opts?.campZ ?? 0;
  const campR = opts?.campClearRadiusM ?? 90;
  const minCount = Math.max(HOME_ISLAND_MINE_MIN_COUNT, opts?.minCount ?? HOME_ISLAND_MINE_MIN_COUNT);
  const rng = seededRandomFromString(`${seed}_mines_v1`);
  const entrances = warlordsMineEntrances();
  const count =
    minCount + Math.floor(rng() * (HOME_ISLAND_MINE_MAX_COUNT - minCount + 1));

  const mines: HomeIslandMineSeed[] = [];
  let attempts = 0;
  while (mines.length < count && attempts < 80) {
    attempts++;
    // Prefer mid-island hills (not shore, not camp)
    const ang = rng() * Math.PI * 2;
    const dist = campR + 40 + rng() * (half * 0.55);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    if (Math.abs(x) > half * 0.88 || Math.abs(z) > half * 0.88) continue;
    if (Math.hypot(x - campX, z - campZ) < campR + 25) continue;
    // Separation from other mines
    if (mines.some((m) => Math.hypot(m.x - x, m.z - z) < 55)) continue;

    const variantIndex = Math.floor(rng() * entrances.length) % entrances.length;
    const ent = entrances[variantIndex]!;
    mines.push({
      id: `mine_${seed.slice(0, 8)}_${mines.length}`,
      variantIndex,
      modelPath: ent.path,
      x,
      z,
      rotationY: rng() * Math.PI * 2,
      scale: 1,
      tier: 1 + Math.floor(rng() * 3),
    });
  }

  // Guarantee min 2 even if placement tight
  while (mines.length < HOME_ISLAND_MINE_MIN_COUNT) {
    const i = mines.length;
    const ent = entrances[i % entrances.length]!;
    mines.push({
      id: `mine_fallback_${i}`,
      variantIndex: i % entrances.length,
      modelPath: ent.path,
      x: (i === 0 ? -1 : 1) * (campR + 70),
      z: -campR * 0.4,
      rotationY: i * 1.2,
      scale: 1,
      tier: 1,
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

  // Miner primary, engineer secondary, mystic rarer
  pick(MINER_LOOT, 3 + Math.floor(rng() * 2));
  pick(ENGINEER_LOOT, 1 + Math.floor(rng() * 2));
  if (rng() > 0.35) pick(MYSTIC_LOOT, 1 + Math.floor(rng() * 2));

  return bag;
}

export function mineSeedDocHash(seed: string): number {
  return hashSeedString(`mines:${seed}`);
}
