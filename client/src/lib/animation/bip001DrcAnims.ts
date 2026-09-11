/**
 * Bip001 baked animation SSOT for Warlords island3d heroes.
 *
 * Author disk: D:\Games\Models\_anim_packs\{pack}\
 * CDN: assets.grudge-studio.com/anims/baked/{pack}/…
 * Runtime: one mixer · AnimationDirector / ExplorerAnimDriver · PlaybackSlot map
 *
 * Prefer verified CDN names from _anim_packs (farming, traversal, greatsword,
 * sword_shield, locomotion). Do not invent parallel packs.
 */

import type { WeaponType } from "@/lib/modelManifest";
import type { PlaybackSlot } from "@shared/animation/types";

/** Prefer assets CDN (has farming/greatsword/traversal); Open as fallback. */
export const BIP001_ANIM_HOSTS = [
  "https://assets.grudge-studio.com/anims/baked",
  "https://open.grudge-studio.com/anims/baked",
  "https://gameopen.vercel.app/anims/baked",
] as const;

/** Baked relative path (no .json). */
export type Bip001Rel = string;

export interface Bip001PackSet {
  idle: Bip001Rel;
  walk: Bip001Rel;
  run: Bip001Rel;
  attack: Bip001Rel;
  attack2?: Bip001Rel;
  attack3?: Bip001Rel;
  dodge?: Bip001Rel;
  special?: Bip001Rel;
  death?: Bip001Rel;
  jump?: Bip001Rel;
  /** Survival / tool / traversal (from _anim_packs) */
  harvest?: Bip001Rel;
  block?: Bip001Rel;
  kick?: Bip001Rel;
  slash?: Bip001Rel;
  draw?: Bip001Rel;
  crouch?: Bip001Rel;
  swim?: Bip001Rel;
  swimIdle?: Bip001Rel;
  climb?: Bip001Rel;
  falling?: Bip001Rel;
  hardLanding?: Bip001Rel;
  strafeL?: Bip001Rel;
  strafeR?: Bip001Rel;
}

/** Shared loco from locomotion pack (CDN-verified). */
const LOCO = {
  dodge: "locomotion/dodging",
  jump: "locomotion/jump",
  swim: "locomotion/swimming",
  swimIdle: "locomotion/treading-water",
  climb: "traversal/climbing",
  strafeL: "locomotion/left strafe walking",
  strafeR: "locomotion/right strafe walking",
  death: "locomotion/death",
} as const;

/** Farming / gather / carry — D:\Games\Models\_anim_packs\farming */
const FARM = {
  idle: "farming/idle",
  walk: "farming/walk",
  harvest: "farming/watering",
  harvestAlt: "farming/attack",
  jump: "farming/jump",
  swim: "farming/swim",
  climb: "farming/climb",
} as const;

/** Traversal — D:\Games\Models\_anim_packs\traversal */
const TRAV = {
  climb: "traversal/climbing",
  swim: "traversal/swimming",
  swimIdle: "traversal/treading-water",
} as const;

/**
 * 1H sword/shield — disk sword_shield on CDN (idle/walk/run/slash/attack).
 * Samurai paths remain available as attack2/special when present.
 */
const SWORD_1H: Bip001PackSet = {
  idle: "sword_shield/idle",
  walk: "sword_shield/walk",
  run: "sword_shield/run",
  attack: "sword_shield/slash",
  attack2: "sword_shield/attack",
  attack3: "greatsword_samurai/gs_samurai_combo_a",
  dodge: LOCO.dodge,
  jump: LOCO.jump,
  slash: "sword_shield/slash",
  harvest: FARM.harvest,
  swim: TRAV.swim,
  swimIdle: TRAV.swimIdle,
  climb: TRAV.climb,
  strafeL: LOCO.strafeL,
  strafeR: LOCO.strafeR,
  death: LOCO.death,
};

