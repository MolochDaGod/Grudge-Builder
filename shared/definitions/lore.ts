/**
 * lore.ts
 * ─────────────────────────────────────────────────────────────
 * Grudge Warlords — Canonical Lore Constants
 * Single source of truth for all server rooms and client code.
 *
 * Heroes (identity roster): HERO_ROSTER below — id/name/title/faction/race/class/sector.
 * Full codex (lore, dialogue, quests, art): shared/definitions/heroCodex.ts
 * DB seed: server/seeds/loreSeed.ts (imports heroCodex)
 * Static UI: client/public/hero-codex/ (heroes-canonical.json)
 *
 * Do NOT invent alternate cast names in UI (no Sir Aldric / Grommash substitutes).
 * ─────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
// GODS
// ═══════════════════════════════════════════════════════════════

export type GodId = "odin" | "madra" | "omni";

export interface God {
  id: GodId;
  name: string;
  title: string;
  domain: string;
  factionId: FactionId;
  artifacts: string[];
  blessingEffect: string;
  templeLocation: string;
}

export const GODS: Record<GodId, God> = {
  odin: {
    id: "odin",
    name: "Odin",
    title: "The All-Father",
    domain: "War, Wisdom, Fate, Victory",
    factionId: "crusade",
    artifacts: ["Gungnir (cosmic spear)", "Ravens Huginn & Muninn", "Wolves Geri & Freki"],
    blessingEffect: "+25% combat damage, reveals enemy weaknesses",
    templeLocation: "Mountain peaks near the Waterfall's edge",
  },
  madra: {
    id: "madra",
    name: "Madra",
    title: "The Chaos Mother",
    domain: "Entropy, Transformation, Destruction, Rebirth",
    factionId: "legion",
    artifacts: ["The Void Crown", "Arms of Infinite Reach", "The Shatter Stone"],
    blessingEffect: "+30% chaos damage, chance to corrupt enemy abilities",
    templeLocation: "Islands closest to the Waterfall (most dangerous)",
  },
  omni: {
    id: "omni",
    name: "The Omni",
    title: "The Eternal One",
    domain: "Balance, Unity, Infinity, Harmony",
    factionId: "fabled",
    artifacts: ["Third Eye of Creation", "Scales of Existence", "The Unifying Light"],
    blessingEffect: "+20% all resistances, healing amplification",
    templeLocation: "Central islands, equidistant from Waterfall and outer rim",
  },
};

// ═══════════════════════════════════════════════════════════════
// FACTIONS
// ═══════════════════════════════════════════════════════════════

/** Player-selectable factions. Pirate unlocks via endgame quest. */
export type FactionId = "crusade" | "legion" | "fabled";

/** NPC-only factions — not selectable at character creation. */
export type NPCFactionId = "pirate" | "neutral" | "hostile";

/** Any faction identifier (player or NPC). */
export type AnyFactionId = FactionId | NPCFactionId;

export interface Faction {
  id: FactionId;
  name: string;
  title: string;
  motto: string;
  patronGodId: GodId;
  races: RaceId[];
  color: string;        // hex
  pirateColor: string;  // sprite tint key (from pirateUnits.ts)
  /** All player factions this faction is hostile to on sight. */
  hostileTo: FactionId[];
  /** Factions whose NPCs will assist this faction's players in combat. */
  alliedTo: FactionId[];
}

export const FACTIONS: Record<FactionId, Faction> = {
  crusade: {
    id: "crusade",
    name: "The Crusade",
    title: "Victory Through Valor",
    motto: "We March Forward!",
    patronGodId: "odin",
    races: ["human", "orc"],
    color: "#3b82f6",
    pirateColor: "blue",
    hostileTo: ["legion", "fabled"],
    alliedTo: [],
  },
  legion: {
    id: "legion",
    name: "The Legion",
    title: "Through Chaos, We Are Reborn",
    motto: "We Consume All!",
    patronGodId: "madra",
    races: ["orc", "undead"],
    color: "#ef4444",
    pirateColor: "red",
    hostileTo: ["crusade", "fabled"],
    alliedTo: [],
  },
  fabled: {
    id: "fabled",
    name: "The Fabled",
    title: "In Balance, We Find Eternity",
    motto: "Unity Through Wisdom",
    patronGodId: "omni",
    races: ["elf", "dwarf"],
    color: "#22c55e",
    pirateColor: "green",
    hostileTo: ["crusade", "legion"],
    alliedTo: [],
  },
};

// ═══════════════════════════════════════════════════════════════
// NPC FACTIONS (non-player)
// ═══════════════════════════════════════════════════════════════

export interface NPCFaction {
  id: NPCFactionId;
  name: string;
  color: string;
  /** Default disposition toward all player factions. */
  defaultDisposition: "friendly" | "neutral" | "hostile";
  /**
   * Condition that overrides default disposition to hostile.
   * For pirates: holding a capture flag in the nexus sector.
   */
  hostilityCondition?: string;
  /** Has quests, vendors, black market traders? */
  hasServices: boolean;
}

