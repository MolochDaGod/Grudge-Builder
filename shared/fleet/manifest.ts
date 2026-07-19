/**
 * Grudge Studio Fleet Manifest — ONE TRUTH service registry.
 * Import from @shared/fleet in server + client. Never hardcode URLs elsewhere.
 */

export type FleetServiceRole =
  | "identity"
  | "game-data"
  | "assets"
  | "realtime"
  | "ai"
  | "rag"
  | "objectstore"
  | "supabase"
  | "hub";

export interface FleetService {
  id: string;
  label: string;
  role: FleetServiceRole;
  /** Production URL (https/wss). Browser apps use same-origin /api rewrites where noted. */
  url: string;
  /** Same-origin proxy path when deployed on Vercel */
  proxyPath?: string;
  notes?: string;
}

/** The-ENGINE Express origin on Railway — Vercel/grudge-studio.com rewrites target this. */
export const THE_ENGINE_RAILWAY = "https://the-engine.up.railway.app" as const;

/**
 * Portal SPA (Rec0deD). Not the login system.
 * Login is always FLEET_URLS.auth (id.grudge-studio.com).
 */
export const IDENTITY_PORTAL = "https://grudge-studio.com" as const;

/**
 * Accounts / Grudge ID implementation host (Railway grudge-api).
 * Browsers never call this for login UI — only id.grudge-studio.com gateway.
 */
export const IDENTITY_ACCOUNTS_API =
  "https://grudge-api-production-0d46.up.railway.app" as const;

/** Canonical production endpoints — override via env in runtime adapters. */
export const FLEET_URLS = {
  /** Unified SSO for ALL apps — CF Worker → IDENTITY_ACCOUNTS_API */
  auth: "https://id.grudge-studio.com",
  /**
   * @deprecated Name is misleading. Prefer auth for login; portal shell is portal.
   * Kept for older clients that used identityApi as "session exchange on portal".
   */
  identityApi: IDENTITY_PORTAL,
  /** Portal shell */
  portal: IDENTITY_PORTAL,
  /**
   * Warlords game data API (Postgres). Today also hosts accounts tables
   * (identity implementation). New games: own Railway + DB, FK grudge_id.
   * See shared/fleet/gameDataContract.ts + Desktop/IDENTITY_AND_GAME_DATA.md
   */
  gameData: IDENTITY_ACCOUNTS_API,
  assets: "https://assets.grudge-studio.com",
  objectStore: "https://objectstore.grudge-studio.com/api/v1",
  ai: "https://ai.grudge-studio.com",
  /** Local AnythingLLM desktop — dev RAG over fleet + ObjectStore docs */
  anythingllm: "http://localhost:3001/api",
  /** Colyseus shares the GrudgeBuilder Railway HTTP server (home_island, sector, town, …). */
  colyseus: "wss://grudge-api-production-0d46.up.railway.app",
  world: "wss://world.grudge-studio.com",
  charactersHub: "https://character.grudge-studio.com",
  gcs: "https://character.grudge-studio.com",
  /** Warlords product apex (landing, lore, account) — also serves play SPA */
  warlords: "https://grudge.studio",
  /** Play / legacy game hostname (same grudge-builder deployment) */
  warlordsPlay: "https://grudgewarlords.com",
  /** Lightweight Three.js MMO client — 9 sectors + Colyseus multiplayer */
  threePort: "https://grudge-three-port.vercel.app",
  /** Map & Model Editor — home-island creation (artifacts/studio) */
  studioEditor: "https://grudge-studio-editor.vercel.app",
  /** Tactical Infinity — captain, home island raft, world-map sailing */
  tacticalInfinity: "https://water.grudge-studio.com",
  /** RTS-Grudge 3D open world + /forge editor */
  rtsGrudge: "https://rts-grudge.vercel.app",
  forge: "https://forge.grudge-studio.com",
  /** Voxel / character play hub (Camofire, Ethereal Falls, mode launcher) */
  play: "https://play.grudge.studio",
  /** GRUDOX fleet hub — arcade, studio, editors */
  grudox: "https://grudox.grudge-studio.com",
  /** Carrier PvP client — dedicated subdomain, same game server */
  carrier: "https://carrier.grudge-studio.com",
  /** Single-instance authoritative rooms (Carrier / Waters / Brawler) */
  grudoxGameServer: "https://voxgrudge-grudox-room-production.up.railway.app",
  /**
   * Grudge6 game lab (character-animator grudge-game artifact).
   * Base path `/game/` — HUD, main panel, spellbook, character, inventory, world.
   */
  grudge6: "https://grudge6.grudge-studio.com/game",
  /**
   * Grudge Open — the fleet's open combat/studio platform.
   * Danger Room, Voxel Editor, Ruins Brawler, Warlord Genesis, VoxGrudge, Mimic Dungeon.
   * Same-origin /api rewrites to Railway + GRUDOX zone servers.
   */
  gameopen: "https://gameopen.vercel.app",
  /**
   * Mine-Loader / Voxel Realms — Nexus voxel Codex SSOT (blocks, lobby, seed worlds).
   * Edge: mine.grudge-studio.com · SPA Vercel · API Railway (1 replica).
   * Live Codex: GET {mineLoaderApi}/api/ssot · /api/blocks
   */
  mineLoader: "https://mine.grudge-studio.com",
  mineLoaderSpa: "https://mine-loader.vercel.app",
  mineLoaderApi: "https://mine-loader-api-production.up.railway.app",
  /** Codex UI (block defs) on the Mine-Loader SPA */
  mineCodex: "https://mine.grudge-studio.com/#/defs",
  /**
   * GRUDGES — Nexus-era survival RTS/MMO (repo: MolochDaGod/survival).
   * Primary domain grudges.*; survival.* is the same Vercel project.
   */
  survival: "https://survival.grudge-studio.com",
  grudges: "https://grudges.grudge-studio.com",
  survivalApi: "https://survival-api-production.up.railway.app",
  /** Open-world voxel (consumes Mine-Loader Codex; do not fork block catalog) */
  voxgrudge: "https://voxgrudge.vercel.app",
  /** Games portal index */
  gamesPortal: "https://grudge-studio.com/games",
} as const;

