/**
 * Placeable build-hammer pieces for SI-baked island camp buildings.
 * Standalone GLBs (not kit nodes). PackModelLoader nodeName 'root' = full scene.
 * Scale 1 — height is baked to 4 m. Do not apply 0.01 / Unity hacks.
 */
import type { BuildPieceDef } from './buildSystem';
import { ISLAND_BUILDINGS } from './islandBuildingPrefabs';

function piece(
  id: string,
  extra: Partial<BuildPieceDef> & Pick<BuildPieceDef, 'name' | 'category' | 'size' | 'effect'>,
): BuildPieceDef {
  const baked = ISLAND_BUILDINGS.find((b) => b.id === id);
  return {
    id: `island_${id}`,
    layer: extra.layer ?? 'rts',
    tier: extra.tier ?? 1,
    sourceGlb: baked ? `/${baked.r2Key}` : `/models/buildings/${id}.glb`,
    nodeName: 'root',
    scale: 1,
    placeYOffset: 0,
    placement: 'prop',
    requiresFloor: false,
    terrainPlaceable: true,
    cost: extra.cost ?? [{ itemId: 'wood', quantity: 40 }, { itemId: 'stone', quantity: 20 }],
    notes: 'SI 4 m bake via ObjectStore island-building-prefabs. Identity-checked at load.',
    ...extra,
  };
}

export const ISLAND_CAMP_BUILD_PIECES: BuildPieceDef[] = [
  piece('house', {
    name: 'House',
    category: 'rts_building',
    size: [1.7, 4, 1.7],
    cost: [{ itemId: 'wood', quantity: 50 }, { itemId: 'stone', quantity: 20 }],
    effect: { type: 'storage', value: 50, description: 'Dwelling — +storage. Baked 4 m.' },
  }),
  piece('inn', {
    name: 'Inn',
    category: 'rts_building',
    size: [2.2, 4, 2.2],
    cost: [{ itemId: 'wood', quantity: 70 }, { itemId: 'stone', quantity: 30 }],
    effect: { type: 'comfort', value: 20, description: 'Lodging hall. Baked 4 m.' },
  }),
  piece('cantina', {
    name: 'Cantina',
    category: 'rts_building',
    size: [1.7, 4, 1.7],
    cost: [{ itemId: 'wood', quantity: 60 }, { itemId: 'cloth', quantity: 12 }],
    effect: { type: 'comfort', value: 18, description: 'Tavern bar. Baked 4 m (CDN key cantina-4m.glb).' },
  }),
  piece('tavern', {
    name: 'Tavern',
    category: 'rts_building',
    size: [1.7, 4, 1.7],
    cost: [{ itemId: 'wood', quantity: 60 }, { itemId: 'cloth', quantity: 12 }],
    effect: { type: 'comfort', value: 18, description: 'Tavern. Baked 4 m.' },
  }),
  piece('market', {
    name: 'Market',
    category: 'rts_building',
    size: [2.4, 4, 2.4],
    cost: [{ itemId: 'wood', quantity: 40 }, { itemId: 'cloth', quantity: 10 }],
    effect: { type: 'storage', value: 30, description: 'Market stall. Baked 4 m.' },
  }),
  piece('blacksmith', {
    name: 'Blacksmith',
    layer: 'bench',
    category: 'bench',
    profession: 'smithing',
    craftUnlockLevel: 1,
    size: [2.5, 4, 2.5],
    cost: [{ itemId: 'wood', quantity: 40 }, { itemId: 'stone', quantity: 40 }, { itemId: 'iron', quantity: 12 }],
    effect: { type: 'crafting', value: 3, description: 'Forge station. Baked 4 m.' },
  }),
];
