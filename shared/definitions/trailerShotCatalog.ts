/**
 * Trailer Shot Catalog — SSOT for cinematic flybys across the entire Warlords
 * surface set (9 sectors + lobby + home island + tutorial shipwreck).
 *
 * Used by:
 *  - ZoneFlyby / SurfaceFlyby (live Three.js paths)
 *  - GameTrailer sequencer (multi-segment package → combine in NLE)
 *  - Lore flyby proof URLs (?flyby=1&surface=haven_shore)
 *
 * Trailer assembly: record each surface → download WebM + PNG snaps + manifest
 * → drop into CapCut / Premiere / Resolve as a game trailer.
 */
import { WORLD_SECTORS, type WorldSector } from './worldMapSectors';

// ── Surface identity ─────────────────────────────────────────────────────────

export type TrailerSurfaceKind =
  | 'sector'          // one of 9 production zones
  | 'lobby'           // open-world pirate lobby
  | 'home_island'     // player home island 3D
  | 'tutorial'        // shipwreck wake / first segment
  | 'world_map';       // strategic 3×3 map overview (optional)

export type TrailerShotKind =
  | 'establish'       // high wide
  | 'orbit'           // circling mass
  | 'island'          // land mass skim
  | 'coast'           // shore / reef
  | 'camp'            // NPC / player camp
  | 'harvest'         // trees / rocks / fill
  | 'wildlife'        // animals / fish
  | 'ship'            // enemy boat / deck
  | 'landmark'        // mountain city, event props
  | 'town'            // faction town
  | 'combat_hint'     // boss / pve tease
  | 'hero'            // character reveal
  | 'close';           // closing orbit / title hold

export interface TrailerSurfaceDef {
  id: string;
  kind: TrailerSurfaceKind;
  /** Display name in trailer HUD / cut list */
  title: string;
  /** One-line trailer VO / subtitle */
  tagline: string;
  biome?: string;
  colors?: { deep: string; mid: string; accent: string };
  /** Preferred order in full game trailer (1 = open, higher = later) */
  trailerOrder: number;
  /** Default flyby duration budget (seconds) for this surface alone */
  durationBudgetSec: number;
  /** Shot kinds this surface should try to hit */
  shotKinds: TrailerShotKind[];
  /** URL query to open live client for this surface */
  playQuery: string;
  /** Sector id when kind === 'sector' */
  sectorId?: string;
}

/** All 9 production sectors as trailer surfaces (order = trailer narrative). */
export function sectorTrailerSurfaces(): TrailerSurfaceDef[] {
  // Narrative: start safe → storm → ice → forest → nexus → desert → fire → deep → magic
  const order: string[] = [
    'haven_shore',
    'stormbreak_reef',
    'frostbite_expanse',
    'thornwood_wilds',
    'convergence_nexus',
    'ashen_wastes',
    'ember_depths',
    'abyssal_trench',
    'ethereal_falls',
  ];
  const byId = new Map(WORLD_SECTORS.map((s) => [s.id, s]));
  return order.map((id, i) => {
    const s = byId.get(id)!;
    return surfaceFromSector(s, i + 1);
  });
}

function surfaceFromSector(s: WorldSector, trailerOrder: number): TrailerSurfaceDef {
  const shotKinds: TrailerShotKind[] = [
    'establish',
    'orbit',
    'island',
    'coast',
    'harvest',
    'wildlife',
    'camp',
    'ship',
    'landmark',
    'close',
  ];
  if (s.id === 'convergence_nexus' || s.id === 'ember_depths') {
    shotKinds.splice(8, 0, 'combat_hint');
  }
  if (s.id === 'haven_shore') {
    shotKinds.splice(2, 0, 'hero');
  }
  return {
    id: s.id,
    kind: 'sector',
    title: s.name,
    tagline: s.description,
    biome: s.biome,
    colors: s.colors,
    trailerOrder,
    durationBudgetSec: 38,
    shotKinds,
    playQuery: `sector=${s.id}&mode=zone&worldSeed=grudge-world-1&flyby=1`,
    sectorId: s.id,
  };
}

