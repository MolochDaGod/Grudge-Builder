/**
 * Game Data — Single Source of Truth
 *
 * ALL game data flows from ObjectStore (canonical).
 * Hardcoded values below are FALLBACK ONLY — used when ObjectStore is unreachable.
 * On app init, prefetchCoreData() warms the cache; subsequent calls are instant.
 *
 * ObjectStore endpoints:
 *   /api/v1/races.json      → RACES
 *   /api/v1/classes.json    → CLASSES
 *   /api/v1/attributes.json → ATTRIBUTES
 *   /api/v1/factions.json   → FACTION data
 */

import { assetUrl } from "@/lib/assetConfig";
import { fetchRaces, fetchClasses, fetchAttributes, fetchFactions } from "@/lib/objectStoreApi";
import { getRacePortraitUrl, getClassHeroUrl } from "@shared/fleet/uiArt";
import type { AttributeKey, OSRace, OSClass, RaceId, ClassId } from "@/lib/objectStoreTypes";

export type { AttributeKey };

// ── Attribute definitions ────────────────────────────────────────────────────

export interface AttributeDef {
  description: string;
  gains: Record<string, number>;
}

// Hardcoded fallback (used if ObjectStore is unreachable)
const FALLBACK_ATTRIBUTES: Record<AttributeKey, AttributeDef> = {
  Strength:  { description: "Physical might and raw power.",             gains: { Health: 5, "Phys Dmg": 1.25, "Phys Def": 4 } },
  Intellect: { description: "Mental acuity and spellcasting power.",     gains: { Mana: 9, "Mag Dmg": 1.5, "Mag Def": 2 } },
  Vitality:  { description: "Physical endurance and life force.",        gains: { Health: 25, "Phys Def": 1.5, "HP Regen": 0.06 } },
  Dexterity: { description: "Hand-eye coordination and finesse.",        gains: { Crit: 0.3, "Atk Spd": 0.2, Accuracy: 0.25 } },
  Endurance: { description: "Stamina reserves and physical resistance.", gains: { Stamina: 6, "Phys Def": 5, Block: 0.175 } },
  Wisdom:    { description: "Mental fortitude and magical resilience.",  gains: { Mana: 6, "Mag Def": 5.5, Resist: 0.25 } },
  Agility:   { description: "Speed, reflexes, and positioning.",         gains: { Speed: 0.15, Evasion: 0.225, Dodge: 0.15 } },
  Tactics:   { description: "Strategic thinking and ability control.",    gains: { Stamina: 3, "Armor Pen": 0.2, "Cost Red": 0.075 } },
};

// Live attributes — starts as fallback, replaced by ObjectStore on load
export let ATTRIBUTES: Record<AttributeKey, AttributeDef> = { ...FALLBACK_ATTRIBUTES };

// ── Race definitions ─────────────────────────────────────────────────────────

export type Faction = "Crusade" | "Legion" | "Fabled";

export interface RaceDef {
  id: string;
  name: string;
  faction: Faction;
  description: string;
  image: string;
  cardBg?: string;
  portraits?: Record<string, string>;
  baseStats: Record<AttributeKey, number>;
  spriteSet: string;
}

// ── Race×Class → Sprite Set Matrix ────────────────────────────────────────────
// Every race+class combo gets a visually distinct sprite.
// Keys: SPRITE_MATRIX[raceId][classId] → spriteManifest key

const SPRITE_MATRIX: Record<string, Record<string, string>> = {
  human: {
    warrior: "Soldier",
    mage:    "Wizard",
    ranger:  "Archer",
    worge:    "Werewolf",
  },
  barbarian: {
    warrior: "Armored Axeman",
    mage:    "Mage",           // from spriteManifest (128×128 enemy/fantasy set)
    ranger:  "Elite Orc",     // heavy ranged barbarian 
    worge:    "Werewolf",
  },
  undead: {
    warrior: "Armored Skeleton",
    mage:    "Greatsword Skeleton", // undead caster uses skeleton variant
    ranger:  "Skeleton",            // base skeleton for ranged undead
    worge:    "Skeleton",
  },
  orc: {
    warrior: "Armored Orc",
    mage:    "Orc",            // orc base for caster orcs
    ranger:  "Elite Orc",
    worge:    "Armored Orc",
  },
  elf: {
    warrior: "Knight",         // elven knight aesthetic
    mage:    "Wizard",
    ranger:  "Archer",
    worge:    "Werewolf",
  },
  dwarf: {
    warrior: "Knight",
    mage:    "Mage",
    ranger:  "Soldier",        // dwarf gunner uses soldier base
    worge:    "Knight",
  },
};