/** 2H — disk greatsword pack (CDN: idle/walk/run/attack + great sword slash). */
const TWO_HAND: Bip001PackSet = {
  idle: "greatsword/great sword idle",
  walk: "greatsword/walk",
  run: "greatsword/great sword run",
  attack: "greatsword/great sword slash",
  attack2: "greatsword/attack",
  attack3: "greatsword_samurai/gs_samurai_dash_opener",
  dodge: LOCO.dodge,
  special: "greatsword_samurai/gs_samurai_teleport_strike",
  jump: "greatsword/jump",
  slash: "greatsword/great sword slash",
  harvest: FARM.harvest,
  swim: TRAV.swim,
  swimIdle: TRAV.swimIdle,
  climb: TRAV.climb,
  strafeL: LOCO.strafeL,
  strafeR: LOCO.strafeR,
  death: LOCO.death,
};

const LONGBOW: Bip001PackSet = {
  idle: "longbow/standing idle 01",
  walk: "longbow/standing walk forward",
  run: "longbow/standing run forward",
  attack: "longbow/standing aim recoil",
  attack2: "longbow/standing aim recoil",
  dodge: "locomotion/dodging",
  jump: LOCO.jump,
  harvest: FARM.harvest,
  swim: TRAV.swim,
  swimIdle: TRAV.swimIdle,
  climb: TRAV.climb,
  death: LOCO.death,
};

/** Magic — magic_spell + magic_loco when on CDN; fallback locomotion. */
const MAGIC: Bip001PackSet = {
  idle: "magic_spell/standing-idle",
  walk: "locomotion/walking",
  run: "locomotion/running",
  attack: "magic_spell/standing-idle",
  attack2: "unarmed/punching",
  dodge: LOCO.dodge,
  jump: LOCO.jump,
  harvest: FARM.harvest,
  swim: TRAV.swim,
  swimIdle: TRAV.swimIdle,
  climb: TRAV.climb,
  death: LOCO.death,
};

const AXE: Bip001PackSet = {
  ...SWORD_1H,
  harvest: FARM.harvestAlt,
  special: "meshy_scourge/skill1",
};

const UNARMED: Bip001PackSet = {
  idle: "unarmed/idle",
  walk: "unarmed/walk",
  run: "unarmed/run",
  attack: "unarmed/attack",
  attack2: "unarmed/punching",
  dodge: LOCO.dodge,
  jump: "unarmed/jump",
  harvest: FARM.harvest,
  swim: "unarmed/swim",
  climb: "unarmed/climb",
  death: LOCO.death,
};

const GUN: Bip001PackSet = {
  idle: "rifle/idle",
  walk: "rifle/walk forward",
  run: "rifle/run forward",
  attack: "rifle/firing",
  attack2: "rifle/reloading",
  dodge: LOCO.dodge,
  jump: LOCO.jump,
  harvest: FARM.harvest,
  swim: TRAV.swim,
  climb: TRAV.climb,
  death: LOCO.death,
};

/** Tool / gather stance — farming pack as primary loco when tooling. */
export const FARMING_PACK: Bip001PackSet = {
  idle: FARM.idle,
  walk: FARM.walk,
  run: FARM.walk,
  attack: FARM.harvestAlt,
  harvest: FARM.harvest,
  jump: FARM.jump,
  swim: FARM.swim,
  climb: FARM.climb,
  dodge: LOCO.dodge,
  death: LOCO.death,
};

/** Map Warlords WeaponType → Bip001 pack from _anim_packs CDN. */
export function bip001PackForWeapon(weaponType: WeaponType): Bip001PackSet {
  switch (weaponType) {
    case "greatsword":
    case "greataxe":
    case "hammer2h":
    case "spear":
      return TWO_HAND;
    case "bow":
    case "crossbow":
    case "longbow":
      return LONGBOW;
    case "gun":
      return GUN;
    case "fire-staff":
    case "frost-staff":
    case "nature-staff":
    case "holy-staff":
    case "arcane-staff":
    case "lightning-staff":
    case "fire-tome":
    case "frost-tome":
    case "nature-tome":
    case "holy-tome":
    case "arcane-tome":
    case "lightning-tome":
    case "magic":
      return MAGIC;
    case "unarmed":
      return UNARMED;
    case "axe":
      return AXE;
    default:
      return SWORD_1H;
  }
}

