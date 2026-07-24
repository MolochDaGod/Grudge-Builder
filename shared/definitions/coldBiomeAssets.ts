/**
 * Cold / frozen biome asset SSOT for western cold band + Crusade cold.
 *
 * Geographic cold band (world 3×3):
 *   ┌ Ethereal Falls (NW, ethereal + destruction) ┬ Frostbite (N, frozen) ┐
 *   │ Stormbreak cold-storm (W, mid-left)        │ …                     │
 *   │ Abyssal ice-rim (SW, bottom-left)          │ Haven (S)             │
 *
 * Crusade primarily operates in cold: Ethereal Falls (NW) + western cold
 * approaches (Stormbreak ice shelf). Fabled keeps Frostbite capital (dwarves).
 *
 * Recently downloaded / attached packs (local sources → game paths):
 *   D:\Games\Models\dwarf_modelkit.glb
 *   D:\Games\Models\low_poly_arctic_scene.glb
 *   D:\Games\Models\wizards_house.glb
 *   ice_biome_kit + snowbiomes (existing fleet)
 */

export const COLD_SECTOR_IDS = [
  'ethereal_falls',
  'frostbite_expanse',
  'stormbreak_reef', // mid-left — frozen storm shelf
  'abyssal_trench', // bottom-left — ice rim / deep cold
] as const;

export type ColdSectorId = (typeof COLD_SECTOR_IDS)[number];

/** Primary frozen play (full ice kit scatter). */
export const PRIMARY_FROZEN_SECTORS = ['frostbite_expanse'] as const;

/** Cold-magic + destruction (ethereal kit + sparse ice). */
export const ETHEREAL_COLD_SECTORS = ['ethereal_falls'] as const;

/** Western cold band (left middle + left bottom) — hybrid ice assets. */
export const WESTERN_COLD_SECTORS = ['stormbreak_reef', 'abyssal_trench'] as const;

/** Crusade cold home + patrol sectors. */
export const CRUSADE_COLD_SECTORS = [
  'ethereal_falls',
  'stormbreak_reef',
  'frostbite_expanse', // crusade war parties, not capital
] as const;

export function isColdSector(sectorId: string): boolean {
  return (COLD_SECTOR_IDS as readonly string[]).includes(sectorId);
}

export function isCrusadeColdSector(sectorId: string): boolean {
  return (CRUSADE_COLD_SECTORS as readonly string[]).includes(sectorId);
}

export interface ColdAssetPack {
  id: string;
  label: string;
  /** Served path under client public / CDN */
  path: string;
  /** Offline source on author machine */
  sourcePath?: string;
  roles: Array<
    | 'scene'
    | 'terrain'
    | 'building'
    | 'character_kit'
    | 'props'
    | 'harvest'
  >;
  sectors: readonly string[];
  /** Prefer flight-safe props only in ethereal destruction half */
  etherealSafe: boolean;
  notes?: string;
}

/**
 * Game paths — copy large GLBs with:
 *   node scripts/copy-cold-biome-assets.mjs
 * Sources stay outside git when >50MB.
 */
