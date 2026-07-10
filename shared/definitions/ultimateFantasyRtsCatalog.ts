/**
 * Ultimate Fantasy RTS (Aug 2022) — canonical pack SSOT.
 *
 * Source (local):
 *   Documents/Ultimate Fantasy RTS - Aug 2022-.../Ultimate Fantasy RTS - Aug 2022/FBX
 *
 * CDN after convert + upload:
 *   models/warlords/rts/{category}/{name}.glb  (preferred)
 *   models/warlords/rts/{category}/{name}.fbx  (interim until convert)
 *
 * Categories map to island / zone / UI usage.
 */

export const ULTIMATE_FANTASY_RTS_VERSION = '1.0.0';
export const ULTIMATE_FANTASY_RTS_SOURCE =
  'Ultimate Fantasy RTS - Aug 2022/FBX';

export type UfrtsCategory =
  | 'mine_quarry' // stone-only harvest / buildable
  | 'mountain' // one per home island mountain area
  | 'rts_barracks' // train melee / infantry units
  | 'rts_archery' // train ranged units
  | 'rts_farm' // economy / food
  | 'rts_temple' // mystic / priest
  | 'rts_town_center' // HQ / age up
  | 'rts_market' // commerce
  | 'rts_storage' // warehouse
  | 'rts_port' // boat / dock commerce
  | 'rts_dock' // simple dock
  | 'rts_house' // population
  | 'rts_watchtower' // defense
  | 'rts_wall' // walls / gates
  | 'rts_windmill' // farm support
  | 'rts_wonder' // late game
  | 'rts_tower_house' // hybrid defense housing
  | 'resource_tree' // harvest wood
  | 'resource_rock' // harvest stone
  | 'resource_node' // generic resource nodes
  | 'prop_crate' // decoration / storage prop
  | 'prop_logs';

export type UfrtsAge = 'first' | 'second' | 'any';
export type UfrtsUpgradeLevel = 1 | 2 | 3 | 0;

export interface UfrtsAssetDef {
  id: string;
  /** Filename without extension */
  fileStem: string;
  category: UfrtsCategory;
  age: UfrtsAge;
  /** Upgrade tier 1–3 (0 = single mesh / no upgrade chain) */
  level: UfrtsUpgradeLevel;
  label: string;
  /** Target world height after fit (meters) */
  targetHeightM: number;
  /** Train unit type when placed as RTS building */
  trainsUnit?: 'infantry' | 'archer' | 'worker' | 'priest' | 'hero_promote';
  /** Harvest profession when used as resource/mine */
  harvestProfession?: 'miner' | 'forestry' | 'farmer' | 'none';
  /** Home-island generation role */
  homeIslandRole?:
    | 'stone_mine'
    | 'mountain'
    | 'resource_scatter'
    | 'buildable'
    | 'none';
  tags: string[];
  /** CDN path (GLB preferred; FBX until converted) */
  pathGlb: string;
  pathFbx: string;
}

const CDN = '/models/warlords/rts';

function catFolder(c: UfrtsCategory): string {
  if (c === 'mine_quarry') return 'mines';
  if (c === 'mountain') return 'mountains';
  if (c.startsWith('resource_')) return 'resources';
  if (c.startsWith('prop_')) return 'props';
  return 'buildings';
}

function def(
  partial: Omit<UfrtsAssetDef, 'pathGlb' | 'pathFbx' | 'id'> & { id?: string },
): UfrtsAssetDef {
  const folder = catFolder(partial.category);
  const id = partial.id ?? `ufrts_${partial.fileStem.toLowerCase()}`;
  return {
    ...partial,
    id,
    pathGlb: `${CDN}/${folder}/${partial.fileStem}.glb`,
    pathFbx: `${CDN}/${folder}/${partial.fileStem}.fbx`,
  };
}

// ── Stone quarry mine (buildable + world harvest) ─────────────────────────

export const UFRTS_STONE_MINE: UfrtsAssetDef = def({
  fileStem: 'Mine',
  category: 'mine_quarry',
  age: 'any',
  level: 0,
  label: 'Stone Quarry Mine',
  targetHeightM: 5.5,
  harvestProfession: 'miner',
  homeIslandRole: 'stone_mine',
  tags: ['mine', 'quarry', 'stone', 'miner', 'buildable', 'home_island'],
});

