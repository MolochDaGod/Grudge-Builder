/**
 * Fleet SSO return-url allowlist — shared by auth routes and client redirects.
 * Any game, site, or service origin that may receive ?sso_token= after login.
 */

const EXACT_HOSTS = new Set([
  "localhost",
  "grudgewarlords.com",
  "www.grudgewarlords.com",
  "grudge-studio.com",
  "www.grudge-studio.com",
  "grudgestudio.org",
  "grudgeplatform.io",
]);

const SUFFIX_HOSTS = [
  ".grudge-studio.com",
  ".vercel.app",
  ".up.railway.app",
  ".pages.dev",
  ".puter.site",
  ".puter.work",
];

/** Returns true when `url` may receive SSO tokens after Grudge ID login. */
export function isFleetAllowedReturnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
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