export const COLD_ASSET_PACKS: ColdAssetPack[] = [
  {
    id: 'ice_biome_kit',
    label: 'Ice / snow multipack (Sandman Lair)',
    path: '/models/biomes/ice/ice_biome_kit.glb',
    roles: ['terrain', 'props', 'harvest', 'building'],
    sectors: [
      'frostbite_expanse',
      'stormbreak_reef',
      'ethereal_falls',
      'abyssal_trench',
    ],
    etherealSafe: true,
    notes: 'Catalog: ice_biome_kit.catalog.json + iceBiomeCatalog.ts',
  },
  {
    id: 'snowbiomes',
    label: 'Stylized snow biomes scatter',
    path: '/models/nature/stylized/biome/snowbiomes.glb',
    roles: ['terrain', 'props'],
    sectors: ['frostbite_expanse', 'stormbreak_reef', 'ethereal_falls'],
    etherealSafe: true,
  },
  {
    id: 'low_poly_arctic_scene',
    label: 'Low poly arctic scene',
    path: '/models/biomes/cold/low_poly_arctic_scene.glb',
    sourcePath: 'D:\\Games\\Models\\low_poly_arctic_scene.glb',
    roles: ['scene', 'terrain', 'props'],
    sectors: ['frostbite_expanse', 'stormbreak_reef', 'abyssal_trench'],
    etherealSafe: false,
    notes: 'Full arctic plate for cold islands — avoid destruction half',
  },
  {
    id: 'dwarf_modelkit',
    label: 'Dwarf model kit',
    path: '/models/biomes/cold/dwarf_modelkit.glb',
    sourcePath: 'D:\\Games\\Models\\dwarf_modelkit.glb',
    roles: ['character_kit', 'building', 'props'],
    sectors: ['frostbite_expanse', 'ethereal_falls', 'stormbreak_reef'],
    etherealSafe: true,
    notes: 'Fabled dwarf capital + Crusade cold outposts',
  },
  {
    id: 'wizards_house',
    label: "Wizard's house",
    path: '/models/biomes/cold/wizards_house.glb',
    sourcePath: 'D:\\Games\\Models\\wizards_house.glb',
    roles: ['building', 'scene'],
    sectors: ['ethereal_falls', 'frostbite_expanse', 'stormbreak_reef'],
    etherealSafe: true,
    notes: 'Crusade mage / Aurion cold sanctum prop',
  },
  {
    id: 'iceland_scene',
    label: 'Iceland cinematic scene',
    path: '/models/biomes/cold/iceland_scene_for_canimatic.glb',
    sourcePath: 'D:\\Games\\Models\\iceland_scene_for_canimatic.glb',
    roles: ['scene', 'terrain'],
    sectors: [
      'frostbite_expanse',
      'stormbreak_reef',
      'ethereal_falls',
      'abyssal_trench',
    ],
    etherealSafe: false,
    notes: 'Frozen + near-frozen zones via IcelandScenePlacer',
  },
  {
    id: 'hoth_boss_room',
    label: 'Hoth ice boss chamber',
    path: '/models/biomes/frozen/hoth_boss_room_low_poly.glb',
    sourcePath: 'D:\\Games\\Models\\hoth_boss_room_low_poly.glb',
    roles: ['scene', 'building'],
    sectors: [
      'frostbite_expanse',
      'stormbreak_reef',
      'ethereal_falls',
      'abyssal_trench',
    ],
    etherealSafe: true,
    notes: 'Boss room instance via event/mountain/dungeon portal',
  },
  {
    id: 'frozen_review',
    label: 'Biome review frozen plate',
    path: '/models/biomes/review/frozen.glb',
    roles: ['scene'],
    sectors: ['frostbite_expanse'],
    etherealSafe: true,
  },
  {
    id: 'winter_review',
    label: 'Biome review winter plate',
    path: '/models/biomes/review/winter.glb',
    roles: ['scene'],
    sectors: ['stormbreak_reef', 'frostbite_expanse'],
    etherealSafe: true,
  },
  {
    id: 'dwarf_winter_castle',
    label: 'Dwarf winter castle tower',
    path: '/models/worlds/sky/dwarf-winter-castle-tower.glb',
    roles: ['building'],
    sectors: ['frostbite_expanse', 'ethereal_falls'],
    etherealSafe: true,
  },
];

export function coldPacksForSector(sectorId: string): ColdAssetPack[] {
  return COLD_ASSET_PACKS.filter((p) => p.sectors.includes(sectorId));
}

export function coldPackPathsForSector(
  sectorId: string,
  opts?: { etherealSafeOnly?: boolean },
): string[] {
  return coldPacksForSector(sectorId)
    .filter((p) => !opts?.etherealSafeOnly || p.etherealSafe)
    .map((p) => p.path);
}
