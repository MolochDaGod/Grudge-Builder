/**
 * HarvestZonePlacer — seed-based placement of small harvest clusters.
 *
 * Each zone is a circular patch (forest outline ring + typed harvest nodes).
 */
import * as THREE from 'three';
import { getTerrainHeightAt, type BiomeType } from '../terrain/IslandTerrainGenerator';
import {
  HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
  HOME_ISLAND_HARVEST_ZONE_COUNT,
  HOME_ISLAND_HARVEST_ZONE_SPACING_M,
} from '@shared/definitions/homeIslandQuality';
import { HOME_ISLAND_WORLD_SIZE_M } from '@shared/definitions/homeIslandSeed';

export type HarvestZoneType =
  | 'forest'
  | 'rock_field'
  | 'gem_vein'
  | 'hemp_patch'
  | 'flower_meadow'
  | 'scrap_yard'
  | 'mixed';

export interface HarvestZoneNodeSlot {
  type: 'tree' | 'rock' | 'crystal' | 'hemp' | 'flower' | 'scrap';
  offsetX: number;
  offsetZ: number;
  scale: number;
}

export interface HarvestZoneDef {
  id: string;
  type: HarvestZoneType;
  center: THREE.Vector3;
  radius: number;
  clearRadius: number;
  forestTreeCount: number;
  nodes: HarvestZoneNodeSlot[];
  seed: string;
}

const ZONE_COLORS: Record<HarvestZoneType, number> = {
  forest: 0x4ade80,
  rock_field: 0x9ca3af,
  gem_vein: 0x22d3ee,
  hemp_patch: 0x84cc16,
  flower_meadow: 0xf472b6,
  scrap_yard: 0x94a3b8,
  mixed: 0xfbbf24,
};

