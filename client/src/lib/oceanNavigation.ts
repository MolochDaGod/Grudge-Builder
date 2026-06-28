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

export function buildZoneUrl(sectorId: string, worldSeed = 'grudge-world-1'): string {
  const zone = resolveDeploySectorId(sectorId);
  const params = new URLSearchParams({
    engine: 'legacy',
    mode: 'zone',
    sector: zone,
    worldSeed,
  });
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
      return buildZoneUrl(sectorId, worldSeed);
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

/** 9-sector anchor positions on the tactical ocean (9000×9000 world). */
export const OCEAN_SECTOR_POSITIONS: Record<LegacySectorId, { x: number; z: number; radius: number }> = {
  NW: { x: -2800, z: -2800, radius: 120 },
  N: { x: 0, z: -3000, radius: 130 },
  NE: { x: 2800, z: -2800, radius: 120 },
  W: { x: -3000, z: 0, radius: 125 },
  CENTER: { x: 0, z: 0, radius: 150 },
  E: { x: 3000, z: 0, radius: 125 },
  SW: { x: -2800, z: 2800, radius: 120 },
  S: { x: 0, z: 3000, radius: 130 },
  SE: { x: 2800, z: 2800, radius: 120 },
};

export function sectorLabel(sectorId: string): string {
  const zone = getSectorById(resolveDeploySectorId(sectorId));
  return zone?.name ?? sectorId;
}