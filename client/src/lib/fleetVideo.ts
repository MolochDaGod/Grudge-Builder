/**
 * Fleet cinematics — Warlords intro + loadscreen from Cloudflare R2 / D1.
 * Source: grudge loadin.mp4 → gruda-armada/grudge-warlords/videos/intro.mp4
 *
 * PURGED from /island-3d: do NOT use warlordsIntro for the production open.
 * island-3d uses native Three.js ShipwreckTutorialCinema (no video gate).
 * This catalog remains for /intro, IslandCutscene, and loadscreen transitions only.
 */
/** Same-origin → Railway /api/videos/catalog via fleet rewrites */
const CATALOG_API =
  import.meta.env.VITE_VIDEO_CATALOG_API ?? '/api/videos/catalog';

import { FLEET_VIDEO_CATALOG } from '@shared/fleet/videoCatalog';
import { assetUrl } from '@/lib/assetConfig';

/** Browser: same-origin /api/assets/{r2_key}. Tests/SSR: absolute CDN. */
function playableVideoUrl(url: string): string {
  return assetUrl(url);
}

export const FLEET_VIDEO_FALLBACK = {
  warlordsIntro: playableVideoUrl(FLEET_VIDEO_CATALOG.warlordsIntro.r2_url),
  warlordsLoadscreen: playableVideoUrl(FLEET_VIDEO_CATALOG.warlordsLoadscreen.r2_url),
  warlordsPvpLoadscreen: playableVideoUrl(
    FLEET_VIDEO_CATALOG.warlordsPvpLoadscreen.r2_url,
  ),
  armadaIntro: playableVideoUrl(FLEET_VIDEO_CATALOG.armadaIntro.r2_url),
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
        if (entry?.r2_url) cache.set(key, playableVideoUrl(entry.r2_url));
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
  return playableVideoUrl(cache.get(catalogKey) ?? FLEET_VIDEO_FALLBACK[catalogKey]);
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