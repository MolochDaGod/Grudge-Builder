/**
 * ObjectStore Asset URL Configuration
 *
 * All game assets (PNGs, sprites, icons, audio, video) are served from
 * the Grudge Studio ObjectStore rather than bundled in this repo.
 *
 * Base URL can be overridden via VITE_OBJECT_STORE_URL env var.
 */

const OBJECT_STORE_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OBJECT_STORE_URL) ||
  'https://molochdagod.github.io/ObjectStore';

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
  // Ensure exactly one slash between base and path
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${OBJECT_STORE_BASE}${cleanPath}`;
}

/** The raw ObjectStore base URL (no trailing slash) */
export { OBJECT_STORE_BASE };
