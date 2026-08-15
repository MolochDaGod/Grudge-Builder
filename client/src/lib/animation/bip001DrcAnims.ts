/**
 * Bip001 DRC animation SSOT for Warlords island3d production heroes.
 *
 * Mesh: grudge6 race GLB (RACE_GRUDGE6).
 * Clips: Open /anims/baked (rotation-only Bip001) — NOT Mixamo GLB remaps.
 *
 * Aligned with open.grudge-studio.com grudge/anims.ts + Multiverse drcAnimSsot.
 */

import type { WeaponType } from "@/lib/modelManifest";
import type { PlaybackSlot } from "@shared/animation/types";

export const BIP001_ANIM_HOSTS = [
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
}

/** 1H sword DRC primary — samurai sword stance (not thin sword_shield run). */
const SWORD_1H: Bip001PackSet = {
  idle: "greatsword_samurai/gs_samurai_idle_sword",
  walk: "greatsword_samurai/gs_samurai_walk_sword",
  run: "greatsword_samurai/gs_samurai_run_sword",
  attack: "greatsword_samurai/gs_samurai_combo_a",
  attack2: "greatsword_samurai/gs_samurai_combo_b",
  attack3: "dual_wield/sword_dash_attack",
  dodge: "locomotion/dodge_fwd",
  special: "ghost_rider/quakesmash",
  jump: "greatsword_samurai/gs_samurai_jump_sword",
  death: "dual_wield/death",
};

const TWO_HAND: Bip001PackSet = {
  idle: "greatsword_samurai/gs_samurai_idle_sword",
  walk: "greatsword_samurai/gs_samurai_walk_sword",
  run: "greatsword_samurai/gs_samurai_run_sword",
  attack: "greatsword_samurai/gs_samurai_combo_a",
  attack2: "greatsword_samurai/gs_samurai_combo_b",
  attack3: "greatsword_samurai/gs_samurai_dash_opener",
  dodge: "locomotion/dodge_fwd",
  special: "greatsword_samurai/gs_samurai_teleport_strike",
  jump: "greatsword_samurai/gs_samurai_jump_sword",
  death: "dual_wield/death",
};

const LONGBOW: Bip001PackSet = {
  idle: "longbow/standing idle 01",
  walk: "longbow/standing walk forward",
  run: "longbow/standing run forward",
  attack: "longbow/standing aim recoil",
  attack2: "longbow/standing aim recoil",
  dodge: "locomotion/dodge_back",
  special: "dual_wield/combo",
  death: "dual_wield/death",
};

const MAGIC: Bip001PackSet = {
  idle: "magic/standing idle",
  walk: "magic/Standing Walk Forward",
  run: "magic/Standing Run Forward",
  attack: "unarmed/punching",
  attack2: "dual_wield/attack2",
  special: "dual_wield/dash",
  death: "dual_wield/death",
};

/** 1H axe — same 1H loco as sword; skill1 = Meshy Scourge battle cry (clip only). */
const AXE: Bip001PackSet = {
  ...SWORD_1H,
  special: "meshy_scourge/skill1",
};

const UNARMED: Bip001PackSet = {
  idle: "unarmed/fight_idle",
  walk: "magic/Standing Walk Forward",
  run: "locomotion/run_forward",
  attack: "unarmed/punching",
  attack2: "dual_wield/attack2",
  dodge: "locomotion/dodge_fwd",
  death: "dual_wield/death",
};

const GUN: Bip001PackSet = {
  idle: "rifle/rifle aiming idle",
  walk: "rifle/walking",
  run: "rifle/rifle run",
  attack: "rifle/firing rifle",
  attack2: "rifle/reloading",
  dodge: "locomotion/dodge_back",
  death: "dual_wield/death",
};

/** Map Warlords WeaponType → Bip001 pack. */
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
      // sword, dagger, hammer1h, mace, sword-shield
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

/** Absolute JSON URLs for a baked rel (Open first). */
export function bip001ClipUrls(rel: Bip001Rel): string[] {
  const enc = encodeRel(rel);
  return BIP001_ANIM_HOSTS.map((h) => `${h}/${enc}.json`);
}

/**
 * Build AnimationManager load map using Open Bip001 JSON (not Mixamo GLB).
 * Values are absolute .json URLs — {@link loadBakedAnimationClip} / multi-host loader.
 */
export function buildBip001AnimLoadMap(
  weaponType: WeaponType,
): Partial<Record<PlaybackSlot, string>> {
  const pack = bip001PackForWeapon(weaponType);
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

  if (paths.run && !paths.run_stop) paths.run_stop = paths.run;
  if (paths.idle && !paths.idle_alt) paths.idle_alt = paths.idle;
  if (paths.attack && !paths.harvest) paths.harvest = paths.attack;

  return paths;
}

/** True if path is Open/fleet baked JSON (not Mixamo GLB). */
export function isBip001BakedPath(path: string): boolean {
  return (
    /\.json($|\?)/i.test(path) ||
    /anims\/baked/i.test(path) ||
    /\/greatsword_samurai\//i.test(path)
  );
}
