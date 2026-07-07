/**
 * grudgeFleet.ts — ONE TRUTH wiring for the entire Grudge Studio fleet.
 *
 * Two backend layers (both required):
 *   1. IDENTITY  — id.grudge-studio.com (canonical Grudge ID — ONLY auth system)
 *                  Accounts, OAuth, grudge_token SSO, login, sso-check
 *   2. GAME DATA — GrudgeBuilder @ grudge-api-production-0d46 (Railway)
 *                  Characters, wallets, cNFT mint, islands, inventory (Postgres SSOT)
 *
 * Browser apps MUST use same-origin `/api/*` so Vercel rewrites route:
 *   /api/auth/*     → id.grudge-studio.com (satellite apps) or Railway (hub alias)
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
  WS_URL,
  buildSsoLoginUrl,
} from "./grudgeConfig";
import {
  FLEET_URLS,
  FLEET_VERCEL_REWRITES,
  CROSSMINT_COLLECTIONS,
} from "@shared/fleet";
import { bridgeGrudgeLaunchToken, isAuthenticated, getToken } from "./grudgeBackend";
import { GrudgeAccountSDK } from "./GrudgeAccountSDK";

/** Production Railway — authoritative game-state API */
export const GAME_DATA_RAILWAY = FLEET_URLS.gameData;

export const CROSSMINT_CHARACTER_COLLECTION = CROSSMINT_COLLECTIONS.character;
export const CROSSMINT_ISLAND_COLLECTION = CROSSMINT_COLLECTIONS.island;

/**
 * Canonical fleet map — import this in any Grudge app instead of hardcoding URLs.
 */
/** PBR ground terrain — R2 CDN (home-islands + 9 sectors) */
export const GROUND_PBR_CDN = `${ASSETS_CDN}/textures/pbr/ground`;
export const GROUND_PBR_MANIFEST = `${GROUND_PBR_CDN}/manifest.json`;

export const GRUDGE_FLEET = {
  auth: AUTH_GATEWAY,
  identityApi: GAME_API,
  gameData: GAME_DATA_RAILWAY,
  assets: ASSETS_CDN,
  groundPBR: GROUND_PBR_CDN,
  ai: AI_GATEWAY,
  objectStore: OBJECTSTORE,
  colyseus: WS_URL,
  world: FLEET_URLS.world,
  charactersHub: FLEET_URLS.charactersHub,
  fleetManifest: "/api/fleet/manifest",
  account: `${GAME_DATA_RAILWAY}/api/account`,
  characters: `${GAME_DATA_RAILWAY}/api/characters`,
  wallet: `${GAME_DATA_RAILWAY}/api/wallet`,
  nfts: `${GAME_DATA_RAILWAY}/api/nfts`,
  supabase: "/api/supabase",
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
/** @deprecated Import FLEET_VERCEL_REWRITES from @shared/fleet — kept for backwards compat */
export const VERCEL_FLEET_REWRITES = FLEET_VERCEL_REWRITES;

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

/** Redirect user to canonical Grudge ID login (/login?redirect_uri=). */
export function loginWithGrudgeId(returnPath = "/auth/callback"): void {
  if (typeof window === "undefined") return;
  window.location.href = buildSsoLoginUrl(window.location.origin, returnPath);
}

export { GrudgeAccountSDK, getToken, isAuthenticated, buildSsoLoginUrl };