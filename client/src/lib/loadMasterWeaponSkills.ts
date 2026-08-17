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
import {
  WEAPON_TYPE_DEFINITIONS,
  getWeaponTypeDefinition,
  normalizeWeaponTypeId,
} from "@shared/definitions/weaponSkillsNew";
import { WEAPON_TYPES } from "@shared/definitions/weaponDatabase";
import { PRODUCTION_WEAPON_TYPES } from "@shared/definitions/weaponPrefabCatalog";
import { assetUrl } from "@/lib/assetConfig";
import { getPackIconForCategory } from "@/lib/iconResolver";
import { getWeaponSkillDisplay } from "@shared/definitions/weaponSkillDisplay.generated";

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
  const catalog = ctx.skillId ? getWeaponSkillDisplay(ctx.skillId) : null;
  if (catalog?.icon) {
    return catalog.icon.startsWith("http") ? catalog.icon : catalog.icon;
  }

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
  const starter = (t.starterSlots || []).map((slot) => mapSlot(slot, t.id));
  const slots = (t.slots || []).map((slot) => mapSlot(slot, t.id));
  const all = [...starter, ...slots];
  return {
    id: t.id,
    name: t.name,
    icon: resolveIcon(t.icon, t.id),
    slots: all,
    hotbarSlots: Math.min(5, (t.slots || []).length || all.length || 4),
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
  if (!typeId) return null;
  const direct = getCachedWeaponTypeDef(typeId);
  if (direct) return direct;
  const aliased = normalizeWeaponTypeId(typeId);
  if (aliased !== typeId.toUpperCase()) {
    return getCachedWeaponTypeDef(aliased);
  }
  return null;
}

function coerceWeaponDef(def: WeaponTypeDefinition | null | undefined): WeaponTypeDefinition | null {
  if (!def) return null;
  if (Array.isArray(def.slots)) return def;
  const classShaped = def as WeaponTypeDefinition & {
    classId?: string;
    className?: string;
    classIcon?: string;
    skills?: WeaponSkillOption[];
  };
  if (Array.isArray(classShaped.skills) && classShaped.skills.length > 0) {
    return {
      id: classShaped.id || classShaped.classId || "CLASS",
      name: classShaped.name || classShaped.className || "Class skills",
      icon: classShaped.icon || classShaped.classIcon || "⚔️",
      slots: [
        {
          type: "ability",
          unlockTier: 1,
          label: "CLASS",
          skills: classShaped.skills,
        },
      ],
      hotbarSlots: 5,
    };
  }
  return null;
}

export function resolveSkillTreeWeaponDef(typeId: string): WeaponTypeDefinition | null {
  return coerceWeaponDef(resolveWeaponTypeDef(typeId) ?? getWeaponTypeDefinition(typeId));
}

function countSkills(def: WeaponTypeDefinition | null | undefined): number {
  if (!def) return 0;
  return def.slots.reduce((n, slot) => n + (slot.skills?.length ?? 0), 0);
}

/**
 * All weapon / skill-sheet types for /skill-tree.
 * Union of master-weaponSkills + weaponSkillsNew + weaponDatabase + production prefabs.
 * Dedupes aliases (LANCE→SPEAR) so one tab owns the tree. Master ids always win.
 */
export function listAllSkillTreeWeaponTypeIds(): string[] {
  const display: string[] = [];
  const covered = new Set<string>();

  const add = (raw: string, force = false) => {
    const id = String(raw || "").toUpperCase();
    if (!id || display.includes(id) || covered.has(id)) return;
    const canonical = normalizeWeaponTypeId(id);
    if (!force && id !== canonical && (display.includes(canonical) || covered.has(canonical))) {
      return;
    }
    display.push(id);
    covered.add(canonical);
    covered.add(id);
  };

  if (cache) {
    for (const t of cache.catalog.weaponTypes) add(t.id, true);
  }
  for (const id of PRODUCTION_WEAPON_TYPES) add(id);
  for (const id of Object.keys(WEAPON_TYPE_DEFINITIONS)) {
    const def = WEAPON_TYPE_DEFINITIONS[id] as WeaponTypeDefinition & { slots?: SkillSlot[] };
    if (!Array.isArray(def?.slots) || def.slots.length === 0) continue;
    add(id);
  }
  for (const id of Object.keys(WEAPON_TYPES)) add(id);
  return display;
}

export function getSkillTreeTypeMeta(typeId: string): {
  id: string;
  name: string;
  icon: string;
  skillCount: number;
  weaponCount: number;
} {
  const id = String(typeId || "").toUpperCase();
  const def = resolveSkillTreeWeaponDef(id);
  const bag = WEAPON_TYPES[id];
  return {
    id,
    name: def?.name || bag?.name || id.replace(/_/g, " "),
    icon: def?.icon || bag?.icon || "⚔️",
    skillCount: countSkills(def),
    weaponCount: listNamedWeaponsForType(id).length,
  };
}

export function listNamedWeaponsForType(typeId: string) {
  const id = String(typeId || "").toUpperCase();
  const canon = normalizeWeaponTypeId(id);
  const seen = new Set<string>();
  const out: (typeof WEAPON_TYPES)[string]["weapons"] = [];
  for (const wt of Object.values(WEAPON_TYPES)) {
    const wtCanon = normalizeWeaponTypeId(wt.id);
    const match = wt.id === id || wt.id === canon || wtCanon === id || wtCanon === canon;
    if (!match) continue;
    for (const w of wt.weapons) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      out.push(w);
    }
  }
  return out;
}
