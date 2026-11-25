/**
 * Production game deployment map — grudgewarlords.com/home → fleet satellites.
 * Import from @shared/fleet; do not hardcode game URLs in pages.
 *
 * Canonical **Three.js deploy path** (primary play surface):
 *   leviathan cinema → shipwreck tutorial (once) → home island →
 *   world map → open world zone → optional sail / PvP
 * See docs/GAME_FLOW_SSOT.md · docs/THREE_DEPLOY.md
 */
import { FLEET_URLS } from "./manifest";
import { warlordsPlayUrl } from "./warlordsDomains";

/** External fleet origins that accept ?sso_token= from navigateToGame(). */
export const FLEET_GAME_ORIGINS = {
  "tactical-infinity": "https://water.grudge-studio.com",
  "rts-grudge": "https://rts-grudge.vercel.app",
  forge: "https://forge.grudge-studio.com",
  "three-port": FLEET_URLS.threePort,
  dcq: "https://dcq.grudge-studio.com",
  survival: FLEET_URLS.survival,
  grudges: FLEET_URLS.grudges,
  /** Prefer short host; grudge-arena.grudge-studio.com remains a valid alias. */
  arena: "https://arena.grudge-studio.com",
  drive: "https://drive.grudge-studio.com",
  /** Grudge Open — combat/studio platform with full Grudge ID SSO. */
  gameopen: FLEET_URLS.gameopen,
  /** Warlords play SPA brand host (play.grudgewarlords.com) — same deploy as apex */
  play: "https://play.grudgewarlords.com",
  /** Mine-Loader / Voxel Realms + Codex */
  "mine-loader": FLEET_URLS.mineLoader,
  voxgrudge: FLEET_URLS.voxgrudge,
  /**
   * Game Studio Tool / Grudge Islands — portal path product.
   * SSO return: https://grudge-studio.com/gst/auth/callback (host allowlisted via grudge-studio.com).
   * Same Railway account/characters as all fleet games (app=gst on id.grudge-studio.com).
   */
  gst: "https://grudge-studio.com/gst",
  /** Warlords procedural crawl — same Railway characters, no new bag. */
  dungeon: "https://grudge-dungeons.vercel.app",
} as const;

// ── Three.js deploy path (ONE TRUTH entry URLs) ─────────────────────────────

/** Personal 1024m home island — Island3DEngine home-island mode */
export const THREE_HOME_ISLAND_PATH = "/home-island" as const;

/** Unity-style world map hub — 9 sectors + 6 race capitals + sail */
export const THREE_WORLD_MAP_PATH = "/world-map" as const;

/** Shared open world — Island3DEngine zone mode, starter sector Haven Shore (human capital) */
export const THREE_OPEN_WORLD_PATH =
  "/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port" as const;

/** Ember Spire explore pin — volcanic sector feature (fleet play matrix) */
export const THREE_EMBER_SPIRE_PATH =
  "/play?sector=ember_depths&mode=zone&worldSeed=grudge-world-1&feature=ember_spire" as const;

/** Lightweight satellite Three MMO client (same sectors / Colyseus) */
export const THREE_PORT_PLAY_URL = `${FLEET_URLS.threePort}?mode=play&sector=haven_shore&worldSeed=grudge-world-1`;

/** Ordered primary path for Play / onboarding (Three.js first) */
export const THREE_DEPLOY_PATH_IDS = [
  "leviathan",
  "tutorial",
  "homeisland",
  "worldmap",
  "play",
  "ocean",
  "tactical",
  "rtsgrudge",
] as const;

export function threeHomeIslandUrl(opts?: {
  characterId?: string;
  islandId?: string;
  absolute?: boolean;
}): string {
  if (opts?.absolute || opts?.characterId || opts?.islandId) {
    return warlordsPlayUrl(THREE_HOME_ISLAND_PATH, {
      characterId: opts?.characterId,
      islandId: opts?.islandId,
    });
  }
  return THREE_HOME_ISLAND_PATH;
}

