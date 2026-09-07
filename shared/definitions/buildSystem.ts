/**
 * Build System SSOT — four layers (do not mix rules).
 *
 * Review basis: Warlords / uMMORPG-style structure defs (homes, stations, docks)
 * + WCS stations in grudge-crafting + Island3D BuildingSystem + RTS camps.
 *
 * Layers
 * ──────
 * 1. QUICK CRAFT   — inventory/hand craft (T0), no world prop required
 * 2. BENCH         — world station (camp → profession benches), XP 1–100
 * 3. MODULAR       — snap-build T1 wood (foundations/walls/floors) Kenney-style
 * 4. RTS           — full buildings that train AI units (later hero path)
 *
 * Assets (local → R2 under models/buildings/…):
 *   free_survival_asset_kit.glb  — camp stages, modular wood, tools
 *   3_medieval_towers (1).glb    — defense towers
 *   spell_table.glb              — mystic bench
 *   lumbermill.glb               — forestry bench
 */

import type { RaceId } from './lore';

export type BuildLayer = 'quick' | 'camp' | 'bench' | 'modular' | 'rts' | 'dock' | 'race_home';

export type BuildTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Profession binding for benches (matches WCS / ObjectStore professions) */
export type BenchProfession =
  | 'camp'        // starter camp craft
  | 'cooking'
  | 'smithing'    // engineer / weapons
  | 'mining'      // grind / sharpen / ore process
  | 'forestry'    // lumber
  | 'mystic'      // spell / enchant
  | 'engineering'
  | 'tailoring'
  | 'tinkering';

export interface BuildPieceDef {
  id: string;
  name: string;
  layer: BuildLayer;
  tier: BuildTier;
  /** Category for UI tabs */
  category:
    | 'foundation'
    | 'wall'
    | 'floor'
    | 'roof'
    | 'tent'
    | 'sleep'
    | 'fire'
    | 'bench'
    | 'tool'
    | 'storage'
    | 'fence'
    | 'dock'
    | 'tower'
    | 'rts_building'
    | 'race_home';
  /** Source multipack GLB (CDN path after upload) */
  sourceGlb: string;
  /**
   * Node name inside multipack (Sketchfab free_survival_asset_kit roots).
   * Loader clones this node (+ children) only.
   */
  nodeName: string;
  /** Optional secondary nodes composed into the same placeable */
  extraNodes?: string[];
  /** World scale after extract */
  scale: number;
  size: [number, number, number];
  /** Y offset after ground sample (docks = +0.2 so legs in water, deck dry) */
  placeYOffset: number;
  /** Snap: structural vs free prop */
  placement: 'structural' | 'prop';
  requiresFloor: boolean;
  terrainPlaceable: boolean;
  /** Floating foundation = true → placeable over water / shallows */
  floating?: boolean;
  /** Profession unlock / station id for crafting UI */
  profession?: BenchProfession;
  /** T0–T8 recipe gate */
  craftUnlockLevel?: number;
  cost: Array<{ itemId: string; quantity: number }>;
  /** Gameplay */
  effect?: {
    type: 'crafting' | 'comfort' | 'storage' | 'defense' | 'respawn' | 'train_unit' | 'foundation';
    value: number;
    description: string;
  };
  /** Race homes only */
  raceId?: RaceId;
  /** Camp build stage 0=starter … n=upgraded */
  campStage?: number;
  notes?: string;
}

/** Inputs keep identity and mesh selection required; catalog factories supply these defaults. */
type BuildPieceDefaultKey =
  | 'sourceGlb' | 'tier' | 'placeYOffset' | 'placement' | 'requiresFloor'
  | 'terrainPlaceable' | 'scale' | 'size' | 'cost';
export type BuildPieceInput = Omit<BuildPieceDef, BuildPieceDefaultKey> &
  Partial<Pick<BuildPieceDef, BuildPieceDefaultKey>>;

// ── CDN layout after `scripts/upload-build-packs-to-r2` ─────────────────────

export const BUILD_PACK_PATHS = {
  survivalKit: '/models/buildings/survival/free_survival_asset_kit.glb',
  medievalTowers: '/models/buildings/towers/3_medieval_towers.glb',
  spellTable: '/models/buildings/benches/spell_table.glb',
  lumbermill: '/models/buildings/benches/lumbermill.glb',
  /**
   * Fantasy village multipack (modular walls/towers/gates/houses/storage/carts).
   * Local: client/public/models/buildings/fantasy/fantasy_village_kit.glb
   * Catalog: fantasy_village_kit.catalog.json + fantasyVillageBuildCatalog.ts
   * Trees/plants excluded — use nature packs separately.
   */
  fantasyVillageKit: '/models/buildings/fantasy/fantasy_village_kit.glb',
  /**
   * Ice / snow / mountain event multipack (Sandman Lair styled ice biome).
   * Local: client/public/models/biomes/ice/ice_biome_kit.glb
   * Harvestables + E-to-learn recipes for frostbite / event snow islands.
   */
  iceBiomeKit: '/models/biomes/ice/ice_biome_kit.glb',
  /** SI-baked camp buildings (4 m). Standalone GLBs, catalog island-building-prefabs.json */
  islandBuildings: '/models/buildings',
  /** Ultimate Fantasy RTS pack (CDN after convert/upload) */
  ultimateFantasyRts: '/models/warlords/rts',
  /** Local authoring sources (dev only) */
  local: {
    survivalKit: 'D:/Games/Models/free_survival_asset_kit.glb',
    medievalTowers: 'D:/Games/Models/3_medieval_towers (1).glb',
    spellTable: 'D:/Games/Models/spell_table.glb',
    lumbermill: 'D:/Games/Models/lumbermill.glb',
    fantasyVillageKit:
      'C:/Users/david/OneDrive/Desktop/MouseWithoutBorders/fantasy_assets.glb',
    iceBiomeKit: 'C:/Users/david/OneDrive/Desktop/MouseWithoutBorders/icebiome.glb',
    ultimateFantasyRts:
      'C:/Users/nugye/Documents/Ultimate Fantasy RTS - Aug 2022-20260503T235302Z-3-001/Ultimate Fantasy RTS - Aug 2022/FBX',
  },
} as const;

