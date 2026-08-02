/**
 * Warlords product host + connection map.
 * Apex grudge.studio and grudgewarlords.com both serve this client.
 */
import { FLEET_URLS } from '@shared/fleet/manifest';
import { buildFleetLoginUrl, buildFleetAuthCallback } from '@shared/fleet/authConnect';

export const WARLORDS_PRODUCT_HOSTS = new Set([
  'grudge.studio',
  'www.grudge.studio',
  'grudgewarlords.com',
  'www.grudgewarlords.com',
  'client.grudge-studio.com',
  'localhost',
  '127.0.0.1',
]);

export function isWarlordsProductHost(hostname?: string): boolean {
  if (typeof window === 'undefined' && !hostname) return true;
  const h = (hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (WARLORDS_PRODUCT_HOSTS.has(h)) return true;
  if (h.endsWith('.grudge.studio')) return true;
  if (h.includes('localhost') || h.includes('127.0.0.1')) return true;
  return false;
}

/** Primary marketing host for Warlords (user request 2026-07). */
export const WARLORDS_APEX = 'https://grudge.studio';

/** Play / game client alias (same SPA). */
export const WARLORDS_PLAY_ORIGIN = 'https://grudgewarlords.com';

export function warlordsOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return WARLORDS_APEX;
}

export const WARLORDS_CONNECTIONS = {
  product: WARLORDS_APEX,
  play: WARLORDS_PLAY_ORIGIN,
  auth: FLEET_URLS.auth,
  gameData: FLEET_URLS.gameData,
  assets: FLEET_URLS.assets,
  objectStore: FLEET_URLS.objectStore,
  characters: FLEET_URLS.gcs,
  colyseus: FLEET_URLS.colyseus,
  engineGallery: 'https://grudge-engine.vercel.app',
  era: 'warlords' as const,
} as const;

export function warlordsLoginUrl(returnPath = '/account'): string {
  const origin = warlordsOrigin();
  const callback = buildFleetAuthCallback(origin, '/auth/callback');
  // After auth, apps often land on callback then home; store intended return
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('grudge_auth_return', returnPath);
    }
  } catch {
    /* ignore */
  }
  return buildFleetLoginUrl(callback);
}

export function gcsCreateHeroUrl(): string {
  const returnTo = encodeURIComponent(`${warlordsOrigin()}/account`);
  return `${FLEET_URLS.gcs}?era=warlords&mode=create&return_uri=${returnTo}`;
}

export type WarlordsNavId =
  | 'home'
  | 'characters'
  | 'combat'
  | 'arsenal'
  | 'professions'
  | 'skills'
  | 'lore'
  | 'lore-factions'
  | 'lore-gods'
  | 'lore-heroes'
  | 'lore-world'
  | 'codex'
  | 'account'
  | 'play'
  | 'home-island'
  | 'tutorial'
  | 'crafting';

/**
 * Product chrome — full Warlords era game app (grudgewarlords.com).
 * Combat tab = airship 4-character scene. Play = smart onboarding router.
 */
export const WARLORDS_NAV: Array<{
  id: WarlordsNavId;
  label: string;
  href: string;
  primary?: boolean;
}> = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'characters', label: 'Characters', href: '/heroes' },
  { id: 'combat', label: 'Combat', href: '/combat' },
  { id: 'arsenal', label: 'Arsenal', href: '/arsenal' },
  { id: 'professions', label: 'Professions', href: '/professions' },
  { id: 'skills', label: 'Skill Trees', href: '/skill-tree' },
  { id: 'crafting', label: 'Crafting', href: '/crafting' },
  { id: 'home-island', label: 'Home Island', href: '/home-island' },
  { id: 'lore', label: 'Lore', href: '/lore' },
  { id: 'account', label: 'Account', href: '/account' },
  { id: 'play', label: 'Play', href: '/intro', primary: true },
];
