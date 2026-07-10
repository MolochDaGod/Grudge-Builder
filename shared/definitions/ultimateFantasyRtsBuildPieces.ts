/**
 * Buildable pieces from Ultimate Fantasy RTS pack.
 * Registered into BuildingSystem via survivalKitBuildCatalog merge.
 *
 * Stone quarry mine → miner-only harvest (same 4s mine interact when placed).
 * Barracks / Archery / Farm / Temple / Town Center → train RTS units.
 */
import {
  ALL_UFRTS_ASSETS,
  UFRTS_BUILD_MENU_STARTERS,
  UFRTS_STONE_MINE,
  getUfrtsByStem,
  type UfrtsAssetDef,
} from './ultimateFantasyRtsCatalog';
import type { BuildPieceDef, BuildLayer } from './buildSystem';

function sizeFromHeight(h: number, footprint = 0.55): [number, number, number] {
  const w = Math.max(3, h * footprint);
  return [w, h, w];
}

function categoryFor(a: UfrtsAssetDef): BuildPieceDef['category'] {
  switch (a.category) {
    case 'mine_quarry':
      return 'bench';
    case 'rts_dock':
    case 'rts_port':
      return 'dock';
    case 'rts_wall':
    case 'rts_watchtower':
    case 'rts_tower_house':
      return 'tower';
    case 'rts_barracks':
    case 'rts_archery':
    case 'rts_farm':
    case 'rts_temple':
    case 'rts_town_center':
    case 'rts_market':
    case 'rts_storage':
    case 'rts_house':
    case 'rts_windmill':
    case 'rts_wonder':
      return 'rts_building';
    default:
      return 'tool';
  }
}

function layerFor(a: UfrtsAssetDef): BuildLayer {
  if (a.category === 'mine_quarry') return 'bench';
  if (a.category === 'rts_dock' || a.category === 'rts_port') return 'dock';
  return 'rts';
}

function effectFor(a: UfrtsAssetDef): BuildPieceDef['effect'] {
  if (a.category === 'mine_quarry') {
    return {
      type: 'crafting',
      value: 1,
      description:
        'Stone quarry — enter 4s for miner profession stone/granite/marble only (no engineer/mystic).',
    };
  }
  if (a.trainsUnit === 'infantry') {
    return {
      type: 'train_unit',
      value: a.level || 1,
      description: 'Train infantry AI units. Level profession → promote to Railway hero.',
    };
  }
  if (a.trainsUnit === 'archer') {
    return {
      type: 'train_unit',
      value: a.level || 1,
      description: 'Train archer AI units from Archery Range.',
    };
  }
  if (a.trainsUnit === 'priest') {
    return {
      type: 'train_unit',
      value: a.level || 1,
      description: 'Train priest / support units from Temple.',
    };
  }
  if (a.trainsUnit === 'worker') {
    return {
      type: 'train_unit',
      value: a.level || 1,
      description: 'Train workers / villagers (Town Center or Farm).',
    };
  }
  if (a.category === 'rts_storage' || a.category === 'rts_market') {
    return {
      type: 'storage',
      value: 20 * (a.level || 1),
      description: a.category === 'rts_market' ? 'Commerce hub' : 'Resource storage',
    };
  }
  if (a.category === 'rts_watchtower' || a.category === 'rts_wall') {
    return {
      type: 'defense',
      value: 30 + (a.level || 0) * 10,
      description: 'Defensive structure',
    };
  }
  if (a.category === 'rts_dock' || a.category === 'rts_port') {
    return {
      type: 'foundation',
      value: 1,
      description: 'Boat dock / port — place at shore (deck +0.2 water).',
    };
  }
  return {
    type: 'comfort',
    value: 5,
    description: a.label,
  };
}