/** Dock deck rides 0.2m above water plane; pilings extend below into water */
export const DOCK_DECK_Y_OFFSET = 0.2;

// ── Layer rules (ummorpg / Warlords review summary) ─────────────────────────

/**
 * uMMORPG Warlords pattern (reviewed against fleet WCS + island build):
 *
 * | Layer    | Auth in Unity era              | Web SSOT                          |
 * |----------|--------------------------------|-----------------------------------|
 * | Quick    | Inventory craft, no structure  | /api recipes, no BuildingSystem   |
 * | Camp     | Tent + fire near spawn         | campStage props, unlock stations  |
 * | Bench    | CraftingStation interact       | profession bench + XP 1–100       |
 * | Modular  | Snap walls/floors T1 wood      | BuildingSystem structural snaps   |
 * | RTS      | Full building, train units     | RTS barracks → AI unit → hero path|
 *
 * Hero path: RTS unit levels profession with T0 gear → promote to playable hero
 * (character UUID on Railway, not a separate unit DB long-term).
 */
export const BUILD_LAYER_RULES: Record<
  BuildLayer,
  { label: string; xpScope: 'none' | 'character' | 'unit'; description: string }
> = {
  quick: {
    label: 'Quick craft',
    xpScope: 'character',
    description: 'Hand/inventory craft. T0 only. No world prop. Account bag materials.',
  },
  camp: {
    label: 'Camp stages',
    xpScope: 'character',
    description: 'Tent → fire → bedroll. Unlocks Camp Bench station for allies.',
  },
  bench: {
    label: 'Profession benches',
    xpScope: 'character',
    description: 'World stations. Craft T0–T8 at bench; profession XP 1–100 on active character.',
  },
  modular: {
    label: 'Modular T1 build',
    xpScope: 'none',
    description: 'Snap foundations/walls/floors/roofs from survival kit wood pieces.',
  },
  dock: {
    label: 'Waterfront',
    xpScope: 'none',
    description: 'Floating foundations + docks. Deck Y = waterLevel + 0.2.',
  },
  rts: {
    label: 'RTS buildings',
    xpScope: 'unit',
    description: 'Full buildings train AI units; units level with T0; promote to hero.',
  },
  race_home: {
    label: 'Race homes',
    xpScope: 'none',
    description: 'Per-race starter housing kit (human/dwarf/elf/orc/undead/demon).',
  },
};

// ── Survival kit logical pieces (parent node names in free_survival_asset_kit.glb) ─

export const SURVIVAL_KIT_NODES = {
  // Camp progression
  tent: 'tent',
  tentClosed: 'tentClosed',
  tentHalf: 'tentHalf',
  campfire: 'campfire',
  bedroll: 'bedroll',
  bedrollPacked: 'bedrollPacked',
  bedrollFrame: 'bedrollFrame',
  // Benches / work
  workbench: 'workbench',           // box + hammer + paper → generic workbench
  workbenchAnvil: 'workbenchAnvil', // engineer / smith
  workbenchGrind: 'workbenchGrind', // miner sharpening wheel
  hammer: 'hammer',
  paper: 'paper',
  // Modular wood T1
  floor: 'floor',
  structure: 'structure',
  structureBase: 'structureBase',
  structureRoof: 'structureRoof',
  structureCloth: 'structureCloth',
  fence: 'fence',
  fenceFortified: 'fenceFortified',
  // Storage
  chest: 'chest',
  box: 'box',
  boxOpen: 'boxOpen',
  barrel: 'barrel',
  // Tools (props / loot visuals)
  toolAxe: 'toolAxe',
  toolPickaxe: 'toolPickaxe',
  toolShovel: 'toolShovel',
  toolHoe: 'toolHoe',
  // Nature/resources (optional harvest props)
  tree: 'tree',
  resourceWood: 'resourceWood',
  resourceStone: 'resourceStone',
  fishingStand: 'fishingStand',
  signpost: 'signpost',
} as const;

/** Tower roots in 3_medieval_towers pack (bashnia / b*_low families) */
export const MEDIEVAL_TOWER_NODES = {
  towerA: 'b1_low',
  towerB: 'b2_low',
  towerC: 'b3_low',
  towerD: 'b4_low',
  towerE: 'b5_low',
} as const;

