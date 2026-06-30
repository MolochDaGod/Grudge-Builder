/**
 * Fleet cinematics — Warlords intro + loadscreen from Cloudflare R2 / D1.
 * Source: grudge loadin.mp4 → gruda-armada/grudge-warlords/videos/intro.mp4
 */
/** Same-origin → Railway /api/videos/catalog via fleet rewrites */
const CATALOG_API =
  import.meta.env.VITE_VIDEO_CATALOG_API ?? '/api/videos/catalog';

const WARLORDS_INTRO_CDN =
  'https://assets.grudge-studio.com/gruda-armada/grudge-warlords/videos/intro.mp4';

const WARLORDS_PVP_LOADSCREEN_CDN =
  'https://assets.grudge-studio.com/gruda-armada/grudge-warlords/videos/pvp-loadscreen.mp4';

export const FLEET_VIDEO_FALLBACK = {
  warlordsIntro: WARLORDS_INTRO_CDN,
  /** General Warlords mode transitions (non-PvP) */
  warlordsLoadscreen: WARLORDS_INTRO_CDN,
  /** PvP lobby, Colyseus world entry, island lobby maps */
  warlordsPvpLoadscreen: WARLORDS_PVP_LOADSCREEN_CDN,
} as const;

export type FleetVideoKey = keyof typeof FLEET_VIDEO_FALLBACK;

const cache = new Map<string, string>();

async function hydrateCatalog(): Promise<void> {
  if (cache.has('__hydrated__')) return;
  try {
    const res = await fetch(CATALOG_API, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = (await res.json()) as {
        catalog?: Record<string, { r2_url?: string }>;
      };
      for (const [key, entry] of Object.entries(data.catalog ?? {})) {
        if (entry?.r2_url) cache.set(key, entry.r2_url);
      }
    }
  } catch {
    /* CDN fallbacks */
  }
  cache.set('__hydrated__', '1');
}

export async function hydrateVideoCatalog(): Promise<void> {
  await hydrateCatalog();
}

export async function resolveFleetVideo(catalogKey: FleetVideoKey): Promise<string> {
  await hydrateCatalog();
  return cache.get(catalogKey) ?? FLEET_VIDEO_FALLBACK[catalogKey];
}

export async function resolveWarlordsIntroVideo(): Promise<string> {
  return resolveFleetVideo('warlordsIntro');
}

export async function resolveWarlordsLoadscreenVideo(): Promise<string> {
  return resolveFleetVideo('warlordsLoadscreen');
}

export async function resolveWarlordsPvpLoadscreenVideo(): Promise<string> {
  return resolveFleetVideo('warlordsPvpLoadscreen');
}