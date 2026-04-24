/**
 * grudgeConfig.ts — The single source of truth for all Grudge Studio service URLs.
 *
 * Every callsite across this repo MUST import from here rather than hardcode URLs.
 * If a service moves, update this file only.
 *
 * Env-var overrides (Vite `VITE_*`) are honored for preview/staging builds,
 * but production defaults point at the canonical Cloudflare-backed domains.
 */

const env = (import.meta as any).env ?? {};

/** Identity provider / SSO. All auth flows go here. */
export const AUTH_GATEWAY: string =
  env.VITE_AUTH_GATEWAY_URL || 'https://id.grudge-studio.com';

/** Game API (Express backend, behind Cloudflare Tunnel on the VPS). */
export const GAME_API: string =
  env.VITE_API_URL || 'https://api.grudge-studio.com';

/** WebSocket bridge for realtime gameplay. */
export const WS_URL: string =
  env.VITE_WS_URL || 'wss://api.grudge-studio.com';

/** Public R2-backed asset CDN. */
export const ASSETS_CDN: string =
  env.VITE_ASSETS_URL || 'https://assets.grudge-studio.com';

/** AI gateway Worker (ALE). */
export const AI_GATEWAY: string =
  env.VITE_AI_URL || 'https://ale.grudge-studio.com';

/** Edge badge-reader Worker — JWT pre-check before protected origins. */
export const BADGE_READER: string =
  env.VITE_BADGE_READER_URL || 'https://edge.grudge-studio.com';

/** Canonical ObjectStore API (legacy GitHub Pages backing). */
export const OBJECTSTORE: string =
  env.VITE_OBJECTSTORE_URL || 'https://molochdagod.github.io/ObjectStore/api/v1';

/** LocalStorage keys — kept centralized so logout/purge logic cannot miss any. */
export const STORAGE_KEYS = [
  'grudge_auth_token',
  'grudge_user_id',
  'grudge_id',
  'grudge_username',
  'grudge_user',
  'grudge-session',
  'grudge_auth_user',
  'grudge_session_token',
  'grudge_puter_guest_id',
  'grudge_device_id',
] as const;

/** Clear every Grudge-owned key from localStorage + sessionStorage + cookies. */
export function purgeGrudgeClientState(): void {
  try {
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    // Defensive: clear anything grudge-prefixed we didn't explicitly name.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && /^grudge[_-]/i.test(k)) localStorage.removeItem(k);
    }
    sessionStorage.clear();
  } catch {
    /* storage may be unavailable in strict contexts */
  }
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.replace(/^ +/, '').split('=')[0];
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.grudge-studio.com`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.grudgewarlords.com`;
    });
  } catch {
    /* not in a browser context */
  }
}

/** Build an authenticated fetch init. */
export function authHeaders(): Record<string, string> {
  const token =
    (typeof localStorage !== 'undefined' && localStorage.getItem('grudge_auth_token')) || '';
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export default {
  AUTH_GATEWAY,
  GAME_API,
  WS_URL,
  ASSETS_CDN,
  AI_GATEWAY,
  BADGE_READER,
  OBJECTSTORE,
  STORAGE_KEYS,
  purgeGrudgeClientState,
  authHeaders,
};
