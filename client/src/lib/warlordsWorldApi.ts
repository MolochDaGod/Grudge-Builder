/**
 * Warlords World API — connects client play/generation to canonical zone catalog.
 *
 * Fetch order (ONE TRUTH):
 *   1. Same-origin ObjectStore proxy  /api/objectstore/v1/*
 *   2. objectstore.grudge-studio.com
 *   3. info.grudge-studio.com
 *   4. Local published mirror (shipped with client)
 *
 * Source of generation numbers remains GrudgeBuilder worldMapSectors.ts;
 * this module is the runtime bridge for entry URLs, readiness, and UI lists.
 */

import { apiUrl } from '@/lib/assetConfig';
import { resolveZoneSectorId } from '@shared/definitions/sectorBridge';
import { getSectorById, WORLD_SECTORS } from '@shared/definitions/worldMapSectors';
import {
  assertMapIdForFamily,
  isWarlordsEraSectorId,
} from '@shared/definitions/mapRegistry';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WarlordsZoneEntry {
  id: string;
  legacyId?: string;
  name: string;
  biome: string;
  difficultyMin: number;
  difficultyMax: number;
  isSafeZone?: boolean;
  isContested?: boolean;
  sizeMeters?: number;
  entryReady?: boolean;
  entryPriority?: number;
  recommendedStarter?: boolean;
  playUrl?: string;
  description?: string;
  systems?: Record<string, boolean>;
  resources?: string[];
}

export interface WarlordsZonesDoc {
  version: string;
  updated?: string;
  worldSeedDefault?: string;
  playBaseUrl?: string;
  zones: WarlordsZoneEntry[];
  alternateEntries?: Array<{ id: string; name: string; entryReady?: boolean; url?: string; notes?: string }>;
  entryReadySummary?: {
    sectorZonesReady?: number;
    allSectorsEntryReady?: boolean;
    recommendedFirstEntry?: string;
    canonicalWorldSeed?: string;
  };
  legacyBridge?: Record<string, string>;
}

export interface WarlordsCatalogDoc {
  version: string;
  world?: { id?: string; seed?: string };
  wildlife?: { total?: number };
  bosses?: { runtimeImplemented?: unknown[] };
  deploymentTruth?: Record<string, unknown>;
  [key: string]: unknown;
}

const CANONICAL_WORLD_SEED = 'grudge-world-1';
const STARTER_SECTOR = 'haven_shore';

/** Local SSOT fallback when ObjectStore/info hub are unreachable */
function buildLocalZonesDoc(): WarlordsZonesDoc {
  const priority: Record<string, number> = {
    haven_shore: 1,
    stormbreak_reef: 2,
    thornwood_wilds: 3,
    frostbite_expanse: 4,
    ember_depths: 5,
    ashen_wastes: 6,
    ethereal_falls: 7,
    abyssal_trench: 8,
    convergence_nexus: 9,
  };
  return {
    version: '1.0.0-local',
    worldSeedDefault: CANONICAL_WORLD_SEED,
    playBaseUrl: 'https://client.grudge-studio.com/play',
    zones: WORLD_SECTORS.map((s) => ({
      id: s.id,
      name: s.name,
      biome: s.biome,
      difficultyMin: s.difficultyMin,
      difficultyMax: s.difficultyMax,
      isSafeZone: !!s.isSafeZone,
      isContested: !!s.isContested,
      sizeMeters: s.terrain3d.sizeMeters,
      entryReady: true,
      entryPriority: priority[s.id] ?? 50,
      recommendedStarter: s.id === STARTER_SECTOR,
      playUrl: buildOpenWorldPlayUrl(s.id),
      description: s.description,
      systems: {
        terrain3d: true,
        zonePopulation: true,
        harvestNodes: true,
        wildlife: true,
        fish: true,
        npcCamps: true,
        docks: true,
        colyseusSector: true,
      },
    })),
    entryReadySummary: {
      sectorZonesReady: 9,
      allSectorsEntryReady: true,
      recommendedFirstEntry: STARTER_SECTOR,
      canonicalWorldSeed: CANONICAL_WORLD_SEED,
    },
  };
}

function buildLocalCatalogDoc(): WarlordsCatalogDoc {
  return {
    version: '1.0.0-local',
    world: { id: CANONICAL_WORLD_SEED, seed: CANONICAL_WORLD_SEED },
    deploymentTruth: {
      staticGameData: 'info.grudge-studio.com/api/v1 + objectstore',
      client: 'client.grudge-studio.com',
      playerState: 'api.grudge-studio.com',
      source: 'GrudgeBuilder worldMapSectors + local fallback',
    },
  };
}

