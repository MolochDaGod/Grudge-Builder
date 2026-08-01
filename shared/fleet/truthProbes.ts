/**
 * ONE TRUTH probe manifest — shared by GrudgeTruthBadge, /systems, CLI, and CI.
 * Import from @shared/fleet/truthProbes everywhere; never duplicate probe URLs.
 */

import { FLEET_URLS } from "./manifest";
import { LIVE_GAME_SERVER_ORIGIN } from "./liveGamePattern";

export type TruthProbeRole =
  | "game-data"
  | "identity"
  | "assets"
  | "objectstore"
  | "icons";

export interface TruthProbeSpec {
  id: string;
  label: string;
  role: TruthProbeRole;
  /** Absolute production URL (CLI, external monitors). */
  productionUrl: string;
  /** Same-origin path when running in a Vercel-hosted browser app. */
  browserPath?: string;
  method?: "GET" | "HEAD";
  /** Fail probe when Content-Type is text/html (split-brain proxy leak). */
  rejectHtml?: boolean;
  /** Auth-gated route: 401 + application/json still counts as reachable API. */
  authGated?: boolean;
  /** Binary icon probe: fail unless Content-Type is image/*. */
  requireImage?: boolean;
  /**
   * Skip in browser audits (cross-origin shells without CORS — e.g. grudge6 SPA).
   * Still probed in CLI / CI with productionUrl.
   */
  browserSkip?: boolean;
}

export interface TruthProbe extends TruthProbeSpec {
  url: string;
  ok?: boolean;
  status?: number;
  detail?: string;
}

export const GRUDGE_TRUTH_LAYERS = {
  identity: { label: "Grudge ID", url: FLEET_URLS.auth },
  gameData: { label: "Game state (Railway)", url: FLEET_URLS.gameData },
  assets: { label: "Binary CDN", url: FLEET_URLS.assets },
  objectStore: {
    label: "JSON data",
    url: FLEET_URLS.objectStore.replace("/api/v1", ""),
  },
  guide: {
    label: "Warlords guide",
    url: "https://info.grudge-studio.com/grudge-guide.html",
  },
} as const;

/** Hosts that indicate split-brain / deprecated routing. */
export const TRUTH_DEPRECATED_HOSTS = [
  "molochdagod.github.io",
  "grudge-objectstore.pages.dev",
] as const;

const ICON_PACK_PATH = "/icons/pack/weapons/Sword_01.png";
const ICON_NAMED_PATH = "/icons/weapons/bloodfeud-blade.png";
const ICON_PACK = `${FLEET_URLS.assets}${ICON_PACK_PATH}`;
const ICON_NAMED = `${FLEET_URLS.assets}${ICON_NAMED_PATH}`;

