/**
 * Asset Resolver — Smart fallback chain for all game assets
 *
 * Resolution order:
 *   1. R2 CDN (assets.grudge-studio.com) — fastest
 *   2. ObjectStore GitHub Pages — static fallback
 *   3. Category-specific placeholder — ensures no broken <img>
 *
 * Usage:
 *   <img src={resolveAsset("/icons/weapons/swords/bloodfeud.png")} onError={onImageError} />
 */

import { assetUrl, cdnAssetUrl, ASSET_CDN_BASE } from "@/lib/assetConfig";
import { normalizeAssetPath } from "@/lib/legacyAssetPaths";

// ── Placeholder fallbacks per asset category ─────────────────────────────────

const PLACEHOLDER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' fill='%23333'%3E%3Crect width='64' height='64' rx='8'/%3E%3Ctext x='32' y='36' text-anchor='middle' fill='%23666' font-size='10'%3E?%3C/text%3E%3C/svg%3E";

export const FALLBACK_IMAGES: Record<string, string> = {
  weapon: assetUrl("/icons/weapons_full/sword_common.png"),
  armor: assetUrl("/icons/armor_full/armor_common.png"),
  portrait: assetUrl("/images/portraits/human.png"),
  background: assetUrl("/backgrounds/general.png"),
  combat_bg: assetUrl("/backgrounds/battle_arena_default.png"),
  sprite: assetUrl("/sprites/soldier/Idle.png"),
  icon: assetUrl("/icons/Icons_Essential/Essential_icon_01.png"),
  resource: assetUrl("/icons/resources/rpg16/ore_01.png"),
  ui: assetUrl("/sprites/ui/PNG/Main_tiles.png"),
  terrain: assetUrl("/backgrounds/grass_field.png"),
  food: assetUrl("/icons/food/apple.png"),
  potion: assetUrl("/icons/potions/health_potion.png"),
  default: PLACEHOLDER_DATA_URI,
};

// ── Category detection ───────────────────────────────────────────────────────

function detectCategory(path: string): string {
  const p = path.toLowerCase();
  if (p.includes("/weapon") || p.includes("/sword") || p.includes("/axe") || p.includes("/bow") || p.includes("/staff") || p.includes("/dagger") || p.includes("/hammer") || p.includes("/gun") || p.includes("/crossbow")) return "weapon";
  if (p.includes("/armor") || p.includes("/helm") || p.includes("/chest") || p.includes("/boots") || p.includes("/gloves")) return "armor";
  if (p.includes("/portrait")) return "portrait";
  if (p.includes("/background")) return "background";
  if (p.includes("/terrain") || p.includes("/tilemap") || p.includes("/tileset")) return "terrain";
  if (p.includes("/ui/") || p.includes("/button") || p.includes("/frame")) return "ui";
  if (p.includes("/icon")) return "icon";
  if (p.includes("/sprite")) return "sprite";
  if (p.includes("/resource") || p.includes("/ore") || p.includes("/wood") || p.includes("/herb")) return "resource";
  if (p.includes("/food") || p.includes("/meat") || p.includes("/fish")) return "food";
  if (p.includes("/potion")) return "potion";
  return "default";
}

// ── Resolution cache ─────────────────────────────────────────────────────────

const resolvedCache = new Map<string, string>();
const failedPaths = new Set<string>();

/** Probe image availability without cross-origin fetch (avoids CORS on CDN HEAD). */
function probeImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// ── Core resolver ────────────────────────────────────────────────────────────

/**
 * Resolve an asset path to a URL, using cached results.
 * Synchronous — returns ObjectStore URL immediately.
 * Use preloadAsset() to verify and cache the best source.
 */
export function resolveAsset(path: string): string {
  const canonical = normalizeAssetPath(path);
  if (resolvedCache.has(canonical)) return resolvedCache.get(canonical)!;
  return assetUrl(canonical);
}

/**
 * Get a fallback image for a given asset path based on its category.
 */
export function getFallback(path: string): string {
  const cat = detectCategory(path);
  return FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.default;
}

/**
 * onError handler for <img> tags — swaps to category-appropriate placeholder.
 *
 * @example
 *   <img src={resolveAsset("/icons/weapons/missing.png")} onError={onImageError} />
 */
export function onImageError(
  e: React.SyntheticEvent<HTMLImageElement> | HTMLImageElement,
): void {
  const img = e instanceof HTMLImageElement ? e : e.currentTarget;
  if (!(img instanceof HTMLImageElement)) return;
  const originalSrc = img.getAttribute("data-original-src") || img.src;

  // Don't infinite-loop on placeholder failures
  if (img.src === PLACEHOLDER_DATA_URI || img.src.startsWith("data:")) return;

  // Mark as failed
  failedPaths.add(originalSrc);

  // Try CDN if we were on ObjectStore
  if (!originalSrc.includes(ASSET_CDN_BASE)) {
    const pathMatch = originalSrc.match(/ObjectStore(.+)$/);
    if (pathMatch) {
      const cdnUrl = cdnAssetUrl(pathMatch[1]);
      img.setAttribute("data-original-src", originalSrc);
      img.src = cdnUrl;
      return;
    }
  }

  // Final fallback: category placeholder
  const cat = detectCategory(originalSrc);
  img.src = FALLBACK_IMAGES[cat] || PLACEHOLDER_DATA_URI;
}

/**
 * Preload and verify an asset exists, caching the best URL.
 * Returns the resolved URL (CDN, ObjectStore, or fallback).
 */
export async function preloadAsset(path: string): Promise<string> {
  if (resolvedCache.has(path)) return resolvedCache.get(path)!;

  const cdnUrl = cdnAssetUrl(path);
  if (await probeImageUrl(cdnUrl)) {
    resolvedCache.set(path, cdnUrl);
    return cdnUrl;
  }

  const osUrl = `https://objectstore.grudge-studio.com${path.startsWith('/') ? path : '/' + path}`;
  if (await probeImageUrl(osUrl)) {
    resolvedCache.set(path, osUrl);
    return osUrl;
  }

  // Fallback
  const fallback = getFallback(path);
  resolvedCache.set(path, fallback);
  failedPaths.add(path);
  return fallback;
}

/**
 * Batch preload multiple assets in parallel.
 */
export async function preloadAssets(paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map(preloadAsset));
}

// ── Debug ────────────────────────────────────────────────────────────────────

export function getFailedAssets(): string[] {
  return Array.from(failedPaths);
}

export function getResolvedCacheSize(): number {
  return resolvedCache.size;
}