export const NPC_FACTIONS: Record<NPCFactionId, NPCFaction> = {
  pirate: {
    id: "pirate",
    name: "The Pirate Confederacy",
    color: "#d4a437",
    defaultDisposition: "neutral",
    hostilityCondition: "player_holds_claim_in_nexus",
    hasServices: true,
  },
  neutral: {
    id: "neutral",
    name: "Neutral",
    color: "#9ca3af",
    defaultDisposition: "neutral",
    hasServices: false,
  },
  hostile: {
    id: "hostile",
    name: "Hostile Wildlife",
    color: "#ef4444",
    defaultDisposition: "hostile",
    hasServices: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// FACTION HOSTILITY & AGGRO SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Aggro circle configuration.
 *
 * NPCs have 3 concentric zones:
 *   - Detection: NPC becomes aware, turns to face (no combat)
 *   - Aggro:     NPC attacks if target is hostile faction
 *   - Assist:    NPC runs to help an ally under attack
 *
 * All distances measured from NPC center to target center.
 * Scale: 2m barbarian height reference. Doorways 3m+, caves 4m+.
 */
export const AGGRO_CONFIG = {
  /** NPC notices a player, turns to face. No combat yet. */
  detectionRadius: 25,
  /** NPC attacks hostile-faction players within this range. */
  aggroRadius: 15,
  /** NPC runs to assist a same-faction NPC or player under attack. */
  assistRadius: 30,
  /** NPC stops chasing and returns to patrol after this distance. */
  leashRadius: 50,
  /** Seconds before NPC de-aggros after losing line of sight. */
  losTimeoutSeconds: 8,
  /** Minimum time (ms) between aggro checks per NPC to avoid CPU spikes. */
  aggroCheckIntervalMs: 500,
  /** Players who attack a neutral/pirate NPC get flagged hostile for this duration. */
  attackFlagDurationMs: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Determine NPC disposition toward a player.
 *
 * Rules (evaluated in order):
 *   1. If player attacked this NPC or its group → hostile (attack flag)
 *   2. If NPC is player's own faction → allied (will assist)
 *   3. If NPC faction is in player faction's hostileTo → hostile (aggro on sight)
 *   4. If NPC is pirate and player holds nexus claim → hostile
 *   5. If NPC is pirate/neutral → neutral (friendly, has services)
 *   6. Otherwise → neutral
 */
export type Disposition = "allied" | "neutral" | "hostile";

export function getNPCDisposition(
  npcFaction: AnyFactionId,
  playerFaction: FactionId,
  playerFlags: { attackedNPC?: boolean; holdsNexusClaim?: boolean },
): Disposition {
  // Rule 1: Player attacked this NPC
  if (playerFlags.attackedNPC) return "hostile";

  // Rule 2: Same player faction → allied
  if (npcFaction === playerFaction) return "allied";

  // Rule 3: NPC is a player faction that's hostile to the player's faction
  if (npcFaction in FACTIONS) {
    const npcPlayerFaction = FACTIONS[npcFaction as FactionId];
    if (npcPlayerFaction.hostileTo.includes(playerFaction)) return "hostile";
  }

  // Rule 4: Pirate + player holds nexus claim → hostile
  if (npcFaction === "pirate" && playerFlags.holdsNexusClaim) return "hostile";

  // Rule 5: Pirate/neutral → neutral (services available)
  if (npcFaction === "pirate" || npcFaction === "neutral") return "neutral";

  // Rule 6: hostile wildlife
  if (npcFaction === "hostile") return "hostile";

  return "neutral";
}

/** Check if two player factions are enemies. */
export function areFactionsHostile(a: FactionId, b: FactionId): boolean {
  if (a === b) return false;
  return FACTIONS[a].hostileTo.includes(b);
}

/** Check if an NPC would assist a player (same faction, within assist radius). */
export function wouldNPCAssist(
  npcFaction: AnyFactionId,
  playerFaction: FactionId,
): boolean {
  return npcFaction === playerFaction;
}

// ═══════════════════════════════════════════════════════════════
// RACES
// ═══════════════════════════════════════════════════════════════

export type RaceId = "human" | "orc" | "elf" | "dwarf" | "undead" | "demon";

export interface Race {
  id: RaceId;
  name: string;
  lore: string;
  bonuses: { type: string; effect: string }[];
  defaultFaction: FactionId;
}

export const RACES: Record<RaceId, Race> = {
  human: {
    id: "human", name: "Human",
    lore: "Adaptable survivors who thrive in any environment.",
    bonuses: [
      { type: "XP Gain", effect: "+10% experience from all sources" },
      { type: "Skill Points", effect: "+1 starting skill point" },
      { type: "Diplomacy", effect: "Better prices from merchants" },
    ],
    defaultFaction: "crusade",
  },
  orc: {
    id: "orc", name: "Orc",
    lore: "Fierce warriors from the volcanic wastes. Born of magma-forges and ash.",
    bonuses: [
      { type: "Strength", effect: "+2 starting STR" },
      { type: "Damage", effect: "+5% physical damage" },
      { type: "Berserk", effect: "Gain power when health drops low" },
    ],
    defaultFaction: "legion",
  },
  elf: {
    id: "elf", name: "Elf",
    lore: "Ancient beings with deep connection to magic and nature.",
    bonuses: [
      { type: "Intellect", effect: "+2 starting INT" },
      { type: "Mana", effect: "+10% maximum mana" },
      { type: "Precision", effect: "+5% critical chance" },
    ],
    defaultFaction: "fabled",
  },
  dwarf: {
    id: "dwarf", name: "Dwarf",
    lore: "Stout mountain folk, master smiths. The Omni taught them the forge.",
    bonuses: [
      { type: "Endurance", effect: "+2 starting END" },
      { type: "Defense", effect: "+10% physical defense" },
      { type: "Crafting", effect: "+10% crafting quality bonus" },
    ],
    defaultFaction: "fabled",
  },
  undead: {
    id: "undead", name: "Undead",
    lore: "Risen souls bound by Madra. She refused to let her children truly die.",
    bonuses: [
      { type: "Resistance", effect: "+15% debuff resistance" },
      { type: "Drain", effect: "+5% lifesteal on attacks" },
      { type: "Immortal Will", effect: "Can fight at 0 HP briefly" },
    ],
    defaultFaction: "legion",
  },
  demon: {
    id: "demon", name: "Demon",
    lore: "Infernal beings of chaos and destruction. Masters of dark magic.",
    bonuses: [
      { type: "Damage", effect: "+8% all damage" },
      { type: "Critical Factor", effect: "+10% critical damage multiplier" },
      { type: "Corruption", effect: "Attacks can inflict debuffs" },
    ],
    defaultFaction: "legion",
  },
};

// ═══════════════════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════════════════

export type ClassId = "warrior" | "mage" | "rogue" | "cleric";

export interface GameClass {
  id: ClassId;
  name: string;
  role: string;
  primaryStats: AttributeId[];
  armorTypes: string[];
  weaponTypes: string[];
  resource: string;
  startingAttributes: Partial<Record<AttributeId, number>>;
}

export const CLASSES: Record<ClassId, GameClass> = {
  warrior: {
    id: "warrior", name: "Warrior", role: "Tank / Melee DPS",
    primaryStats: ["str", "vit", "end"],
    armorTypes: ["Mail", "Plate"],
    weaponTypes: ["Swords", "Axes", "Maces", "Shields"],
    resource: "Rage",
    startingAttributes: { str: 10, vit: 5, end: 5 },
  },
  mage: {
    id: "mage", name: "Mage", role: "Magic DPS / Crowd Control",
    primaryStats: ["int", "wis"],
    armorTypes: ["Cloth"],
    weaponTypes: ["Staves", "Wands", "Orbs"],
    resource: "Mana",
    startingAttributes: { int: 10, wis: 10 },
  },
  rogue: {
    id: "rogue", name: "Rogue", role: "Melee DPS / Assassin",
    primaryStats: ["dex", "agi", "str"],
    armorTypes: ["Leather"],
    weaponTypes: ["Daggers", "Swords", "Bows"],
    resource: "Energy",
    startingAttributes: { str: 6, dex: 7, agi: 7 },
  },
  cleric: {
    id: "cleric", name: "Cleric", role: "Healer / Support",
    primaryStats: ["wis", "vit", "int"],
    armorTypes: ["Cloth", "Mail"],
    weaponTypes: ["Maces", "Staves", "Shields"],
    resource: "Mana + Holy Power",
    startingAttributes: { vit: 5, int: 5, wis: 10 },
  },
};

// ═══════════════════════════════════════════════════════════════
// ATTRIBUTES (the 8 Grudge stats)
// ═══════════════════════════════════════════════════════════════

export type AttributeId = "str" | "vit" | "end" | "dex" | "agi" | "int" | "wis" | "tac";

export interface Attribute {
  id: AttributeId;
  name: string;
  abbr: string;
  color: string;
  primaryGains: string;
}

export const ATTRIBUTES: Record<AttributeId, Attribute> = {
  str: { id: "str", name: "Strength",  abbr: "STR", color: "#ef4444", primaryGains: "Physical damage, defense, health, lifesteal" },
  vit: { id: "vit", name: "Vitality",  abbr: "VIT", color: "#22c55e", primaryGains: "Max health, health regen, damage reduction" },
  end: { id: "end", name: "Endurance", abbr: "END", color: "#6b7280", primaryGains: "Stamina, physical defense, block, armor" },
  dex: { id: "dex", name: "Dexterity", abbr: "DEX", color: "#f59e0b", primaryGains: "Crit chance, attack speed, accuracy, evasion" },
  agi: { id: "agi", name: "Agility",   abbr: "AGI", color: "#06b6d4", primaryGains: "Movement speed, evasion, dodge, crit evasion" },
  int: { id: "int", name: "Intellect", abbr: "INT", color: "#3b82f6", primaryGains: "Mana, magic damage, cooldown reduction" },
  wis: { id: "wis", name: "Wisdom",    abbr: "WIS", color: "#a855f7", primaryGains: "Magic resistance, mana, spell block" },
  tac: { id: "tac", name: "Tactics",   abbr: "TAC", color: "#64748b", primaryGains: "Armor pen, block pen, % bonus to all stats" },
};

/** Progression: 20 starting + 7 per level, max level 20 = 160 total */
export const ATTRIBUTE_PROGRESSION = {
  startingPoints: 20,
  pointsPerLevel: 7,
  maxLevel: 20,
  maxPoints: 160,
  /** Diminishing returns: full 0-25, 50% 26-50, 25% 51+ */
  diminishingBreakpoints: [25, 50],
} as const;

// ═══════════════════════════════════════════════════════════════
// HERO UNIT SYSTEM
// ═══════════════════════════════════════════════════════════════

/** Units become heroes at level 100 */
export const UNIT_HERO_LEVEL = 100;

/** Unit max level for player characters */
export const PLAYER_MAX_LEVEL = 20;

// ═══════════════════════════════════════════════════════════════
// UNIT ROLES (RTS island management)
// ═══════════════════════════════════════════════════════════════

export type UnitRole =
  | "guard"       // defend structures, patrol
  | "gunner"      // ranged defense
  | "worker"      // auto-harvest resources
  | "sailor"      // ship crew
  | "builder"     // construct/repair buildings
  | "crafter"     // auto-craft items at stations
  | "scout"       // patrol wide area, report enemies
  | "merchant"    // auto-trade at docks
  | "healer"      // heal garrison units
  | "commander";  // boost nearby unit stats

export interface UnitRoleConfig {
  role: UnitRole;
  hp: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  recruitCost: { gold: number; food?: number };
  aiTasks: string[];
}

export const UNIT_ROLES: Record<UnitRole, UnitRoleConfig> = {
  guard:     { role: "guard",     hp: 60,  damage: 8,  attackRange: 1.5, attackCooldownMs: 1200, recruitCost: { gold: 50,  food: 10 }, aiTasks: ["patrol", "defend_structure", "chase_intruder"] },
  gunner:    { role: "gunner",    hp: 40,  damage: 12, attackRange: 5.0, attackCooldownMs: 2000, recruitCost: { gold: 80,  food: 15 }, aiTasks: ["man_tower", "ranged_defense", "fire_at_ships"] },
  worker:    { role: "worker",    hp: 35,  damage: 3,  attackRange: 1.0, attackCooldownMs: 1500, recruitCost: { gold: 30,  food: 5  }, aiTasks: ["harvest_wood", "harvest_stone", "harvest_ore", "harvest_fish", "carry_to_storage"] },
  sailor:    { role: "sailor",    hp: 50,  damage: 6,  attackRange: 1.5, attackCooldownMs: 1400, recruitCost: { gold: 40,  food: 8  }, aiTasks: ["crew_ship", "navigate", "board_enemy", "repair_ship"] },
  builder:   { role: "builder",   hp: 45,  damage: 4,  attackRange: 1.0, attackCooldownMs: 1800, recruitCost: { gold: 60,  food: 10 }, aiTasks: ["build_wall", "build_tower", "repair_structure", "upgrade_structure"] },
  crafter:   { role: "crafter",   hp: 30,  damage: 2,  attackRange: 1.0, attackCooldownMs: 2000, recruitCost: { gold: 70,  food: 8  }, aiTasks: ["craft_weapons", "craft_armor", "craft_potions", "craft_ammo"] },
  scout:     { role: "scout",     hp: 35,  damage: 5,  attackRange: 3.0, attackCooldownMs: 1600, recruitCost: { gold: 45,  food: 6  }, aiTasks: ["patrol_perimeter", "report_enemy", "stealth_recon", "mark_target"] },
  merchant:  { role: "merchant",  hp: 25,  damage: 1,  attackRange: 1.0, attackCooldownMs: 3000, recruitCost: { gold: 100, food: 5  }, aiTasks: ["trade_at_dock", "buy_resources", "sell_surplus", "negotiate_price"] },
  healer:    { role: "healer",    hp: 40,  damage: 2,  attackRange: 4.0, attackCooldownMs: 2500, recruitCost: { gold: 90,  food: 12 }, aiTasks: ["heal_garrison", "cure_debuff", "buff_allies", "triage_wounded"] },
  commander: { role: "commander", hp: 80,  damage: 10, attackRange: 2.0, attackCooldownMs: 1500, recruitCost: { gold: 150, food: 20 }, aiTasks: ["boost_morale", "coordinate_defense", "rally_troops", "lead_charge"] },
};

// ═══════════════════════════════════════════════════════════════
// SECTOR MAP — THE 9 ZONES (lore-named)
// ═══════════════════════════════════════════════════════════════

export type SectorPosition = "NW" | "N" | "NE" | "W" | "CENTER" | "E" | "SW" | "S" | "SE";

export interface SectorLore {
  position: SectorPosition;
  name: string;
  subtitle: string;
  biome: string;
  difficulty: number;
  description: string;
  controllingFaction: FactionId | null;  // starting control, null = contested
  hasVendors: boolean;
  hasDockyards: boolean;
  specialFeatures: string[];
}

/** Legacy grid keys NW…SE aligned to warlords zone display names (SSOT play ids in warlords-zones.json). */
export const SECTOR_LORE: Record<SectorPosition, SectorLore> = {
  NW: {
    position: "NW", name: "Ethereal Falls", subtitle: "Where Reality Thins",
    biome: "ethereal", difficulty: 6,
    description:
      "Map top-left. SE shelf is playable cold-ethereal; NW half is diagonally cut — water lifts and islands drift into the Cosmic Waterfall tip. Ships do not return. Crusade cold front. Flight still works.",
    controllingFaction: "crusade", hasVendors: true, hasDockyards: false,
    specialFeatures: [
      "ethereal_cascade",
      "cosmic_waterfall",
      "destruction_half",
      "ship_no_return",
      "void_death_drops",
      "ally_perma_death",
      "flight_exempt_physics",
      "spirit_shoals",
      "reality_fractures",
    ],
  },
  N: {
    position: "N", name: "Frostbite Expanse", subtitle: "The Silent White",
    biome: "frozen", difficulty: 5,
    description:
      "Primary frozen biome — ice kit, arctic scene, dwarf model kit. Fabled capital; Crusade cold war parties patrol the western approaches.",
    controllingFaction: "fabled", hasVendors: true, hasDockyards: false,
    specialFeatures: ["glaciers", "omni_shrines", "frost_beasts", "ice_bridges", "dwarf_modelkit", "arctic_scene"],
  },
  NE: {
    position: "NE", name: "Thornwood Wilds", subtitle: "Roof of the Canopy",
    biome: "forest", difficulty: 7,
    description: "Ancient forest so dense sunlight dies in the leaves. Hidden mountain city and Worge hunting grounds.",
    controllingFaction: null, hasVendors: false, hasDockyards: false,
    specialFeatures: ["hidden_mountain_city", "worge_packs", "poison_thorns", "vertical_canopy"],
  },
  W: {
    position: "W", name: "Stormbreak Reef", subtitle: "Frozen Storm Shelf",
    biome: "storm", difficulty: 4,
    description:
      "Left-middle western cold band — ice reefs under perpetual sleet-storm. Crusade cold patrols and dockyards between thunder and frost.",
    controllingFaction: "crusade", hasVendors: true, hasDockyards: true,
    specialFeatures: [
      "warship_construction",
      "lightning_reefs",
      "ice_shelf",
      "crusade_cold_patrol",
      "trade_hub",
      "smuggler_docks",
    ],
  },
  CENTER: {
    position: "CENTER", name: "Convergence Nexus", subtitle: "Racalvin's Domain",
    biome: "nexus", difficulty: 1,
    description: "Heart of the open waters — Pirate King docks, Arena, faction embassies, and merchant guilds. All roads (and sea lanes) meet here.",
    controllingFaction: null, hasVendors: true, hasDockyards: true,
    specialFeatures: ["pirate_king_throne", "arena", "faction_hqs", "merchant_guild", "neutral_docks", "tavern"],
  },
  E: {
    position: "E", name: "Ashen Wastes", subtitle: "Graveyard of Ships and Cities",
    biome: "desert", difficulty: 6,
    description: "Wreckage fields and ash flats. Scavengers and bandits pick dead fleets while Legion scouts mark new claims.",
    controllingFaction: null, hasVendors: false, hasDockyards: false,
    specialFeatures: ["salvage_nodes", "bandit_camps", "hidden_caches", "wreck_dungeons"],
  },
  SW: {
    position: "SW", name: "Abyssal Trench", subtitle: "Where the Sea Reclaims",
    biome: "abyssal", difficulty: 5,
    description:
      "Bottom-left deep. Undead Legion rites in the trench; northern ice-rim freezes wrecks where the western cold band meets the abyss.",
    controllingFaction: "legion", hasVendors: false, hasDockyards: false,
    specialFeatures: [
      "underwater_temples",
      "undead_patrols",
      "flooded_dungeons",
      "tide_gates",
      "ice_rim",
      "western_cold_band",
    ],
  },
  S: {
    position: "S", name: "Haven Shore", subtitle: "Safe Harbor & Trade",
    biome: "tropical", difficulty: 2,
    description: "Starter trade coast and Fruzer foundation village. Soft landing for new captains — still watched by Legion smoke on the southern horizon.",
    controllingFaction: null, hasVendors: true, hasDockyards: true,
    specialFeatures: ["haven_port", "starter_docks", "trade_village", "tutorial_links"],
  },
  SE: {
    position: "SE", name: "Ember Depths", subtitle: "The Eternal Battlefield",
    biome: "volcanic", difficulty: 9,
    description: "Endgame contested caldera. Factions clash over the Shattered Nexus; claim flags change under ash and fire.",
    controllingFaction: null, hasVendors: false, hasDockyards: false,
    specialFeatures: ["shattered_nexus", "faction_siege", "claim_wars", "world_boss_spawns", "relic_drops"],
  },
};

// ═══════════════════════════════════════════════════════════════
// ISLAND & CLAIM SYSTEM
// ═══════════════════════════════════════════════════════════════

export const ISLAND_CONFIG = {
  /** Home islands are private, 1 per account, max 4 players (owner + 3) */
  homeIslandMaxVisitors: 3,
  /** Claim flags in world sectors are real ownership */
  claimFlagCaptureTimeMs: 30_000,    // 30 seconds to capture
  claimFlagContestRadiusUnits: 200,  // PvP radius around flag
  /** Islands in sectors can rise and sink */
  islandRiseCycleMs: 24 * 60 * 60 * 1000, // 24 hours
  /** Structures on claimed islands auto-function */
  autoHarvestIntervalMs: 60_000,     // workers harvest every 60s
  autoDefenseCheckMs: 5_000,         // guards check for enemies every 5s
} as const;

// ═══════════════════════════════════════════════════════════════
// THE COSMIC WATERFALL / ETHEREAL FALLS
// ═══════════════════════════════════════════════════════════════

export const WATERFALL_CONFIG = {
  /** The Waterfall is Madra's domain expanding — consumes islands at the edge */
  description: "A void of pure entropy at the edge of existence that slowly consumes islands.",
  /** Closer to Waterfall = stronger magic but more danger */
  magicScalingPerSector: 0.15,  // +15% magic power per sector closer to edge
  /** Sector difficulty increases near Waterfall (SE, S, NE are closest) */
  waterfallProximitySectors: ["SE", "S", "NE"] as SectorPosition[],
  /** Falls of Eternity — periodic zone resets */
  fallsOfEternityIntervalMs: 7 * 24 * 60 * 60 * 1000, // weekly
} as const;

// ═══════════════════════════════════════════════════════════════
// OCEAN SYSTEM — SSOT: gameClock.ts (6h day · 8-day week · 2 tides/day)
// ═══════════════════════════════════════════════════════════════

export {
  OCEAN_CONFIG,
  TIDE_CONFIG,
  GAME_CLOCK,
  getTideHeight,
  getTidePhase,
  getGameTimeOfDay,
  getGameClockSnapshot,
  DAY_NIGHT_DEFAULTS,
} from './gameClock';

// ═══════════════════════════════════════════════════════════════
// HERO ROSTER (the 24 canonical heroes)
// Full profiles / dialogues / quests: heroCodex.ts → HERO_CODEX_WITH_LEGENDS
// ═══════════════════════════════════════════════════════════════

export interface HeroDefinition {
  id: string;
  name: string;
  title: string;
  factionId: FactionId;
  raceId: RaceId | "barbarian"; // barbarians are human sub-race in Crusade
  classId: ClassId | "worges" | "ranger" | "necromancer" | "shaman";
  level: number;
  sectorSpawn: SectorPosition;  // which sector this hero NPC spawns in
  isQuestGiver: boolean;
}

/**
 * Canonical 24 — display names are First Last (no single-token mononyms).
 * Titles remain epithets (The Radiant, Skullcrusher, …).
 */
export const HERO_ROSTER: HeroDefinition[] = [
  // ── THE CRUSADE (8 heroes) ──────────────────────────────────
  { id: "aurion",  name: "Aurion Solbrand",    title: "The Radiant",       factionId: "crusade", raceId: "human",     classId: "mage",    level: 50, sectorSpawn: "NW",     isQuestGiver: true },
  { id: "sigurd",  name: "Sigurd Ironcrown",   title: "The Unbreakable",   factionId: "crusade", raceId: "human",     classId: "warrior", level: 55, sectorSpawn: "N",      isQuestGiver: true },
  { id: "kael",    name: "Kael Nightwhisper",  title: "The Shadowblade",   factionId: "crusade", raceId: "human",     classId: "ranger",  level: 48, sectorSpawn: "W",      isQuestGiver: true },
  { id: "theron",  name: "Theron Greyclaw",    title: "Wildkin",           factionId: "crusade", raceId: "human",     classId: "worges",  level: 45, sectorSpawn: "NW",     isQuestGiver: true },
  { id: "thrax",   name: "Thrax Bloodmaw",     title: "The Savage",        factionId: "crusade", raceId: "barbarian", classId: "warrior", level: 52, sectorSpawn: "CENTER", isQuestGiver: true },
  { id: "grok",    name: "Grok Stormhowl",     title: "Spiritcaller",      factionId: "crusade", raceId: "barbarian", classId: "shaman",  level: 47, sectorSpawn: "N",      isQuestGiver: true },
  { id: "kira",    name: "Kira Redfang",       title: "The Fang",          factionId: "crusade", raceId: "barbarian", classId: "worges",  level: 52, sectorSpawn: "NE",     isQuestGiver: true },
  { id: "vox",     name: "Vox Skysplit",       title: "Skyhunter",         factionId: "crusade", raceId: "barbarian", classId: "ranger",  level: 48, sectorSpawn: "E",      isQuestGiver: true },

  // ── THE LEGION (8 heroes) ───────────────────────────────────
  { id: "gruk",     name: "Gruk Blacktusk",    title: "Skullcrusher",    factionId: "legion", raceId: "orc",    classId: "warrior",     level: 58, sectorSpawn: "S",  isQuestGiver: true },
  { id: "nazgrim",  name: "Nazgrim Voidhand",  title: "The Profane",     factionId: "legion", raceId: "orc",    classId: "necromancer", level: 53, sectorSpawn: "SW", isQuestGiver: true },
  { id: "vexol",    name: "Vexol Quietblade",  title: "The Silent",      factionId: "legion", raceId: "orc",    classId: "ranger",      level: 48, sectorSpawn: "SE", isQuestGiver: true },
  { id: "morgash",  name: "Morgash Ashborn",   title: "The Flamecaller", factionId: "legion", raceId: "orc",    classId: "mage",        level: 50, sectorSpawn: "S",  isQuestGiver: true },
  { id: "silesh",   name: "Silesh Dreadmire",  title: "The Dread",       factionId: "legion", raceId: "undead", classId: "mage",        level: 55, sectorSpawn: "SW", isQuestGiver: true },
  { id: "bone",     name: "Bone Rattlebone",   title: "The Collector",   factionId: "legion", raceId: "undead", classId: "warrior",     level: 50, sectorSpawn: "SE", isQuestGiver: true },
  { id: "whisper",  name: "Whisper Pale",      title: "The Hollow",      factionId: "legion", raceId: "undead", classId: "rogue",       level: 47, sectorSpawn: "E",  isQuestGiver: true },
  { id: "dredge",   name: "Dredge Gravewake",  title: "The Risen",       factionId: "legion", raceId: "undead", classId: "cleric",      level: 45, sectorSpawn: "SW", isQuestGiver: true },

  // ── THE FABLED (8 heroes) ───────────────────────────────────
  { id: "aelindor",  name: "Aelindor Swiftwind",  title: "The Swift",       factionId: "fabled", raceId: "elf",   classId: "warrior", level: 50, sectorSpawn: "N",      isQuestGiver: true },
  { id: "silvaine",  name: "Silvaine Moonsong",   title: "Starwhisper",     factionId: "fabled", raceId: "elf",   classId: "mage",    level: 52, sectorSpawn: "NE",     isQuestGiver: true },
  { id: "lyra",      name: "Lyra Threadweaver",   title: "The Weaver",      factionId: "fabled", raceId: "elf",   classId: "cleric",  level: 48, sectorSpawn: "CENTER", isQuestGiver: true },
  { id: "fenwick",   name: "Fenwick Darkbough",   title: "Shadowleaf",      factionId: "fabled", raceId: "elf",   classId: "rogue",   level: 46, sectorSpawn: "W",      isQuestGiver: true },
  { id: "durgin",    name: "Durgin Stonefist",    title: "Ironheart",       factionId: "fabled", raceId: "dwarf", classId: "warrior", level: 55, sectorSpawn: "NE",     isQuestGiver: true },
  { id: "brenna",    name: "Brenna Forgehammer",  title: "The Forgemaster", factionId: "fabled", raceId: "dwarf", classId: "warrior", level: 50, sectorSpawn: "W",      isQuestGiver: true },
  { id: "thordak",   name: "Thordak Runebinder",  title: "Runekeeper",      factionId: "fabled", raceId: "dwarf", classId: "mage",    level: 48, sectorSpawn: "N",      isQuestGiver: true },
  { id: "helga",     name: "Helga Hearthhand",    title: "The Mender",      factionId: "fabled", raceId: "dwarf", classId: "cleric",  level: 45, sectorSpawn: "CENTER", isQuestGiver: true },
];

/** Get heroes that spawn in a specific sector */
export function getHeroesForSector(sector: SectorPosition): HeroDefinition[] {
  return HERO_ROSTER.filter(h => h.sectorSpawn === sector);
}

/** Get heroes by faction */
export function getHeroesByFaction(faction: FactionId): HeroDefinition[] {
  return HERO_ROSTER.filter(h => h.factionId === faction);
}

// ═══════════════════════════════════════════════════════════════
// TUTORIAL (Shipwreck Island)
// ═══════════════════════════════════════════════════════════════

export const TUTORIAL_CONFIG = {
  steps: [
    { id: "intro_video",    title: "Intro Cinematic",         description: "Watch the opening cinematic — your ship is destroyed in a storm" },
    { id: "wash_ashore",    title: "Wash Ashore",             description: "Wake up on Shipwreck Island beach" },
    { id: "gather_wood",    title: "Gather Resources",        description: "Harvest 10 wood and 5 stone from the wreckage" },
    { id: "craft_axe",      title: "Craft Your First Tool",   description: "Craft a stone axe at the makeshift workbench" },
    { id: "fight_crabs",    title: "First Combat",            description: "Defeat 3 shore crabs threatening the camp" },
    { id: "build_shelter",  title: "Build a Shelter",         description: "Place walls and a roof to create a basic shelter" },
    { id: "find_npc",       title: "Find the Castaway",       description: "Discover an NPC survivor who teaches advanced crafting" },
    { id: "craft_sword",    title: "Forge a Weapon",          description: "Craft an iron sword at the castaway's forge" },
    { id: "defeat_boss",    title: "Clear the Island",        description: "Defeat the Shipwreck Brute guarding the lumber supply" },
    { id: "build_raft",     title: "Build Your Raft",         description: "Construct a raft at the beach dock — your ticket out" },
    { id: "sail_off",       title: "Set Sail",                description: "Launch from Shipwreck Island — cutscene to Home Island" },
  ],
  enemies: [
    { type: "shore_crab",      hp: 20,  damage: 3,  level: 1 },
    { type: "stranded_pirate", hp: 40,  damage: 6,  level: 2 },
    { type: "shipwreck_brute", hp: 120, damage: 12, level: 3 },  // mini-boss
  ],
} as const;

// ═══════════════════════════════════════════════════════════════
// DUNGEONS (cave instances on random islands)
// ═══════════════════════════════════════════════════════════════

export type DungeonType = "cave" | "ruins" | "vault" | "abyss";

export interface DungeonDefinition {
  id: string;
  type: DungeonType;
  name: string;
  description: string;
  minLevel: number;
  maxPlayers: number;
  floors: number;
  bossId: string;
  bossName: string;
  bossHp: number;
  /** Enemy types that spawn inside this dungeon */
  enemyTypes: string[];
  /** Loot theme affects drop tables */
  lootTheme: "weapons" | "armor" | "relics" | "gold" | "mixed";
  /** Which sectors this dungeon type can spawn in (null = any) */
  allowedSectors: SectorPosition[] | null;
  /** Faction affinity — enemies match this faction's theme */
  factionAffinity: FactionId | null;
  /** Asset path for the cave entrance model */
  entranceModel: string;
}

export const DUNGEON_DEFINITIONS: DungeonDefinition[] = [
  // ── Cave tier (easy, levels 1-5) ──────────────────────────────
  {
    id: "cave_crabs", type: "cave", name: "Crab Hollow",
    description: "A shallow sea cave infested with giant shore crabs and their broodmother.",
    minLevel: 1, maxPlayers: 4, floors: 1, bossId: "broodmother_crab", bossName: "Broodmother Chelura", bossHp: 300,
    enemyTypes: ["shore_crab", "sand_lurker", "tide_crawler"],
    lootTheme: "mixed", allowedSectors: ["NW", "W", "CENTER", "SW"], factionAffinity: null,
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
  {
    id: "cave_bandits", type: "cave", name: "Smuggler's Grotto",
    description: "A network of tunnels used by pirate smugglers. Their captain guards the loot vault.",
    minLevel: 3, maxPlayers: 4, floors: 2, bossId: "smuggler_captain", bossName: "Captain Blacktide", bossHp: 500,
    enemyTypes: ["pirate_thug", "cutlass_raider", "powder_monkey"],
    lootTheme: "gold", allowedSectors: ["CENTER", "E", "W"], factionAffinity: null,
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
  // ── Ruins tier (mid, levels 5-10) ─────────────────────────────
  {
    id: "ruins_crusade", type: "ruins", name: "Sunken Bastion",
    description: "Flooded Crusade fortress overrun by corrupted soldiers. Their undead general commands from the throne room.",
    minLevel: 5, maxPlayers: 4, floors: 3, bossId: "undead_general", bossName: "General Aldric the Fallen", bossHp: 800,
    enemyTypes: ["undead_soldier", "corrupted_knight", "ghost_archer"],
    lootTheme: "armor", allowedSectors: ["N", "NW", "W"], factionAffinity: "crusade",
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
  {
    id: "ruins_legion", type: "ruins", name: "Ash Forge",
    description: "An active volcanic forge where the Legion creates lava-born war machines. The Forgemaster must be stopped.",
    minLevel: 7, maxPlayers: 4, floors: 3, bossId: "forgemaster", bossName: "Forgemaster Molkoth", bossHp: 1200,
    enemyTypes: ["ash_sorcerer", "lava_golem", "ember_hound", "slag_warrior"],
    lootTheme: "weapons", allowedSectors: ["S", "SW", "SE"], factionAffinity: "legion",
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
  // ── Vault tier (hard, levels 10-15) ────────────────────────────
  {
    id: "vault_omni", type: "vault", name: "Vault of Echoes",
    description: "An ancient Fabled temple sealed by The Omni. The crystallized memories inside have become hostile.",
    minLevel: 10, maxPlayers: 4, floors: 4, bossId: "memory_warden", bossName: "Warden of Lost Thoughts", bossHp: 2000,
    enemyTypes: ["crystal_spider", "echo_wraith", "memory_golem", "thought_parasite"],
    lootTheme: "relics", allowedSectors: ["N", "NE"], factionAffinity: "fabled",
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
  {
    id: "vault_madra", type: "vault", name: "Madra's Womb",
    description: "A pulsing cavity at the edge of the Waterfall where Madra births her newest creations. Pure chaos reigns.",
    minLevel: 12, maxPlayers: 4, floors: 5, bossId: "chaos_spawn", bossName: "The Unborn", bossHp: 3000,
    enemyTypes: ["void_wraith", "chaos_imp", "entropy_beast", "flesh_horror"],
    lootTheme: "relics", allowedSectors: ["S", "SE"], factionAffinity: "legion",
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
  // ── Abyss tier (endgame, levels 15-20) ─────────────────────────
  {
    id: "abyss_waterfall", type: "abyss", name: "The Abyssal Maw",
    description: "A rift into the Cosmic Waterfall itself. Reality fractures. Time loops. The Void King waits at the bottom.",
    minLevel: 15, maxPlayers: 4, floors: 7, bossId: "void_king", bossName: "Xul'tharak, Void King", bossHp: 5000,
    enemyTypes: ["void_wraith", "reality_shard", "time_echo", "entropy_titan"],
    lootTheme: "relics", allowedSectors: ["SE"], factionAffinity: null,
    entranceModel: "/models/evil_rock_mountains_triad.glb",
  },
];

/** Dungeon spawn config for islands */
export const DUNGEON_SPAWN_CONFIG = {
  /** Max dungeon portals per sector */
  maxPerSector: 3,
  /** Min respawn time after dungeon is cleared (ms) */
  minRespawnMs: 30 * 60 * 1000,   // 30 minutes
  /** Max respawn time (ms) — actual is random between min and max */
  maxRespawnMs: 4 * 60 * 60 * 1000, // 4 hours
  /** Chance of a dungeon spawning on any given island (0-1) */
  spawnChancePerIsland: 0.15,
  /** Entrance model scale to fit player walking into caves */
  entranceScale: { x: 0.08, y: 0.08, z: 0.08 },
  /** Portal swirl animation config */
  portalSwirl: {
    color: 0x8844ff,
    secondaryColor: 0x22ccff,
    radius: 3.0,
    speed: 2.0,
    particleCount: 120,
    interactionRange: 5.0,  // units — player must be within this to press E
  },
} as const;

/** Pick a random dungeon valid for a sector and difficulty */
export function pickDungeonForSector(
  sectorId: SectorPosition,
  sectorDifficulty: number,
): DungeonDefinition | null {
  const eligible = DUNGEON_DEFINITIONS.filter(d => {
    if (d.allowedSectors && !d.allowedSectors.includes(sectorId)) return false;
    if (d.minLevel > sectorDifficulty * 2) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/** Calculate a random respawn time */
export function randomDungeonRespawnMs(): number {
  const { minRespawnMs, maxRespawnMs } = DUNGEON_SPAWN_CONFIG;
  return minRespawnMs + Math.random() * (maxRespawnMs - minRespawnMs);
}

// ═══════════════════════════════════════════════════════════════
// CITIES & LOCATIONS (from cities.js)
// ═══════════════════════════════════════════════════════════════

export const WORLD_CITIES = [
  { id: "greenhollow",  name: "Camp",           sector: "CENTER" as SectorPosition, unlockLevel: 0 },
  { id: "ironkeep",     name: "Ironkeep",       sector: "NE"     as SectorPosition, unlockLevel: 6 },
  { id: "shadowhaven",  name: "Shadowhaven",    sector: "E"      as SectorPosition, unlockLevel: 11 },
  { id: "emberpeak",    name: "Emberpeak",      sector: "S"      as SectorPosition, unlockLevel: 8 },
  { id: "crystalspire", name: "Crystal Spire",  sector: "N"      as SectorPosition, unlockLevel: 13 },
] as const;
