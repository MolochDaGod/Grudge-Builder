/**
 * ObjectStore Asset & API URL Configuration
 *
 * All game assets (PNGs, sprites, icons, audio, video) are served from
 * the Grudge Studio ObjectStore rather than bundled in this repo.
 *
 * Game data (weapons, armor, materials, etc.) is fetched from the
 * ObjectStore JSON API at /api/v1/*.json.
 *
 * Base URL can be overridden via VITE_OBJECT_STORE_URL env var.
 * CDN fallback via VITE_ASSET_CDN_URL env var.
 */

/** Primary ObjectStore base URL (GitHub Pages) */
const OBJECT_STORE_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OBJECT_STORE_URL) ||
  'https://molochdagod.github.io/ObjectStore';

/** ObjectStore JSON API base — append endpoint paths like /weapons.json */
const OBJECT_STORE_API = `${OBJECT_STORE_BASE}/api/v1`;

/** CDN / VPS asset service fallback (R2, asset-service, etc.) */
const ASSET_CDN_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSET_CDN_URL) ||
  'https://assets.grudge-studio.com';

/** Current ObjectStore data version — bump when API data changes */
const OBJECT_STORE_VERSION = '3.0.0';

/**
 * Build a full ObjectStore URL for a given asset path.
 *
 * @example
 *   assetUrl('/backgrounds/general.png')
 *   // => 'https://molochdagod.github.io/ObjectStore/backgrounds/general.png'
 *
 *   assetUrl('/icons/weapons/swords/bloodfeud_sword.png')
 *   // => 'https://molochdagod.github.io/ObjectStore/icons/weapons/swords/bloodfeud_sword.png'
 */
export function assetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${OBJECT_STORE_BASE}${cleanPath}`;
}

/**
 * Build a CDN asset URL (falls back to ObjectStore if CDN is not configured).
 * Use this for large assets (models, audio, video) that benefit from CDN delivery.
 */
export function cdnAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${ASSET_CDN_BASE}${cleanPath}`;
}

/**
 * Build a full ObjectStore API URL for a given data endpoint.
 *
 * @example
 *   apiUrl('/weapons.json')  // => '.../api/v1/weapons.json'
 *   apiUrl('/classes.json')  // => '.../api/v1/classes.json'
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${OBJECT_STORE_API}${cleanEndpoint}`;
}

export { OBJECT_STORE_BASE, OBJECT_STORE_API, ASSET_CDN_BASE, OBJECT_STORE_VERSION };
