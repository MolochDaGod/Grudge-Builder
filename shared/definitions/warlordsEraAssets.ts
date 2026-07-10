/**
 * Warlords-era canonical asset registry.
 *
 * Sources:
 *   D:\Games\grudge-game-engine\uplaod\  (craftpix faction packs, mines, props)
 *   D:\Games\Models\craftpix_mine\       (mine FBX kit)
 *   D:\Games\Models\rock_mountain_with_cave_realistic_85k_by_jj_fbx.glb
 *
 * CDN layout (after npm run upload:warlords-assets):
 *   models/warlords/mines/*
 *   models/warlords/mountains/*
 *   models/warlords/faction/{crusade,legion,fabled}/*
 *
 * Each entry is ONE placeable / harvestable identity (not a multipack blob).
 */

export type WarlordsAssetKind =
  | 'mine_entrance'
  | 'mine_prop'
  | 'mountain_cave'
  | 'faction_building'
  | 'faction_prop'
  | 'chest'
  | 'crop'
  | 'environment';

export type FactionTheme = 'crusade' | 'legion' | 'fabled' | 'neutral';

export interface WarlordsAssetEntry {
  id: string;
  kind: WarlordsAssetKind;
  /** CDN path under assets.grudge-studio.com */
  path: string;
  format: 'glb' | 'fbx' | 'gltf';
  faction: FactionTheme;
  label: string;
  /** Approx world height (m) after fit */
  targetHeightM: number;
  tags: string[];
  /** Local authoring path (dev only) */
  localPath?: string;
  notes?: string;
}

const CDN = '/models/warlords';

