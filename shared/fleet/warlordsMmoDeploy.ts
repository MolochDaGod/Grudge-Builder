/**
 * Warlords MMO deploy contract — grudgewarlords.com (this git) only.
 *
 * Combines on ONE host:
 *   tactical_ocean_view  → same-origin /ocean (OpenWaterProduction)
 *   RTS build / deploy   → BuildingSystem + 4 m island-building-prefabs
 *   AI allies            → AllyManager + CampUnitSystem F1–F5
 *   island defence       → IslandDefenceDirector
 *   icons / skills / panel → info.grudge-studio.com + /main-panel/
 *
 * Not this host: water.*, open.*, warlord-genesis, blox, Forge editor, grudox.
 */

export const WARLORDS_MMO_HOST = "https://grudgewarlords.com" as const;
export const WARLORDS_MMO_CONTRACT = "1.0.0" as const;

export const INFO_ORIGIN = "https://info.grudge-studio.com" as const;
export const ASSETS_CDN = "https://assets.grudge-studio.com" as const;
export const OBJECTSTORE_ORIGIN = "https://objectstore.grudge-studio.com" as const;

export const CHARACTER_HEIGHT_M = 2;
export const BUILDING_HEIGHT_M = 4;
export const HOME_ISLAND_DIAMETER_M = 1024;

/** Same-origin play routes on this git. */
export const WARLORDS_MMO_ROUTES = {
  homeIsland: "/home-island",
  play: "/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1&city=haven_port",
  ocean: "/ocean?worldSeed=grudge-world-1",
  worldMap: "/world-map",
  mainPanel: "/main-panel/?era=warlords&embed=1",
  weaponSkills: "/weapon-skills",
  rtsBuild: "/home-island",
  lobby: "/island-3d?mode=lobby&map=pirate-islands",
} as const;

/** Map families that may load inside this SPA. External URLs are references only. */
export const WARLORDS_MMO_MAP_FAMILIES = {
  warlords_era_open_world: {
    entry: WARLORDS_MMO_ROUTES.play,
    catalog: `${INFO_ORIGIN}/api/v1/warlords-zones.json`,
  },
  player_home_block: {
    entry: WARLORDS_MMO_ROUTES.homeIsland,
    catalog: `${INFO_ORIGIN}/api/v1/home-island-contract.json`,
  },
  tactical_ocean_view: {
    entry: WARLORDS_MMO_ROUTES.ocean,
    catalog: `${INFO_ORIGIN}/api/v1/map-registry.json`,
    /** View layer only. Do not send the player off-host to sail. */
    externalReference: "https://water.grudge-studio.com",
  },
  home_island: {
    entry: WARLORDS_MMO_ROUTES.homeIsland,
    catalog: `${INFO_ORIGIN}/api/v1/home-island-contract.json`,
  },
} as const;

export const WARLORDS_MMO_CATALOGS = {
  icons: `${INFO_ORIGIN}/api/v1/icon-registry.json`,
  sprites: `${INFO_ORIGIN}/api/v1/sprites.json`,
  weaponSkills: `${INFO_ORIGIN}/api/v1/master-weaponSkills.json`,
  weaponPrefabs: `${INFO_ORIGIN}/api/v1/master-weapon-prefabs.json`,
  islandBuildings: `${INFO_ORIGIN}/api/v1/island-building-prefabs.json`,
  warlordsCatalog: `${INFO_ORIGIN}/api/v1/warlords-catalog.json`,
  mapRegistry: `${INFO_ORIGIN}/api/v1/map-registry.json`,
  homeIslandContract: `${INFO_ORIGIN}/api/v1/home-island-contract.json`,
} as const;

/** Same-origin first, then info.*, then objectstore. */
export function catalogUrls(path: `/${string}`): string[] {
  const rel = path.startsWith("/api/") ? path : `/api/v1${path}`;
  return [
    `/api/objectstore${rel.replace(/^\/api/, "")}`,
    `${INFO_ORIGIN}${rel.startsWith("/api") ? rel : `/api/v1${rel}`}`,
    `${OBJECTSTORE_ORIGIN}${rel.startsWith("/api") ? rel : `/api/v1${rel}`}`,
  ];
}

export const WARLORDS_MMO_KEYS = {
  mainPanel: "i",
  mainPanelAlt: "c",
  combatHarvest: "q",
  harvestTools: "r",
  defend: "F1",
  follow: "F2",
  goHome: "F3",
  attack: "F4",
  groupOnMe: "F5",
  worldMap: "m",
} as const;

export const WARLORDS_MMO_NOT_HOST = [
  "https://water.grudge-studio.com",
  "https://open.grudge-studio.com",
  "https://warlord-genesis.vercel.app",
  "https://blox.grudge-studio.com",
  "https://forge.grudge-studio.com",
  "https://grudox.vercel.app",
] as const;

export function isWarlordsMmoPlayPath(pathname: string): boolean {
  return (
    pathname === "/home-island" ||
    pathname === "/homeisland" ||
    pathname === "/play" ||
    pathname === "/ocean" ||
    pathname === "/island-3d" ||
    pathname === "/tutorial" ||
    pathname === "/main-panel"
  );
}
