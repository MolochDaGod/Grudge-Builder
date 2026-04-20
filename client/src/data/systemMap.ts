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
  { id: "dom:grudge-studio.com",  label: "grudge-studio.com",         kind: "domain", status: "live", group: "portal",   url: "https://grudge-studio.com", notes: "Rec0deD:88 gaming portal (emu games, accounts, tournaments, betting). Separate Vercel app — source repo TBD." },
  { id: "dom:engine.g-s.com",     label: "engine.grudge-studio.com",  kind: "domain", status: "live", group: "engine",   url: "https://engine.grudge-studio.com", notes: "Grudge-Engine-Web (Babylon-based 3D editor). VPS Docker/Coolify — separate repo." },
  { id: "dom:grudge-engine.vercel.app", label: "grudge-engine-web.vercel.app", kind: "domain", status: "live", group: "engine", url: "https://grudge-engine-web.vercel.app", notes: "Vercel preview of Grudge-Engine-Web." },
  { id: "dom:id.g-s.com",         label: "id.grudge-studio.com",     kind: "domain", status: "live", group: "auth",    url: "https://id.grudge-studio.com" },
  { id: "dom:api.g-s.com",        label: "api.grudge-studio.com",    kind: "domain", status: "live", group: "backend", url: "https://api.grudge-studio.com/api/health" },
  { id: "dom:account.g-s.com",    label: "account.grudge-studio.com",kind: "domain", status: "live", group: "backend", url: "https://account.grudge-studio.com/health" },
  { id: "dom:assets.g-s.com",     label: "assets.grudge-studio.com", kind: "domain", status: "live", group: "assets",  url: "https://assets.grudge-studio.com" },
  { id: "dom:objectstore.g-s.com",label: "objectstore.grudge-studio.com", kind: "domain", status: "live", group: "assets", url: "https://objectstore.grudge-studio.com/health" },
  { id: "dom:dash.g-s.com",       label: "dash.grudge-studio.com",   kind: "domain", status: "live", group: "admin",   url: "https://dash.grudge-studio.com" },
  { id: "dom:ai.g-s.com",         label: "ai.grudge-studio.com",     kind: "domain", status: "live", group: "ai",      url: "https://ai.grudge-studio.com" },
  { id: "dom:objectstore.gh",     label: "molochdagod.github.io/ObjectStore", kind: "domain", status: "live", group: "assets", url: "https://molochdagod.github.io/ObjectStore" },
  { id: "dom:ws.g-s.com",         label: "ws.grudge-studio.com",     kind: "domain", status: "planned", group: "realtime", notes: "WebSocket real-time (Socket.IO/Colyseus)." },
  { id: "dom:launcher.g-s.com",   label: "launcher.grudge-studio.com", kind: "domain", status: "planned", group: "launcher", notes: "Version manifest & entitlements." },
  { id: "dom:status.g-s.com",     label: "status.grudge-studio.com", kind: "domain", status: "planned", group: "ops",    notes: "Uptime Kuma status page." },
];

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
const services: SystemNode[] = [
  { id: "svc:grudge-id",      label: "Grudge ID (auth)",    kind: "service", status: "live", group: "auth",    owner: "backend", repo: "grudge-backend", notes: "JWT + OAuth (Discord, Google, GitHub, Puter, wallet, guest)." },
  { id: "svc:game-api",       label: "Game API",            kind: "service", status: "live", group: "backend", owner: "backend", repo: "grudge-backend" },
  { id: "svc:account-api",    label: "Account API",         kind: "service", status: "live", group: "backend", owner: "backend", repo: "grudge-backend" },
  { id: "svc:wallet-svc",     label: "Wallet service",      kind: "service", status: "live", group: "backend", owner: "backend", repo: "grudge-backend", notes: "Server-side Solana wallets." },
  { id: "svc:r2-cdn",         label: "R2 CDN",              kind: "service", status: "live", group: "assets",  owner: "platform" },
  { id: "svc:os-worker",      label: "ObjectStore Worker",  kind: "service", status: "live", group: "assets",  owner: "platform", repo: "ObjectStore", notes: "Cloudflare Worker (R2 + D1)." },
  { id: "svc:os-static",      label: "ObjectStore JSON API",kind: "service", status: "live", group: "assets",  owner: "platform", repo: "ObjectStore", notes: "Static GitHub Pages, 55+ endpoints." },
  { id: "svc:ai-worker",      label: "Gruda Legion AI",     kind: "service", status: "live", group: "ai",      owner: "platform", repo: "grudge-ai-hub" },
  { id: "svc:dashboard",      label: "Admin Dashboard",     kind: "service", status: "live", group: "admin",   owner: "platform", repo: "grudge-studio-dash" },
  { id: "svc:frontend",       label: "Grudge Warlords (Three.js SPA)", kind: "service", status: "live", group: "frontend", owner: "frontend", repo: "Grudge-Builder", notes: "This repo. React 19 + Three.js (no Babylon)." },
  { id: "svc:engine-web",     label: "Grudge-Engine-Web (Babylon editor)", kind: "service", status: "live", group: "engine", owner: "platform", repo: "Grudge-Engine-Web", notes: "Separate app. VPS Docker/Coolify + Vercel preview. Not used by Warlords runtime." },
  { id: "svc:gaming-portal",  label: "Rec0deD:88 gaming portal", kind: "service", status: "live", group: "portal", owner: "platform", notes: "grudge-studio.com. Emu library (~1360 NES games) + accounts/tournaments/betting. Source repo TBD." },
  { id: "svc:colyseus-lobby", label: "Colyseus lobby",      kind: "service", status: "live", group: "realtime",owner: "backend", notes: "Dev mode only; WS prod pending ws.g-s.com." },
  { id: "svc:colyseus-dungeon", label: "Colyseus dungeon",  kind: "service", status: "live", group: "realtime",owner: "backend" },
  { id: "svc:launcher",       label: "Launcher service",    kind: "service", status: "planned", group: "launcher", owner: "platform", notes: "Version manifest + entitlements + auto-update." },
  { id: "svc:status-page",    label: "Status page",         kind: "service", status: "planned", group: "ops",   owner: "platform" },
];

