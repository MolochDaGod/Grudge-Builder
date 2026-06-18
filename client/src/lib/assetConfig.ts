import { normalizeAssetPath } from './legacyAssetPaths';

/**
 * ObjectStore Asset & API URL Configuration
 *
 * UNIFIED system — objectstore.grudge-studio.com serves everything:
 *   - BINARY ASSETS (images, sprites, audio, models)
 *   - JSON DATA (weapons, armor, classes, races)
 *
 * GitHub Pages is deprecated (upload-banned). All data now lives on
 * objectstore.grudge-studio.com (Vercel) with Cloudflare CDN.
 *
 * assetUrl() → R2 CDN (binary assets)
 * apiUrl() → objectstore.grudge-studio.com (JSON data)
 * workerUrl() → objectstore.grudge-studio.com (Worker API with caching)
 */

/** R2 CDN — primary for ALL binary assets (images, sprites, audio, models) */
const ASSET_CDN_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_ASSETS_URL || import.meta.env?.VITE_ASSET_CDN_URL)) ||
  'https://assets.grudge-studio.com';

/** ObjectStore — canonical source for all game data and assets.
 *  Hosted on Vercel at objectstore.grudge-studio.com.
 *  GitHub Pages (molochdagod.github.io/ObjectStore) is deprecated. */
const OBJECT_STORE_PAGES =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_OBJECTSTORE_URL || import.meta.env?.VITE_OBJECT_STORE_URL)) ||
  'https://objectstore.grudge-studio.com';

/** ObjectStore JSON API base — append endpoint paths like /weapons.json */
const OBJECT_STORE_API = `${OBJECT_STORE_PAGES}/api/v1`;

/**
 * ObjectStore Worker — production API with caching, search, filtering.
 * Same domain as OBJECT_STORE_PAGES since everything is unified now.
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
  const cleanPath = normalizeAssetPath(path);
  return `${ASSET_CDN_BASE}${cleanPath}`;
}

/**
 * CDN asset URL — same as assetUrl() now (both point to R2 CDN).
 */
export function cdnAssetUrl(path: string): string {
  return assetUrl(path);
}

/**
 * Build a full ObjectStore API URL for a given JSON data endpoint.
 * Points to objectstore.grudge-studio.com.
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
