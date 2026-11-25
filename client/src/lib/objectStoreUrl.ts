/**
 * Canonical definition JSON — ONE TRUTH.
 * Browser: same-origin /api/objectstore/v1 (Vercel rewrite → objectstore.grudge-studio.com).
 * SSR/scripts: https://objectstore.grudge-studio.com/api/v1
 * The ObjectStore Worker serves the unified game catalog (races, classes, items, recipes, etc.).
 */

const CANONICAL_OBJECT_STORE_API = 'https://objectstore.grudge-studio.com/api/v1';

const DEPRECATED_OBJECT_STORE_HOSTS = [
  'molochdagod.github.io',
  'grudge-objectstore.pages.dev',
] as const;

function isDeprecatedObjectStoreUrl(url: string): boolean {
  return DEPRECATED_OBJECT_STORE_HOSTS.some((h) => url.includes(h));
}

/** Normalize env override to canonical /api/v1 base. */
export function resolveObjectStoreApiBase(envOverride?: string): string {
  const raw = (envOverride || '').trim();
  if (!raw || isDeprecatedObjectStoreUrl(raw)) {
    return CANONICAL_OBJECT_STORE_API;
  }
  // Normalize objectstore.grudge-studio.com variations
  if (/objectstore\.grudge-studio\.com/i.test(raw)) {
    return CANONICAL_OBJECT_STORE_API;
  }
  // Legacy info.grudge-studio.com → objectstore
  if (/info\.grudge-studio\.com/i.test(raw)) {
    return CANONICAL_OBJECT_STORE_API;
  }
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api/v1/')) return raw.replace(/\/$/, '');
  return `${raw.replace(/\/$/, '')}/api/v1`;
}

/** Browser: existing /api/objectstore/v1 rewrite (aimed at info). */
export function objectStoreApiBase(envOverride?: string): string {
  if (typeof window !== 'undefined') {
    return '/api/objectstore/v1';
  }
  return resolveObjectStoreApiBase(envOverride);
}

export { CANONICAL_OBJECT_STORE_API, DEPRECATED_OBJECT_STORE_HOSTS };
