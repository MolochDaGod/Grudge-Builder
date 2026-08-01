/**
 * Canonical item icon resolver for bag, paperdoll, loot sprites, and craft rewards.
 * Absolute CDN URLs so Puter / main-panel / Three.js TextureLoader all work.
 */

export const ITEM_ICON_CDN = "https://assets.grudge-studio.com";

const PACK: Record<string, string> = {
  sword: "/icons/pack/weapons/Sword_01.png",
  axe: "/icons/pack/weapons/Axe_01.png",
  dagger: "/icons/pack/weapons/Dagger_01.png",
  hammer: "/icons/pack/weapons/Hammer_01.png",
  mace: "/icons/pack/weapons/Hammer_10.png",
  spear: "/icons/pack/weapons/Spear_01.png",
  bow: "/icons/pack/weapons/Bow_01.png",
  crossbow: "/icons/pack/weapons/Crossbow_01.png",
  staff: "/icons/pack/weapons/Staff_01.png",
  shield: "/icons/pack/weapons/Shield_01.png",
  // Armor pack: only Chest atlas is guaranteed live on CDN
  armor: "/icons/pack/armor/Chest_01.png",
  helm: "/icons/pack/armor/Chest_01.png",
  boots: "/icons/pack/armor/Chest_01.png",
  gloves: "/icons/pack/armor/Chest_01.png",
  food: "/icons/pack/misc/Burns.png",
  potion: "/icons/pack/misc/Effect.png",
  ore: "/icons/pack/weapons/Hammer_01.png",
  wood: "/icons/pack/weapons/Axe_01.png",
  hide: "/icons/pack/weapons/Dagger_01.png",
  gem: "/icons/pack/misc/Electro.png",
  bag: "/icons/pack/misc/Effect.png",
  default: "/icons/pack/misc/Effect.png",
};

function abs(path: string): string {
  if (!path) return ITEM_ICON_CDN + PACK.default;
  if (/^(data:|blob:|https?:)/i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return ITEM_ICON_CDN + p;
}

/** Infer pack category from catalog id / name. */
export function iconCategoryFromItemId(itemId: string, name?: string): string {
  const s = `${itemId} ${name || ""}`.toLowerCase();
  if (/shield/.test(s)) return "shield";
  if (/bow|crossbow|xbow/.test(s)) return "bow";
  if (/staff|wand|scepter/.test(s)) return "staff";
  if (/axe|hatchet/.test(s)) return "axe";
  if (/dagger|knife/.test(s)) return "dagger";
  if (/hammer|mace|pick/.test(s)) return "hammer";
  if (/spear|lance/.test(s)) return "spear";
  if (/sword|blade|claymore/.test(s)) return "sword";
  if (/helm|hood|hat|head/.test(s)) return "helm";
  if (/boot|feet|shoe/.test(s)) return "boots";
  if (/glove|gauntlet|hand/.test(s)) return "gloves";
  if (/chest|vest|robe|armor|plate|leather/.test(s)) return "armor";
  if (/potion|tonic|elixir|mana|health/.test(s)) return "potion";
  if (/meat|stew|bread|food|herb|salad/.test(s)) return "food";
  if (/ore|ingot|metal|scrap/.test(s)) return "ore";
  if (/wood|plank|log|lumber/.test(s)) return "wood";
  if (/hide|leather|skin|pelt/.test(s)) return "hide";
  if (/gem|crystal|dust|essence/.test(s)) return "gem";
  if (/bag|pack|quiver|back/.test(s)) return "bag";
  return "default";
}

/**
 * Resolve icon URL for any catalog item / loot drop / recipe result.
 * Priority: explicit icon → baked weapon path → pack by category.
 */
export function resolveItemIconUrl(opts: {
  itemId?: string | null;
  name?: string | null;
  icon?: string | null;
  iconUrl?: string | null;
  category?: string | null;
  type?: string | null;
}): string {
  const explicit = opts.iconUrl || opts.icon;
  if (explicit && String(explicit).trim()) {
    const raw = String(explicit).trim();
    // Emoji / non-path → pack fallback
    if (!/[./]/.test(raw) && !/^https?:/i.test(raw) && raw.length < 8) {
      /* emoji */
    } else {
      return abs(
        raw
          .replace(/https?:\/\/molochdagod\.github\.io\/ObjectStore/gi, ITEM_ICON_CDN)
          .replace(/https?:\/\/info\.grudge-studio\.com(\/api\/v1)?/gi, ITEM_ICON_CDN)
          .replace(/^https?:\/\/assets\.grudge-studio\.com/i, "")
          .replace(/^\/api\/assets/i, ""),
      );
    }
  }

  const id = opts.itemId || opts.name || "";
  // Baked mesh-true icons when prefab id known
  if (id && /^[a-z0-9_]+_style_/i.test(id)) {
    return abs(`/icons/weapons/generated/${id}.png`);
  }
  if (id && /GRUDA_WPN_/i.test(id)) {
    const cat = iconCategoryFromItemId(id, opts.name || undefined);
    return abs(PACK[cat] || PACK.default);
  }

  const cat =
    (opts.category && PACK[String(opts.category).toLowerCase()] && String(opts.category).toLowerCase()) ||
    (opts.type && iconCategoryFromItemId(String(opts.type))) ||
    iconCategoryFromItemId(id, opts.name || undefined);

  return abs(PACK[cat] || PACK.default);
}

/** Default fallback for broken <img> / TextureLoader. */
export function itemIconFallbackUrl(): string {
  return abs(PACK.default);
}

/** Enrich a loot row with iconUrl for UI / ground sprites. */
export function withItemIcon<T extends { itemId?: string; name?: string; icon?: string; iconUrl?: string }>(
  row: T,
): T & { iconUrl: string } {
  return {
    ...row,
    iconUrl: resolveItemIconUrl({
      itemId: row.itemId,
      name: row.name,
      icon: row.icon,
      iconUrl: row.iconUrl,
    }),
  };
}
