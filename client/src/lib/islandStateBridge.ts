import type { HomeIslandState } from '@/lib/homeIslandApi';
import type { IslandState } from '@/lib/islandSystem';

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