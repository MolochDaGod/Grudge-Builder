/**
 * gcsRedirect — canonical handoff to Grudge Character Studio (GCS).
 *
 * Warlords-era creation must land on character.grudge-studio.com with:
 *   - era=warlords (multi-era roster slot on Railway)
 *   - grudge_token / grudgeId (SSO continuity)
 *   - returnTo (post-save redirect back to the calling app)
 */

import { FLEET_URLS, warlordsPlayOrigin, warlordsPlayUrl } from "@shared/fleet";
import {
  normalizeGameEra,
  type GameEra,
} from "@shared/definitions/gameEras";
import { getToken } from "./grudgeBackend";

export type GcsLaunchMode = "landing" | "create";

export interface BuildGcsUrlOptions {
  era?: GameEra;
  /** Absolute URL to return after character is saved in GCS. */
  returnTo?: string;
  /** Skip landing — open create flow immediately. */
  mode?: GcsLaunchMode;
  /** Forward current query params (except legacy). */
  forwardSearch?: boolean;
}

const GCS_ORIGIN = FLEET_URLS.gcs;

/** Allowed return hosts after GCS save (open redirect guard). */
const RETURN_HOST_RE =
  /(^|\.)grudge-studio\.com$|(^|\.)grudgewarlords\.com$|\.vercel\.app$/i;

const BLOCKED_RETURN_HOSTS =
  /(^|\.)character\.grudge-studio\.com$|(^|\.)grudge6\.grudge-studio\.com$/i;

export function isAllowedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (BLOCKED_RETURN_HOSTS.test(u.hostname)) return false;
    return RETURN_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Default return after GCS save — /airship bridge → home-island (Foundry SSOT).
 * Prefer Warlords product zone (*.grudgewarlords.com / apex) over studio client.*.
 * Never return into character.grudge-studio.com/viewer.
 */
export function defaultWarlordsReturnTo(path = "/airship"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  // Same-origin when already on a Warlords play host (apex, play.*, client.*)
  if (typeof window !== "undefined") {
    try {
      const h = window.location.hostname.toLowerCase();
      if (
        h === "grudgewarlords.com" ||
        h === "www.grudgewarlords.com" ||
        h.endsWith(".grudgewarlords.com") ||
        h === "client.grudge-studio.com"
      ) {
        return `${window.location.origin}${p}`;
      }
    } catch {
      /* fall through */
    }
  }
  // Absolute: Warlords zone origin (apex live; play.* when DNS wired via env)
  try {
    return warlordsPlayUrl(p);
  } catch {
    return `${warlordsPlayOrigin()}${p}`;
  }
}

export function buildGcsUrl(options: BuildGcsUrlOptions = {}): string {
  const era = normalizeGameEra(options.era ?? "warlords");
  const params = new URLSearchParams();

  if (options.forwardSearch && typeof window !== "undefined") {
    const incoming = new URLSearchParams(window.location.search);
    incoming.forEach((v, k) => {
      if (k !== "legacy") params.set(k, v);
    });
  }

  params.set("era", era);

  if (options.mode === "create") {
    params.set("mode", "create");
  }

  const returnTo = options.returnTo ?? defaultWarlordsReturnTo("/airship");
  if (isAllowedReturnUrl(returnTo)) {
    params.set("returnTo", returnTo);
  }
  // Hint Character Studio: Warlords era → airship → home-island (not /viewer lab)
  params.set("entry", "airship_warlords");

  const token = getToken() || localStorage.getItem("grudge_auth_token");
  if (token) params.set("grudge_token", token);

  const grudgeId =
    localStorage.getItem("grudge_id") ||
    localStorage.getItem("grudge_account_id");
  if (grudgeId) params.set("grudgeId", grudgeId);

  const name = localStorage.getItem("grudge_username");
  if (name) params.set("name", name);

  return `${GCS_ORIGIN}?${params.toString()}`;
}

export function navigateToGcs(options: BuildGcsUrlOptions = {}): void {
  window.location.assign(buildGcsUrl(options));
}

export function isGcsLegacyMode(): boolean {
  return new URLSearchParams(window.location.search).get("legacy") === "1";
}

/**
 * After GCS save, ?from=gcs&characterId=… activates the new hero on this app.
 */
export function consumeGcsReturnHandoff(
  setActive: (id: string) => void,
): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("from") !== "gcs") return null;
  const characterId = params.get("characterId");
  if (!characterId) return null;

  setActive(characterId);
  params.delete("from");
  params.delete("characterId");
  const qs = params.toString();
  const clean = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", clean);
  return characterId;
}