export function threeOpenWorldUrl(opts?: {
  sector?: string;
  worldSeed?: string;
  city?: string;
}): string {
  const sector = opts?.sector || "haven_shore";
  const worldSeed = opts?.worldSeed || "grudge-world-1";
  const params = new URLSearchParams({
    sector,
    mode: "zone",
    worldSeed,
  });
  if (opts?.city) params.set("city", opts.city);
  else if (sector === "haven_shore") params.set("city", "haven_port");
  return `/play?${params.toString()}`;
}

export type FleetGameId = keyof typeof FLEET_GAME_ORIGINS;

export type DeploymentStage =
  | "onboard"
  | "home"
  | "sail"
  | "sector"
  | "rts"
  | "craft";

export interface GameDeployment {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** Same-origin path or absolute fleet URL */
  url: string;
  icon: string;
  tier: "core" | "combat" | "explore" | "craft";
  badge: string;
  badgeColor: string;
  stage: DeploymentStage;
  /** When set, navigateToGame attaches SSO for this fleet origin */
  fleetGameId?: FleetGameId;
  featured?: boolean;
  order: number;
}

/**
 * Recommended Three.js path (shown on /home):
 * intro → create → leviathan → tutorial → home island → world map → open world
 * SSOT: shared/definitions/warlordsProductionFlow.ts
 */
export const PRODUCTION_DEPLOYMENT_PATH: GameDeployment[] = [
  {
    id: "warlords-pipeline",
    title: "Warlords Start",
    subtitle: "Full production pipeline · tutorial then home island",
    description:
      "Intro → create → leviathan cinema → shipwreck tutorial (once) → home island (no L20 gate) → open world.",
    url: "/warlords/start",
    icon: "flame",
    tier: "core",
    badge: "Path",
    badgeColor: "amber",
    stage: "onboard",
    featured: true,
    order: 5,
  },
  {
    id: "leviathan",
    title: "First Voyage",
    subtitle: "Leviathan · ship destroy · wash-up",
    description:
      "Required once per account. Leviathan ocean cinema, then pirate-islands shipwreck tutorial.",
    url: "/leviathan-cinema",
    icon: "flame",
    tier: "core",
    badge: "Once",
    badgeColor: "amber",
    stage: "onboard",
    featured: true,
    order: 8,
  },
  {
    id: "tutorial",
    title: "Shipwreck Adventure",
    subtitle: "Solo · Pirate Island · Not Multiplayer Lobby",
    description:
      "Solo Colyseus tutorial: wash-up → harvest → T0 tools → raft → faction commander. Unlocks home island.",
    url: "/tutorial?map=pirate-islands",
    icon: "flame",
    tier: "core",
    badge: "Start",
    badgeColor: "amber",
    stage: "onboard",
    featured: true,
    order: 10,
  },
  {
    id: "homeisland",
    title: "Home Island 3D",
    subtitle: "After tutorial · account island · visitors",
    description:
      "Personal 1024m island after the first voyage. No level-20 gate. Colyseus home_island keyed by account.",
    url: "/home-island",
    icon: "leaf",
    tier: "core",
    badge: "Base",
    badgeColor: "emerald",
    stage: "home",
    featured: true,
    order: 20,
  },
  {
    id: "worldmap",
    title: "World Map",
    subtitle: "6 Race Cities · 9 Sectors · Sail",
    description:
      "Unity-style Warlords map: pick a race capital, sail sectors, then land into Three.js open world with harvest + dungeon portals.",
    url: THREE_WORLD_MAP_PATH,
    icon: "map",
    tier: "explore",
    badge: "Hub",
    badgeColor: "teal",
    stage: "sail",
    featured: true,
    order: 30,
  },
  {
    id: "play",
    title: "Warlords Open World",
    subtitle: "Race Capitals · Harvest · Dungeons",
    description:
      "Shared MMO sectors (WORLD_SECTORS). Race city plazas, harvest nodes, and dungeon entrances. Default Haven Port (human capital).",
    url: THREE_OPEN_WORLD_PATH,
    icon: "globe",
    tier: "combat",
    badge: "Era 9",
    badgeColor: "violet",
    stage: "sector",
    featured: true,
    order: 40,
  },
  {
    id: "play-hub",
    title: "Warlords Play",
    subtitle: "play.grudgewarlords.com · game client",
    description:
      "Warlords era game client brand host (same SPA as grudgewarlords.com). Airship, home island, maps, zones. Not play.grudge.studio.",
    url: "https://play.grudgewarlords.com",
    icon: "swords",
    tier: "combat",
    badge: "Warlords",
    badgeColor: "cyan",
    stage: "sector",
    fleetGameId: "play",
    featured: true,
    order: 35,
  },
  {
    id: "ocean",
    title: "Warlords Ocean Sail",
    subtitle: "Same 9 Macro Sectors · In-Client",
    description:
      "In-client tactical ocean over the Warlords era map (haven_shore…ember_depths). Lands into /play zone mode. Not chicken-gun lobby, not home-block cells.",
    url: "/ocean?worldSeed=grudge-world-1",
    icon: "compass",
    tier: "explore",
    badge: "Era 9",
    badgeColor: "teal",
    stage: "sail",
    order: 50,
  },
  {
    id: "tactical",
    title: "Tactical Infinity",
    subtitle: "Captain · Raft · External Sail Client",
    description:
      "Production sail client (water.grudge-studio.com). View layer over Warlords era 9 macro sectors — not the personal home-block 3×3.",
    url: FLEET_GAME_ORIGINS["tactical-infinity"],
    icon: "anchor",
    tier: "explore",
    badge: "LIVE",
    badgeColor: "cyan",
    stage: "sail",
    fleetGameId: "tactical-infinity",
    order: 55,
  },
  {
    id: "rtsgrudge",
    title: "RTS / PvP Lobby",
    subtitle: "Pirate Map · Genesis Modes",
    description:
      "Warlords-only: Chicken Gun / PolygonPirates pirate-islands mesh (same opening + tutorial lobby map) + PvP modes (quick match, faction war, siege). Not GRUDOX, not Explorer, not an Open standalone game. Battlegrounds may open Warlord Genesis — not open-world sectors.",
    url: "/rts-grudge",
    icon: "shield",
    tier: "combat",
    badge: "PvP",
    badgeColor: "red",
    stage: "rts",
    featured: true,
    order: 60,
  },
];