function encodeRel(rel: string): string {
  return rel
    .replace(/^\//, "")
    .replace(/\.json$/i, "")
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

/** Absolute JSON URLs for a baked rel (assets CDN first). */
export function bip001ClipUrls(rel: Bip001Rel): string[] {
  const enc = encodeRel(rel);
  return BIP001_ANIM_HOSTS.map((h) => `${h}/${enc}.json`);
}

/**
 * Build AnimationManager / PlaybackSlot load map from _anim_packs CDN.
 */
export function buildBip001AnimLoadMap(
  weaponType: WeaponType,
  opts?: { farmingStance?: boolean },
): Partial<Record<PlaybackSlot, string>> {
  const pack = opts?.farmingStance
    ? FARMING_PACK
    : bip001PackForWeapon(weaponType);
  const urls = (rel: Bip001Rel | undefined) =>
    rel ? bip001ClipUrls(rel)[0]! : undefined;

  const paths: Partial<Record<PlaybackSlot, string>> = {
    idle: urls(pack.idle),
    walk: urls(pack.walk),
    run: urls(pack.run),
    attack: urls(pack.attack),
  };
  if (pack.attack2) paths.attack2 = urls(pack.attack2);
  if (pack.attack3) paths.attack3 = urls(pack.attack3);
  if (pack.dodge) paths.dodge = urls(pack.dodge);
  if (pack.special) {
    paths.special =
      pack.special === "meshy_scourge/skill1"
        ? "/anims/baked/meshy_scourge/skill1.json"
        : urls(pack.special);
  }
  if (pack.death) paths.death = urls(pack.death);
  if (pack.jump) paths.jump = urls(pack.jump);
  if (pack.harvest) paths.harvest = urls(pack.harvest);
  if (pack.block) paths.block = urls(pack.block);
  if (pack.kick) paths.kick = urls(pack.kick);
  if (pack.slash) paths.slash1 = urls(pack.slash);
  if (pack.draw) paths.draw = urls(pack.draw);
  if (pack.crouch) paths.crouch = urls(pack.crouch);
  if (pack.swim) paths.swim_surface = urls(pack.swim);
  if (pack.swimIdle) paths.swim_underwater = urls(pack.swimIdle);
  if (pack.climb) {
    paths.climb_up = urls(pack.climb);
    paths.climb_idle = urls(pack.climb);
  }
  if (pack.falling) paths.falling = urls(pack.falling);
  if (pack.hardLanding) paths.hard_landing = urls(pack.hardLanding);

  if (paths.run && !paths.run_stop) paths.run_stop = paths.run;
  if (paths.idle && !paths.idle_alt) paths.idle_alt = paths.idle;
  if (!paths.harvest && paths.attack) paths.harvest = paths.attack;
  if (!paths.cast && paths.attack) paths.cast = paths.attack;

  return paths;
}

/** Survival overlay map (farming + traversal) regardless of weapon. */
export function buildSurvivalAnimLoadMap(): Partial<Record<PlaybackSlot, string>> {
  const u = (rel: Bip001Rel) => bip001ClipUrls(rel)[0]!;
  return {
    harvest: u(FARM.harvest),
    swim_surface: u(TRAV.swim),
    swim_underwater: u(TRAV.swimIdle),
    climb_up: u(TRAV.climb),
    climb_idle: u(TRAV.climb),
    jump: u(LOCO.jump),
    dodge: u(LOCO.dodge),
  };
}

/** True if path is fleet baked JSON (not Mixamo GLB). */
export function isBip001BakedPath(path: string): boolean {
  return (
    /\.json($|\?)/i.test(path) ||
    /anims\/baked/i.test(path) ||
    /\/greatsword_samurai\//i.test(path) ||
    /\/(farming|traversal|greatsword|sword_shield|locomotion)\//i.test(path)
  );
}