// ---------------------------------------------------------------------------
// Frontend routes (mirrors client/src/App.tsx)
// ---------------------------------------------------------------------------
type RouteSeed = { path: string; label: string; group: string; status?: NodeStatus; notes?: string };
const routeSeeds: RouteSeed[] = [
  { path: "/",                  label: "Login",              group: "account" },
  { path: "/auth/callback",     label: "Auth callback",      group: "account" },
  { path: "/intro",             label: "Intro",              group: "account" },
  { path: "/home",              label: "Home",               group: "account" },
  { path: "/account",           label: "Account",            group: "account" },
  { path: "/wallet",            label: "Wallet",             group: "account" },
  { path: "/launcher",          label: "Launcher",           group: "account", notes: "Depends on planned launcher.g-s.com." },

  { path: "/character",         label: "Character Builder",  group: "character" },
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
  { path: "/crafting",          label: "Crafting",           group: "professions" },

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
  { path: "/sprite-admin",      label: "Sprite Admin",       group: "admin" },
  { path: "/ai-helper",         label: "AI Helper",          group: "admin" },
  { path: "/organizer",         label: "System Organizer",   group: "admin", notes: "This page." },
];

const frontendRoutes: SystemNode[] = routeSeeds.map(r => ({
  id: `route:${r.path}`,
  label: r.path,
  kind: "frontendRoute",
  status: r.status ?? "live",
  group: r.group,
  url: `https://grudgewarlords.com${r.path}`,
  notes: r.notes,
}));