/** Extra modes on /home beyond the ordered Three deploy path. */
const HOME_GAME_MODE_EXTRAS: GameDeployment[] = [
  {
    id: "character",
    title: "Hero Forge",
    subtitle: "Create & Manage Heroes",
    description: "Build heroes, allocate attributes, equip gear, and manage your roster.",
    url: "/character",
    icon: "user",
    tier: "core",
    badge: "Core",
    badgeColor: "amber",
    stage: "onboard",
    order: 5,
  },
  {
    id: "islands-hub",
    title: "Islands Hub",
    subtitle: "Map Family Console",
    description:
      "Route into home island, Warlords era open world, pirate lobby, arenas, or 2D island — without mixing map IDs.",
    url: "/islands",
    icon: "map",
    tier: "core",
    badge: "Hub",
    badgeColor: "lime",
    stage: "home",
    order: 25,
  },
  {
    id: "warlords3d",
    title: "Three Port (Satellite)",
    subtitle: "Lightweight sector client",
    description:
      "Satellite Three.js client (grudge-three-port) — same Haven Shore / Colyseus sectors. Primary play remains same-origin /home-island + /play.",
    url: THREE_PORT_PLAY_URL,
    icon: "globe",
    tier: "core",
    badge: "Alt",
    badgeColor: "violet",
    stage: "sector",
    fleetGameId: "three-port",
    order: 58,
  },
  {
    id: "genesis-pvp",
    title: "Warlord Genesis PvP",
    subtitle: "Battlegrounds Game Mode",
    description:
      "Dedicated PvP battlegrounds (Warlord Genesis). Open from in-game PvP UI / RTS modes — not open-world sector play.",
    url: "https://warlord-genesis.vercel.app",
    icon: "swords",
    tier: "combat",
    badge: "Genesis",
    badgeColor: "rose",
    stage: "rts",
    order: 62,
  },
  {
    id: "arena",
    title: "Grudge Arena",
    subtitle: "Instanced PvP Arena",
    description: "External Three.js arena shell. Separate from Warlords 9 sectors and home islands.",
    url: FLEET_GAME_ORIGINS.arena,
    icon: "skull",
    tier: "combat",
    badge: "Arena",
    badgeColor: "orange",
    stage: "rts",
    fleetGameId: "arena",
    order: 63,
  },
  {
    id: "forge",
    title: "Grudge Forge",
    subtitle: "RTS Map Editor",
    description: "R3F + Rapier map editor — publish structures; does not redefine Warlords sector SSOT.",
    url: FLEET_GAME_ORIGINS.forge,
    icon: "code",
    tier: "craft",
    badge: "Editor",
    badgeColor: "orange",
    stage: "rts",
    fleetGameId: "forge",
    order: 65,
  },
  {
    id: "gst",
    title: "Game Studio Tool",
    subtitle: "Grudge Islands · shared account",
    description:
      "Island RTS studio tool at grudge-studio.com/gst. Grudge ID app=gst; same Railway account bag + character roster as Warlords/Open.",
    url: FLEET_GAME_ORIGINS.gst,
    icon: "globe",
    tier: "explore",
    badge: "GST",
    badgeColor: "emerald",
    stage: "home",
    fleetGameId: "gst",
    order: 66,
  },
  {
    id: "island",
    title: "Island 2D",
    subtitle: "Auto-Harvest & Build",
    description: "Classic 2D island view with auto-harvest and structure bonuses.",
    url: "/island-v2",
    icon: "leaf",
    tier: "core",
    badge: "2D",
    badgeColor: "lime",
    stage: "home",
    order: 70,
  },
  {
    id: "crafting",
    title: "Warlord Crafting",
    subtitle: "Forge Weapons & Armor",
    description: "Craft weapons, armor, consumables using your profession skills.",
    url: "/craft/",
    icon: "hammer",
    tier: "craft",
    badge: "Craft",
    badgeColor: "orange",
    stage: "craft",
    order: 80,
  },
  {
    id: "combat",
    title: "Combat Arena",
    subtitle: "RPG Battle",
    description: "Turn-based combat with class skills, abilities, and party tactics.",
    url: "/combat",
    icon: "swords",
    tier: "combat",
    badge: "Battle",
    badgeColor: "slate",
    stage: "rts",
    order: 90,
  },
  {
    id: "dungeon",
    title: "Dungeon Crawler",
    subtitle: "Voxel Roguelike",
    description: "Procedural dungeons with enemies, loot, and boss fights.",
    url: "https://dcq.grudge-studio.com",
    icon: "skull",
    tier: "combat",
    badge: "DCQ",
    badgeColor: "zinc",
    stage: "sector",
    fleetGameId: "dcq",
    order: 100,
  },
  {
    id: "mine-loader",
    title: "Mine-Loader / Voxel Realms",
    subtitle: "Codex · Lobby · Seed Worlds",
    description:
      "Nexus voxel SSOT — 250-block Codex, procedural biomes, grid crafting, persistent multiplayer lobby. " +
      "All other voxel titles consume GET /api/blocks from Mine-Loader Railway (do not fork the catalog).",
    url: FLEET_URLS.mineLoader,
    icon: "cube",
    tier: "explore",
    badge: "Codex",
    badgeColor: "emerald",
    stage: "sector",
    fleetGameId: "mine-loader",
    featured: true,
    order: 36,
  },
  {
    id: "grudges-survival",
    title: "GRUDGES",
    subtitle: "Nexus Survival RTS-MMO",
    description:
      "Sci-fi survival a century after The Way sealed the elevators. Five factions, 6.4 km world, build/fight/trade. " +
      "Primary domain grudges.grudge-studio.com (alias survival.*).",
    url: FLEET_URLS.grudges,
    icon: "globe",
    tier: "explore",
    badge: "LIVE",
    badgeColor: "amber",
    stage: "sector",
    fleetGameId: "grudges",
    featured: true,
    order: 37,
  },
  {
    id: "voxgrudge",
    title: "VoxGrudge",
    subtitle: "Open-World Voxel",
    description:
      "Open-world voxel client. Placeable blocks use Mine-Loader Codex ids (cat:<slug>) — never a private block fork.",
    url: FLEET_URLS.voxgrudge,
    icon: "box",
    tier: "explore",
    badge: "Voxel",
    badgeColor: "cyan",
    stage: "sector",
    fleetGameId: "voxgrudge",
    order: 38,
  },
  {
    id: "professions",
    title: "Professions",
    subtitle: "Gathering & Crafting",
    description: "Level 1–100 gathering and crafting professions with tier unlocks.",
    url: "/professions",
    icon: "pickaxe",
    tier: "craft",
    badge: "Craft",
    badgeColor: "green",
    stage: "craft",
    order: 120,
  },
  {
    id: "skills",
    title: "Skill Trees",
    subtitle: "Class Abilities",
    description: "Class-specific skill trees — choose 1 skill per tier as you level.",
    url: "/skills",
    icon: "zap",
    tier: "craft",
    badge: "Skills",
    badgeColor: "blue",
    stage: "craft",
    order: 130,
  },
  {
    id: "harvest",
    title: "Harvest Mode",
    subtitle: "Live Gathering",
    description: "Send heroes to gather resources in real-time on your island.",
    url: "/harvest",
    icon: "leaf",
    tier: "craft",
    badge: "Gather",
    badgeColor: "lime",
    stage: "craft",
    order: 140,
  },
];