function costFor(a: UfrtsAssetDef): Array<{ itemId: string; quantity: number }> {
  const lv = a.level || 1;
  const base = 15 * lv;
  if (a.category === 'mine_quarry') {
    return [
      { itemId: 'wood', quantity: 20 },
      { itemId: 'stone', quantity: 40 },
    ];
  }
  if (a.category === 'rts_town_center') {
    return [
      { itemId: 'wood', quantity: 80 * lv },
      { itemId: 'stone', quantity: 50 * lv },
    ];
  }
  if (a.category === 'rts_wall') {
    return [{ itemId: 'stone', quantity: 12 + lv * 4 }];
  }
  if (a.category === 'rts_dock' || a.category === 'rts_port') {
    return [
      { itemId: 'wood', quantity: 30 + lv * 10 },
      { itemId: 'iron', quantity: 4 },
    ];
  }
  return [
    { itemId: 'wood', quantity: base },
    { itemId: 'stone', quantity: Math.floor(base * 0.6) },
  ];
}

/** Convert UFRTS catalog entry → BuildPieceDef (single-mesh GLB/FBX, nodeName root) */
export function ufrtsToBuildPiece(a: UfrtsAssetDef): BuildPieceDef {
  const h = a.targetHeightM;
  const isDock = a.category === 'rts_dock' || a.category === 'rts_port';
  return {
    id: `ufrts_${a.fileStem.toLowerCase()}`,
    name: a.label,
    layer: layerFor(a),
    tier: (a.level || 0) as 0 | 1 | 2 | 3,
    category: categoryFor(a),
    // Prefer FBX path until convert pipeline ships GLB (runtime FBXLoader)
    // Full scene mesh — no multipack node extract
    sourceGlb: a.pathFbx,
    nodeName: 'root', // BuildPieceDef requires string; PackModelLoader treats missing as full clone fallback via BuildingSystem
    scale: 1,
    size: sizeFromHeight(h, a.category === 'rts_wall' ? 0.35 : 0.55),
    placeYOffset: isDock ? 0.2 : 0,
    placement: 'prop',
    requiresFloor: false,
    terrainPlaceable: true,
    floating: isDock,
    profession:
      a.category === 'mine_quarry'
        ? 'mining'
        : a.category === 'rts_temple'
          ? 'mystic'
          : a.category === 'rts_farm'
            ? 'camp'
            : undefined,
    cost: costFor(a),
    effect: effectFor(a),
    notes: `Ultimate Fantasy RTS · ${a.fileStem} · age=${a.age} L${a.level}`,
  };
}

/** Stone quarry as buildable + world generation mesh */
export const UFRTS_STONE_MINE_PIECE: BuildPieceDef = ufrtsToBuildPiece(UFRTS_STONE_MINE);

/** Starter menu pieces (Age I L1 + dock + mine) for BuildModePanel */
export const UFRTS_STARTER_BUILD_PIECES: BuildPieceDef[] = UFRTS_BUILD_MENU_STARTERS.map((stem) => {
  const a = getUfrtsByStem(stem);
  if (!a) {
    throw new Error(`UFRTS starter missing: ${stem}`);
  }
  return ufrtsToBuildPiece(a);
});

/** Full Age I L1 set for RTS layer UI */
export const UFRTS_ALL_BUILD_PIECES: BuildPieceDef[] = ALL_UFRTS_ASSETS.filter(
  (a) =>
    a.homeIslandRole === 'buildable' ||
    a.homeIslandRole === 'stone_mine' ||
    a.category === 'mine_quarry',
).map(ufrtsToBuildPiece);

/** Units unlocked by building category */
export const UFRTS_UNIT_FROM_BUILDING: Record<
  string,
  { unitId: string; label: string; cost: Array<{ itemId: string; quantity: number }> }
> = {
  rts_barracks: {
    unitId: 'rts_infantry',
    label: 'Infantry',
    cost: [{ itemId: 'wood', quantity: 5 }, { itemId: 'food', quantity: 10 }],
  },
  rts_archery: {
    unitId: 'rts_archer',
    label: 'Archer',
    cost: [{ itemId: 'wood', quantity: 8 }, { itemId: 'food', quantity: 8 }],
  },
  rts_farm: {
    unitId: 'rts_worker',
    label: 'Farmer',
    cost: [{ itemId: 'food', quantity: 5 }],
  },
  rts_temple: {
    unitId: 'rts_priest',
    label: 'Priest',
    cost: [{ itemId: 'food', quantity: 12 }, { itemId: 'cloth', quantity: 4 }],
  },
  rts_town_center: {
    unitId: 'rts_worker',
    label: 'Villager',
    cost: [{ itemId: 'food', quantity: 6 }],
  },
};
