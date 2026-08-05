/**
 * gameNav.ts — Cross-game navigation for the Grudge Warlords fleet.
 *
 * When a player clicks a game card on /home that points to a different origin
 * (e.g. water.grudge-studio.com or rts-grudge.vercel.app), we append their
 * auth token as ?sso_token=...&grudge_id=... so the destination app picks
 * it up via its standard SSO token handler.
 *
 * For same-origin routes (e.g. /character, /home-island) we use normal
 * wouter navigation — no token passing needed.
 */

import { getToken, getCurrentUser } from "./grudgeBackend";
import { FLEET_GAME_ORIGINS, type FleetGameId } from "@shared/fleet";

export { FLEET_GAME_ORIGINS };

function attachSsoParams(dest: URL): void {
  const token = getToken();
  const user = getCurrentUser();
  if (!token) return;
  dest.searchParams.set("sso_token", token);
  if (user?.grudgeId) dest.searchParams.set("grudge_id", user.grudgeId);
  if (user?.username) dest.searchParams.set("username", user.username);
}

/**
 * Navigate to a game URL. If the URL points to a different Grudge game origin,
 * appends the auth token so the player stays logged in.
 */
export function navigateToGame(
  url: string,
  navigate: (path: string) => void,
): void {
  if (url.startsWith("/")) {
    navigate(url);
    return;
  }

  const token = getToken();
  if (token) {
    const dest = new URL(url);
    attachSsoParams(dest);
    window.location.href = dest.toString();
  } else {
    window.location.href = url;
  }
}

/**
 * Get the full URL for a fleet game, with auth token attached.
 * Supports path products (e.g. FLEET_GAME_ORIGINS.gst = https://grudge-studio.com/gst).
 */
export function getGameUrl(gameId: FleetGameId, path = "/"): string {
  const origin = FLEET_GAME_ORIGINS[gameId];
  if (!origin) return path;

  let dest: URL;
  try {
    const base = new URL(origin);
    if (!path || path === "/") {
      dest = base;
    } else if (/^https?:\/\//i.test(path)) {
      dest = new URL(path);
    } else {
      const prefix = base.pathname.replace(/\/$/, "");
      const suffix = path.startsWith("/") ? path : `/${path}`;
      dest = new URL(`${prefix}${suffix}`, base.origin);
    }
  } catch {
    dest = new URL(path, origin);
  }
  attachSsoParams(dest);
  return dest.toString();
}

/** Production Tactical Infinity with optional deep-link path (e.g. /?phase=productionisland). */
export function getTacticalInfinityUrl(path = "/"): string {
  return getGameUrl("tactical-infinity", path);
}