/** All playable modes on /home (deployment path + extras). World map lives in PRODUCTION path only. */
export const HOME_GAME_MODES: GameDeployment[] = [
  ...PRODUCTION_DEPLOYMENT_PATH,
  ...HOME_GAME_MODE_EXTRAS,
].sort((a, b) => a.order - b.order);

export function deploymentUrl(
  id: string,
  options?: { sector?: string; worldSeed?: string },
): string | undefined {
  const mode = HOME_GAME_MODES.find((m) => m.id === id);
  if (!mode) return undefined;
  if (id === "play") {
    return threeOpenWorldUrl({
      sector: options?.sector,
      worldSeed: options?.worldSeed,
    });
  }
  if (id === "homeisland") return THREE_HOME_ISLAND_PATH;
  if (id === "worldmap") return THREE_WORLD_MAP_PATH;
  if (id === "ocean" && options?.worldSeed) {
    return `/ocean?worldSeed=${encodeURIComponent(options.worldSeed)}`;
  }
  return mode.url;
}

/** Default destination after “Play Now” when the player already has a hero. */
export function threePlayNowPath(): string {
  return THREE_HOME_ISLAND_PATH;
}

// ── Warlords /home production surface (ONLY these actions) ─────────────────
// Funnel: roster → home island → ocean sail / world map → lobby / zones.
// Ocean is a first-class play surface (wind sailing over era 9), not lobby-only.

