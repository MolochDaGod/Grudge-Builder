/**
 * World Map System
 *
 * 100×100 zone grid. Each zone is one cell.
 * A Player Block = 3×3 cluster: center = home island, surrounding 8 = dynamic content.
 * Players are allocated non-overlapping 3×3 blocks on account creation.
 *
 * Zone lifecycle:
 * - Home zones are permanent (cNFT-backed).
 * - Surrounding wild/fort/boss/event zones rotate on a server tick (24h default).
 * - Captured zones keep their ownerId until the rotation expires.
 */

import type { IslandProfile } from '../../client/src/lib/islandTileGrid';

// ── Zone Types ────────────────────────────────────────────────────────────────

export type ZoneType = 'home' | 'wild' | 'fort' | 'boss' | 'event' | 'empty';

export interface WorldZone {
  /** Grid position 0-99 */
  zoneX: number;
  zoneY: number;
  type: ZoneType;
  /** Seed for procedural island generation (deterministic) */
  islandSeed?: number;
  /** Island profile used for tile generation */
  islandProfile?: IslandProfile;
  /** Account ID of the player whose home this is, or who captured it */
  ownerId?: string;
  /** PvE difficulty 1-10 */
  difficulty?: number;
  /** When this zone's content expires (epoch ms). Null = permanent. */
  expiresAt?: number | null;
  /** Resource theme for loot weighting */
  lootTheme?: 'mining' | 'forest' | 'fishing' | 'mixed';
  /** Number of towers/buildings placed by the owner */
  buildingCount?: number;
  /** True if this zone has been cleared (boss defeated, etc.) */
  isCleared?: boolean;
}

// ── Player Block ──────────────────────────────────────────────────────────────

export interface PlayerBlock {
  /** Top-left corner of the 3×3 block in the world grid */
  originX: number;
  originY: number;
  /** Account ID of the player who owns this block */
  accountId: string;
  /** Puter user ID (maps 1:1 to Grudge ID) */
  puterUserId?: string;
  /** Home island seed (center zone) */
  homeIslandSeed: number;
  /** The 9 zones (3×3), indexed [0..8] row-major: TL, TC, TR, ML, MC (home), MR, BL, BC, BR */
  zones: WorldZone[];
}

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_CONFIG = {
  /** World grid dimensions */
  worldWidth: 100,
  worldHeight: 100,
  /** Player block size (3×3) */
  blockSize: 3,
  /** Maximum number of player blocks (non-overlapping, with 1-cell gap) */
  maxPlayerBlocks: 625, // floor(100/4)^2 ≈ 25×25
  /** Default zone rotation interval (ms) */
  zoneRotationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  /** Chance of a surrounding zone being each type */
  zoneTypeWeights: {
    wild: 0.45,
    fort: 0.20,
    boss: 0.05,
    event: 0.10,
    empty: 0.20,
  } as Record<ZoneType, number>,
} as const;

// ── Seeded Zone Generation ────────────────────────────────────────────────────

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** Pick a zone type based on weighted random */
function pickZoneType(rng: () => number): ZoneType {
  const roll = rng();
  let cumulative = 0;
  for (const [type, weight] of Object.entries(WORLD_CONFIG.zoneTypeWeights)) {
    cumulative += weight;
    if (roll < cumulative) return type as ZoneType;
  }
  return 'empty';
}

/** Map zone type to island profile */
function zoneTypeToProfile(type: ZoneType): IslandProfile | undefined {
  switch (type) {
    case 'wild': return 'wild';
    case 'fort': return 'fort';
    case 'boss': return 'boss';
    case 'event': return 'wild'; // Events use wild island shape
    default: return undefined;
  }
}

