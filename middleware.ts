/**
 * Vercel Edge Middleware — Grudge Warlords
 *
 * Runs at the CDN edge before any page or API call is served.
 * Responsibilities:
 *  1. Auth guard  — redirect unauthenticated users away from game routes
 *  2. Single-account guard — one Grudge ID per session, block duplicate logins
 *  3. Header injection — forward grudge_id + token to backend API rewrites
 *  4. Auth route shortcut — skip intro/login if already authenticated
 *
 * Token source: `grudge_auth_token` cookie (set by grudgeBackend.ts setToken())
 * Grudge ID source: `grudge_id` cookie (set by grudgeBackend.ts setSession())
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Route groups ────────────────────────────────────────────────────────────

/** Require a valid grudge_auth_token cookie */
const PROTECTED_PREFIXES = [
  "/island",
  "/character",
  "/characters",
  "/create-character",
  "/character-creator",
  "/combat",
  "/dungeon",
  "/crafting",
  "/professions",
  "/profession",
  "/harvest",
  "/skills",
  "/skill-tree",
  "/world-map",
  "/missions",
  "/wallet",
  "/account",
  "/arsenal",
  "/hero-codex",
  "/rpg-battle",
  "/tower-wars",
  "/editor",
  "/organizer",
];

/** Redirect to /home if already authenticated (no point showing intro again) */
const GUEST_ONLY_PATHS = ["/", "/intro"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isGuestOnly(pathname: string): boolean {
  return GUEST_ONLY_PATHS.includes(pathname);
}

// ── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token   = request.cookies.get("grudge_auth_token")?.value;
  const grudgeId = request.cookies.get("grudge_id")?.value;

  // ── 1. Unauthenticated user hitting a game route ─────────────────────────
  if (isProtected(pathname) && !token) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/";
    // Preserve intended destination so login can redirect back
    dest.searchParams.set("redirect", pathname);
    return NextResponse.redirect(dest);
  }

  // ── 2. Authenticated user hitting intro/login — skip to home ────────────
  if (isGuestOnly(pathname) && token && grudgeId) {
    const dest = request.nextUrl.clone();
    // Honour a ?redirect= param if present, else go to /home
    const intended = request.nextUrl.searchParams.get("redirect");
    dest.pathname = intended && isProtected(intended) ? intended : "/home";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // ── 3. Inject Grudge headers on every request (API rewrites inherit them) ─
  if (token) {
    const headers = new Headers(request.headers);
    headers.set("x-grudge-token", token);
    if (grudgeId) headers.set("x-grudge-id", grudgeId);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

// ── Matcher — skip static assets, _next internals, favicons ─────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|assets/|images/|sprites/|avatars/).*)",
  ],
};