/** Pirate open-world lobby (center of era 9). */
export const WARLORDS_LOBBY_PATH =
  "/island-3d?mode=lobby&map=pirate-islands" as const;

/** Live Warlords crawl SPA — threejs-procedural-dungeon. No new host. */
export const WARLORDS_DUNGEON_ORIGIN = "https://grudge-dungeons.vercel.app";

/** Same 8-class roster the crawl SPA binds (`src/content/era/warlords.js`). */
export const DUNGEON_CLASS_IDS = [
  "mage",
  "priest",
  "warrior",
  "raider",
  "ranger",
  "thief",
  "worge",
  "verduror",
] as const;

export type DungeonClassId = (typeof DUNGEON_CLASS_IDS)[number];

export const DUNGEON_CLASS_LABEL: Record<DungeonClassId, string> = {
  mage: "Mage",
  priest: "Priest",
  warrior: "Warrior",
  raider: "Raider",
  ranger: "Ranger",
  thief: "Thief",
  worge: "Worge",
  verduror: "Verduror",
};

/** Faction table the crawl uses for AI kit fill (dwarf = Fabled). */
const DUNGEON_RACE_FACTION: Record<string, string> = {
  human: "crusade",
  barbarian: "crusade",
  elf: "fabled",
  dwarf: "fabled",
  orc: "legion",
  undead: "legion",
};

