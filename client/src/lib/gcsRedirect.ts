/**
 * gcsRedirect — canonical handoff to Grudge Character Studio (GCS).
 *
 * Warlords-era creation must land on character.grudge-studio.com with:
 *   - era=warlords (multi-era roster slot on Railway)
 *   - grudge_token / grudgeId (SSO continuity)
 *   - returnTo (post-save redirect back to the calling app)
 */

import {
  FLEET_URLS,
  warlordsPlayOrigin,
  warlordsPlayUrl,
  validateReturnUrl,
} from "@shared/fleet";
import { isWarlordsPlayHost } from "@shared/fleet/warlordsDomains";
import {
  normalizeGameEra,
  type GameEra,
} from "@shared/definitions/gameEras";
import { getToken } from "./grudgeBackend";
import { postCreatePlayPath } from "./warlordsOnboarding";

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

const BLOCKED_RETURN_HOSTS =
  /(^|\.)character\.grudge-studio\.com$|(^|\.)grudge6\.grudge-studio\.com$/i;

export function isAllowedReturnUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (BLOCKED_RETURN_HOSTS.test(u.hostname)) return false;
    return Boolean(
      validateReturnUrl(url, {
        base: typeof window !== "undefined" ? window.location.origin : warlordsPlayOrigin(),
        production: typeof process !== "undefined"
          ? String(process.env.NODE_ENV || "").toLowerCase() === "production"
          : true,
        fallback: "",
      }),
    );
  } catch {
    return false;
  }
}

/**
 * Default return after GCS save.
 * After Foundry save: 4-character airship (/combat?from=gcs). Foundry appends characterId.
 * Never return into character.grudge-studio.com/viewer. Never a second create form.
 */
export function defaultWarlordsReturnTo(path?: string): string {
  const resolved =
    path && path.startsWith("/")
      ? path
      : typeof window !== "undefined"
        ? postCreatePlayPath()
        : "/combat?from=gcs";
  const p = resolved.startsWith("/") ? resolved : `/${resolved}`;
  // Same-origin when already on a Warlords play host (apex, play.*, client.*)
  if (typeof window !== "undefined") {
    try {
      const h = window.location.hostname.toLowerCase();
      if (isWarlordsPlayHost(h)) {
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

  // Create only when explicitly requested — never imply create via returnTo alone
  // (Foundry EntryGate used to treat returnTo as create → infinite foundry loop).
  if (options.mode === "create") {
    params.set("mode", "create");
    params.set("entry", "warlords_play");
  }

  // Stash return for post-save OR post-pick play. Never forces Foundry by itself.
  const returnTo =
    options.returnTo ??
    (options.mode === "create" ? defaultWarlordsReturnTo() : undefined);
  if (returnTo && isAllowedReturnUrl(returnTo)) {
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
