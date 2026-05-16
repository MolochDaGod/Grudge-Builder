/**
 * Vercel Edge Middleware — Grudge Warlords
 *
 * Runs at the CDN edge before any page or API call is served.
 * Uses native Web Fetch API only — no next/server, no @vercel/edge needed.
 *
 * Responsibilities:
 *  1. Auth shortcut — skip intro for already-authenticated sessions
 *  2. CORS / security headers (handled in vercel.json)
 *
 * Auth strategy:
 *  - All game pages load freely without server-side auth gating.
 *  - Client-side useAuthGuard() verifies tokens and prompts via the
 *    Grudge auth modal when needed. This prevents redirect loops
 *    and lets the game work offline or while tokens are being acquired.
 *  - Cloudflare Workers + Railway backend handle real auth validation
 *    on API calls (id.grudge-studio.com).
 *
 * Token source: `grudge_auth_token` cookie (set by grudgeBackend.ts setToken())
 * Grudge ID source: `grudge_id` cookie (set by grudgeBackend.ts setSession())
 */

function getCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Redirect to /home if already authenticated (no point showing intro again) */
const GUEST_ONLY_PATHS = ["/", "/intro"];

function isGuestOnly(pathname: string): boolean {
  return GUEST_ONLY_PATHS.includes(pathname)
}

export default function middleware(request: Request): Response | void {
  const url      = new URL(request.url)
  const pathname = url.pathname
  const cookies  = request.headers.get("cookie") ?? ""
  const token    = getCookie(cookies, "grudge_auth_token")
  const grudgeId = getCookie(cookies, "grudge_id")

  if (request.method === "OPTIONS") return

  // If user is already authenticated and hits the intro/root page,
  // skip straight to /home.
  if (isGuestOnly(pathname) && token && grudgeId) {
    const intended = url.searchParams.get("redirect")
    const dest     = new URL(request.url)
    dest.pathname  = intended || "/home"
    dest.search    = ""
    return Response.redirect(dest.toString(), 307)
  }

  // All other routes load freely — client-side auth handles prompting.
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|assets/|images/|sprites/|avatars/|models/|api/|cdn-cgi/).*)",
  ],
}