const DUNGEON_RACE_IDS = Object.keys(DUNGEON_RACE_FACTION);

/** 3 AI classes so a 4-man stays tank / healer / dps / peel. Same as crawl `DUNGEON_FILL`. */
export const DUNGEON_FILL: Record<string, [DungeonClassId, DungeonClassId, DungeonClassId]> = {
  warrior: ["priest", "ranger", "thief"],
  raider: ["verduror", "mage", "thief"],
  priest: ["warrior", "ranger", "thief"],
  verduror: ["raider", "mage", "ranger"],
  mage: ["warrior", "priest", "ranger"],
  ranger: ["warrior", "priest", "thief"],
  thief: ["warrior", "priest", "mage"],
  worge: ["priest", "ranger", "warrior"],
};

export function normalizeDungeonClassId(raw?: string | null): DungeonClassId {
  const s = String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((DUNGEON_CLASS_IDS as readonly string[]).includes(s)) return s as DungeonClassId;
  if (s === "worg" || s === "worges" || s === "werewolf" || s.includes("shape")) return "worge";
  if (s === "mage_priest" || s === "magepriest" || s === "wizard" || s === "sorcerer") return "mage";
  if (s === "cleric" || s === "healer") return "priest";
  if (s === "rogue" || s === "assassin") return "thief";
  if (s === "hunter" || s === "archer" || s === "scout") return "ranger";
  if (s === "berserker" || s === "knight" || s === "tank") return s === "berserker" ? "raider" : "warrior";
  if (s === "druid" || s === "nature") return "verduror";
  return "warrior";
}

export function dungeonFillClasses(playerClass?: string | null): [DungeonClassId, DungeonClassId, DungeonClassId] {
  const id = normalizeDungeonClassId(playerClass);
  return (DUNGEON_FILL[id] || DUNGEON_FILL.warrior).slice() as [DungeonClassId, DungeonClassId, DungeonClassId];
}

/** Same-faction Toon kits as the player (Crusade / Fabled / Legion). */
export function dungeonAllyRaces(playerRace?: string | null): [string, string, string] {
  const race = String(playerRace || "human").trim().toLowerCase();
  const fac = DUNGEON_RACE_FACTION[race] || DUNGEON_RACE_FACTION.human;
  const same = DUNGEON_RACE_IDS.filter((id) => DUNGEON_RACE_FACTION[id] === fac);
  const pool = same.length ? same : DUNGEON_RACE_IDS;
  const others = pool.filter((id) => id !== race);
  const src = others.length ? others : pool;
  return [0, 1, 2].map((i) => src[i % src.length]) as [string, string, string];
}

export type DungeonAllySlot = {
  characterId?: string | null;
  raceId?: string | null;
  classId?: string | null;
  weaponId?: string | null;
};

