import { warlordsPlayOrigin } from "./warlordsDomains";

/**
 * Fleet SSO return-url allowlist — shared by auth routes and client redirects.
 * Any game, site, or service origin that may receive ?sso_token= / ?grudge_token= after login.
 *
 * Production / signed custom hosts: set AUTH_EXTRA_RETURN_HOSTS=example.com,app.partner.io
 * (comma-separated hostnames, no scheme) on Railway grudge-api-production.
 */

const EXACT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  // Warlords product apex + SPA
  "grudgewarlords.com",
  "www.grudgewarlords.com",
  // Warlords zone subdomains (CNAME → same SPA when DNS live)
  "play.grudgewarlords.com",
  "client.grudgewarlords.com",
  "airship.grudgewarlords.com",
  "home.grudgewarlords.com",
  "map.grudgewarlords.com",
  "scenes.grudgewarlords.com",
  "craft.grudgewarlords.com",
  "foundry.grudgewarlords.com",
  // Portal apex — also covers path products e.g. https://grudge-studio.com/gst (Game Studio Tool)
  "grudge-studio.com",
  "www.grudge-studio.com",
  "client.grudge-studio.com",
  // Stable production Vercel satellites only — never unique/hash/git previews
  "grudge-studio-tool.vercel.app",
  "grudge-builder.vercel.app",
  "grudge-builder-grudgenexus.vercel.app",
  "gameopen.vercel.app",
  "warlord-genesis.vercel.app",
  "rts-grudge.vercel.app",
  "voxgrudge.vercel.app",
  "casting-abilities-threejs.vercel.app",
  "grudge-studio-editor.vercel.app",
  "grudge-three-port.vercel.app",
  "flare-boss-arena.vercel.app",
  "mech-playground.vercel.app",
  "grudge.studio",
  "www.grudge.studio",
  // Era play clients + account hub (DNS → Vercel grudge-builder)
  "warlords.grudge.studio",
  "nexus.grudge.studio",
  "voxel.grudge.studio",
  "account.grudge.studio",
  "apps.grudge.studio",
  "grudgestudio.org",
  "grudgeplatform.io",
  "puter.com",
  "www.puter.com",
  "app.puter.com",
  // Explicit Puter fleet satellites (also covered by .puter.site suffix)
  "grudge-crafting.puter.site",
  "grudgewarlords.puter.site",
  "grudgestudio.puter.site",
  "grudge-studio.puter.site",
  "grudge-heros.puter.site",
  // Mine-Loader / Voxel Realms
  "mine-loader.vercel.app",
  "mine.grudge-studio.com",
]);

const SUFFIX_HOSTS = [
  ".grudgewarlords.com",
  ".grudge-studio.com",
  ".grudge.studio",
  ".up.railway.app",
  ".pages.dev",
  ".workers.dev",
  ".puter.site",
  ".puter.work",
  ".github.io",
  ".netlify.app",
  ".netlify.live",
  ".cloudflarepages.com",
  // Grok App Builder live preview (wallet hub + fleet SSO test)
  ".grok-sandbox.com",
];

/** Optional production/signed hosts from env (server) or globalThis (embed). */
function extraExactHosts(): string[] {
  try {
    const raw =
      (typeof process !== "undefined" &&
        process.env &&
        (process.env.AUTH_EXTRA_RETURN_HOSTS || process.env.GRUDGE_AUTH_EXTRA_HOSTS)) ||
      (typeof globalThis !== "undefined" &&
        (globalThis as { AUTH_EXTRA_RETURN_HOSTS?: string }).AUTH_EXTRA_RETURN_HOSTS) ||
      "";
    return String(raw)
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Unique deploy + git-branch Vercel hosts.
 * Examples: grudge-builder-4ou1a2tv6-grudgenexus.vercel.app
 *           grudge-builder-git-feat-lava-caesar-boss-grudgenexus.vercel.app
 * Not: grudge-builder.vercel.app / grudge-builder-grudgenexus.vercel.app
 */
export function isEphemeralVercelHost(hostname: string): boolean {
  const h = String(hostname || "").toLowerCase();
  if (!h.endsWith(".vercel.app")) return false;
  if (h.includes("-git-")) return true;
  return /-[a-z0-9]{8,12}-[a-z0-9]+\.vercel\.app$/.test(h);
}

/** Preview hash hosts must not be SSO/Foundry return origins. */
export function canonicalSsoReturnOrigin(origin: string): string {
  try {
    const u = new URL(origin.includes("://") ? origin : `https://${origin}`);
    if (isEphemeralVercelHost(u.hostname)) return warlordsPlayOrigin();
    // Legacy studio play brand → Warlords apex (production MMO is grudgewarlords.com)
    const h = u.hostname.toLowerCase();
    if (h === "client.grudge-studio.com" || h === "warlord3d.grudge-studio.com") {
      return warlordsPlayOrigin();
    }
    return u.origin;
  } catch {
    return warlordsPlayOrigin();
  }
}

/** Returns true when `url` may receive SSO tokens after Grudge ID login. */
export function isFleetAllowedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const local = host === "localhost" || host === "127.0.0.1";
    if (!local && u.protocol !== "https:") return false;
    if (extraExactHosts().includes(host)) return true;
    if (isEphemeralVercelHost(host)) return false;
    if (EXACT_HOSTS.has(host)) return true;
    return SUFFIX_HOSTS.some((suffix) => host.endsWith(suffix) || host === suffix.slice(1));
  } catch {
    return false;
  }
}

/** Pick the best return URL from query params (sso-check, login, OAuth state). */
export function resolveFleetReturnUrl(
  query: Record<string, string | string[] | undefined>,
  fallback = "https://grudgewarlords.com/",
): string {
  for (const key of ["return", "return_to", "redirect", "redirect_uri"]) {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && isFleetAllowedReturnUrl(value)) return value;
  }
  return fallback;
}