/**
 * oceanNavigation — deploy from tactical ocean / world map into live Grudge zones.
 */
import {
  resolveZoneSectorId,
  resolveLegacySectorId,
  type LegacySectorId,
} from '@shared/definitions/sectorBridge';
import { getSectorById } from '@shared/definitions/worldMapSectors';
import { getTownForSector } from '@shared/definitions/factionTowns';

export type OceanDeployTarget = 'play' | 'zone' | 'town' | 'lobby';

export function resolveDeploySectorId(sectorId: string): string {
  return resolveZoneSectorId(sectorId);
}

export function buildPlayUrl(sectorId: string, worldSeed = 'grudge-world-1'): string {
  const zone = resolveDeploySectorId(sectorId);
  return `/play?sector=${encodeURIComponent(zone)}&worldSeed=${encodeURIComponent(worldSeed)}`;
}

export function buildZoneUrl(
  sectorId: string,
  worldSeed = 'grudge-world-1',
  options?: { fromOcean?: boolean },
): string {
  const zone = resolveDeploySectorId(sectorId);
  const params = new URLSearchParams({
    engine: 'legacy',
    mode: 'zone',
    sector: zone,
    worldSeed,
  });
  if (options?.fromOcean) params.set('from', 'ocean');
  return `/island-3d?${params.toString()}`;
}

export function buildTownUrl(sectorId: string): string | null {
  const legacy = resolveLegacySectorId(resolveDeploySectorId(sectorId));
  if (!legacy || !getTownForSector(legacy)) return null;
  return `/town?sector=${legacy}`;
}

export function buildLobbyUrl(): string {
  const params = new URLSearchParams({
    mode: 'lobby',
    map: 'pirate-islands',
    island: 'grudge-open-world',
  });
  return `/island-3d?${params.toString()}`;
}

export function buildOceanDeployUrl(
  sectorId: string,
  target: OceanDeployTarget = 'play',
  worldSeed = 'grudge-world-1',
): string {
  switch (target) {
    case 'zone':
      return buildZoneUrl(sectorId, worldSeed, { fromOcean: true });
    case 'town': {
      const town = buildTownUrl(sectorId);
      return town ?? buildPlayUrl(sectorId, worldSeed);
    }
    case 'lobby':
      return buildLobbyUrl();
    default:
      return buildPlayUrl(sectorId, worldSeed);
  }
}

/** Tactical Infinity ocean diameter (meters) — matches ZONE_SIZE in worldMapSectors. */
export const TACTICAL_OCEAN_SIZE = 10_000;

/** 9-sector anchor positions on the tactical ocean (10 km × 10 km world). */
export const OCEAN_SECTOR_POSITIONS: Record<LegacySectorId, { x: number; z: number; radius: number }> = {
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

export function sectorLabel(sectorId: string): string {
  const zone = getSectorById(resolveDeploySectorId(sectorId));
  return zone?.name ?? sectorId;
}