/**
 * Load production weapon skill trees from ObjectStore master catalog.
 *
 * SSOT (weapon skills ONLY):
 *   https://info.grudge-studio.com/WEAPON_SKILLS.html
 *   → js/weapon-skill-tree.js
 *   → https://objectstore.grudge-studio.com/api/v1/master-weaponSkills.json
 *
 * Class skills are separate (GrudgeStudioNPM skill-tree.html / classSkillTrees.ts).
 * Do not invent skill lists in the client.
 *
 * SKILL ICONS (HARD RULE):
 *   Only single-frame UI icons under assets.grudge-studio.com/icons/*
 *   NEVER use D:\Games\Models\*, UUID VFX strips, multi-frame sprite sheets,
 *   /models/, or animation frames as skill icons. Thousands of real icons live
 *   on the CDN under /icons/pack/* and /icons/weapons/* — use those.
 */
import type {
  WeaponTypeDefinition,
  WeaponSkillOption,
  SkillSlot,
  SlotType,
} from "@shared/definitions/weaponSkillsNew";
import { assetUrl } from "@/lib/assetConfig";
import { getPackIconForCategory } from "@/lib/iconResolver";

const API_BASES = [
  "https://objectstore.grudge-studio.com/api/v1",
  "https://info.grudge-studio.com/api/v1",
] as const;

const ASSET_CDN = "https://assets.grudge-studio.com";

export const MASTER_WEAPON_SKILLS_VERSION_HINT = "3.1.0";

export interface MasterWeaponSkillsCatalog {
  version: string;
  generated?: string;
  totalWeaponTypes: number;
  totalSkills: number;
  weaponTypes: MasterWeaponType[];
}

export interface MasterWeaponType {
  id: string;
  name: string;
  icon?: string;
  classes?: string[];
  classification?: string;
  totalSkills?: number;
  slots: MasterSkillSlot[];
  starterSlots?: MasterSkillSlot[];
}

export interface MasterSkillSlot {
  type: string;
  label?: string;
  unlockTier?: number;
  skills?: MasterSkill[];
}

export interface MasterSkill {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tier?: number;
  damage?: number;
  cooldown?: number;
  effects?: string[];
  sourceWeaponType?: string;
}

let cache: {
  catalog: MasterWeaponSkillsCatalog;
  byId: Map<string, WeaponTypeDefinition>;
  playableIds: string[];
} | null = null;

let inflight: Promise<typeof cache> | null = null;

/** UUID-named files under Models are VFX frames, not UI icons. */
const UUID_FILE_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * True only for production UI icon paths on the assets CDN.
 * Rejects models/, Games/Models, VFX strips, sprite sheets, bare UUID dumps.
 */
