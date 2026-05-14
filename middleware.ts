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

function getCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Require a valid grudge_auth_token cookie */
const PROTECTED_PREFIXES = [
  "/home",
  "/launcher",
  "/character",
  "/characters",
  "/create-character",
  "/character-creator",
  "/character-gallery",
  "/island-v2",
  "/island-3d",
  "/rts-grudge",
  "/combat",
  "/dungeon",
  "/dungeon-tiled",
  "/rpg-battle",
  "/harvest",
  "/world-map",
  "/missions",
  "/tower-wars",
  "/crafting",
  "/professions",
  "/profession",
  "/skills",
  "/skill-tree",
  "/arsenal",
  "/hero-codex",
  "/database",
  "/wallet",
  "/account",
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

/**
 * Routes that must remain reachable before middleware sees an auth cookie.
 * These are used by direct IdP / Cloudflare / OAuth handoffs to land on the
 * frontend, persist cookies on the frontend origin, then continue into the app.
 */
const AUTH_BOOTSTRAP_PATHS = [
  "/auth/callback",
  "/auth/complete",
  "/login",
  "/logout-hard.html",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}

function isGuestOnly(pathname: string): boolean {
  return GUEST_ONLY_PATHS.includes(pathname)
}

function isAuthBootstrap(pathname: string): boolean {
  return AUTH_BOOTSTRAP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}

export default function middleware(request: Request): Response | void {
  const url      = new URL(request.url)
  const pathname = url.pathname
  const cookies  = request.headers.get("cookie") ?? ""
  const token    = getCookie(cookies, "grudge_auth_token")
  const grudgeId = getCookie(cookies, "grudge_id")

  if (request.method === "OPTIONS") return

  // Allow auth bootstrap / callback routes to load even before a cookie exists.
  // These routes are responsible for persisting the token on the frontend origin.
  if (isAuthBootstrap(pathname)) return

  if (isProtected(pathname) && !token) {
    const dest = new URL(request.url)
    dest.pathname = "/"
    dest.search   = ""
    dest.searchParams.set("redirect", pathname)
    return Response.redirect(dest.toString(), 307)
  }

  if (isGuestOnly(pathname) && token && grudgeId) {
    const intended = url.searchParams.get("redirect")
    const dest     = new URL(request.url)
    dest.pathname  = intended && isProtected(intended) ? intended : "/home"
    dest.search    = ""
    return Response.redirect(dest.toString(), 307)
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|assets/|images/|sprites/|avatars/|models/|api/|cdn-cgi/).*)",
  ],
}
