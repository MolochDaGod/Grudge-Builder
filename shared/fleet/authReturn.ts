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
  "grudgewarlords.com",
  "www.grudgewarlords.com",
  "grudge-studio.com",
  "www.grudge-studio.com",
  "grudge.studio",
  "www.grudge.studio",
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
]);

const SUFFIX_HOSTS = [
  ".grudge-studio.com",
  ".grudge.studio",
  ".vercel.app",
  ".up.railway.app",
  ".pages.dev",
  ".workers.dev",
  ".puter.site",
  ".puter.work",
  ".github.io",
  ".netlify.app",
  ".netlify.live",
  ".cloudflarepages.com",
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

/** Returns true when `url` may receive SSO tokens after Grudge ID login. */
export function isFleetAllowedReturnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (EXACT_HOSTS.has(host)) return true;
    if (extraExactHosts().includes(host)) return true;
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