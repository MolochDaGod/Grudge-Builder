/**
 * gameNav.ts — Cross-game navigation for the Grudge Warlords fleet.
 *
 * When a player clicks a game card on /home that points to a different origin
 * (e.g. rts-grudge.vercel.app or dcq.grudge-studio.com), we append their
 * auth token as ?sso_token=...&grudge_id=... so the destination app picks
 * it up via its standard SSO token handler — same mechanism as returning
 * from id.grudge-studio.com, no extra code needed on the receiving end.
 *
 * For same-origin routes (e.g. /character, /island-v2) we use normal
 * wouter navigation — no token passing needed.
 */

import { getToken, getCurrentUser } from "./grudgeBackend";

/** All known Grudge game origins that accept ?sso_token= pickup */
const FLEET_ORIGINS: Record<string, string> = {
  "rts-grudge":  "https://rts-grudge.vercel.app",
  "dcq":         "https://dcq.grudge-studio.com",
  "survival":    "https://survival.grudge-studio.com",
  "arena":       "https://grudge-arena.grudge-studio.com",
  "drive":       "https://grudge-drive.vercel.app",
};

/**
 * Navigate to a game URL. If the URL points to a different Grudge game origin,
 * appends the auth token so the player stays logged in.
 *
 * @param url       The game URL or path (e.g. "/character" or "https://rts-grudge.vercel.app")
 * @param navigate  Wouter's setLocation function for same-origin navigation
 */
export function navigateToGame(
  url: string,
  navigate: (path: string) => void,
): void {
  // Same-origin path (starts with /)
  if (url.startsWith("/")) {
    navigate(url);
    return;
  }

  // External URL — check if it's a known Grudge game
  const token = getToken();
  const user = getCurrentUser();

  if (token) {
    const dest = new URL(url);
    dest.searchParams.set("sso_token", token);
    if (user?.grudgeId) dest.searchParams.set("grudge_id", user.grudgeId);
    if (user?.username) dest.searchParams.set("username", user.username);
    window.location.href = dest.toString();
  } else {
    // Not authenticated — navigate without token
    window.location.href = url;
  }
}

/**
 * Get the full URL for a fleet game, with auth token attached.
 * Returns the URL string (for <a href> or programmatic navigation).
 */
export function getGameUrl(gameId: keyof typeof FLEET_ORIGINS, path = "/"): string {
  const origin = FLEET_ORIGINS[gameId];
  if (!origin) return path; // Unknown game, treat as local path

  const token = getToken();
  const user = getCurrentUser();
  const dest = new URL(path, origin);

  if (token) {
    dest.searchParams.set("sso_token", token);
    if (user?.grudgeId) dest.searchParams.set("grudge_id", user.grudgeId);
    if (user?.username) dest.searchParams.set("username", user.username);
  }

  return dest.toString();
}

export { FLEET_ORIGINS };