/** Get the sprite set for a specific race+class combo */
export function getSpriteSetForCharacter(raceId: string, classId: string): string {
  const raceSprites = SPRITE_MATRIX[raceId];
  if (raceSprites) {
    const sprite = raceSprites[classId];
    if (sprite) return sprite;
  }
  // Fallback: race-level default
  return SPRITE_SET_MAP_FALLBACK[raceId] || "Soldier";
}

// Simple race-only fallback (used when class is unknown)
const SPRITE_SET_MAP_FALLBACK: Record<string, string> = {
  human: "Soldier", barbarian: "Armored Axeman", undead: "Skeleton",
  orc: "Orc", elf: "Archer", dwarf: "Knight",
};

// Backward compat alias
const SPRITE_SET_MAP = SPRITE_SET_MAP_FALLBACK;

const UI_CLASS_PORTRAITS = {
  warrior: getClassHeroUrl("warrior"),
  mage: getClassHeroUrl("mage"),
  ranger: getClassHeroUrl("ranger"),
  worge: getClassHeroUrl("worge"),
} as const;

// Canonical race stats from grudge-guide.html / ObjectStore
const FALLBACK_RACES: RaceDef[] = [
  { id: "human",     name: "Human",     faction: "Crusade", description: "Versatile and adaptable — masters of none, capable of all. Start with +1 bonus across every attribute.",      image: getRacePortraitUrl("human"),     cardBg: assetUrl("/backgrounds/bg_warrior.png"), portraits: { ...UI_CLASS_PORTRAITS }, baseStats: { Strength: 1, Intellect: 1, Vitality: 1, Dexterity: 1, Endurance: 1, Wisdom: 1, Agility: 1, Tactics: 1 }, spriteSet: "Soldier" },
  { id: "orc",       name: "Orc",       faction: "Legion",  description: "Savage brutes bred for war — crushing strength and iron will. Natural Warriors and Barbarians.",      image: getRacePortraitUrl("orc"),       cardBg: assetUrl("/backgrounds/battle_arena_default.png"), portraits: { ...UI_CLASS_PORTRAITS }, baseStats: { Strength: 4, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 2, Wisdom: 0, Agility: 0, Tactics: 0 }, spriteSet: "Orc" },
  { id: "elf",       name: "Elf",       faction: "Fabled",  description: "Ancient and graceful — wielders of arcane arts and deadly precision. Superb Mage Priests and Rangers.",  image: getRacePortraitUrl("elf"),       cardBg: assetUrl("/backgrounds/bg_elf.png"), portraits: { ...UI_CLASS_PORTRAITS }, baseStats: { Strength: 0, Intellect: 3, Vitality: 0, Dexterity: 2, Endurance: 0, Wisdom: 1, Agility: 2, Tactics: 0 }, spriteSet: "Archer" },
  { id: "undead",    name: "Undead",    faction: "Legion",  description: "Death-touched revenants fueled by dark energy. Tanky, resistant, and patient.",   image: getRacePortraitUrl("undead"),    cardBg: assetUrl("/backgrounds/bg_undead.png"), portraits: { ...UI_CLASS_PORTRAITS }, baseStats: { Strength: 1, Intellect: 0, Vitality: 3, Dexterity: 0, Endurance: 2, Wisdom: 2, Agility: 0, Tactics: 0 }, spriteSet: "Skeleton" },
  { id: "barbarian", name: "Barbarian", faction: "Crusade", description: "Untamed fury given form — raw power and relentless aggression. Natural greatsword and greataxe wielders.",     image: getRacePortraitUrl("barbarian"), cardBg: assetUrl("/sprites/backgrounds/barbarian_warrior_silhouette_background.png"), portraits: { ...UI_CLASS_PORTRAITS }, baseStats: { Strength: 3, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 2, Tactics: 1 }, spriteSet: "Armored Axeman" },
  { id: "dwarf",     name: "Dwarf",     faction: "Fabled",  description: "Stout mountain folk — unyielding defense and masterful craftsmanship. Premier tanks and crafters.",     image: getRacePortraitUrl("dwarf"),     cardBg: assetUrl("/sprites/backgrounds/dwarf_warrior_silhouette_background.png"), portraits: { ...UI_CLASS_PORTRAITS }, baseStats: { Strength: 1, Intellect: 0, Vitality: 2, Dexterity: 1, Endurance: 3, Wisdom: 1, Agility: 0, Tactics: 0 }, spriteSet: "Knight" },
];