/** Pinned lore crawls — same ids as dungeon `src/content/prefabs.js`. */
export const DUNGEON_PREFABS = [
  { id: "crusade-bastion", label: "Sunken Bastion", faction: "Crusade", kind: "faction", theme: "ancient", seed: 1701, blurb: "Crusade fortress — Valorheart kits." },
  { id: "fabled-echoes", label: "Vault of Echoes", faction: "Fabled", kind: "faction", theme: "frost", seed: 1702, blurb: "Fabled temple — elf and dwarf wardens." },
  { id: "legion-ash", label: "Ash Forge", faction: "Legion", kind: "faction", theme: "molten", seed: 1703, blurb: "Volcanic Legion forge — orc and undead packs." },
  { id: "monster-hollow", label: "Crab Hollow", faction: null, kind: "biome", theme: "verdant", seed: 1704, blurb: "Creature crawl — no faction heroes." },
  { id: "warlord-maw", label: "The Abyssal Maw", faction: null, kind: "boss", theme: "grim", seed: 1705, blurb: "Boss only — empty halls, one warlord." },
  { id: "pirate-freeport", label: "Free Port · Pirate Lords", faction: "Pirate", kind: "pirate", theme: "grim", seed: 1706, blurb: "Scourge → John Wayne + airship → Racalvin." },
] as const;

export type WarlordsDungeonPlayOpts = {
  characterId?: string | null;
  raceId?: string | null;
  classId?: string | null;
  weaponId?: string | null;
  /** Up to 3 slots. Null/empty = class-fill AI kit. Roster UUID = that hero as AI. */
  allies?: Array<DungeonAllySlot | null | undefined>;
  /** Production auto-forge + enter. Default true. */
  play?: boolean;
  seed?: string | number | null;
  kind?: string | null;
  /** Pinned lore crawl — crusade-bastion | fabled-echoes | legion-ash | monster-hollow | warlord-maw | pirate-freeport */
  prefab?: string | null;
};

function csv3(parts: Array<string | null | undefined>): string {
  const row = [parts[0] || "", parts[1] || "", parts[2] || ""];
  return row.join(",");
}

export function warlordsDungeonPlayUrl(opts?: WarlordsDungeonPlayOpts): string {
  const u = new URL(WARLORDS_DUNGEON_ORIGIN);
  u.searchParams.set("era", "warlords");
  u.searchParams.set("from", "home");
  u.searchParams.set("linear", "1");
  u.searchParams.set("play", opts?.play === false ? "0" : "1");
  if (opts?.characterId) u.searchParams.set("characterId", opts.characterId);
  if (opts?.raceId) u.searchParams.set("race", String(opts.raceId).trim().toLowerCase());
  if (opts?.classId) u.searchParams.set("class", normalizeDungeonClassId(opts.classId));
  if (opts?.weaponId) u.searchParams.set("weapon", opts.weaponId);
  if (opts?.prefab) {
    const pin = DUNGEON_PREFABS.find((p) => p.id === opts.prefab);
    u.searchParams.set("prefab", opts.prefab);
    if (pin) {
      u.searchParams.set("kind", pin.kind);
      u.searchParams.set("theme", pin.theme);
      u.searchParams.set("seed", String(pin.seed));
    }
  }
  if (opts?.seed != null && String(opts.seed).trim() && !opts?.prefab) {
    u.searchParams.set("seed", String(opts.seed).trim());
  }
  if (opts?.kind && !opts?.prefab) u.searchParams.set("kind", opts.kind);
  if (opts?.allies && opts.allies.length) {
    const ids: string[] = ["", "", ""];
    const races: string[] = ["", "", ""];
    const classes: string[] = ["", "", ""];
    const weapons: string[] = ["", "", ""];
    opts.allies.slice(0, 3).forEach((slot, i) => {
      if (!slot) return;
      if (slot.characterId) ids[i] = String(slot.characterId).trim();
      if (slot.raceId) races[i] = String(slot.raceId).trim().toLowerCase();
      if (slot.classId) classes[i] = normalizeDungeonClassId(slot.classId);
      if (slot.weaponId) weapons[i] = String(slot.weaponId).trim();
    });
    if (ids.some(Boolean)) u.searchParams.set("allyIds", csv3(ids));
    if (races.some(Boolean)) u.searchParams.set("allyRace", csv3(races));
    if (classes.some(Boolean)) u.searchParams.set("allyClass", csv3(classes));
    if (weapons.some(Boolean)) u.searchParams.set("allyWeapon", csv3(weapons));
  }
  return u.toString();
}

