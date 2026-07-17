/**
 * Toon Soldier Mixamo/baked animation packs for Nexus Era.
 * Paths are relative to arena baked JSON CDN (Bip001 rotation-only).
 * Runtime: load → retargetClipToToon(roleMap).
 */

export const BAKED_ANIM_BASE =
  "https://grudge-arena.grudge-studio.com/api/assets/anims/baked";

/** Also available under arena public when self-hosted */
export const BAKED_ANIM_LOCAL = "/anims/baked";

export type ToonWeaponMode =
  | "pistol"
  | "rifle"
  | "shooter"
  | "longbow"
  | "adventure"
  | "native";

export type ToonAnimState =
  | "idle"
  | "walk"
  | "run"
  | "sprint"
  | "walkBack"
  | "runBack"
  | "strafeLeft"
  | "strafeRight"
  | "attack"
  | "fire"
  | "fire2"
  | "aimIdle"
  | "reload"
  | "draw"
  | "dodge"
  | "dodgeBack"
  | "dodgeLeft"
  | "dodgeRight"
  | "roll"
  | "jump"
  | "jumpLand"
  | "crouch"
  | "sneak"
  | "climb"
  | "climbDown"
  | "swim"
  | "swimIdle"
  | "swimToLedge"
  | "crawl"
  | "hit"
  | "death"
  | "taunt"
  | "fallLoop"
  | "block";

export type PackClipMap = Partial<Record<ToonAnimState, string>>;

function bakedUrl(rel: string, base = BAKED_ANIM_BASE): string {
  const p = rel.startsWith("/") ? rel.slice(1) : rel;
  return `${base}/${p}.json`;
}

/** Shared adventure locomotion + traversal (all modes). */
export const ADVENTURE_PACK: PackClipMap = {
  idle: "locomotion/idle",
  walk: "locomotion/walking",
  run: "locomotion/running",
  sprint: "uploads_2026_06/locomotion/running",
  walkBack: "locomotion/walking",
  runBack: "boxanimations/locomotion/Run Backwards",
  strafeLeft: "locomotion/left strafe walking",
  strafeRight: "locomotion/right strafe walking",
  dodge: "locomotion/dodging",
  dodgeBack: "boxanimations/locomotion/Dodging Back",
  roll: "boxanimations/locomotion/Quick Roll To Run (1)",
  jump: "locomotion/jump",
  jumpLand: "boxanimations/locomotion/Jumping Down (2)",
  crouch: "boxanimations/locomotion/Crouch Walk",
  sneak: "boxanimations/locomotion/Sneak Walk",
  climb: "boxanimations/traversal/Climbing To Top",
  climbDown: "boxanimations/traversal/Climbing Down Wall",
  // Mixamo swim family (baked via scripts/bake-swim-mixamo.mjs)
  swim: "locomotion/swimming",
  swimIdle: "locomotion/treading-water",
  swimToLedge: "locomotion/swimming-to-ledge",
  crawl: "locomotion/crawling",
  fallLoop: "boxanimations/locomotion/Fall B Loop",
  hit: "boxanimations/reactions/Hit Reaction",
  death: "boxanimations/reactions/Dying",
  taunt: "boxanimations/emotes/Standing Taunt Battlecry",
  block: "boxanimations/locomotion/Standing Block Idle",
};

/** Pistol pack — gun game / scout / medic */
export const PISTOL_PACK: PackClipMap = {
  ...ADVENTURE_PACK,
  idle: "pistol/pistol idle",
  walk: "pistol/pistol walk",
  run: "pistol/pistol run",
  attack: "pistol/gunplay",
  fire: "pistol/gunplay",
  fire2: "boxanimations/rifle/Gunplay (3)",
  aimIdle: "pistol/pistol aim",
  reload: "pistol/pistol idle",
};

/** Rifle pack — infantry / engineer / gunner / sniper */
export const RIFLE_PACK: PackClipMap = {
  ...ADVENTURE_PACK,
  idle: "rifle/idle",
  walk: "rifle/walk forward",
  run: "rifle/run forward",
  attack: "rifle/firing",
  fire: "rifle/firing",
  fire2: "rifle/firing 2",
  aimIdle: "rifle/idle",
  reload: "rifle/reloading",
};

/**
 * Simple shooter pack — minimal states for arcade gun games
 * (idle / walk / run / fire / reload / dodge / death).
 */
export const SHOOTER_PACK: PackClipMap = {
  idle: "pistol/pistol idle",
  walk: "pistol/pistol walk",
  run: "pistol/pistol run",
  sprint: "rifle/run forward",
  attack: "pistol/gunplay",
  fire: "pistol/gunplay",
  fire2: "rifle/firing",
  aimIdle: "pistol/pistol aim",
  reload: "rifle/reloading",
  dodge: "locomotion/dodging",
  dodgeBack: "boxanimations/locomotion/Dodging Back",
  roll: "boxanimations/locomotion/Quick Roll To Run (1)",
  jump: "locomotion/jump",
  hit: "boxanimations/reactions/Hit Reaction",
  death: "boxanimations/reactions/Dying",
  crouch: "boxanimations/locomotion/Crouch Walk",
};

