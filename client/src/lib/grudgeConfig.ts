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

/**
 * GrudgeDot launcher canonical URL.
 *
 * Default points at `launcher.grudge-studio.com` (status: planned in systemMap.ts).
 * The legacy `https://grudgedot-launcher.vercel.app` host returns 404 (probed 2026-04-26)
 * — do not link to it. Override via VITE_GRUDGEDOT_LAUNCHER_URL for staging builds.
 *
 * Use `isGrudgedotLauncherLive()` to gate UI affordances until the planned domain ships.
 */
export const GRUDGEDOT_LAUNCHER_URL: string =
  env.VITE_GRUDGEDOT_LAUNCHER_URL || 'https://launcher.grudge-studio.com';

/** True when GRUDGEDOT_LAUNCHER_URL has been overridden away from the planned default. */
export function isGrudgedotLauncherLive(): boolean {
  return GRUDGEDOT_LAUNCHER_URL !== 'https://launcher.grudge-studio.com'
    || env.VITE_GRUDGEDOT_LAUNCHER_LIVE === 'true';
}

/**
 * Web3 / cNFT / wallet / games hub. Distinct from the launcher per owner directive
 * (2026-04-26): grudgeplatform.io shares only auth and data layers with the rest of
 * Grudge Studio.
 */
export const GRUDGE_PLATFORM_URL: string =
  env.VITE_GRUDGE_PLATFORM_URL || 'https://grudgeplatform.io';

/**
 * Discord OAuth wiring (2026-04-27).
 *
 * `id.grudge-studio.com/auth/discord/start` currently returns 404, but
 * `/auth/discord/callback` is alive. We build the discord.com authorize URL
 * on the client and let Discord redirect straight to the callback. The
 * backend callback exchanges the code, signs a JWT, and redirects back to
 * `state` with `?sso_token=...` — picked up by the IIFE at the top of
 * `grudgeBackend.ts`.
 *
 * Client ID is the GrudgeWarlords Discord app (registered in
 * Developer Portal). Override via VITE_DISCORD_CLIENT_ID.
 */
export const DISCORD_CLIENT_ID: string =
  env.VITE_DISCORD_CLIENT_ID || '1471046591220678677';

export const DISCORD_REDIRECT_URI: string =
  env.VITE_DISCORD_REDIRECT_URI || 'https://id.grudge-studio.com/auth/discord/callback';

export const DISCORD_OAUTH_SCOPES: string =
  env.VITE_DISCORD_OAUTH_SCOPES || 'identify email';

/**
 * Construct a Discord OAuth2 authorize URL. The user is redirected here when
 * they click "Continue with Discord"; Discord redirects back to
 * `DISCORD_REDIRECT_URI` with a code, and the backend resolves the code into
 * a Grudge ID + JWT and redirects to `state` with the SSO token.
 */
export function buildDiscordOAuthUrl(returnUrl: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: DISCORD_OAUTH_SCOPES,
    state: returnUrl,
    prompt: 'consent',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

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
  GRUDGEDOT_LAUNCHER_URL,
  isGrudgedotLauncherLive,
  GRUDGE_PLATFORM_URL,
  DISCORD_CLIENT_ID,
  DISCORD_REDIRECT_URI,
  DISCORD_OAUTH_SCOPES,
  buildDiscordOAuthUrl,
  STORAGE_KEYS,
  purgeGrudgeClientState,
  authHeaders,
};
