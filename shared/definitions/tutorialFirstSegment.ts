/**
 * Tutorial first segment SSOT — matches production shipwreck open:
 *
 * 1. Slow zoom to wake (unarmed Grudge6, harvest mode)
 * 2. Simple/auto harvest (E · RMB · 1 · 2) → stick + stone
 * 3. Prompt quick-craft pickaxe (Main Panel · Quick Craft)
 * 4. Equip pickaxe inventory → MainHand (harvest tool in hand + anim)
 * 5. Soft-lock multi-hit stone that chunks apart
 * 6. Walk forward to trees, flowers, chest
 *
 * Camp props (claim flag, campfire, torch, tent, storage, benches) listed for
 * later refine / over-time harvest loop — unlocked after first segment.
 */

export type TutorialSegmentPhase =
  | 'intro_zoom'
  | 'gather_basics'
  | 'prompt_pickaxe'
  | 'craft_pickaxe'
  | 'equip_pickaxe'
  | 'chunk_harvest_stone'
  | 'walk_forward'
  | 'segment_complete';

export const TUTORIAL_FIRST_PHASES: Array<{
  id: TutorialSegmentPhase;
  title: string;
  objective: string;
  hint: string;
}> = [
  {
    id: 'intro_zoom',
    title: 'Wash ashore',
    objective: 'Arrive on shipwreck island',
    hint: 'Slow zoom to your unarmed hero in harvest mode',
  },
  {
    id: 'gather_basics',
    title: 'Gather stick & stone',
    objective: 'Collect 1 stick and 1 stone nearby',
    hint: 'E · RMB · 1 · 2 — simple or auto harvest (unarmed)',
  },
  {
    id: 'prompt_pickaxe',
    title: 'Learn the pickaxe',
    objective: 'Open Quick Craft and review the flint pickaxe recipe',
    hint: 'Main Panel → Quick Craft tab',
  },
  {
    id: 'craft_pickaxe',
    title: 'Craft flint pickaxe',
    objective: 'Craft t0_pickaxe from sticks + stones',
    hint: 'Costs 1 stick · 1 stone (wake materials)',
  },
  {
    id: 'equip_pickaxe',
    title: 'Equip for harvest',
    objective: 'Equip pickaxe to MainHand equipment slot',
    hint: 'Inventory → Character equipment → MainHand',
  },
  {
    id: 'chunk_harvest_stone',
    title: 'Break the rock',
    objective: 'Soft-lock harvest the large stone until it chunks apart',
    hint: 'Hold E / 1 with pickaxe equipped — multi-hit chip',
  },
  {
    id: 'walk_forward',
    title: 'Explore inland',
    objective: 'Walk forward to trees, flowers, and the chest',
    hint: 'WASD toward the marked inland grove',
  },
  {
    id: 'segment_complete',
    title: 'First segment done',
    objective: 'Ready for camp props & refine loop',
    hint: 'Claim flag · campfire · torch · tent · storage · benches next',
  },
];