export function isProductionSkillIconPath(path: string | undefined | null): boolean {
  if (!path || typeof path !== "string") return false;
  const raw = path.trim();
  if (!raw || raw.length <= 4) return false; // emoji ok as non-path, not a "CDN icon"

  const lower = raw.toLowerCase().replace(/\\/g, "/");

  // Hard bans — never skill icons
  if (
    lower.includes("/models/") ||
    lower.includes("games/models") ||
    lower.includes("d:/games") ||
    lower.includes("d:\\games") ||
    lower.includes("/vfx/") ||
    lower.includes("sprite") && lower.includes("sheet") ||
    lower.includes("animation") && lower.includes("frame") ||
    UUID_FILE_RE.test(lower)
  ) {
    return false;
  }

  // Absolute CDN / same-origin icons
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const host = u.hostname.toLowerCase();
      const p = u.pathname.toLowerCase();
      if (!p.includes("/icons/")) return false;
      // Only fleet asset hosts
      if (
        host === "assets.grudge-studio.com" ||
        host.endsWith(".grudge-studio.com") ||
        host === "localhost" ||
        host === "127.0.0.1"
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Relative path must be under /icons/
  const rel = lower.startsWith("/") ? lower : `/${lower}`;
  return rel.startsWith("/icons/");
}

/**
 * Resolve catalog icon → CDN URL under /icons/*, else pack fallback by weapon type.
 * Never returns a Models/VFX/UUID path.
 */
export function resolveSkillIcon(
  path: string | undefined,
  ctx: { weaponType?: string; skillName?: string; skillId?: string } = {},
): string {
  const fallback = getPackIconForCategory({
    weaponType: ctx.weaponType,
    name: ctx.skillName || ctx.skillId,
    category: ctx.weaponType,
  });

  if (!path) return fallback;

  // Short emoji / glyph from catalog — keep as display text (UI may render as text)
  if (path.length <= 4 && !path.includes("/") && !path.includes(".")) {
    return path;
  }

  if (!isProductionSkillIconPath(path)) {
    return fallback;
  }

  // Already absolute allowed host
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Normalize relative → CDN icons URL
  const rel = path.startsWith("/") ? path : `/${path}`;
  if (rel.toLowerCase().startsWith("/icons/")) {
    return `${ASSET_CDN}${rel}`;
  }

  try {
    const viaAsset = assetUrl(rel);
    // assetUrl may return same-origin /api/assets/icons/... which is fine
    if (isProductionSkillIconPath(viaAsset) || viaAsset.includes("/icons/")) {
      return viaAsset;
    }
  } catch {
    /* fall through */
  }

  return fallback;
}

/** @deprecated use resolveSkillIcon — kept name for call-site clarity */
function resolveIcon(
  path: string | undefined,
  weaponType?: string,
  skill?: Pick<MasterSkill, "name" | "id">,
): string {
  return resolveSkillIcon(path, {
    weaponType,
    skillName: skill?.name,
    skillId: skill?.id,
  });
}

function mapSkill(s: MasterSkill, weaponType?: string): WeaponSkillOption {
  return {
    id: s.id,
    name: s.name,
    description: s.description || "",
    icon: resolveIcon(s.icon, weaponType || s.sourceWeaponType, s),
    tier: s.tier ?? 1,
    damage: s.damage ?? 0,
    cooldown: s.cooldown ?? 0,
    effects: Array.isArray(s.effects) ? s.effects.map(String) : [],
    sourceWeaponType: s.sourceWeaponType,
  };
}

function mapSlot(raw: MasterSkillSlot, weaponType?: string): SkillSlot {
  const type = (raw.type || "primary") as SlotType;
  return {
    type,
    unlockTier: raw.unlockTier ?? 1,
    label: raw.label || String(raw.type || "SLOT").toUpperCase(),
    skills: (raw.skills || []).map((sk) => mapSkill(sk, weaponType)),
  };
}

/** Convert one master type → WeaponTypeDefinition for WeaponSkillTreeNew */
export function masterTypeToDefinition(t: MasterWeaponType): WeaponTypeDefinition {
  return {
    id: t.id,
    name: t.name,
    icon: resolveIcon(t.icon, t.id),
    slots: (t.slots || []).map((slot) => mapSlot(slot, t.id)),
    hotbarSlots: Math.min(5, (t.slots || []).length || 4),
  };
}

export async function loadMasterWeaponSkillsCatalog(
  force = false,
): Promise<NonNullable<typeof cache>> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight as Promise<NonNullable<typeof cache>>;

  inflight = (async () => {
    let lastErr: unknown;
    for (const base of API_BASES) {
      try {
        const url = `${base.replace(/\/$/, "")}/master-weaponSkills.json`;
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        const catalog = (await res.json()) as MasterWeaponSkillsCatalog;
        if (!Array.isArray(catalog.weaponTypes) || catalog.weaponTypes.length === 0) {
          throw new Error("empty weaponTypes");
        }
        const byId = new Map<string, WeaponTypeDefinition>();
        for (const t of catalog.weaponTypes) {
          if (!t?.id) continue;
          byId.set(t.id.toUpperCase(), masterTypeToDefinition(t));
        }
        // Off-hand modifiers still loadable but marked separately by consumers
        const playableIds = catalog.weaponTypes
          .map((t) => t.id)
          .filter((id) => id && !["SHIELD", "TOME"].includes(id.toUpperCase()));

        cache = { catalog, byId, playableIds };
        console.info(
          `[weaponSkills] loaded master v${catalog.version} types=${byId.size} skills=${catalog.totalSkills} from ${base}`,
        );
        return cache;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function getCachedWeaponTypeDef(typeId: string): WeaponTypeDefinition | null {
  if (!cache) return null;
  return cache.byId.get(typeId.toUpperCase()) ?? null;
}

export function listCachedPlayableWeaponTypeIds(): string[] {
  return cache?.playableIds ?? [];
}

export function getMasterCatalogVersion(): string | null {
  return cache?.catalog.version ?? null;
}

/** Prefer master catalog; null if not loaded yet */
export function resolveWeaponTypeDef(typeId: string): WeaponTypeDefinition | null {
  return getCachedWeaponTypeDef(typeId);
}
