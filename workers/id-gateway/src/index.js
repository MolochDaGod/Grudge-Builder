/**
 * grudge-id-gateway — uniform auth hub for id.grudge-studio.com
 *
 * Problem (2026-07): DNS/origin for id pointed at the-engine Railway, which only
 * implements a subset of auth (guest/login) and 404s puter, verify, grudge-bridge,
 * sso-check — while grudge-api-production has the full surface.
 *
 * Fix: edge proxy maps every public auth path → Railway grudge-api, rewrites
 * redirects to stay on id.grudge-studio.com, and sets fleet CORS.
 *
 * Path map (fleet buildFleetHubAuthRewrites):
 *   /login                → /api/auth/page  (redirect_uri → redirect)
 *   /auth/*               → /api/auth/*
 *   /api/auth/*           → /api/auth/*
 *   /grudge-game-bootstrap.js → upstream static
 *   /api/health           → upstream health
 *   /                     → /api/auth/page
 */

const DEFAULT_UPSTREAM = "https://grudge-api-production-0d46.up.railway.app";
const DEFAULT_PUBLIC = "https://id.grudge-studio.com";

const CORS_ORIGINS = [
  "https://grudgewarlords.com",
  "https://www.grudgewarlords.com",
  "https://client.grudge-studio.com",
  "https://grudge-studio.com",
  "https://id.grudge-studio.com",
  "https://launcher.grudge-studio.com",
  "https://character.grudge-studio.com",
  "https://forge.grudge-studio.com",
  "https://grudge-crafting.puter.site",
  "https://grudgeplatform.io",
  "https://ui.grudge-studio.com",
  "https://dash.grudge-studio.com",
  "https://fleet.grudge-studio.com",
  "https://ai.grudge-studio.com",
  "https://puter.com",
  "https://www.puter.com",
  "https://app.puter.com",
];