export const FLEET_SERVICES: FleetService[] = [
  {
    id: "grudge-id",
    label: "Grudge ID (unified SSO for all apps)",
    role: "identity",
    url: FLEET_URLS.auth,
    proxyPath: "/api/auth",
    notes:
      "ONLY login surface. CF Worker grudge-identity-api → Railway grudge-api. Accounts DB: users/accounts.grudge_id. JWT grudge_token SSO.",
  },
  {
    id: "accounts-api",
    label: "Accounts implementation (Railway grudge-api)",
    role: "identity",
    url: IDENTITY_ACCOUNTS_API,
    proxyPath: "/api/auth",
    notes: "Do not call from browsers for login UI. Postgres accounts + currently Warlords game rows.",
  },
  {
    id: "identity-api",
    label: "Portal shell (The-ENGINE SPA)",
    role: "identity",
    url: FLEET_URLS.portal ?? FLEET_URLS.identityApi,
    proxyPath: "/api",
    notes: "Portal UI only — NOT the account database. Auth still via id.grudge-studio.com.",
  },
  {
    id: "game-data",
    label: "Warlords game API (Railway grudge-api)",
    role: "game-data",
    url: FLEET_URLS.gameData,
    proxyPath: "/api/characters",
    notes:
      "Warlords characters/wallet/islands. Other games should use own Railway DB + grudge_id FK. See gameDataContract.ts",
  },
  {
    id: "assets-cdn",
    label: "Binary CDN (R2)",
    role: "assets",
    url: FLEET_URLS.assets,
    proxyPath: "/api/assets",
    notes: "Models, textures, animations, icons",
  },
  {
    id: "objectstore",
    label: "ObjectStore JSON catalog",
    role: "objectstore",
    url: FLEET_URLS.objectStore,
    proxyPath: "/api/objectstore",
    notes: "master-items.json, recipes, weapons defs",
  },
  {
    id: "ai-gateway",
    label: "AI Gateway",
    role: "ai",
    url: FLEET_URLS.ai,
    proxyPath: "/api/ai",
  },
  {
    id: "anythingllm",
    label: "AnythingLLM (local RAG)",
    role: "rag",
    url: FLEET_URLS.anythingllm,
    proxyPath: "/api/ai/rag",
    notes: "Developer API — fleet docs, ObjectStore canonical JSON, Supabase context",
  },
  {
    id: "colyseus",
    label: "Colyseus realtime (Warlords)",
    role: "realtime",
    url: FLEET_URLS.colyseus,
    notes: "Sectors, town, dungeon, home island rooms",
  },
  {
    id: "world-server",
    label: "Open world Socket.IO",
    role: "realtime",
    url: FLEET_URLS.world,
    notes: "Island PvE/PvP — DNS pending",
  },
  {
    id: "gcs",
    label: "Grudge Character Studio (GCS)",
    role: "hub",
    url: FLEET_URLS.gcs,
    notes: "HYDRA VRM + grudge6 forge — multi-era rosters (warlords, nexus, armada). Protected; not merged into Warlords /character.",
  },
  {
    id: "characters-hub",
    label: "Character creator hub (alias)",
    role: "hub",
    url: FLEET_URLS.charactersHub,
    notes: "Canonical GCS URL — character.grudge-studio.com",
  },
  {
    id: "studio-editor",
    label: "Studio Map & Model Editor",
    role: "hub",
    url: FLEET_URLS.studioEditor,
    notes: "Home-island terrain sculpt, GLB assets, Publish to Warlords",
  },
  {
    id: "grudox-hub",
    label: "GRUDOX fleet hub",
    role: "hub",
    url: FLEET_URLS.grudox,
    notes: "Arcade cabinets, editors, deploy kit — Vercel shell + CF Worker edge",
  },
  {
    id: "carrier-game",
    label: "Carrier (live PvP)",
    role: "hub",
    url: FLEET_URLS.carrier,
    notes: "Fleet command dogfight — wss same-origin /api/carrier via grudox worker",
  },
  {
    id: "grudox-game-server",
    label: "GRUDOX live game server (Railway)",
    role: "realtime",
    url: FLEET_URLS.grudoxGameServer,
    proxyPath: "/api/carrier",
    notes: "Single instance — /api/carrier, /api/space, /api/brawl; CF Worker required for WS",
  },
  {
    id: "supabase",
    label: "Supabase (edge data layer)",
    role: "supabase",
    url: "${SUPABASE_URL}",
    proxyPath: "/api/supabase",
    notes: "@supabase/server — RLS-scoped queries",
  },
  {
    id: "gameopen",
    label: "Grudge Open (game hub)",
    role: "hub",
    url: FLEET_URLS.gameopen,
    notes:
      "Open combat/studio platform — Danger Room, Voxel Editor, Ruins Brawler (3D), " +
      "Warlord Genesis, VoxGrudge native, Mimic Dungeon. " +
      "Auth via id.grudge-studio.com SSO; characters via Vercel /api/characters → Railway. " +
      "GRUDOX zone rooms at wss://voxgrudge-grudox-room-production.up.railway.app. " +
      "Repo: MolochDaGod/gameopen. Health: https://gameopen-production.up.railway.app/api/health",
  },
  {
    id: "mine-loader",
    label: "Mine-Loader / Voxel Realms (Codex SSOT)",
    role: "game-data",
    url: FLEET_URLS.mineLoaderApi,
    proxyPath: "/api/mine",
    notes:
      "Nexus voxel source of truth: Codex blocks, asset catalog, seed/chunk protocol, Realms lobby WS. " +
      "SPA " +
      FLEET_URLS.mineLoader +
      " · API " +
      FLEET_URLS.mineLoaderApi +
      " · GET /api/ssot · /api/blocks. " +
      "VoxGrudge/Open consume this catalog — do not fork. Repo: MolochDaGod/mine-loader. " +
      "Local: C:\\Users\\david\\repos\\mine-loader (junction D:\\repos\\mine-loader).",
  },
  {
    id: "mine-codex",
    label: "Mine-Loader Codex (block defs UI)",
    role: "hub",
    url: FLEET_URLS.mineCodex,
    notes: "Browser Codex UI — 250 placeable blocks. Icons via assets.grudge-studio.com.",
  },
  {
    id: "grudges-survival",
    label: "GRUDGES (Nexus survival)",
    role: "hub",
    url: FLEET_URLS.grudges,
    notes:
      "Sci-fi survival RTS/MMO — grudges.grudge-studio.com + survival.grudge-studio.com (same Vercel). " +
      "API " +
      FLEET_URLS.survivalApi +
      ". Repo: MolochDaGod/survival. Local SSOT: C:\\Users\\david\\repos\\survival.",
  },
  {
    id: "voxgrudge",
    label: "VoxGrudge open-world voxel",
    role: "hub",
    url: FLEET_URLS.voxgrudge,
    notes:
      "Open-world voxel client. Block placeables use Mine-Loader Codex (cat:<slug>). " +
      "Repo: MolochDaGod/voxgrudge.",
  },
];

