/**
 * Warlords era domain zone SSOT — product hosts under *.grudgewarlords.com
 *
 * Studio platform stays on *.grudge-studio.com (id, forge, assets, foundry CF).
 * Warlords era play (airship, home island, maps, zones, scenes) is branded
 * under grudgewarlords.com.
 *
 * @see docs/GAME_FLOW_SSOT.md · docs/WARLORDS_DOMAIN_SSOT.md
 */

/** Apex product + SPA (live today on Vercel). */
export const WARLORDS_APEX = "https://grudgewarlords.com" as const;

/**
 * Canonical game-client host (target).
 * Until DNS/TLS is live for play.grudgewarlords.com, builders fall back to apex.
 * Prefer WARLORDS_PLAY_ORIGIN in new handoffs once DNS is green.
 */
export const WARLORDS_PLAY_HOST = "play.grudgewarlords.com" as const;
export const WARLORDS_PLAY_URL = `https://${WARLORDS_PLAY_HOST}` as const;

/** Legacy studio-branded client — same SPA; keep working, prefer warlords zone. */
export const WARLORDS_CLIENT_STUDIO = "https://client.grudge-studio.com" as const;

/** Dead / non-Warlords hub — do not use for Warlords era. */
export const PLAY_GRUDGE_STUDIO_LEGACY = "https://play.grudge.studio" as const;

/**
 * Clean Warlords subdomains (all should CNAME → same Vercel SPA as apex).
 * Path hosts optionally 301 to apex/play + path for pretty URLs.
 */
export const WARLORDS_SUBDOMAINS = {
  /** Marketing + SPA catch-all */
  apex: WARLORDS_APEX,
  www: "https://www.grudgewarlords.com",
  /** Preferred game client hostname */
  play: WARLORDS_PLAY_URL,
  /** Alias of play (optional) */
  client: "https://client.grudgewarlords.com",
  /** Pretty path hosts → /airship, /home-island, /world-map, /island-3d */
  airship: "https://airship.grudgewarlords.com",
  home: "https://home.grudgewarlords.com",
  map: "https://map.grudgewarlords.com",
  scenes: "https://scenes.grudgewarlords.com",
  /**
   * Craft suite (inventory, recipes, item DB) — static HTML under SPA public/.
   * Path host is live today; craft.* subdomain optional CNAME later.
   */
  craft: "https://grudgewarlords.com/craft/",
  craftSubdomain: "https://craft.grudgewarlords.com",
  /** Legacy Puter host — redirect only */
  craftLegacyPuter: "https://grudge-crafting.puter.site",
  /** Foundry alias (may 302 → character.grudge-studio.com) */
  foundry: "https://foundry.grudgewarlords.com",
} as const;

/** Canonical absolute craft suite URL (path on apex SPA deploy). */
export const WARLORDS_CRAFT_PATH = "/craft/" as const;
export const WARLORDS_CRAFT_URL = `${WARLORDS_APEX}${WARLORDS_CRAFT_PATH}` as const;

export type WarlordsSubdomainKey = keyof typeof WARLORDS_SUBDOMAINS;

/** Path on the SPA for each pretty host (redirect target). */
export const WARLORDS_HOST_PATH: Record<
  "airship" | "home" | "map" | "scenes" | "play" | "client" | "apex" | "www",
  string
> = {
  apex: "/",
  www: "/",
  play: "/",
  client: "/",
  airship: "/airship",
  home: "/home-island",
  map: "/world-map",
  scenes: "/island-3d",
};

/**
 * Origin used when building absolute Warlords play URLs in code.
 * Uses apex until play.grudgewarlords.com is DNS-live (set env to force).
 *
 * Server/browser: WARLORDS_PLAY_ORIGIN=https://play.grudgewarlords.com
 */
export function warlordsPlayOrigin(): string {
  try {
    const env =
      (typeof process !== "undefined" &&
        process.env &&
        (process.env.WARLORDS_PLAY_ORIGIN || process.env.VITE_WARLORDS_PLAY_ORIGIN)) ||
      "";
    if (env && /^https:\/\//i.test(env)) return env.replace(/\/$/, "");
  } catch {
    /* ignore */
  }
  // Apex is known-live; play.* is the branded target once DNS is wired
  return WARLORDS_APEX;
}

/** Absolute URL for a path on the Warlords play SPA. */
export function warlordsPlayUrl(
  path: string,
  query?: Record<string, string | undefined | null>,
): string {
  const base = warlordsPlayOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  const u = new URL(p, base.endsWith("/") ? base : base + "/");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

/** Foundry create URL (studio host until foundry.grudgewarlords.com is live). */
export function warlordsFoundryUrl(opts?: {
  returnTo?: string;
  mode?: "create";
  era?: string;
}): string {
  const u = new URL("https://character.grudge-studio.com/foundry");
  u.searchParams.set("era", opts?.era || "warlords");
  if (opts?.mode) u.searchParams.set("mode", opts.mode);
  if (opts?.returnTo) u.searchParams.set("returnTo", opts.returnTo);
  return u.toString();
}

/** Default return after Foundry create → Warlords play home island. */
export function warlordsDefaultReturnTo(characterId?: string): string {
  return warlordsPlayUrl("/home-island", {
    characterId: characterId || undefined,
    from: "gcs",
  });
}

/** Airship handoff URL. */
export function warlordsAirshipUrl(characterId?: string): string {
  return warlordsPlayUrl("/airship", {
    characterId: characterId || undefined,
    from: "gcs",
  });
}

/** Open world zone deep link. */
export function warlordsZoneUrl(opts?: {
  sector?: string;
  characterId?: string;
  worldSeed?: string;
  skipIntro?: boolean;
}): string {
  return warlordsPlayUrl("/play", {
    mode: "zone",
    sector: opts?.sector || "haven_shore",
    worldSeed: opts?.worldSeed || "grudge-world-1",
    skipIntro: opts?.skipIntro === false ? undefined : "1",
    characterId: opts?.characterId,
  });
}

/**
 * Hosts that are the Warlords play SPA (same deploy).
 * Used for returnTo allowlists and "is this our client?" checks.
 */
export function isWarlordsPlayHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (h === "grudgewarlords.com" || h === "www.grudgewarlords.com") return true;
  if (h.endsWith(".grudgewarlords.com")) return true;
  if (h === "client.grudge-studio.com") return true;
  return false;
}

/** Studio platform hosts (not Warlords product zone). */
export function isStudioPlatformHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "grudge-studio.com" || h === "www.grudge-studio.com") return true;
  if (h.endsWith(".grudge-studio.com") && h !== "client.grudge-studio.com") return true;
  return false;
}
