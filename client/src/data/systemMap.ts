import { FLEET_URLS } from "@shared/fleet";

/** Canonical Postgres game-state API (characters, wallet, islands, inventory). */
const GAME_DATA_API = FLEET_URLS.gameData;

/**
 * Grudge Studio System Map
 * ------------------------
 * Single source of truth for the Grudge Studio ecosystem graph.
 * Used by:
 *   - /organizer page (flow chart, readiness, issues tabs)
 *   - Grudge-Studio-Mission docs (exported as docs/system-map.json)
 *
 * Keep this file in sync with:
 *   - client/src/App.tsx            (frontend routes)
 *   - vercel.json                    (api rewrites)
 *   - README.md                      (live/planned services)
 */

export type NodeKind =
  | "domain"
  | "service"
  | "frontendRoute"
  | "apiRewrite"
  | "backendEndpoint"
  | "dataSource"
  | "repo";

export type NodeStatus = "live" | "planned" | "broken" | "deprecated";

export interface SystemNode {
  id: string;
  label: string;
  kind: NodeKind;
  status: NodeStatus;
  /** Logical grouping for the hierarchy view (e.g. "auth", "game-api", "frontend", "assets"). */
  group: string;
  owner?: string;
  repo?: string;
  url?: string;
  notes?: string;
  /** ISO date string the node was last verified live. */
  lastVerified?: string;
}

export type EdgeKind =
  | "redirects-to"
  | "routes-to"
  | "calls"
  | "rewrites-to"
  | "reads"
  | "writes"
  | "authenticates-via"
  | "deploys-from";

export interface SystemEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  notes?: string;
}

export type CheckStatus = "ok" | "missing" | "n/a" | "unknown";