const CORS_SUFFIXES = [
  ".grudge-studio.com",
  ".puter.site",
  ".puter.work",
  ".vercel.app",
  ".pages.dev",
  ".workers.dev",
  ".up.railway.app",
  ".github.io",
  ".netlify.app",
  ".netlify.live",
  ".cloudflarepages.com",
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (CORS_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (CORS_SUFFIXES.some((s) => u.hostname.endsWith(s) || u.hostname === s.slice(1))) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const h = new Headers();
  if (isAllowedOrigin(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Vary", "Origin");
  } else {
    h.set("Access-Control-Allow-Origin", "*");
  }
  h.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  h.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-Session-Token,If-Match,X-Progress-Revision,X-Requested-With",
  );
  h.set("Access-Control-Expose-Headers", "X-Progress-Revision,ETag");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

/**
 * Map public id URL path+query → upstream Railway path+query.
 */
function mapUpstreamPath(url) {
  const path = url.pathname;
  const params = new URLSearchParams(url.search);

  // Pretty login entry — canonical for all apps
  if (path === "/login" || path === "/login/") {
    // Auth page expects ?redirect= ; fleet uses redirect_uri
    const redirect =
      params.get("redirect") ||
      params.get("redirect_uri") ||
      params.get("return") ||
      params.get("return_to");
    const q = new URLSearchParams();
    if (redirect) q.set("redirect", redirect);
    if (params.get("app")) q.set("app", params.get("app"));
    if (params.get("origin")) q.set("origin", params.get("origin"));
    if (params.get("handoff")) q.set("handoff", params.get("handoff"));
    if (params.get("api")) q.set("api", params.get("api"));
    return "/api/auth/page" + (q.toString() ? `?${q}` : "");
  }

  // Legacy /auth/* hub paths → /api/auth/*
  if (path === "/auth" || path.startsWith("/auth/")) {
    const rest = path === "/auth" || path === "/auth/" ? "" : path.slice("/auth".length);
    // Keep query as-is (sso-check uses ?return=)
    return "/api/auth" + (rest || "") + url.search;
  }

  // Root → auth page
  if (path === "/" || path === "") {
    const redirect =
      params.get("redirect") ||
      params.get("redirect_uri") ||
      params.get("return");
    const q = new URLSearchParams();
    if (redirect) q.set("redirect", redirect);
    return "/api/auth/page" + (q.toString() ? `?${q}` : "");
  }

  // Everything else (api/auth/*, bootstrap, health, static) as-is
  return path + url.search;
}

/**
 * Rewrite Location so browsers never leave id.grudge-studio.com for auth hops.
 */
function rewriteLocation(loc, publicHost, upstreamHost) {
  if (!loc) return loc;
  try {
    // Absolute upstream URL → public host
    if (loc.startsWith("http://") || loc.startsWith("https://")) {
      const u = new URL(loc);
      if (
        u.hostname.includes("railway.app") ||
        u.hostname === upstreamHost ||
        u.hostname === "the-engine.up.railway.app"
      ) {
        // Map Railway auth paths back to pretty id paths
        let p = u.pathname + u.search + u.hash;
        if (p.startsWith("/api/auth/page")) {
          const qs = new URLSearchParams(u.search);
          const redir = qs.get("redirect");
          p = "/login" + (redir ? `?redirect_uri=${encodeURIComponent(redir)}` : "");
        }
        return publicHost.replace(/\/$/, "") + p;
      }
      return loc;
    }
    // Relative /api/auth/page → /login for nicer UX
    if (loc.startsWith("/api/auth/page")) {
      const u = new URL(loc, publicHost);
      const redir = u.searchParams.get("redirect");
      return (
        "/login" +
        (redir ? `?redirect_uri=${encodeURIComponent(redir)}` : u.search || "")
      );
    }
    return loc;
  } catch {
    return loc;
  }
}

/**
 * Auth UI is embedded in super-engine / fleet iframes (grudge-studio.com, Vercel games).
 * Do NOT send X-Frame-Options: SAMEORIGIN — browsers refuse cross-origin frames.
 * CSP frame-ancestors is the allowlist (apex + wildcards + local dev).
 */
function securityHeaders() {
  const frameAncestors = [
    "'self'",
    "https://grudge-studio.com",
    "https://www.grudge-studio.com",
    "https://*.grudge-studio.com",
    "https://grudgewarlords.com",
    "https://www.grudgewarlords.com",
    "https://*.vercel.app",
    "https://*.puter.site",
    "https://*.puter.work",
    "https://puter.com",
    "https://*.pages.dev",
    "https://*.workers.dev",
    "https://*.github.io",
    "https://*.netlify.app",
    "http://localhost:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000",
  ].join(" ");
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Strip legacy frame blocker if upstream set it (helmet, etc.)
    "Content-Security-Policy": `frame-ancestors ${frameAncestors}`,
  };
}

/**
 * Rewrite Set-Cookie so sessions stick on id.grudge-studio.com for the full policy window
 * and can be shared across *.grudge-studio.com (Domain=.grudge-studio.com).
 * Default Max-Age = 30 days when upstream omits or uses a short value.
 */
/** Match Railway JWT_SESSION_TTL default (365d) — max allowed fleet cookie */
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function rewriteSetCookie(setCookieHeader) {
  if (!setCookieHeader) return setCookieHeader;
  // Headers may be multi-value; callers pass one cookie string at a time
  let c = String(setCookieHeader);
  // Drop Railway-host Domain if present
  c = c.replace(/;\s*Domain=[^;]*/gi, "");
  // Studio-wide SSO for first-party apps
  if (!/;\s*Domain=/i.test(c)) {
    c += "; Domain=.grudge-studio.com";
  }
  if (!/;\s*Secure/i.test(c)) c += "; Secure";
  if (!/;\s*SameSite=/i.test(c)) c += "; SameSite=Lax";
  if (!/;\s*Path=/i.test(c)) c += "; Path=/";
  if (/Max-Age=/i.test(c)) {
    c = c.replace(/Max-Age=\d+/i, `Max-Age=${SESSION_COOKIE_MAX_AGE}`);
  } else {
    c += `; Max-Age=${SESSION_COOKIE_MAX_AGE}`;
  }
  // Prefer long Expires matching max-age
  const exp = new Date(Date.now() + SESSION_COOKIE_MAX_AGE * 1000).toUTCString();
  if (/Expires=/i.test(c)) {
    c = c.replace(/Expires=[^;]*/i, `Expires=${exp}`);
  } else {
    c += `; Expires=${exp}`;
  }
  return c;
}

export default {
  async fetch(request, env) {
    const upstreamBase = (env.UPSTREAM || DEFAULT_UPSTREAM).replace(/\/$/, "");
    const publicHost = (env.PUBLIC_HOST || DEFAULT_PUBLIC).replace(/\/$/, "");
    const upstreamHost = new URL(upstreamBase).hostname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const mapped = mapUpstreamPath(url);
    const target = upstreamBase + mapped;

    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      redirect: "manual",
    };
    // Upstream expects its own Host
    init.headers.set("Host", upstreamHost);
    init.headers.set("X-Forwarded-Host", "id.grudge-studio.com");
    init.headers.set("X-Forwarded-Proto", "https");
    init.headers.set("X-Grudge-Auth-Gateway", "id-gateway");
    // Drop hop-by-hop
    init.headers.delete("cf-connecting-ip");
    init.headers.delete("cf-ray");

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    let upstream;
    try {
      upstream = await fetch(target, init);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Auth upstream unreachable",
          upstream: upstreamBase,
          message: String(err?.message || err),
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...Object.fromEntries(corsHeaders(request)),
          },
        },
      );
    }

    const outHeaders = new Headers(upstream.headers);
    // CORS overlay
    const ch = corsHeaders(request);
    ch.forEach((v, k) => outHeaders.set(k, v));
    // Drop upstream frame blockers (helmet SAMEORIGIN, etc.) so fleet iframes work
    outHeaders.delete("X-Frame-Options");
    outHeaders.delete("x-frame-options");
    Object.entries(securityHeaders()).forEach(([k, v]) => outHeaders.set(k, v));
    outHeaders.set("X-Grudge-Auth-Gateway", "id-gateway");
    outHeaders.set("X-Grudge-Upstream", upstreamHost);

    // Rewrite redirects to stay on public host
    const loc = outHeaders.get("Location");
    if (loc) {
      outHeaders.set(
        "Location",
        rewriteLocation(loc, publicHost, upstreamHost),
      );
    }

    // Rewrite Set-Cookie for long-lived studio-wide SSO on *.grudge-studio.com
    const cookies = [];
    if (typeof outHeaders.getSetCookie === "function") {
      for (const sc of outHeaders.getSetCookie()) {
        cookies.push(rewriteSetCookie(sc));
      }
    } else {
      const single = outHeaders.get("Set-Cookie");
      if (single) cookies.push(rewriteSetCookie(single));
    }
    if (cookies.length) {
      outHeaders.delete("Set-Cookie");
      for (const sc of cookies) {
        outHeaders.append("Set-Cookie", sc);
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};