export let RACES: RaceDef[] = [...FALLBACK_RACES];

// ── Class definitions ────────────────────────────────────────────────────────

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  role: string;
  baseStats: Record<AttributeKey, number>;
  spriteSetOverride?: string;
  startingWeapon: string;
  /** Canonical weapon types this class can equip (from grudge-guide) */
  weapons: string[];
  /** Canonical armor types (from grudge-guide) */
  armorTypes: string[];
  /** Signature ability */
  signature: { name: string; desc: string; cd: string; cost: string };
  /** Core abilities list */
  coreAbilities: string[];
}

/** Freeform ARPG — any kit can use any weapon / armor; "class" is starter vibe only. */
const FREEFORM_WEAPONS = [
  "Swords", "Greatswords", "1H Axes", "Greataxes", "1H Hammers", "2H Hammers",
  "Bows", "Crossbows", "Guns", "Daggers", "Spears", "Shields",
  "Fire Staves", "Frost Staves", "Holy Staves", "Lightning Staves", "Arcane Staves", "Nature Staves",
];
const FREEFORM_ARMOR = ["Cloth", "Leather", "Mail", "Plate"];

// Soft archetypes (flavor + tiny starting stat lean) — NOT equip / skill gates
const FALLBACK_CLASSES: ClassDef[] = [
  {
    id: "warrior", name: "Warrior",
    description: "Brawler starter vibe — wade in and hit hard. Equip anything you loot; nothing is class-locked.",
    role: "Freeform",
    baseStats: { Strength: 2, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 0, Tactics: 1 },
    startingWeapon: "sword",
    weapons: FREEFORM_WEAPONS,
    armorTypes: FREEFORM_ARMOR,
    signature: { name: "Invincible", desc: "Become invulnerable for 2 turns, absorbing all damage.", cd: "8s", cost: "35 stamina" },
    coreAbilities: ["Slash", "Power Strike", "War Cry", "Shield Bash", "Cleave"],
  },
  {
    id: "mage", name: "Mage Priest",
    description: "Caster starter vibe — spark and spell. Still free to dual-wield axes or snipe with a bow.",
    role: "Freeform",
    baseStats: { Strength: 0, Intellect: 3, Vitality: 0, Dexterity: 0, Endurance: 0, Wisdom: 2, Agility: 0, Tactics: 0 },
    spriteSetOverride: "Wizard", startingWeapon: "staff",
    weapons: FREEFORM_WEAPONS,
    armorTypes: FREEFORM_ARMOR,
    signature: { name: "Mana Shield", desc: "Convert mana into a protective barrier (+25 def, 3 turns).", cd: "5s", cost: "50 mana" },
    coreAbilities: ["Arcane Bolt", "Fireball", "Divine Heal", "Ice Storm"],
  },
  {
    id: "ranger", name: "Ranger Scout",
    description: "Scout starter vibe — range and mobility. Loot freely; wear plate if you want.",
    role: "Freeform",
    baseStats: { Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 2, Endurance: 0, Wisdom: 0, Agility: 2, Tactics: 1 },
    startingWeapon: "bow",
    weapons: FREEFORM_WEAPONS,
    armorTypes: FREEFORM_ARMOR,
    signature: { name: "Shadowflight Volley", desc: "Rain of shadow arrows from above over an area.", cd: "50s", cost: "55 mana" },
    coreAbilities: ["Quick Shot", "Aimed Shot", "Multi Shot", "Piercing Arrow"],
  },
  {
    id: "worge", name: "Worge Shapeshifter",
    description: "Wild starter vibe — forms and totems. No gear restrictions; build however is fun.",
    role: "Freeform",
    baseStats: { Strength: 1, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 1, Tactics: 0 },
    spriteSetOverride: "Werewolf", startingWeapon: "axe",
    weapons: FREEFORM_WEAPONS,
    armorTypes: FREEFORM_ARMOR,
    signature: { name: "Worge Transform", desc: "Transform into a beast form (+25% dmg, +10 def).", cd: "0s", cost: "20 stamina" },
    coreAbilities: ["Mace Strike", "Lightning Lash", "Nature's Grasp", "Dagger Toss"],
  },
];