/** Non-sector surfaces for trailer bookends. */
export const TRAILER_META_SURFACES: TrailerSurfaceDef[] = [
  {
    id: 'tutorial_shipwreck',
    kind: 'tutorial',
    title: 'Shipwreck Wake',
    tagline: 'You wash ashore. The island is yours to claim.',
    biome: 'tropical',
    colors: { deep: '#0c4a6e', mid: '#06b6d4', accent: '#fbbf24' },
    trailerOrder: 0,
    durationBudgetSec: 22,
    shotKinds: ['establish', 'hero', 'harvest', 'coast', 'close'],
    playQuery: 'mode=tutorial&flyby=1',
  },
  {
    id: 'home_island',
    kind: 'home_island',
    title: 'Home Island',
    tagline: 'Build your camp. Harvest. Return from the world map.',
    biome: 'tropical',
    colors: { deep: '#0c4a6e', mid: '#22c55e', accent: '#fbbf24' },
    trailerOrder: 2,
    durationBudgetSec: 28,
    shotKinds: ['establish', 'island', 'harvest', 'camp', 'hero', 'close'],
    playQuery: 'mode=home&flyby=1',
  },
  {
    id: 'lobby_open_world',
    kind: 'lobby',
    title: 'Open World Lobby',
    tagline: 'Capture. Sail. Board. Meet captains at sea.',
    biome: 'tropical',
    colors: { deep: '#0c4a6e', mid: '#0891b2', accent: '#f59e0b' },
    trailerOrder: 3,
    durationBudgetSec: 32,
    shotKinds: ['establish', 'ship', 'coast', 'island', 'camp', 'close'],
    playQuery: 'mode=lobby&flyby=1',
  },
  {
    id: 'world_map_overview',
    kind: 'world_map',
    title: 'World Map — Nine Sectors',
    tagline: 'Nine realms. One war.',
    colors: { deep: '#0f172a', mid: '#334155', accent: '#c5a059' },
    trailerOrder: 1,
    durationBudgetSec: 12,
    shotKinds: ['establish', 'orbit', 'close'],
    playQuery: 'path=/world-map&flyby=1',
  },
];

/** Full trailer cut list: meta bookends + all 9 sectors. */
export function allTrailerSurfaces(): TrailerSurfaceDef[] {
  const sectors = sectorTrailerSurfaces();
  const all = [...TRAILER_META_SURFACES, ...sectors];
  return all.sort((a, b) => a.trailerOrder - b.trailerOrder);
}

export function getTrailerSurface(id: string): TrailerSurfaceDef | null {
  return allTrailerSurfaces().find((s) => s.id === id) ?? null;
}

/** Resolve surface id from play URL / engine context. */
export function resolveTrailerSurfaceId(opts: {
  mode?: string | null;
  sectorId?: string | null;
  path?: string | null;
}): string {
  const mode = (opts.mode ?? '').toLowerCase();
  if (mode === 'lobby') return 'lobby_open_world';
  if (mode === 'tutorial' || mode === 'shipwreck') return 'tutorial_shipwreck';
  if (mode === 'home' || mode === 'home_island' || mode === 'procedural') return 'home_island';
  if (opts.path?.includes('world-map')) return 'world_map_overview';
  if (opts.sectorId) {
    const s = getTrailerSurface(opts.sectorId);
    if (s) return s.id;
  }
  return 'haven_shore';
}

// ── Waypoint templates (relative meters — applied around surface center) ─────

export interface TrailerWaypointTemplate {
  id: string;
  kind: TrailerShotKind;
  label: string;
  /** Offset from surface center [x, y, z] meters */
  offset: [number, number, number];
  /** Look-at offset from center */
  lookOffset: [number, number, number];
  durationSec: number;
  /** Optional title card overlay text */
  titleCard?: string;
}

/**
 * Generic relative path when live nodes are sparse.
 * Applied in SurfaceFlyby with center + waterY.
 */
