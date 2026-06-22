export type HomeIslandMapStyle = 'iron' | 'fantasy' | 'tactical' | 'night';

export interface HomeIslandTerrainZone {
  zone: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HomeIslandNode {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  rarity?: string;
  tier?: number;
}

export interface HomeIslandAnimal {
  id: string;
  type: string;
  x: number;
  y: number;
}

export interface HomeIslandState {
  id: string;
  name: string;
  mapStyle: HomeIslandMapStyle;
  mapImageUrl?: string;
  nodes: HomeIslandNode[];
  animals: HomeIslandAnimal[];
  terrainZones: HomeIslandTerrainZone[];
  campPosition?: { x: number; y: number };
  clearings: Array<{ x: number; y: number; width: number; height: number }>;
  stats?: {
    nodeCount?: number;
    animalCount?: number;
    terrainZoneCount?: number;
    resourceBreakdown?: Record<string, number>;
  };
  createdAt: number;
  lastUpdate: number;
}

export interface HomeIslandDto {
  id: string;
  seed?: string;
  name: string;
  mapStyle: HomeIslandMapStyle;
  mapImageUrl?: string;
  validatedAt?: number | null;
  createdAt: number;
  updatedAt: number;
  state: HomeIslandState;
  islandState: HomeIslandState;
}

function normalizeMapStyle(style: unknown): HomeIslandMapStyle {
  return style === 'iron' || style === 'fantasy' || style === 'tactical' || style === 'night'
    ? style
    : 'fantasy';
}

function normalizeTerrainZones(rawZones: any[]): HomeIslandTerrainZone[] {
  return (rawZones || []).map((zone) => {
    if (zone?.bounds) {
      return {
        zone: zone.type || zone.zone || 'field',
        x: Number(zone.bounds.x ?? 0),
        y: Number(zone.bounds.y ?? 0),
        width: Number(zone.bounds.width ?? 0),
        height: Number(zone.bounds.height ?? 0),
      };
    }
    return {
      zone: zone?.zone || zone?.type || 'field',
      x: Number(zone?.x ?? 0),
      y: Number(zone?.y ?? 0),
      width: Number(zone?.width ?? 0),
      height: Number(zone?.height ?? 0),
    };
  });
}

function normalizeClearings(rawClearings: any[]): Array<{ x: number; y: number; width: number; height: number }> {
  return (rawClearings || []).map((clearing) => {
    if (typeof clearing?.radius === 'number') {
      return {
        x: Number(clearing.x ?? 0) - clearing.radius,
        y: Number(clearing.y ?? 0) - clearing.radius,
        width: clearing.radius * 2,
        height: clearing.radius * 2,
      };
    }
    return {
      x: Number(clearing?.x ?? 0),
      y: Number(clearing?.y ?? 0),
      width: Number(clearing?.width ?? 0),
      height: Number(clearing?.height ?? 0),
    };
  });
}

function normalizeNodes(rawNodes: any[]): HomeIslandNode[] {
  return (rawNodes || []).map((node) => ({
    id: String(node?.id ?? `${node?.type ?? 'node'}-${node?.x ?? 0}-${node?.y ?? 0}`),
    type: String(node?.type ?? 'node'),
    name: typeof node?.name === 'string' ? node.name : undefined,
    x: Number(node?.x ?? 0),
    y: Number(node?.y ?? 0),
    rarity: typeof node?.rarity === 'string' ? node.rarity : undefined,
    tier: typeof node?.tier === 'number' ? node.tier : 1,
  }));
}

function normalizeAnimals(raw: any): HomeIslandAnimal[] {
  if (Array.isArray(raw?.animals)) {
    return raw.animals.map((animal: any) => ({
      id: String(animal?.id ?? `${animal?.type ?? 'animal'}-${animal?.x ?? 0}-${animal?.y ?? 0}`),
      type: String(animal?.type ?? 'animal'),
      x: Number(animal?.x ?? 0),
      y: Number(animal?.y ?? 0),
    }));
  }

  if (Array.isArray(raw?.sheep)) {
    return raw.sheep.map((animal: any) => ({
      id: String(animal?.id ?? `animal-${animal?.x ?? 0}-${animal?.y ?? 0}`),
      type: String(animal?.type ?? 'sheep'),
      x: Number(animal?.x ?? 0),
      y: Number(animal?.y ?? 0),
    }));
  }

  return [];
}

export function normalizeHomeIslandResponse(raw: any): HomeIslandDto {
  const dto = raw?.island ?? raw ?? {};
  const sourceState = dto?.state ?? raw?.islandState ?? dto;
  const terrainZones = normalizeTerrainZones(sourceState?.terrainZones || []);
  const clearings = normalizeClearings(sourceState?.clearings || []);
  const nodes = normalizeNodes(sourceState?.nodes || []);
  const animals = normalizeAnimals(sourceState);
  const state: HomeIslandState = {
    id: String(sourceState?.id ?? dto?.id ?? raw?.homeIslandId ?? 'home-island'),
    name: String(sourceState?.name ?? dto?.name ?? 'Home Island'),
    mapStyle: normalizeMapStyle(sourceState?.mapStyle ?? dto?.mapStyle),
    mapImageUrl: sourceState?.mapImageUrl ?? dto?.mapImageUrl,
    nodes,
    animals,
    terrainZones,
    campPosition: sourceState?.campPosition
      ? { x: Number(sourceState.campPosition.x ?? 50), y: Number(sourceState.campPosition.y ?? 50) }
      : undefined,
    clearings,
    stats: sourceState?.stats,
    createdAt: Number(sourceState?.createdAt ?? dto?.createdAt ?? Date.now()),
    lastUpdate: Number(sourceState?.lastUpdate ?? dto?.updatedAt ?? dto?.createdAt ?? Date.now()),
  };

  return {
    id: String(dto?.id ?? state.id),
    seed: typeof dto?.seed === 'string' ? dto.seed : state.id,
    name: String(dto?.name ?? state.name),
    mapStyle: normalizeMapStyle(dto?.mapStyle ?? state.mapStyle),
    mapImageUrl: dto?.mapImageUrl ?? state.mapImageUrl,
    validatedAt: typeof dto?.validatedAt === 'number' ? dto.validatedAt : null,
    createdAt: Number(dto?.createdAt ?? state.createdAt),
    updatedAt: Number(dto?.updatedAt ?? state.lastUpdate),
    state,
    islandState: state,
  };
}

export async function fetchCurrentHomeIsland(): Promise<HomeIslandDto> {
  const res = await fetch('/api/island');
  if (!res.ok) throw new Error('Failed to load home island');
  return normalizeHomeIslandResponse(await res.json());
}

export interface RtsStatusDto {
  online: boolean;
  playerCount: number | null;
}

export interface CommitIslandPayload {
  characterId: string;
  islandId: string;
  islandState?: HomeIslandState;
  mapImageData?: string;
  /** Full Studio Editor MapProject JSON — server maps to HomeIslandState */
  studioProject?: unknown;
  /** CDN URL of exported GLB scene from Studio Editor */
  sceneGlbUrl?: string;
}

export interface CommitIslandResult {
  success: boolean;
  homeIslandId: string;
  island: HomeIslandDto;
  nodeCount: number;
  message: string;
}

export async function commitHomeIsland(payload: CommitIslandPayload): Promise<CommitIslandResult> {
  const res = await fetch('/api/island/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to commit home island');
  }
  const data = await res.json();
  return {
    ...data,
    island: normalizeHomeIslandResponse(data.island ?? data),
  };
}

export async function generateCharacterIsland(characterId: string): Promise<HomeIslandDto> {
  const res = await fetch(`/api/characters/${characterId}/generate-island`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to generate island');
  return normalizeHomeIslandResponse(await res.json());
}

export async function rerollIsland(islandId: string): Promise<HomeIslandDto> {
  const res = await fetch(`/api/islands/${islandId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to reroll island');
  return normalizeHomeIslandResponse(await res.json());
}

export async function fetchRtsStatus(): Promise<RtsStatusDto> {
  try {
    const res = await fetch('/api/rts/status');
    if (!res.ok) return { online: false, playerCount: null };
    const data = await res.json();
    return {
      online: !!data.online,
      playerCount: typeof data.totalPlayers === 'number' ? data.totalPlayers : null,
    };
  } catch {
    return { online: false, playerCount: null };
  }
}