/** Craftpix 692030 mine kit — individual meshes */
export const WARLORDS_MINE_ASSETS: WarlordsAssetEntry[] = [
  {
    id: 'mine_entrance_1',
    kind: 'mine_entrance',
    path: `${CDN}/mines/mine1.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Mine Entrance A',
    targetHeightM: 6,
    tags: ['mine', 'harvest', 'miner'],
    localPath: 'D:/Games/Models/craftpix_mine/fbx/full/_mine_1.fbx',
  },
  {
    id: 'mine_entrance_2',
    kind: 'mine_entrance',
    path: `${CDN}/mines/mine2.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Mine Entrance B',
    targetHeightM: 6.5,
    tags: ['mine', 'harvest', 'miner'],
    localPath: 'D:/Games/Models/craftpix_mine/fbx/full/_mine_2.fbx',
  },
  {
    id: 'mine_entrance_3',
    kind: 'mine_entrance',
    path: `${CDN}/mines/mine3.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Mine Entrance C',
    targetHeightM: 7,
    tags: ['mine', 'harvest', 'miner'],
    localPath: 'D:/Games/Models/craftpix_mine/fbx/full/_mine_3.fbx',
  },
  {
    id: 'mine_entrance_4',
    kind: 'mine_entrance',
    path: `${CDN}/mines/mine4.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Mine Entrance D',
    targetHeightM: 7,
    tags: ['mine', 'harvest', 'miner'],
    localPath: 'D:/Games/Models/craftpix_mine/fbx/full/_mine_4.fbx',
  },
  {
    id: 'mine_wood_house',
    kind: 'mine_prop',
    path: `${CDN}/mines/woodhouse.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Mine Wood Shack',
    targetHeightM: 4,
    tags: ['mine', 'prop'],
    localPath: 'D:/Games/Models/craftpix_mine/fbx/full/_wood_house.fbx',
  },
  {
    id: 'mine_wheelbarrow',
    kind: 'mine_prop',
    path: `${CDN}/mines/wheelbarrowempty.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Wheelbarrow',
    targetHeightM: 1.2,
    tags: ['mine', 'prop'],
  },
  {
    id: 'mine_ore_gold',
    kind: 'mine_prop',
    path: `${CDN}/mines/stonegold.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Gold Ore Node',
    targetHeightM: 1.5,
    tags: ['ore', 'gold', 'miner'],
  },
  {
    id: 'mine_ore_coal',
    kind: 'mine_prop',
    path: `${CDN}/mines/stonecoal.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Coal Ore Node',
    targetHeightM: 1.4,
    tags: ['ore', 'coal', 'miner'],
  },
  {
    id: 'mine_ore_mineral',
    kind: 'mine_prop',
    path: `${CDN}/mines/stonemineral.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Mineral Ore Node',
    targetHeightM: 1.4,
    tags: ['ore', 'mineral', 'engineer'],
  },
  {
    id: 'mine_gem_diamond',
    kind: 'mine_prop',
    path: `${CDN}/mines/stonediamond.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Diamond Node',
    targetHeightM: 1.3,
    tags: ['gem', 'mystic', 'miner'],
  },
  {
    id: 'mine_gem_emerald',
    kind: 'mine_prop',
    path: `${CDN}/mines/stoneemerald.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Emerald Node',
    targetHeightM: 1.3,
    tags: ['gem', 'mystic'],
  },
  {
    id: 'mine_crystal_1',
    kind: 'mine_prop',
    path: `${CDN}/mines/crystal1.fbx`,
    format: 'fbx',
    faction: 'neutral',
    label: 'Crystal Cluster',
    targetHeightM: 1.6,
    tags: ['crystal', 'mystic'],
  },
];

/** Home-island event mountain — realistic cave entrance (JJ) */
export const WARLORDS_MOUNTAIN_ASSET: WarlordsAssetEntry = {
  id: 'mountain_cave_entrance',
  kind: 'mountain_cave',
  path: `${CDN}/mountains/rock_mountain_cave_entrance.glb`,
  format: 'glb',
  faction: 'neutral',
  label: 'Rock Mountain with Cave (Event Entrance)',
  targetHeightM: 28,
  tags: ['mountain', 'dungeon', 'event', 'home_island'],
  localPath: 'D:/Games/Models/rock_mountain_with_cave_realistic_85k_by_jj_fbx.glb',
  notes: 'Replaces / supplements evil triad peak for dungeon mouth; home-island events.',
};

/**
 * Faction building packs from uplaod/ (zip → convert → R2).
 * Paths are canonical targets after pipeline extract.
 */
export const WARLORDS_FACTION_PACKS: Array<{
  faction: FactionTheme;
  zipLocal: string;
  cdnPrefix: string;
  role: string;
}> = [
  {
    faction: 'crusade',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-net-975579-medieval-building-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/crusade`,
    role: 'Crusade / human medieval buildings',
  },
  {
    faction: 'crusade',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-675419-medieval-building-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/crusade/props`,
    role: 'Crusade props (small pack)',
  },
  {
    faction: 'legion',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-net-325957-orc-settlement-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/legion`,
    role: 'Legion / orc settlement',
  },
  {
    faction: 'legion',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-net-599334-orc-props-3d-low-poly-pack.zip',
    cdnPrefix: `${CDN}/faction/legion/props`,
    role: 'Legion props',
  },
  {
    faction: 'fabled',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-net-857118-free-elf-house-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/fabled`,
    role: 'Fabled / elf homes',
  },
  {
    faction: 'neutral',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-net-116189-chest-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/neutral/chests`,
    role: 'Chests / storage',
  },
  {
    faction: 'neutral',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-891167-free-farming-crops-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/neutral/crops`,
    role: 'Farming crops',
  },
  {
    faction: 'neutral',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-908976-environment-props-3d-low-poly-pack.zip',
    cdnPrefix: `${CDN}/faction/neutral/env`,
    role: 'Environment props',
  },
  {
    faction: 'neutral',
    zipLocal:
      'D:/Games/grudge-game-engine/uplaod/craftpix-net-459533-treasure-3d-low-poly-models.zip',
    cdnPrefix: `${CDN}/faction/neutral/treasure`,
    role: 'Treasure props',
  },
];

export const ALL_WARLORDS_ASSETS: WarlordsAssetEntry[] = [
  ...WARLORDS_MINE_ASSETS,
  WARLORDS_MOUNTAIN_ASSET,
];

export function getWarlordsAsset(id: string): WarlordsAssetEntry | undefined {
  return ALL_WARLORDS_ASSETS.find((a) => a.id === id);
}

export function warlordsMineEntrances(): WarlordsAssetEntry[] {
  return WARLORDS_MINE_ASSETS.filter((a) => a.kind === 'mine_entrance');
}