/** Generate the 8 surrounding zones for a player block */
export function generateSurroundingZones(
  originX: number,
  originY: number,
  rotationSeed: number,
): WorldZone[] {
  const rng = seededRng(rotationSeed + originX * 1000 + originY);
  const zones: WorldZone[] = [];
  const now = Date.now();

  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const zoneX = originX + dx;
      const zoneY = originY + dy;

      // Center is always home — skip, it's set separately
      if (dx === 1 && dy === 1) continue;

      const type = pickZoneType(rng);
      const islandSeed = Math.floor(rng() * 0x7fffffff);
      const difficulty = Math.floor(rng() * 10) + 1;
      const lootThemes: WorldZone['lootTheme'][] = ['mining', 'forest', 'fishing', 'mixed'];
      const lootTheme = lootThemes[Math.floor(rng() * lootThemes.length)];

      zones.push({
        zoneX,
        zoneY,
        type,
        islandSeed: type !== 'empty' ? islandSeed : undefined,
        islandProfile: zoneTypeToProfile(type),
        difficulty: type !== 'empty' ? difficulty : undefined,
        expiresAt: type !== 'empty' ? now + WORLD_CONFIG.zoneRotationIntervalMs : null,
        lootTheme: type !== 'empty' ? lootTheme : undefined,
      });
    }
  }

  return zones;
}

/** Create a full player block with home island and surrounding zones */
export function createPlayerBlock(
  originX: number,
  originY: number,
  accountId: string,
  homeIslandSeed: number,
  puterUserId?: string,
): PlayerBlock {
  const homeZone: WorldZone = {
    zoneX: originX + 1,
    zoneY: originY + 1,
    type: 'home',
    islandSeed: homeIslandSeed,
    islandProfile: 'home',
    ownerId: accountId,
    expiresAt: null, // Permanent
  };

  const rotationSeed = homeIslandSeed; // Initial rotation uses home seed
  const surrounding = generateSurroundingZones(originX, originY, rotationSeed);

  // Build the full 9-zone array in row-major order
  const zones: WorldZone[] = [];
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      if (dx === 1 && dy === 1) {
        zones.push(homeZone);
      } else {
        const zone = surrounding.find(
          (z) => z.zoneX === originX + dx && z.zoneY === originY + dy,
        );
        zones.push(zone!);
      }
    }
  }

  return {
    originX,
    originY,
    accountId,
    puterUserId,
    homeIslandSeed,
    zones,
  };
}

/** Find the next available 3×3 block origin in the world grid (simple linear scan) */
export function findAvailableBlockOrigin(
  occupiedOrigins: { x: number; y: number }[],
): { x: number; y: number } | null {
  const occupied = new Set(occupiedOrigins.map((o) => `${o.x},${o.y}`));

  // Scan with 4-cell stride to leave 1-cell gaps between blocks
  for (let y = 0; y <= WORLD_CONFIG.worldHeight - WORLD_CONFIG.blockSize; y += 4) {
    for (let x = 0; x <= WORLD_CONFIG.worldWidth - WORLD_CONFIG.blockSize; x += 4) {
      if (!occupied.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }
  return null;
}

/** Get the zone at a specific world coordinate from a player block */
export function getZoneAt(block: PlayerBlock, worldX: number, worldY: number): WorldZone | null {
  const localX = worldX - block.originX;
  const localY = worldY - block.originY;
  if (localX < 0 || localX >= 3 || localY < 0 || localY >= 3) return null;
  return block.zones[localY * 3 + localX] || null;
}

/** Check if a zone has expired and needs rotation */
export function isZoneExpired(zone: WorldZone): boolean {
  if (!zone.expiresAt) return false;
  return Date.now() > zone.expiresAt;
}

/** Rotate expired zones in a player block */
export function rotateExpiredZones(block: PlayerBlock): PlayerBlock {
  const newSeed = Date.now();
  const newSurrounding = generateSurroundingZones(block.originX, block.originY, newSeed);

  const updatedZones = block.zones.map((zone, i) => {
    // Never rotate home zone
    if (zone.type === 'home') return zone;
    // Keep captured zones that haven't expired
    if (zone.ownerId && !isZoneExpired(zone)) return zone;
    // Replace expired zones
    if (isZoneExpired(zone)) {
      const replacement = newSurrounding.find(
        (z) => z.zoneX === zone.zoneX && z.zoneY === zone.zoneY,
      );
      return replacement || zone;
    }
    return zone;
  });

  return { ...block, zones: updatedZones };
}