export const UFRTS_MOUNTAINS: UfrtsAssetDef[] = [
  def({
    fileStem: 'Mountain_Group_1',
    category: 'mountain',
    age: 'any',
    level: 0,
    label: 'Mountain Group A',
    targetHeightM: 32,
    homeIslandRole: 'mountain',
    tags: ['mountain', 'home_island', 'landmark'],
  }),
  def({
    fileStem: 'Mountain_Group_2',
    category: 'mountain',
    age: 'any',
    level: 0,
    label: 'Mountain Group B',
    targetHeightM: 28,
    homeIslandRole: 'mountain',
    tags: ['mountain', 'home_island', 'landmark'],
  }),
  def({
    fileStem: 'Mountain_Single',
    category: 'mountain',
    age: 'any',
    level: 0,
    label: 'Mountain Peak (Single)',
    targetHeightM: 24,
    homeIslandRole: 'mountain',
    tags: ['mountain', 'home_island', 'landmark'],
  }),
  def({
    fileStem: 'MountainLarge_Single',
    category: 'mountain',
    age: 'any',
    level: 0,
    label: 'Mountain Peak (Large)',
    targetHeightM: 40,
    homeIslandRole: 'mountain',
    tags: ['mountain', 'home_island', 'landmark'],
  }),
];

// ── RTS production buildings (with upgrade chains) ────────────────────────

function chain(
  base: string,
  category: UfrtsCategory,
  ages: Array<{ age: UfrtsAge; prefix: string }>,
  levels: number[],
  labelBase: string,
  height: number,
  trainsUnit?: UfrtsAssetDef['trainsUnit'],
): UfrtsAssetDef[] {
  const out: UfrtsAssetDef[] = [];
  for (const a of ages) {
    for (const lv of levels) {
      const stem = `${base}_${a.prefix}_Level${lv}`;
      out.push(
        def({
          fileStem: stem,
          category,
          age: a.age,
          level: lv as UfrtsUpgradeLevel,
          label: `${labelBase} (${a.age === 'first' ? 'Age I' : 'Age II'} · L${lv})`,
          targetHeightM: height * (1 + (lv - 1) * 0.12),
          trainsUnit: lv >= 1 ? trainsUnit : undefined,
          homeIslandRole: 'buildable',
          tags: ['rts', category, `age_${a.age}`, `level_${lv}`, 'upgrade'],
        }),
      );
    }
  }
  return out;
}

export const UFRTS_BARRACKS = chain(
  'Barracks',
  'rts_barracks',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Barracks',
  8,
  'infantry',
);

export const UFRTS_ARCHERY = chain(
  'Archery',
  'rts_archery',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Archery Range',
  7,
  'archer',
);

export const UFRTS_TEMPLE = chain(
  'Temple',
  'rts_temple',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Temple',
  10,
  'priest',
);

export const UFRTS_TOWN_CENTER = chain(
  'TownCenter',
  'rts_town_center',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Town Center',
  12,
  'worker',
);

export const UFRTS_FARM: UfrtsAssetDef[] = [
  ...chain(
    'Farm',
    'rts_farm',
    [
      { age: 'first', prefix: 'FirstAge' },
      { age: 'second', prefix: 'SecondAge' },
    ],
    [1, 2, 3],
    'Farm',
    4,
    'worker',
  ),
  // Wheat variants + dirt plots
  ...[1, 2, 3].flatMap((lv) => [
    def({
      fileStem: `Farm_FirstAge_Level${lv}_Wheat`,
      category: 'rts_farm',
      age: 'first',
      level: lv as UfrtsUpgradeLevel,
      label: `Farm Wheat (Age I · L${lv})`,
      targetHeightM: 2.5,
      harvestProfession: 'farmer',
      homeIslandRole: 'buildable',
      tags: ['rts', 'farm', 'wheat', 'food'],
    }),
    def({
      fileStem: `Farm_SecondAge_Level${lv}_Wheat`,
      category: 'rts_farm',
      age: 'second',
      level: lv as UfrtsUpgradeLevel,
      label: `Farm Wheat (Age II · L${lv})`,
      targetHeightM: 2.8,
      harvestProfession: 'farmer',
      homeIslandRole: 'buildable',
      tags: ['rts', 'farm', 'wheat', 'food'],
    }),
    def({
      fileStem: `Farm_Dirt_Level${lv}`,
      category: 'rts_farm',
      age: 'any',
      level: lv as UfrtsUpgradeLevel,
      label: `Farm Dirt Plot L${lv}`,
      targetHeightM: 0.4,
      harvestProfession: 'farmer',
      homeIslandRole: 'buildable',
      tags: ['rts', 'farm', 'dirt'],
    }),
  ]),
];

