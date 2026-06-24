import { assetUrl } from '@/lib/assetConfig';
import { GAME_CARD_BACKGROUNDS } from '@/lib/artAssets';
import type { IslandState } from '@/lib/islandSystem';

/** R2 CDN map backdrops per island map style — instant fallback while 3D capture runs */
export const ISLAND_STYLE_MAP_URLS: Record<IslandState['mapStyle'], string> = {
  fantasy: GAME_CARD_BACKGROUNDS.island,
  iron: assetUrl('/backgrounds/verdant_plains.png'),
  tactical: assetUrl('/backgrounds/general.png'),
  night: assetUrl('/backgrounds/purple_dungeon.png'),
};

export function getIslandMapFallback(style: IslandState['mapStyle']): string {
  return ISLAND_STYLE_MAP_URLS[style] ?? GAME_CARD_BACKGROUNDS.island;
}

/** Subtle zone tint colors for 2D map overlays */
export const TERRAIN_ZONE_COLORS: Record<string, string> = {
  mountain: 'rgba(107, 114, 128, 0.35)',
  forest: 'rgba(22, 101, 52, 0.3)',
  field: 'rgba(101, 163, 13, 0.25)',
  shore: 'rgba(214, 182, 106, 0.2)',
  water: 'rgba(29, 78, 216, 0.25)',
  clearing: 'rgba(245, 158, 11, 0.15)',
};