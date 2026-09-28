import { warlordsPlayOrigin } from "./warlordsDomains";
import { validateReturnUrl } from "./studioOrigins";

/**
 * Fleet SSO return-url allowlist — shared by auth routes and client redirects.
 * Any game, site, or service origin that may receive ?sso_token= / ?grudge_token= after login.
 *
 * Production / signed custom hosts: set AUTH_EXTRA_RETURN_HOSTS=example.com,app.partner.io
 * (comma-separated hostnames, no scheme) on Railway grudge-api-production.
 */

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
export function isFleetAllowedReturnUrl(
  url: string,
  opts: { dev?: boolean; extraHosts?: string | string[]; base?: string } = {},
): boolean {
  const resolved = validateReturnUrl(url, {
    base: opts.base,
    dev: opts.dev,
    extraHosts: opts.extraHosts,
    fallback: "",
  });
  if (!resolved) return false;
  try {
    const parsed = new URL(resolved);
    if (isEphemeralVercelHost(parsed.hostname.toLowerCase())) return false;
    return true;
  } catch {
    return false;
  }
}

/** Pick the best return URL from query params (sso-check, login, OAuth state). */
export function resolveFleetReturnUrl(
  query: Record<string, string | string[] | undefined>,
  fallback = "https://grudgewarlords.com/",
  opts: { dev?: boolean; extraHosts?: string | string[]; base?: string } = {},
): string {
  for (const key of ["return", "return_to", "redirect", "redirect_uri", "returnUrl"]) {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) continue;
    const resolved = validateReturnUrl(value, {
      base: opts.base,
      dev: opts.dev,
      extraHosts: opts.extraHosts,
      fallback: "",
    });
    if (!resolved) continue;
    try {
      if (isEphemeralVercelHost(new URL(resolved).hostname.toLowerCase())) continue;
    } catch {
      continue;
    }
    return resolved;
  }
  return fallback;
}