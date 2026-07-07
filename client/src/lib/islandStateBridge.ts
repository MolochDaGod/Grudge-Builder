import type { HomeIslandDto, HomeIslandNode, HomeIslandState } from '@/lib/homeIslandApi';
import { fetchCurrentHomeIsland, generateCharacterIsland } from '@/lib/homeIslandApi';
import {
  CRAFTING_RESOURCES,
  loadIslandState,
  saveIslandState,
  type AnimalType,
  type IslandState,
  type NodeRarity,
  type ResourceNode,
  type Sheep,
  type TerrainArea,
  type TerrainZone,
} from '@/lib/islandSystem';

const NODE_META: Record<
  string,
  { name: string; profession: string; icon: string; color: string; isWaterNode: boolean; uptime: number; cooldownHours: number; harvestIntervalMinutes: number }
> = {
  ore: { name: 'Iron Deposit', profession: 'Mining', icon: '⛏️', color: 'text-slate-400', isWaterNode: false, uptime: 4, cooldownHours: 4, harvestIntervalMinutes: 30 },
  stone: { name: 'Stone Quarry', profession: 'Mining', icon: '🪨', color: 'text-stone-400', isWaterNode: false, uptime: 8, cooldownHours: 8, harvestIntervalMinutes: 45 },
  gem: { name: 'Gem Deposit', profession: 'Mining', icon: '💎', color: 'text-cyan-400', isWaterNode: false, uptime: 12, cooldownHours: 12, harvestIntervalMinutes: 60 },
  wood: { name: 'Ancient Oak', profession: 'Logging', icon: '🪓', color: 'text-amber-600', isWaterNode: false, uptime: 3, cooldownHours: 3, harvestIntervalMinutes: 20 },
  hemp: { name: 'Hemp Field', profession: 'Herbalism', icon: '🌿', color: 'text-green-500', isWaterNode: false, uptime: 2, cooldownHours: 2, harvestIntervalMinutes: 15 },
  herb: { name: 'Herb Garden', profession: 'Herbalism', icon: '🌸', color: 'text-pink-400', isWaterNode: false, uptime: 3, cooldownHours: 3, harvestIntervalMinutes: 20 },
  fish: { name: 'Fishing Spot', profession: 'Fishing', icon: '🎣', color: 'text-blue-400', isWaterNode: true, uptime: 6, cooldownHours: 6, harvestIntervalMinutes: 30 },
  oil: { name: 'Oil Well', profession: 'Mining', icon: '🛢️', color: 'text-gray-800', isWaterNode: true, uptime: 10, cooldownHours: 10, harvestIntervalMinutes: 50 },
  leather: { name: 'Beast Den', profession: 'Skinning', icon: '🦴', color: 'text-yellow-700', isWaterNode: false, uptime: 5, cooldownHours: 5, harvestIntervalMinutes: 35 },
  crystal: { name: 'Crystal Vein', profession: 'Mining', icon: '🔮', color: 'text-purple-300', isWaterNode: false, uptime: 10, cooldownHours: 10, harvestIntervalMinutes: 50 },
};

const VALID_ANIMAL_TYPES = new Set<AnimalType>(['hare', 'fox', 'deer', 'boar']);

function parseNodeRarity(raw: unknown, tier?: number): NodeRarity {
  if (raw === 'common' || raw === 'rare' || raw === 'epic' || raw === 'legendary') return raw;
  if (tier === 4) return 'legendary';
  if (tier === 3) return 'epic';
  if (tier === 2) return 'rare';
  return 'common';
}

function enrichResourceNode(node: HomeIslandNode): ResourceNode {
  const type = String(node.type ?? 'herb');
  const meta = NODE_META[type] ?? NODE_META.herb;
  const rarity = parseNodeRarity(node.rarity, node.tier);
  const now = Date.now();
  const resourceType = (type in CRAFTING_RESOURCES ? type : 'herb') as ResourceNode['type'];
  return {
    id: node.id,
    name: node.name ?? meta.name,
    type: resourceType,
    x: node.x,
    y: node.y,
    tier: node.tier ?? 1,
    nodeLevel: node.tier ?? 1,
    rarity,
    profession: meta.profession,
    icon: meta.icon,
    color: meta.color,
    isWaterNode: meta.isWaterNode,
    uptime: meta.uptime,
    cooldownHours: meta.cooldownHours,
    harvestIntervalMinutes: meta.harvestIntervalMinutes,
    spawnedAt: now,
    expiresAt: now + meta.uptime * 60 * 60 * 1000,
    drops: CRAFTING_RESOURCES[resourceType] ?? CRAFTING_RESOURCES.herb,
  };
}