export const UFRTS_MARKET = chain(
  'Market',
  'rts_market',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Market',
  7,
);

export const UFRTS_STORAGE: UfrtsAssetDef[] = [
  def({
    fileStem: 'Storage_FirstAge_Level1',
    category: 'rts_storage',
    age: 'first',
    level: 1,
    label: 'Storage (Age I · L1)',
    targetHeightM: 6,
    homeIslandRole: 'buildable',
    tags: ['rts', 'storage'],
  }),
  def({
    fileStem: 'Storage_FirstAge_Level2',
    category: 'rts_storage',
    age: 'first',
    level: 2,
    label: 'Storage (Age I · L2)',
    targetHeightM: 7,
    homeIslandRole: 'buildable',
    tags: ['rts', 'storage'],
  }),
  def({
    fileStem: 'Storage_FirstAge_Leve3', // pack typo preserved
    category: 'rts_storage',
    age: 'first',
    level: 3,
    label: 'Storage (Age I · L3)',
    targetHeightM: 8,
    homeIslandRole: 'buildable',
    tags: ['rts', 'storage'],
  }),
  ...[1, 2, 3].map((lv) =>
    def({
      fileStem: `Storage_SecondAge_Level${lv}`,
      category: 'rts_storage',
      age: 'second',
      level: lv as UfrtsUpgradeLevel,
      label: `Storage (Age II · L${lv})`,
      targetHeightM: 6 + lv,
      homeIslandRole: 'buildable',
      tags: ['rts', 'storage'],
    }),
  ),
];

export const UFRTS_PORT = chain(
  'Port',
  'rts_port',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Port',
  6,
);

export const UFRTS_DOCK: UfrtsAssetDef[] = [
  def({
    fileStem: 'Dock_FirstAge',
    category: 'rts_dock',
    age: 'first',
    level: 0,
    label: 'Dock (Age I)',
    targetHeightM: 2.5,
    homeIslandRole: 'buildable',
    tags: ['rts', 'dock', 'boat', 'shore'],
  }),
];

export const UFRTS_HOUSES: UfrtsAssetDef[] = [1, 2, 3].flatMap((variant) =>
  [1, 2, 3].flatMap((lv) => [
    def({
      fileStem: `Houses_FirstAge_${variant}_Level${lv}`,
      category: 'rts_house',
      age: 'first',
      level: lv as UfrtsUpgradeLevel,
      label: `House ${variant} (Age I · L${lv})`,
      targetHeightM: 4 + lv * 0.5,
      homeIslandRole: 'buildable',
      tags: ['rts', 'house', 'population'],
    }),
    def({
      fileStem: `Houses_SecondAge_${variant}_Level${lv}`,
      category: 'rts_house',
      age: 'second',
      level: lv as UfrtsUpgradeLevel,
      label: `House ${variant} (Age II · L${lv})`,
      targetHeightM: 5 + lv * 0.5,
      homeIslandRole: 'buildable',
      tags: ['rts', 'house', 'population'],
    }),
  ]),
);

export const UFRTS_WATCHTOWERS = chain(
  'WatchTower',
  'rts_watchtower',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Watch Tower',
  10,
);

