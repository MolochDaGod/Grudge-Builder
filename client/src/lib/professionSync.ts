/**
 * ProfessionSync — loads profession data from ObjectStore and provides
 * typed access to gathering tiers, crafting professions, recipes, benches,
 * XP table, and level milestones.
 *
 * This is the SINGLE SOURCE OF TRUTH for profession data across all Grudge apps.
 * ObjectStore endpoint: /api/v1/professions.json
 */

import { fetchProfessions } from '@/lib/objectStoreApi';
import { hydrateXpTable } from '@/lib/professionSystem';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GatheringMilestone {
  level: number;
  unlock: string;
  description: string;
}

export interface GatheringProfession {
  icon: string;
  color: string;
  resources: string[];
  tierResources: Record<string, string[]>; // "1" -> ["Iron Ore", ...]
  feedsInto: string[];
}

export interface CraftingActivity {
  id: string;
  name: string;
  description: string;
  activityType: string;
  baseXp: number;
  tierMultiplier?: boolean;
  repeatable: boolean;
  requirements?: string;
}

export interface CraftingProfession {
  icon: string;
  color: string;
  description: string;
  synergies: string[];
  activities: CraftingActivity[];
  craftingStation: string;
  recipes?: Array<{
    id: string;
    name: string;
    tier: number;
    materials: Array<{ name: string; quantity: number }>;
    result: string;
  }>;
}

export interface ProfessionData {
  version: string;
  updated: string;
  tierNames: string[];
  tierColors: Record<string, string>;
  xpTable: Record<string, number>;
  gatheringMilestones: GatheringMilestone[];
  gathering: Record<string, GatheringProfession>;
  professions: Record<string, CraftingProfession>;
}

// ── Cache ────────────────────────────────────────────────────────────────────

let _cached: ProfessionData | null = null;
let _loading: Promise<ProfessionData> | null = null;

// ── Fallback (used when ObjectStore unreachable) ─────────────────────────────