export type FleetRewrite = { source: string; destination: string };

/**
 * Railway Postgres API roots — each becomes two Vercel rewrites (exact + :path*).
 * Must appear BEFORE the identity catch-all `/api/:path*`.
 */
export const FLEET_GAME_DATA_API_PREFIXES = [
  "health",
  "characters",
  "party",
  "account",
  "island",
  "islands",
  "inventory",
  "wallet",
  "nfts",
  "island-nfts",
  "professions",
  "missions",
  "player",
  "resource-nodes",
  "resources",
  "sprites",
  "generate-dungeon",
  "fleet",
  "supabase",
  "lore",
  "combat-challenges",
  "story-arcs",
  "skills",
  "sheets",
  "aseprite",
  "sprite-specs",
  "sprite-generation-jobs",
  "admin",
  "activity",
  "analytics",
  "crafting",
  "harvest",
  "combat",
  "rts",
  "discord",
  "videos",
  "races",
  "classes",
  "items",
  "spells",
  "monsters",
  "maps",
  "launcher",
  "ai-units",
  "rewards",
  /** Treaty — Grudge ID account social (friends, DMs, groups) */
  "treaty",
  "war",
  "telegram",
] as const;

/** Client SPA routes under /auth/* — must not proxy to Railway (no /api/auth/callback). */
export const FLEET_SPA_AUTH_REWRITES: readonly FleetRewrite[] = [
  { source: "/auth/callback", destination: "/index.html" },
];

