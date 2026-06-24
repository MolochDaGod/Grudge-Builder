/**
 * settlementGenerator — deterministic procedural NPC settlement layouts.
 *
 * Consumed by shared/definitions/zoneServerNodes.ts to populate islands that
 * have `hasSettlement`. Pure + seed-deterministic so the server and client
 * generate identical town layouts from the same island seed.
 */

export type SettlementTier = 'hamlet' | 'village' | 'town' | 'city' | 'fortress';

export interface SettlementBuilding {
  id: string;
  /** Logical building type (drives which model/interior is used). */
  type: string;
  /** Position relative to the island center (x, y, z) in meters. */
  position: [number, number, number];
  /** Y-axis rotation in radians. */
  rotationY: number;
  /** Footprint size (width, depth) in meters. */
  footprint: [number, number];
  /** True for the settlement's safe house (respawn/rest point). */
  isSafeHouse?: boolean;
}

export interface SettlementLayout {
  tier: SettlementTier;
  faction: string;
  buildings: SettlementBuilding[];
  /** ID of the safe house building (null for hamlets). */
  safeHouseId: string | null;
  /** Settlement center relative to the island center (x, y, z). */
  centerPosition: [number, number, number];
  /** Approximate settlement radius in meters. */
  radiusM: number;
}

// ── Seeded RNG (matches zoneServerNodes hashing for cross-consistency) ────────

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Tier / layout tables ─────────────────────────────────────────────────────

const TIER_BY_SIZE: Record<string, SettlementTier> = {
  atoll: 'hamlet',
  small: 'hamlet',
  medium: 'village',
  large: 'town',
  fortress: 'fortress',
};

const TIER_SPEC: Record<SettlementTier, { count: number; radiusM: number; hasSafeHouse: boolean }> = {
  hamlet:   { count: 3,  radiusM: 18, hasSafeHouse: false },
  village:  { count: 6,  radiusM: 30, hasSafeHouse: true },
  town:     { count: 10, radiusM: 45, hasSafeHouse: true },
  city:     { count: 14, radiusM: 60, hasSafeHouse: true },
  fortress: { count: 16, radiusM: 70, hasSafeHouse: true },
};

const BUILDING_TYPES = [
  'house', 'market', 'forge', 'inn', 'barracks',
  'tower', 'well', 'storehouse', 'chapel', 'stable',
];

function pickTier(size: string, difficulty: number): SettlementTier {
  let tier = TIER_BY_SIZE[size] ?? 'village';
  // High-difficulty large islands graduate town -> city.
  if (tier === 'town' && difficulty >= 7) tier = 'city';
  return tier;
}

/**
 * Generate a deterministic settlement layout for an island.
 */
export function generateSettlement(
  islandSeed: string,
  size: string,
  difficulty: number,
  faction: string,
): SettlementLayout {
  const rng = prng(hashSeed(`${islandSeed}:settlement:${faction}`));
  const tier = pickTier(size, difficulty);
  const spec = TIER_SPEC[tier];
  const count = spec.count;
  const radiusM = spec.radiusM;

  const buildings: SettlementBuilding[] = [];
  for (let i = 0; i < count; i++) {
    // Ring placement around the settlement center with slight jitter.
    const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const ringR = radiusM * (0.25 + rng() * 0.7);
    const type = i === 0 ? 'town_hall' : BUILDING_TYPES[Math.floor(rng() * BUILDING_TYPES.length)];
    buildings.push({
      id: `bld-${i}`,
      type,
      position: [Math.cos(angle) * ringR, 0, Math.sin(angle) * ringR],
      rotationY: rng() * Math.PI * 2,
      footprint: [4 + rng() * 4, 4 + rng() * 4],
    });
  }

  // Designate a safe house (the inn if present, else the town hall) for
  // non-hamlet tiers.
  let safeHouseId: string | null = null;
  if (spec.hasSafeHouse && buildings.length > 0) {
    const inn = buildings.find((b) => b.type === 'inn') ?? buildings[0];
    inn.isSafeHouse = true;
    inn.type = inn.type === 'town_hall' ? 'safe_house' : inn.type;
    safeHouseId = inn.id;
  }

  return {
    tier,
    faction,
    buildings,
    safeHouseId,
    centerPosition: [0, 0, 0],
    radiusM,
  };
}

export default generateSettlement;