// ---------------------------------------------------------------------------
// API rewrites (mirrors vercel.json)
// ---------------------------------------------------------------------------
type RewriteSeed = { source: string; dest: string; target: string; group: string };
const rewriteSeeds: RewriteSeed[] = [
  { source: "/api/account/:path*",     dest: "https://api.grudge-studio.com/api/account/:path*",     target: "svc:account-api", group: "account" },
  { source: "/api/auth/:path*",        dest: "https://id.grudge-studio.com/auth/:path*",             target: "svc:grudge-id",   group: "auth" },
  { source: "/api/wallet",             dest: "https://api.grudge-studio.com/api/wallet",             target: "svc:wallet-svc",  group: "wallet" },
  { source: "/api/wallet/:path*",      dest: "https://api.grudge-studio.com/api/wallet/:path*",      target: "svc:wallet-svc",  group: "wallet" },
  { source: "/api/island/:path*",      dest: "https://api.grudge-studio.com/api/island/:path*",      target: "svc:game-api",    group: "world" },
  { source: "/api/nfts",               dest: "https://api.grudge-studio.com/api/nfts",               target: "svc:game-api",    group: "wallet" },
  { source: "/api/nfts/:path*",        dest: "https://api.grudge-studio.com/api/nfts/:path*",        target: "svc:game-api",    group: "wallet" },
  { source: "/api/island-nfts",        dest: "https://api.grudge-studio.com/api/island-nfts",        target: "svc:game-api",    group: "world" },
  { source: "/api/island-nfts/:path*", dest: "https://api.grudge-studio.com/api/island-nfts/:path*", target: "svc:game-api",    group: "world" },
  { source: "/api/professions/:path*", dest: "https://api.grudge-studio.com/api/professions/:path*", target: "svc:game-api",    group: "professions" },
  { source: "/api/inventory/:path*",   dest: "https://api.grudge-studio.com/api/inventory/:path*",   target: "svc:game-api",    group: "character" },
  { source: "/api/health",             dest: "https://api.grudge-studio.com/api/health",             target: "svc:game-api",    group: "ops" },
  { source: "/api/characters",         dest: "https://api.grudge-studio.com/api/characters",         target: "svc:game-api",    group: "character" },
  { source: "/api/characters/:path*",  dest: "https://api.grudge-studio.com/api/characters/:path*",  target: "svc:game-api",    group: "character" },
  { source: "/api/party",              dest: "https://api.grudge-studio.com/api/party",              target: "svc:game-api",    group: "combat" },
  { source: "/api/party/:path*",       dest: "https://api.grudge-studio.com/api/party/:path*",       target: "svc:game-api",    group: "combat" },
  { source: "/api/tools/:path*",       dest: "https://api.grudge-studio.com/api/tools/:path*",       target: "svc:game-api",    group: "tools" },
  { source: "/api/assets/:path*",      dest: "https://assets.grudge-studio.com/:path*",              target: "svc:r2-cdn",      group: "assets" },
  { source: "/api/game/:path*",        dest: "https://api.grudge-studio.com/api/:path*",             target: "svc:game-api",    group: "backend" },
  { source: "/api/public/:path*",      dest: "https://api.grudge-studio.com/public/:path*",          target: "svc:game-api",    group: "backend" },
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
  { id: "data:master-items",    label: "master-items.json (818)",    kind: "dataSource", status: "live", group: "assets", url: "https://molochdagod.github.io/ObjectStore/api/v1/master-items.json" },
  { id: "data:master-recipes",  label: "master-recipes.json (118)",  kind: "dataSource", status: "live", group: "assets", url: "https://molochdagod.github.io/ObjectStore/api/v1/master-recipes.json" },
  { id: "data:master-materials",label: "master-materials.json (93)", kind: "dataSource", status: "live", group: "assets", url: "https://molochdagod.github.io/ObjectStore/api/v1/master-materials.json" },
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
  { id: "repo:grudge-arena",      label: "grudge-arena",      kind: "repo", status: "live", group: "combat",   url: "https://github.com/MolochDaGod/grudge-arena" },
  { id: "repo:grudge-studio-game",label: "Grudge-Studio-Game",kind: "repo", status: "live", group: "frontend", url: "https://github.com/MolochDaGod/Grudge-Studio-Game" },
  { id: "repo:grudge-engine-web", label: "Grudge-Engine-Web", kind: "repo", status: "live", group: "engine", url: "https://github.com/MolochDaGod/Grudge-Engine-Web", notes: "Babylon + editor. Deploy via deploy.ps1 -> VPS (engine.g-s.com) or Vercel (grudge-engine-web.vercel.app)." },
  { id: "repo:gruda-legion-sdk", label: "gruda-legion-sdk",   kind: "repo", status: "live", group: "ai",       url: "https://github.com/MolochDaGod/gruda-legion-sdk" },
  { id: "repo:mission",           label: "Grudge-Studio-Mission", kind: "repo", status: "live", group: "ops",  url: "https://github.com/Grudge-Warlords/Grudge-Studio-Mission", notes: "North-star mission, architecture, roadmap." },
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
  { source: "repo:grudge-engine-web", target: "svc:engine-web", kind: "deploys-from" },
  { source: "dom:id.g-s.com",         target: "svc:grudge-id",  kind: "routes-to" },
  { source: "dom:api.g-s.com",        target: "svc:game-api",   kind: "routes-to" },
  { source: "dom:api.g-s.com",        target: "svc:wallet-svc", kind: "routes-to" },
  { source: "dom:account.g-s.com",    target: "svc:account-api",kind: "routes-to" },
  { source: "dom:assets.g-s.com",     target: "svc:r2-cdn",     kind: "routes-to" },
  { source: "dom:objectstore.g-s.com",target: "svc:os-worker",  kind: "routes-to" },
  { source: "dom:objectstore.gh",     target: "svc:os-static",  kind: "routes-to" },
  { source: "dom:ai.g-s.com",         target: "svc:ai-worker",  kind: "routes-to" },
  { source: "dom:dash.g-s.com",       target: "svc:dashboard",  kind: "routes-to" },
  { source: "dom:ws.g-s.com",         target: "svc:colyseus-lobby", kind: "routes-to" },
  { source: "dom:launcher.g-s.com",   target: "svc:launcher",   kind: "routes-to" },
  { source: "dom:status.g-s.com",     target: "svc:status-page",kind: "routes-to" },
);