export const TRUTH_PROBE_SPECS: TruthProbeSpec[] = [
  {
    id: "fleet-manifest",
    label: "Fleet manifest",
    role: "game-data",
    productionUrl: `${FLEET_URLS.gameData}/api/fleet/manifest`,
    browserPath: "/api/fleet/manifest",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "supabase-health",
    label: "Supabase health",
    role: "game-data",
    productionUrl: `${FLEET_URLS.gameData}/api/supabase/health`,
    browserPath: "/api/supabase/health",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "auth-verify",
    label: "Auth verify API",
    role: "identity",
    productionUrl: `${FLEET_URLS.gameData}/api/auth/verify`,
    browserPath: "/api/auth/verify",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "game-characters",
    label: "Characters API",
    role: "game-data",
    productionUrl: `${FLEET_URLS.gameData}/api/characters`,
    browserPath: "/api/characters",
    method: "GET",
    rejectHtml: true,
    authGated: true,
  },
  {
    id: "game-characters-warlords",
    label: "Characters API (era=warlords)",
    role: "game-data",
    productionUrl: `${FLEET_URLS.gameData}/api/characters?era=warlords`,
    browserPath: "/api/characters?era=warlords",
    method: "GET",
    rejectHtml: true,
    authGated: true,
  },
  {
    id: "game-account",
    label: "Account API",
    role: "game-data",
    productionUrl: `${FLEET_URLS.gameData}/api/account`,
    browserPath: "/api/account",
    method: "GET",
    rejectHtml: true,
    authGated: true,
  },
  {
    id: "identity-login",
    label: "Grudge ID login",
    role: "identity",
    productionUrl: `${FLEET_URLS.auth}/login`,
    method: "GET",
    rejectHtml: false,
    browserSkip: true,
  },
  {
    id: "crafting-shell",
    label: "Crafting suite shell",
    role: "identity",
    productionUrl: "https://grudge-crafting.puter.site/",
    method: "GET",
    rejectHtml: false,
    browserSkip: true,
  },
  {
    id: "info-recipes",
    label: "info master-recipes",
    role: "objectstore",
    productionUrl: "https://info.grudge-studio.com/api/v1/master-recipes.json",
    method: "GET",
    rejectHtml: true,
    browserSkip: true,
  },
  {
    id: "game-island-spec",
    label: "Island spec catalog",
    role: "game-data",
    productionUrl: `${FLEET_URLS.gameData}/api/island/spec`,
    browserPath: "/api/island/spec",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "os-items",
    label: "master-items.json",
    role: "objectstore",
    productionUrl: `${FLEET_URLS.objectStore}/master-items.json`,
    browserPath: "/api/objectstore/v1/master-items.json",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "os-recipes",
    label: "master-recipes.json",
    role: "objectstore",
    productionUrl: `${FLEET_URLS.objectStore}/master-recipes.json`,
    browserPath: "/api/objectstore/v1/master-recipes.json",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "os-games-library",
    label: "games-library.json",
    role: "objectstore",
    productionUrl: `${FLEET_URLS.objectStore}/games-library.json`,
    browserPath: "/api/objectstore/v1/games-library.json",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "os-fleet-truth",
    label: "fleet-truth.json",
    role: "objectstore",
    productionUrl: `${FLEET_URLS.objectStore}/_meta/fleet-truth.json`,
    browserPath: "/api/objectstore/v1/_meta/fleet-truth.json",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "icon-pack",
    label: "Pack icon (guide)",
    role: "icons",
    // Always hit CDN absolute URL — relative /icons/* on SPA can 403/404 if rewrite misses
    productionUrl: ICON_PACK,
    browserPath: ICON_PACK,
    method: "GET",
    rejectHtml: true,
    requireImage: true,
  },
  {
    id: "icon-named",
    label: "Named weapon icon",
    role: "icons",
    productionUrl: ICON_NAMED,
    browserPath: ICON_NAMED,
    method: "GET",
    rejectHtml: true,
    requireImage: true,
  },
  {
    id: "assets-cdn",
    label: "Assets CDN (nature GLB)",
    role: "assets",
    // Root `/` and bare `/api/assets/` 404 on client proxy — probe a tiny real binary.
    productionUrl: `${FLEET_URLS.assets}/models/environment/harvest_logs.glb`,
    browserPath: "/api/assets/models/environment/harvest_logs.glb",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "grudge6-game",
    label: "Grudge6 game lab",
    role: "game-data",
    productionUrl: "https://grudge6.grudge-studio.com/game/",
    method: "HEAD",
    rejectHtml: false,
    // Cross-origin SPA — browser fetch logs CORS errors; probe only from CLI
    browserSkip: true,
  },
  {
    id: "home-island-contract",
    label: "Home-island contract",
    role: "objectstore",
    productionUrl: `${FLEET_URLS.objectStore}/home-island-contract.json`,
    browserPath: "/api/objectstore/v1/home-island-contract.json",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "warlords-zones",
    label: "Warlords zones catalog",
    role: "objectstore",
    productionUrl: `${FLEET_URLS.objectStore}/warlords-zones.json`,
    browserPath: "/api/objectstore/v1/warlords-zones.json",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "grudox-live-health",
    label: "GRUDOX live server health",
    role: "game-data",
    productionUrl: `${FLEET_URLS.grudox}/api/health`,
    browserPath: "/api/health",
    method: "GET",
    rejectHtml: true,
  },
  {
    id: "grudox-game-server-direct",
    label: "GRUDOX game server (Railway)",
    role: "game-data",
    productionUrl: `${LIVE_GAME_SERVER_ORIGIN}/api/health`,
    method: "GET",
    rejectHtml: true,
    // Cross-origin Railway — no CORS for client.grudge-studio.com browser audits
    browserSkip: true,
  },
  {
    id: "grudox-hub",
    label: "GRUDOX hub shell",
    role: "game-data",
    productionUrl: `${FLEET_URLS.grudox}/`,
    method: "HEAD",
    rejectHtml: false,
    browserSkip: true,
  },
  {
    id: "carrier-health",
    label: "Carrier / GRUDOX room health",
    role: "game-data",
    productionUrl: `${FLEET_URLS.carrier}/api/health`,
    method: "GET",
    rejectHtml: true,
    // Carrier is L3 edge (WS + health). Shell HTML is optional Worker static.
    browserSkip: true,
  },
  {
    id: "carrier-hub",
    label: "Carrier game shell",
    role: "game-data",
    productionUrl: `${FLEET_URLS.carrier}/`,
    method: "HEAD",
    rejectHtml: false,
    // Carrier root has no Access-Control-Allow-Origin for client SPA — skip browser
    // probes (avoids red CORS spam on every page). Still checked in CLI/CI.
    browserSkip: true,
  },
];

