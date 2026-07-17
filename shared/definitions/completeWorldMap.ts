/**
 * Complete World Map — SSOT snapshot for rendering all 9 Warlords sectors.
 *
 * Used by WorldMap3D / tactical ocean when REST is offline.
 * Live player counts may overlay from GET /api/map/world.
 *
 * Map family: warlords_era_open_world only (not home-block 3×3).
 */

import { WORLD_SECTORS, type WorldSector } from './worldMapSectors';
import {
  LEGACY_TO_ZONE_ID,
  ZONE_TO_LEGACY_ID,
  type LegacySectorId,
  LEGACY_SECTOR_IDS,
} from './sectorBridge';
import { RACE_CITIES, type RaceCity } from './raceCities';

/** 3×3 layout matching sectorBridge + tactical ocean. */
export const WORLD_MAP_LEGACY_GRID: Record<
  LegacySectorId,
  { col: 0 | 1 | 2; row: 0 | 1 | 2 }
> = {
  NW: { col: 0, row: 0 },
  N: { col: 1, row: 0 },
  NE: { col: 2, row: 0 },
  W: { col: 0, row: 1 },
  CENTER: { col: 1, row: 1 },
  E: { col: 2, row: 1 },
  SW: { col: 0, row: 2 },
  S: { col: 1, row: 2 },
  SE: { col: 2, row: 2 },
};

/** Meters per sector cell on the strategic overview map */
export const COMPLETE_MAP_SECTOR_SIZE_M = 10_000;

export interface CompleteMapSector {
  /** Legacy Colyseus grid key NW…SE */
  legacyId: LegacySectorId;
  /** Canonical zone id haven_shore… */
  zoneId: string;
  name: string;
  subtitle: string;
  description: string;
  lore: string;
  biome: WorldSector['biome'];
  difficultyMin: number;
  difficultyMax: number;
  isSafeZone: boolean;
  isContested: boolean;
  colors: WorldSector['colors'];
  hazards: string[];
  resources: string[];
  ambientFx: string[];
  grid: { col: 0 | 1 | 2; row: 0 | 1 | 2 };
  /** Ocean sail anchor (meters on tactical ocean) */
  oceanAnchor: { x: number; z: number; radius: number };
  raceCity: RaceCity | null;
  /** Live overlay (optional) */
  playerCount: number;
  controllingFaction: string | null;
}

export interface CompleteWorldMapSnapshot {
  version: string;
  family: 'warlords_era_open_world';
  worldSeed: string;
  sectors: CompleteMapSector[];
  /** Keyed by legacy id for WorldMap3D compatibility */
  sectorsByLegacy: Record<string, CompleteMapSector>;
  /** Keyed by zone id */
  sectorsByZone: Record<string, CompleteMapSector>;
  generatedAt: number;
}

const BIOME_SUBTITLE: Record<string, string> = {
  frozen: 'Ice Wastes',
  storm: 'Tempest Seas',
  forest: 'Ancient Wood',
  desert: 'Glass Desert',
  nexus: 'Heart of the Isles',
  tropical: 'Safe Harbor',
  abyssal: 'Deep Void',
  ethereal: 'Spirit Veil',
  volcanic: 'Ember Isles',
};

/**
 * Build complete 9-sector map from WORLD_SECTORS + race cities.
 * Does not require network.
 */
export function buildCompleteWorldMap(
  worldSeed = 'grudge-world-1',
  live?: {
    playerCounts?: Record<string, number>;
    controllingFactions?: Record<string, string | null>;
  },
): CompleteWorldMapSnapshot {
  const byZone = new Map(WORLD_SECTORS.map((s) => [s.id, s]));
  const sectors: CompleteMapSector[] = [];

  // Ocean anchors from shared layout (inline to avoid client import cycle)
  const oceanAnchors: Record<LegacySectorId, { x: number; z: number; radius: number }> = {
    NW: { x: -3100, z: -3100, radius: 140 },
    N: { x: 0, z: -3300, radius: 150 },
    NE: { x: 3100, z: -3100, radius: 140 },
    W: { x: -3300, z: 0, radius: 145 },
    CENTER: { x: 0, z: 0, radius: 170 },
    E: { x: 3300, z: 0, radius: 145 },
    SW: { x: -3100, z: 3100, radius: 140 },
    S: { x: 0, z: 3300, radius: 150 },
    SE: { x: 3100, z: 3100, radius: 140 },
  };

  for (const legacyId of LEGACY_SECTOR_IDS) {
    const zoneId = LEGACY_TO_ZONE_ID[legacyId];
    const zone = byZone.get(zoneId);
    if (!zone) continue;

    const raceCity = RACE_CITIES.find((c) => c.sectorId === zoneId) ?? null;
    const playerCount =
      live?.playerCounts?.[legacyId] ?? live?.playerCounts?.[zoneId] ?? 0;
    const controllingFaction =
      live?.controllingFactions?.[legacyId] ??
      live?.controllingFactions?.[zoneId] ??
      null;

    sectors.push({
      legacyId,
      zoneId,
      name: zone.name,
      subtitle: BIOME_SUBTITLE[zone.biome] ?? zone.biome,
      description: zone.description,
      lore: zone.lore,
      biome: zone.biome,
      difficultyMin: zone.difficultyMin,
      difficultyMax: zone.difficultyMax,
      isSafeZone: Boolean(zone.isSafeZone),
      isContested: Boolean(zone.isContested),
      colors: zone.colors,
      hazards: zone.hazards,
      resources: zone.resources,
      ambientFx: zone.ambientFx,
      grid: WORLD_MAP_LEGACY_GRID[legacyId],
      oceanAnchor: oceanAnchors[legacyId],
      raceCity,
      playerCount,
      controllingFaction,
    });
  }

  const sectorsByLegacy: Record<string, CompleteMapSector> = {};
  const sectorsByZone: Record<string, CompleteMapSector> = {};
  for (const s of sectors) {
    sectorsByLegacy[s.legacyId] = s;
    sectorsByZone[s.zoneId] = s;
  }

  return {
    version: '1.0.0',
    family: 'warlords_era_open_world',
    worldSeed,
    sectors,
    sectorsByLegacy,
    sectorsByZone,
    generatedAt: Date.now(),
  };
}

/** Hex color string → number for Three.js */
export function hexToThreeColor(hex: string): number {
  const h = hex.replace('#', '');
  return parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
}

export function playUrlForSector(
  zoneId: string,
  worldSeed = 'grudge-world-1',
  cityId?: string,
): string {
  const params = new URLSearchParams({
    sector: zoneId,
    mode: 'zone',
    worldSeed,
  });
  if (cityId) params.set('city', cityId);
  return `/play?${params.toString()}`;
}

export function oceanUrl(worldSeed = 'grudge-world-1'): string {
  return `/ocean?worldSeed=${encodeURIComponent(worldSeed)}`;
}