export interface ReadinessRow {
  serviceId: string;
  https: CheckStatus;
  healthEndpoint?: string;
  cors: CheckStatus;
  authRequired: CheckStatus;
  rateLimit: CheckStatus;
  observability: CheckStatus;
  backup: CheckStatus;
  runbook?: string;
  owner?: string;
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------
const domains: SystemNode[] = [
  { id: "dom:grudgewarlords.com", label: "grudgewarlords.com", kind: "domain", status: "live", group: "frontend", url: "https://grudgewarlords.com", notes: "Grudge Warlords (this repo, GrudgeBuilder). Three.js stack, Vercel." },
  { id: "dom:client.g-s.com",     label: "client.grudge-studio.com", kind: "domain", status: "live", group: "frontend", url: "https://client.grudge-studio.com", notes: "Vercel alias for Grudge Warlords (this repo) — see vercel.json." },
  { id: "dom:grudge-studio.com",  label: "grudge-studio.com",         kind: "domain", status: "live", group: "portal",   url: "https://grudge-studio.com", notes: "Grudge Studio client portal shell. Backed by The-ENGINE on Vercel; retro library remains reachable under /games but is no longer the primary identity." },
  { id: "dom:gst", label: "grudge-studio.com/gst", kind: "domain", status: "live", group: "games", url: "https://grudge-studio.com/gst", notes: "Game Studio Tool / Grudge Islands. Fleet SSO app=gst → id.grudge-studio.com; callback /gst/auth/callback; same-origin /api → ID + Railway account/characters (shared bag). Vercel project grudge-studio-tool; portal rewrite /gst/*.", lastVerified: "2026-08-05" },
  { id: "dom:gst-vercel", label: "grudge-studio-tool.vercel.app", kind: "domain", status: "live", group: "games", url: "https://grudge-studio-tool.vercel.app", notes: "GST satellite deploy (same SPA as /gst). Host allowlisted via .vercel.app; product label Grudge Studio Tool.", lastVerified: "2026-08-05" },
  { id: "dom:engine.g-s.com",     label: "engine.grudge-studio.com",  kind: "domain", status: "planned", group: "engine",   url: "https://engine.grudge-studio.com", notes: "RECLAIMED 2026-04-22: previously Babylon (retired). Will host the Three.js-based Grudge Game Engine (fork of github.com/mrdoob/three.js/tree/master/editor, improved). Same build as grudgestudio.puter.site; shared scene + account layer." },
  { id: "dom:grudge-engine.vercel.app", label: "grudge-engine-web.vercel.app", kind: "domain", status: "deprecated", group: "engine", url: "https://grudge-engine-web.vercel.app", notes: "DEPRECATED 2026-04-22: Babylon Vercel preview. Retire." },
  { id: "dom:id.g-s.com",         label: "id.grudge-studio.com",     kind: "domain", status: "live", group: "auth",    url: "https://id.grudge-studio.com" },
  { id: "dom:api.g-s.com",        label: "api.grudge-studio.com",    kind: "domain", status: "deprecated", group: "backend", url: "https://api.grudge-studio.com/api/health", notes: "DEPRECATED for browser clients (CORS rejects X-Grudge-Token). Health still 200 — do not hardcode from SPA. Use same-origin /api/* → Railway.", lastVerified: "2026-07-12" },
  { id: "dom:game-data.railway",  label: "grudge-api-production (Railway)", kind: "domain", status: "live", group: "backend", url: `${GAME_DATA_API}/api/health`, notes: "Postgres SSOT for characters, wallet, islands, inventory. Proxied same-origin as /api/characters|wallet|account|…", lastVerified: "2026-07-12" },
  { id: "dom:account.g-s.com",    label: "account.grudge-studio.com",kind: "domain", status: "deprecated", group: "backend", url: "https://account.grudge-studio.com/api/health", notes: "Secondary host. /health 404 — use /api/health (200). Prefer Railway same-origin /api/account.", lastVerified: "2026-07-12" },
  { id: "dom:assets.g-s.com",     label: "assets.grudge-studio.com", kind: "domain", status: "live", group: "assets",  url: "https://assets.grudge-studio.com", notes: "R2 CDN binaries.", lastVerified: "2026-07-12" },
  { id: "dom:objectstore.g-s.com",label: "objectstore.grudge-studio.com", kind: "domain", status: "live", group: "assets", url: "https://objectstore.grudge-studio.com/health", notes: "ObjectStore Worker + JSON API (catalog SSOT). Not the same host as info.", lastVerified: "2026-07-12" },
  { id: "dom:dash.g-s.com",       label: "dash.grudge-studio.com",   kind: "domain", status: "live", group: "admin",   url: "https://dash.grudge-studio.com", lastVerified: "2026-07-12" },
  { id: "dom:ai.g-s.com",         label: "ai.grudge-studio.com",     kind: "domain", status: "live", group: "ai",      url: "https://ai.grudge-studio.com/health", notes: "Fixed 2026-07-12: redeployed grudge-ai-hub domain worker — root UI HTML + /health JSON. Prefer /health for probes; /v1/* requires auth.", lastVerified: "2026-07-12" },
  { id: "dom:objectstore.gh",     label: "grudge-objectstore.pages.dev", kind: "domain", status: "deprecated", group: "assets", url: "https://grudge-objectstore.pages.dev", notes: "DEPRECATED: Use objectstore.grudge-studio.com for game catalog JSON. pages.dev kept as read-only fallback." },
  { id: "dom:ws.g-s.com",         label: "ws.grudge-studio.com",     kind: "domain", status: "planned", group: "realtime", notes: "Not a real WS product yet — probe 2026-07-12 redirects (302) to grudge-studio.com HTML. Colyseus remains code-only / Railway-bound.", lastVerified: "2026-07-12" },
  { id: "dom:launcher.g-s.com",   label: "launcher.grudge-studio.com", kind: "domain", status: "live", group: "launcher", url: "https://launcher.grudge-studio.com", notes: "LIVE (HTML 200, 2026-07-12). Was planned; shell is up — verify entitlements/API before marketing as full launcher.", lastVerified: "2026-07-12" },
  { id: "dom:status.g-s.com",     label: "status.grudge-studio.com", kind: "domain", status: "planned", group: "ops",    notes: "Uptime Kuma status page." },
  { id: "dom:warlord-genesis",    label: "warlord-genesis.vercel.app", kind: "domain", status: "live", group: "games", url: "https://warlord-genesis.vercel.app", notes: "Warlord Genesis MOBA/RTS satellite (separate repo). Fleet SSO via id hub + same-origin rewrites.", lastVerified: "2026-07-12" },
  { id: "dom:grudge6.g-s.com",    label: "grudge6.grudge-studio.com", kind: "domain", status: "live", group: "character", url: "https://grudge6.grudge-studio.com/game", notes: "Grudge6 game lab (HUD/panel/spellbook). Cross-origin from Warlords — embed via iframe/popup; do not fetch from SPA (CORS). Probe HEAD OK after redirect.", lastVerified: "2026-07-12" },
  { id: "dom:warlords-server.railway.app", label: "Warlords server @ Railway", kind: "domain", status: "planned", group: "realtime", notes: "Home for this repo's Express + Colyseus server (server/index.ts). Configured via railway.json, domain attached on flip-on." },
  // Web3/cNFT/wallet/games hub. Kept as a separate .io brand per owner directive (2026-04-26)
  // — grudgeplatform.io is NOT merged into the GrudgeDot launcher; it shares only auth + data layers.
  { id: "dom:grudgeplatform.io", label: "grudgeplatform.io", kind: "domain", status: "live", group: "web3", url: "https://grudgeplatform.io", notes: "Web3 / cNFT / wallet / games hub. Connects Puter accounts → Grudge ID → Crossmint custodial wallet → Solana cNFT. Hosts /play. Currently missing art/gameplay parity with grudgewarlords.com; production work tracked in grudge-platform repo.", lastVerified: "2026-04-26" },
  { id: "dom:grudgedot-launcher", label: "grudgedot-launcher.vercel.app", kind: "domain", status: "broken", group: "launcher", url: "https://grudgedot-launcher.vercel.app", notes: "PROBE 404 (2026-04-26). Stale Vercel host left behind by the GDevelop→GrudgeDot rename. Canonical destination is launcher.grudge-studio.com (planned). home.legacy.tsx no longer hard-codes this URL — see GRUDGEDOT_LAUNCHER_URL in grudgeConfig.ts.", lastVerified: "2026-04-26" },
  // Puter deployments — see docs/puter-registry.json for canonical list.
  { id: "dom:grudge-server.puter.work", label: "grudge-server.puter.work", kind: "domain", status: "live",  group: "puter", url: "https://grudge-server.puter.work/api/health", notes: "External Puter worker (AI chat, vision, sprite gen, NPC chat, game data sync). See GrudgeBuilder/puter.md." },
  { id: "dom:grudgewarlords-craft", label: "grudgewarlords.com/craft", kind: "domain", status: "live", group: "warlords", url: "https://grudgewarlords.com/craft/", notes: "Canonical WCS craft suite (inventory, recipes, item DB) on Warlords product domain." },
  { id: "dom:grudge-crafting.puter.site", label: "grudge-crafting.puter.site", kind: "domain", status: "deprecated",  group: "puter", url: "https://grudge-crafting.puter.site", notes: "Legacy Puter host — redirects to grudgewarlords.com/craft/." },
  { id: "dom:js.puter.com",       label: "js.puter.com (SDK CDN)", kind: "domain", status: "live",  group: "puter", url: "https://js.puter.com/v2/", notes: "Puter SDK script loaded by all Grudge frontends for AI/KV/FS/auth. Third-party, not owned." },
  // Shadow / untracked Puter deployments discovered via probe — see docs/puter-registry.json nameBreakRisks + frontends entries.
  { id: "dom:grudgewarlords.puter.site", label: "grudgewarlords.puter.site", kind: "domain", status: "broken", group: "puter", url: "https://grudgewarlords.puter.site", notes: "UNTRACKED live Grudge deployment (title=Grudge Warlords). Not referenced by any current code path. Owner TBD; decide keep vs retire." },
  { id: "dom:grudgestudio.puter.site",   label: "grudgestudio.puter.site",   kind: "domain", status: "planned", group: "engine", url: "https://grudgestudio.puter.site",   notes: "REASSIGNED 2026-04-22: wipe existing GRUDACHAIN content. Will host the Three.js Grudge Game Engine (same build as engine.grudge-studio.com) plus GrudgeDot launcher login entry. Puter-native storage path: uses puter.fs/puter.kv under grudge:scene:<id>:* as a cache over the canonical Railway backend store." },
  { id: "dom:grudge-studio.puter.site",  label: "grudge-studio.puter.site",  kind: "domain", status: "broken", group: "puter", url: "https://grudge-studio.puter.site",  notes: "Puter Cloud Dashboard. Referenced only in grudge-platform/public/legacy-auth.html (archived). Deployment is still live." },
  { id: "dom:grudge.puter.site",         label: "grudge.puter.site",         kind: "domain", status: "planned", group: "puter", url: "https://grudge.puter.site",        notes: "Reserved slug only; shows default Puter landing page. No Grudge app deployed." },
  // Grudge Warlords Era game fleet
  { id: "dom:mech-playground",    label: "mech-playground.vercel.app",           kind: "domain", status: "live", group: "games", url: "https://mech-playground.vercel.app",           notes: "Armada era play — mechs from Mech Builder (not naval ships).", lastVerified: "2026-07-28" },
  { id: "dom:character-creator",  label: "grudge-character-creator.vercel.app",  kind: "domain", status: "live", group: "games", url: "https://grudge-character-creator.vercel.app",  notes: "Character Creator — Three.js character builder.", lastVerified: "2026-06-04" },
  { id: "dom:grudges.g-s.com",    label: "grudges.grudge-studio.com",            kind: "domain", status: "live", group: "games", url: "https://grudges.grudge-studio.com",            notes: "Survival (Grudges) — R3F+Rapier survival game with ARPG mode.", lastVerified: "2026-06-04" },
  { id: "dom:forge.g-s.com",      label: "forge.grudge-studio.com",              kind: "domain", status: "live", group: "engine", url: "https://forge.grudge-studio.com",              notes: "Grudge Studio Forge — fleet map/model editor (R3F+Rapier+drei+ObjectStore). Vercel alias on RTS-Grudge → /forge/ bundle. Replaces WCS GameForge + retired Babylon engine-web.", lastVerified: "2026-06-24" },
  { id: "dom:rts-grudge",         label: "rts-grudge.vercel.app",                kind: "domain", status: "live", group: "games", url: "https://rts-grudge.vercel.app",                notes: "RTS-Grudge — R3F+Rapier real-time strategy. Hosts Forge editor at /forge/.", lastVerified: "2026-06-24" },
  { id: "dom:grudge-arena",       label: "grudge-arena.vercel.app",              kind: "domain", status: "live", group: "games", url: "https://grudge-arena.vercel.app",              notes: "Grudge Arena — Three.js PvP arena.", lastVerified: "2026-06-04" },
  { id: "dom:grim-armada",        label: "grim-armada-web.vercel.app",           kind: "domain", status: "live", group: "games", url: "https://grim-armada-web.vercel.app",           notes: "Grim Armada — R3F+Rapier naval combat.", lastVerified: "2026-06-04" },
  { id: "dom:grudge-space",       label: "grudge-space-rts.vercel.app",          kind: "domain", status: "live", group: "games", url: "https://grudge-space-rts.vercel.app",          notes: "GrudgeSpace RTS — R3F space strategy.", lastVerified: "2026-06-04" },
  { id: "dom:dungeon-crawler",    label: "dungeon-crawler-quest.vercel.app",     kind: "domain", status: "live", group: "games", url: "https://dungeon-crawler-quest.vercel.app",     notes: "Dungeon Crawler Quest — voxel dungeon crawler.", lastVerified: "2026-06-04" },
  { id: "dom:grudox",             label: "grudox.grudge-studio.com",             kind: "domain", status: "live", group: "games", url: "https://grudox.grudge-studio.com",             notes: "GRUDOX brand — voxel era cabinets. Roster GET /api/characters?era=voxel. Not Warlords. Not Nexus toon.", lastVerified: "2026-08-15" },
  { id: "dom:info.g-s.com",       label: "info.grudge-studio.com",               kind: "domain", status: "deprecated", group: "assets", url: "https://info.grudge-studio.com/health",       notes: "Legacy alias for objectstore.grudge-studio.com — prefer objectstore for new code. Root may 308-redirect.", lastVerified: "2026-07-12" },
  { id: "dom:character.g-s.com",  label: "character.grudge-studio.com",          kind: "domain", status: "live", group: "character", url: "https://character.grudge-studio.com",         notes: "GCS — Grudge Character Studio. HYDRA VRM + grudge6 forge. Multi-era account rosters (warlords, nexus, armada). Protected SSOT for character creation — not merged into Warlords /character.", lastVerified: "2026-06-27" },
  // Grudge Open — combat/studio platform hub
  {
    id: "dom:gameopen",
    label: "gameopen.vercel.app",
    kind: "domain",
    status: "live",
    group: "games",
    url: "https://gameopen.vercel.app",
    notes:
      "Grudge Open — fleet combat/studio platform. " +
      "10 doors: Danger Room, Warlord Genesis (race selection + 4-wave arena), " +
      "Ruins Brawler 3D (Three.js arena + BrawlClient), Voxel Editor, VoxGrudge native, " +
      "Test Dungeon (Mimic), Dressing Room, Lobby, GRUDOX Zones, LED Mask. " +
      "Auth: Grudge ID SSO (/api/auth/* → id.g-s.com). " +
      "Characters: /api/characters → Railway Postgres (same DB as Warlords). " +
      "Assets: assets.grudge-studio.com/gameopen/. Zone WS: voxgrudge-grudox-room-production.",
    lastVerified: "2026-07-11",
  },
];

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
const services: SystemNode[] = [
  { id: "svc:grudge-id",      label: "Grudge ID (auth)",    kind: "service", status: "live", group: "auth",    owner: "backend", repo: "grudge-backend", notes: "JWT + OAuth (Discord, Google, GitHub, Puter, wallet, guest)." },
  { id: "svc:game-api",       label: "Game Data API (Railway)", kind: "service", status: "live", group: "backend", owner: "backend", repo: "Grudge-Builder", url: `${GAME_DATA_API}/api/health`, notes: "Postgres SSOT — characters, wallet, islands, inventory. Proxied same-origin via /api/characters|wallet|account|island|…" },
  { id: "svc:account-api",    label: "Account API",         kind: "service", status: "live", group: "backend", owner: "backend", repo: "grudge-backend" },
  { id: "svc:wallet-svc",     label: "Wallet service",      kind: "service", status: "live", group: "backend", owner: "backend", repo: "grudge-backend", notes: "Server-side Solana wallets." },
  { id: "svc:r2-cdn",         label: "R2 CDN",              kind: "service", status: "live", group: "assets",  owner: "platform" },
  { id: "svc:os-worker",      label: "ObjectStore Worker",  kind: "service", status: "live", group: "assets",  owner: "platform", repo: "ObjectStore", notes: "Cloudflare Worker (R2 + D1)." },
  { id: "svc:os-static",      label: "ObjectStore JSON API",kind: "service", status: "live", group: "assets",  owner: "platform", repo: "ObjectStore", notes: "Static GitHub Pages, 55+ endpoints." },
  { id: "svc:ai-worker",      label: "Gruda Legion AI",     kind: "service", status: "live", group: "ai",      owner: "platform", repo: "grudge-ai-hub", notes: "Redeployed domain worker 2026-07-12. Root proxies UI; /health public; /v1/* auth.", lastVerified: "2026-07-12" },
  { id: "svc:dashboard",      label: "Admin Dashboard",     kind: "service", status: "live", group: "admin",   owner: "platform", repo: "grudge-studio-dash" },
  { id: "svc:frontend",       label: "Grudge Warlords (Three.js SPA)", kind: "service", status: "live", group: "frontend", owner: "frontend", repo: "Grudge-Builder", notes: "This repo. React 19 + Three.js (no Babylon)." },
  { id: "svc:engine-web",     label: "Grudge-Engine-Web (Babylon editor)", kind: "service", status: "deprecated", group: "engine", owner: "platform", repo: "Grudge-Engine-Web", notes: "RETIRED: Babylon removed fleet-wide. Use svc:studio-forge instead." },
  { id: "svc:studio-forge",   label: "Grudge Studio Forge (map editor)", kind: "service", status: "live", group: "engine", owner: "frontend", repo: "RTS-Grudge", notes: "studio/ → dist/public/forge. R3F + Rapier + drei + mesh-bvh + ObjectStore. Deploy targets: Warlords, RTS, DCQ. forge.grudge-studio.com + rts-grudge.vercel.app/forge/." },
  { id: "svc:grudge-engine-three", label: "Grudge Game Engine (Three.js)", kind: "service", status: "planned", group: "engine", owner: "platform", repo: "grudge-game-engine", notes: "Future mrdoob editor fork. Canonical editor today is svc:studio-forge at forge.grudge-studio.com." },
  { id: "svc:scene-store",    label: "Scene persistence (api /api/scenes)", kind: "service", status: "planned", group: "engine", owner: "backend", repo: "grudge-backend", notes: "New /api/scenes CRUD on api.grudge-studio.com. Scene files stored in R2 under grudge-scenes/{grudgeId}/{sceneId}.json (serialized three editor JSON). Canonical source of truth for both engine deployments; Puter side caches in puter.fs/puter.kv with dirty-write queue (same pattern as puterIslandKV.saveState)." },
  { id: "svc:gaming-portal",  label: "Grudge Studio portal shell", kind: "service", status: "live", group: "portal", owner: "platform", repo: "The-ENGINE", notes: "grudge-studio.com. Public entry portal for products, play, studio tools, and account flow. Retro library remains available as a secondary route." },
  { id: "svc:warlords-backend", label: "Warlords backend (Express + Colyseus)", kind: "service", status: "planned", group: "realtime", owner: "backend", repo: "Grudge-Builder", notes: "server/index.ts in this repo. Deploy target: Railway (railway.json). Hosts local /api/island/*, /api/account/* + Colyseus rooms + proxy to api.g-s.com. Complementary to Railway-hosted api.g-s.com." },
  { id: "svc:colyseus-lobby", label: "Colyseus lobby",      kind: "service", status: "planned", group: "realtime",owner: "backend", notes: "Code exists in this repo; not production-hardened. ws.grudge-studio.com currently redirects to marketing HTML — not a live WS product.", lastVerified: "2026-07-12" },
  { id: "svc:colyseus-dungeon", label: "Colyseus dungeon",  kind: "service", status: "planned", group: "realtime",owner: "backend", notes: "Code exists; same caveats as lobby." },
  { id: "svc:launcher",       label: "Launcher service",    kind: "service", status: "live", group: "launcher", owner: "platform", notes: "launcher.grudge-studio.com returns HTML 200 (2026-07-12). Confirm entitlements API before treating as full product.", lastVerified: "2026-07-12" },
  { id: "svc:warlord-genesis", label: "Warlord Genesis", kind: "service", status: "live", group: "games", owner: "frontend", repo: "warlord-genesis", url: "https://warlord-genesis.vercel.app", notes: "MOBA/RTS satellite. Fleet SSO; production static ship.", lastVerified: "2026-07-12" },
  { id: "svc:status-page",    label: "Status page",         kind: "service", status: "planned", group: "ops",   owner: "platform" },
  // Puter services — external, but part of the Grudge identity + AI surface.
  { id: "svc:puter-worker",   label: "GRUDGE Puter Worker", kind: "service", status: "live",    group: "puter",   owner: "platform", notes: "grudge-server.puter.work — AI chat/vision, sprite gen jobs, NPC dialogue, game data sync. Endpoints documented in GrudgeBuilder/puter.md." },
  { id: "svc:warlords-crafting", label: "Warlords Craft Suite", kind: "service", status: "live", group: "warlords", owner: "frontend", repo: "Grudge-Builder", url: "https://grudgewarlords.com/craft/", notes: "Canonical WCS: inventory, recipes, item DB on product domain. Same Railway JWT + bag as SPA. Static /craft/ on Vercel." },
  { id: "svc:puter-crafting", label: "Puter Crafting Site (legacy)", kind: "service", status: "deprecated", group: "puter", owner: "frontend", notes: "Redirect-only to grudgewarlords.com/craft/. Keep allowlisted for old bookmarks." },
  { id: "svc:puter-sdk",      label: "Puter SDK (ai/kv/fs/auth)", kind: "service", status: "live", group: "puter", owner: "platform", notes: "Loaded client-side from js.puter.com/v2. Consumed by GrudgeBuilder (puterIntegration.ts), grudge-sdk.js, and Puter-hosted frontends." },
  { id: "svc:puter-auth-bridge", label: "Puter \u2194 Grudge ID bridge", kind: "service", status: "live", group: "puter", owner: "backend", repo: "grudge-backend", notes: "id.grudge-studio.com /auth/puter (+ /auth/puter-link). Mints/links Grudge ID from Puter UUID; every auth path guarantees one Puter cloud storage per account. Proxied via grudge-platform api/puter.js + puter-link.js." },
  // Web3 hub. Distinct from svc:gaming-portal (/gs) and svc:frontend (grudgewarlords.com).
  { id: "svc:grudge-platform", label: "Grudge Platform (web3 hub)", kind: "service", status: "live", group: "web3", owner: "frontend", repo: "grudge-platform", notes: "Vercel app for grudgeplatform.io + /play. Owns Crossmint embed, cNFT mint flows, wallet UI, and Web3 onboarding. Auth: Puter SDK → id.grudge-studio.com /auth/puter via api/puter.js proxy. Pulls items/icons from ObjectStore; pulls binaries from R2 CDN. Per owner directive (2026-04-26) this is a separate brand from launcher.grudge-studio.com." },
  // Grudge Warlords Era game fleet
  { id: "svc:mech-forge",        label: "Grudge Mech Forge",      kind: "service", status: "live", group: "games", owner: "frontend", repo: "grudge-mech-forge",      notes: "Armada era create surface — modular mech builder + hangar. R3F+Rapier. Saves era=armada pipeline=mech." },
  { id: "svc:gcs",                label: "Grudge Character Studio (GCS)", kind: "service", status: "live", group: "character", owner: "frontend", repo: "GCS", url: "https://character.grudge-studio.com", notes: "HYDRA-powered VRM + grudge6 character forge. Saves to Railway /api/characters with per-era rosters. Canonical creator — Warlords /character redirects here." },
  { id: "svc:character-creator",  label: "Character Creator (playground)", kind: "service", status: "live", group: "games", owner: "frontend", repo: "grudge-character-creator", notes: "Three.js grudge6 playground — weapons mastery testing. Distinct from GCS account saves." },
  { id: "svc:survival",           label: "Survival (Grudges)",     kind: "service", status: "live", group: "games", owner: "frontend", repo: "survival",                 notes: "R3F+Rapier survival game with ARPG sub-mode. Pnpm monorepo, Railway API." },
  { id: "svc:rts-grudge",         label: "RTS-Grudge",             kind: "service", status: "live", group: "games", owner: "frontend", repo: "RTS-Grudge",               notes: "R3F+Rapier real-time strategy." },
  { id: "svc:grudge-arena-game",  label: "Grudge Arena",           kind: "service", status: "live", group: "games", owner: "frontend", repo: "grudge-arena",             notes: "Three.js PvP arena with Socket.IO multiplayer." },
  { id: "svc:grim-armada",        label: "Grim Armada",            kind: "service", status: "live", group: "games", owner: "frontend", repo: "grim-armada-web",          notes: "R3F+Rapier naval combat." },
  { id: "svc:grudge-space",       label: "GrudgeSpace RTS",        kind: "service", status: "live", group: "games", owner: "frontend", repo: "GrudgeSpaceRTS",           notes: "R3F space strategy." },
  { id: "svc:dungeon-crawler",    label: "Dungeon Crawler Quest",  kind: "service", status: "live", group: "games", owner: "frontend", repo: "Dungeon-Crawler-Quest",    notes: "Voxel dungeon crawler. Migration from Babylon to Three.js planned." },
  { id: "svc:grudox",             label: "Grudox (Voxel Forge Engine)", kind: "service", status: "live", group: "games", owner: "frontend", repo: "grudox",                notes: "Static landing/title page (single index.html, Tailwind CDN, no build). Fleet-wired per fleet-config.json + docs/FLEET.md: auth\u2192id, API\u2192api, assets\u2192assets, AI\u2192ai.grudge-studio.com; studio context from assets.grudge-studio.com/context/studio-context.json." },
  { id: "svc:dungeon-crawler",    label: "Dungeon Crawler Quest",  kind: "service", status: "live", group: "games", owner: "frontend", repo: "Dungeon-Crawler-Quest",    notes: "Three.js voxel dungeon crawler (Babylon retired). Forge deploy target." },
  { id: "svc:info-hub",           label: "ObjectStore API",          kind: "service", status: "live", group: "assets", owner: "platform", repo: "ObjectStore",              notes: "Consolidated item database, guides, professions, VFX, 3D models. objectstore.grudge-studio.com." },
  {
    id: "svc:gameopen",
    label: "Grudge Open (combat/studio hub)",
    kind: "service",
    status: "live",
    group: "games",
    owner: "frontend",
    repo: "gameopen",
    url: "https://gameopen.vercel.app",
    notes:
      "React 19 + Vite + Three.js. Modes: Danger Room (Studio engine, all weapons/skills), " +
      "Warlord Genesis (grudge6 baked roster, 6 races, 4-wave boss arena), " +
      "Ruins Brawler 3D (BrawlScene + BrawlClient multiplayer), " +
      "VoxGrudge native (/api/space WS), Mimic Dungeon, Voxel Editor, Dressing Room, Lobby, LED Mask. " +
      "api-server: gameopen-production.up.railway.app. " +
      "Vercel rewrites: /api/auth/* → id.g-s.com, /api/characters → Railway, " +
      "/api/brawl|space|carrier → GRUDOX zone server.",
    lastVerified: "2026-07-11",
  },
];

// ---------------------------------------------------------------------------
// Frontend routes (mirrors client/src/App.tsx)
// ---------------------------------------------------------------------------
type RouteSeed = { path: string; label: string; group: string; status?: NodeStatus; notes?: string;
  /** Optional non-default host. When omitted, the route is anchored to grudgewarlords.com (this repo). */
  host?: string };
const routeSeeds: RouteSeed[] = [
  { path: "/",                  label: "Login",              group: "account" },
  { path: "/auth/callback",     label: "Auth callback",      group: "account" },
  { path: "/intro",             label: "Intro",              group: "account" },
  { path: "/home",              label: "Home",               group: "account" },
  { path: "/account",           label: "Account",            group: "account" },
  { path: "/wallet",            label: "Wallet",             group: "account" },
  { path: "/launcher",          label: "Launcher",           group: "account", notes: "Depends on planned launcher.g-s.com." },

  { path: "/character",         label: "Character Builder",  group: "character", notes: "Redirects to GCS (era=warlords). ?legacy=1 keeps inline builder." },
  { path: "/create-character",  label: "Create Character",   group: "character", notes: "Redirects to GCS mode=create, returnTo /game/character." },
  { path: "/character-creator", label: "Character Creator",  group: "character", notes: "Redirects to GCS mode=create, returnTo /account." },
  { path: "/characters",        label: "Characters (alias)", group: "character", notes: "Alias of /character — candidate for dedup." },
  { path: "/character-gallery", label: "Character Gallery",  group: "character" },
  { path: "/hero-codex",        label: "Hero Codex",         group: "character" },
  { path: "/arsenal",           label: "Arsenal",            group: "character" },
  { path: "/skills",            label: "Skill Tree",         group: "character" },
  { path: "/skill-tree",        label: "Skill Tree (alias)", group: "character", notes: "Alias of /skills." },

  { path: "/combat",            label: "Combat",             group: "combat" },
  { path: "/rpg-battle",        label: "RPG Battle",         group: "combat" },
  { path: "/dungeon",           label: "Dungeon",            group: "combat" },
  { path: "/dungeon-tiled",     label: "Dungeon (tiled)",    group: "combat", notes: "Alias of /dungeon." },
  { path: "/tower-wars",        label: "Tower Wars",         group: "combat" },
  {
    path: "/war-scene",
    label: "Warlord Isle Siege",
    group: "combat",
    notes:
      "Canonical CB-style siege at https://grudgewarlords.com/war-scene (also client.grudge-studio.com). ElevenLabs TTS + wallet FAB + grudge6 heroes.",
  },
  {
    path: "/medieval-battle",
    label: "Medieval Battle (alias)",
    group: "combat",
    notes: "Alias of /war-scene.",
  },

  { path: "/island",            label: "Island",             group: "world" },
  { path: "/island-v2",         label: "Island v2",          group: "world" },
  { path: "/island-3d",         label: "Island 3D",          group: "world" },
  { path: "/island-phaser",     label: "Island (Phaser)",    group: "world" },
  { path: "/island-grid-test",  label: "Island grid test",   group: "world", status: "deprecated", notes: "Looks like scratch/test page." },
  { path: "/world-map",         label: "World Map",          group: "world" },
  { path: "/missions",          label: "Mission Board",      group: "world" },
  { path: "/harvest",           label: "Harvest",            group: "world" },

  { path: "/professions",       label: "Professions",        group: "professions" },
  { path: "/profession/miner",    label: "Miner",            group: "professions" },
  { path: "/profession/forester", label: "Forester",         group: "professions" },
  { path: "/profession/mystic",   label: "Mystic",           group: "professions" },
  { path: "/profession/chef",     label: "Chef",             group: "professions" },
  { path: "/profession/engineer", label: "Engineer",         group: "professions" },
  { path: "/craft/",            label: "Craft suite (WCS)",  group: "professions" },
  { path: "/crafting",          label: "Crafting (SPA panel)", group: "professions" },

  { path: "/database",          label: "Database",           group: "tools" },
  { path: "/editor",            label: "Editor",             group: "tools" },
  { path: "/template-viewer",   label: "Template Viewer",    group: "tools" },

  { path: "/sprites",           label: "Sprite Engine",      group: "sprites" },
  { path: "/sprite-editor",     label: "Sprite Editor",      group: "sprites" },
  { path: "/sprite-viewer",     label: "Sprite Viewer",      group: "sprites" },
  { path: "/sprite-generator",  label: "Sprite Generator",   group: "sprites" },
  { path: "/sprite-library",    label: "Sprite Library",     group: "sprites" },
  { path: "/hero-sprites",      label: "Hero Sprites",       group: "sprites" },
  { path: "/race-sprites",      label: "Race Sprites",       group: "sprites" },

  { path: "/admin",             label: "Admin",              group: "admin" },
  { path: "/admin-map",         label: "Admin Map",          group: "admin" },
  { path: "/admin-combat",      label: "Admin Combat",       group: "admin" },
  { path: "/admin-island-v2",   label: "Admin Island v2",    group: "admin" },
  { path: "/admin-island-3d",   label: "Admin Island 3D",    group: "admin" },
  { path: "/sprite-admin",      label: "Sprite Admin",       group: "admin" },
  { path: "/ai-helper",         label: "AI Helper",          group: "admin" },
  { path: "/organizer",         label: "System Organizer",   group: "admin", notes: "This page." },

  // Cross-property routes (anchored to other Grudge domains).
  { path: "/gs",   label: "Rec0deD:88 / Grudge Studio Gaming Portal", group: "portal", host: "grudge-studio.com", notes: "Reference visual + auth surface (do not refactor). Served by The-ENGINE (svc:gaming-portal). Loads js.puter.com/v2/. Mirror its login + account UI patterns into other Grudge surfaces." },
  { path: "/play", label: "grudgeplatform.io/play",                   group: "web3",   host: "grudgeplatform.io", notes: "Web3 play surface on the platform brand. Currently missing art/gameplay parity — see Phase 5 cross-repo checklist in docs/audit-report.md." },
];

const frontendRoutes: SystemNode[] = routeSeeds.map(r => {
  const host = r.host ?? "grudgewarlords.com";
  return {
    id: `route:${r.path}`,
    label: r.host ? `${host}${r.path}` : r.path,
    kind: "frontendRoute" as const,
    status: r.status ?? "live",
    group: r.group,
    url: `https://${host}${r.path}`,
    notes: r.notes,
  };
});

// ---------------------------------------------------------------------------
// API rewrites (mirrors vercel.json)
// ---------------------------------------------------------------------------
type RewriteSeed = { source: string; dest: string; target: string; group: string };
const rewriteSeeds: RewriteSeed[] = [
  { source: "/api/account",            dest: `${GAME_DATA_API}/api/account`,                         target: "svc:game-api",    group: "account" },
  { source: "/api/account/:path*",     dest: `${GAME_DATA_API}/api/account/:path*`,                  target: "svc:game-api",    group: "account" },
  { source: "/api/auth/:path*",        dest: `${GAME_DATA_API}/api/auth/:path*`,                      target: "svc:game-api",    group: "auth" },
  { source: "/api/wallet",             dest: `${GAME_DATA_API}/api/wallet`,                          target: "svc:game-api",    group: "wallet" },
  { source: "/api/wallet/:path*",      dest: `${GAME_DATA_API}/api/wallet/:path*`,                   target: "svc:game-api",    group: "wallet" },
  { source: "/api/island",             dest: `${GAME_DATA_API}/api/island`,                          target: "svc:game-api",    group: "world" },
  { source: "/api/island/:path*",      dest: `${GAME_DATA_API}/api/island/:path*`,                   target: "svc:game-api",    group: "world" },
  { source: "/api/islands/:path*",     dest: `${GAME_DATA_API}/api/islands/:path*`,                  target: "svc:game-api",    group: "world" },
  { source: "/api/nfts",               dest: `${GAME_DATA_API}/api/nfts`,                            target: "svc:game-api",    group: "wallet" },
  { source: "/api/nfts/:path*",        dest: `${GAME_DATA_API}/api/nfts/:path*`,                     target: "svc:game-api",    group: "wallet" },
  { source: "/api/island-nfts",        dest: `${GAME_DATA_API}/api/island-nfts`,                     target: "svc:game-api",    group: "world" },
  { source: "/api/island-nfts/:path*", dest: `${GAME_DATA_API}/api/island-nfts/:path*`,              target: "svc:game-api",    group: "world" },
  { source: "/api/professions/:path*", dest: `${GAME_DATA_API}/api/professions/:path*`,              target: "svc:game-api",    group: "professions" },
  { source: "/api/inventory/:path*",   dest: `${GAME_DATA_API}/api/inventory/:path*`,                target: "svc:game-api",    group: "character" },
  { source: "/api/health",             dest: `${GAME_DATA_API}/api/health`,                          target: "svc:game-api",    group: "ops" },
  { source: "/api/characters",         dest: `${GAME_DATA_API}/api/characters`,                      target: "svc:game-api",    group: "character" },
  { source: "/api/characters/:path*",  dest: `${GAME_DATA_API}/api/characters/:path*`,               target: "svc:game-api",    group: "character" },
  { source: "/api/party",              dest: `${GAME_DATA_API}/api/party`,                           target: "svc:game-api",    group: "combat" },
  { source: "/api/party/:path*",       dest: `${GAME_DATA_API}/api/party/:path*`,                    target: "svc:game-api",    group: "combat" },
  { source: "/api/fleet/:path*",       dest: `${GAME_DATA_API}/api/fleet/:path*`,                    target: "svc:game-api",    group: "ops" },
  { source: "/api/treaty",             dest: `${GAME_DATA_API}/api/treaty`,                          target: "svc:game-api",    group: "social" },
  { source: "/api/treaty/:path*",      dest: `${GAME_DATA_API}/api/treaty/:path*`,                   target: "svc:game-api",    group: "social" },
  { source: "/api/supabase/:path*",    dest: `${GAME_DATA_API}/api/supabase/:path*`,                 target: "svc:game-api",    group: "backend" },
  { source: "/api/tools/:path*",       dest: `${FLEET_URLS.identityApi}/api/tools/:path*`,           target: "svc:game-api",    group: "tools" },
  { source: "/api/assets/:path*",      dest: "https://assets.grudge-studio.com/:path*",              target: "svc:r2-cdn",      group: "assets" },
  { source: "/api/public/:path*",      dest: `${FLEET_URLS.identityApi}/public/:path*`,              target: "svc:game-api",    group: "backend" },
  { source: "/api/:path*",             dest: `${FLEET_URLS.identityApi}/api/:path*`,                 target: "svc:account-api", group: "backend" },
];

const apiRewrites: SystemNode[] = rewriteSeeds.map(r => ({
  id: `rw:${r.source}`,
  label: r.source,
  kind: "apiRewrite",
  status: "live",
  group: r.group,
  url: r.dest,
}));

// ---------------------------------------------------------------------------
// Data sources
// ---------------------------------------------------------------------------
const dataSources: SystemNode[] = [
  { id: "data:master-items",    label: "master-items.json (818)",    kind: "dataSource", status: "live", group: "assets", url: "https://objectstore.grudge-studio.com/api/v1/master-items.json" },
  { id: "data:master-recipes",  label: "master-recipes.json (118)",  kind: "dataSource", status: "live", group: "assets", url: "https://objectstore.grudge-studio.com/api/v1/master-recipes.json" },
  { id: "data:master-materials",label: "master-materials.json (93)", kind: "dataSource", status: "live", group: "assets", url: "https://objectstore.grudge-studio.com/api/v1/master-materials.json" },
  { id: "data:r2-icons",        label: "R2: /icons/**",              kind: "dataSource", status: "live", group: "assets" },
  { id: "data:r2-models",       label: "R2: /models/**",             kind: "dataSource", status: "live", group: "assets" },
  { id: "data:pg-characters",   label: "Postgres: characters",       kind: "dataSource", status: "live", group: "backend" },
  { id: "data:pg-accounts",     label: "Postgres: accounts",         kind: "dataSource", status: "live", group: "backend" },
  { id: "data:pg-inventory",    label: "Postgres: inventory",        kind: "dataSource", status: "live", group: "backend" },
];

// ---------------------------------------------------------------------------
// Repos
// ---------------------------------------------------------------------------
const repos: SystemNode[] = [
  { id: "repo:grudge-builder",    label: "Grudge-Builder",    kind: "repo", status: "live", group: "frontend", url: "https://github.com/MolochDaGod/Grudge-Builder", notes: "Private." },
  { id: "repo:objectstore",       label: "ObjectStore",       kind: "repo", status: "live", group: "assets",   url: "https://github.com/MolochDaGod/ObjectStore" },
  { id: "repo:grudge-backend",    label: "grudge-backend",    kind: "repo", status: "live", group: "backend",  url: "https://github.com/MolochDaGod/grudge-backend" },
  { id: "repo:grudge-studio-dash",label: "grudge-studio-dash",kind: "repo", status: "live", group: "admin",    url: "https://github.com/MolochDaGod/grudge-studio-dash" },
  { id: "repo:grudge-ai-hub",     label: "grudge-ai-hub",     kind: "repo", status: "live", group: "ai",       url: "https://github.com/MolochDaGod/grudge-ai-hub" },
  { id: "repo:the-engine",        label: "The-ENGINE",        kind: "repo", status: "live", group: "portal",   url: "https://github.com/MolochDaGod/The-ENGINE", notes: "Source repo for grudge-studio.com portal shell on Vercel." },
  { id: "repo:grudge-arena",      label: "grudge-arena",      kind: "repo", status: "live", group: "combat",   url: "https://github.com/MolochDaGod/grudge-arena" },
  { id: "repo:grudge-studio-game",label: "Grudge-Studio-Game",kind: "repo", status: "live", group: "frontend", url: "https://github.com/MolochDaGod/Grudge-Studio-Game" },
  { id: "repo:grudge-engine-web", label: "Grudge-Engine-Web", kind: "repo", status: "deprecated", group: "engine", url: "https://github.com/MolochDaGod/Grudge-Engine-Web", notes: "DEPRECATED 2026-04-22: Babylon-based editor. Babylon is no longer used anywhere in the Grudge stack. Archive the repo; do NOT port changes from it. The Three.js runtime in GrudgeBuilder (island3d/**, ThreeScene.tsx, CharacterModel3D.tsx) is the canonical engine surface." },
  { id: "repo:grudge-game-engine", label: "grudge-game-engine (planned)", kind: "repo", status: "planned", group: "engine", notes: "Planned repo: fork of github.com/mrdoob/three.js/tree/master/editor, improved + branded as Grudge Game Engine. Ships one build to engine.grudge-studio.com and grudgestudio.puter.site. Adds: Grudge ID auth (SSO + Puter bridge), /api/scenes persistence, ObjectStore asset picker, Rapier/Cannon physics, three retargeting for character rigs, GrudgeDot launcher entry." },
  { id: "repo:gruda-legion-sdk", label: "gruda-legion-sdk",   kind: "repo", status: "live", group: "ai",       url: "https://github.com/MolochDaGod/gruda-legion-sdk" },
  { id: "repo:mission",           label: "Grudge-Studio-Mission", kind: "repo", status: "live", group: "ops",  url: "https://github.com/Grudge-Warlords/Grudge-Studio-Mission", notes: "North-star mission, architecture, roadmap." },
  { id: "repo:grudge-platform",   label: "grudge-platform",   kind: "repo", status: "live", group: "web3",   url: "https://github.com/MolochDaGod/grudge-platform", notes: "Source for grudgeplatform.io + /play. Hosts api/_grudge-proxy.js (CORS allowlist) and api/puter.js + api/puter-link.js (proxy to id.grudge-studio.com /auth/puter)." },
  // Grudge Warlords Era game repos
  { id: "repo:grudge-mech-forge",     label: "grudge-mech-forge",      kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/grudge-mech-forge" },
  { id: "repo:grudge-character-creator", label: "grudge-character-creator", kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/grudge-character-creator" },
  { id: "repo:survival",              label: "survival",               kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/survival" },
  { id: "repo:rts-grudge",            label: "RTS-Grudge",             kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/RTS-Grudge" },
  { id: "repo:grim-armada",           label: "grim-armada-web",        kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/grim-armada-web" },
  { id: "repo:grudge-space-rts",      label: "GrudgeSpaceRTS",         kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/GrudgeSpaceRTS" },
  { id: "repo:dungeon-crawler",       label: "Dungeon-Crawler-Quest",  kind: "repo", status: "live", group: "games", url: "https://github.com/MolochDaGod/Dungeon-Crawler-Quest" },
  { id: "repo:grudox",                label: "grudox",                 kind: "repo", status: "planned", group: "games", notes: "Local-only as of 2026-06-24 (no git remote yet). Static landing page for grudox.grudge-studio.com; intended push target github.com/MolochDaGod/grudox." },
  {
    id: "repo:gameopen",
    label: "gameopen",
    kind: "repo",
    status: "live",
    group: "games",
    url: "https://github.com/MolochDaGod/gameopen",
    notes:
      "Grudge Open monorepo. artifacts/animator = React/Vite/Three.js SPA; " +
      "artifacts/api-server = Express game server (Railway); lib/brawl-net = brawl protocol. " +
      "Vercel project: gameopen. GRUDOX zone server: voxgrudge-grudox-room-production.",
  },
];

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------
const edges: SystemEdge[] = [];

// Domain -> service hosting
edges.push(
  { source: "dom:grudgewarlords.com", target: "svc:frontend",   kind: "routes-to" },
  { source: "dom:client.g-s.com",     target: "svc:frontend",   kind: "routes-to", notes: "Vercel alias of this repo." },
  { source: "dom:engine.g-s.com",     target: "svc:engine-web", kind: "routes-to" },
  { source: "dom:grudge-engine.vercel.app", target: "svc:engine-web", kind: "routes-to" },
  { source: "dom:grudge-studio.com",  target: "svc:gaming-portal", kind: "routes-to" },
  { source: "repo:the-engine",        target: "svc:gaming-portal", kind: "deploys-from" },
  { source: "repo:grudge-engine-web", target: "svc:engine-web", kind: "deploys-from" },
  { source: "dom:id.g-s.com",         target: "svc:grudge-id",  kind: "routes-to" },
  { source: "dom:api.g-s.com",        target: "svc:account-api", kind: "routes-to", notes: "Identity API — session exchange, scoped profile; not game-data." },
  { source: "dom:game-data.railway",  target: "svc:game-api",   kind: "routes-to" },
  { source: "dom:account.g-s.com",    target: "svc:account-api",kind: "routes-to" },
  { source: "dom:assets.g-s.com",     target: "svc:r2-cdn",     kind: "routes-to" },
  { source: "dom:objectstore.g-s.com",target: "svc:os-worker",  kind: "routes-to" },
  { source: "dom:objectstore.gh",     target: "svc:os-static",  kind: "routes-to" },
  { source: "dom:ai.g-s.com",         target: "svc:ai-worker",  kind: "routes-to" },
  { source: "dom:dash.g-s.com",       target: "svc:dashboard",  kind: "routes-to" },
  { source: "dom:warlord-genesis",    target: "svc:warlord-genesis", kind: "routes-to" },
  { source: "dom:grudge6.g-s.com",    target: "svc:character-creator", kind: "routes-to", notes: "Grudge6 lab /game UI" },
  { source: "svc:warlord-genesis",    target: "svc:grudge-id", kind: "authenticates-via" },
  { source: "svc:warlord-genesis",    target: "svc:game-api", kind: "calls" },
  { source: "dom:ws.g-s.com",         target: "svc:colyseus-lobby", kind: "routes-to" },
  { source: "dom:warlords-server.railway.app", target: "svc:warlords-backend", kind: "routes-to" },
  { source: "repo:grudge-builder",    target: "svc:warlords-backend", kind: "deploys-from" },
  { source: "svc:warlords-backend",   target: "svc:colyseus-lobby", kind: "routes-to" },
  { source: "svc:warlords-backend",   target: "svc:colyseus-dungeon", kind: "routes-to" },
  { source: "dom:launcher.g-s.com",   target: "svc:launcher",   kind: "routes-to" },
  { source: "dom:status.g-s.com",     target: "svc:status-page",kind: "routes-to" },
  // Puter wiring
  { source: "dom:grudge-server.puter.work",   target: "svc:puter-worker",   kind: "routes-to" },
  { source: "dom:grudgewarlords-craft", target: "svc:warlords-crafting", kind: "routes-to" },
  { source: "dom:grudgewarlords-craft", target: "svc:game-api", kind: "calls", notes: "Same-origin /api/* → Railway bag, inventory, professions." },
  { source: "svc:warlords-crafting", target: "svc:game-api", kind: "calls" },
  { source: "svc:warlords-crafting", target: "svc:os-static", kind: "reads", notes: "Recipes/items/icons from ObjectStore + info hub." },
  { source: "dom:grudge-crafting.puter.site", target: "svc:puter-crafting", kind: "routes-to" },
  { source: "dom:grudge-crafting.puter.site", target: "dom:grudgewarlords-craft", kind: "redirects-to" },
  { source: "dom:js.puter.com",               target: "svc:puter-sdk",      kind: "routes-to" },
  // Game fleet domain → service wiring
  { source: "dom:mech-playground",    target: "svc:mech-forge",        kind: "routes-to" },
  { source: "dom:character-creator",  target: "svc:character-creator",  kind: "routes-to" },
  { source: "dom:grudges.g-s.com",    target: "svc:survival",           kind: "routes-to" },
  { source: "dom:rts-grudge",         target: "svc:rts-grudge",         kind: "routes-to" },
  { source: "dom:grudge-arena",       target: "svc:grudge-arena-game",  kind: "routes-to" },
  { source: "dom:grim-armada",        target: "svc:grim-armada",        kind: "routes-to" },
  { source: "dom:grudge-space",       target: "svc:grudge-space",       kind: "routes-to" },
  { source: "dom:dungeon-crawler",    target: "svc:dungeon-crawler",    kind: "routes-to" },
  { source: "dom:info.g-s.com",       target: "svc:info-hub",           kind: "routes-to" },
  // Grudge Open wiring
  { source: "dom:gameopen",           target: "svc:gameopen",           kind: "routes-to" },
  { source: "repo:gameopen",          target: "svc:gameopen",           kind: "deploys-from" },
  { source: "svc:gameopen",           target: "svc:grudge-id",          kind: "authenticates-via" },
  { source: "svc:gameopen",           target: "svc:game-api",           kind: "calls",    notes: "Characters, account via Vercel /api proxy" },
  { source: "svc:gameopen",           target: "svc:r2-cdn",             kind: "reads",    notes: "assets.grudge-studio.com/gameopen/ — models, icons, audio" },
  { source: "svc:gameopen",           target: "svc:os-worker",          kind: "reads",    notes: "ObjectStore definitions via /api/objectstore proxy" },
  { source: "svc:gameopen",           target: "svc:grudox-game-server", kind: "calls",    notes: "wss /api/brawl|space|carrier — GRUDOX zone rooms" },
  // Game fleet repo → service deploys
  { source: "repo:grudge-mech-forge",         target: "svc:mech-forge",        kind: "deploys-from" },
  { source: "repo:grudge-character-creator",   target: "svc:character-creator",  kind: "deploys-from" },
  { source: "repo:survival",                   target: "svc:survival",           kind: "deploys-from" },
  { source: "repo:rts-grudge",                 target: "svc:rts-grudge",         kind: "deploys-from" },
  { source: "repo:grim-armada",                target: "svc:grim-armada",        kind: "deploys-from" },
  { source: "repo:grudge-space-rts",           target: "svc:grudge-space",       kind: "deploys-from" },
  { source: "repo:dungeon-crawler",            target: "svc:dungeon-crawler",    kind: "deploys-from" },
  // All games authenticate via Grudge ID and read from ObjectStore
  { source: "svc:mech-forge",        target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:character-creator",  target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:survival",           target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:rts-grudge",         target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:grudge-arena-game",  target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:grim-armada",        target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:grudge-space",       target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:dungeon-crawler",    target: "svc:grudge-id",   kind: "authenticates-via" },
  { source: "svc:mech-forge",        target: "svc:os-static",   kind: "reads" },
  { source: "svc:character-creator",  target: "svc:os-static",   kind: "reads" },
  { source: "svc:survival",           target: "svc:os-static",   kind: "reads" },
  { source: "svc:rts-grudge",         target: "svc:os-static",   kind: "reads" },
  // Grudox (Voxel Forge Engine) — fleet wiring per the standard pattern (auth/API/assets/AI).
  { source: "dom:grudox",             target: "svc:grudox",      kind: "routes-to" },
  { source: "repo:grudox",            target: "svc:grudox",      kind: "deploys-from", notes: "Vercel static deploy from local repo; no git remote yet (2026-06-24)." },
  { source: "svc:grudox",             target: "svc:grudge-id",   kind: "authenticates-via", notes: "SSO via id.grudge-studio.com per fleet pattern." },
  { source: "svc:grudox",             target: "svc:game-api",    kind: "calls",             notes: "api.grudge-studio.com (incl. /ai/studio-context) per fleet pattern." },
  { source: "svc:grudox",             target: "svc:r2-cdn",      kind: "reads",             notes: "Assets from assets.grudge-studio.com (+ context/studio-context.json mirror)." },
  { source: "svc:grudox",             target: "svc:ai-worker",   kind: "calls",             notes: "Studio assistant via ai.grudge-studio.com /ai/chat per fleet pattern." },
  // Shadow deployments: route-to nothing yet; surfaced to /organizer Issues tab for owner decision.
  { source: "dom:grudgewarlords.puter.site",  target: "svc:puter-crafting", kind: "routes-to", notes: "Placeholder — live deployment with no registered Grudge service. Needs owner." },
  { source: "dom:grudgestudio.puter.site",    target: "svc:grudge-engine-three", kind: "routes-to",            notes: "Puter-native build of the Three.js Grudge Game Engine." },
  { source: "dom:engine.g-s.com",             target: "svc:grudge-engine-three", kind: "routes-to",            notes: "Canonical (Vercel) build of the same engine." },
  { source: "svc:grudge-engine-three",        target: "svc:scene-store",         kind: "reads",                notes: "Load scenes by grudge_id + scene_id." },
  { source: "svc:grudge-engine-three",        target: "svc:scene-store",         kind: "writes",               notes: "Save scenes; Puter side writes through with puter.fs/puter.kv cache." },
  { source: "svc:grudge-engine-three",        target: "svc:grudge-id",           kind: "authenticates-via",    notes: "Both surfaces share Grudge ID + account tier for scene ownership/share/publish permissions." },
  { source: "svc:grudge-engine-three",        target: "svc:puter-auth-bridge",   kind: "authenticates-via",    notes: "On Puter surface, first-touch mints Grudge ID from puter_uuid so scenes created there attach to a real account." },
  { source: "svc:grudge-engine-three",        target: "svc:os-static",           kind: "reads",                notes: "Asset picker pulls icons/models/materials from ObjectStore." },
  { source: "svc:scene-store",                target: "data:r2-models",          kind: "writes",               notes: "Scene JSON blobs stored in R2 under grudge-scenes/{grudgeId}/." },
  { source: "repo:grudge-game-engine",        target: "svc:grudge-engine-three", kind: "deploys-from" },
  { source: "dom:grudge-studio.puter.site",   target: "svc:puter-crafting", kind: "routes-to", notes: "Placeholder — live Cloud Dashboard referenced only from archived legacy-auth.html." },
  { source: "svc:frontend",    target: "svc:puter-sdk",         kind: "calls",            notes: "GrudgeBuilder loads Puter SDK for AI/KV/FS via puterIntegration.ts." },
  { source: "svc:frontend",    target: "svc:puter-worker",      kind: "calls",            notes: "puterServer client in assetConfig.ts targets grudge-server.puter.work." },
  { source: "svc:puter-crafting", target: "svc:os-static",      kind: "reads",            notes: "Pulls items/icons from ObjectStore JSON API." },
  { source: "svc:puter-auth-bridge", target: "svc:grudge-id",   kind: "authenticates-via", notes: "/auth/puter upserts (puter_uuid \u2194 grudge_id) on id.grudge-studio.com." },
  { source: "svc:frontend",    target: "svc:puter-auth-bridge", kind: "authenticates-via", notes: "loginWithPuter() in grudgeBackend.ts posts to /api/auth/puter (Vercel rewrite to id.g-s.com)." },
  // grudgeplatform.io (web3/cNFT/wallet/games hub)
  { source: "dom:grudgeplatform.io", target: "svc:grudge-platform",       kind: "routes-to" },
  { source: "repo:grudge-platform",  target: "svc:grudge-platform",       kind: "deploys-from" },
  { source: "svc:grudge-platform",   target: "svc:puter-sdk",             kind: "calls",             notes: "Loads js.puter.com/v2/ for browser auth + AI + KV/FS." },
  { source: "svc:grudge-platform",   target: "svc:puter-auth-bridge",     kind: "authenticates-via", notes: "Posts { puterUuid, puterUsername } via api/puter.js → id.grudge-studio.com/auth/puter." },
  { source: "svc:grudge-platform",   target: "svc:os-worker",             kind: "reads",             notes: "Items/icons/recipes from objectstore.grudge-studio.com (single source of truth, no hardcoded copies)." },
  { source: "svc:grudge-platform",   target: "svc:r2-cdn",                kind: "reads",             notes: "Binary assets from assets.grudge-studio.com." },
  { source: "svc:grudge-platform",   target: "svc:wallet-svc",            kind: "calls",             notes: "Crossmint custodial wallet provisioning + cNFT mint via api.grudge-studio.com /api/wallet + /api/nfts." },
  // /gs reference surface (do not refactor)
  { source: "dom:grudge-studio.com", target: "route:/gs",                 kind: "routes-to" },
  { source: "route:/gs",             target: "svc:gaming-portal",         kind: "routes-to" },
);

// Frontend -> rewrites
for (const rw of rewriteSeeds) {
  edges.push({ source: "svc:frontend", target: `rw:${rw.source}`, kind: "calls" });
  edges.push({ source: `rw:${rw.source}`, target: rw.target, kind: "rewrites-to" });
}

// Frontend routes -> frontend service.
// Routes with an explicit host (e.g. /gs on grudge-studio.com, /play on grudgeplatform.io)
// are wired to their own service in the explicit `edges.push(...)` block above; do not
// double-edge them to this repo's svc:frontend.
for (const r of routeSeeds) {
  if (r.host) continue;
  edges.push({ source: `route:${r.path}`, target: "svc:frontend", kind: "routes-to" });
}

// Auth convergence
for (const r of ["/", "/auth/callback", "/home", "/account", "/wallet", "/launcher"]) {
  edges.push({ source: `route:${r}`, target: "svc:grudge-id", kind: "authenticates-via" });
}

// Data source usage
edges.push(
  { source: "svc:frontend", target: "data:master-items",    kind: "reads" },
  { source: "svc:frontend", target: "data:master-recipes",  kind: "reads" },
  { source: "svc:frontend", target: "data:master-materials",kind: "reads" },
  { source: "svc:frontend", target: "data:r2-icons",        kind: "reads" },
  { source: "svc:frontend", target: "data:r2-models",       kind: "reads" },
  { source: "svc:game-api", target: "data:pg-characters",   kind: "reads" },
  { source: "svc:game-api", target: "data:pg-characters",   kind: "writes" },
  { source: "svc:game-api", target: "data:pg-inventory",    kind: "reads" },
  { source: "svc:game-api", target: "data:pg-inventory",    kind: "writes" },
  { source: "svc:account-api", target: "data:pg-accounts",  kind: "reads" },
  { source: "svc:account-api", target: "data:pg-accounts",  kind: "writes" },
  { source: "svc:os-worker", target: "data:r2-icons",       kind: "reads" },
  { source: "svc:os-worker", target: "data:r2-models",      kind: "reads" },
);

// Repos -> services
edges.push(
  { source: "repo:grudge-builder",    target: "svc:frontend",   kind: "deploys-from" },
  { source: "repo:grudge-backend",    target: "svc:game-api",   kind: "deploys-from" },
  { source: "repo:grudge-backend",    target: "svc:grudge-id",  kind: "deploys-from" },
  { source: "repo:grudge-backend",    target: "svc:account-api",kind: "deploys-from" },
  { source: "repo:grudge-backend",    target: "svc:wallet-svc", kind: "deploys-from" },
  { source: "repo:grudge-studio-dash",target: "svc:dashboard",  kind: "deploys-from" },
  { source: "repo:grudge-ai-hub",     target: "svc:ai-worker",  kind: "deploys-from" },
  { source: "repo:objectstore",       target: "svc:os-worker",  kind: "deploys-from" },
  { source: "repo:objectstore",       target: "svc:os-static",  kind: "deploys-from" },
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export const nodes: SystemNode[] = [
  ...domains,
  ...services,
  ...frontendRoutes,
  ...apiRewrites,
  ...dataSources,
  ...repos,
];

export { edges };

export const readiness: ReadinessRow[] = [
  { serviceId: "svc:frontend",     https: "ok", healthEndpoint: "/api/health",       cors: "ok",      authRequired: "n/a",    rateLimit: "unknown", observability: "missing", backup: "n/a",    runbook: "README.md#deploy", owner: "frontend" },
  { serviceId: "svc:grudge-id",    https: "ok", healthEndpoint: "/api/health",       cors: "ok",      authRequired: "n/a",    rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:game-api",     https: "ok", healthEndpoint: "/api/health",       cors: "ok",      authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:account-api",  https: "ok", healthEndpoint: "/api/health",       cors: "ok",      authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:wallet-svc",   https: "ok", healthEndpoint: "/api/wallet/health",cors: "unknown", authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:r2-cdn",       https: "ok",                                      cors: "ok",      authRequired: "n/a",    rateLimit: "ok",      observability: "ok",      backup: "ok",     owner: "platform" },
  { serviceId: "svc:os-worker",    https: "ok", healthEndpoint: "/health",           cors: "ok",      authRequired: "n/a",    rateLimit: "ok",      observability: "missing", backup: "ok",     owner: "platform" },
  { serviceId: "svc:os-static",    https: "ok",                                      cors: "ok",      authRequired: "n/a",    rateLimit: "ok",      observability: "n/a",     backup: "ok",     owner: "platform" },
  { serviceId: "svc:ai-worker",    https: "ok", healthEndpoint: "/health",           cors: "unknown", authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "n/a",    owner: "platform", runbook: "docs/DEPLOY_OWNERSHIP.md#incident-ai-root-returns-unauthorized" },
  { serviceId: "svc:dashboard",    https: "ok",                                      cors: "n/a",     authRequired: "ok",     rateLimit: "n/a",     observability: "missing", backup: "n/a",    owner: "platform" },
  { serviceId: "svc:colyseus-lobby", https: "missing", cors: "missing",                             authRequired: "missing",rateLimit: "missing", observability: "missing", backup: "n/a",    owner: "backend", runbook: "docs/MULTIPLAYER.md" },
  { serviceId: "svc:launcher",     https: "ok",                                      cors: "unknown", authRequired: "unknown",rateLimit: "unknown", observability: "missing", backup: "unknown", owner: "platform" },
  { serviceId: "svc:status-page",  https: "missing",                                 cors: "n/a",     authRequired: "n/a",    rateLimit: "n/a",     observability: "missing", backup: "n/a",    owner: "platform" },
  { serviceId: "svc:puter-worker", https: "ok",       healthEndpoint: "/api/health",  cors: "unknown", authRequired: "ok",     rateLimit: "unknown", observability: "missing", backup: "n/a",    owner: "platform", runbook: "puter.md" },
  { serviceId: "svc:puter-crafting", https: "ok",                                      cors: "n/a",    authRequired: "n/a",    rateLimit: "n/a",     observability: "missing", backup: "n/a",    owner: "frontend" },
  { serviceId: "svc:puter-auth-bridge", https: "ok",  healthEndpoint: "/auth/puter",  cors: "ok",      authRequired: "n/a",    rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:grudge-platform",   https: "ok",                                  cors: "ok",      authRequired: "n/a",    rateLimit: "unknown", observability: "missing", backup: "n/a",    owner: "frontend", runbook: "docs/audit-report.md#5-cross-repo-checklist" },
  { serviceId: "svc:gaming-portal",     https: "ok",                                  cors: "ok",      authRequired: "n/a",    rateLimit: "unknown", observability: "unknown", backup: "n/a",    owner: "platform", runbook: "docs/references/gs-portal.md" },
];

// Helpers used by the organizer UI
export function getNodeById(id: string): SystemNode | undefined {
  return nodes.find(n => n.id === id);
}

export function neighbors(id: string): { incoming: SystemEdge[]; outgoing: SystemEdge[] } {
  return {
    incoming: edges.filter(e => e.target === id),
    outgoing: edges.filter(e => e.source === id),
  };
}

export const STATUS_COLOR: Record<NodeStatus, string> = {
  live: "#22c55e",
  planned: "#eab308",
  broken: "#ef4444",
  deprecated: "#71717a",
};

export const KIND_COLOR: Record<NodeKind, string> = {
  domain: "#38bdf8",
  service: "#a78bfa",
  frontendRoute: "#f472b6",
  apiRewrite: "#fb923c",
  backendEndpoint: "#22d3ee",
  dataSource: "#facc15",
  repo: "#94a3b8",
};