export let CLASSES: ClassDef[] = [...FALLBACK_CLASSES];

// ── Faction colors (static, no need to fetch) ────────────────────────────────

export const FACTION_COLORS = {
  Crusade: { border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-900/20", glow: "shadow-blue-500/50" },
  Legion:  { border: "border-red-600",  text: "text-red-500",  bg: "bg-red-900/20",  glow: "shadow-red-600/50" },
  Fabled:  { border: "border-green-500", text: "text-green-400", bg: "bg-green-900/20", glow: "shadow-green-500/50" },
};

// ── ObjectStore sync (called by prefetchCoreData on app init) ────────────────
// Converts ObjectStore API shapes → the RaceDef/ClassDef shapes that all pages use.

function factionLabel(f: string): Faction {
  if (f === "crusade") return "Crusade";
  if (f === "legion") return "Legion";
  return "Fabled";
}

/** Replace RACES/CLASSES/ATTRIBUTES with ObjectStore data (non-breaking). */
export async function syncGameDataFromObjectStore(): Promise<void> {
  try {
    const [racesData, classesData, _attrsData] = await Promise.all([
      fetchRaces(),
      fetchClasses(),
      fetchAttributes(),
    ]);

    // Sync races
    const racesObj = (racesData as any)?.races;
    if (racesObj && typeof racesObj === "object") {
      const synced: RaceDef[] = Object.values(racesObj).map((r: any) => {
        const fb = FALLBACK_RACES.find(fr => fr.id === r.id);
        return {
          id: r.id,
          name: r.name,
          faction: factionLabel(r.faction),
          description: r.description || r.lore || "",
          image: assetUrl(`/images/portraits/${r.id}.png`),
          cardBg: fb?.cardBg,
          portraits: fb?.portraits,
          baseStats: r.bonuses || fb?.baseStats || {} as any,
          spriteSet: SPRITE_SET_MAP[r.id] || "Soldier",
        };
      });
      if (synced.length > 0) RACES = synced;
    }

    // Sync classes
    const classesObj = (classesData as any)?.classes;
    if (classesObj && typeof classesObj === "object") {
      const synced: ClassDef[] = Object.values(classesObj).map((c: any) => {
        const fb = FALLBACK_CLASSES.find(fc => fc.id === c.id);
        return {
          id: c.id,
          name: c.name,
          description: c.description || c.lore || fb?.description || "",
          role: fb?.role || "DPS",
          baseStats: c.startingAttributes || fb?.baseStats || {} as any,
          spriteSetOverride: fb?.spriteSetOverride,
          startingWeapon: fb?.startingWeapon || "sword",
          weapons: c.weapons || fb?.weapons || [],
          armorTypes: c.armorTypes || fb?.armorTypes || [],
          signature: c.signature || fb?.signature || { name: "", desc: "", cd: "", cost: "" },
          coreAbilities: c.coreAbilities || fb?.coreAbilities || [],
        };
      });
      if (synced.length > 0) CLASSES = synced;
    }

    console.debug("[gameData] Synced from ObjectStore:", RACES.length, "races,", CLASSES.length, "classes");
  } catch (err) {
    console.warn("[gameData] ObjectStore sync failed, using fallback data:", err);
  }
}
