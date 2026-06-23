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

/** Canonical production endpoints — override via env in runtime adapters. */
export const FLEET_URLS = {
  auth: "https://id.grudge-studio.com",
  identityApi: "https://api.grudge-studio.com",
  gameData: "https://grudge-builder-production.up.railway.app",
  assets: "https://assets.grudge-studio.com",
  objectStore: "https://info.grudge-studio.com/api/v1",
  ai: "https://ai.grudge-studio.com",
  /** Local AnythingLLM desktop — dev RAG over fleet + ObjectStore docs */
  anythingllm: "http://localhost:3001/api",
  colyseus: "wss://api.grudge-studio.com",
  world: "wss://world.grudge-studio.com",
  charactersHub: "https://characters.grudge-studio.com",
  warlords: "https://grudgewarlords.com",
  /** Map & Model Editor — home-island creation (artifacts/studio) */
  studioEditor: "https://grudge-studio-editor.vercel.app",
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
    id: "characters-hub",
    label: "Character creator hub",
    role: "hub",
    url: FLEET_URLS.charactersHub,
    notes: "grudge6 playground + weapons mastery",
  },
  {
    id: "studio-editor",
    label: "Studio Map & Model Editor",
    role: "hub",
    url: FLEET_URLS.studioEditor,
    notes: "Home-island terrain sculpt, GLB assets, Publish to Warlords",
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

/** Vercel rewrite templates — copy into any Grudge game vercel.json */
export const FLEET_VERCEL_REWRITES = [
  { source: "/api/assets/:path*", destination: `${FLEET_URLS.assets}/:path*` },
  { source: "/api/objectstore/:path*", destination: "https://info.grudge-studio.com/api/:path*" },
  { source: "/api/characters", destination: `${FLEET_URLS.gameData}/api/characters` },
  { source: "/api/characters/:path*", destination: `${FLEET_URLS.gameData}/api/characters/:path*` },
  { source: "/api/wallet/:path*", destination: `${FLEET_URLS.gameData}/api/wallet/:path*` },
  { source: "/api/nfts/:path*", destination: `${FLEET_URLS.gameData}/api/nfts/:path*` },
  { source: "/api/island/:path*", destination: `${FLEET_URLS.gameData}/api/island/:path*` },
  { source: "/api/islands/:path*", destination: `${FLEET_URLS.gameData}/api/islands/:path*` },
  { source: "/api/account", destination: `${FLEET_URLS.gameData}/api/account` },
  { source: "/api/account/:path*", destination: `${FLEET_URLS.gameData}/api/account/:path*` },
  { source: "/api/inventory/:path*", destination: `${FLEET_URLS.gameData}/api/inventory/:path*` },
  { source: "/api/party/:path*", destination: `${FLEET_URLS.gameData}/api/party/:path*` },
  { source: "/api/fleet/:path*", destination: `${FLEET_URLS.gameData}/api/fleet/:path*` },
  { source: "/api/supabase/:path*", destination: `${FLEET_URLS.gameData}/api/supabase/:path*` },
  { source: "/api/auth/puter", destination: `${FLEET_URLS.gameData}/api/auth/puter` },
  { source: "/api/auth/login", destination: `${FLEET_URLS.gameData}/api/auth/login` },
  { source: "/api/auth/register", destination: `${FLEET_URLS.gameData}/api/auth/register` },
  { source: "/api/auth/me", destination: `${FLEET_URLS.gameData}/api/auth/me` },
  { source: "/api/auth/verify", destination: `${FLEET_URLS.gameData}/api/auth/verify` },
  { source: "/api/auth/session/exchange", destination: `${FLEET_URLS.identityApi}/api/auth/session/exchange` },
  { source: "/api/auth/:path*", destination: `${FLEET_URLS.auth}/auth/:path*` },
  { source: "/api/ai/:path*", destination: `${FLEET_URLS.ai}/:path*` },
  { source: "/api/:path*", destination: `${FLEET_URLS.identityApi}/api/:path*` },
] as const;

export const CROSSMINT_COLLECTIONS = {
  character: "5061318d-ff65-4893-ac4b-9b28efb18ace",
  island: "a8f3e2d1-4b5c-6d7e-8f9a-0b1c2d3e4f5a",
} as const;