// ── Fetch with multi-host fallback ───────────────────────────────────────────

async function fetchJsonMulti<T>(endpoint: string, fallback: T): Promise<T> {
  const paths = [
    apiUrl(endpoint.startsWith('/') ? endpoint : `/${endpoint}`),
    `https://objectstore.grudge-studio.com/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
    `https://info.grudge-studio.com/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
  ];

  for (const url of paths) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) continue;
      const data = (await res.json()) as T;
      // Reject empty zone payloads
      if (data && typeof data === 'object' && 'zones' in (data as object)) {
        const z = (data as WarlordsZonesDoc).zones;
        if (!Array.isArray(z) || z.length === 0) continue;
      }
      return data;
    } catch {
      /* try next */
    }
  }
  return fallback;
}

let zonesCache: WarlordsZonesDoc | null = null;
let catalogCache: WarlordsCatalogDoc | null = null;

export async function fetchWarlordsZones(): Promise<WarlordsZonesDoc> {
  if (zonesCache) return zonesCache;
  const data = await fetchJsonMulti<WarlordsZonesDoc>(
    '/warlords-zones.json',
    buildLocalZonesDoc(),
  );
  if (!data.zones?.length) {
    zonesCache = buildLocalZonesDoc();
    return zonesCache;
  }
  zonesCache = data;
  return data;
}

export async function fetchWarlordsCatalog(): Promise<WarlordsCatalogDoc> {
  if (catalogCache) return catalogCache;
  catalogCache = await fetchJsonMulti<WarlordsCatalogDoc>(
    '/warlords-catalog.json',
    buildLocalCatalogDoc(),
  );
  return catalogCache;
}

export function clearWarlordsWorldCache(): void {
  zonesCache = null;
  catalogCache = null;
}

// ── URL builders (canonical play wiring) ─────────────────────────────────────

/** Open-world sector play — always includes mode=zone */
export function buildOpenWorldPlayUrl(
  sectorId: string,
  worldSeed = CANONICAL_WORLD_SEED,
  extra?: Record<string, string>,
): string {
  const zone = resolveZoneSectorId(sectorId);
  const params = new URLSearchParams({
    sector: zone,
    mode: 'zone',
    worldSeed,
    ...extra,
  });
  return `/play?${params.toString()}`;
}

export function buildHomeIslandUrl(characterId?: string | null): string {
  if (characterId) return `/home-island?characterId=${encodeURIComponent(characterId)}`;
  return '/home-island';
}

export function buildOceanHubUrl(worldSeed = CANONICAL_WORLD_SEED): string {
  return `/ocean?worldSeed=${encodeURIComponent(worldSeed)}`;
}

export function getCanonicalWorldSeed(): string {
  return CANONICAL_WORLD_SEED;
}

export function getStarterSectorId(): string {
  return STARTER_SECTOR;
}

/** Resolve sector from URL — defaults to Haven Shore for open world. */
export function resolvePlaySectorFromUrl(search = typeof window !== 'undefined' ? window.location.search : ''): string {
  const params = new URLSearchParams(search);
  const sector = params.get('sector');
  return resolveDeployableSectorId(sector);
}

/**
 * Engine mode from URL.
 * - /test-play or mode=procedural → procedural test terrain
 * - default /play → zone (open world)
 */
export function resolvePlayEngineMode(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/play',
  search = typeof window !== 'undefined' ? window.location.search : '',
): 'zone' | 'procedural' {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  if (mode === 'procedural' || mode === 'test') return 'procedural';
  if (mode === 'zone') return 'zone';
  // /test-play is explicit test harness
  if (pathname.includes('test-play')) return 'procedural';
  // Open world default
  return 'zone';
}

export function resolveWorldSeedFromUrl(search = typeof window !== 'undefined' ? window.location.search : ''): string {
  return new URLSearchParams(search).get('worldSeed') || CANONICAL_WORLD_SEED;
}

/** Entry-ready zones only, sorted by priority. */
export async function listEntryReadyZones(): Promise<WarlordsZoneEntry[]> {
  const doc = await fetchWarlordsZones();
  return [...doc.zones]
    .filter((z) => z.entryReady !== false)
    .sort((a, b) => (a.entryPriority ?? 99) - (b.entryPriority ?? 99));
}

