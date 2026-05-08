/**
 * Canonical Grudge Warlords Tier System (T1–T8)
 *
 * Source of truth: https://info.grudge-studio.com/items-guide.html
 * ObjectStore master-items.json uses these exact labels.
 */

export interface TierDef {
  tier: number;
  label: string;
  /** CSS-ready hex color */
  color: string;
  /** Tailwind-friendly text class */
  tw: string;
  /** Tailwind border class */
  twBorder: string;
}

export const TIERS: TierDef[] = [
  { tier: 1, label: "Common",    color: "#8b7355", tw: "text-stone-400",  twBorder: "border-stone-600" },
  { tier: 2, label: "Uncommon",  color: "#a8a8a8", tw: "text-gray-300",   twBorder: "border-gray-500" },
  { tier: 3, label: "Rare",      color: "#4a9eff", tw: "text-blue-400",   twBorder: "border-blue-600" },
  { tier: 4, label: "Epic",      color: "#9d4dff", tw: "text-purple-400", twBorder: "border-purple-600" },
  { tier: 5, label: "Heroic",    color: "#ff4d4d", tw: "text-red-400",    twBorder: "border-red-600" },
  { tier: 6, label: "Mythic",    color: "#ffaa00", tw: "text-amber-400",  twBorder: "border-amber-600" },
  { tier: 7, label: "Ancient",   color: "#d4a84b", tw: "text-yellow-500", twBorder: "border-yellow-600" },
  { tier: 8, label: "Legendary", color: "#f0d890", tw: "text-yellow-200", twBorder: "border-yellow-400" },
];

export function getTierDef(tier: number): TierDef {
  return TIERS.find(t => t.tier === tier) || TIERS[0];
}

export function getTierLabel(tier: number): string {
  return getTierDef(tier).label;
}

export function getTierColor(tier: number): string {
  return getTierDef(tier).color;
}

/** Crafting station definitions (from info.grudge-studio.com/crafting.html) */
export const CRAFTING_STATIONS = [
  { id: "forge",     name: "Forge",           icon: "⚒️",  profession: "Miner",    desc: "Weapons & heavy armor. Requires ore and fuel." },
  { id: "workbench", name: "Workbench",       icon: "🪵",  profession: "Forester", desc: "Wood items, bows, and tools." },
  { id: "alchemy",   name: "Alchemy Table",   icon: "⚗️",  profession: "Mystic",   desc: "Potions, elixirs, poisons, and enchanting oils." },
  { id: "loom",      name: "Loom",            icon: "🧵",  profession: "Mystic",   desc: "Cloth armor, capes, bags, and magical fabrics." },
  { id: "tannery",   name: "Tannery",         icon: "🐄",  profession: "Forester", desc: "Leather armor, belts, boots from hides and skins." },
  { id: "enchanting",name: "Enchanting Altar", icon: "✨", profession: "Mystic",   desc: "Enchantments, runes, and magical properties." },
] as const;

/** Harvesting profession definitions */
export const HARVESTING_PROFESSIONS = [
  { id: "mining",      name: "Mining",      icon: "⛏️", desc: "Extract ores and gems from mineral nodes." },
  { id: "herbalism",   name: "Herbalism",   icon: "🌿", desc: "Gather herbs, roots, and magical plants." },
  { id: "woodcutting", name: "Woodcutting", icon: "🪓", desc: "Fell trees and harvest lumber." },
  { id: "fishing",     name: "Fishing",     icon: "🎣", desc: "Catch fish and aquatic resources." },
  { id: "skinning",    name: "Skinning",    icon: "🔪", desc: "Skin creatures for leather and hides." },
] as const;

/** Crafting profession mapping (category → profession) */
export const CATEGORY_PROFESSION: Record<string, string> = {
  swords: "Miner", axes: "Miner", daggers: "Miner", maces: "Miner",
  hammers: "Miner", greatswords: "Miner", greataxes: "Miner", spears: "Miner",
  shields: "Miner",
  bows: "Forester", scythes: "Forester",
  crossbows: "Engineer", guns: "Engineer",
  fireStaves: "Mystic", frostStaves: "Mystic", holyStaves: "Mystic",
  lightningStaves: "Mystic", natureStaves: "Mystic", wands: "Mystic",
  "offhand-relic": "Mystic",
};
