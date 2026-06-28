/**
 * HarvestToolActions — tool action sets (ported from RTS-Grudge / OpenWaterSailing).
 * Fishing uses equipped main-hand rod; slot 1 = Cast Line (LMB in harvest mode).
 */
export type HarvestToolType =
  | 'pickaxe'
  | 'axe'
  | 'skinning_knife'
  | 'sickle'
  | 'fishing_rod'
  | 'toolkit'
  | 'shovel';

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

export const TOOL_ACTIONS: Record<HarvestToolType, HarvestAction[]> = {
  pickaxe: [],
  axe: [],
  skinning_knife: [],
  sickle: [],
  toolkit: [],
  shovel: [],
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
  if (id.includes('axe') && !id.includes('pick')) return 'axe';
  if (id.includes('skinning') || id.includes('skin_knife')) return 'skinning_knife';
  if (id.includes('sickle')) return 'sickle';
  if (id.includes('rod') || id.includes('fish') || id.includes('cane')) return 'fishing_rod';
  if (id.includes('toolkit') || id.includes('wrench')) return 'toolkit';
  if (id.includes('shovel')) return 'shovel';
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