export const DEFAULT_TRAILER_PATH: TrailerWaypointTemplate[] = [
  {
    id: 'establish',
    kind: 'establish',
    label: 'Establish',
    offset: [0, 420, 900],
    lookOffset: [0, 40, 0],
    durationSec: 4.5,
    titleCard: undefined,
  },
  {
    id: 'orbit_a',
    kind: 'orbit',
    label: 'Orbit A',
    offset: [700, 220, 400],
    lookOffset: [0, 20, 0],
    durationSec: 3.5,
  },
  {
    id: 'coast',
    kind: 'coast',
    label: 'Coast skim',
    offset: [280, 45, 320],
    lookOffset: [80, 5, 40],
    durationSec: 3.0,
  },
  {
    id: 'island',
    kind: 'island',
    label: 'Island pass',
    offset: [180, 55, 200],
    lookOffset: [40, 8, 20],
    durationSec: 3.2,
  },
  {
    id: 'harvest',
    kind: 'harvest',
    label: 'Harvest skim',
    offset: [90, 28, 110],
    lookOffset: [20, 4, 10],
    durationSec: 2.8,
  },
  {
    id: 'wildlife',
    kind: 'wildlife',
    label: 'Wildlife',
    offset: [120, 32, 140],
    lookOffset: [30, 3, 15],
    durationSec: 2.8,
  },
  {
    id: 'orbit_b',
    kind: 'orbit',
    label: 'Orbit B',
    offset: [-650, 260, -480],
    lookOffset: [0, 25, 0],
    durationSec: 4.0,
  },
  {
    id: 'close',
    kind: 'close',
    label: 'Closing hold',
    offset: [-200, 180, 500],
    lookOffset: [0, 30, 0],
    durationSec: 4.5,
    titleCard: 'GRUDGE WARLORDS',
  },
];

/** Compact path for tutorial / home (smaller play spaces). */
export const COMPACT_TRAILER_PATH: TrailerWaypointTemplate[] = [
  {
    id: 'establish',
    kind: 'establish',
    label: 'Establish',
    offset: [40, 55, 70],
    lookOffset: [0, 8, 0],
    durationSec: 3.5,
  },
  {
    id: 'hero',
    kind: 'hero',
    label: 'Hero',
    offset: [8, 4.5, 12],
    lookOffset: [0, 1.4, 0],
    durationSec: 3.0,
  },
  {
    id: 'harvest',
    kind: 'harvest',
    label: 'Harvest',
    offset: [25, 12, 30],
    lookOffset: [5, 2, 5],
    durationSec: 2.8,
  },
  {
    id: 'coast',
    kind: 'coast',
    label: 'Shore',
    offset: [50, 18, 40],
    lookOffset: [10, 1, 0],
    durationSec: 3.0,
  },
  {
    id: 'close',
    kind: 'close',
    label: 'Close',
    offset: [-30, 40, 55],
    lookOffset: [0, 6, 0],
    durationSec: 3.5,
  },
];

export function pathTemplatesForSurface(surface: TrailerSurfaceDef): TrailerWaypointTemplate[] {
  if (surface.kind === 'tutorial' || surface.kind === 'home_island') {
    return COMPACT_TRAILER_PATH;
  }
  if (surface.kind === 'world_map') {
    return [
      {
        id: 'map_establish',
        kind: 'establish',
        label: 'Nine sectors',
        offset: [0, 80, 120],
        lookOffset: [0, 0, 0],
        durationSec: 5,
        titleCard: 'NINE REALMS',
      },
      {
        id: 'map_orbit',
        kind: 'orbit',
        label: 'Grid orbit',
        offset: [90, 60, 40],
        lookOffset: [0, 0, 0],
        durationSec: 4,
      },
      {
        id: 'map_close',
        kind: 'close',
        label: 'Hold',
        offset: [0, 100, 140],
        lookOffset: [0, 0, 0],
        durationSec: 3,
        titleCard: 'GRUDGE WARLORDS',
      },
    ];
  }
  return DEFAULT_TRAILER_PATH;
}

/** Manifest entry for NLE / trailer editor (JSON download). */
export interface TrailerCutListEntry {
  order: number;
  surfaceId: string;
  title: string;
  tagline: string;
  playQuery: string;
  durationBudgetSec: number;
  shotKinds: TrailerShotKind[];
  videoFileHint: string;
  snapsPrefix: string;
}

export function buildTrailerCutList(): TrailerCutListEntry[] {
  return allTrailerSurfaces().map((s) => ({
    order: s.trailerOrder,
    surfaceId: s.id,
    title: s.title,
    tagline: s.tagline,
    playQuery: s.playQuery,
    durationBudgetSec: s.durationBudgetSec,
    shotKinds: s.shotKinds,
    videoFileHint: `${s.id}-flyby.webm`,
    snapsPrefix: `${s.id}-snap-`,
  }));
}

export const TRAILER_CATALOG_VERSION = '1.0.0';