/** Validate sector exists in catalog or local WORLD_SECTORS. */
export function isKnownSector(sectorId: string): boolean {
  const id = resolveZoneSectorId(sectorId);
  if (getSectorById(id)) return true;
  const zones = zonesCache?.zones ?? buildLocalZonesDoc().zones;
  return zones.some((z) => z.id === id);
}

/**
 * Resolve a play sector for map deployment: prefer known WORLD_SECTORS ids,
 * fall back to starter Haven Shore if unknown.
 */
export function resolveDeployableSectorId(sectorId: string | null | undefined): string {
  if (!sectorId) return STARTER_SECTOR;
  const id = resolveZoneSectorId(sectorId);
  // Guard: never treat home-block slots (TL/MC_HOME/…) as Warlords era sectors
  const guard = assertMapIdForFamily('warlords_era_open_world', id);
  if (!guard.ok) {
    console.warn(`[WarlordsWorld] ${guard.reason} → ${STARTER_SECTOR}`);
    return STARTER_SECTOR;
  }
  if (getSectorById(id) || isWarlordsEraSectorId(id)) return id;
  console.warn(`[WarlordsWorld] Unknown era sector "${sectorId}" → ${STARTER_SECTOR}`);
  return STARTER_SECTOR;
}

export interface MapDeploymentTruthReport {
  aligned: boolean;
  worldSeed: string;
  localSectorCount: number;
  remoteSectorCount: number;
  mismatches: string[];
  source: string;
}

/**
 * Runtime truth check: ObjectStore zones vs bundled WORLD_SECTORS.
 * Terrain generation always uses WORLD_SECTORS; this flags catalog drift.
 */
export async function verifyMapDeploymentTruth(): Promise<MapDeploymentTruthReport> {
  const doc = await fetchWarlordsZones();
  const mismatches: string[] = [];
  const remoteById = new Map((doc.zones ?? []).map((z) => [z.id, z]));

  for (const s of WORLD_SECTORS) {
    const z = remoteById.get(s.id);
    if (!z) {
      mismatches.push(`missing_remote:${s.id}`);
      continue;
    }
    if (z.name !== s.name) mismatches.push(`name:${s.id}`);
    if (z.biome !== s.biome) mismatches.push(`biome:${s.id}`);
    if (z.difficultyMin !== s.difficultyMin || z.difficultyMax !== s.difficultyMax) {
      mismatches.push(`difficulty:${s.id}`);
    }
    if (!!z.isSafeZone !== !!s.isSafeZone) mismatches.push(`safe:${s.id}`);
    if (!!z.isContested !== !!s.isContested) mismatches.push(`contested:${s.id}`);
    const resZ = [...(z.resources ?? [])].sort().join(',');
    const resS = [...(s.resources ?? [])].sort().join(',');
    if (resZ && resS && resZ !== resS) mismatches.push(`resources:${s.id}`);
  }

  for (const z of doc.zones ?? []) {
    if (!getSectorById(z.id)) mismatches.push(`extra_remote:${z.id}`);
  }

  const seed = doc.worldSeedDefault || CANONICAL_WORLD_SEED;
  if (seed !== CANONICAL_WORLD_SEED) {
    mismatches.push(`worldSeed:${seed}`);
  }

  const report: MapDeploymentTruthReport = {
    aligned: mismatches.length === 0 && (doc.zones?.length ?? 0) === WORLD_SECTORS.length,
    worldSeed: seed,
    localSectorCount: WORLD_SECTORS.length,
    remoteSectorCount: doc.zones?.length ?? 0,
    mismatches,
    source: doc.version?.includes('local') ? 'local-fallback' : `remote:${doc.version}`,
  };

  if (report.aligned) {
    console.log(
      `[WarlordsWorld] Map deployment truth OK · ${report.remoteSectorCount} zones · seed ${report.worldSeed} · ${report.source}`,
    );
  } else {
    console.warn('[WarlordsWorld] Map deployment drift:', report);
  }
  return report;
}

/** Apply player faction from character into engine after zone load. */
export function applyCharacterFactionToEngine(
  engine: { setPlayerFaction?: (f: string) => void } | null | undefined,
  faction: string | null | undefined,
): void {
  if (!engine?.setPlayerFaction) return;
  engine.setPlayerFaction(faction || 'crusade');
}