export const UFRTS_WALLS: UfrtsAssetDef[] = [
  def({
    fileStem: 'Wall_FirstAge',
    category: 'rts_wall',
    age: 'first',
    level: 0,
    label: 'Wall (Age I)',
    targetHeightM: 4,
    homeIslandRole: 'buildable',
    tags: ['rts', 'wall', 'defense'],
  }),
  def({
    fileStem: 'Wall_SecondAge',
    category: 'rts_wall',
    age: 'second',
    level: 0,
    label: 'Wall (Age II)',
    targetHeightM: 5,
    homeIslandRole: 'buildable',
    tags: ['rts', 'wall', 'defense'],
  }),
  def({
    fileStem: 'WallTowers_FirstAge',
    category: 'rts_wall',
    age: 'first',
    level: 0,
    label: 'Wall Tower (Age I)',
    targetHeightM: 8,
    homeIslandRole: 'buildable',
    tags: ['rts', 'wall', 'tower', 'defense'],
  }),
  def({
    fileStem: 'WallTowers_SecondAge',
    category: 'rts_wall',
    age: 'second',
    level: 0,
    label: 'Wall Tower (Age II)',
    targetHeightM: 9,
    homeIslandRole: 'buildable',
    tags: ['rts', 'wall', 'tower', 'defense'],
  }),
  def({
    fileStem: 'WallTowers_Door_FirstAge',
    category: 'rts_wall',
    age: 'first',
    level: 0,
    label: 'Gate Open (Age I)',
    targetHeightM: 7,
    homeIslandRole: 'buildable',
    tags: ['rts', 'gate', 'defense'],
  }),
  def({
    fileStem: 'WallTowers_Door_SecondAge',
    category: 'rts_wall',
    age: 'second',
    level: 0,
    label: 'Gate Open (Age II)',
    targetHeightM: 8,
    homeIslandRole: 'buildable',
    tags: ['rts', 'gate', 'defense'],
  }),
  def({
    fileStem: 'WallTowers_DoorClosed_FirstAge',
    category: 'rts_wall',
    age: 'first',
    level: 0,
    label: 'Gate Closed (Age I)',
    targetHeightM: 7,
    homeIslandRole: 'buildable',
    tags: ['rts', 'gate', 'defense'],
  }),
  def({
    fileStem: 'WallTowers_DoorClosed_SecondAge',
    category: 'rts_wall',
    age: 'second',
    level: 0,
    label: 'Gate Closed (Age II)',
    targetHeightM: 8,
    homeIslandRole: 'buildable',
    tags: ['rts', 'gate', 'defense'],
  }),
  def({
    fileStem: 'WonderWalls_FirstAge',
    category: 'rts_wall',
    age: 'first',
    level: 0,
    label: 'Wonder Walls (Age I)',
    targetHeightM: 6,
    homeIslandRole: 'buildable',
    tags: ['rts', 'wall', 'wonder'],
  }),
  def({
    fileStem: 'WonderWalls_SecondAge',
    category: 'rts_wall',
    age: 'second',
    level: 0,
    label: 'Wonder Walls (Age II)',
    targetHeightM: 7,
    homeIslandRole: 'buildable',
    tags: ['rts', 'wall', 'wonder'],
  }),
];

export const UFRTS_WINDMILLS: UfrtsAssetDef[] = [
  def({
    fileStem: 'Windmill_FirstAge',
    category: 'rts_windmill',
    age: 'first',
    level: 0,
    label: 'Windmill (Age I)',
    targetHeightM: 12,
    homeIslandRole: 'buildable',
    tags: ['rts', 'windmill', 'farm'],
  }),
  def({
    fileStem: 'Windmill_SecondAge',
    category: 'rts_windmill',
    age: 'second',
    level: 0,
    label: 'Windmill (Age II)',
    targetHeightM: 14,
    homeIslandRole: 'buildable',
    tags: ['rts', 'windmill', 'farm'],
  }),
];

export const UFRTS_WONDERS = chain(
  'Wonder',
  'rts_wonder',
  [
    { age: 'first', prefix: 'FirstAge' },
    { age: 'second', prefix: 'SecondAge' },
  ],
  [1, 2, 3],
  'Wonder',
  18,
);

export const UFRTS_TOWER_HOUSES: UfrtsAssetDef[] = [
  def({
    fileStem: 'TowerHouse_FirstAge',
    category: 'rts_tower_house',
    age: 'first',
    level: 0,
    label: 'Tower House (Age I)',
    targetHeightM: 9,
    homeIslandRole: 'buildable',
    tags: ['rts', 'tower', 'house'],
  }),
  def({
    fileStem: 'TowerHouse_SecondAge',
    category: 'rts_tower_house',
    age: 'second',
    level: 0,
    label: 'Tower House (Age II)',
    targetHeightM: 11,
    homeIslandRole: 'buildable',
    tags: ['rts', 'tower', 'house'],
  }),
];

