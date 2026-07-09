/**
 * Production game deployment map — grudgewarlords.com/home → fleet satellites.
 * Import from @shared/fleet; do not hardcode game URLs in pages.
 */
import { FLEET_URLS } from "./manifest";

/** External fleet origins that accept ?sso_token= from navigateToGame(). */
export const FLEET_GAME_ORIGINS = {
  "tactical-infinity": "https://water.grudge-studio.com",
  "rts-grudge": "https://rts-grudge.vercel.app",
  forge: "https://forge.grudge-studio.com",
  "three-port": FLEET_URLS.threePort,
  dcq: "https://dcq.grudge-studio.com",
  survival: "https://survival.grudge-studio.com",
  arena: "https://grudge-arena.grudge-studio.com",
  drive: "https://grudge-drive.vercel.app",
} as const;

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

/** Recommended onboarding → home → sail → sector → RTS (shown on /home). */
export const PRODUCTION_DEPLOYMENT_PATH: GameDeployment[] = [
  {
    id: "tutorial",
    title: "Tutorial Island",
    subtitle: "Shipwreck · Learn Controls",
    description:
      "3-state gameplay tutorial — harvest, combat, build. Grudge6 character + profession XP persists to your account.",
    url: "/tutorial",
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
    subtitle: "1024m Seed World",
    description:
      "Your persistent island — Colyseus sync, profession gathering, mountain dungeon, raft to the ocean.",
    url: "/home-island",
    icon: "leaf",
    tier: "core",
    badge: "Home",
    badgeColor: "emerald",
    stage: "home",
    featured: true,
    order: 20,
  },
  {
    id: "tactical",
    title: "Tactical Infinity",
    subtitle: "Captain · Raft · World Map",
    description:
      "Full production client at water.grudge-studio.com — create captain, build raft, sail the world map.",
    url: FLEET_GAME_ORIGINS["tactical-infinity"],
    icon: "anchor",
    tier: "explore",
    badge: "LIVE",
    badgeColor: "cyan",
    stage: "sail",
    fleetGameId: "tactical-infinity",
    featured: true,
    order: 30,
  },
  {
    id: "ocean",
    title: "9-Sector Ocean",
    subtitle: "Tactical Sail (Warlords)",
    description:
      "Wind sailing on the 10 km ocean — land at any of 9 sectors and deploy into Colyseus PvP or solo 3D zones.",
    url: "/ocean",
    icon: "compass",
    tier: "explore",
    badge: "9 Sectors",
    badgeColor: "teal",
    stage: "sail",
    order: 40,
  },
  {
    id: "play",
    title: "Open World Sectors",
    subtitle: "Colyseus PvP",
    description:
      "Jump straight into a live sector room — Ethereal Falls, Convergence Nexus, Haven Shore, and six more.",
    url: "/play",
    icon: "globe",
    tier: "combat",
    badge: "MMO",
    badgeColor: "violet",
    stage: "sector",
    order: 50,
  },
  {
    id: "rtsgrudge",
    title: "RTS GRUDGE",
    subtitle: "3D Battle Lobby",
    description:
      "Faction wars, siege, quick match — 3D lobby with live server status. Same-origin on grudgewarlords.com.",
    url: "/rts-grudge",
    icon: "shield",
    tier: "combat",
    badge: "RTS",
    badgeColor: "red",
    stage: "rts",
    featured: true,
    order: 60,
  },
];

/** All playable modes on /home (deployment path + extras). */
export const HOME_GAME_MODES: GameDeployment[] = [
  ...PRODUCTION_DEPLOYMENT_PATH,
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
    subtitle: "Deployment Console",
    description: "Railway + Colyseus status — route into home island, open world, RTS, or 2D island.",
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
    title: "Grudge Warlords 3D",
    subtitle: "9 Sectors & Colyseus",
    description: "Lightweight Three.js MMO — pick a sector, home island, or classic uMMORPG zone.",
    url: `${FLEET_URLS.threePort}?mode=play`,
    icon: "globe",
    tier: "core",
    badge: "3D MMO",
    badgeColor: "violet",
    stage: "sector",
    fleetGameId: "three-port",
    order: 55,
  },
  {
    id: "forge",
    title: "Grudge Forge",
    subtitle: "RTS Map Editor",
    description: "R3F + Rapier map editor — publish sectors and structures to the fleet.",
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
    id: "island",
    title: "Island 2D",
    subtitle: "Auto-Harvest & Build",
    description: "Classic 2D island view with auto-harvest and structure bonuses.",
    url: "/island-v2",
    icon: "leaf",
    tier: "core",
    badge: "2D",
    badgeColor: "lime",
    order: 70,
  },
  {
    id: "crafting",
    title: "Warlord Crafting",
    subtitle: "Forge Weapons & Armor",
    description: "Craft weapons, armor, consumables using your profession skills.",
    url: "/crafting",
    icon: "hammer",
    tier: "craft",
    badge: "Craft",
    badgeColor: "orange",
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
    id: "worldmap",
    title: "World Map",
    subtitle: "Explore & Capture",
    description: "100×100 zone grid with capturable territory and weekly rotation.",
    url: "/world-map",
    icon: "compass",
    tier: "explore",
    badge: "Explore",
    badgeColor: "teal",
    order: 110,
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
    order: 140,
  },
].sort((a, b) => a.order - b.order);

export function deploymentUrl(
  id: string,
  options?: { sector?: string; worldSeed?: string },
): string | undefined {
  const mode = HOME_GAME_MODES.find((m) => m.id === id);
  if (!mode) return undefined;
  if (id === "play" && options?.sector) {
    const params = new URLSearchParams({
      sector: options.sector,
      worldSeed: options.worldSeed || "grudge-world-1",
    });
    return `/play?${params.toString()}`;
  }
  if (id === "ocean" && options?.worldSeed) {
    return `/ocean?worldSeed=${encodeURIComponent(options.worldSeed)}`;
  }
  return mode.url;
}