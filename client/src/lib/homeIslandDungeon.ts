/**
 * Maps lore dungeon definitions (home-island mountain portal) to tiled dungeon floors.
 */
import type { DungeonDefinition } from '@shared/definitions/lore';

const LORE_TO_TILED_FLOOR: Record<string, string> = {
  cave_crabs: 'dungeon_caves_1',
  cave_bandits: 'dungeon_caves_2',
  ruins_crusade: 'dungeon_crypt_1',
  ruins_legion: 'dungeon_fire_temple_1',
  vault_omni: 'dungeon_fire_temple_1',
  vault_madra: 'dungeon_crypt_boss',
  abyss_waterfall: 'dungeon_crypt_boss',
};

const TYPE_FALLBACK: Record<DungeonDefinition['type'], string> = {
  cave: 'dungeon_caves_1',
  ruins: 'dungeon_crypt_1',
  vault: 'dungeon_fire_temple_1',
  abyss: 'dungeon_crypt_boss',
};

export function loreDungeonToTiledFloor(dungeonId: string, dungeonType?: DungeonDefinition['type']): string {
  if (LORE_TO_TILED_FLOOR[dungeonId]) return LORE_TO_TILED_FLOOR[dungeonId];
  if (dungeonType && TYPE_FALLBACK[dungeonType]) return TYPE_FALLBACK[dungeonType];
  return 'dungeon_caves_1';
}

export function buildHomeDungeonUrl(dungeonId: string, dungeonName: string, dungeonType?: DungeonDefinition['type']): string {
  const floor = loreDungeonToTiledFloor(dungeonId, dungeonType);
  const params = new URLSearchParams({
    floor,
    dungeonId,
    name: dungeonName,
    return: '/home-island',
    autostart: '1',
  });
  return `/dungeon?${params.toString()}`;
}