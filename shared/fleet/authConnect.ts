/**
 * Grudge Studio — canonical auth connectivity (ONE TRUTH).
 *
 * Every app, Worker, and Vercel deployment must follow this map.
 * Run: `npx tsx scripts/probe-fleet-auth.ts` to detect split-brain routing.
 */

import { FLEET_URLS } from "./manifest";
import { isFleetAllowedReturnUrl } from "./authReturn";

/** Public Grudge ID gateway — always use this in browser apps, never Railway directly. */
export const FLEET_AUTH_GATEWAY = FLEET_URLS.auth;

/** Railway implementation — Vercel/id rewrites proxy here; do not hardcode in SPAs. */
export const FLEET_AUTH_IMPLEMENTATION = FLEET_URLS.gameData;

/** Deprecated — TLS dead / stale VPS tunnel. Never route new auth here. */
export const FLEET_AUTH_DEPRECATED_API = "https://api.grudge-studio.com";

export const FLEET_AUTH_TOKEN_KEYS = [
  "grudge.open.token",
  "grudge_auth_token",
  "grudge_session_token",
  "grudge.token",
  "sso_token",
  "grudge_token",
] as const;

/** Drop stale JWTs + portal cache so 401s do not replay every navigation. */
export function clearFleetAuthTokens(): void {
  if (typeof localStorage === "undefined") return;
  try {
    for (const k of FLEET_AUTH_TOKEN_KEYS) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    }
    localStorage.removeItem("grudge.token.exp");
    localStorage.removeItem("grudge_portal_universe");
  } catch {
    /* ignore */
  }
}

export function readFleetAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    for (const k of FLEET_AUTH_TOKEN_KEYS) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v && v.split(".").length === 3 && v.length > 20) return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const FLEET_AUTH_PROFILE_KEYS = [
  "grudge_id",
  "grudge_username",
  "grudge_user_id",
] as const;

/** Query/hash params consumed on return from id.grudge-studio.com */
export const FLEET_AUTH_RETURN_PARAMS = [
  "grudge_token",
  "sso_token",
  "token",
  "grudge_id",
  "grudgeId",
  "grudge_username",
  "username",
  "provider",
] as const;

/**
 * Canonical browser login entry — works when id Vercel rewrites are correct.
 * Opens Grudge ID page; after sign-in, auth-page appends ?grudge_token= to redirect_uri.
 */
export function buildFleetLoginUrl(
  callbackUrl: string,
  gateway: string = FLEET_AUTH_GATEWAY,
): string {
  if (!isFleetAllowedReturnUrl(callbackUrl)) {
    throw new Error(`Return URL not on fleet allowlist: ${callbackUrl}`);
  }
  return `${gateway.replace(/\/$/, "")}/login?redirect_uri=${encodeURIComponent(callbackUrl)}`;
}

/**
 * Session-aware SSO — skips login UI when browser already has Grudge session cookie.
 * Requires id `/auth/:path*` → Railway `/api/auth/:path*` rewrites (see buildFleetHubAuthRewrites).
 */
export function buildFleetSsoCheckUrl(
  callbackUrl: string,
  gateway: string = FLEET_AUTH_GATEWAY,
): string {
  if (!isFleetAllowedReturnUrl(callbackUrl)) {
    throw new Error(`Return URL not on fleet allowlist: ${callbackUrl}`);
  }
  return `${gateway.replace(/\/$/, "")}/auth/sso-check?return=${encodeURIComponent(callbackUrl)}`;
}