export type TruthProbeMode = "browser" | "cli";

export function resolveProbeUrl(spec: TruthProbeSpec, mode: TruthProbeMode): string {
  if (mode === "browser" && spec.browserPath) return spec.browserPath;
  return spec.productionUrl;
}

export function buildTruthProbes(mode: TruthProbeMode = "browser"): TruthProbe[] {
  return TRUTH_PROBE_SPECS.filter((spec) => !(mode === "browser" && spec.browserSkip)).map(
    (spec) => ({
      ...spec,
      url: resolveProbeUrl(spec, mode),
    }),
  );
}

export async function probeTruthEndpoint(
  probe: TruthProbe,
  fetchFn: typeof fetch = fetch,
): Promise<TruthProbe> {
  const method = probe.method ?? (probe.role === "game-data" || probe.role === "objectstore" || probe.role === "identity" ? "GET" : "HEAD");
  const rejectHtml = probe.rejectHtml ?? probe.role !== "assets";

  const wantsJson =
    method === "GET" &&
    (probe.role === "game-data" ||
      probe.role === "identity" ||
      probe.role === "objectstore");

  try {
    const res = await fetchFn(probe.url, {
      method,
      headers: wantsJson ? { Accept: "application/json" } : undefined,
    });
    const contentType = res.headers.get("content-type") || "";
    const htmlLeak = rejectHtml && contentType.includes("text/html");
    const deprecated = TRUTH_DEPRECATED_HOSTS.some((h) => probe.url.includes(h));
    const jsonApi =
      contentType.includes("application/json") || contentType.includes("+json");
    const authReachable =
      !!probe.authGated && res.status === 401 && jsonApi && !htmlLeak;
    const imageOk =
      !probe.requireImage || contentType.toLowerCase().startsWith("image/");
    const imageFail = probe.requireImage && res.ok && !imageOk;
    return {
      ...probe,
      ok:
        (res.ok || authReachable) && !htmlLeak && !deprecated && !imageFail,
      status: res.status,
      detail: deprecated
        ? "deprecated GitHub Pages host"
        : htmlLeak
          ? "HTML leak (split-brain proxy)"
          : imageFail
            ? `expected image/*, got ${contentType.split(";")[0] || "unknown"}`
            : authReachable
              ? "application/json (auth required)"
              : contentType.split(";")[0] || method,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unreachable";
    return { ...probe, ok: false, detail: message };
  }
}

/** Valid definition hosts (ObjectStore worker + info docs mirror). */
const CANONICAL_DEFS_HOSTS = [
  "objectstore.grudge-studio.com",
  "info.grudge-studio.com",
] as const;

export function detectSplitBrain(probes: TruthProbe[]): string[] {
  const canonicalObjectStore = FLEET_URLS.objectStore;
  const issues: string[] = [];
  for (const p of probes) {
    const rejectHtml = p.rejectHtml ?? p.role !== "assets";
    if (rejectHtml && p.detail?.toLowerCase().includes("html")) {
      issues.push(`${p.label}: routing to frontend, not API`);
    }
    if (p.detail?.toLowerCase().includes("deprecated")) {
      issues.push(`${p.label}: still on deprecated GitHub Pages`);
    }
    for (const host of TRUTH_DEPRECATED_HOSTS) {
      if (p.url.includes(host)) {
        issues.push(`${p.label}: still on deprecated host (${host})`);
      }
    }
    // Defs may live on objectstore OR info — both are fleet-owned, not Pages dual-truth
    if (p.role === "objectstore" && p.ok) {
      const onCanonical =
        p.url.includes("/api/objectstore/") ||
        p.url.startsWith(canonicalObjectStore) ||
        p.productionUrl.startsWith(canonicalObjectStore) ||
        CANONICAL_DEFS_HOSTS.some((h) => p.url.includes(h) || p.productionUrl.includes(h));
      if (!onCanonical) {
        issues.push(`${p.label}: not using canonical objectstore/info host`);
      }
    }
  }
  return issues;
}

export function scoreTruthProbes(probes: TruthProbe[]): number {
  if (probes.length === 0) return 0;
  const ok = probes.filter((p) => p.ok).length;
  return Math.round((ok / probes.length) * 100);
}

export async function runTruthAudit(
  mode: TruthProbeMode = "browser",
  fetchFn: typeof fetch = fetch,
): Promise<{
  probes: TruthProbe[];
  score: number;
  splitBrain: string[];
}> {
  const probes = buildTruthProbes(mode);
  const results = await Promise.all(
    probes.map((p) => probeTruthEndpoint(p, fetchFn)),
  );
  return {
    probes: results,
    score: scoreTruthProbes(results),
    splitBrain: detectSplitBrain(results),
  };
}