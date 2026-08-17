/**
 * iconResolver.ts — ONE TRUTH icon URLs for the Grudge Warlords era.
 *
 * Canonical binary icons: assets.grudge-studio.com/icons/pack/* (grudge-guide.html)
 * Named weapon icons:      assets.grudge-studio.com/icons/weapons/{kebab-name}.png
 * JSON data:               info.grudge-studio.com/api/v1/*
 *
 * Rewrites deprecated molochdagod.github.io/ObjectStore URLs at runtime.
 */

import { assetUrl, ASSET_CDN_BASE } from './assetConfig';

const DEPRECATED_HOSTS = [
  'molochdagod.github.io',
  'grudge-objectstore.pages.dev',
] as const;

/** Pack icons used by grudge-guide.html — always exist on CDN */
const PACK_BY_CATEGORY: Record<string, string> = {
  swords: '/icons/pack/weapons/Sword_01.png',
  sword: '/icons/pack/weapons/Sword_01.png',
  axes: '/icons/pack/weapons/Axe_01.png',
  axe: '/icons/pack/weapons/Axe_01.png',
  daggers: '/icons/pack/weapons/Dagger_01.png',
  dagger: '/icons/pack/weapons/Dagger_01.png',
  hammers: '/icons/pack/weapons/Hammer_01.png',
  hammer: '/icons/pack/weapons/Hammer_01.png',
  'hammer1h': '/icons/pack/weapons/Hammer_01.png',
  'hammer2h': '/icons/pack/weapons/Hammer_01.png',
  maces: '/icons/pack/weapons/Hammer_10.png',
  mace: '/icons/pack/weapons/Hammer_10.png',
  greatswords: '/icons/pack/weapons/Sword_10.png',
  greatsword: '/icons/pack/weapons/Sword_10.png',
  greataxes: '/icons/pack/weapons/Axe_10.png',
  greataxe: '/icons/pack/weapons/Axe_10.png',
  spears: '/icons/pack/weapons/Spear_01.png',
  spear: '/icons/pack/weapons/Spear_01.png',
  bows: '/icons/pack/weapons/Bow_01.png',
  bow: '/icons/pack/weapons/Bow_01.png',
  crossbows: '/icons/pack/weapons/Crossbow_01.png',
  crossbow: '/icons/pack/weapons/Crossbow_01.png',
  guns: '/icons/pack/weapons/Crossbow_10.png',
  gun: '/icons/pack/weapons/Crossbow_10.png',
  // Style-aware gun icons (match 3D mesh palettes — see STYLE_ICON_MATCH)
  gun_copper: '/icons/pack/weapons/Crossbow_01.png',
  gun_silver: '/icons/pack/weapons/Crossbow_05.png',
  gun_gold: '/icons/pack/weapons/Crossbow_08.png',
  gun_diamond: '/icons/pack/weapons/Crossbow_10.png',
  gun_voxel: '/icons/pack/weapons/Crossbow_03.png',
  gun_cold_viking: '/icons/pack/weapons/Crossbow_12.png',
  wand: '/icons/pack/weapons/Wand_01.png',
  grimoire: '/icons/pack/weapons/Staff_17.png',
  ranger_log: '/icons/pack/weapons/Bow_01.png',
  battle_dual: '/icons/pack/weapons/Sword_10.png',
  chain_knife: '/icons/pack/weapons/Dagger_08.png',
  'fire staff': '/icons/pack/weapons/Staff_01.png',
  'frost staff': '/icons/pack/weapons/Staff_05.png',
  'holy staff': '/icons/pack/weapons/Staff_09.png',
  'lightning staff': '/icons/pack/weapons/Staff_13.png',
  'nature staff': '/icons/pack/weapons/Staff_17.png',
  'arcane staff': '/icons/pack/weapons/Staff_17.png',
  staves: '/icons/pack/weapons/Staff_01.png',
  staff: '/icons/pack/weapons/Staff_01.png',
  shields: '/icons/weapons/shields/style_copper.png',
  shield: '/icons/weapons/shields/style_copper.png',
  // Selected shield looks (override generic pack)
  shield_copper: '/icons/weapons/shields/style_copper.png',
  shield_silver: '/icons/weapons/shields/style_silver.png',
  shield_gold: '/icons/weapons/shields/fire_shield.png',
  shield_diamond: '/icons/weapons/shields/murozond.png',
  shield_voxel: '/icons/weapons/shields/utcm.png',
  shield_cold_viking: '/icons/weapons/shields/crimson_rose.png',
  shield_fire: '/icons/weapons/shields/fire_shield.png',
  shield_rose: '/icons/weapons/shields/crimson_rose.png',
  plate: '/icons/pack/weapons/Shield_01.png',
  leather: '/icons/pack/weapons/Dagger_01.png',
  cloth: '/icons/pack/weapons/Staff_01.png',
  ore: '/icons/pack/weapons/Hammer_01.png',
  ingot: '/icons/pack/weapons/Hammer_01.png',
  wood: '/icons/pack/weapons/Axe_01.png',
  plank: '/icons/pack/weapons/Axe_01.png',
  hide: '/icons/pack/weapons/Dagger_01.png',
  thread: '/icons/pack/weapons/Staff_01.png',
  food: '/icons/pack/misc/Burns.png',
  potion: '/icons/pack/misc/Effect.png',
  essence: '/icons/pack/misc/Effect.png',
  gem: '/icons/pack/misc/Electro.png',
  misc: '/icons/pack/misc/Effect.png',
  /** Back accessory — WCS cape / cloak / wings (01 outline, 02 painted) */
  feathered: '/icons/pack/accessories/Wings_02.png',
  wings: '/icons/pack/accessories/Wings_01.png',
  wing: '/icons/pack/accessories/Wings_01.png',
  cape: '/icons/pack/accessories/Wings_01.png',
  cloak: '/icons/pack/accessories/Wings_01.png',
  back: '/icons/pack/accessories/Wings_01.png',
};