export function getHarvestZoneColor(type: HarvestZoneType): number {
  return ZONE_COLORS[type];
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

function makePrng(seed: string): () => number {
  let s = hashStr(seed) >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function biomeAllowsZone(biome: BiomeType, type: HarvestZoneType): boolean {
  switch (type) {
    case 'forest':
      return biome === 'forest' || biome === 'grass';
    case 'rock_field':
    case 'gem_vein':
      return biome === 'rock' || biome === 'grass';
    case 'hemp_patch':
    case 'flower_meadow':
      return biome === 'grass' || biome === 'forest';
    case 'mixed':
      return biome !== 'water' && biome !== 'beach';
    default:
      return true;
  }
}

function pickZoneType(rng: () => number, biome: BiomeType): HarvestZoneType {
  if (biome === 'forest') {
    const roll = rng();
    if (roll < 0.55) return 'forest';
    if (roll < 0.75) return 'flower_meadow';
    if (roll < 0.9) return 'hemp_patch';
    return 'mixed';
  }
  if (biome === 'rock') {
    return rng() < 0.6 ? 'rock_field' : 'gem_vein';
  }
  if (biome === 'grass') {
    const roll = rng();
    if (roll < 0.3) return 'forest';
    if (roll < 0.5) return 'hemp_patch';
    if (roll < 0.65) return 'flower_meadow';
    if (roll < 0.8) return 'rock_field';
    return 'mixed';
  }
  return 'mixed';
}

function nodeCountForType(type: HarvestZoneType, rng: () => number): number {
  switch (type) {
    case 'forest': return 5 + Math.floor(rng() * 4);
    case 'rock_field': return 4 + Math.floor(rng() * 3);
    case 'gem_vein': return 2 + Math.floor(rng() * 3);
    case 'hemp_patch': return 5 + Math.floor(rng() * 4);
    case 'flower_meadow': return 6 + Math.floor(rng() * 5);
    case 'scrap_yard': return 5 + Math.floor(rng() * 4);
    case 'mixed': return 6 + Math.floor(rng() * 4);
  }
}

function nodeTypesForZone(type: HarvestZoneType, count: number, rng: () => number): HarvestZoneNodeSlot['type'][] {
  const slots: HarvestZoneNodeSlot['type'][] = [];
  const push = (t: HarvestZoneNodeSlot['type'], n: number) => {
    for (let i = 0; i < n; i++) slots.push(t);
  };

  switch (type) {
    case 'forest':
      push('tree', count);
      break;
    case 'rock_field':
      push('rock', count);
      break;
    case 'gem_vein':
      push('crystal', count);
      break;
    case 'hemp_patch':
      push('hemp', count);
      break;
    case 'flower_meadow':
      push('flower', count);
      break;
    case 'scrap_yard':
      push('scrap', count);
      break;
    case 'mixed': {
      const trees = Math.max(1, Math.floor(count * 0.35));
      const rocks = Math.max(1, Math.floor(count * 0.25));
      const crystals = rng() > 0.5 ? 1 : 0;
      const hemp = Math.max(1, Math.floor(count * 0.2));
      const scrap = rng() > 0.6 ? 1 : 0;
      const flowers = Math.max(0, count - trees - rocks - crystals - hemp - scrap);
      push('tree', trees);
      push('rock', rocks);
      if (crystals) push('crystal', crystals);
      push('hemp', hemp);
      if (scrap) push('scrap', scrap);
      push('flower', flowers);
      break;
    }
  }

  // Shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

function buildNodeSlots(
  zoneSeed: string,
  type: HarvestZoneType,
  radius: number,
  clearRadius: number,
): HarvestZoneNodeSlot[] {
  const rng = makePrng(zoneSeed + '_nodes');
  const count = nodeCountForType(type, rng);
  const types = nodeTypesForZone(type, count, rng);
  const slots: HarvestZoneNodeSlot[] = [];

  for (let i = 0; i < types.length; i++) {
    const angle = (i / types.length) * Math.PI * 2 + rng() * 0.8;
    const dist = clearRadius + 2 + rng() * (radius - clearRadius - 4);
    const scale = 0.85 + rng() * 0.55;
    slots.push({
      type: types[i],
      offsetX: Math.cos(angle) * dist,
      offsetZ: Math.sin(angle) * dist,
      scale,
    });
  }
  return slots;
}

function tooCloseToZones(zones: HarvestZoneDef[], x: number, zCoord: number, minDist: number): boolean {
  return zones.some((zone) => {
    const dx = zone.center.x - x;
    const dz = zone.center.z - zCoord;
    return Math.hypot(dx, dz) < minDist;
  });
}

export interface ProceduralZoneOptions {
  zoneCount?: number;
  minSpacing?: number;
  spawnClearRadius?: number;
  terrainSize?: number;
}

/**
 * Scatter harvest zones across procedural island terrain.
 */
export function placeProceduralHarvestZones(
  seed: string,
  terrainMesh: THREE.Mesh,
  biomeMap: BiomeType[][],
  gridW: number,
  gridH: number,
  options: ProceduralZoneOptions = {},
): HarvestZoneDef[] {
  const {
    zoneCount = HOME_ISLAND_HARVEST_ZONE_COUNT,
    minSpacing = HOME_ISLAND_HARVEST_ZONE_SPACING_M,
    spawnClearRadius = HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
    terrainSize = HOME_ISLAND_WORLD_SIZE_M,
  } = options;

  const rng = makePrng(seed + '_harvest_zones');
  const zones: HarvestZoneDef[] = [];
  let attempts = 0;
  const maxAttempts = zoneCount * 40;

  while (zones.length < zoneCount && attempts < maxAttempts) {
    attempts++;
    const wx = (rng() - 0.5) * terrainSize * 0.82;
    const wz = (rng() - 0.5) * terrainSize * 0.82;

    if (Math.hypot(wx, wz) < spawnClearRadius) continue;
    if (tooCloseToZones(zones, wx, wz, minSpacing)) continue;

    const gx = Math.round(((wx / terrainSize) + 0.5) * (gridW - 1));
    const gz = Math.round(((wz / terrainSize) + 0.5) * (gridH - 1));
    const biome = biomeMap[gz]?.[gx] ?? 'grass';
    if (biome === 'water' || biome === 'beach') continue;

    const zoneType = pickZoneType(rng, biome);
    if (!biomeAllowsZone(biome, zoneType)) continue;

    const wy = getTerrainHeightAt(terrainMesh, wx, wz);
    if (wy === null || wy < -1) continue;

    const radius = 32 + rng() * 28;
    const clearRadius = 6 + rng() * 4;
    const zoneId = `hz_${zones.length}`;
    const zoneSeed = `${seed}_${zoneId}`;

    zones.push({
      id: zoneId,
      type: zoneType,
      center: new THREE.Vector3(wx, wy, wz),
      radius,
      clearRadius,
      forestTreeCount: zoneType === 'forest' || zoneType === 'mixed'
        ? 28 + Math.floor(rng() * 24)
        : 0,
      nodes: buildNodeSlots(zoneSeed, zoneType, radius, clearRadius),
      seed: zoneSeed,
    });
  }

  return zones;
}

export interface LobbyZoneOptions {
  zoneCount?: number;
  innerRadius?: number;
  outerRadius?: number;
}

/**
 * Ring harvest zones around lobby hub (pirate-islands open world).
 */
export function placeLobbyHarvestZones(
  seed: string,
  hubCenter: THREE.Vector3,
  sampleHeight: (x: number, z: number) => number | null,
  options: LobbyZoneOptions = {},
): HarvestZoneDef[] {
  const {
    zoneCount = 6,
    innerRadius = 55,
    outerRadius = 180,
  } = options;

  const rng = makePrng(seed + '_lobby_zones');
  const zoneTypes: HarvestZoneType[] = [
    'forest', 'forest', 'rock_field', 'gem_vein', 'hemp_patch', 'flower_meadow', 'mixed',
  ];
  const zones: HarvestZoneDef[] = [];

  for (let i = 0; i < zoneCount; i++) {
    const angle = (i / zoneCount) * Math.PI * 2 + rng() * 0.4;
    const dist = innerRadius + rng() * (outerRadius - innerRadius);
    const x = hubCenter.x + Math.cos(angle) * dist;
    const z = hubCenter.z + Math.sin(angle) * dist;
    const y = sampleHeight(x, z) ?? hubCenter.y;

    const type = zoneTypes[i % zoneTypes.length];
    const radius = 28 + rng() * 18;
    const clearRadius = 5 + rng() * 3;
    const zoneId = `lobby_hz_${i}`;
    const zoneSeed = `${seed}_${zoneId}`;

    zones.push({
      id: zoneId,
      type,
      center: new THREE.Vector3(x, y, z),
      radius,
      clearRadius,
      forestTreeCount: type === 'forest' || type === 'mixed'
        ? 32 + Math.floor(rng() * 20)
        : 0,
      nodes: buildNodeSlots(zoneSeed, type, radius, clearRadius),
      seed: zoneSeed,
    });
  }

  return zones;
}