/** Quick-craft recipes for first segment + camp loop */
export const TUTORIAL_QUICK_CRAFT = [
  {
    id: 't0_pickaxe',
    name: 'Flint Pickaxe',
    icon: '⛏️',
    tab: 'tools' as const,
    /** First-segment teach cost (wake stick + stone); later tools use full T0 costs */
    cost: { stick: 1, stone: 1 },
    description: 'Equip to MainHand in harvest mode. Soft-locks stone nodes and multi-hits until they chunk apart.',
    equipSlot: 'MainHand',
    harvestTool: 'pickaxe',
    unlockPhase: 'prompt_pickaxe' as TutorialSegmentPhase,
  },
  {
    id: 't0_hatchet',
    name: 'Flint Hatchet',
    icon: '🪓',
    tab: 'tools' as const,
    cost: { stick: 2, stone: 2 },
    description: 'Woodcutting tool for trees inland.',
    equipSlot: 'MainHand',
    harvestTool: 'axe',
    unlockPhase: 'walk_forward' as TutorialSegmentPhase,
  },
  {
    id: 'campfire',
    name: 'Campfire',
    icon: '🔥',
    tab: 'camp' as const,
    cost: { stick: 3, stone: 2 },
    description: 'Placeable camp fire — cook & refine over time.',
    equipSlot: null,
    harvestTool: null,
    unlockPhase: 'segment_complete' as TutorialSegmentPhase,
  },
  {
    id: 'torch',
    name: 'Torch',
    icon: '🕯️',
    tab: 'camp' as const,
    cost: { stick: 1, stone: 0 },
    description: 'Light source for night / caves.',
    equipSlot: null,
    harvestTool: null,
    unlockPhase: 'segment_complete' as TutorialSegmentPhase,
  },
  {
    id: 'simple_tent',
    name: 'Simple Tent',
    icon: '⛺',
    tab: 'camp' as const,
    cost: { stick: 4, stone: 0 },
    description: 'Camp stage tent — rest & claim nearby.',
    equipSlot: null,
    harvestTool: null,
    unlockPhase: 'segment_complete' as TutorialSegmentPhase,
  },
  {
    id: 'storage_crate',
    name: 'Storage Container',
    icon: '📦',
    tab: 'camp' as const,
    cost: { stick: 3, stone: 1 },
    description: 'Deposit materials for refine / over-time harvest jobs.',
    equipSlot: null,
    harvestTool: null,
    unlockPhase: 'segment_complete' as TutorialSegmentPhase,
  },
  {
    id: 'claim_flag',
    name: 'Claim Flag',
    icon: '🚩',
    tab: 'camp' as const,
    cost: { stick: 2, stone: 1 },
    description: 'Claim camp radius for benches & refine stations.',
    equipSlot: null,
    harvestTool: null,
    unlockPhase: 'segment_complete' as TutorialSegmentPhase,
  },
  {
    id: 'workbench',
    name: 'Work Bench',
    icon: '🪵',
    tab: 'benches' as const,
    cost: { stick: 5, stone: 3 },
    description: 'Profession bench for refine / over-time crafting.',
    equipSlot: null,
    harvestTool: null,
    unlockPhase: 'segment_complete' as TutorialSegmentPhase,
  },
] as const;

export type TutorialQuickCraftId = (typeof TUTORIAL_QUICK_CRAFT)[number]['id'];

/** World layout for first segment (meters, relative to wake spawn 0,1.2,4) */
export const TUTORIAL_FIRST_LAYOUT = {
  spawn: { x: 0, y: 1.2, z: 4 },
  /** Unarmed simple harvest props right at feet */
  nearStick: { x: 1.4, y: 0.12, z: 5.2 },
  nearStone: { x: -1.2, y: 0.15, z: 5.0 },
  /** Multi-hit chunk rock after pickaxe equipped */
  chunkRock: { x: 2.5, y: 0.4, z: 7.5 },
  /** Inland grove — trees, flowers, chest */
  groveCenter: { x: 0, y: 0.5, z: 22 },
  trees: [
    { x: -4, z: 20 },
    { x: 3, z: 23 },
    { x: -1, z: 26 },
  ],
  flowers: [
    { x: 1.5, z: 19 },
    { x: -2.5, z: 21 },
    { x: 2, z: 24 },
  ],
  chest: { x: 0.5, y: 0.3, z: 24.5 },
  /** Camera intro */
  camStart: { x: 22, y: 36, z: 40 },
  camEnd: { x: 3.2, y: 4.0, z: 9.0 },
  zoomSec: 6.5,
} as const;

/** Input map for harvest first segment */
export const TUTORIAL_HARVEST_INPUTS = {
  interact: ['e', 'E'],
  autoHarvest: ['1'],
  simpleHarvest: ['2'],
  /** RMB is mouse button 2 */
  rmbHarvest: true,
  softLockHold: true,
} as const;

/** Chunk rock — multi-hit until destroyed */
export const CHUNK_ROCK = {
  id: 'chunk_rock_wake',
  maxHits: 4,
  hitsPerChip: 1,
  unarmedDamage: 0.35,
  pickaxeDamage: 1,
  resourcePerHit: { stone: 1 },
  finalBonus: { stone: 2 },
} as const;

export function canCraftQuick(
  recipeId: string,
  inv: { stick: number; stone: number },
): boolean {
  const r = TUTORIAL_QUICK_CRAFT.find((c) => c.id === recipeId);
  if (!r) return false;
  return inv.stick >= r.cost.stick && inv.stone >= r.cost.stone;
}

export function nextPhaseAfterGather(sticks: number, stones: number): TutorialSegmentPhase {
  if (sticks >= 1 && stones >= 1) return 'prompt_pickaxe';
  return 'gather_basics';
}