// Frontend -> rewrites
for (const rw of rewriteSeeds) {
  edges.push({ source: "svc:frontend", target: `rw:${rw.source}`, kind: "calls" });
  edges.push({ source: `rw:${rw.source}`, target: rw.target, kind: "rewrites-to" });
}

// Frontend routes -> frontend service
for (const r of routeSeeds) {
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
  { serviceId: "svc:grudge-id",    https: "ok", healthEndpoint: "/health",           cors: "ok",      authRequired: "n/a",    rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:game-api",     https: "ok", healthEndpoint: "/api/health",       cors: "ok",      authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:account-api",  https: "ok", healthEndpoint: "/health",           cors: "ok",      authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:wallet-svc",   https: "ok", healthEndpoint: "/api/wallet/health",cors: "unknown", authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "ok",     owner: "backend" },
  { serviceId: "svc:r2-cdn",       https: "ok",                                      cors: "ok",      authRequired: "n/a",    rateLimit: "ok",      observability: "ok",      backup: "ok",     owner: "platform" },
  { serviceId: "svc:os-worker",    https: "ok", healthEndpoint: "/health",           cors: "ok",      authRequired: "n/a",    rateLimit: "ok",      observability: "missing", backup: "ok",     owner: "platform" },
  { serviceId: "svc:os-static",    https: "ok",                                      cors: "ok",      authRequired: "n/a",    rateLimit: "ok",      observability: "n/a",     backup: "ok",     owner: "platform" },
  { serviceId: "svc:ai-worker",    https: "ok", healthEndpoint: "/health",           cors: "unknown", authRequired: "ok",     rateLimit: "missing", observability: "missing", backup: "n/a",    owner: "platform" },
  { serviceId: "svc:dashboard",    https: "ok",                                      cors: "n/a",     authRequired: "ok",     rateLimit: "n/a",     observability: "missing", backup: "n/a",    owner: "platform" },
  { serviceId: "svc:colyseus-lobby", https: "missing", cors: "missing",                             authRequired: "missing",rateLimit: "missing", observability: "missing", backup: "n/a",    owner: "backend", runbook: "docs/multiplayer.md" },
  { serviceId: "svc:launcher",     https: "missing",                                 cors: "missing", authRequired: "missing",rateLimit: "missing", observability: "missing", backup: "missing", owner: "platform" },
  { serviceId: "svc:status-page",  https: "missing",                                 cors: "n/a",     authRequired: "n/a",    rateLimit: "n/a",     observability: "missing", backup: "n/a",    owner: "platform" },
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
