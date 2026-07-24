/**
 * Per-game Railway + DB contract (identity stays on id.grudge-studio.com).
 *
 * Accounts / grudge_id live only on the identity Postgres (grudge-api).
 * Each game service owns game-specific rows keyed by grudge_id.
 */

import { FLEET_URLS } from "./manifest";

/** Public identity gateway — all logins. */
export const IDENTITY_GATEWAY = FLEET_URLS.auth;

/** Railway that currently hosts identity implementation + Warlords game data (monolith). */
export const IDENTITY_IMPLEMENTATION = FLEET_URLS.gameData;

export type GameDataProductId =
  | "warlords"
  | "foundry"
  | "gcs"
  | "arena"
  | "genesis"
  | "forge"
  | "gameopen"
  | "grudox"
  | "survival"
  | "mine-loader"
  | "voxgrudge"
  | "fba"
  | string;

export interface GameDataServiceSpec {
  /** Stable game key used in logs / analytics */
  gameId: GameDataProductId;
  /** Public SPA origin */
  frontendUrl: string;
  /**
   * Game API base (Railway). When null, game still uses Warlords monolith
   * (IDENTITY_IMPLEMENTATION) for game rows — migration pending.
   */
  gameApiUrl: string | null;
  /** Human note */
  notes?: string;
}

/**
 * Registry of products and where their **game** data should live.
 * Identity is always IDENTITY_GATEWAY / IDENTITY_IMPLEMENTATION accounts tables.
 */
export const FLEET_GAME_DATA_SERVICES: GameDataServiceSpec[] = [
  {
    gameId: "warlords",
    frontendUrl: FLEET_URLS.warlords,
    gameApiUrl: FLEET_URLS.gameData,
    notes:
      "Today co-hosts accounts + Warlords game on grudge-api. Target: split game schema later; keep accounts on identity.",
  },
  {
    gameId: "foundry",
    frontendUrl: FLEET_URLS.charactersHub,
    gameApiUrl: FLEET_URLS.gameData,
    notes:
      "Character Foundry (GCS). Create/select heroes only — same Engine Account Postgres " +
      "(users/accounts/characters/account_inventory) as Warlords. Pages worker proxies " +
      "/api/* → grudge-api. Never a second roster store.",
  },
  {
    gameId: "gcs",
    frontendUrl: FLEET_URLS.gcs,
    gameApiUrl: FLEET_URLS.gameData,
    notes: "Alias of foundry — character.grudge-studio.com Engine Account SSOT.",
  },
  {
    gameId: "genesis",
    frontendUrl: "https://warstrat.grudge-studio.com",
    gameApiUrl: "https://warlord-genesis.vercel.app",
    notes: "SPA on Vercel; API may be same-origin rewrites or dedicated Railway — always auth via id.",
  },
  {
    gameId: "arena",
    frontendUrl: "https://arena.grudge-studio.com",
    gameApiUrl: "https://grudge-arena-api-production.up.railway.app",
    notes:
      "Auth via id.grudge-studio.com only. Game builds/matches on grudge-arena-api (FK grudge_id). Frontend proxy: /api/arena/* → this URL. No accounts tables on arena-api.",
  },
  {
    gameId: "forge",
    frontendUrl: FLEET_URLS.forge,
    gameApiUrl: null,
    notes: "Paid gate via id roles; scenes/assets not identity DB.",
  },
  {
    gameId: "gameopen",
    frontendUrl: FLEET_URLS.gameopen,
    gameApiUrl: null,
    notes: "SSO via id; characters via Railway when configured.",
  },
  {
    gameId: "grudox",
    frontendUrl: FLEET_URLS.grudox,
    gameApiUrl: FLEET_URLS.grudoxGameServer,
    notes: "Zone rooms on voxgrudge Railway; account via id.",
  },
  {
    gameId: "survival",
    frontendUrl: FLEET_URLS.grudges,
    gameApiUrl: FLEET_URLS.survivalApi,
    notes:
      "GRUDGES survival (MolochDaGod/survival). SPA grudges.* + survival.* same Vercel project. " +
      "Game API Railway survival-api; auth via id. Local SSOT: C:\\Users\\david\\repos\\survival.",
  },
  {
    gameId: "mine-loader",
    frontendUrl: FLEET_URLS.mineLoader,
    gameApiUrl: FLEET_URLS.mineLoaderApi,
    notes:
      "Voxel Realms + Codex SSOT. Railway API owns blocks/lobby/worlds (1 replica). " +
      "Characters/wallet still Builder Railway. Local: C:\\Users\\david\\repos\\mine-loader. " +
      "Docs: docs/NEXUS_VOXEL_SSOT.md · GET /api/ssot",
  },
  {
    gameId: "voxgrudge",
    frontendUrl: FLEET_URLS.voxgrudge,
    gameApiUrl: FLEET_URLS.grudoxGameServer,
    notes:
      "Open-world voxel. Consumes Mine-Loader Codex REST; zone rooms may use grudoxGameServer. Auth via id.",
  },
  {
    gameId: "fba",
    frontendUrl: "https://flare-boss-arena.vercel.app",
    gameApiUrl: null,
    notes: "Auth via id; game state on FBA service when present.",
  },
];

/** Env vars every game Railway API must declare (no secrets in repo). */
export const GAME_API_REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "IDENTITY_URL",
  "CORS_ORIGINS",
] as const;

export const GAME_API_RECOMMENDED_ENV = [
  "PUBLIC_GAME_ID",
  "ASSETS_URL",
  "OBJECTSTORE_URL",
] as const;

/** Default IDENTITY_URL for game services. */
export const DEFAULT_IDENTITY_URL = IDENTITY_GATEWAY;

/**
 * SQL snippet (documentation only) — player-owned tables in a game DB.
 */
export const GAME_DB_PLAYER_COLUMNS_SQL = `
  grudge_id   TEXT NOT NULL,
  account_id  UUID,
  character_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
`;

/** Minimal JWT claims games must accept from Grudge ID. */
export interface GrudgeIdTokenClaims {
  sub: string;
  grudge_id?: string;
  grudgeId?: string;
  username?: string;
  type?: string;
}