/** Build callback URL on an app origin (default /auth/callback). */
export function buildFleetAuthCallback(
  origin: string,
  path = "/auth/callback",
): string {
  const base = origin.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Preferred login URL for any Grudge SPA.
 * Uses /login (always works); sso-check is opt-in via preferSsoCheck when routing is verified.
 */
export function buildFleetAuthLoginUrl(
  origin: string,
  opts: { path?: string; gateway?: string; preferSsoCheck?: boolean } = {},
): string {
  const callback = buildFleetAuthCallback(origin, opts.path ?? "/auth/callback");
  const gateway = opts.gateway ?? FLEET_AUTH_GATEWAY;
  if (opts.preferSsoCheck) {
    return buildFleetSsoCheckUrl(callback, gateway);
  }
  return buildFleetLoginUrl(callback, gateway);
}

/** Same-origin API paths every satellite Vercel app should proxy (see buildFleetSatelliteRewrites). */
export const FLEET_AUTH_PROXY_PATHS = {
  authApi: "/api/auth/:path*",
  authLegacy: "/auth/:path*",
  login: "/login",
  callbackSpa: "/auth/callback",
} as const;

/** Railway auth routes (implementation). */
export const FLEET_AUTH_RAILWAY_ROUTES = {
  page: "/api/auth/page",
  guest: "POST /api/auth/guest",
  puterSso: "POST /api/auth/puter-sso",
  puter: "POST /api/auth/puter",
  popupToken: "POST /api/auth/popup-token",
  sessionExchange: "POST /api/auth/session/exchange",
  grudgeBridge: "POST /api/auth/grudge-bridge",
  me: "GET /api/auth/me",
  verify: "GET /api/auth/verify",
  ssoCheck: "GET /api/auth/sso-check",
} as const;

export interface AuthConnectProbeSpec {
  id: string;
  label: string;
  url: string;
  /** Expect HTTP redirect (302/307) */
  expectRedirect?: boolean;
  /** Expect 200 HTML auth page */
  expectHtml?: boolean;
  /** Must NOT return Express 404 HTML */
  mustNot404?: boolean;
}

export function buildAuthConnectProbes(): AuthConnectProbeSpec[] {
  const callback =
    "https://warlord-genesis.vercel.app/auth/callback";
  const enc = encodeURIComponent(callback);
  return [
    {
      id: "railway-sso-check",
      label: "Railway sso-check (implementation)",
      url: `${FLEET_AUTH_IMPLEMENTATION}/api/auth/sso-check?return=${enc}`,
      expectRedirect: true,
      mustNot404: true,
    },
    {
      id: "id-login",
      label: "id.grudge-studio.com /login",
      url: `${FLEET_AUTH_GATEWAY}/login?redirect_uri=${enc}`,
      expectRedirect: true,
      mustNot404: true,
    },
    {
      id: "id-auth-page",
      label: "id.grudge-studio.com auth page",
      url: `${FLEET_AUTH_GATEWAY}/api/auth/page?redirect=${enc}`,
      expectHtml: true,
      mustNot404: true,
    },
    {
      id: "id-sso-check",
      label: "id.grudge-studio.com /auth/sso-check (rewrite)",
      url: `${FLEET_AUTH_GATEWAY}/auth/sso-check?return=${enc}`,
      expectRedirect: true,
      mustNot404: true,
    },
    {
      id: "deprecated-api-sso",
      label: "api.grudge-studio.com (deprecated — must not be used)",
      url: `${FLEET_AUTH_DEPRECATED_API}/api/auth/sso-check?return=${enc}`,
      mustNot404: false,
    },
    {
      id: "railway-guest",
      label: "Railway guest (silent session)",
      url: `${FLEET_AUTH_IMPLEMENTATION}/api/auth/guest`,
      mustNot404: true,
    },
  ];
}

export interface AuthConnectProbeResult extends AuthConnectProbeSpec {
  ok: boolean;
  status?: number;
  detail?: string;
  fix?: string;
}

const CORRECTIONS: Record<string, string> = {
  "id-sso-check":
    "id.grudge-studio.com must use buildFleetHubAuthRewrites() in vercel.json: " +
    '`/auth/:path*` → `${gameData}/api/auth/:path*`. Redeploy GrudgeBuilder with id.grudge-studio.com alias. ' +
    "Until fixed, apps should use buildFleetLoginUrl() (/login?redirect_uri=) instead of sso-check.",
  "deprecated-api-sso":
    "Remove api.grudge-studio.com from auth rewrites. Canonical gateway is id.grudge-studio.com only.",
  "id-login":
    "Attach id.grudge-studio.com to GrudgeBuilder Vercel project; ensure /login rewrite to Railway /api/auth/page.",
  "id-auth-page":
    "Auth page missing — deploy GrudgeBuilder Railway + verify server/templates/auth-page.html ships.",
  "railway-sso-check":
    "Deploy latest GrudgeBuilder to Railway (grudge-api-production). Route exists in server/routes/auth.ts.",
  "railway-guest":
    "POST /api/auth/guest failing — check Railway DATABASE_URL and auth routes registration.",
};

export async function probeAuthConnectEndpoint(
  spec: AuthConnectProbeSpec,
  fetchFn: typeof fetch = fetch,
): Promise<AuthConnectProbeResult> {
  const method = spec.id === "railway-guest" ? "POST" : "GET";
  try {
    const res = await fetchFn(spec.url, {
      method,
      redirect: "manual",
      headers:
        method === "POST"
          ? { "Content-Type": "application/json", Accept: "application/json" }
          : { Accept: "text/html,application/json" },
      body: method === "POST" ? "{}" : undefined,
    });
    const status = res.status;
    const ct = res.headers.get("content-type") || "";
    const is404 = status === 404;
    const isRedirect = status >= 300 && status < 400;
    const isHtml = ct.includes("text/html");
    const isJson = ct.includes("application/json");

    let ok = true;
    if (spec.mustNot404 && is404) ok = false;
    if (spec.expectRedirect && !isRedirect) ok = false;
    if (spec.expectHtml && !(status === 200 && isHtml)) ok = false;
    if (spec.id === "railway-guest" && !(isJson && (res.ok || status === 201))) ok = false;
    if (spec.id === "deprecated-api-sso" && is404) ok = true;

    let detail = `${status} ${ct.split(";")[0] || ""}`.trim();
    if (is404 && spec.mustNot404) {
      const text = await res.text().catch(() => "");
      if (text.includes("Cannot GET")) detail += " — split-brain proxy";
    }

    return {
      ...spec,
      ok,
      status,
      detail,
      fix: ok ? undefined : CORRECTIONS[spec.id],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unreachable";
    return {
      ...spec,
      ok: false,
      detail: message,
      fix: CORRECTIONS[spec.id],
    };
  }
}

export async function runAuthConnectAudit(
  fetchFn: typeof fetch = fetch,
): Promise<{
  probes: AuthConnectProbeResult[];
  score: number;
  corrections: string[];
}> {
  const specs = buildAuthConnectProbes();
  const probes = await Promise.all(
    specs.map((s) => probeAuthConnectEndpoint(s, fetchFn)),
  );
  const score = Math.round(
    (probes.filter((p) => p.ok).length / probes.length) * 100,
  );
  const corrections = [
    ...new Set(probes.filter((p) => !p.ok && p.fix).map((p) => p.fix!)),
  ];
  return { probes, score, corrections };
}

/** Symptom → fix lookup for any app reporting auth connection failures. */
export interface AuthSymptomFix {
  id: string;
  /** Substrings matched case-insensitively against error text, URL, or status line. */
  match: readonly string[];
  symptom: string;
  fix: string;
  probeId?: string;
}

export const FLEET_AUTH_SYMPTOM_FIXES: readonly AuthSymptomFix[] = [
  {
    id: "sso-check-404",
    match: [
      "cannot get /api/auth/sso-check",
      "/auth/sso-check",
      "id-sso-check",
      "sso login failed",
    ],
    symptom: "SSO redirect hits id.grudge-studio.com/auth/sso-check and returns 404",
    fix:
      "Use canonical login: buildFleetLoginUrl() → /login?redirect_uri=<callback>. " +
      "Redeploy GrudgeBuilder to Vercel with id.grudge-studio.com alias and buildFleetHubAuthRewrites() " +
      "(/auth/:path* → Railway /api/auth/:path*). Run npm run probe:auth until id-sso-check passes.",
    probeId: "id-sso-check",
  },
  {
    id: "deprecated-api",
    match: ["api.grudge-studio.com", "deprecated-api-sso"],
    symptom: "App still points auth at api.grudge-studio.com (dead VPS tunnel)",
    fix:
      "Replace all api.grudge-studio.com auth URLs with id.grudge-studio.com. " +
      "Game data stays on same-origin /api/characters → Railway.",
    probeId: "deprecated-api-sso",
  },
  {
    id: "railway-cors",
    match: [
      "grudge-api-production",
      "cors",
      "access-control-allow-origin",
      "blocked by cors",
    ],
    symptom: "Browser calls Railway URL directly and gets CORS errors",
    fix:
      "Never fetch grudge-api-production-0d46.up.railway.app from the browser. " +
      "Proxy via Vercel: buildFleetSatelliteRewrites() — /api/auth/*, /api/characters, /api/account.",
  },
  {
    id: "no-token-return",
    match: [
      "grudge_token",
      "sso_token",
      "auth/callback",
      "pickup",
      "token missing",
    ],
    symptom: "User returns from login but app has no token in localStorage",
    fix:
      "On boot call GrudgeAuth.pickup() or read ?grudge_token / ?sso_token from URL. " +
      "Ensure callback route is /auth/callback (SPA rewrite to index.html). " +
      "Store as grudge_auth_token. Token keys: " + FLEET_AUTH_TOKEN_KEYS.join(", "),
  },
  {
    id: "guest-fails",
    match: ["/api/auth/guest", "railway-guest", "guest session"],
    symptom: "Silent guest session (POST /api/auth/guest) fails",
    fix:
      "Satellite app must proxy /api/auth/:path* to id.grudge-studio.com (or Railway on hub). " +
      "Check Railway DATABASE_URL and auth route registration in server/routes/auth.ts.",
    probeId: "railway-guest",
  },
  {
    id: "id-login-broken",
    match: ["id-login", "/login?redirect_uri", "cannot get /api/auth/page"],
    symptom: "id.grudge-studio.com/login does not redirect to auth page",
    fix:
      "Attach id.grudge-studio.com to GrudgeBuilder Vercel project. " +
      "vercel.json needs /login → Railway /api/auth/page. Redeploy and re-run probe:auth.",
    probeId: "id-login",
  },
  {
    id: "split-brain",
    match: ["split-brain", "cannot get /api/auth"],
    symptom: "id gateway proxies to wrong backend (Express 404 on /api/auth/*)",
    fix:
      "Production Vercel is stale or mis-aliased. Sync: npx tsx scripts/sync-vercel-fleet.mjs, " +
      "deploy GrudgeBuilder, confirm id.grudge-studio.com alias. Hub rewrites: buildFleetHubAuthRewrites().",
  },
  {
    id: "wrong-satellite-rewrite",
    match: [
      "id.grudge-studio.com/auth/:path*",
      "destination.*id.*auth/:path",
    ],
    symptom: "Satellite vercel.json proxies /api/auth to id/auth (broken chain)",
    fix:
      "Use buildFleetSatelliteRewrites() from shared/fleet/manifest.ts — " +
      "/api/auth/:path* → id.grudge-studio.com/api/auth/:path* (not /auth/). " +
      "Login: /login → id.grudge-studio.com/login.",
  },
] as const;

/** Return fix strings for a failure message, URL, or probe id. */
export function matchAuthSymptoms(
  text: string,
  probeId?: string,
): AuthSymptomFix[] {
  const hay = text.toLowerCase();
  const hits = FLEET_AUTH_SYMPTOM_FIXES.filter((s) => {
    if (probeId && s.probeId === probeId) return true;
    return s.match.some((m) => hay.includes(m.toLowerCase()));
  });
  return hits.length ? hits : [];
}

/** Human-readable wiring guide for agents and operators. */
export const FLEET_AUTH_WIRING_GUIDE = {
  browserApps: [
    "1. Load https://id.grudge-studio.com/grudge-game-bootstrap.js (or import @shared/fleet/authConnect).",
    "2. On boot: GrudgeAuth.pickup() — consumes ?grudge_token / ?sso_token from URL.",
    "3. Silent guest (no UI): POST same-origin /api/auth/guest (Vercel → Railway).",
    "4. Explicit sign-in: GrudgeAuth.loginPage('/auth/callback') — canonical /login?redirect_uri=.",
    "5. Game data: same-origin /api/characters, /api/account (Vercel → Railway). Never call Railway URL from browser CORS.",
  ],
  vercelSatellite: [
    "Copy buildFleetSatelliteRewrites() into vercel.json BEFORE catch-all SPA rule.",
    "Auth: /api/auth/* and /auth/* → id.grudge-studio.com",
    "Game data: /api/characters, /api/account → Railway",
    "SPA: /auth/callback → /index.html (client handles token pickup)",
  ],
  idHub: [
    "id.grudge-studio.com is a Vercel alias on GrudgeBuilder with buildFleetHubAuthRewrites().",
    "/auth/:path* → Railway /api/auth/:path*",
    "/login → Railway /api/auth/page",
    "Do NOT point id DNS at api.grudge-studio.com (deprecated VPS).",
  ],
  tokens: [
    "Return params: grudge_token (popup-token flow), sso_token (sso-check flow), token (legacy)",
    "Storage: localStorage grudge_auth_token + optional grudge_id, grudge_username",
    "API: Authorization: Bearer <token> on /api/characters, /api/auth/me",
  ],
  puter: [
    "Browser: puter.auth.signIn({ attempt_temp_user_creation: true }) for silent guest cloud ID",
    "Then POST /api/auth/puter-sso or /api/auth/puter with puterId uuid",
  ],
} as const;