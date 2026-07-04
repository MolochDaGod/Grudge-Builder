/**
 * gcsRedirect — canonical handoff to Grudge Character Studio (GCS).
 *
 * Warlords-era creation must land on character.grudge-studio.com with:
 *   - era=warlords (multi-era roster slot on Railway)
 *   - grudge_token / grudgeId (SSO continuity)
 *   - returnTo (post-save redirect back to the calling app)
 */

import { FLEET_URLS } from "@shared/fleet";
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

export function isAllowedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return RETURN_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/** Default return URL for Warlords flows launched from this SPA. */
export function defaultWarlordsReturnTo(path = "/home"): string {
  if (typeof window === "undefined") return `https://grudgewarlords.com${path}`;
  return `${window.location.origin}${path}`;
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

  const returnTo = options.returnTo ?? defaultWarlordsReturnTo("/test-play");
  if (isAllowedReturnUrl(returnTo)) {
    params.set("returnTo", returnTo);
  }

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