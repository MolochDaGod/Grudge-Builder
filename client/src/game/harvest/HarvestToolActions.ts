/**
 * HarvestToolActions — tool action sets (ported from RTS-Grudge / OpenWaterSailing).
 * Fishing uses equipped main-hand rod; slot 1 = Cast Line (LMB in harvest mode).
 * Shovel: Valheim-like terrain raise / lower / level (2 m circle).
 * Hoe: till square 4×4 garden beds (16 plant slots).
 * Bucket: fill at water → water crops + feed auto-craft.
 */
import {
  ITEM_EMPTY_BUCKET,
  ITEM_WATER_BUCKET,
  isSeedItemId,
} from '@shared/definitions/farming';

export type HarvestToolType =
  | 'pickaxe'
  | 'axe'
  | 'skinning_knife'
  | 'sickle'
  | 'fishing_rod'
  | 'toolkit'
  | 'shovel'
  | 'hoe'
  | 'bucket'
  | 'seed';

/**
 * R-radial harvest tools (ModePlayHUD). Build hammer opens build UI while staying
 * under harvest mode; Q always returns to combat.
 */
export type HarvestRadialToolId =
  | 'axe'           // hatchet (default)
  | 'pickaxe'
  | 'skinning_knife'
  | 'fishing_rod'
  | 'toolkit';      // build hammer

export const DEFAULT_HARVEST_RADIAL_TOOL: HarvestRadialToolId = 'axe';

export const HARVEST_RADIAL_TOOLS: Array<{
  id: HarvestRadialToolId;
  label: string;
  emoji: string;
  title: string;
}> = [
  { id: 'axe', label: 'Hatchet', emoji: '🪓', title: 'Chop trees / wood' },
  { id: 'pickaxe', label: 'Pick', emoji: '⛏️', title: 'Mine rock / ore' },
  { id: 'skinning_knife', label: 'Knife', emoji: '🔪', title: 'Skin / cut fiber' },
  { id: 'fishing_rod', label: 'Fishing', emoji: '🎣', title: 'Cast line at water' },
  {
    id: 'toolkit',
    label: 'Hammer',
    emoji: '🔨',
    title: 'Build Hammer — place props; RMB damaged chunk → LMB repair (−1 wood)',
  },
];

export type ActionSlotKind = 'action' | 'action2' | 'auto' | 'special';

export interface HarvestAction {
  id: string;
  name: string;
  kind: ActionSlotKind;
  icon: string;
  animation: string;
  cooldown: number;
  staminaCost: number;
  harvestMult: number;
  description: string;
  isToggle?: boolean;
}

/** HUD / engine ground-tool selection (not always an equipment item). */
export type GroundToolId = 'shovel' | 'hoe' | 'seed' | 'bucket' | null;