/**
 * Auth rewrites for the id.grudge-studio.com hub deployment.
 * Canonical auth URL is always id.grudge-studio.com — Railway is implementation only.
 */
export function buildFleetHubAuthRewrites(
  gameData: string = FLEET_URLS.gameData,
): FleetRewrite[] {
  return [
    ...FLEET_SPA_AUTH_REWRITES,
    { source: "/api/auth/:path*", destination: `${gameData}/api/auth/:path*` },
    { source: "/auth/:path*", destination: `${gameData}/api/auth/:path*` },
    { source: "/login", destination: `${gameData}/api/auth/page` },
  ];
}

/**
 * Auth proxy for satellite fleet apps (three-port, rts-grudge, etc.).
 * All auth traffic goes to id.grudge-studio.com — no parallel auth systems.
 */
export function buildFleetAuthProxyRewrites(
  auth: string = FLEET_URLS.auth,
): FleetRewrite[] {
  return [
    ...FLEET_SPA_AUTH_REWRITES,
    { source: "/api/auth/:path*", destination: `${auth}/api/auth/:path*` },
    { source: "/auth/:path*", destination: `${auth}/auth/:path*` },
    { source: "/login", destination: `${auth}/login` },
  ];
}

/**
 * Satellite game deployments (three-port, rts-grudge, arena, …).
 * Auth always proxies to id.grudge-studio.com; game-data for character/account sync.
 */
