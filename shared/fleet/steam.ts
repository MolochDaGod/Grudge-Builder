/**
 * Steam app identity for Grudge (Warlords / MMO sandbox).
 * Store: https://store.steampowered.com/app/2707990/Grudge/
 * Community: https://steamcommunity.com/app/2707990
 */

/** Canonical Steam Application ID (Grudge). */
export const STEAM_APP_ID = 2707990 as const;

/** Windows 64-bit content depot (SteamDB / partner). */
export const STEAM_DEPOT_WINDOWS = 2707991 as const;

/** Public store + community URLs */
export const STEAM_URLS = {
  store: `https://store.steampowered.com/app/${STEAM_APP_ID}/Grudge/`,
  community: `https://steamcommunity.com/app/${STEAM_APP_ID}`,
  steamdb: `https://steamdb.info/app/${STEAM_APP_ID}/`,
} as const;

/**
 * Runtime Steam flags (Electron / native / Steam Overlay web wrapper).
 * When running under Steam, place steam_appid.txt next to the executable
 * or set env STEAM_APP_ID for tooling.
 */
export function resolveSteamAppId(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): number {
  const raw = env.STEAM_APP_ID || env.VITE_STEAM_APP_ID;
  if (raw && /^\d+$/.test(raw)) return parseInt(raw, 10);
  return STEAM_APP_ID;
}

export const STEAM_FLEET_NOTES = {
  appId: STEAM_APP_ID,
  depotWindows: STEAM_DEPOT_WINDOWS,
  /** Web fleet continues as primary play surface; Steam depot ships same island contract. */
  islandWorldSizeM: 1024,
  homeIslandFoundations: ["driftwood_bay", "ironfang_spire"] as const,
  openWorldDefault: "/play?sector=haven_shore&mode=zone&worldSeed=grudge-world-1",
  homeIslandDefault: "/home-island",
  auth: "https://id.grudge-studio.com",
  gameApi: "https://grudge-api-production-0d46.up.railway.app",
} as const;
