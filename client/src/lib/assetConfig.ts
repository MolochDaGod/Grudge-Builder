import { normalizeAssetPath } from './legacyAssetPaths';
import { objectStoreApiBase, CANONICAL_OBJECT_STORE_API } from './objectStoreUrl';

/**
 * ObjectStore Asset & API URL Configuration — ONE TRUTH
 *
 *   BINARY ASSETS → browser: /api/assets/* (same-origin → R2) · SSR: assets.grudge-studio.com
 *   JSON DATA     → objectstore.grudge-studio.com/api/v1 (browser: /api/objectstore/v1 proxy)
 *
 * assetUrl()      → same-origin proxy in browser (no CORS); absolute CDN in tests/SSR
 * cdnAssetUrl()   → always absolute R2
 * sameOriginAssetUrl() → force /api/assets/*
 * apiUrl()        → ObjectStore JSON
 * workerUrl()     → objectstore.grudge-studio.com
 */

/** R2 CDN — primary for ALL binary assets (images, sprites, audio, models) */
const ASSET_CDN_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_ASSETS_URL || import.meta.env?.VITE_ASSET_CDN_URL)) ||
  'https://assets.grudge-studio.com';

const OBJECT_STORE_ENV =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_OBJECTSTORE_URL || import.meta.env?.VITE_OBJECT_STORE_URL)) ||
  undefined;

const OBJECT_STORE_API = objectStoreApiBase(OBJECT_STORE_ENV);

/** ObjectStore Worker — search, filtering, icon registry REST */
const OBJECTSTORE_WORKER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OBJECTSTORE_WORKER_URL) ||
  'https://objectstore.grudge-studio.com';

/** Legacy alias — kept for backward compatibility but points to CDN now */
const OBJECT_STORE_BASE = ASSET_CDN_BASE;

/** Current ObjectStore data version — bump when API data changes */
const OBJECT_STORE_VERSION = '3.2.0';

/**
 * Browser pages should load binaries via same-origin rewrites:
 *   /api/assets/*  → assets.grudge-studio.com (Vercel + Vite proxy)
 *   /icons|/models|/sprites|/fonts|/videos → also rewritten on Vercel
 *
 * Why: direct cross-origin fetch/WebGL/canvas of R2 can fail CORS when an
 * edge returns HTML (miss) or a browser extension wraps fetch. Same-origin
 * keeps TextureLoader / useGLTF / icon probe fetches quiet.
 */
