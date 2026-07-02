/**
 * Grudge Studio — database & store connection map (NO SECRETS).
 * Source of truth for scripts/show-db-connections.ps1 and workers/db-connections.
 */

export type DbEngine =
  | "postgres"
  | "mysql"
  | "neon"
  | "supabase"
  | "d1"
  | "r2"
  | "kv"
  | "puter"
  | "json-api"
  | "none";

export interface DbConnectionRef {
  /** Env var name that holds the connection string (never the value). */
  envVar?: string;
  engine: DbEngine;
  host?: string;
  database?: string;
  projectId?: string;
  railwayProjectId?: string;
  railwayService?: string;
  d1Name?: string;
  d1Id?: string;
  url?: string;
  role: string;
  notes?: string;
}

export interface SystemDbMap {
  id: string;
  label: string;
  liveUrl?: string;
  connections: DbConnectionRef[];
}

export const DB_CONNECTIONS_VERSION = 1;

export const RAILWAY_PROJECTS = {
  grudachainAle: {
    id: "8baba990-48ca-4a5b-9a8a-8f35a7e0b9b6",
    name: "grudachain-ale",
    env: "production",
    envId: "3c48b074-9b26-4299-a335-5efb557a78db",
  },
  grudgeStudioApi: {
    id: "0d86a4c6-4990-45b0-ad81-56ac4f994a86",
    name: "grudge-studio-api",
    services: { grudgeApi: "grudge-api" },
  },
  grudgeWarlordsDb: {
    id: "727c599a-836a-4d8b-a893-9da7974c606f",
    name: "grudge-warlords-db",
    services: { grudgeBuilder: "Grudge-Builder" },
  },
} as const;

export const D1_DATABASES = {
  grudgeAiHub: { name: "grudge-ai-hub", id: "42ada55e-2095-46da-840b-6bb301a57253" },
  grudgeObjectstore: { name: "grudge-objectstore", id: "8fc367a8-9120-490e-a503-b0fcb755c044" },
  grudgeAssetsDb: { name: "grudge-assets-db", id: "3eeadd9e-832d-4d2e-bb14-8ddf75b3ac59" },
  grudgeGameState: { name: "grudge-game-state", id: "9b66919f-c94a-4ddd-8733-07896261df6a" },
} as const;

export const SUPABASE_PROJECT = {
  name: "GrudgeWarlords",
  ref: "rdbkhvrpavhptxrmmwrc",
  url: "https://rdbkhvrpavhptxrmmwrc.supabase.co",
} as const;

export const NEON_HOST =
  "ep-lingering-bread-ahed03o6-pooler.c-3.us-east-1.aws.neon.tech";

