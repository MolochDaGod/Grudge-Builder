/**
 * Tutorial Shipwreck Opening Scene — SSOT
 *
 * After TI / Warlords open movie → load /tutorial → shipwreck island.
 * Slow zoom arrives on unarmed Grudge6 race character **prone/ragdoll** between
 * the broken ship, boats on left/right, rocks opposite, sticks + small stones
 * in the wake area that teach T0 harvesting tools.
 *
 * Mode on arrival: **harvest**. Character: unarmed race model.
 */

export type TutorialHarvestToolId =
  | 'hatchet'
  | 'pickaxe'
  | 'shovel'
  | 'hoe'
  | 'knife'
  | 'build_hammer'
  | 'fishpole'
  | 'bucket'
  | 'book_logging'
  | 'book_mining'
  | 'book_farming'
  | 'book_fishing';

/** Wake / spawn pocket on shipwreck island (world meters, procedural seed) */
export const SHIPWRECK_WAKE = {
  /** Character lies here at start of cinematic */
  spawn: { x: 0, y: 1.2, z: 4 } as const,
  /** Facing toward open beach (away from wreck spine) */
  facingYaw: Math.PI,
  /** Camera starts high/wide over wreck cove */
  cameraStart: { x: 28, y: 42, z: 48 } as const,
  /** Camera ends tight on prone hero */
  cameraEnd: { x: 3.5, y: 4.2, z: 9.5 } as const,
  lookAt: { x: 0, y: 0.4, z: 4 } as const,
  /** Slow zoom duration (seconds) */
  zoomDurationSec: 7.5,
  /** Hold on prone before stand-up (seconds) */
  proneHoldSec: 1.2,
  /** Stand-up blend (seconds) */
  standUpSec: 1.4,
} as const;

/** Layout props around wake (relative to spawn) */
export const SHIPWRECK_STAGING = {
  /** Broken pirate hull behind the player */
  wreck: { ox: 0, oz: -10, scale: 1.1, rotY: 0.35 },
  /** Boats flanking left / right of the pocket */
  boatLeft: { ox: -11, oz: 2, scale: 0.85, rotY: -0.6 },
  boatRight: { ox: 11, oz: 1.5, scale: 0.85, rotY: 0.55 },
  /** Rock clusters on remaining sides */
  rocks: [
    { ox: -6, oz: 10, scale: 1.2 },
    { ox: 7, oz: 11, scale: 1.0 },
    { ox: -9, oz: -4, scale: 0.9 },
    { ox: 9, oz: -5, scale: 1.1 },
    { ox: 2, oz: 13, scale: 0.75 },
  ],
  /** Sticks (driftwood) in wake — teaches hatchet / tools that need wood */
  sticks: [
    { ox: 1.5, oz: 2.2 },
    { ox: -1.2, oz: 3.0 },
    { ox: 2.8, oz: 4.5 },
    { ox: -2.5, oz: 1.8 },
    { ox: 0.4, oz: 5.2 },
    { ox: -3.2, oz: 4.0 },
    { ox: 3.5, oz: 2.0 },
    { ox: -0.8, oz: 6.0 },
  ],
  /** Small stones in wake — teaches pickaxe / tools that need stone */
  stones: [
    { ox: 2.2, oz: 3.5 },
    { ox: -1.8, oz: 4.8 },
    { ox: 0.6, oz: 2.0 },
    { ox: 3.0, oz: 5.5 },
    { ox: -2.8, oz: 2.5 },
    { ox: 1.0, oz: 6.5 },
  ],
} as const;

/**
 * T0 harvesting tools — craft from sticks + stones (wake teach).
 * Aligns with Grudge6 harvest tool tab (hatchet/axe, pick, shovel, hoe, knife,
 * build hammer, fishpole, bucket) + review books.
 */
export interface TutorialT0ToolDef {
  id: TutorialHarvestToolId;
  itemId: string;
  name: string;
  icon: string;
  /** Maps to HarvestToolActions.detectToolType */
  harvestToolType: string;
  /** Stick / stone costs (wake materials) */
  cost: { stick: number; stone: number; fiber?: number };
  /** What this tool does when equipped in harvest mode */
  results: string[];
  /** Harvest / ground nodes it unlocks or multiplies */
  harvestTargets: string[];
  description: string;
  /** Profession book reviews this tool family */
  reviewBookId?: string;
}

