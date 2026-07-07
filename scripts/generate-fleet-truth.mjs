/**
 * Emit ObjectStore fleet-truth.json from shared/fleet/manifest.ts + truthProbes.ts.
 *
 * Usage:
 *   npx tsx scripts/generate-fleet-truth.mjs
 *   npx tsx scripts/generate-fleet-truth.mjs --out path/to/fleet-truth.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const {
  FLEET_URLS,
  FLEET_SERVICES,
  FLEET_GAME_DATA_API_PREFIXES,
  THE_ENGINE_RAILWAY,
  IDENTITY_PORTAL,
} = await import("../shared/fleet/manifest.ts");
const { TRUTH_PROBE_SPECS, TRUTH_DEPRECATED_HOSTS } = await import(
  "../shared/fleet/truthProbes.ts"
);
const {
  FLEET_AUTH_WIRING_GUIDE,
  FLEET_AUTH_RAILWAY_ROUTES,
  FLEET_AUTH_PROXY_PATHS,
  FLEET_AUTH_SYMPTOM_FIXES,
  buildAuthConnectProbes,
} = await import("../shared/fleet/authConnect.ts");

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const defaultOut = path.resolve(
  root,
  "..",
  "ObjectStore",
  "api",
  "v1",
  "_meta",
  "fleet-truth.json",
);
const outPath = outIdx >= 0 && args[outIdx + 1] ? path.resolve(args[outIdx + 1]) : defaultOut;

/** Edge workers observed on CF account ee475864… — update via generate after deploy. */
const EDGE_WORKERS = [
  { id: "grudge-asset-cdn", domain: "assets.grudge-studio.com", role: "R2 binary CDN" },
  { id: "grudge-objectstore-api", domain: "objectstore.grudge-studio.com", role: "JSON catalog + search" },
  { id: "grudge-identity-api", domain: "id.grudge-studio.com", role: "Identity edge" },
  { id: "grudge-ai-hub", domain: "ai.grudge-studio.com", role: "AI gateway (D1 grudge-ai-hub)" },
  { id: "grudge-legion-ai", domain: "legion-ai.grudge-studio.com", role: "Legion agent personas" },
  { id: "grudge-fleet-harbor", domain: "grudox.grudge-studio.com", role: "Fleet harbor / deploy kit" },
  { id: "grudge-game-servers", domain: "world.grudge-studio.com", role: "Live game server routing" },
  { id: "grudge-asset-api-production", domain: null, role: "Legacy RTS asset registry API" },
];

function serviceRow(s) {
  const row = {
    id: s.id,
    role: s.role,
    domain: s.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    proxy: s.proxyPath ?? undefined,
    notes: s.notes,
  };
  if (s.id === "game-data") {
    row.database = "PostgreSQL (Railway)";
  }
  if (s.id === "assets-cdn") {
    row.storage = "R2 grudge-assets";
  }
  if (s.id === "objectstore") {
    row.database = "D1 grudge-objectstore + R2";
  }
  if (s.id === "identity-api") {
    row.implementation = THE_ENGINE_RAILWAY;
    row.notes =
      "Portal shell — /api/:path* rewrites to The-ENGINE Railway. Do NOT use api.grudge-studio.com (deprecated).";
  }
  return row;
}

const hubDomains = {
  "grudgewarlords.com": "Grudge Warlords primary",
  "client.grudge-studio.com": "Studio client alias",
  "wcs.grudge-studio.com": "WCS character shell",
  "forge.grudge-studio.com": "RTS-Grudge / Studio Forge",
  "character.grudge-studio.com": "GCS character studio",
  "warlord-genesis.vercel.app": "Warlord Genesis RTS client (Vercel)",
  "grudox.grudge-studio.com": "GRUDOX fleet hub",
  "carrier.grudge-studio.com": "Carrier live PvP",
};