// ── Resources & props ─────────────────────────────────────────────────────

export const UFRTS_RESOURCES: UfrtsAssetDef[] = [
  def({
    fileStem: 'Resource_Tree1',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Resource Tree A',
    targetHeightM: 8,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'tree', 'harvest'],
  }),
  def({
    fileStem: 'Resource_Tree2',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Resource Tree B',
    targetHeightM: 7.5,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'tree', 'harvest'],
  }),
  def({
    fileStem: 'Resource_Tree_Group',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Tree Group',
    targetHeightM: 10,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'tree', 'harvest'],
  }),
  def({
    fileStem: 'Resource_Tree_Group_Cut',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Tree Group (Cut)',
    targetHeightM: 2,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'stump', 'harvest'],
  }),
  def({
    fileStem: 'Resource_PineTree',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Pine Tree',
    targetHeightM: 9,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'pine', 'harvest'],
  }),
  def({
    fileStem: 'Resource_PineTree_Group',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Pine Group',
    targetHeightM: 11,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'pine', 'harvest'],
  }),
  def({
    fileStem: 'Resource_PineTree_Group_Cut',
    category: 'resource_tree',
    age: 'any',
    level: 0,
    label: 'Pine Group (Cut)',
    targetHeightM: 2,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'stump'],
  }),
  ...[1, 2, 3].map((n) =>
    def({
      fileStem: `Resource_Rock_${n}`,
      category: 'resource_rock',
      age: 'any',
      level: 0,
      label: `Resource Rock ${n}`,
      targetHeightM: 1.8 + n * 0.3,
      harvestProfession: 'miner',
      homeIslandRole: 'resource_scatter',
      tags: ['stone', 'rock', 'harvest', 'miner'],
    }),
  ),
  def({
    fileStem: 'Rock',
    category: 'resource_rock',
    age: 'any',
    level: 0,
    label: 'Rock',
    targetHeightM: 1.5,
    harvestProfession: 'miner',
    homeIslandRole: 'resource_scatter',
    tags: ['stone', 'rock'],
  }),
  def({
    fileStem: 'Rock_Group',
    category: 'resource_rock',
    age: 'any',
    level: 0,
    label: 'Rock Group',
    targetHeightM: 2.5,
    harvestProfession: 'miner',
    homeIslandRole: 'resource_scatter',
    tags: ['stone', 'rock'],
  }),
  ...[1, 2, 3].map((n) =>
    def({
      fileStem: `Resource_node_${n}`,
      category: 'resource_node',
      age: 'any',
      level: 0,
      label: `Resource Node ${n}`,
      targetHeightM: 2 + n * 0.2,
      harvestProfession: 'miner',
      homeIslandRole: 'resource_scatter',
      tags: ['resource', 'node', 'harvest'],
    }),
  ),
];

export const UFRTS_PROPS: UfrtsAssetDef[] = [
  def({
    fileStem: 'Barrel',
    category: 'prop_crate',
    age: 'any',
    level: 0,
    label: 'Barrel',
    targetHeightM: 1.1,
    homeIslandRole: 'none',
    tags: ['prop', 'storage'],
  }),
  def({
    fileStem: 'Crate',
    category: 'prop_crate',
    age: 'any',
    level: 0,
    label: 'Crate',
    targetHeightM: 0.9,
    homeIslandRole: 'none',
    tags: ['prop', 'storage'],
  }),
  def({
    fileStem: 'Crate_Stack1',
    category: 'prop_crate',
    age: 'any',
    level: 0,
    label: 'Crate Stack A',
    targetHeightM: 1.6,
    homeIslandRole: 'none',
    tags: ['prop', 'storage'],
  }),
  def({
    fileStem: 'Crate_Stack2',
    category: 'prop_crate',
    age: 'any',
    level: 0,
    label: 'Crate Stack B',
    targetHeightM: 1.8,
    homeIslandRole: 'none',
    tags: ['prop', 'storage'],
  }),
  def({
    fileStem: 'Crate_Big_Stack2',
    category: 'prop_crate',
    age: 'any',
    level: 0,
    label: 'Crate Big Stack',
    targetHeightM: 2.2,
    homeIslandRole: 'none',
    tags: ['prop', 'storage'],
  }),
  def({
    fileStem: 'Logs',
    category: 'prop_logs',
    age: 'any',
    level: 0,
    label: 'Log Pile',
    targetHeightM: 1.2,
    harvestProfession: 'forestry',
    homeIslandRole: 'resource_scatter',
    tags: ['wood', 'prop'],
  }),
];

