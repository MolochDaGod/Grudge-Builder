/**
 * grudgeConfig.ts — The single source of truth for all Grudge Studio service URLs.
 *
 * Every callsite across this repo MUST import from here rather than hardcode URLs.
 * If a service moves, update this file only.
 *
 * Env-var overrides (Vite `VITE_*`) are honored for preview/staging builds,
 * but production defaults point at the canonical Cloudflare-backed domains.
 */

import { FLEET_URLS, buildFleetAuthLoginUrl } from '@shared/fleet';
import { resolveObjectStoreApiBase } from './objectStoreUrl';

const env = (import.meta as any).env ?? {};

/** Identity provider / SSO. All auth flows go here. */
export const AUTH_GATEWAY: string =
  env.VITE_AUTH_GATEWAY_URL || FLEET_URLS.auth;

/**
 * Identity API (The-ENGINE on Railway) — OAuth, session exchange, GBUX shell.
 * NOT the source of truth for characters/wallets; use fleetApi() for game data.
 */
export const GAME_API: string =
  env.VITE_API_URL || FLEET_URLS.identityApi;

/**
 * Authoritative game-state API (GrudgeBuilder Postgres on Railway).
 * Vercel apps proxy /api/characters|wallet|account here via vercel.json.
 */
export const GAME_DATA_API: string =
  env.VITE_GAME_DATA_API || FLEET_URLS.gameData;

/** Crossmint character cNFT collection UUID */
export const CROSSMINT_CHARACTER_COLLECTION: string =
  env.VITE_CROSSMINT_CHARACTER_COLLECTION || '5061318d-ff65-4893-ac4b-9b28efb18ace';

/** WebSocket bridge for realtime gameplay (dedicated ws-service). */
export const WS_URL: string =
  env.VITE_WS_URL || 'wss://ws.grudge-studio.com';

/** Public R2-backed asset CDN. */
export const ASSETS_CDN: string =
  env.VITE_ASSETS_URL || env.VITE_ASSET_CDN_URL || FLEET_URLS.assets;

/**
 * Grudge Studio Map & Model Editor — canonical home-island creation surface.
 * Vercel project `grudge-studio-editor` (artifacts/studio in grudge-studio-games).
 * Planned custom domain: studio.grudge-studio.com
 */
export const STUDIO_EDITOR_URL: string =
  env.VITE_STUDIO_EDITOR_URL || 'https://grudge-studio-editor.vercel.app';

/**
 * VFX effects registry API (api-server stack from vfx-sandbox).
 * Defaults to same-origin `/api/effects` via Vercel rewrite → api.grudge-studio.com.
 * Set VITE_EFFECTS_API_URL=off for fully offline sandbox mode.
 */
export const EFFECTS_API: string =
  env.VITE_EFFECTS_API_URL ?? '';

/**
 * AI Gateway Worker — unified model hub for all Grudge AI calls.
 * Deployed at ai.grudge-studio.com (Cloudflare Worker).
 * Routes chat, image, video, speech, music, and agent pipelines
 * through Cloudflare AI Gateway to 137+ models.
 */
export const AI_GATEWAY: string =
  env.VITE_AI_URL || FLEET_URLS.ai;

/**
 * Edge badge-reader Worker — JWT pre-check before protected origins.
 *
 * NOTE (2026-05-06): edge.grudge-studio.com has NO DNS record — the Worker
 * source exists in grudge-backend/workers/badge-reader/ but was never deployed.
 * Fallback to Railway game-data until edge Worker is deployed.
 */
export const BADGE_READER: string =
  env.VITE_BADGE_READER_URL || FLEET_URLS.gameData;

/** Canonical ObjectStore JSON API (objectstore.grudge-studio.com/api/v1). */
export const OBJECTSTORE: string = resolveObjectStoreApiBase(
  env.VITE_OBJECTSTORE_URL || env.VITE_OBJECT_STORE_URL,
);

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
 * All Grudge Studio domains — used for SSO redirect validation,
 * cookie clearing, and CORS allowlisting.
 *
 * Every domain that hosts a Grudge app MUST be listed here so that:
 *   1. buildSsoLoginUrl() can redirect back to it after login
 *   2. purgeGrudgeClientState() clears cookies on all domains
 *   3. Backend CORS_ORIGINS env var includes it
 */
export const GRUDGE_DOMAINS = [
  'grudge-studio.com',
  'grudgestudio.org',
  'grudgeplatform.io',
  'grudgewarlords.com',
  // Grudox (Voxel Forge Engine) landing app. A grudge-studio.com subdomain, registered here
  // as a first-class app domain so SSO redirect validation, cookie purge, and CORS cover it.
  'grudox.grudge-studio.com',
] as const;

