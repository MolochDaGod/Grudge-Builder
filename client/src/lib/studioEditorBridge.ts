/**
 * Bridge between GrudgeBuilder and the Studio Map Editor
 * (grudge-studio-editor.vercel.app / studio.grudge-studio.com).
 */
import { STUDIO_EDITOR_URL } from '@/lib/grudgeConfig';
import { isAuthenticated } from '@/lib/grudgeBackend';
import { redirectToGrudgeAuth } from '@/lib/authRedirect';
import type { HomeIslandState } from '@/lib/homeIslandApi';

export interface StudioEditorLaunchParams {
  characterId: string;
  islandId: string;
  seed: string;
  returnUrl?: string;
  apiOrigin?: string;
  token?: string;
}

export interface StudioMapProject {
  id?: string;
  name?: string;
  seed?: number | string;
  terrain?: { size?: number; resolution?: number; biome?: number[] };
  entities?: Array<{
    id: string;
    kind: string;
    name?: string;
    position?: [number, number, number];
    data?: Record<string, unknown>;
  }>;
}

/** Build the Studio Editor URL for home-island creation. */
export function buildStudioEditorHomeIslandUrl(
  params: Omit<StudioEditorLaunchParams, 'returnUrl' | 'apiOrigin' | 'token'> & {
    returnUrl?: string;
    apiOrigin?: string;
  },
): string {
  const base = STUDIO_EDITOR_URL.replace(/\/$/, '');
  const origin = params.apiOrigin
    ?? (typeof window !== 'undefined' ? window.location.origin : 'https://client.grudge-studio.com');
  const returnUrl = params.returnUrl
    ?? `${origin}/island-reveal?phase=studio-return`;
  const token = typeof localStorage !== 'undefined'
    ? localStorage.getItem('grudge_auth_token') || ''
    : '';

  const qs = new URLSearchParams({
    mode: 'home-island',
    characterId: params.characterId,
    islandId: params.islandId,
    seed: params.seed,
    returnUrl,
    apiOrigin: origin,
    embed: '1',
  });
  if (token) qs.set('token', token);

  return `${base}/editor?${qs.toString()}`;
}

