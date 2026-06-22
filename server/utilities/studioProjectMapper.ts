/**
 * Maps a Grudge Studio Editor MapProject (artifacts/studio) into the
 * HomeIslandState shape expected by commit + Colyseus gameplay.
 */
import type { IslandState } from './islandGeneration';

interface StudioVec3 {
  0?: number;
  1?: number;
  2?: number;
  length?: number;
  [index: number]: number | undefined;
}

interface StudioEntity {
  id: string;
  kind: string;
  name?: string;
  position?: StudioVec3 | number[];
  data?: Record<string, unknown>;
}

interface StudioTerrain {
  size?: number;
  resolution?: number;
  biome?: number[];
}

interface StudioProject {
  id?: string;
  name?: string;
  seed?: number | string;
  terrain?: StudioTerrain;
  entities?: StudioEntity[];
}

const BIOME_NAMES = ['grass', 'sand', 'rock', 'snow'] as const;

const CREATURE_TYPE_MAP: Record<string, string> = {
  deer: 'deer',
  wolf: 'fox',
  hawk: 'hare',
  rabbit: 'hare',
  crab: 'hare',
  buffalo: 'boar',
  ibex: 'deer',
  harpy: 'fox',
  shark: 'boar',
  crocodile: 'boar',
  hummingbird: 'hare',
};

const RESOURCE_TYPE_MAP: Record<string, string> = {
  crystal: 'crystal',
  ore: 'ore',
  stone: 'stone',
  wood: 'forest',
  forest: 'forest',
  tree: 'forest',
};

function vec3(v: StudioEntity['position']): [number, number, number] {
  if (!v) return [0, 0, 0];
  if (Array.isArray(v)) return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
  return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
}

function worldToPct(coord: number, terrainSize: number): number {
  return Math.max(0, Math.min(100, ((coord + terrainSize / 2) / terrainSize) * 100));
}

function deriveTerrainZones(terrain: StudioTerrain | undefined): IslandState['terrainZones'] {
  const size = terrain?.size ?? 256;
  const biome = terrain?.biome;
  if (!biome?.length) {
    return [
      { type: 'field', bounds: { x: 10, y: 10, width: 80, height: 80 } },
      { type: 'beach', bounds: { x: 0, y: 0, width: 100, height: 15 } },
    ];
  }

  const counts = [0, 0, 0, 0];
  for (const b of biome) {
    if (b >= 0 && b < 4) counts[b]++;
  }
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  const zones: IslandState['terrainZones'] = [];
  let cursor = 0;
  for (let i = 0; i < 4; i++) {
    const frac = counts[i] / total;
    if (frac < 0.08) continue;
    const width = Math.max(12, Math.round(frac * 100));
    zones.push({
      type: BIOME_NAMES[i],
      bounds: {
        x: cursor % 80,
        y: Math.floor(cursor / 80) * 20,
        width: Math.min(width, 100 - (cursor % 80)),
        height: Math.max(12, Math.round(frac * 60)),
      },
    });
    cursor += width;
  }

  return zones.length > 0 ? zones : [
    { type: 'field', bounds: { x: 10, y: 10, width: 80, height: 80 } },
  ];
}

export function mapStudioProjectToIslandState(
  project: StudioProject,
  opts: { islandId: string; characterId: string; seed: string; fallback?: Partial<IslandState> },
): IslandState {
  const terrainSize = project.terrain?.size ?? 256;
  const entities = project.entities ?? [];
  const now = Date.now();

  const spawn = entities.find((e) => e.kind === 'spawn_point');
  const [sx, , sz] = vec3(spawn?.position);
  const campPosition = spawn
    ? { x: worldToPct(sx, terrainSize), y: worldToPct(sz, terrainSize) }
    : opts.fallback?.campPosition ?? { x: 50, y: 50 };

  const nodes = entities
    .filter((e) => e.kind === 'resource_node' || e.kind === 'tree')
    .map((e) => {
      const [x, , z] = vec3(e.position);
      const resource = String(e.data?.resource ?? e.data?.species ?? e.kind);
      const type = RESOURCE_TYPE_MAP[resource] ?? (e.kind === 'tree' ? 'forest' : 'crystal');
      const profession = type.includes('forest') || type === 'wood'
        ? 'woodcutting' as const
        : type === 'crystal' || type === 'ore' || type === 'stone'
          ? 'mining' as const
          : 'herbalism' as const;
      return {
        id: e.id,
        type,
        x: worldToPct(x, terrainSize),
        y: worldToPct(z, terrainSize),
        drops: type === 'forest' ? { wood_log: 2 } : { crystal_shard: 1 },
        tier: 'common' as const,
        profession,
      };
    });

  const animals = entities
    .filter((e) => e.kind === 'creature')
    .filter((e) => {
      const behavior = e.data?.behavior;
      return behavior !== 'swim' && behavior !== 'circle';
    })
    .slice(0, 12)
    .map((e) => {
      const [x, , z] = vec3(e.position);
      const species = String(e.data?.species ?? e.name ?? 'hare').toLowerCase();
      const type = CREATURE_TYPE_MAP[species] ?? 'hare';
      return {
        id: e.id,
        type: type as 'hare' | 'fox' | 'deer' | 'boar',
        x: worldToPct(x, terrainSize),
        y: worldToPct(z, terrainSize),
        hp: 10,
      };
    });

  const terrainZones = deriveTerrainZones(project.terrain);
  const resourceBreakdown: Record<string, number> = {};
  for (const n of nodes) {
    resourceBreakdown[n.type] = (resourceBreakdown[n.type] ?? 0) + 1;
  }

  const base = opts.fallback ?? {};
  const mergedNodes = nodes.length > 0 ? nodes : (base.nodes ?? []);
  const mergedAnimals = animals.length > 0 ? animals : (base.animals ?? []);

  return {
    id: opts.islandId,
    name: project.name ?? 'Home Island',
    mapStyle: 'fantasy',
    nodes: mergedNodes,
    animals: mergedAnimals,
    terrainZones: terrainZones.length > 0 ? terrainZones : (base.terrainZones ?? []),
    campPosition,
    clearings: base.clearings ?? [{ x: campPosition.x, y: campPosition.y, radius: 8 }],
    stats: {
      nodeCount: mergedNodes.length,
      animalCount: mergedAnimals.length,
      terrainZoneCount: terrainZones.length,
      resourceBreakdown,
    },
    studioProject: project,
    studioSeed: project.seed ?? opts.seed,
    createdAt: base.createdAt ?? now,
    lastUpdate: now,
    isFirstVisit: true,
    characterId: opts.characterId,
    seed: opts.seed,
  } as IslandState;
}