export const TUTORIAL_T0_TOOLS: TutorialT0ToolDef[] = [
  {
    id: 'hatchet',
    itemId: 't0_hatchet',
    name: 'Flint Hatchet',
    icon: '🪓',
    harvestToolType: 'axe',
    cost: { stick: 2, stone: 2 },
    results: [
      'Faster wood / driftwood / tree harvest',
      'Chops stumps and wreck planks',
      'Primary logging tool (Forester path)',
    ],
    harvestTargets: ['stick', 'driftwood', 'tree', 'wood'],
    description: 'Stone head on a stick — first woodcutting tool.',
    reviewBookId: 't0_book_logging',
  },
  {
    id: 'pickaxe',
    itemId: 't0_pickaxe',
    name: 'Flint Pickaxe',
    icon: '⛏️',
    harvestToolType: 'pickaxe',
    cost: { stick: 2, stone: 3 },
    results: [
      'Mines stone, ore, and rock nodes',
      'Breaks large boulders into stone packs',
      'Primary mining tool',
    ],
    harvestTargets: ['stone', 'rock', 'ore', 'crystal'],
    description: 'Crude pick for shore rocks and later ore.',
    reviewBookId: 't0_book_mining',
  },
  {
    id: 'shovel',
    itemId: 't0_shovel',
    name: 'Driftwood Shovel',
    icon: '⛏️',
    harvestToolType: 'shovel',
    cost: { stick: 3, stone: 1 },
    results: [
      'Raise / lower / level ground (2 m circle, Valheim-like)',
      'Dig sand near beach for shell / clay chances',
      'Terrain sculpt for farm plots & paths',
    ],
    harvestTargets: ['sand', 'dirt', 'terrain'],
    description: 'Board + stick shovel — reshape the beach.',
  },
  {
    id: 'hoe',
    itemId: 't0_hoe',
    name: 'Stone Hoe',
    icon: '🪓',
    harvestToolType: 'hoe',
    cost: { stick: 2, stone: 2 },
    results: [
      'Till dirt into 2 m growing plots',
      'Enables seed planting after till',
      'Farming profession entry tool',
    ],
    harvestTargets: ['dirt', 'tilled_plot'],
    description: 'Cultivate earth for seeds.',
    reviewBookId: 't0_book_farming',
  },
  {
    id: 'knife',
    itemId: 't0_knife',
    name: 'Flint Knife',
    icon: '🔪',
    harvestToolType: 'skinning_knife',
    cost: { stick: 1, stone: 2 },
    results: [
      'Skin animals for meat / hide / bone',
      'Cut rope, hemp, and fiber faster',
      'Required after boar fight to dress carcass',
    ],
    harvestTargets: ['animal', 'carcass', 'hemp', 'fiber'],
    description: 'Sharp flint for skinning and fiber work.',
  },
  {
    id: 'build_hammer',
    itemId: 'build_hammer',
    name: 'Build Hammer',
    icon: '🔨',
    harvestToolType: 'toolkit',
    cost: { stick: 3, stone: 2 },
    results: [
      'Place modular props (tent, campfire, walls)',
      'Build mode primary hand tool (not combat)',
      'Repair / rotate ghost placements',
    ],
    harvestTargets: ['build_ghost', 'structure'],
    description: 'Survival-kit hammer for placing your first camp.',
  },
  {
    id: 'fishpole',
    itemId: 't0_fishpole',
    name: 'Driftwood Fishpole',
    icon: '🎣',
    harvestToolType: 'fishing_rod',
    cost: { stick: 3, stone: 0, fiber: 1 },
    results: [
      'Cast line from shore / pier / boat rail',
      'Catch raw fish for cooking',
      'Lure swap for rarer catches',
    ],
    harvestTargets: ['water', 'fish', 'ocean'],
    description: 'Stick pole with fiber line — fish the cove.',
    reviewBookId: 't0_book_fishing',
  },
  {
    id: 'bucket',
    itemId: 'bucket_empty',
    name: 'Wood Bucket',
    icon: '🪣',
    harvestToolType: 'bucket',
    cost: { stick: 3, stone: 0, fiber: 1 },
    results: [
      'Fill at ocean → water_bucket charge',
      'Water tilled crops (2 m circle)',
      'Feeds auto-craft recipes needing water',
    ],
    harvestTargets: ['water', 'crop', 'auto_craft'],
    description: 'Empty bucket — fill at the sea line.',
  },
];

