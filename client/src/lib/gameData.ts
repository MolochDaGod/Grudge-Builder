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
    worg:    "Werewolf",
  },
  barbarian: {
    warrior: "Armored Axeman",
    mage:    "Mage",           // from spriteManifest (128×128 enemy/fantasy set)
    ranger:  "Elite Orc",     // heavy ranged barbarian 
    worg:    "Werewolf",
  },
  undead: {
    warrior: "Armored Skeleton",
    mage:    "Greatsword Skeleton", // undead caster uses skeleton variant
    ranger:  "Skeleton",            // base skeleton for ranged undead
    worg:    "Skeleton",
  },
  orc: {
    warrior: "Armored Orc",
    mage:    "Orc",            // orc base for caster orcs
    ranger:  "Elite Orc",
    worg:    "Armored Orc",
  },
  elf: {
    warrior: "Knight",         // elven knight aesthetic
    mage:    "Wizard",
    ranger:  "Archer",
    worg:    "Werewolf",
  },
  dwarf: {
    warrior: "Knight",
    mage:    "Mage",
    ranger:  "Soldier",        // dwarf gunner uses soldier base
    worg:    "Knight",
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

// Canonical race stats from grudge-guide.html / ObjectStore
const FALLBACK_RACES: RaceDef[] = [
  { id: "human",     name: "Human",     faction: "Crusade", description: "Versatile and adaptable — masters of none, capable of all. Start with +1 bonus across every attribute.",      image: assetUrl("/images/portraits/human.png"),     cardBg: assetUrl("/backgrounds/bg_warrior.png"), portraits: { warrior: assetUrl("/heroes/portraits/human_warrior.png"), mage: assetUrl("/heroes/portraits/human_mage.png"), ranger: assetUrl("/heroes/portraits/human_ranger.png"), worg: assetUrl("/heroes/portraits/human_worg.png") }, baseStats: { Strength: 1, Intellect: 1, Vitality: 1, Dexterity: 1, Endurance: 1, Wisdom: 1, Agility: 1, Tactics: 1 }, spriteSet: "Soldier" },
  { id: "orc",       name: "Orc",       faction: "Legion",  description: "Savage brutes bred for war — crushing strength and iron will. Natural Warriors and Barbarians.",      image: assetUrl("/images/portraits/orc.png"),       cardBg: assetUrl("/backgrounds/battle_arena_default.png"), portraits: { warrior: assetUrl("/heroes/portraits/orc_warrior.png"), mage: assetUrl("/heroes/portraits/orc_mage.png"), ranger: assetUrl("/heroes/portraits/orc_ranger.png"), worg: assetUrl("/heroes/portraits/orc_worg.png") }, baseStats: { Strength: 4, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 2, Wisdom: 0, Agility: 0, Tactics: 0 }, spriteSet: "Orc" },
  { id: "elf",       name: "Elf",       faction: "Fabled",  description: "Ancient and graceful — wielders of arcane arts and deadly precision. Superb Mage Priests and Rangers.",  image: assetUrl("/images/portraits/elf.png"),       cardBg: assetUrl("/backgrounds/bg_elf.png"), portraits: { warrior: assetUrl("/heroes/portraits/elf_warrior.png"), mage: assetUrl("/heroes/portraits/elf_mage.png"), ranger: assetUrl("/heroes/portraits/elf_ranger.png"), worg: assetUrl("/heroes/portraits/elf_worg.png") }, baseStats: { Strength: 0, Intellect: 3, Vitality: 0, Dexterity: 2, Endurance: 0, Wisdom: 1, Agility: 2, Tactics: 0 }, spriteSet: "Archer" },
  { id: "undead",    name: "Undead",    faction: "Legion",  description: "Death-touched revenants fueled by dark energy. Tanky, resistant, and patient.",   image: assetUrl("/images/portraits/undead.png"),    cardBg: assetUrl("/backgrounds/bg_undead.png"), portraits: { warrior: assetUrl("/heroes/portraits/undead_warrior.png"), mage: assetUrl("/heroes/portraits/undead_mage.png"), ranger: assetUrl("/heroes/portraits/undead_ranger.png"), worg: assetUrl("/heroes/portraits/undead_worg.png") }, baseStats: { Strength: 1, Intellect: 0, Vitality: 3, Dexterity: 0, Endurance: 2, Wisdom: 2, Agility: 0, Tactics: 0 }, spriteSet: "Skeleton" },
  { id: "barbarian", name: "Barbarian", faction: "Crusade", description: "Untamed fury given form — raw power and relentless aggression. Natural greatsword and greataxe wielders.",     image: assetUrl("/images/portraits/barbarian.png"), cardBg: assetUrl("/sprites/backgrounds/barbarian_warrior_silhouette_background.png"), portraits: { warrior: assetUrl("/heroes/portraits/barbarian_warrior.png"), mage: assetUrl("/heroes/portraits/barbarian_mage.png"), ranger: assetUrl("/heroes/portraits/barbarian_ranger.png"), worg: assetUrl("/heroes/portraits/barbarian_worg.png") }, baseStats: { Strength: 3, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 2, Tactics: 1 }, spriteSet: "Armored Axeman" },
  { id: "dwarf",     name: "Dwarf",     faction: "Fabled",  description: "Stout mountain folk — unyielding defense and masterful craftsmanship. Premier tanks and crafters.",     image: assetUrl("/images/portraits/dwarf.png"),     cardBg: assetUrl("/sprites/backgrounds/dwarf_warrior_silhouette_background.png"), portraits: { warrior: assetUrl("/heroes/portraits/dwarf_warrior.png"), mage: assetUrl("/heroes/portraits/dwarf_mage.png"), ranger: assetUrl("/heroes/portraits/dwarf_ranger.png"), worg: assetUrl("/heroes/portraits/dwarf_worg.png") }, baseStats: { Strength: 1, Intellect: 0, Vitality: 2, Dexterity: 1, Endurance: 3, Wisdom: 1, Agility: 0, Tactics: 0 }, spriteSet: "Knight" },
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

// Canonical class data from grudge-guide.html
const FALLBACK_CLASSES: ClassDef[] = [
  {
    id: "warrior", name: "Warrior",
    description: "Fearless tanks who wade into melee. Use shields, swords, greatswords, axes, and hammers. Wear plate or mail. Generate threat and anchor the frontline.",
    role: "Tank / DPS / Support",
    baseStats: { Strength: 2, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 0, Tactics: 1 },
    startingWeapon: "sword",
    weapons: ["Shields", "Swords", "Greatswords", "1H Axes", "Greataxes", "1H Hammers", "2H Hammers"],
    armorTypes: ["Plate", "Mail"],
    signature: { name: "Invincible", desc: "Become invulnerable for 2 turns, absorbing all damage.", cd: "8s", cost: "35 stamina" },
    coreAbilities: ["Slash — resource-restoring basic strike", "Power Strike — 2x damage", "War Cry — +30% damage buff 3 turns", "Shield Bash — 1-turn stun", "Cleave — AoE bleed", "Demon Blade — transform for +40% dmg and +15 def"],
  },
  {
    id: "mage", name: "Mage Priest",
    description: "Masters of six staff schools: fire, frost, holy, lightning, arcane, and nature. Wear cloth only. Tremendously powerful offensively but fragile.",
    role: "Healer / DPS / Utility",
    baseStats: { Strength: 0, Intellect: 3, Vitality: 0, Dexterity: 0, Endurance: 0, Wisdom: 2, Agility: 0, Tactics: 0 },
    spriteSetOverride: "Wizard", startingWeapon: "staff",
    weapons: ["Fire Staves", "Frost Staves", "Holy Staves", "Lightning Staves", "Arcane Staves", "Nature Staves"],
    armorTypes: ["Cloth"],
    signature: { name: "Mana Shield", desc: "Convert mana into a protective barrier (+25 def, 3 turns).", cd: "5s", cost: "50 mana" },
    coreAbilities: ["Arcane Bolt — resource-restoring basic cast", "Fireball — 2.5x damage + burn", "Divine Heal — restore 30% HP", "Ice Storm — AoE freeze reducing damage"],
  },
  {
    id: "ranger", name: "Ranger Scout",
    description: "Silent, patient, lethal. Rangers can use bows, crossbows, guns, daggers, greatswords, and spears. Parry with RMB+LMB for counter windows.",
    role: "DPS / Utility / Off-Tank",
    baseStats: { Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 2, Endurance: 0, Wisdom: 0, Agility: 2, Tactics: 1 },
    startingWeapon: "bow",
    weapons: ["Bows", "Crossbows", "Guns", "Daggers", "Greatswords", "Spears"],
    armorTypes: ["Leather", "Mail"],
    signature: { name: "Shadowflight Volley", desc: "Rain of shadow arrows from above over an area.", cd: "50s", cost: "55 mana" },
    coreAbilities: ["Quick Shot — swift basic arrow", "Aimed Shot — +50% damage single target", "Multi Shot — 3 arrows in spread", "Piercing Arrow — line-clear", "Rain of Arrows — AoE barrage"],
  },
  {
    id: "worg", name: "Worge Shapeshifter",
    description: "Walk between worlds. Human form uses staves, spears, daggers, bows, and 1H hammers to summon totems and beast companions. Transform into Bear, Raptor, or Large Bird.",
    role: "Tank / DPS / Utility",
    baseStats: { Strength: 1, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 1, Tactics: 0 },
    spriteSetOverride: "Werewolf", startingWeapon: "axe",
    weapons: ["Fire Staves", "Nature Staves", "Spears", "Daggers", "Bows", "1H Hammers"],
    armorTypes: ["Leather"],
    signature: { name: "Worge Transform", desc: "Transform into a beast form (+25% dmg, +10 def).", cd: "0s", cost: "20 stamina" },
    coreAbilities: ["Mace Strike — storm-charged basic", "Lightning Lash — 1.8x + burn", "Nature's Grasp — HoT (+8%, 3 turns)", "Dagger Toss — poison DoT", "Summon Totems — heal / fire / fear", "Call Companions — Leaf Sprite, War Imp, Twig Guardian"],
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