function preferSameOriginAssets(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const env = (import.meta as { env?: Record<string, unknown> }).env;
    if (env?.MODE === 'test' || env?.VITEST || env?.VITE_ASSET_ABSOLUTE === '1') {
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

/** Strip CDN host → site-relative path (leading slash). */
function toCdnRelativePath(pathOrUrl: string): string {
  let raw = pathOrUrl.trim();
  if (!raw) return '';
  // //assets.grudge-studio.com/...
  if (raw.startsWith('//')) raw = `https:${raw}`;
  const host = ASSET_CDN_BASE.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  raw = raw.replace(new RegExp(`^https?:\\/\\/${host.replace(/\./g, '\\.')}`, 'i'), '');
  raw = raw.replace(/^\/api\/assets\/?/i, '/');
  if (!raw.startsWith('/')) raw = `/${raw}`;
  return raw;
}

/**
 * Same-origin URL that Vercel / Vite proxy to R2.
 * Prefer this for fetch, Three.js loaders, and canvas.
 */
/** Local public sprite on the Warlords SPA — not R2. assetUrl() would 403/404 via /api/assets. */
export const GBUX_TOKEN_SRC = "/sprites/gbux-token.png";

export function sameOriginAssetUrl(path: string): string {
  if (!path) return '/api/assets/';
  if (/^(data:|blob:)/i.test(path)) return path;
  const rel = toCdnRelativePath(normalizeAssetPath(path) || path);
  const clean = rel.replace(/^\/+/, '');
  return `/api/assets/${clean}`;
}

/**
 * Build a URL for a game asset (image, sprite, audio, model, etc.).
 *
 * Browser (production/dev): same-origin `/api/assets/...` (no CORS).
 * SSR / tests / VITE_ASSET_ABSOLUTE=1: absolute R2 CDN URL.
 *
 * @example
 *   assetUrl('/backgrounds/general.png')
 *   // browser => '/api/assets/backgrounds/general.png'
 *   // node/test => 'https://assets.grudge-studio.com/backgrounds/general.png'
 */
export function assetUrl(path: string): string {
  if (!path) return preferSameOriginAssets() ? '/api/assets/' : ASSET_CDN_BASE;
  // data / blob — never re-prefix
  if (/^(data:|blob:)/i.test(path)) return path;

  // Already same-origin proxy
  if (path.startsWith('/api/assets/') || path === '/api/assets') {
    return path;
  }

  // Absolute non-CDN http(s) (e.g. external) — leave alone
  if (/^https?:\/\//i.test(path)) {
    const host = ASSET_CDN_BASE.replace(/^https?:\/\//i, '');
    if (!path.includes(host)) return path;
    // CDN absolute → same-origin in browser
    if (preferSameOriginAssets()) return sameOriginAssetUrl(path);
    return path;
  }
  if (path.startsWith('//')) {
    const abs = `https:${path}`;
    return preferSameOriginAssets() ? sameOriginAssetUrl(abs) : abs;
  }

  const cleanPath = normalizeAssetPath(path);
  if (/^(data:|blob:)/i.test(cleanPath)) return cleanPath;
  if (/^https?:\/\//i.test(cleanPath)) {
    return preferSameOriginAssets() ? sameOriginAssetUrl(cleanPath) : cleanPath;
  }

  const host = ASSET_CDN_BASE.replace(/^https?:\/\//i, '');
  if (cleanPath.includes(host)) {
    const abs = /^https?:\/\//i.test(cleanPath)
      ? cleanPath
      : `https://${cleanPath.replace(/^\/+/, '')}`;
    return preferSameOriginAssets() ? sameOriginAssetUrl(abs) : abs;
  }

  const rel = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  if (preferSameOriginAssets()) return sameOriginAssetUrl(rel);

  const base = ASSET_CDN_BASE.replace(/\/$/, '');
  return `${base}${rel}`;
}

/**
 * Always absolute R2 CDN URL (sharing, SSR, emails, workers).
 */
export function cdnAssetUrl(path: string): string {
  if (!path) return ASSET_CDN_BASE;
  if (/^(data:|blob:)/i.test(path)) return path;
  if (/^https?:\/\//i.test(path) && path.includes('assets.grudge-studio.com')) {
    return path;
  }
  const rel = toCdnRelativePath(normalizeAssetPath(path) || path);
  const base = ASSET_CDN_BASE.replace(/\/$/, '');
  return `${base}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

/**
 * Play meshes that are catalogued but not on R2 yet.
 * Do not fetch — skip (dedicated systems or omit). Never SPA HTML / primitives.
 */
const PLAY_MESH_SKIP = new Set([
  'models/biomes/ethereal/event-falls.glb',
  'models/biomes/ethereal/starting-falls.glb',
  'models/camps/stylized_enemy_camp_scene.glb',
  'models/towns/fabled/dwarf_gate.glb',
  'models/weapons/projectiles/arrow.glb',
]);

export function playMeshKey(path: string): string {
  return toCdnRelativePath(path || '').replace(/^\/+/, '').toLowerCase();
}

/** True when Island3D must not request this key (missing on R2). */
export function shouldSkipPlayMesh(path: string): boolean {
  return PLAY_MESH_SKIP.has(playMeshKey(path));
}

/**
 * Build a full ObjectStore API URL for a given JSON data endpoint.
 * Browser: same-origin /api/objectstore/v1 (Vercel → objectstore.grudge-studio.com).
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
 *   // => 'https://objectstore.grudge-studio.com/api/v1/weapon-skills/SWORD'
 */
export function workerUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${OBJECTSTORE_WORKER_URL}${cleanPath}`;
}

export {
  OBJECT_STORE_BASE,
  OBJECT_STORE_API,
  ASSET_CDN_BASE,
  OBJECTSTORE_WORKER_URL,
  OBJECT_STORE_VERSION,
  objectStoreApiBase,
  CANONICAL_OBJECT_STORE_API,
};
export { resolveIconUrl, getPackIconForCategory, iconOnError } from './iconResolver';