/** Subdomains that host Grudge services (for CORS regex matching). */
export const GRUDGE_SUBDOMAINS = [
  'id.grudge-studio.com',
  'api.grudge-studio.com',
  'account.grudge-studio.com',
  'assets.grudge-studio.com',
  'ai.grudge-studio.com',
  'dash.grudge-studio.com',
  'info.grudge-studio.com',
  'objectstore.grudge-studio.com',
  'ws.grudge-studio.com',
  'pvp.grudge-studio.com',
  'client.grudge-studio.com',
  'metaverse.grudge-studio.com',
  'forge.grudge-studio.com',
  'play.grudge-studio.com',
  'warlord3d.grudge-studio.com',
  'wcs.grudge-studio.com',
  'wow.grudge-studio.com',
  'engine.grudge-studio.com',
  'launcher.grudge-studio.com',
  'grudge6.grudge-studio.com',
  'characters.grudge-studio.com',
  'studio.grudge-studio.com',
  'grudge-studio-editor.vercel.app',
  'grudge-three-port.vercel.app',
  'rts-grudge.vercel.app',
  'grudge-drive.vercel.app',
  'grudge-arena.grudge-studio.com',
  'dcq.grudge-studio.com',
  'survival.grudge-studio.com',
  'carrier.grudge-studio.com',
  'grudox.grudge-studio.com',
] as const;

/**
 * Discord OAuth wiring (2026-04-27).
 *
 * Canonical flow: redirect to `id.grudge-studio.com/auth/discord/start`
 * (or same-origin `/api/auth/discord/start` via Vercel proxy). Scopes are
 * `identify email` only — no guild admin, messages, or wallet scopes.
 *
 * Client-built OAuth is deprecated; DISCORD_CLIENT_ID must match the VPS app
 * if you still use buildDiscordOAuthUrl for legacy surfaces.
 */
export const DISCORD_CLIENT_ID: string =
  env.VITE_DISCORD_CLIENT_ID || '1342593452793270302';

/**
 * Discord redirect URI.
 *
 * The backend callback at id.grudge-studio.com exchanges the code for a JWT
 * and redirects back to the `state` param with ?sso_token=...
 *
 * Registered redirects in Discord Developer Portal:
 *   - https://grudgewarlords.com/auth/callback
 *   - https://grudge-studio.com
 *   - https://id.grudge-studio.com/*
 */
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

/**
 * Canonical Grudge ID login URL — id.grudge-studio.com/login?redirect_uri=…
 * After sign-in, auth-page returns ?grudge_token= on the callback URL.
 *
 * Set preferSsoCheck=true only after `npx tsx scripts/probe-fleet-auth.ts` passes id-sso-check.
 */
export function buildSsoLoginUrl(
  returnOrigin?: string,
  returnPath = '/auth/callback',
  preferSsoCheck = false,
): string {
  const origin = (
    returnOrigin?.startsWith('http')
      ? new URL(returnOrigin).origin
      : returnOrigin ||
        (typeof window !== 'undefined' ? window.location.origin : 'https://grudgewarlords.com')
  ).replace(/\/$/, '');
  const path =
    returnOrigin?.startsWith('http') && returnOrigin.includes('/')
      ? new URL(returnOrigin).pathname + new URL(returnOrigin).search
      : returnPath;
  return buildFleetAuthLoginUrl(origin, {
    path,
    gateway: AUTH_GATEWAY,
    preferSsoCheck,
  });
}

/** LocalStorage keys — kept centralized so logout/purge logic cannot miss any. */
export const STORAGE_KEYS = [
  'grudge_auth_token',
  'grudge.token',
  'grudge.token.exp',
  'grudge.playerId',
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
      // Clear cookies on ALL Grudge domains
      for (const domain of GRUDGE_DOMAINS) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
      }
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
  STUDIO_EDITOR_URL,
  EFFECTS_API,
  AI_GATEWAY,
  BADGE_READER,
  OBJECTSTORE,
  GRUDGEDOT_LAUNCHER_URL,
  isGrudgedotLauncherLive,
  GRUDGE_PLATFORM_URL,
  GRUDGE_DOMAINS,
  GRUDGE_SUBDOMAINS,
  DISCORD_CLIENT_ID,
  DISCORD_REDIRECT_URI,
  DISCORD_OAUTH_SCOPES,
  buildDiscordOAuthUrl,
  buildSsoLoginUrl,
  STORAGE_KEYS,
  purgeGrudgeClientState,
  authHeaders,
};