const PACK_BY_WEAPON_TYPE: Record<string, string> = {
  Sword: '/icons/pack/weapons/Sword_01.png',
  Axe: '/icons/pack/weapons/Axe_01.png',
  Dagger: '/icons/pack/weapons/Dagger_01.png',
  Hammer1h: '/icons/pack/weapons/Hammer_01.png',
  Hammer2h: '/icons/pack/weapons/Hammer_01.png',
  Greatsword: '/icons/pack/weapons/Sword_10.png',
  Greataxe: '/icons/pack/weapons/Axe_10.png',
  Bow: '/icons/pack/weapons/Bow_01.png',
  Crossbow: '/icons/pack/weapons/Crossbow_01.png',
  Gun: '/icons/pack/weapons/Crossbow_10.png',
  'Fire Staff': '/icons/pack/weapons/Staff_01.png',
  'Frost Staff': '/icons/pack/weapons/Staff_05.png',
  'Holy Staff': '/icons/pack/weapons/Staff_09.png',
  'Lightning Staff': '/icons/pack/weapons/Staff_13.png',
  'Nature Staff': '/icons/pack/weapons/Staff_17.png',
  'Arcane Staff': '/icons/pack/weapons/Staff_17.png',
};

export interface IconResolveContext {
  category?: string;
  type?: string;
  name?: string;
  weaponType?: string;
}