const payload = {
  version: "1.2.0",
  generated: new Date().toISOString(),
  description:
    "Grudge Studio fleet ONE TRUTH — canonical domains, API roles, contracts, probe manifest, and Legion context",
  ssot: {
    code: "GrudgeBuilder/shared/fleet/manifest.ts",
    storage: "GrudgeBuilder/shared/fleet/storage.ts",
    probes: "GrudgeBuilder/shared/fleet/truthProbes.ts",
    vercelSync: "GrudgeBuilder/scripts/sync-vercel-fleet.mjs",
    generate: "GrudgeBuilder/scripts/generate-fleet-truth.mjs",
    verify: "GrudgeBuilder/scripts/verify-fleet-truth.mjs",
    probeCli: "GrudgeBuilder/scripts/probe-truth-fleet.ts",
    grudge6FleetUrls: "grudge6/lib/fleet-urls/src/index.ts",
  },
  communication: {
    legionHub: FLEET_URLS.ai,
    legionAgent: "https://legion-ai.grudge-studio.com",
    fleetHarbor: FLEET_URLS.grudox,
    gameDataManifest: `${FLEET_URLS.gameData}/api/fleet/manifest`,
    truthAuditApi: `${FLEET_URLS.gameData}/api/fleet/truth-audit`,
    publishedTruth: `${FLEET_URLS.objectStore.replace("/api/v1", "")}/api/v1/_meta/fleet-truth.json`,
    devToolLegion: "grudge-dev-tool → ai.grudge-studio.com (fleet API key)",
  },
  services: FLEET_SERVICES.map(serviceRow),
  edgeWorkers: EDGE_WORKERS,
  contracts: [
    {
      id: "home-island-spec",
      version: "2.0.0",
      code: "GrudgeBuilder/shared/definitions/homeIslandSpec.ts",
      liveApi: `${FLEET_URLS.gameData}/api/island/spec`,
      browserProxy: "/api/island/spec",
      objectStoreMirror: "api/v1/home-island-contract.json",
    },
    {
      id: "home-island-wiring",
      path: "api/v1/_meta/warlords-integration-wiring.json",
    },
    { id: "games-library", path: "api/v1/games-library.json" },
    { id: "master-items", path: "api/v1/master-items.json" },
    { id: "character-equip", path: `${FLEET_URLS.gameData}/api/characters/:id/equip`, method: "POST" },
  ],
  probes: TRUTH_PROBE_SPECS.map((p) => p.id),
  railwayAuthPaths: [
    "popup-token",
    "grudge-bridge",
    "session/exchange",
    "puter",
    "guest",
    "login",
    "register",
    "me",
    "verify",
    "wallet",
  ],
  gameDataApiPrefixes: [...FLEET_GAME_DATA_API_PREFIXES],
  deprecated: {
    hosts: [...TRUTH_DEPRECATED_HOSTS, "api.grudge-studio.com"],
    apiGrudgeStudio:
      "TLS dead / tunnel removed — use grudge-studio.com (portal) + Railway game-data SSOT",
    mirrorOnly: "https://molochdagod.github.io/ObjectStore/api/v1",
    replacement: "https://objectstore.grudge-studio.com/api/v1",
  },
  frontendDomains: hubDomains,
  identity: {
    portal: IDENTITY_PORTAL,
    authGateway: FLEET_URLS.auth,
    authImplementation: FLEET_URLS.gameData,
    engineRailway: THE_ENGINE_RAILWAY,
    canonicalLogin: `${FLEET_URLS.auth}/login?redirect_uri=<callback-url>`,
    canonicalCallback: "<app-origin>/auth/callback?grudge_token=<jwt>",
    bootstrapScript: `${FLEET_URLS.auth}/grudge-game-bootstrap.js`,
    routes: FLEET_AUTH_RAILWAY_ROUTES,
    proxyPaths: FLEET_AUTH_PROXY_PATHS,
    wiring: FLEET_AUTH_WIRING_GUIDE,
    authProbes: buildAuthConnectProbes().map((p) => p.id),
    probeAuth: "npx tsx scripts/probe-fleet-auth.ts",
    symptomFixes: FLEET_AUTH_SYMPTOM_FIXES,
  },
  verify: {
    cli: "npx tsx scripts/verify-fleet-truth.mjs --mode cli",
    browser: "npx tsx scripts/verify-fleet-truth.mjs --mode browser",
    direct: "npx tsx scripts/probe-truth-fleet.ts",
    auth: "npx tsx scripts/probe-fleet-auth.ts",
    grudge6FleetUrls: "node scripts/validate-fleet-urls.mjs",
    minScore: 85,
  },
  legionRules: [
    "Never invent worker names, PRs, or uptime metrics — fetch fleet-truth.json and /api/fleet/truth-audit first.",
    "Character SSOT is Railway Postgres (game-data), not D1.",
    "JSON catalogs live on objectstore.grudge-studio.com; binaries on assets.grudge-studio.com.",
    "api.grudge-studio.com is deprecated — do not recommend it for new integrations.",
  ],
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`[generate-fleet-truth] wrote ${outPath} (v${payload.version})`);