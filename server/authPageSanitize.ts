import {
  getAllowedHosts,
  validateReturnUrl,
  isStudioOrigin,
  type StudioOriginOpts,
} from "@shared/fleet/studioOrigins";

const RETURN_KEYS = new Set(["redirect_uri", "redirect", "return_to", "return", "returnUrl"]);
const RETURN_KEY_ORDER = ["redirect_uri", "redirect", "return_to", "return", "returnUrl"];
const ORIGIN_KEYS = new Set(["origin", "audience"]);
const ORIGIN_KEY_ORDER = ["origin", "audience"];

/** Canonical API host for Railway game-data backend (the only external API the auth page contacts). */
const CANONICAL_API_HOST = "grudge-api-production-0d46.up.railway.app";

export type AuthPageQueryResult = {
  /** true when the incoming query must be replaced (302) by `query`. */
  changed: boolean;
  /** Canonical query string (no leading "?"). */
  query: string;
};

/**
 * Canonicalise the Grudge ID auth-page query.
 *
 * Return aliases (redirect_uri / redirect / return_to / return / returnUrl) and
 * origin aliases (origin / audience) are validated against the exact studio
 * allowlist and collapsed to `redirect_uri` + `redirect` and `origin`. Unsafe
 * values are dropped. Every other parameter (app, api, handoff, view, state,
 * scope, error, ...) is preserved unchanged.
 *
 * The comparison is order-insensitive, so the id-gateway Worker's parameter
 * order never triggers a redirect loop.
 */
export function canonicalAuthPageQuery(
  rawSearch: string,
  opts: StudioOriginOpts & { base: string },
): AuthPageQueryResult {
  const incoming = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
  const validate = (value: string) =>
    validateReturnUrl(value, {
      base: opts.base,
      dev: opts.dev,
      extraHosts: opts.extraHosts,
      fallback: "",
    });

  let rawReturn = "";
  for (const key of RETURN_KEY_ORDER) {
    const value = incoming.get(key);
    if (value) {
      rawReturn = value;
      break;
    }
  }
  let rawOrigin = "";
  for (const key of ORIGIN_KEY_ORDER) {
    const value = incoming.get(key);
    if (value) {
      rawOrigin = value;
      break;
    }
  }

  const safeReturn = rawReturn ? validate(rawReturn) : "";
  let safeOrigin = "";
  if (rawOrigin) {
    const validated = validate(rawOrigin);
    if (validated) {
      try {
        safeOrigin = new URL(validated).origin;
      } catch {
        safeOrigin = "";
      }
    }
  }

  const out = new URLSearchParams();
  if (safeReturn) {
    out.set("redirect_uri", safeReturn);
    out.set("redirect", safeReturn);
  }
  if (safeOrigin) out.set("origin", safeOrigin);
  
  // Validate api param: only same-origin or the canonical Railway backend
  const rawApi = incoming.get("api");
  let safeApi = "";
  if (rawApi) {
    try {
      const apiUrl = new URL(rawApi, opts.base);
      const apiOrigin = apiUrl.origin;
      // Accept same-origin (e.g., localhost:5000 during dev) or the exact canonical API host
      if (apiOrigin === opts.base.replace(/\/$/, "") || apiUrl.hostname === CANONICAL_API_HOST) {
        safeApi = apiOrigin;
      }
    } catch {
      // Invalid URL: drop it
    }
  }
  
  incoming.forEach((value, key) => {
    if (RETURN_KEYS.has(key) || ORIGIN_KEYS.has(key)) return;
    if (key === "api") return; // Already validated above
    out.append(key, value);
  });
  
  if (safeApi) out.set("api", safeApi);

  const a = new URLSearchParams(incoming);
  a.sort();
  const b = new URLSearchParams(out);
  b.sort();
  return { changed: a.toString() !== b.toString(), query: out.toString() };
}

/**
 * Inject the server-computed allowlist and dev flag into the auth page.
 * Replaces EVERY occurrence of each placeholder (the template references the
 * host placeholder twice). Defaults stay production when a placeholder is absent.
 */
export function injectAuthPageConfig(html: string, opts: StudioOriginOpts): string {
  const hosts = JSON.stringify(getAllowedHosts(opts)).replace(/</g, "\\u003c");
  const dev = JSON.stringify(opts.dev === true);
  return html
    .split("/*__GRUDGE_ALLOWED_RETURN_HOSTS__*/[]")
    .join(hosts)
    .split("/*__GRUDGE_STUDIO_DEV__*/false")
    .join(dev)
    .split("/*__GRUDGE_ALLOW_LOCALHOST__*/false")
    .join(dev);
}
