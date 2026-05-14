/**
 * ObjectStore Asset & API URL Configuration
 *
 * TWO systems, ONE source of truth:
 *   - BINARY ASSETS (images, sprites, audio, models): R2 CDN (assets.grudge-studio.com)
 *   - JSON DATA (weapons, armor, classes, races): GitHub Pages (molochdagod.github.io/ObjectStore/api/v1)
 *
 * GitHub Pages has a 1GB limit and can't serve all 12K+ images.
 * R2 CDN has no size limit and serves with proper CORS + caching.
 *
 * assetUrl() → R2 CDN (primary for all binary assets)
 * apiUrl() → GitHub Pages (JSON data only, lightweight)
 */

/** R2 CDN — primary for ALL binary assets (images, sprites, audio, models) */
const ASSET_CDN_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSET_CDN_URL) ||
  'https://assets.grudge-studio.com';

/** GitHub Pages — canonical source for static JSON game data (NOT for images).
 *  Cloudflare Pages (grudge-objectstore.pages.dev) is broken (returns HTML for JSON
 *  endpoints), so we use the GitHub Pages origin directly until the CF deployment
 *  is fixed. */
const OBJECT_STORE_PAGES =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OBJECT_STORE_URL) ||
  'https://molochdagod.github.io/ObjectStore';

/** ObjectStore JSON API base — append endpoint paths like /weapons.json */
const OBJECT_STORE_API = `${OBJECT_STORE_PAGES}/api/v1`;

/**
 * ObjectStore Cloudflare Worker — production API with caching, search, filtering.
 * Serves game data collections + weapon skills with R2 cache → GitHub Pages fallback.
 * Custom domain: objectstore.grudge-studio.com
 */
const OBJECTSTORE_WORKER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OBJECTSTORE_WORKER_URL) ||
  'https://objectstore.grudge-studio.com';

/** Legacy alias — kept for backward compatibility but points to CDN now */
const OBJECT_STORE_BASE = ASSET_CDN_BASE;

/** Current ObjectStore data version — bump when API data changes */
const OBJECT_STORE_VERSION = '3.2.0';

/**
 * Build a URL for a game asset (image, sprite, audio, etc.).
 * Points to R2 CDN (assets.grudge-studio.com) which has all assets.
 *
 * @example
 *   assetUrl('/backgrounds/general.png')
 *   // => 'https://assets.grudge-studio.com/backgrounds/general.png'
 */
export function assetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${ASSET_CDN_BASE}${cleanPath}`;
}

/**
 * CDN asset URL — same as assetUrl() now (both point to R2 CDN).
 */
export function cdnAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${ASSET_CDN_BASE}${cleanPath}`;
}

/**
 * Build a full ObjectStore API URL for a given JSON data endpoint.
 * Points to GitHub Pages (lightweight JSON only, not images).
 *
 * @example
 *   apiUrl('/weapons.json')  // => '.../api/v1/weapons.json'
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${OBJECT_STORE_API}${cleanEndpoint}`;
}

/**
 * Build a URL for the ObjectStore Worker API (production, with caching + filtering).
 * Use for weapon skills, game data collections, and real-time queries.
 *
 * @example
 *   workerUrl('/v1/weapon-skills/SWORD')
 *   // => 'https://objectstore.grudge-studio.com/v1/weapon-skills/SWORD'
 */
export function workerUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${OBJECTSTORE_WORKER_URL}${cleanPath}`;
}

export { OBJECT_STORE_BASE, OBJECT_STORE_API, ASSET_CDN_BASE, OBJECTSTORE_WORKER_URL, OBJECT_STORE_VERSION };
