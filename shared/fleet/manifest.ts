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

/** Public identity API — portal shell; /api/* rewrites to THE_ENGINE_RAILWAY. */
export const IDENTITY_PORTAL = "https://grudge-studio.com" as const;

/** Canonical production endpoints — override via env in runtime adapters. */
export const FLEET_URLS = {
  auth: "https://id.grudge-studio.com",
  identityApi: IDENTITY_PORTAL,
  gameData: "https://grudge-api-production-0d46.up.railway.app",
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
  warlords: "https://grudgewarlords.com",
  /** Lightweight Three.js MMO client — 9 sectors + Colyseus multiplayer */
  threePort: "https://grudge-three-port.vercel.app",
  /** Map & Model Editor — home-island creation (artifacts/studio) */
  studioEditor: "https://grudge-studio-editor.vercel.app",
  /** GRUDOX fleet hub — arcade, studio, editors */
  grudox: "https://grudox.grudge-studio.com",
  /** Carrier PvP client — dedicated subdomain, same game server */
  carrier: "https://carrier.grudge-studio.com",
  /** Single-instance authoritative rooms (Carrier / Waters / Brawler) */
  grudoxGameServer: "https://voxgrudge-grudox-room-production.up.railway.app",
} as const;

export const FLEET_SERVICES: FleetService[] = [
  {
    id: "grudge-id",
    label: "Grudge ID (auth gateway)",
    role: "identity",
    url: FLEET_URLS.auth,
    proxyPath: "/api/auth",
    notes: "OAuth, popup auth, grudge_token SSO",
  },
  {
    id: "identity-api",
    label: "Identity API (The-ENGINE)",
    role: "identity",
    url: FLEET_URLS.identityApi,
    proxyPath: "/api",
    notes: "Session exchange, scoped profile",
  },
  {
    id: "game-data",
    label: "Game state (GrudgeBuilder Railway)",
    role: "game-data",
    url: FLEET_URLS.gameData,
    proxyPath: "/api/characters",
    notes: "Postgres SSOT — characters, wallet, islands, inventory",
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
] as const;

/**
 * Auth rewrites for the id.grudge-studio.com hub deployment.
 * Canonical auth URL is always id.grudge-studio.com — Railway is implementation only.
 */
export function buildFleetHubAuthRewrites(
  gameData: string = FLEET_URLS.gameData,
): FleetRewrite[] {
  return [
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