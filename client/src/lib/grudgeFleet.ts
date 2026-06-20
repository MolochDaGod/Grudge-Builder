/**
 * grudgeFleet.ts — ONE TRUTH wiring for the entire Grudge Studio fleet.
 *
 * Two backend layers (both required):
 *   1. IDENTITY  — The-ENGINE @ id.grudge-studio.com + api.grudge-studio.com
 *                  Accounts, OAuth, grudge_token SSO, GBUX profile shell
 *   2. GAME DATA — GrudgeBuilder @ grudge-builder-production (Railway)
 *                  Characters, wallets, cNFT mint, islands, inventory (Postgres SSOT)
 *
 * Browser apps MUST use same-origin `/api/*` so Vercel rewrites route:
 *   /api/auth/*     → id.grudge-studio.com (except /api/auth/puter → Railway)
 *   /api/characters → Railway
 *   /api/wallet     → Railway
 *   /api/nfts       → Railway
 *   /api/account    → Railway
 */

import {
  AUTH_GATEWAY,
  GAME_API,
  ASSETS_CDN,
  AI_GATEWAY,
  OBJECTSTORE,
  buildSsoLoginUrl,
} from "./grudgeConfig";
import { bridgeGrudgeLaunchToken, isAuthenticated, getToken } from "./grudgeBackend";
import { GrudgeAccountSDK } from "./GrudgeAccountSDK";

/** Production Railway — authoritative game-state API */
export const GAME_DATA_RAILWAY =
  "https://grudge-builder-production.up.railway.app";

/** Crossmint character cNFT collection (Grudge Platform) */
export const CROSSMINT_CHARACTER_COLLECTION =
  "5061318d-ff65-4893-ac4b-9b28efb18ace";

/** Crossmint island cNFT collection */
export const CROSSMINT_ISLAND_COLLECTION =
  "a8f3e2d1-4b5c-6d7e-8f9a-0b1c2d3e4f5a";

/**
 * Canonical fleet map — import this in any Grudge app instead of hardcoding URLs.
 */
export const GRUDGE_FLEET = {
  auth: AUTH_GATEWAY,
  identityApi: GAME_API,
  gameData: GAME_DATA_RAILWAY,
  assets: ASSETS_CDN,
  ai: AI_GATEWAY,
  objectStore: OBJECTSTORE,
  account: `${GAME_DATA_RAILWAY}/api/account`,
  characters: `${GAME_DATA_RAILWAY}/api/characters`,
  wallet: `${GAME_DATA_RAILWAY}/api/wallet`,
  nfts: `${GAME_DATA_RAILWAY}/api/nfts`,
  crossmint: {
    characterCollection: CROSSMINT_CHARACTER_COLLECTION,
    islandCollection: CROSSMINT_ISLAND_COLLECTION,
  },
} as const;

/**
 * API base for browser fetch() calls.
 * Empty string = same-origin `/api/...` (Vercel rewrites handle routing).
 */
export function fleetApiBase(): string {
  if (typeof window === "undefined") return GAME_DATA_RAILWAY;
  return "";
}

/** Build a fleet API path (`/api/characters`, etc.) */
export function fleetApi(path: string): string {
  const base = fleetApiBase();
  const clean = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${clean}` : clean;
}

/**
 * Standard Vercel rewrites — copy into any game's vercel.json BEFORE the catch-all.
 * Order matters: specific routes first, `/api/auth/:path*` last among auth rules.
 */
export const VERCEL_FLEET_REWRITES = [
  { source: "/api/assets/:path*", destination: `${ASSETS_CDN}/:path*` },
  { source: "/api/characters", destination: `${GAME_DATA_RAILWAY}/api/characters` },
  { source: "/api/characters/:path*", destination: `${GAME_DATA_RAILWAY}/api/characters/:path*` },
  { source: "/api/wallet/:path*", destination: `${GAME_DATA_RAILWAY}/api/wallet/:path*` },
  { source: "/api/nfts/:path*", destination: `${GAME_DATA_RAILWAY}/api/nfts/:path*` },
  { source: "/api/island/:path*", destination: `${GAME_DATA_RAILWAY}/api/island/:path*` },
  { source: "/api/islands/:path*", destination: `${GAME_DATA_RAILWAY}/api/islands/:path*` },
  { source: "/api/account", destination: `${GAME_DATA_RAILWAY}/api/account` },
  { source: "/api/account/:path*", destination: `${GAME_DATA_RAILWAY}/api/account/:path*` },
  { source: "/api/inventory/:path*", destination: `${GAME_DATA_RAILWAY}/api/inventory/:path*` },
  { source: "/api/party/:path*", destination: `${GAME_DATA_RAILWAY}/api/party/:path*` },
  { source: "/api/auth/puter", destination: `${GAME_DATA_RAILWAY}/api/auth/puter` },
  { source: "/api/auth/login", destination: `${GAME_DATA_RAILWAY}/api/auth/login` },
  { source: "/api/auth/register", destination: `${GAME_DATA_RAILWAY}/api/auth/register` },
  { source: "/api/auth/me", destination: `${GAME_DATA_RAILWAY}/api/auth/me` },
  { source: "/api/auth/verify", destination: `${GAME_DATA_RAILWAY}/api/auth/verify` },
  { source: "/api/auth/session/exchange", destination: `${GAME_API}/api/auth/session/exchange` },
  { source: "/api/auth/:path*", destination: `${AUTH_GATEWAY}/auth/:path*` },
  { source: "/api/ai/:path*", destination: `${AI_GATEWAY}/:path*` },
  { source: "/api/:path*", destination: `${GAME_API}/api/:path*` },
] as const;

export interface WireGrudgeFleetOptions {
  /** 'standalone' | 'embedded' iframe */
  mode?: "standalone" | "embedded";
  /** Override API base (default: same-origin in browser) */
  apiBase?: string;
  /** Skip SSO pickup from URL */
  skipAuthPickup?: boolean;
}

/**
 * Wire a Grudge game to the fleet in one call:
 *   1. Bridge grudge_token / sso_token from URL
 *   2. Init GrudgeAccountSDK (account + characters sync)
 *   3. Return SDK singleton
 */
export async function wireGrudgeFleet(opts: WireGrudgeFleetOptions = {}) {
  const { mode = "standalone", apiBase, skipAuthPickup = false } = opts;

  if (!skipAuthPickup && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const launchToken = params.get("grudge_token");
    if (launchToken && !isAuthenticated()) {
      await bridgeGrudgeLaunchToken(launchToken);
    }
  }

  if (mode === "embedded") {
    GrudgeAccountSDK.initEmbedded();
  } else {
    await GrudgeAccountSDK.init(apiBase ?? fleetApiBase());
  }

  return GrudgeAccountSDK;
}

/** Redirect user to Grudge ID login; returns to /auth/callback on this origin */
export function loginWithGrudgeId(returnPath = "/auth/callback"): void {
  if (typeof window === "undefined") return;
  const url = buildSsoLoginUrl(`${window.location.origin}${returnPath}`);
  window.location.href = url;
}

export { GrudgeAccountSDK, getToken, isAuthenticated, buildSsoLoginUrl };