function enrichAnimal(animal: { id: string; type: string; x: number; y: number }): Sheep {
  const type: AnimalType = VALID_ANIMAL_TYPES.has(animal.type as AnimalType)
    ? (animal.type as AnimalType)
    : 'hare';
  return {
    id: animal.id,
    type,
    x: animal.x,
    y: animal.y,
    spawnedAt: Date.now(),
    state: 'alive',
    direction: 'down',
  };
}

function homeTerrainToAreas(home: HomeIslandState): TerrainArea[] {
  if (!home.terrainZones?.length) return [];
  return home.terrainZones.map((zone) => ({
    zone: (zone.zone || 'field') as TerrainZone,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
  }));
}

/**
 * Bridge Railway HomeIslandDto → client IslandState for /island gameplay.
 * Optionally overlays local progress (assignments, skinning nodes, first-visit flag).
 */
export function homeDtoToIslandState(
  dto: HomeIslandDto,
  localOverlay?: IslandState | null,
): IslandState {
  const home = dto.state;
  const nodes = home.nodes.length > 0 ? home.nodes.map(enrichResourceNode) : (localOverlay?.nodes ?? []);
  const sheep = home.animals.length > 0
    ? home.animals.map(enrichAnimal)
    : (localOverlay?.sheep ?? []);

  return {
    id: dto.seed ?? dto.id,
    name: home.name ?? dto.name,
    mapStyle: home.mapStyle ?? dto.mapStyle,
    mapImageUrl: home.mapImageUrl ?? dto.mapImageUrl,
    nodes,
    sheep,
    skinningNodes: localOverlay?.skinningNodes ?? [],
    assignedHeroes: localOverlay?.assignedHeroes ?? {},
    terrainZones: homeTerrainToAreas(home).length > 0
      ? homeTerrainToAreas(home)
      : (localOverlay?.terrainZones ?? []),
    campPosition: home.campPosition ?? localOverlay?.campPosition,
    clearings: home.clearings?.length ? home.clearings : (localOverlay?.clearings ?? []),
    isFirstVisit: localOverlay?.isFirstVisit ?? !home.campPosition,
    createdAt: home.createdAt ?? dto.createdAt,
    lastUpdate: Math.max(home.lastUpdate ?? 0, localOverlay?.lastUpdate ?? 0, dto.updatedAt ?? 0),
  };
}

export class IslandAuthoritativeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IslandAuthoritativeError';
  }
}

/**
 * Load island from Railway (authoritative), auto-generate if empty, bridge to IslandState.
 * Throws when the backend is unreachable or no persisted home island exists.
 */
export async function resolveAuthoritativeIsland(
  userId: string,
  activeCharacterId?: string | null,
): Promise<{ state: IslandState; dto: HomeIslandDto }> {
  const local = await loadIslandState(userId);

  let dto: HomeIslandDto;
  try {
    dto = await fetchCurrentHomeIsland();
  } catch {
    throw new IslandAuthoritativeError(
      'Home island API unreachable — cannot load island without Railway data.',
    );
  }

  if (dto.state.nodes.length === 0 && activeCharacterId) {
    dto = await generateCharacterIsland(activeCharacterId);
  }

  if (dto.state.nodes.length === 0) {
    throw new IslandAuthoritativeError(
      'No home island exists — complete island reveal first.',
    );
  }

  const state = homeDtoToIslandState(dto, local);
  await saveIslandState(userId, state);
  return { state, dto };
}

/** Bridge local IslandState → HomeIslandState for SVG map renderer */
export function islandStateToHomeState(state: IslandState): HomeIslandState {
  return {
    id: state.id,
    name: state.name,
    mapStyle: state.mapStyle,
    mapImageUrl: state.mapImageUrl,
    nodes: state.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      name: n.name,
      x: n.x,
      y: n.y,
      rarity: n.rarity,
      tier: n.tier,
    })),
    animals: (state.sheep || [])
      .filter((s) => s.state === 'alive')
      .map((s) => ({ id: s.id, type: 'sheep', x: s.x, y: s.y })),
    terrainZones: (state.terrainZones || []).map((z) => ({
      zone: z.zone,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
    })),
    clearings: state.clearings || [],
    campPosition: state.campPosition,
    createdAt: state.createdAt,
    lastUpdate: state.lastUpdate,
  };
}