/**
 * Survival kit + specialty GLB → placeable build pieces.
 * Source meshes extracted from free_survival_asset_kit.glb (88 meshes / named roots).
 */
import {
  BUILD_PACK_PATHS,
  DOCK_DECK_Y_OFFSET,
  SURVIVAL_KIT_NODES,
  MEDIEVAL_TOWER_NODES,
  type BuildPieceDef,
} from './buildSystem';
import type { RaceId } from './lore';

const KIT = BUILD_PACK_PATHS.survivalKit;
const TOWERS = BUILD_PACK_PATHS.medievalTowers;
const SPELL = BUILD_PACK_PATHS.spellTable;
const LUMBER = BUILD_PACK_PATHS.lumbermill;

function kit(
  partial: Omit<BuildPieceDef, 'sourceGlb'> & { sourceGlb?: string },
): BuildPieceDef {
  return {
    sourceGlb: KIT,
    placeYOffset: 0,
    placement: 'prop',
    requiresFloor: false,
    terrainPlaceable: true,
    scale: 1,
    size: [1.5, 1.5, 1.5],
    cost: [],
    tier: 0,
    ...partial,
    sourceGlb: partial.sourceGlb ?? KIT,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMP STAGES (tent build progression)
// ═══════════════════════════════════════════════════════════════════════════

export const CAMP_STAGE_PIECES: BuildPieceDef[] = [
  kit({
    id: 'camp_tent_frame',
    name: 'Tent Frame (Half)',
    layer: 'camp',
    category: 'tent',
    nodeName: SURVIVAL_KIT_NODES.tentHalf,
    campStage: 0,
    size: [3, 2, 3],
    cost: [{ itemId: 'wood', quantity: 6 }, { itemId: 'cloth', quantity: 2 }],
    effect: {
      type: 'comfort',
      value: 5,
      description: 'Stage 0 camp — lean-to. Unlock full tent.',
    },
  }),
  kit({
    id: 'camp_tent',
    name: 'Open Tent',
    layer: 'camp',
    category: 'tent',
    nodeName: SURVIVAL_KIT_NODES.tent,
    campStage: 1,
    size: [3.5, 2.2, 3.5],
    cost: [{ itemId: 'wood', quantity: 10 }, { itemId: 'cloth', quantity: 6 }],
    effect: {
      type: 'comfort',
      value: 12,
      description: 'Stage 1 camp shelter. Place campfire next.',
    },
  }),
  kit({
    id: 'camp_tent_closed',
    name: 'Closed Tent',
    layer: 'camp',
    category: 'tent',
    nodeName: SURVIVAL_KIT_NODES.tentClosed,
    campStage: 2,
    size: [3.5, 2.2, 3.5],
    cost: [{ itemId: 'wood', quantity: 12 }, { itemId: 'cloth', quantity: 8 }],
    effect: {
      type: 'comfort',
      value: 18,
      description: 'Stage 2 sealed tent — weather resist.',
    },
  }),
  kit({
    id: 'camp_fire_soup',
    name: 'Campfire (Cooking)',
    layer: 'camp',
    category: 'fire',
    nodeName: SURVIVAL_KIT_NODES.campfire,
    /** rocks + wood + bucket read as soup/kettle fire */
    extraNodes: undefined,
    campStage: 1,
    profession: 'cooking',
    size: [1.6, 0.8, 1.6],
    cost: [{ itemId: 'stone', quantity: 6 }, { itemId: 'wood', quantity: 4 }],
    effect: {
      type: 'crafting',
      value: 1,
      description: 'Cooking bench T0 — soup fire. Unlocks Cooking station.',
    },
    notes: 'Mesh: campfire (wood + rocks + bucket). Treat as fire with soup bowl.',
  }),
  kit({
    id: 'camp_bedroll',
    name: 'Sleeping Bag / Bedroll',
    layer: 'camp',
    category: 'sleep',
    nodeName: SURVIVAL_KIT_NODES.bedroll,
    campStage: 1,
    size: [1.2, 0.3, 2.2],
    cost: [{ itemId: 'cloth', quantity: 4 }, { itemId: 'fiber', quantity: 2 }],
    effect: {
      type: 'respawn',
      value: 1,
      description: 'Set save / spawn point on this island.',
    },
  }),
  kit({
    id: 'camp_bedroll_packed',
    name: 'Packed Bedroll',
    layer: 'camp',
    category: 'sleep',
    nodeName: SURVIVAL_KIT_NODES.bedrollPacked,
    campStage: 0,
    size: [0.6, 0.4, 0.8],
    cost: [{ itemId: 'cloth', quantity: 2 }],
    effect: { type: 'storage', value: 2, description: 'Portable bedroll (place to set spawn)' },
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// PROFESSION BENCHES
// ═══════════════════════════════════════════════════════════════════════════

export const BENCH_PIECES: BuildPieceDef[] = [
  kit({
    id: 'bench_workbench',
    name: 'Workbench (Box + Hammer + Note)',
    layer: 'bench',
    category: 'bench',
    nodeName: SURVIVAL_KIT_NODES.workbench,
    extraNodes: [SURVIVAL_KIT_NODES.hammer, SURVIVAL_KIT_NODES.paper],
    profession: 'camp',
    craftUnlockLevel: 1,
    size: [1.8, 1.2, 1.0],
    cost: [{ itemId: 'wood', quantity: 12 }, { itemId: 'iron', quantity: 2 }],
    effect: {
      type: 'crafting',
      value: 1,
      description: 'General workbench — T0 camp crafts, tools, upgrades.',
    },
    notes: 'workbench + hammer + paper nodes from survival kit',
  }),
  kit({
    id: 'bench_anvil_engineer',
    name: 'Anvil (Engineer / Smith)',
    layer: 'bench',
    category: 'bench',
    nodeName: SURVIVAL_KIT_NODES.workbenchAnvil,
    profession: 'engineering',
    craftUnlockLevel: 1,
    size: [1.5, 1.0, 1.0],
    cost: [{ itemId: 'iron', quantity: 16 }, { itemId: 'wood', quantity: 4 }],
    effect: {
      type: 'crafting',
      value: 2,
      description: 'Engineer / smithing anvil — metal weapons, mechanisms T0–T3.',
    },
  }),
  kit({
    id: 'bench_grind_miner',
    name: 'Sharpening Wheel (Miner)',
    layer: 'bench',
    category: 'bench',
    nodeName: SURVIVAL_KIT_NODES.workbenchGrind,
    profession: 'mining',
    craftUnlockLevel: 1,
    size: [1.4, 1.4, 0.9],
    cost: [{ itemId: 'stone', quantity: 12 }, { itemId: 'wood', quantity: 6 }, { itemId: 'iron', quantity: 4 }],
    effect: {
      type: 'crafting',
      value: 2,
      description: 'Miner grindstone — process ore, sharpen tools, mining crafts.',
    },
  }),
  kit({
    id: 'bench_cooking',
    name: 'Cooking Fire',
    layer: 'bench',
    category: 'fire',
    nodeName: SURVIVAL_KIT_NODES.campfire,
    profession: 'cooking',
    craftUnlockLevel: 1,
    size: [1.6, 0.8, 1.6],
    cost: [{ itemId: 'stone', quantity: 8 }, { itemId: 'wood', quantity: 4 }],
    effect: {
      type: 'crafting',
      value: 1,
      description: 'Cooking station — food, broths, field rations.',
    },
  }),
  // Full GLB benches (not multipack nodes)
  kit({
    id: 'bench_mystic',
    name: 'Mystic Spell Table',
    layer: 'bench',
    category: 'bench',
    sourceGlb: SPELL,
    nodeName: 'root', // whole scene
    profession: 'mystic',
    craftUnlockLevel: 5,
    scale: 0.8,
    size: [2.2, 1.5, 2.2],
    cost: [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'arcane_dust', quantity: 8 },
      { itemId: 'cloth', quantity: 6 },
    ],
    effect: {
      type: 'crafting',
      value: 3,
      description: 'Mystic bench — enchantments, foci, spell reagents.',
    },
    notes: 'spell_table.glb full scene',
  }),
  kit({
    id: 'bench_forestry',
    name: 'Forestry Lumbermill',
    layer: 'bench',
    category: 'bench',
    sourceGlb: LUMBER,
    nodeName: 'sawmill',
    profession: 'forestry',
    craftUnlockLevel: 1,
    scale: 0.35,
    size: [6, 4, 5],
    cost: [{ itemId: 'wood', quantity: 40 }, { itemId: 'iron', quantity: 12 }],
    effect: {
      type: 'crafting',
      value: 3,
      description: 'Forestry bench — planks, beams, refined timber T0–T5.',
    },
    notes: 'lumbermill.glb sawmill root',
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR T1 WOOD (survival kit structure pieces)
// ═══════════════════════════════════════════════════════════════════════════

export const MODULAR_T1_PIECES: BuildPieceDef[] = [
  kit({
    id: 'mod_floor',
    name: 'Wood Floor',
    layer: 'modular',
    category: 'floor',
    nodeName: SURVIVAL_KIT_NODES.floor,
    placement: 'structural',
    requiresFloor: false,
    terrainPlaceable: true,
    floating: true,
    tier: 1,
    size: [4, 0.25, 4],
    cost: [{ itemId: 'wood', quantity: 8 }],
    effect: { type: 'foundation', value: 1, description: 'T1 floor tile — snap walls/roofs' },
  }),
  kit({
    id: 'mod_foundation_float',
    name: 'Floating Foundation',
    layer: 'modular',
    category: 'foundation',
    nodeName: SURVIVAL_KIT_NODES.structureBase,
    placement: 'structural',
    terrainPlaceable: true,
    floating: true,
    placeYOffset: DOCK_DECK_Y_OFFSET,
    tier: 0,
    size: [4, 0.5, 4],
    cost: [{ itemId: 'wood', quantity: 10 }, { itemId: 'rope', quantity: 2 }],
    effect: {
      type: 'foundation',
      value: 1,
      description: 'Starter floating foundation — place over shallows / water edge.',
    },
    notes: 'Starting modular build piece',
  }),
  kit({
    id: 'mod_wall',
    name: 'Wood Wall',
    layer: 'modular',
    category: 'wall',
    nodeName: SURVIVAL_KIT_NODES.structure,
    placement: 'structural',
    requiresFloor: true,
    terrainPlaceable: false,
    tier: 1,
    size: [4, 3, 0.3],
    cost: [{ itemId: 'wood', quantity: 6 }],
  }),
  kit({
    id: 'mod_roof',
    name: 'Wood Roof',
    layer: 'modular',
    category: 'roof',
    nodeName: SURVIVAL_KIT_NODES.structureRoof,
    placement: 'structural',
    requiresFloor: true,
    terrainPlaceable: false,
    tier: 1,
    size: [4, 1.5, 4],
    cost: [{ itemId: 'wood', quantity: 8 }],
  }),
  kit({
    id: 'mod_cloth_shelter',
    name: 'Cloth Shelter Wall',
    layer: 'modular',
    category: 'wall',
    nodeName: SURVIVAL_KIT_NODES.structureCloth,
    placement: 'structural',
    requiresFloor: true,
    terrainPlaceable: false,
    tier: 1,
    size: [4, 2.5, 0.2],
    cost: [{ itemId: 'wood', quantity: 2 }, { itemId: 'cloth', quantity: 4 }],
  }),
  kit({
    id: 'mod_fence',
    name: 'Wood Fence',
    layer: 'modular',
    category: 'fence',
    nodeName: SURVIVAL_KIT_NODES.fence,
    placement: 'prop',
    tier: 1,
    size: [4, 1.2, 0.2],
    cost: [{ itemId: 'wood', quantity: 3 }],
    effect: { type: 'defense', value: 8, description: 'Blocks wildlife pathing' },
  }),
  kit({
    id: 'mod_fence_fort',
    name: 'Fortified Fence',
    layer: 'modular',
    category: 'fence',
    nodeName: SURVIVAL_KIT_NODES.fenceFortified,
    placement: 'prop',
    tier: 1,
    size: [4, 1.6, 0.25],
    cost: [{ itemId: 'wood', quantity: 6 }, { itemId: 'iron', quantity: 1 }],
    effect: { type: 'defense', value: 18, description: 'Stronger perimeter' },
  }),
  kit({
    id: 'mod_chest',
    name: 'Storage Chest',
    layer: 'modular',
    category: 'storage',
    nodeName: SURVIVAL_KIT_NODES.chest,
    tier: 1,
    size: [1.2, 0.9, 0.8],
    cost: [{ itemId: 'wood', quantity: 6 }],
    effect: { type: 'storage', value: 20, description: '20 slots account-shared when linked' },
  }),
  kit({
    id: 'mod_box',
    name: 'Crate',
    layer: 'modular',
    category: 'storage',
    nodeName: SURVIVAL_KIT_NODES.box,
    tier: 1,
    size: [0.9, 0.9, 0.9],
    cost: [{ itemId: 'wood', quantity: 3 }],
    effect: { type: 'storage', value: 8, description: '8 resource slots' },
  }),
  kit({
    id: 'mod_barrel',
    name: 'Barrel',
    layer: 'modular',
    category: 'storage',
    nodeName: SURVIVAL_KIT_NODES.barrel,
    tier: 1,
    size: [0.8, 1.1, 0.8],
    cost: [{ itemId: 'wood', quantity: 4 }],
    effect: { type: 'storage', value: 8, description: 'Liquid / food storage' },
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// DOCKS — deck 0.2m above water
// ═══════════════════════════════════════════════════════════════════════════

export const DOCK_PIECES: BuildPieceDef[] = [
  kit({
    id: 'dock_foundation',
    name: 'Dock Foundation',
    layer: 'dock',
    category: 'dock',
    nodeName: SURVIVAL_KIT_NODES.structureBase,
    floating: true,
    placeYOffset: DOCK_DECK_Y_OFFSET,
    size: [4, 0.5, 4],
    cost: [{ itemId: 'wood', quantity: 12 }, { itemId: 'rope', quantity: 4 }],
    effect: {
      type: 'foundation',
      value: 1,
      description: 'Floating dock pad. Deck at waterY+0.2; legs read in water.',
    },
  }),
  kit({
    id: 'dock_plank',
    name: 'Dock Plank Floor',
    layer: 'dock',
    category: 'dock',
    nodeName: SURVIVAL_KIT_NODES.floor,
    floating: true,
    placeYOffset: DOCK_DECK_Y_OFFSET,
    placement: 'structural',
    size: [4, 0.2, 4],
    cost: [{ itemId: 'wood', quantity: 8 }],
  }),
  kit({
    id: 'dock_fishing_stand',
    name: 'Fishing Stand',
    layer: 'dock',
    category: 'dock',
    nodeName: SURVIVAL_KIT_NODES.fishingStand,
    placeYOffset: DOCK_DECK_Y_OFFSET,
    size: [1.2, 1.5, 1.2],
    cost: [{ itemId: 'wood', quantity: 6 }],
    profession: 'camp',
    effect: { type: 'crafting', value: 1, description: 'Shore fishing prop / profession flavor' },
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// TOWERS (medieval pack)
// ═══════════════════════════════════════════════════════════════════════════

export const TOWER_PIECES: BuildPieceDef[] = [
  kit({
    id: 'tower_medieval_a',
    name: 'Medieval Tower A',
    layer: 'rts',
    category: 'tower',
    sourceGlb: TOWERS,
    nodeName: MEDIEVAL_TOWER_NODES.towerA,
    scale: 0.012,
    size: [6, 18, 6],
    cost: [{ itemId: 'stone', quantity: 40 }, { itemId: 'wood', quantity: 20 }],
    effect: {
      type: 'defense',
      value: 60,
      description: 'Watchtower — reveal + defense. RTS lane optional.',
    },
    notes: '3_medieval_towers.glb — b1_low family; calibrate scale in-game',
  }),
  kit({
    id: 'tower_medieval_b',
    name: 'Medieval Tower B',
    layer: 'rts',
    category: 'tower',
    sourceGlb: TOWERS,
    nodeName: MEDIEVAL_TOWER_NODES.towerB,
    scale: 0.012,
    size: [6, 18, 6],
    cost: [{ itemId: 'stone', quantity: 45 }, { itemId: 'wood', quantity: 22 }],
    effect: { type: 'defense', value: 65, description: 'Alternate tower silhouette' },
  }),
  kit({
    id: 'tower_medieval_c',
    name: 'Medieval Tower C',
    layer: 'rts',
    category: 'tower',
    sourceGlb: TOWERS,
    nodeName: MEDIEVAL_TOWER_NODES.towerC,
    scale: 0.012,
    size: [7, 20, 7],
    cost: [{ itemId: 'stone', quantity: 55 }, { itemId: 'iron', quantity: 10 }],
    effect: { type: 'train_unit', value: 1, description: 'Can host a single garrison AI unit' },
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// RACE HOMES (kit compositions — theme later with race GLBs)
// ═══════════════════════════════════════════════════════════════════════════

const RACE_HOME_BASE: Omit<BuildPieceDef, 'id' | 'name' | 'raceId' | 'nodeName'> = {
  layer: 'race_home',
  category: 'race_home',
  sourceGlb: KIT,
  scale: 1.1,
  size: [6, 3, 6],
  placeYOffset: 0,
  placement: 'prop',
  requiresFloor: false,
  terrainPlaceable: true,
  tier: 1,
  cost: [{ itemId: 'wood', quantity: 30 }, { itemId: 'cloth', quantity: 10 }, { itemId: 'stone', quantity: 8 }],
  effect: {
    type: 'comfort',
    value: 40,
    description: 'Race home — personal shelter + spawn bind.',
  },
};

/** Starter homes use tent/structure combos until dedicated race house GLBs ship */
export const RACE_HOME_PIECES: BuildPieceDef[] = (
  [
    ['human', 'Haven Cottage', SURVIVAL_KIT_NODES.structure],
    ['dwarf', 'Runeforge Cabin', SURVIVAL_KIT_NODES.structureBase],
    ['elf', 'Canopy Shelter', SURVIVAL_KIT_NODES.structureCloth],
    ['orc', 'Pit Lodge', SURVIVAL_KIT_NODES.tentClosed],
    ['undead', 'Sepulcher Shack', SURVIVAL_KIT_NODES.structureRoof],
    ['demon', 'Ashen Pavilion', SURVIVAL_KIT_NODES.tent],
  ] as Array<[RaceId, string, string]>
).map(([raceId, name, nodeName]) => ({
  ...RACE_HOME_BASE,
  id: `race_home_${raceId}`,
  name,
  raceId,
  nodeName,
  notes: `Race home for ${raceId} — survival kit node until race-specific exterior GLB`,
}));

// ═══════════════════════════════════════════════════════════════════════════
// RTS buildings (unit train → hero path stub)
// ═══════════════════════════════════════════════════════════════════════════

export const RTS_BUILDING_PIECES: BuildPieceDef[] = [
  kit({
    id: 'rts_barracks_t0',
    name: 'Barracks (T0)',
    layer: 'rts',
    category: 'rts_building',
    nodeName: SURVIVAL_KIT_NODES.structure,
    extraNodes: [SURVIVAL_KIT_NODES.signpost],
    scale: 1.4,
    size: [8, 4, 8],
    cost: [{ itemId: 'wood', quantity: 60 }, { itemId: 'stone', quantity: 30 }],
    effect: {
      type: 'train_unit',
      value: 1,
      description:
        'Train AI units (T0 gear). Units level profession 1–100; promote to hero (Railway character).',
    },
    notes: 'Placeholder mesh until dedicated barracks GLB',
  }),
];

/** Flat list for BuildingSystem / UI */
export const ALL_SURVIVAL_BUILD_PIECES: BuildPieceDef[] = [
  ...CAMP_STAGE_PIECES,
  ...BENCH_PIECES,
  ...MODULAR_T1_PIECES,
  ...DOCK_PIECES,
  ...TOWER_PIECES,
  ...RACE_HOME_PIECES,
  ...RTS_BUILDING_PIECES,
];

export function getBuildPiece(id: string): BuildPieceDef | undefined {
  return ALL_SURVIVAL_BUILD_PIECES.find((p) => p.id === id);
}

export function buildPiecesByLayer(layer: BuildPieceDef['layer']): BuildPieceDef[] {
  return ALL_SURVIVAL_BUILD_PIECES.filter((p) => p.layer === layer);
}

export function buildPiecesByProfession(prof: string): BuildPieceDef[] {
  return ALL_SURVIVAL_BUILD_PIECES.filter((p) => p.profession === prof);
}
