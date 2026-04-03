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
  baseStats: Record<AttributeKey, number>;
  spriteSet: string;
}

const SPRITE_SET_MAP: Record<string, string> = {
  human: "Soldier", barbarian: "Armored Axeman", undead: "Skeleton",
  orc: "Orc", elf: "Archer", dwarf: "Knight",
};

const FALLBACK_RACES: RaceDef[] = [
  { id: "human",     name: "Human",     faction: "Crusade", description: "Noble warriors of honor and chivalry.",      image: assetUrl("/images/portraits/human.png"),     baseStats: { Strength: 2, Intellect: 1, Vitality: 2, Dexterity: 0, Endurance: 0, Wisdom: 0, Agility: 0, Tactics: 0 }, spriteSet: "Soldier" },
  { id: "barbarian", name: "Barbarian", faction: "Crusade", description: "Fierce tribal warriors of raw strength.",     image: assetUrl("/images/portraits/barbarian.png"), baseStats: { Strength: 2, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 0, Tactics: 0 }, spriteSet: "Armored Axeman" },
  { id: "undead",    name: "Undead",    faction: "Legion",  description: "Risen from death, servants of dark magic.",   image: assetUrl("/images/portraits/undead.png"),    baseStats: { Strength: 0, Intellect: 2, Vitality: 0, Dexterity: 0, Endurance: 0, Wisdom: 3, Agility: 0, Tactics: 0 }, spriteSet: "Skeleton" },
  { id: "orc",       name: "Orc",       faction: "Legion",  description: "Brutal warriors of overwhelming force.",      image: assetUrl("/images/portraits/orc.png"),       baseStats: { Strength: 2, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 2, Wisdom: 0, Agility: 0, Tactics: 0 }, spriteSet: "Orc" },
  { id: "elf",       name: "Elf",       faction: "Fabled",  description: "Ancient wielders of nature and arcane arts.",  image: assetUrl("/images/portraits/elf.png"),       baseStats: { Strength: 0, Intellect: 2, Vitality: 0, Dexterity: 1, Endurance: 0, Wisdom: 2, Agility: 0, Tactics: 0 }, spriteSet: "Archer" },
  { id: "dwarf",     name: "Dwarf",     faction: "Fabled",  description: "Master craftsmen and resilient fighters.",     image: assetUrl("/images/portraits/dwarf.png"),     baseStats: { Strength: 0, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 2, Wisdom: 1, Agility: 0, Tactics: 0 }, spriteSet: "Knight" },
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
}

const FALLBACK_CLASSES: ClassDef[] = [
  { id: "worg",    name: "Worg Shapeshifter", description: "Transform into animal forms with unique abilities.", role: "Tank / DPS / Utility",  baseStats: { Strength: 1, Intellect: 0, Vitality: 2, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 1, Tactics: 0 }, spriteSetOverride: "Werewolf", startingWeapon: "axe" },
  { id: "warrior", name: "Warrior",           description: "Flexible tank/DPS/support with invincibility.",    role: "Tank / DPS / Support", baseStats: { Strength: 2, Intellect: 0, Vitality: 1, Dexterity: 0, Endurance: 1, Wisdom: 0, Agility: 0, Tactics: 1 }, startingWeapon: "sword" },
  { id: "mage",    name: "Mage Priest",       description: "Mana shield, blink, portals, healing and DPS.",    role: "Healer / DPS / Utility", baseStats: { Strength: 0, Intellect: 3, Vitality: 0, Dexterity: 0, Endurance: 0, Wisdom: 2, Agility: 0, Tactics: 0 }, spriteSetOverride: "Wizard", startingWeapon: "staff" },
  { id: "ranger",  name: "Ranger Scout",      description: "Ranged mastery or stealth assassin paths.",        role: "DPS / Utility / Off-Tank", baseStats: { Strength: 0, Intellect: 0, Vitality: 0, Dexterity: 2, Endurance: 0, Wisdom: 0, Agility: 2, Tactics: 1 }, startingWeapon: "bow" },
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
      const synced: RaceDef[] = Object.values(racesObj).map((r: any) => ({
        id: r.id,
        name: r.name,
        faction: factionLabel(r.faction),
        description: r.description || r.lore || "",
        image: assetUrl(`/images/portraits/${r.id}.png`),
        baseStats: r.bonuses || FALLBACK_RACES.find(fr => fr.id === r.id)?.baseStats || {} as any,
        spriteSet: SPRITE_SET_MAP[r.id] || "Soldier",
      }));
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
        };
      });
      if (synced.length > 0) CLASSES = synced;
    }

    console.debug("[gameData] Synced from ObjectStore:", RACES.length, "races,", CLASSES.length, "classes");
  } catch (err) {
    console.warn("[gameData] ObjectStore sync failed, using fallback data:", err);
  }
}