export const TOOL_ACTIONS: Record<HarvestToolType, HarvestAction[]> = {
  pickaxe: [
    {
      id: 'pick_strike',
      name: 'Mine Strike',
      kind: 'action',
      icon: '⛏️',
      animation: 'mine',
      cooldown: 0.35,
      staminaCost: 2,
      harvestMult: 1.4,
      description: 'LMB — break stone / ore / rock nodes. Yields stone packs.',
    },
  ],
  axe: [
    {
      id: 'axe_chop',
      name: 'Chop',
      kind: 'action',
      icon: '🪓',
      animation: 'chop',
      cooldown: 0.35,
      staminaCost: 2,
      harvestMult: 1.4,
      description:
        'LMB — notch tree base at one angle (firewood/Valheim), fell, then split the log on the ground; walk to collect pinata wood.',
    },
  ],
  skinning_knife: [
    {
      id: 'knife_skin',
      name: 'Skin / Cut',
      kind: 'action',
      icon: '🔪',
      animation: 'skin',
      cooldown: 0.4,
      staminaCost: 2,
      harvestMult: 1.3,
      description: 'LMB — skin carcasses for meat/hide; cut hemp / fiber.',
    },
  ],
  sickle: [
    {
      id: 'sickle_reap',
      name: 'Reap',
      kind: 'action',
      icon: '🌾',
      animation: 'reap',
      cooldown: 0.3,
      staminaCost: 1,
      harvestMult: 1.2,
      description: 'LMB — harvest crops and tall grass.',
    },
  ],
  toolkit: [
    {
      id: 'hammer_place',
      name: 'Build Place',
      kind: 'action',
      icon: '🔨',
      animation: 'build',
      cooldown: 0.2,
      staminaCost: 1,
      harvestMult: 1,
      description:
        'LMB — place modular props / camp pieces. With RMB target on damaged boat/building/vehicle chunk: LMB repairs (−1 wood from bag or boat hold).',
    },
    {
      id: 'hammer_repair',
      name: 'Repair Chunk',
      kind: 'action2',
      icon: '🔧',
      animation: 'build',
      cooldown: 0.25,
      staminaCost: 1,
      harvestMult: 1,
      description:
        'RMB damaged section (hidden chunk) → LMB restore with 1 wood. Works on boats, buildings, vehicles, objects.',
    },
  ],
  seed: [
    {
      id: 'seed_place',
      name: 'Plant Seed',
      kind: 'action',
      icon: '🌱',
      animation: 'plant',
      cooldown: 0.15,
      staminaCost: 1,
      harvestMult: 1,
      description: 'Click tilled dirt (2 m circle) to plant the selected seed.',
    },
  ],
  hoe: [
    {
      id: 'hoe_till',
      name: 'Till Soil',
      kind: 'action',
      icon: '🪓',
      animation: 'hoe',
      cooldown: 0.2,
      staminaCost: 2,
      harvestMult: 1,
      description: 'LMB — till a square 4×4 garden bed (16 plant slots).',
    },
  ],
  bucket: [
    {
      id: 'bucket_water',
      name: 'Water Crops',
      kind: 'action',
      icon: '💧',
      animation: 'pour',
      cooldown: 0.25,
      staminaCost: 1,
      harvestMult: 1,
      description: 'LMB on planted crops with a full water bucket. Near water: fill empty bucket.',
    },
    {
      id: 'bucket_fill',
      name: 'Fill Bucket',
      kind: 'action2',
      icon: '🪣',
      animation: 'fill',
      cooldown: 0.5,
      staminaCost: 1,
      harvestMult: 1,
      description: 'Fill empty bucket at ocean / water surface.',
    },
  ],
  shovel: [
    {
      id: 'shovel_raise',
      name: 'Raise Ground',
      kind: 'action',
      icon: '⛰️',
      animation: 'shovel',
      cooldown: 0.12,
      staminaCost: 1,
      harvestMult: 1,
      description: 'LMB — heap earth under the 2 m brush (Valheim-like raise).',
    },
    {
      id: 'shovel_lower',
      name: 'Lower Ground',
      kind: 'action2',
      icon: '🕳️',
      animation: 'shovel',
      cooldown: 0.12,
      staminaCost: 1,
      harvestMult: 1,
      description: 'Shift+LMB — dig / lower terrain under the 2 m brush.',
    },
    {
      id: 'shovel_level',
      name: 'Level Ground',
      kind: 'special',
      icon: '📐',
      animation: 'shovel',
      cooldown: 0.18,
      staminaCost: 2,
      harvestMult: 1,
      description: 'Ctrl+LMB — smooth and level the 2 m brush area.',
    },
  ],
  fishing_rod: [
    {
      id: 'rod_action',
      name: 'Cast Line',
      kind: 'action',
      icon: '🎣',
      animation: 'fishing_cast',
      cooldown: 0,
      staminaCost: 2,
      harvestMult: 1.0,
      description: 'Cast the fishing line into water from the deck railing.',
    },
    {
      id: 'rod_action2',
      name: 'Lure Swap',
      kind: 'action2',
      icon: '🪱',
      animation: 'fishing_wait',
      cooldown: 5,
      staminaCost: 3,
      harvestMult: 1.3,
      description: 'Switch to a specialized lure that attracts rarer fish.',
    },
  ],
};