export function buildFleetSatelliteRewrites(
  auth: string = FLEET_URLS.auth,
  gameData: string = FLEET_URLS.gameData,
): FleetRewrite[] {
  return [
    ...buildFleetAuthProxyRewrites(auth),
    { source: "/api/characters", destination: `${gameData}/api/characters` },
    { source: "/api/characters/:path*", destination: `${gameData}/api/characters/:path*` },
    { source: "/api/account", destination: `${gameData}/api/account` },
    { source: "/api/account/:path*", destination: `${gameData}/api/account/:path*` },
    /** Wallet + GBUX — same account purse in every game */
    { source: "/api/wallet", destination: `${gameData}/api/wallet` },
    { source: "/api/wallet/:path*", destination: `${gameData}/api/wallet/:path*` },
    { source: "/api/nfts", destination: `${gameData}/api/nfts` },
    { source: "/api/nfts/:path*", destination: `${gameData}/api/nfts/:path*` },
    /** Treaty social SSOT — friends, DMs, groups, server chat for every fleet game */
    { source: "/api/treaty", destination: `${gameData}/api/treaty` },
    { source: "/api/treaty/:path*", destination: `${gameData}/api/treaty/:path*` },
    { source: "/api/fleet", destination: `${gameData}/api/fleet` },
    { source: "/api/fleet/:path*", destination: `${gameData}/api/fleet/:path*` },
    { source: "/api/health", destination: `${gameData}/api/health` },
  ];
}

export const FLEET_SATELLITE_VERCEL_REWRITES: readonly FleetRewrite[] = buildFleetSatelliteRewrites();

/** Build Railway game-data rewrites (defaults to FLEET_URLS.gameData). */
export function buildFleetGameDataRewrites(
  gameData: string = FLEET_URLS.gameData,
): FleetRewrite[] {
  const rules: FleetRewrite[] = [];
  for (const prefix of FLEET_GAME_DATA_API_PREFIXES) {
    rules.push(
      { source: `/api/${prefix}`, destination: `${gameData}/api/${prefix}` },
      { source: `/api/${prefix}/:path*`, destination: `${gameData}/api/${prefix}/:path*` },
    );
  }
  /** Legacy: /api/game/missions → Railway /api/missions */
  rules.push({ source: "/api/game/:path*", destination: `${gameData}/api/:path*` });
  return rules;
}

/** Vercel rewrite templates — copy into any Grudge game vercel.json (order matters). */
export const FLEET_VERCEL_REWRITES: readonly FleetRewrite[] = [
  { source: "/api/assets/:path*", destination: `${FLEET_URLS.assets}/:path*` },
  { source: "/sprites/:path*", destination: `${FLEET_URLS.assets}/sprites/:path*` },
  { source: "/icons/:path*", destination: `${FLEET_URLS.assets}/icons/:path*` },
  { source: "/videos/:path*", destination: `${FLEET_URLS.assets}/videos/:path*` },
  { source: "/fonts/:path*", destination: `${FLEET_URLS.assets}/fonts/:path*` },
  { source: "/models/:path*", destination: `${FLEET_URLS.assets}/models/:path*` },
  { source: "/api/objectstore/:path*", destination: "https://objectstore.grudge-studio.com/api/:path*" },
  ...buildFleetGameDataRewrites(),
  ...buildFleetHubAuthRewrites(),
  { source: "/api/ai/gateway/:path*", destination: `${FLEET_URLS.gameData}/api/ai/gateway/:path*` },
  { source: "/api/ai/rag/:path*", destination: `${FLEET_URLS.gameData}/api/ai/rag/:path*` },
  { source: "/api/ai/ollama/:path*", destination: `${FLEET_URLS.gameData}/api/ai/ollama/:path*` },
  { source: "/api/ai/:path*", destination: `${FLEET_URLS.ai}/:path*` },
  { source: "/api/:path*", destination: `${FLEET_URLS.identityApi}/api/:path*` },
];

export const CROSSMINT_COLLECTIONS = {
  character: "5061318d-ff65-4893-ac4b-9b28efb18ace",
  island: "a8f3e2d1-4b5c-6d7e-8f9a-0b1c2d3e4f5a",
} as const;