/** Classic 2D Warlords island play (same client, 2D engine). */
export const WARLORDS_2D_PLAY_PATH = "/island" as const;

/** In-client tactical ocean (wind + ships + land on sectors). */
export const WARLORDS_OCEAN_PATH = "/ocean?worldSeed=grudge-world-1" as const;

/**
 * Production home destinations on /home (WCS hub + play).
 * Craft / arsenal first; play tiles after.
 */
export const WARLORDS_HOME_ACTIONS = [
  {
    id: "craft",
    title: "Crafting",
    subtitle: "Stations · T0–T8 · account bag",
    description: "WCS crafting — ObjectStore recipes, shared bag, XP on the active hero.",
    url: "/crafting",
    icon: "hammer" as const,
  },
  {
    id: "arsenal",
    title: "Arsenal",
    subtitle: "Weapons · armor · skills",
    description: "Production arsenal catalog with pack icons and T0–T8 types.",
    url: "/arsenal",
    icon: "swords" as const,
  },
  {
    id: "craft-suite",
    title: "WCS suite",
    subtitle: "grudgewarlords.com/craft/",
    description: "Full production craft HTML — camps, benches, item DB, inventory.",
    url: "/craft/",
    icon: "box" as const,
  },
  {
    id: "characters",
    title: "Characters",
    subtitle: "Roster · create · equip",
    description: "View and select your Warlords heroes. Create at Foundry when empty.",
    url: "/heroes",
    icon: "user" as const,
  },
  {
    id: "2d-play",
    title: "2D Gameplay",
    subtitle: "Classic island · harvest · build",
    description: "2D Warlords island mode — professions, harvest, and building.",
    url: WARLORDS_2D_PLAY_PATH,
    icon: "leaf" as const,
  },
  {
    id: "home-island",
    title: "Home Island",
    subtitle: "Personal 1024 m seed",
    description:
      "Your Three.js home island — granted after tutorial + raft (not level 20). Skips tutorial forever once claimed.",
    url: THREE_HOME_ISLAND_PATH,
    icon: "globe" as const,
  },
  {
    id: "dungeon",
    title: "Warlords Dungeon",
    subtitle: "Linear crawl · AI party · boss slain",
    description: "Production generative crawl — your hero plus AI allies or other account heroes as AI.",
    url: "/dungeon",
    icon: "map" as const,
  },
  {
    id: "combat-airship",
    title: "Combat · Airship",
    subtitle: "4-character Warlords era scene",
    description: "Player + John Wayne, Scourge, Racalvin on the airship. Combat tab entry.",
    url: "/combat",
    icon: "anchor" as const,
  },
  {
    id: "tutorial",
    title: "Start Tutorial",
    subtitle: "Shipwreck · raft · unlock home",
    description: "New player shipwreck tutorial → craft raft → home island intro.",
    url: "/tutorial",
    icon: "flame" as const,
  },
  {
    id: "ocean",
    title: "Ocean Sail",
    subtitle: "Wind · ships · era 9 sectors",
    description:
      "3D tactical ocean with wind sailing. Board your fleet ship, sail between the 9 Warlords sectors, land into live zones.",
    url: WARLORDS_OCEAN_PATH,
    icon: "anchor" as const,
  },
  {
    id: "sectors",
    title: "9 Sector World Map",
    subtitle: "Strategic map · deploy ocean or land",
    description:
      "Complete Warlords era 9 map. Open ocean sail, land in a sector, or inspect biomes from the strategic overview.",
    url: THREE_WORLD_MAP_PATH,
    icon: "map" as const,
  },
  {
    id: "lobby",
    title: "Enter Lobby Scene",
    subtitle: "Opening + tutorial map · center tile",
    description:
      "Chicken Gun pirate-islands lobby (Warlords opening map and tutorial map). Middle square of era 9 — not GRUDOX, not Explorer. E at south dock for fleet panel → Set Sail ocean, or sail the lobby waters.",
    url: WARLORDS_LOBBY_PATH,
    icon: "compass" as const,
  },
] as const;