/** Detect harvest tool from an inventory / equipment item id. */
export function detectToolType(itemId: string): HarvestToolType | null {
  const id = itemId.toLowerCase();
  if (id.includes('pick')) return 'pickaxe';
  if (id.includes('hatchet') || (id.includes('axe') && !id.includes('pick'))) return 'axe';
  if (
    id.includes('skinning')
    || id.includes('skin_knife')
    || id === 't0_knife'
    || (id.includes('knife') && !id.includes('throw'))
  ) {
    return 'skinning_knife';
  }
  if (id.includes('sickle')) return 'sickle';
  if (
    id.includes('rod')
    || id.includes('fishpole')
    || id.includes('fish_pole')
    || id.includes('fishing')
    || id.includes('cane')
  ) {
    return 'fishing_rod';
  }
  if (
    id.includes('toolkit')
    || id.includes('wrench')
    || id.includes('build_hammer')
    || id === 'build_hammer'
  ) {
    return 'toolkit';
  }
  if (id.includes('shovel') || id.includes('toolshovel') || id.includes('spade')) return 'shovel';
  if (id.includes('hoe') || id.includes('toolhoe') || id.includes('cultivat')) return 'hoe';
  if (
    id.includes('bucket')
    || id === ITEM_EMPTY_BUCKET
    || id === ITEM_WATER_BUCKET
    || id.includes('pail')
  ) {
    return 'bucket';
  }
  if (isSeedItemId(id)) return 'seed';
  return null;
}

export function getToolActions(toolType: HarvestToolType): HarvestAction[] {
  return TOOL_ACTIONS[toolType] ?? [];
}

export function getMainHandItemId(
  equipment: Record<string, string | null> | undefined,
): string | null {
  if (!equipment) return null;
  return (
    equipment.MainHand
    ?? equipment.mainHand
    ?? equipment.mainhand
    ?? equipment.weapon
    ?? null
  );
}

export function getEquippedToolType(
  equipment: Record<string, string | null> | undefined,
): HarvestToolType | null {
  const itemId = getMainHandItemId(equipment);
  if (!itemId) return null;
  return detectToolType(itemId);
}

export function hasFishingRodEquipped(
  equipment: Record<string, string | null> | undefined,
): boolean {
  return getEquippedToolType(equipment) === 'fishing_rod';
}

export function hasShovelEquipped(
  equipment: Record<string, string | null> | undefined,
): boolean {
  return getEquippedToolType(equipment) === 'shovel';
}

export function hasHoeEquipped(
  equipment: Record<string, string | null> | undefined,
): boolean {
  return getEquippedToolType(equipment) === 'hoe';
}

export function hasBucketEquipped(
  equipment: Record<string, string | null> | undefined,
): boolean {
  return getEquippedToolType(equipment) === 'bucket';
}

/** True when main-hand is a full water bucket. */
export function hasWaterBucket(
  equipment: Record<string, string | null> | undefined,
  inventory?: Record<string, number>,
): boolean {
  const hand = getMainHandItemId(equipment)?.toLowerCase() ?? '';
  if (hand.includes('water') && hand.includes('bucket')) return true;
  if (hand === ITEM_WATER_BUCKET.toLowerCase()) return true;
  if (inventory && (inventory[ITEM_WATER_BUCKET] ?? 0) > 0) return true;
  return false;
}

/** Resolve shovel sculpt mode from keyboard modifiers (Valheim-style). */
export function shovelModeFromModifiers(
  shiftKey: boolean,
  ctrlKey: boolean,
  altKey = false,
): 'raise' | 'lower' | 'level' {
  if (ctrlKey || altKey) return 'level';
  if (shiftKey) return 'lower';
  return 'raise';
}