/** Review books — teach tool results without combat */
export const TUTORIAL_REVIEW_BOOKS = [
  {
    id: 't0_book_logging',
    name: 'Beach Logging Notes',
    icon: '📖',
    cost: { stick: 1, stone: 0 },
    covers: ['hatchet', 'stick', 'tree'],
    summary: 'Hatchet multiplies wood. Bare hands gather sticks slowly.',
  },
  {
    id: 't0_book_mining',
    name: 'Shore Rock Primer',
    icon: '📖',
    cost: { stick: 0, stone: 1 },
    covers: ['pickaxe', 'stone', 'ore'],
    summary: 'Pickaxe breaks stone nodes; fists only chip small pebbles.',
  },
  {
    id: 't0_book_farming',
    name: 'Till & Water Basics',
    icon: '📖',
    cost: { stick: 1, stone: 1 },
    covers: ['hoe', 'shovel', 'bucket', 'seed'],
    summary: 'Hoe tills → seed plants → bucket waters → harvest.',
  },
  {
    id: 't0_book_fishing',
    name: 'Cove Angler Scrap',
    icon: '📖',
    cost: { stick: 1, stone: 0 },
    covers: ['fishpole', 'fish', 'water'],
    summary: 'Fishpole only works over water; cast from deck or shore.',
  },
] as const;

/** Opening mission beats after movie → wake cinematic */
export const SHIPWRECK_OPENING_BEATS = [
  {
    id: 'ti_open_movie',
    title: 'Open movie',
    detail: 'Tactical Infinity / Warlords intro video finishes; route to /tutorial.',
  },
  {
    id: 'load_shipwreck',
    title: 'Load shipwreck island',
    detail: 'Procedural seed shipwreck-tutorial + wreck staging props.',
  },
  {
    id: 'slow_zoom_wake',
    title: 'Slow zoom to wake',
    detail: 'Camera eases from wide cove shot to prone unarmed Grudge6 between wreck & boats.',
  },
  {
    id: 'stand_harvest',
    title: 'Stand into harvest mode',
    detail: 'Character rises; control mode harvest; no weapons equipped.',
  },
  {
    id: 'gather_sticks_stones',
    title: 'Gather sticks & small stones',
    detail: 'Nodes in the wake pocket teach bare-hand gather.',
  },
  {
    id: 'craft_t0_tools',
    title: 'Craft T0 harvest tools',
    detail: 'Hatchet, pickaxe, shovel, hoe, knife, build hammer, fishpole, bucket + review books.',
  },
] as const;

export function getT0Tool(id: string): TutorialT0ToolDef | undefined {
  return TUTORIAL_T0_TOOLS.find((t) => t.id === id || t.itemId === id);
}

export function canCraftT0Tool(
  tool: TutorialT0ToolDef,
  inventory: { stick: number; stone: number; fiber?: number },
): boolean {
  const fiber = inventory.fiber ?? 0;
  return (
    inventory.stick >= tool.cost.stick
    && inventory.stone >= tool.cost.stone
    && fiber >= (tool.cost.fiber ?? 0)
  );
}

/** Server harvest node layout: dense ring in wake + a few outer */
export function buildShipwreckWakeHarvestNodes(): Array<{
  id: string;
  type: 'forest' | 'mining';
  x: number;
  z: number;
}> {
  const origin = SHIPWRECK_WAKE.spawn;
  const nodes: Array<{ id: string; type: 'forest' | 'mining'; x: number; z: number }> = [];
  SHIPWRECK_STAGING.sticks.forEach((s, i) => {
    nodes.push({
      id: `wake_stick_${i + 1}`,
      type: 'forest',
      x: origin.x + s.ox,
      z: origin.z + s.oz,
    });
  });
  SHIPWRECK_STAGING.stones.forEach((s, i) => {
    nodes.push({
      id: `wake_stone_${i + 1}`,
      type: 'mining',
      x: origin.x + s.ox,
      z: origin.z + s.oz,
    });
  });
  return nodes;
}