/** Longbow — Nexus Era bows (draw, recoil, 4-way dodge, aim walks) */
export const LONGBOW_PACK: PackClipMap = {
  ...ADVENTURE_PACK,
  idle: "longbow/standing idle 01",
  walk: "longbow/standing walk forward",
  run: "longbow/standing run forward",
  walkBack: "longbow/standing aim walk back",
  strafeLeft: "longbow/standing aim walk left",
  strafeRight: "longbow/standing aim walk right",
  attack: "longbow/standing aim recoil",
  fire: "longbow/standing aim recoil",
  draw: "boxanimations/longbow/Standing Draw Arrow (1)",
  aimIdle: "boxanimations/longbow/Standing Aim Idle 02 Looking",
  dodge: "longbow/standing dodge forward",
  dodgeBack: "longbow/standing dodge backward",
  dodgeLeft: "longbow/standing dodge left",
  dodgeRight: "longbow/standing dodge right",
  roll: "longbow/standing dodge forward",
};

export const WEAPON_MODE_PACKS: Record<ToonWeaponMode, PackClipMap> = {
  pistol: PISTOL_PACK,
  rifle: RIFLE_PACK,
  shooter: SHOOTER_PACK,
  longbow: LONGBOW_PACK,
  adventure: ADVENTURE_PACK,
  native: {},
};

/** Default weapon mode per toon class */
export const CLASS_DEFAULT_MODE: Record<string, ToonWeaponMode> = {
  scout: "pistol",
  engineer: "rifle",
  gunner: "rifle",
  infantry: "shooter",
  medic: "pistol",
  sniper: "rifle",
};

/** Class can equip longbow for Nexus archer loadouts */
export const CLASS_BOW_OK = new Set([
  "scout",
  "infantry",
  "sniper",
  "medic",
  "engineer",
  "gunner",
]);

export function packClipUrls(
  pack: PackClipMap,
  base = BAKED_ANIM_BASE,
): Partial<Record<ToonAnimState, string>> {
  const out: Partial<Record<ToonAnimState, string>> = {};
  for (const [k, rel] of Object.entries(pack)) {
    if (rel) out[k as ToonAnimState] = bakedUrl(rel, base);
  }
  return out;
}

export function resolvePack(
  mode: ToonWeaponMode,
  classId?: string,
): PackClipMap {
  if (mode === "native") return {};
  if (mode === "longbow" && classId && !CLASS_BOW_OK.has(classId)) {
    return PISTOL_PACK;
  }
  return WEAPON_MODE_PACKS[mode] ?? ADVENTURE_PACK;
}

/** Core states that should always try to load for gameplay readiness */
export const REQUIRED_PACK_STATES: ToonAnimState[] = [
  "idle",
  "walk",
  "run",
  "attack",
  "fire",
  "dodge",
  "jump",
  "climb",
  "swim",
  "swimIdle",
  "swimToLedge",
];

export interface ColliderProfile {
  /** Capsule half-height (m) excluding radius ends conceptually — total visual height ≈ 2*halfHeight + 2*radius */
  halfHeight: number;
  radius: number;
  /** Offset from feet to capsule center Y */
  centerY: number;
  /** Layer name for physics filters */
  layer: "player" | "npc" | "projectile";
  /** Optional box half-extents for simple AABB fallback */
  boxHalfExtents: [number, number, number];
}

/** Default capsule colliders per class (metres). Tuned for ~1.6–1.8m toons. */
export const CLASS_COLLIDERS: Record<string, ColliderProfile> = {
  scout: {
    halfHeight: 0.55,
    radius: 0.28,
    centerY: 0.83,
    layer: "player",
    boxHalfExtents: [0.3, 0.85, 0.3],
  },
  engineer: {
    halfHeight: 0.55,
    radius: 0.3,
    centerY: 0.85,
    layer: "player",
    boxHalfExtents: [0.32, 0.88, 0.32],
  },
  gunner: {
    halfHeight: 0.58,
    radius: 0.32,
    centerY: 0.9,
    layer: "player",
    boxHalfExtents: [0.35, 0.92, 0.35],
  },
  infantry: {
    halfHeight: 0.56,
    radius: 0.3,
    centerY: 0.86,
    layer: "player",
    boxHalfExtents: [0.32, 0.9, 0.32],
  },
  medic: {
    halfHeight: 0.54,
    radius: 0.28,
    centerY: 0.82,
    layer: "player",
    boxHalfExtents: [0.3, 0.84, 0.3],
  },
  sniper: {
    halfHeight: 0.57,
    radius: 0.28,
    centerY: 0.85,
    layer: "player",
    boxHalfExtents: [0.3, 0.88, 0.3],
  },
};

export function colliderForClass(classId: string): ColliderProfile {
  return CLASS_COLLIDERS[classId] ?? CLASS_COLLIDERS.infantry;
}