const FALLBACK: ProfessionData = {
  version: 'fallback',
  updated: '2026-01-01',
  tierNames: ['', 'Novice', 'Apprentice', 'Journeyman', 'Expert', 'Artisan', 'Master', 'Grandmaster', 'Legendary'],
  tierColors: { '1': 'gray', '2': 'green', '3': 'blue', '4': 'purple', '5': 'orange', '6': 'red', '7': 'pink', '8': 'amber' },
  xpTable: { '1': 0, '2': 100, '3': 250, '4': 500, '5': 850, '6': 1300, '7': 1900, '8': 2700, '9': 3700, '10': 5000, '15': 12000, '20': 25000, '30': 60000, '40': 120000, '50': 250000, '75': 750000, '100': 2000000 },
  gatheringMilestones: [
    { level: 1, unlock: 'Tier 1 Resources', description: 'Basic resources' },
    { level: 10, unlock: '+1 Quantity', description: 'Gather +1 per harvest' },
    { level: 25, unlock: 'Tier 3 Resources', description: 'Steel Ore, Ironwood, Tuna' },
    { level: 50, unlock: 'Tier 5 Resources', description: 'Mythril Ore, Ancient Wood' },
    { level: 75, unlock: '15% Gear Drop', description: '15% equipment drops' },
    { level: 100, unlock: 'Grandmaster', description: 'Max efficiency, 25% legendary drops' },
  ],
  gathering: {
    Mining: { icon: '⛏️', color: 'slate', resources: ['Ore', 'Gems'], tierResources: { '1': ['Iron Ore'] }, feedsInto: ['Miner'] },
    Logging: { icon: '🪓', color: 'green', resources: ['Wood'], tierResources: { '1': ['Pine Log'] }, feedsInto: ['Forester'] },
    Skinning: { icon: '🔪', color: 'amber', resources: ['Leather'], tierResources: { '1': ['Rough Leather'] }, feedsInto: ['Forester'] },
    Fishing: { icon: '🎣', color: 'blue', resources: ['Fish'], tierResources: { '1': ['Common Fish'] }, feedsInto: ['Chef'] },
    Herbalism: { icon: '🌿', color: 'emerald', resources: ['Herbs'], tierResources: { '1': ['Common Herb'] }, feedsInto: ['Chef', 'Mystic'] },
    Scavenging: { icon: '🧲', color: 'purple', resources: ['Components'], tierResources: { '1': ['Scrap Metal'] }, feedsInto: ['Engineer'] },
  },
  professions: {
    miner: { icon: '⛏️', color: '#ff7d87', description: 'Forge weapons and heavy armor', synergies: ['Mining', 'Scavenging'], activities: [], craftingStation: 'Forge' },
    forester: { icon: '🌲', color: '#49de95', description: 'Craft bows and leather gear', synergies: ['Logging', 'Skinning'], activities: [], craftingStation: 'Workbench' },
    mystic: { icon: '🔮', color: '#bb95ff', description: 'Enchant items and weave magic', synergies: ['Mining', 'Herbalism'], activities: [], craftingStation: 'Enchanting Altar' },
    chef: { icon: '👨‍🍳', color: '#ffb16d', description: 'Cook food buffs and brew potions', synergies: ['Fishing', 'Herbalism'], activities: [], craftingStation: 'Alchemy Table' },
    engineer: { icon: '🔧', color: '#7ab3ff', description: 'Build ranged weapons and siege', synergies: ['Mining', 'Scavenging'], activities: [], craftingStation: 'Workbench' },
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/** Load profession data from ObjectStore (cached) */
export async function loadProfessions(): Promise<ProfessionData> {
  if (_cached) return _cached;
  if (_loading) return _loading;

  _loading = (async () => {
    try {
      const raw = await fetchProfessions();
      if (raw && typeof raw === 'object' && 'gathering' in raw) {
        _cached = raw as unknown as ProfessionData;
        // Hydrate the synchronous professionSystem XP table with ObjectStore data
        if (_cached.xpTable) {
          hydrateXpTable(_cached.xpTable);
        }
        return _cached;
      }
    } catch (e) {
      console.warn('[ProfessionSync] ObjectStore unavailable, using fallback:', e);
    }
    _cached = FALLBACK;
    return _cached;
  })();

  return _loading;
}

/** Get gathering professions (6) */
export async function getGatheringProfessions(): Promise<Record<string, GatheringProfession>> {
  const data = await loadProfessions();
  return data.gathering;
}

/** Get crafting professions (5) */
export async function getCraftingProfessions(): Promise<Record<string, CraftingProfession>> {
  const data = await loadProfessions();
  return data.professions;
}

/** Get all gathering milestones (22 levels) */
export async function getGatheringMilestones(): Promise<GatheringMilestone[]> {
  const data = await loadProfessions();
  return data.gatheringMilestones;
}

/** Get XP required for a specific profession level */
export async function getXpForProfessionLevel(level: number): Promise<number> {
  const data = await loadProfessions();
  if (data.xpTable[String(level)] !== undefined) {
    return data.xpTable[String(level)];
  }
  // Interpolate between known levels
  const levels = Object.keys(data.xpTable).map(Number).sort((a, b) => a - b);
  let prev = 1, next = 100;
  for (let i = 0; i < levels.length - 1; i++) {
    if (levels[i] <= level && levels[i + 1] > level) {
      prev = levels[i];
      next = levels[i + 1];
      break;
    }
  }
  const prevXp = data.xpTable[String(prev)] || 0;
  const nextXp = data.xpTable[String(next)] || 0;
  const progress = (level - prev) / (next - prev);
  return Math.floor(prevXp + (nextXp - prevXp) * progress);
}

/** Get tier resources for a specific gathering profession and tier */
export async function getTierResources(professionName: string, tier: number): Promise<string[]> {
  const data = await loadProfessions();
  return data.gathering[professionName]?.tierResources[String(tier)] || [];
}

/** Get tier name from tier number */
export async function getTierName(tier: number): Promise<string> {
  const data = await loadProfessions();
  return data.tierNames[tier] || `T${tier}`;
}

/** Get the crafting station for a profession */
export async function getCraftingStation(professionId: string): Promise<string> {
  const data = await loadProfessions();
  return data.professions[professionId]?.craftingStation || 'Workbench';
}

/** Get which gathering professions feed into a crafting profession */
export function getGatheringSynergies(professionData: ProfessionData, craftingProfId: string): string[] {
  return professionData.professions[craftingProfId]?.synergies || [];
}

/** Get milestones unlocked at or below a given level */
export function getMilestonesForLevel(milestones: GatheringMilestone[], level: number): GatheringMilestone[] {
  return milestones.filter(m => m.level <= level);
}

/** Get the next milestone above current level */
export function getNextMilestone(milestones: GatheringMilestone[], level: number): GatheringMilestone | null {
  return milestones.find(m => m.level > level) || null;
}

/** Clear the profession cache (call when data is updated) */
export function clearProfessionCache(): void {
  _cached = null;
  _loading = null;
}

// ── Crafting Station map ─────────────────────────────────────────────────────

export const CRAFTING_STATIONS = {
  forge: { name: 'Forge', icon: '🔨', professions: ['miner'], desc: 'Weapons & heavy armor. Requires ore and fuel.' },
  workbench: { name: 'Workbench', icon: '🪵', professions: ['forester', 'engineer'], desc: 'Wood items, bows, tools, ranged weapons.' },
  alchemyTable: { name: 'Alchemy Table', icon: '⚗️', professions: ['chef'], desc: 'Potions, elixirs, poisons, and food.' },
  loom: { name: 'Loom', icon: '🧵', professions: ['mystic'], desc: 'Cloth armor, capes, bags, magical fabrics.' },
  tannery: { name: 'Tannery', icon: '🔪', professions: ['forester'], desc: 'Leather armor, belts, boots from hides.' },
  enchantingAltar: { name: 'Enchanting Altar', icon: '✨', professions: ['mystic'], desc: 'Enchantments, runes, magical properties.' },
} as const;

export type CraftingStationId = keyof typeof CRAFTING_STATIONS;
