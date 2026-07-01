/**
 * Fleet storage bindings — canonical env keys + public URLs for Postgres, R2, D1, Supabase.
 * Server/worker code reads secrets from process.env using these keys.
 * Browser apps use same-origin /api/* proxies (see manifest FLEET_VERCEL_REWRITES).
 */
import { FLEET_URLS } from "./manifest";

export const FLEET_STORAGE = {
  /** Railway Postgres — game-state SSOT (characters, islands, wallet, inventory). */
  postgres: {
    role: "game-data" as const,
    envKey: "DATABASE_URL",
    healthPath: "/api/health",
    serviceUrl: FLEET_URLS.gameData,
  },
  /** Cloudflare R2 — binary assets (models, textures, sprites, video). */
  r2: {
    cdnUrl: FLEET_URLS.assets,
    buckets: {
      assets: "grudge-assets",
      objectstore: "objectstore-assets",
    },
    env: {
      accountId: "CLOUDFLARE_ACCOUNT_ID",
      s3Endpoint: "R2_S3_ENDPOINT",
      accessKeyId: "R2_ACCESS_KEY_ID",
      secretAccessKey: "R2_SECRET_ACCESS_KEY",
      legacyAccessKey: "OBJECT_STORAGE_KEY",
      legacySecretKey: "OBJECT_STORAGE_SECRET",
      publicCdnUrl: "OBJECT_STORAGE_PUBLIC_URL",
      publicDevUrl: "OBJECT_STORAGE_PUBLIC_R2_URL",
      workerUrl: "OBJECTSTORE_WORKER_URL",
      workerApiKey: "OBJECTSTORE_API_KEY",
      workerDeployToken: "CF_WORKER_R2_API",
      bucketAssets: "R2_BUCKET_ASSETS",
      bucketObjectstore: "R2_BUCKET_OBJECTSTORE",
    },
  },
  /** Cloudflare D1 — ObjectStore Worker metadata / search indexes. */
  d1: {
    role: "objectstore" as const,
    envKey: "CLOUDFLARE_D1_OBJECTSTORE_ID",
    workerBinding: "DB",
    workerUrl: "https://objectstore.grudge-studio.com",
  },
  /** ObjectStore JSON catalogs (weapons, items, recipes) — R2-backed, D1-indexed. */
  objectStore: {
    jsonApiUrl: FLEET_URLS.objectStore,
    workerUrl: "https://objectstore.grudge-studio.com",
    browserProxyPath: "/api/objectstore/v1",
    deprecatedHosts: ["molochdagod.github.io", "grudge-objectstore.pages.dev"],
  },
  /** Supabase edge layer — proxied via Railway /api/supabase on Vercel apps. */
  supabase: {
    urlEnvKey: "SUPABASE_URL",
    publishableKeyEnvKey: "SUPABASE_PUBLISHABLE_KEY",
    secretKeyEnvKey: "SUPABASE_SECRET_KEY",
    serviceKeyEnvKey: "SUPABASE_SERVICE_KEY",
    jwksUrlEnvKey: "SUPABASE_JWKS_URL",
    proxyPath: "/api/supabase",
  },
} as const;

/** Canonical Vite/Vercel client env defaults — mirror in vercel.json `env`. */
export const FLEET_CLIENT_ENV = {
  VITE_API_URL: FLEET_URLS.identityApi,
  VITE_GAME_DATA_API: FLEET_URLS.gameData,
  VITE_COLYSEUS_URL: FLEET_URLS.colyseus,
  VITE_ASSETS_URL: FLEET_URLS.assets,
  VITE_OBJECTSTORE_URL: FLEET_URLS.objectStore,
  VITE_AUTH_GATEWAY_URL: FLEET_URLS.auth,
  VITE_AI_URL: FLEET_URLS.ai,
  VITE_PVP_SERVER_URL: FLEET_URLS.world,
} as const;