function toKebab(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function rewriteDeprecatedHost(url: string): string {
  let out = url;
  for (const host of DEPRECATED_HOSTS) {
    if (!out.includes(host)) continue;
    out = out
      .replace(`https://${host}/ObjectStore`, ASSET_CDN_BASE)
      .replace(`http://${host}/ObjectStore`, ASSET_CDN_BASE)
      .replace(`https://${host}`, ASSET_CDN_BASE)
      .replace(`http://${host}`, ASSET_CDN_BASE);
  }
  if (out.includes('info.grudge-studio.com') && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(out)) {
    try {
      const u = new URL(out);
      const path = u.pathname.replace(/^\/api\/v1/, '');
      return `${ASSET_CDN_BASE}${path}`;
    } catch { /* keep */ }
  }
  return out;
}

/** Flatten legacy nested weapon paths: icons/weapons/swords/foo → icons/weapons/foo */
function flattenWeaponIconPath(path: string): string {
  return path.replace(
    /\/icons\/weapons\/(?:swords|axes|daggers|hammers|greatswords|greataxes|bows|crossbows|guns|staves\/[^/]+|tomes\/[^/]+)\//i,
    '/icons/weapons/',
  );
}

export function getPackIconForCategory(ctx: IconResolveContext = {}): string {
  const keys = [
    ctx.weaponType,
    ctx.category,
    ctx.type,
    ctx.name,
  ].filter(Boolean) as string[];

  for (const key of keys) {
    const lower = key.toLowerCase();
    if (PACK_BY_WEAPON_TYPE[key]) return assetUrl(PACK_BY_WEAPON_TYPE[key]);
    if (PACK_BY_CATEGORY[lower]) return assetUrl(PACK_BY_CATEGORY[lower]);
    for (const [cat, path] of Object.entries(PACK_BY_CATEGORY)) {
      if (lower.includes(cat)) return assetUrl(path);
    }
  }
  return assetUrl('/icons/pack/misc/Effect.png');
}

/**
 * Reject VFX strips / model dumps / UUID frame dumps as UI icons.
 * Skill and item icons MUST live under assets.grudge-studio.com/icons/*
 */
export function isBannedAsUiIcon(urlOrPath: string): boolean {
  const lower = urlOrPath.trim().toLowerCase().replace(/\\/g, '/');
  if (!lower) return true;
  if (
    lower.includes('/models/') ||
    lower.includes('games/models') ||
    lower.includes('d:/games') ||
    lower.includes('/vfx/') ||
    (lower.includes('sprite') && lower.includes('sheet')) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(lower)
  ) {
    return true;
  }
  return false;
}

/**
 * Resolve any icon URL/path to a working assets.grudge-studio.com URL.
 * Falls back to pack icons (grudge-guide.html convention) when named icons 404.
 * Never returns Models/VFX/UUID animation strips.
 */
export function resolveIconUrl(
  urlOrPath?: string | null,
  ctx: IconResolveContext = {},
): string {
  if (!urlOrPath) return getPackIconForCategory(ctx);

  let raw = urlOrPath.trim();
  if (!raw) return getPackIconForCategory(ctx);

  if (isBannedAsUiIcon(raw)) {
    return getPackIconForCategory(ctx);
  }

  if (raw.startsWith('http')) {
    raw = rewriteDeprecatedHost(raw);
    if (isBannedAsUiIcon(raw)) return getPackIconForCategory(ctx);
    // Only accept CDN/fleet icon URLs for UI; other absolute image hosts → pack fallback
    if (raw.startsWith(ASSET_CDN_BASE) && raw.toLowerCase().includes('/icons/')) {
      return assetUrl(raw);
    }
    // info.* / objectstore master-items icon hosts (icons under /icons/**)
    if (
      /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(raw) &&
      raw.toLowerCase().includes('/icons/') &&
      (raw.includes('grudge-studio.com') ||
        raw.includes('assets.grudge-studio.com') ||
        raw.includes('info.grudge-studio.com') ||
        raw.includes('objectstore.grudge-studio.com'))
    ) {
      return assetUrl(raw);
    }
    // game-assets/icons on assets CDN (weapon art authority)
    if (
      raw.includes('assets.grudge-studio.com') &&
      (raw.toLowerCase().includes('/icons/') ||
        raw.toLowerCase().includes('/game-assets/icons/'))
    ) {
      return assetUrl(raw);
    }
    if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(raw) && raw.toLowerCase().includes('/icons/')) {
      return assetUrl(raw);
    }
    if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(raw) && !raw.toLowerCase().includes('/icons/')) {
      // Allow assets CDN game-assets paths used by T8 master-weapons
      if (raw.includes('assets.grudge-studio.com/game-assets/')) {
        return assetUrl(raw);
      }
      return getPackIconForCategory(ctx);
    }
  }

  let path = raw.startsWith('/') ? raw : `/${raw}`;
  path = flattenWeaponIconPath(path);

  if (isBannedAsUiIcon(path) || !path.toLowerCase().includes('/icons/')) {
    return getPackIconForCategory(ctx);
  }

  if (path.includes('/icons/weapons/')) {
    const file = path.split('/').pop() || '';
    const kebab = toKebab(file.replace(/\.(png|jpe?g|webp)$/i, ''));
    return assetUrl(`/icons/weapons/${kebab}.png`);
  }

  if (path.startsWith('http')) return path;
  return assetUrl(path);
}

/** img onError handler — swap to pack fallback */
export function iconOnError(
  e: { currentTarget: HTMLImageElement },
  ctx: IconResolveContext = {},
): void {
  const img = e.currentTarget;
  const fallback = getPackIconForCategory(ctx);
  if (img.src !== fallback) {
    img.src = fallback;
    img.onerror = null;
  }
}