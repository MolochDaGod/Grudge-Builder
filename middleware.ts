/**
 * Vercel Edge Middleware — Grudge Warlords
 *
 * Runs at the CDN edge before any page or API call is served.
 * Uses native Web Fetch API only — no next/server, no @vercel/edge needed.
 *
 * Responsibilities:
 *  1. Auth guard  — redirect unauthenticated users away from game routes
 *  2. Auth shortcut — skip intro for already-authenticated sessions
 *  3. Single account — one Grudge ID per browser session via cookie
 *
 * Token source: `grudge_auth_token` cookie (set by grudgeBackend.ts setToken())
 * Grudge ID source: `grudge_id` cookie (set by grudgeBackend.ts setSession())
 */

// ── Cookie parser ───────────────────────────────────────────────────────────

function getCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// ── Route groups ────────────────────────────────────────────────────────────

/** Require a valid grudge_auth_token cookie */
const PROTECTED_PREFIXES = [
  // ── Core game routes ─────────────────────────────────────────────
  "/home",
  "/launcher",
  // ── Characters ───────────────────────────────────────────────────
  "/character",
  "/characters",
  "/create-character",
  "/character-creator",
  "/character-gallery",
  // ── Games ────────────────────────────────────────────────────────
  "/island-v2",      // Home Island (auto-harvest)
  "/island-3d",      // 3D open-world / RTS entrance
  "/rts-grudge",     // RTS GRUDGE lobby
  "/combat",
  "/dungeon",
  "/dungeon-tiled",
  "/rpg-battle",
  "/harvest",
  "/world-map",
  "/missions",
  "/tower-wars",
  // ── Progression
  "/crafting",
  "/professions",
  "/profession",
  "/skills",
  "/skill-tree",
  "/arsenal",
  "/hero-codex",
  "/database",
  // ── Account ───────────────────────────────────────────────────────
  "/wallet",
  "/account",
  // ── Tools (admin) ─────────────────────────────────────────────────
  "/editor",
  "/organizer",
  "/admin",
  "/admin-map",
  "/admin-combat",
  "/admin-island-v2",
  "/sprite-admin",
];

/** Redirect to /home if already authenticated (no point showing intro again) */
const GUEST_ONLY_PATHS = ["/", "/intro"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}

function isGuestOnly(pathname: string): boolean {
  return GUEST_ONLY_PATHS.includes(pathname)
}

// ── Middleware ───────────────────────────────────────────────────────────────
// Native Web API — no next/server or @vercel/edge import needed.

export default function middleware(request: Request): Response | void {
  const url      = new URL(request.url)
  const pathname = url.pathname
  const cookies  = request.headers.get("cookie") ?? ""
  const token    = getCookie(cookies, "grudge_auth_token")
  const grudgeId = getCookie(cookies, "grudge_id")

  // ── Skip Cloudflare health probes & pre-flight ─────────────────────────────
  const cfRay = request.headers.get("cf-ray")
  if (request.method === "OPTIONS") return

  // ── 1. Unauthenticated user hitting a protected route ─────────────────────
  if (isProtected(pathname) && !token) {
    const dest = new URL(request.url)
    dest.pathname = "/"
    dest.search   = ""
    dest.searchParams.set("redirect", pathname)
    return Response.redirect(dest.toString(), 307)
  }

  // ── 2. Authenticated user hitting intro/login — bounce to /home ──────────
  if (isGuestOnly(pathname) && token && grudgeId) {
    const intended = url.searchParams.get("redirect")
    const dest     = new URL(request.url)
    dest.pathname  = intended && isProtected(intended) ? intended : "/home"
    dest.search    = ""
    return Response.redirect(dest.toString(), 307)
  }
}

// ── Matcher — skip static files, API routes, Vercel internals, Cloudflare infra
export const config = {
  matcher: [
    // Skip: static assets, ALL API routes, Vercel internals, CF health/special paths
    "/((?!_next/static|_next/image|favicon\.ico|assets/|images/|sprites/|avatars/|models/|api/|cdn-cgi/).*)",
  ],
}
