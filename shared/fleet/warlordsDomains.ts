/**
 * Warlords era domain zone SSOT
 *
 * Target play: warlords.grudge.studio (4 characters on airship).
 * Live today: grudgewarlords.com until DNS cutover.
 * Nexus: nexus.grudge.studio/heroes (interim client.grudge-studio.com/heroes).
 * Account hub: grudge.studio · Platform: *.grudge-studio.com (id, assets, foundry).
 *
 * @see docs/GAME_FLOW_SSOT.md · docs/WARLORDS_DOMAIN_SSOT.md · docs/GRUDGE_STUDIO_ERA_DOMAINS_SSOT.md
 */

/** Live apex SPA today (alias until warlords.grudge.studio DNS). */
export const WARLORDS_APEX = "https://grudgewarlords.com" as const;

/** Preferred Warlords play host on grudge.studio. */
export const WARLORDS_ERA_HOST = "warlords.grudge.studio" as const;
export const WARLORDS_ERA_URL = `https://${WARLORDS_ERA_HOST}` as const;

/** Legacy play.* under grudgewarlords.com */
export const WARLORDS_PLAY_HOST = "play.grudgewarlords.com" as const;
export const WARLORDS_PLAY_URL = `https://${WARLORDS_PLAY_HOST}` as const;

/** Nexus heroes — interim host until nexus.grudge.studio DNS. */
export const NEXUS_HEROES_INTERIM = "https://client.grudge-studio.com" as const;
export const NEXUS_ERA_HOST = "nexus.grudge.studio" as const;
export const NEXUS_ERA_URL = `https://${NEXUS_ERA_HOST}` as const;

export const GRUDGE_STUDIO_HUB = "https://grudge.studio" as const;

/** Interim Nexus /heroes host — not Warlords play. */
export const WARLORDS_CLIENT_STUDIO = "https://client.grudge-studio.com" as const;

/**
 * play.grudge.studio = account / launcher / community hub (CF Worker → grudge-studio.com).
 * NOT Warlords SPA. Warlords play = warlords.grudge.studio / grudgewarlords.com.
 */
export const PLAY_GRUDGE_STUDIO_HUB = "https://play.grudge.studio" as const;
/** @deprecated use PLAY_GRUDGE_STUDIO_HUB — was wrongly labeled “dead Warlords alias” */
export const PLAY_GRUDGE_STUDIO_LEGACY = PLAY_GRUDGE_STUDIO_HUB;

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
  // Live today: grudgewarlords.com. Cut over with WARLORDS_PLAY_ORIGIN=https://warlords.grudge.studio
  return WARLORDS_APEX;
}

/** Nexus 4-character host (heroes). Env NEXUS_PLAY_ORIGIN when DNS live. */
export function nexusPlayOrigin(): string {
  try {
    const env =
      (typeof process !== "undefined" &&
        process.env &&
        (process.env.NEXUS_PLAY_ORIGIN || process.env.VITE_NEXUS_PLAY_ORIGIN)) ||
      "";
    if (env && /^https:\/\//i.test(env)) return env.replace(/\/$/, "");
  } catch {
    /* ignore */
  }
  return NEXUS_HEROES_INTERIM;
}

export function nexusHeroesUrl(
  path = "/heroes",
  query?: Record<string, string | undefined | null>,
): string {
  const base = nexusPlayOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  const u = new URL(p, base.endsWith("/") ? base : base + "/");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
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
/** Hosts on the Warlords zone that are NOT the play SPA. */
const WARLORDS_NON_PLAY_HOSTS = new Set([
  "foundry.grudgewarlords.com",
  "craft.grudgewarlords.com",
]);

export function isWarlordsPlayHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (WARLORDS_NON_PLAY_HOSTS.has(h)) return false;
  if (h === WARLORDS_ERA_HOST) return true;
  if (h === "grudgewarlords.com" || h === "www.grudgewarlords.com") return true;
  if (h.endsWith(".grudgewarlords.com")) return true;
  // client.grudge-studio.com = Nexus /heroes interim — NOT Warlords play
  return false;
}

/** Nexus heroes host (4 characters on /heroes). */
export function isNexusPlayHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h === NEXUS_ERA_HOST || h === "client.grudge-studio.com";
}

/** Account / apps hub on grudge.studio apex. */
export function isGrudgeStudioHubHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h === "grudge.studio" || h === "www.grudge.studio" || h === "account.grudge.studio" || h === "apps.grudge.studio";
}

/** Studio platform hosts (id, assets, foundry — not era play). */
export function isStudioPlatformHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "grudge-studio.com" || h === "www.grudge-studio.com") return true;
  if (h.endsWith(".grudge-studio.com") && h !== "client.grudge-studio.com") return true;
  return false;
}