/** Every asset in the pack (128 files) */
export const ALL_UFRTS_ASSETS: UfrtsAssetDef[] = [
  UFRTS_STONE_MINE,
  ...UFRTS_MOUNTAINS,
  ...UFRTS_BARRACKS,
  ...UFRTS_ARCHERY,
  ...UFRTS_TEMPLE,
  ...UFRTS_TOWN_CENTER,
  ...UFRTS_FARM,
  ...UFRTS_MARKET,
  ...UFRTS_STORAGE,
  ...UFRTS_PORT,
  ...UFRTS_DOCK,
  ...UFRTS_HOUSES,
  ...UFRTS_WATCHTOWERS,
  ...UFRTS_WALLS,
  ...UFRTS_WINDMILLS,
  ...UFRTS_WONDERS,
  ...UFRTS_TOWER_HOUSES,
  ...UFRTS_RESOURCES,
  ...UFRTS_PROPS,
];

/** Prefer GLB path; runtime falls back to FBX via FBXLoader */
export function ufrtsModelPath(asset: UfrtsAssetDef, preferGlb = true): string {
  return preferGlb ? asset.pathGlb : asset.pathFbx;
}

export function ufrtsByCategory(cat: UfrtsCategory): UfrtsAssetDef[] {
  return ALL_UFRTS_ASSETS.filter((a) => a.category === cat);
}

/** One mountain variant per island (deterministic) */
export function pickHomeIslandMountain(
  seed: string,
): UfrtsAssetDef {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return UFRTS_MOUNTAINS[h % UFRTS_MOUNTAINS.length]!;
}

/** Starter build menu: L1 Age I for core RTS + stone mine */
export const UFRTS_BUILD_MENU_STARTERS: string[] = [
  'Mine',
  'Barracks_FirstAge_Level1',
  'Archery_FirstAge_Level1',
  'Farm_FirstAge_Level1',
  'Temple_FirstAge_Level1',
  'TownCenter_FirstAge_Level1',
  'Market_FirstAge_Level1',
  'Storage_FirstAge_Level1',
  'Dock_FirstAge',
  'Port_FirstAge_Level1',
  'WatchTower_FirstAge_Level1',
  'Wall_FirstAge',
  'Houses_FirstAge_1_Level1',
  'Windmill_FirstAge',
];

export function getUfrtsByStem(stem: string): UfrtsAssetDef | undefined {
  return ALL_UFRTS_ASSETS.find((a) => a.fileStem === stem);
}

/** Upgrade path: same base building next level or next age */
export function ufrtsUpgradeTarget(asset: UfrtsAssetDef): UfrtsAssetDef | null {
  if (asset.level >= 1 && asset.level < 3) {
    const nextStem = asset.fileStem.replace(`Level${asset.level}`, `Level${asset.level + 1}`);
    return getUfrtsByStem(nextStem) ?? null;
  }
  if (asset.level === 3 && asset.age === 'first') {
    const nextStem = asset.fileStem
      .replace('FirstAge', 'SecondAge')
      .replace('Level3', 'Level1');
    return getUfrtsByStem(nextStem) ?? null;
  }
  return null;
}

export const UFRTS_UNIT_TRAIN_MAP = {
  infantry: {
    fromBuilding: 'rts_barracks',
    label: 'Infantry',
    description: 'Melee AI unit from Barracks → profession XP → hero promote',
  },
  archer: {
    fromBuilding: 'rts_archery',
    label: 'Archer',
    description: 'Ranged AI unit from Archery Range',
  },
  worker: {
    fromBuilding: 'rts_town_center',
    label: 'Worker',
    description: 'Economy unit from Town Center / Farm',
  },
  priest: {
    fromBuilding: 'rts_temple',
    label: 'Priest',
    description: 'Support unit from Temple',
  },
} as const;