/** Open the Studio Editor for home-island design (same tab by default). */
export function openStudioEditorForHomeIsland(
  params: Omit<StudioEditorLaunchParams, 'returnUrl' | 'apiOrigin' | 'token'>,
  opts: { newTab?: boolean } = {},
): void {
  const url = buildStudioEditorHomeIslandUrl(params);
  if (opts.newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
}

export interface StudioEditorExploreParams {
  seed?: string;
  characterId?: string;
  play?: boolean;
  weather?: string;
  returnUrl?: string;
  apiOrigin?: string;
  token?: string;
}

function studioOrigin(): string {
  return typeof window !== 'undefined'
    ? window.location.origin
    : 'https://client.grudge-studio.com';
}

function studioAuthToken(override?: string): string {
  if (override) return override;
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem('grudge_auth_token') || '';
}

/** Build the Studio Editor URL for general island exploration (island-3d default). */
export function buildStudioEditorExploreUrl(
  params: StudioEditorExploreParams = {},
): string {
  const base = STUDIO_EDITOR_URL.replace(/\/$/, '');
  const origin = params.apiOrigin ?? studioOrigin();
  const returnUrl = params.returnUrl ?? `${origin}/island-3d`;
  const seed = params.seed ?? `island-${Date.now().toString(36)}`;

  const qs = new URLSearchParams({
    mode: 'explore',
    seed,
    returnUrl,
    apiOrigin: origin,
    embed: '1',
  });
  if (params.characterId) qs.set('characterId', params.characterId);
  if (params.play) qs.set('play', '1');
  if (params.weather) qs.set('weather', params.weather);
  const token = studioAuthToken(params.token);
  if (token) qs.set('token', token);

  return `${base}/editor?${qs.toString()}`;
}

/** Open the Studio Editor for procedural island exploration. */
export function openStudioEditorExplore(
  params: StudioEditorExploreParams = {},
  opts: { newTab?: boolean } = {},
): void {
  const url = buildStudioEditorExploreUrl(params);
  if (opts.newTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.location.href = url;
  }
}

/**
 * Ensure the user has a session before opening the Studio Editor.
 * Uses silent guest login first — never opens the Puter popup.
 * Falls back to Grudge ID redirect (id.grudge-studio.com) on failure.
 */
export async function ensureAuthForStudio(returnPath?: string): Promise<boolean> {
  if (isAuthenticated()) return true;
  const path = returnPath ?? `${window.location.pathname}${window.location.search}`;
  redirectToGrudgeAuth(path);
  return false;
}

const BIOME_NAMES = ['grass', 'sand', 'rock', 'snow'] as const;

const CREATURE_TYPE_MAP: Record<string, string> = {
  deer: 'deer', wolf: 'fox', hawk: 'hare', rabbit: 'hare', crab: 'hare',
  buffalo: 'boar', ibex: 'deer', harpy: 'fox', shark: 'boar', crocodile: 'boar',
  hummingbird: 'hare',
};

const RESOURCE_TYPE_MAP: Record<string, string> = {
  crystal: 'crystal', ore: 'ore', stone: 'stone', wood: 'forest', forest: 'forest', tree: 'forest',
};

function worldToPct(coord: number, terrainSize: number): number {
  return Math.max(0, Math.min(100, ((coord + terrainSize / 2) / terrainSize) * 100));
}

/** Client-side mirror of server studioProjectMapper for preview/commit. */
export function mapStudioProjectToHomeIslandState(
  project: StudioMapProject,
  opts: { islandId: string; characterId: string; seed: string; fallback?: Partial<HomeIslandState> },
): HomeIslandState {
  const terrainSize = project.terrain?.size ?? 256;
  const entities = project.entities ?? [];
  const now = Date.now();

  const spawn = entities.find((e) => e.kind === 'spawn_point');
  const campPosition = spawn?.position
    ? {
        x: worldToPct(spawn.position[0], terrainSize),
        y: worldToPct(spawn.position[2], terrainSize),
      }
    : opts.fallback?.campPosition ?? { x: 50, y: 50 };

  const nodes = entities
    .filter((e) => e.kind === 'resource_node' || e.kind === 'tree')
    .map((e) => {
      const [x, , z] = e.position ?? [0, 0, 0];
      const resource = String(e.data?.resource ?? e.data?.species ?? e.kind);
      const type = RESOURCE_TYPE_MAP[resource] ?? (e.kind === 'tree' ? 'forest' : 'crystal');
      return {
        id: e.id,
        type,
        name: e.name,
        x: worldToPct(x, terrainSize),
        y: worldToPct(z, terrainSize),
        tier: 1,
        rarity: 'common',
      };
    });

  const animals = entities
    .filter((e) => e.kind === 'creature')
    .filter((e) => e.data?.behavior !== 'swim' && e.data?.behavior !== 'circle')
    .slice(0, 12)
    .map((e) => {
      const [x, , z] = e.position ?? [0, 0, 0];
      const species = String(e.data?.species ?? e.name ?? 'hare').toLowerCase();
      return {
        id: e.id,
        type: CREATURE_TYPE_MAP[species] ?? 'hare',
        x: worldToPct(x, terrainSize),
        y: worldToPct(z, terrainSize),
      };
    });

  const biome = project.terrain?.biome;
  const terrainZones = biome?.length
    ? BIOME_NAMES.map((zone, i) => {
        const count = biome.filter((b) => b === i).length;
        if (count < biome.length * 0.08) return null;
        const frac = count / biome.length;
        return {
          zone,
          x: (i * 22) % 70,
          y: Math.floor(i / 2) * 18,
          width: Math.max(15, Math.round(frac * 90)),
          height: Math.max(12, Math.round(frac * 50)),
        };
      }).filter(Boolean) as HomeIslandState['terrainZones']
    : opts.fallback?.terrainZones ?? [
        { zone: 'field', x: 10, y: 10, width: 80, height: 80 },
      ];

  const mergedNodes = nodes.length > 0 ? nodes : (opts.fallback?.nodes ?? []);
  const mergedAnimals = animals.length > 0 ? animals : (opts.fallback?.animals ?? []);

  const resourceBreakdown: Record<string, number> = {};
  for (const n of mergedNodes) {
    resourceBreakdown[n.type] = (resourceBreakdown[n.type] ?? 0) + 1;
  }

  return {
    id: opts.islandId,
    name: project.name ?? 'Home Island',
    mapStyle: 'fantasy',
    nodes: mergedNodes,
    animals: mergedAnimals,
    terrainZones,
    campPosition,
    clearings: opts.fallback?.clearings ?? [
      { x: campPosition.x - 8, y: campPosition.y - 8, width: 16, height: 16 },
    ],
    stats: {
      nodeCount: mergedNodes.length,
      animalCount: mergedAnimals.length,
      terrainZoneCount: terrainZones.length,
      resourceBreakdown,
    },
    createdAt: opts.fallback?.createdAt ?? now,
    lastUpdate: now,
  };
}