/** Static manifest — safe to expose publicly (no credentials). */
export const SYSTEM_DB_MAPS: SystemDbMap[] = [
  {
    id: "ale",
    label: "ALE (grudachain-ale)",
    liveUrl: "https://ale.grudge-studio.com",
    connections: [
      {
        engine: "none",
        railwayProjectId: RAILWAY_PROJECTS.grudachainAle.id,
        railwayService: "ale",
        role: "Public proxy - no SQL database",
        notes: "Telegram/Discord webhooks, AnythingLLM proxy, Game API client",
      },
      {
        envVar: "PGVECTOR_CONNECTION_STRING",
        engine: "neon",
        host: NEON_HOST,
        database: "neondb",
        railwayProjectId: RAILWAY_PROJECTS.grudachainAle.id,
        railwayService: "anythingllm",
        role: "AnythingLLM vector embeddings (pgvector)",
        notes: "VECTOR_DB=pgvector on anythingllm Railway service",
      },
      {
        engine: "json-api",
        url: "https://the-engine.up.railway.app",
        role: "Identity API (The-ENGINE)",
        notes: "IDENTITY_API_URL - not a direct DB connection",
      },
      {
        engine: "puter",
        url: "https://grudge-studio.puter.site",
        role: "Puter cloud FS / KV",
      },
      {
        engine: "supabase",
        url: SUPABASE_PROJECT.url,
        projectId: SUPABASE_PROJECT.ref,
        envVar: "SUPABASE_SECRET_KEY",
        role: "Supabase (Grudge Dev Admin skill queries)",
      },
    ],
  },
  {
    id: "grudge-builder",
    label: "GrudgeBuilder backend",
    liveUrl: "https://grudge-api-production-0d46.up.railway.app",
    connections: [
      {
        envVar: "DATABASE_URL",
        engine: "neon",
        host: NEON_HOST,
        database: "neondb",
        railwayProjectId: RAILWAY_PROJECTS.grudgeStudioApi.id,
        railwayService: "grudge-api",
        role: "Postgres SSOT - Drizzle schema (characters, islands, wallet, inventory)",
        notes: "Authoritative game state; also GRUDGE_ACCOUNT_DB / _UNPOOLED for migrations",
      },
      {
        engine: "supabase",
        url: SUPABASE_PROJECT.url,
        projectId: SUPABASE_PROJECT.ref,
        envVar: "SUPABASE_URL",
        role: "Supabase auth spine (Phase 1)",
        notes: "Publishable + secret keys in .env - never expose secret to browser",
      },
      {
        envVar: "MYSQL_DATABASE",
        engine: "mysql",
        host: "74.208.155.229",
        database: "grudge_game",
        role: "Legacy VPS MySQL game tables",
        notes: "Parallel to Postgres - audit which tables live where",
      },
      {
        engine: "d1",
        d1Name: D1_DATABASES.grudgeObjectstore.name,
        d1Id: D1_DATABASES.grudgeObjectstore.id,
        role: "ObjectStore search index (Cloudflare D1)",
      },
      {
        engine: "r2",
        url: "https://assets.grudge-studio.com",
        role: "Binary assets bucket grudge-assets",
      },
      {
        engine: "json-api",
        url: "https://objectstore.grudge-studio.com/api/v1",
        role: "JSON game defs (races, weapons, recipes)",
      },
      {
        engine: "puter",
        url: "https://grudge-studio.puter.site",
        role: "Puter KV cache (not SSOT)",
        notes: "Write Railway first, then cache",
      },
    ],
  },
  {
    id: "grudge-warlords",
    label: "Grudge Warlords (game client)",
    liveUrl: "https://grudgewarlords.com",
    connections: [
      {
        engine: "none",
        role: "No direct database - frontend only",
        notes: "All persistence via API rewrites in vercel.json",
      },
      {
        engine: "json-api",
        url: "https://grudge-api-production-0d46.up.railway.app",
        role: "Game state API (proxied /api/characters, /api/island, /api/wallet, ...)",
      },
      {
        engine: "json-api",
        url: "https://id.grudge-studio.com",
        role: "Grudge ID auth",
      },
      {
        engine: "json-api",
        url: "https://objectstore.grudge-studio.com/api/v1",
        role: "Static game definitions JSON",
      },
      {
        engine: "r2",
        url: "https://assets.grudge-studio.com",
        role: "Sprites, models, audio CDN",
      },
      {
        engine: "puter",
        role: "Puter KV + localStorage offline cache",
      },
      {
        engine: "json-api",
        url: "wss://grudge-api-production-0d46.up.railway.app",
        role: "Colyseus realtime rooms",
      },
    ],
  },
];

export function buildDbConnectionsPayload() {
  return {
    version: DB_CONNECTIONS_VERSION,
    generated_at: new Date().toISOString(),
    warning: "Metadata only - never contains passwords or API keys",
    workers: {
      dbConnections: "https://db.grudge-studio.com/v1/connections",
      aiGateway: "https://ai-gateway.grudge-studio.com",
      aiHub: "https://ai.grudge-studio.com",
    },
    supabase: SUPABASE_PROJECT,
    neon: { host: NEON_HOST, database: "neondb" },
    railway_projects: RAILWAY_PROJECTS,
    d1: D1_DATABASES,
    systems: SYSTEM_DB_MAPS,
  };
}