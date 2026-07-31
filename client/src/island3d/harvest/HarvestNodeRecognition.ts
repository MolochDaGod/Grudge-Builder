/**
 * HarvestNodeRecognition — smart node class + tool gates for home-island harvest.
 *
 * Player equips a radial harvest tool (R-menu): axe / pickaxe / knife / …
 * Hits must match the recognized node class or the strike is rejected with feedback.
 *
 * Classes covered by pinata physics break: tree (axe), rock + ore (pickaxe).
 */
import type { HarvestRadialToolId } from '@/game/harvest/HarvestToolActions';

/** Harvestable class recognized from engine node arrays / userData. */
export type HarvestNodeClass =
  | 'tree'
  | 'rock'
  | 'ore'
  | 'crystal'
  | 'hemp'
  | 'flower'
  | 'scrap';

export interface ToolGateResult {
  ok: boolean;
  /** Human-readable reason when !ok */
  message?: string;
  /** Tools that would work on this node */
  required: HarvestRadialToolId[];
  nodeClass: HarvestNodeClass;
  label: string;
}

/** Primary + secondary tools accepted per node class. */
export const TOOLS_FOR_NODE: Record<HarvestNodeClass, HarvestRadialToolId[]> = {
  tree: ['axe'],
  rock: ['pickaxe'],
  ore: ['pickaxe'],
  crystal: ['pickaxe'],
  hemp: ['skinning_knife', 'axe'],
  flower: ['skinning_knife'],
  scrap: ['pickaxe', 'toolkit'],
};

export const NODE_LABEL: Record<HarvestNodeClass, string> = {
  tree: 'Tree',
  rock: 'Rock',
  ore: 'Ore vein',
  crystal: 'Crystal',
  hemp: 'Fiber / hemp',
  flower: 'Herb / flower',
  scrap: 'Scrap',
};

export const TOOL_LABEL: Record<HarvestRadialToolId, string> = {
  axe: 'Hatchet',
  pickaxe: 'Pickaxe',
  skinning_knife: 'Knife',
  fishing_rod: 'Fishing rod',
  toolkit: 'Build hammer',
};

/** Max strike range from player feet to node root (meters). */
export const HARVEST_STRIKE_RANGE_M = 4.5;

/**
 * Classify a rock node as rock vs ore (gold / metal veins).
 * Ore uses denser pinata fragments + gold debris loot.
 */
export function classifyRock(oreVariant?: boolean): HarvestNodeClass {
  return oreVariant ? 'ore' : 'rock';
}

export function toolsFor(nodeClass: HarvestNodeClass): HarvestRadialToolId[] {
  return TOOLS_FOR_NODE[nodeClass];
}

export function toolMatchesNode(
  tool: HarvestRadialToolId,
  nodeClass: HarvestNodeClass,
): boolean {
  return TOOLS_FOR_NODE[nodeClass].includes(tool);
}

/**
 * Gate a strike: correct tool + optional range.
 * Fishing rod / hammer never harvest nature nodes.
 */
export function gateHarvestStrike(
  tool: HarvestRadialToolId,
  nodeClass: HarvestNodeClass,
  opts?: { distanceM?: number; maxRangeM?: number },
): ToolGateResult {
  const required = TOOLS_FOR_NODE[nodeClass];
  const label = NODE_LABEL[nodeClass];
  const maxRange = opts?.maxRangeM ?? HARVEST_STRIKE_RANGE_M;

  if (opts?.distanceM != null && opts.distanceM > maxRange) {
    return {
      ok: false,
      message: `Too far from ${label.toLowerCase()} (${opts.distanceM.toFixed(1)} m). Step closer.`,
      required,
      nodeClass,
      label,
    };
  }

  if (!required.includes(tool)) {
    const need = required.map((t) => TOOL_LABEL[t]).join(' / ');
    const have = TOOL_LABEL[tool] ?? tool;
    return {
      ok: false,
      message: `Wrong tool for ${label}. Equip ${need} (have ${have}).`,
      required,
      nodeClass,
      label,
    };
  }

  return { ok: true, required, nodeClass, label };
}

/** Damage mult from action set (pick/axe harvestMult ≈ 1.4). */
export function harvestDamageForTool(tool: HarvestRadialToolId): number {
  switch (tool) {
    case 'pickaxe':
    case 'axe':
      return 1;
    case 'skinning_knife':
      return 1;
    case 'toolkit':
      return 0.5;
    default:
      return 0;
  }
}

/** Resource type string for onHarvest / mine loot bag. */
export function resourceTypeForClass(nodeClass: HarvestNodeClass): string {
  switch (nodeClass) {
    case 'tree':
      return 'forest';
    case 'rock':
    case 'ore':
    case 'crystal':
    case 'scrap':
      return 'mining';
    case 'hemp':
    case 'flower':
      return 'herbalism';
    default:
      return 'gather';
  }
}
