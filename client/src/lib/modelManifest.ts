/**
 * MODEL MANIFEST — Central registry for all 3D character models & animations
 *
 * ALL assets served from R2 CDN: assets.grudge-studio.com
 *   Race models:  /models/grudge6/races/{WK|BRB|ELF|DWF|ORC|UD}_Characters.glb
 *                 (legacy /models/characters/races/*.glb is CORRUPT — skin joints null)
 *   Characters:   /models/characters/{name}.glb
 *   Animations:   /models/animations/{weapon-type}/{file}.glb
 *   Baked packs:  /anims/baked/{pack}/{gs_*}.json  (Bip001 rotation-only)
 *
 * Greatsword samurai: /anims/baked/greatsword_samurai/gs_samurai_*.json
 *   (Core_01→Bip001, no position tracks; center XZ on pelvis; feet from bbox)
 *
 * USAGE:
 *   getModelForCharacter(raceId, classId) → ModelUnit
 *   getAnimationSet(weaponType)           → Record<AnimState3D, string>
 */

import { ASSET_CDN_BASE } from "@/lib/assetConfig";
import {
  RACE_GRUDGE6,
  resolveCanonicalRaceModelPath,
} from "@shared/fleet/character";

// ── R2 CDN base ─────────────────────────────────────────────────────────────
const CDN = ASSET_CDN_BASE; // https://assets.grudge-studio.com

// ── Animation state names (3D) ──────────────────────────────────────────────

export type AnimState3D =
  | "idle"
  | "run"
  | "walk"
  | "attack1"
  | "attack2"
  | "attack3"
  | "block"
  | "blockIdle"
  | "death"
  | "jump"
  | "kick"
  | "slash1"
  | "slash2"
  | "cast"
  | "impact"
  | "crouch"
  | "dodge"
  | "draw"
  | "special";

/**
 * WeaponType — all 17 weapon types from the Grudge Warlords game design.
 *
 * Each weapon type maps to one of 4 animation categories (CDN folders):
 *   1h-melee  → sword-shield animations  (Sword, Axe, Dagger, Hammer1h, Mace)
 *   2h-melee  → greatsword animations    (Greatsword, Greataxe, Hammer2h, Spear)
 *   ranged    → longbow animations       (Bow, Crossbow, Gun)
 *   caster    → magic animations         (Fire/Frost/Nature/Holy/Arcane/Lightning Staff + Tomes)
 *
 * The AnimCategory type below is used internally for CDN folder resolution.
 * WeaponType is the full list used by game logic and skill systems.
 */
export type WeaponType =
  // 1h melee
  | "sword" | "axe" | "dagger" | "hammer1h" | "mace"
  // 2h melee
  | "greatsword" | "greataxe" | "hammer2h" | "spear"
  // Ranged
  | "bow" | "crossbow" | "gun"
  // Caster (staves)
  | "fire-staff" | "frost-staff" | "nature-staff" | "holy-staff" | "arcane-staff" | "lightning-staff"
  // Caster (tomes — 1h, same caster animations)
  | "fire-tome" | "frost-tome" | "nature-tome" | "holy-tome" | "arcane-tome" | "lightning-tome"
  // Legacy / special
  | "sword-shield" | "longbow" | "magic" | "unarmed";

/** Animation categories on R2 CDN (+ gun for toon soldiers / shooters) */
export type AnimCategory = "sword-shield" | "greatsword" | "longbow" | "magic" | "gun";

/** Map every WeaponType to its animation category (CDN folder) */
export const WEAPON_ANIM_CATEGORY: Record<WeaponType, AnimCategory> = {
  // 1h melee → sword-shield animations
  "sword":         "sword-shield",
  "sword-shield":  "sword-shield",
  "axe":           "sword-shield",
  "dagger":        "sword-shield",
  "hammer1h":      "sword-shield",
  "mace":          "sword-shield",
  // 2h melee → greatsword animations
  "greatsword":    "greatsword",
  "greataxe":      "greatsword",
  "hammer2h":      "greatsword",
  "spear":         "greatsword",
  // Ranged → longbow animations
  "bow":           "longbow",
  "longbow":       "longbow",
  "crossbow":      "longbow",
  // Guns → rifle/pistol packs (toon soldiers, shooters, Nexus Era)
  "gun":           "gun",
  // Caster → magic animations
  "fire-staff":    "magic",
  "frost-staff":   "magic",
  "nature-staff":  "magic",
  "holy-staff":    "magic",
  "arcane-staff":  "magic",
  "lightning-staff":"magic",
  "fire-tome":     "magic",
  "frost-tome":    "magic",
  "nature-tome":   "magic",
  "holy-tome":     "magic",
  "arcane-tome":   "magic",
  "lightning-tome": "magic",
  "magic":         "magic",
  // Unarmed → sword-shield without weapon visuals
  "unarmed":       "sword-shield",
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnimationDef {
  file: string;       // absolute CDN URL to animation GLB
  loop: boolean;
  speed?: number;     // timeScale multiplier (default 1)
}

/**
 * Skeleton type determines animation compatibility.
 * Only characters with the same skeleton type can share animations.
 *
 * - "mixamo-24"  = Standard Mixamo 24-joint (bare names: Hips, Spine, etc.)
 *                  Used by: human, barbarian, dwarf, elf, orc race models
 *                  All weapon animation GLBs target this skeleton (after prefix stripping).
 *
 * - "mixamo-62"  = Extended Mixamo 62-joint (CharacterArmature naming)
 *                  Used by: adventurer.glb — NOT compatible without retargeting.
 *
 * - "custom"     = Non-Mixamo or custom skeleton — needs manual retargeting.
 *                  Used by: knight.glb (31-joint), undead/Skeleton.glb
 *
 * - "static"     = No skeleton (static mesh, cannot be animated).
 *                  Used by: ogre.glb, elf-knight.glb
 */
export type SkeletonType =
  | "mixamo-24"
  | "mixamo-62"
  | "kaykit-41"
  | "toon-bone"
  | "bip001"
  | "custom"
  | "static";

export interface ModelUnit {
  id: string;
  name: string;
  /** Absolute CDN URL to character GLB */
  modelPath: string;
  /** Scale multiplier for the mesh */
  scale: number;
  /** Default weapon type → determines animation set */
  weaponType: WeaponType;
  /** Skeleton type — only "mixamo-24" models can use the shared animation library */
  skeleton: SkeletonType;
  /** Number of joints (for validation/debugging) */
  jointCount: number;
  /** Override specific animations if needed */
  animOverrides?: Partial<Record<AnimState3D, AnimationDef>>;
}

// ── Animation sets per weapon type ──────────────────────────────────────────

const ANIM_BASE = `${CDN}/models/animations`;

function animPath(weapon: string, file: string): string {
  return `${ANIM_BASE}/${weapon}/${file}`;
}

export const WEAPON_ANIMATION_SETS: Record<AnimCategory, Partial<Record<AnimState3D, AnimationDef>>> = {
  "sword-shield": {
    idle:      { file: animPath("sword-shield", "sword and shield idle.glb"), loop: true },
    run:       { file: animPath("sword-shield", "sword and shield run.glb"), loop: true },
    attack1:   { file: animPath("sword-shield", "sword and shield attack.glb"), loop: false },
    attack2:   { file: animPath("sword-shield", "sword and shield attack (2).glb"), loop: false },
    attack3:   { file: animPath("sword-shield", "sword and shield attack (3).glb"), loop: false },
    block:     { file: animPath("sword-shield", "sword and shield block.glb"), loop: false },
    blockIdle: { file: animPath("sword-shield", "sword and shield block idle.glb"), loop: true },
    death:     { file: animPath("sword-shield", "sword and shield death.glb"), loop: false },
    jump:      { file: animPath("sword-shield", "sword and shield jump.glb"), loop: false },
    kick:      { file: animPath("sword-shield", "sword and shield kick.glb"), loop: false },
    slash1:    { file: animPath("sword-shield", "sword and shield slash.glb"), loop: false },
    slash2:    { file: animPath("sword-shield", "sword and shield slash (2).glb"), loop: false },
    cast:      { file: animPath("sword-shield", "sword and shield casting.glb"), loop: false },
    crouch:    { file: animPath("sword-shield", "sword and shield crouch idle.glb"), loop: true },
    impact:    { file: animPath("sword-shield", "sword and shield impact.glb"), loop: false },
    draw:      { file: animPath("sword-shield", "draw sword 1.glb"), loop: false },
  },
  /**
   * Greatsword / 2H — prefer baked Bip001 samurai pack (rotation-only, no hip-float).
   * Source: Core_01 retarget → gs_samurai_* under /anims/baked/greatsword_samurai/.
   * Naming / Y-hip / XZ: docs/MODELS_AND_RETARGET_BEST_PRACTICES.md
   */
  greatsword: {
    idle:      { file: "/anims/baked/greatsword_samurai/gs_samurai_idle_sword.json", loop: true },
    run:       { file: "/anims/baked/greatsword_samurai/gs_samurai_run_sword.json", loop: true },
    walk:      { file: "/anims/baked/greatsword_samurai/gs_samurai_walk_sword.json", loop: true },
    attack1:   { file: "/anims/baked/greatsword_samurai/gs_samurai_combo_a.json", loop: false },
    slash1:    { file: "/anims/baked/greatsword_samurai/gs_samurai_combo_a.json", loop: false },
    slash2:    { file: "/anims/baked/greatsword_samurai/gs_samurai_combo_b.json", loop: false },
    attack2:   { file: "/anims/baked/greatsword_samurai/gs_samurai_combo_b.json", loop: false },
    attack3:   { file: "/anims/baked/greatsword_samurai/gs_samurai_dash_opener.json", loop: false },
    special:   { file: "/anims/baked/greatsword_samurai/gs_samurai_teleport_strike.json", loop: false },
    jump:      { file: "/anims/baked/greatsword_samurai/gs_samurai_jump_sword.json", loop: false },
    draw:      { file: "/anims/baked/greatsword_samurai/gs_samurai_sword_on.json", loop: false },
    cast:      { file: "/anims/baked/greatsword_samurai/gs_samurai_dash_opener.json", loop: false },
    // Fallbacks from legacy Mixamo greatsword GLBs where baked pack has no clip
    block:     { file: animPath("greatsword", "great sword blocking.glb"), loop: false },
    death:     { file: animPath("sword-shield", "sword and shield death.glb"), loop: false },
    kick:      { file: animPath("greatsword", "great sword kick.glb"), loop: false },
    impact:    { file: animPath("greatsword", "great sword impact.glb"), loop: false },
  },
  longbow: {
    idle:      { file: animPath("longbow", "standing idle 01.glb"), loop: true },
    run:       { file: animPath("longbow", "standing run forward.glb"), loop: true },
    walk:      { file: animPath("longbow", "standing walk forward.glb"), loop: true },
    attack1:   { file: animPath("longbow", "standing draw arrow.glb"), loop: false },
    attack2:   { file: animPath("longbow", "standing aim recoil.glb"), loop: false },
    attack3:   { file: animPath("longbow", "standing aim overdraw.glb"), loop: false },
    block:     { file: animPath("longbow", "standing block.glb"), loop: false },
    death:     { file: animPath("longbow", "standing death forward 01.glb"), loop: false },
    dodge:     { file: animPath("longbow", "standing dodge forward.glb"), loop: false },
    kick:      { file: animPath("longbow", "standing melee kick.glb"), loop: false },
    draw:      { file: animPath("longbow", "standing equip bow.glb"), loop: false },
    special:   { file: animPath("longbow", "standing dive forward.glb"), loop: false },
  },
  magic: {
    idle:      { file: animPath("magic", "standing idle 02.glb"), loop: true },
    attack1:   { file: animPath("magic", "Standing 1H Magic Attack 01.glb"), loop: false },
    cast:      { file: animPath("magic", "standing 1H cast spell 01.glb"), loop: false },
    attack2:   { file: animPath("magic", "Standing 2H Magic Attack 01.glb"), loop: false },
    attack3:   { file: animPath("magic", "Standing 2H Magic Attack 02.glb"), loop: false },
    special:   { file: animPath("magic", "Standing 2H Magic Area Attack 01.glb"), loop: false },
    block:     { file: animPath("magic", "Standing Block Start.glb"), loop: false },
    blockIdle: { file: animPath("magic", "Standing Block Idle.glb"), loop: true },
    crouch:    { file: animPath("magic", "Crouch Idle.glb"), loop: true },
  },
  // Gun / rifle / pistol — preferred for toon soldiers via ToonSoldierController
  // (native clips). These Mixamo paths are retarget fallbacks for mixamo-24 only.
  gun: {
    idle:      { file: animPath("rifle", "idle.glb"), loop: true },
    walk:      { file: animPath("rifle", "walk forward.glb"), loop: true },
    run:       { file: animPath("rifle", "run forward.glb"), loop: true },
    attack1:   { file: animPath("rifle", "firing.glb"), loop: false },
    attack2:   { file: animPath("pistol", "gunplay.glb"), loop: false },
    special:   { file: animPath("pistol", "pistol run.glb"), loop: true },
  },
};

// ── Character model registry ────────────────────────────────────────────────

/**
 * Canonical grudge6 modular race kits (Bip001).
 * NEVER use /models/characters/races/*.glb — those GLBs have null skin.joints
 * (generator: grudge-arena process-30grudge6-characters) and throw isBone errors.
 */
function raceKitPath(raceId: string): string {
  const cfg = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
  return `${CDN}${cfg.cdnPath}`;
}

/** Detailed character models on R2 — /models/characters/ */
const CHAR_BASE = `${CDN}/models/characters`;
/** Toon soldiers (chicken_gun) — Nexus / Hero RTS / shooters */
const TOON_BASE = `${CDN}/models/toon-soldiers`;

/** Skeletons that can play fleet weapon / baked anim packs. */
const PLAYABLE_SKELETONS = new Set(["mixamo-24", "bip001"]);

export const MODEL_MANIFEST: Record<string, ModelUnit> = {
  // ── THE 6 GRUDGE RACE CHARACTERS (grudge6 Bip001 modular kits) ──
  // Production SSOT: assets…/models/grudge6/races/*_Characters.glb
  human:      { id: "human",      name: "Human",      modelPath: raceKitPath("human"),      scale: 1.0,  weaponType: "sword",       skeleton: "bip001", jointCount: 24 },
  barbarian:  { id: "barbarian",  name: "Barbarian",  modelPath: raceKitPath("barbarian"),  scale: 1.1,  weaponType: "greataxe",    skeleton: "bip001", jointCount: 24 },
  dwarf:      { id: "dwarf",      name: "Dwarf",      modelPath: raceKitPath("dwarf"),      scale: 0.85, weaponType: "hammer1h",    skeleton: "bip001", jointCount: 24 },
  elf:        { id: "elf",        name: "Elf",        modelPath: raceKitPath("elf"),        scale: 1.0,  weaponType: "bow",         skeleton: "bip001", jointCount: 24 },
  orc:        { id: "orc",        name: "Orc",        modelPath: raceKitPath("orc"),        scale: 1.15, weaponType: "greatsword",   skeleton: "bip001", jointCount: 24 },
  undead:     { id: "undead",     name: "Undead",     modelPath: raceKitPath("undead"),     scale: 1.0,  weaponType: "sword",       skeleton: "bip001", jointCount: 24 },

  // ── Toon Soldiers (chicken_gun) — Nexus Era / Hero RTS / shooters / editors ──
  // Custom Bone skeleton: use ToonSoldierController (native clips + gunplay packs).
  "toon:scout":     { id: "toon:scout",     name: "Toon Scout",     modelPath: `${TOON_BASE}/scout/scout-a.glb`,         scale: 1.0, weaponType: "gun", skeleton: "toon-bone", jointCount: 16 },
  "toon:engineer":  { id: "toon:engineer",  name: "Toon Engineer",  modelPath: `${TOON_BASE}/engineer/engineer-a.glb`,   scale: 1.0, weaponType: "gun", skeleton: "toon-bone", jointCount: 16 },
  "toon:gunner":    { id: "toon:gunner",    name: "Toon Gunner",    modelPath: `${TOON_BASE}/gunner/gunner-a.glb`,       scale: 1.0, weaponType: "gun", skeleton: "toon-bone", jointCount: 16 },
  "toon:infantry":  { id: "toon:infantry",  name: "Toon Infantry",  modelPath: `${TOON_BASE}/infantry/infantry-a.glb`,   scale: 1.0, weaponType: "gun", skeleton: "toon-bone", jointCount: 16 },
  "toon:medic":     { id: "toon:medic",     name: "Toon Medic",     modelPath: `${TOON_BASE}/medic/medic-a.glb`,         scale: 1.0, weaponType: "gun", skeleton: "toon-bone", jointCount: 16 },
  "toon:sniper":    { id: "toon:sniper",    name: "Toon Sniper",    modelPath: `${TOON_BASE}/sniper/sniper-a.glb`,       scale: 1.0, weaponType: "gun", skeleton: "toon-bone", jointCount: 16 },

  // ── Faction NPC models ─────────────────────────────────────────────────
  "fabled-worker": { id: "fabled-worker", name: "Fabled Worker", modelPath: `${CHAR_BASE}/fabledworker.glb`, scale: 1.0, weaponType: "unarmed", skeleton: "mixamo-24", jointCount: 24 },

  // ── Town models (environment GLBs — static skeleton, no character anims) ──
  "town-crusade":  { id: "town-crusade",  name: "Dried Basin Garrison",  modelPath: `/models/medieval_town.glb`,           scale: 1.0, weaponType: "unarmed", skeleton: "static", jointCount: 0 },
  "town-legion":   { id: "town-legion",   name: "The Pit Foundry",       modelPath: `${CDN}/models/towns/pit_foundry.glb`, scale: 1.0, weaponType: "unarmed", skeleton: "static", jointCount: 0 },
  "town-fabled":   { id: "town-fabled",   name: "Cathedral Sanctum",     modelPath: `${CDN}/models/towns/cathedral_sanctum.glb`, scale: 1.0, weaponType: "unarmed", skeleton: "static", jointCount: 0 },

  // ── Detailed character models (R2: /models/characters/) ────────────────
  "barbarian-glad":   { id: "barbarian-glad",   name: "Barbarian Gladiator", modelPath: `${CHAR_BASE}/barbarianglad.glb`,         scale: 1.1,  weaponType: "greatsword",   skeleton: "mixamo-24", jointCount: 24 },
  berserker:          { id: "berserker",         name: "Berserker",          modelPath: `${CHAR_BASE}/berserker.glb`,            scale: 1.1,  weaponType: "greatsword",   skeleton: "mixamo-24", jointCount: 24 },
  "elf-ranger":       { id: "elf-ranger",        name: "Elf Ranger",         modelPath: `${CHAR_BASE}/elfranger.glb`,            scale: 1.0,  weaponType: "longbow",      skeleton: "mixamo-24", jointCount: 24 },
  "goblin-crew":      { id: "goblin-crew",       name: "Goblin Crew",        modelPath: `${CHAR_BASE}/goblincr3w.glb`,           scale: 0.8,  weaponType: "unarmed",      skeleton: "mixamo-24", jointCount: 24 },
  siegeman:           { id: "siegeman",           name: "Siege Man",          modelPath: `${CHAR_BASE}/siegeman.glb`,             scale: 1.1,  weaponType: "greatsword",   skeleton: "mixamo-24", jointCount: 24 },
  "crusaders-knight": { id: "crusaders-knight",  name: "Crusader Knight",    modelPath: `${CHAR_BASE}/crusaders_knight.glb`,     scale: 1.0,  weaponType: "sword-shield", skeleton: "custom",    jointCount: 0  },
  demon:              { id: "demon",             name: "Demon",              modelPath: `${CHAR_BASE}/demon.glb`,                scale: 1.2,  weaponType: "greatsword",   skeleton: "custom",    jointCount: 0  },
  dragon:             { id: "dragon",            name: "Dragon",             modelPath: `${CHAR_BASE}/dragon.glb`,               scale: 1.5,  weaponType: "unarmed",      skeleton: "custom",    jointCount: 0  },
  wolf:               { id: "wolf",              name: "Wolf",               modelPath: `${CHAR_BASE}/wolf.glb`,                 scale: 1.0,  weaponType: "unarmed",      skeleton: "custom",    jointCount: 0  },
  hawk:               { id: "hawk",              name: "Hawk",               modelPath: `${CHAR_BASE}/hawk-lp-rigged-flight-animated.glb`, scale: 0.8, weaponType: "unarmed", skeleton: "custom", jointCount: 0 },
  velociraptor:       { id: "velociraptor",      name: "Velociraptor",       modelPath: `${CHAR_BASE}/velociraptor.glb`,         scale: 1.0,  weaponType: "unarmed",      skeleton: "custom",    jointCount: 0  },

  // ── INCOMPATIBLE — different skeletons ──────────────────────────────────
  knight:     { id: "knight",     name: "Knight",     modelPath: `${CHAR_BASE}/knight.glb`,     scale: 1.0,  weaponType: "sword-shield", skeleton: "custom",    jointCount: 31 },
  soldier:    { id: "soldier",    name: "Soldier",    modelPath: `${CHAR_BASE}/soldier.glb`,    scale: 1.0,  weaponType: "sword-shield", skeleton: "custom",    jointCount: 0  },
  adventurer: { id: "adventurer", name: "Adventurer", modelPath: `${CHAR_BASE}/adventurer.glb`, scale: 1.0,  weaponType: "sword-shield", skeleton: "mixamo-62", jointCount: 62 },
  ogre:       { id: "ogre",       name: "Ogre",       modelPath: `${CHAR_BASE}/ogre.glb`,       scale: 1.3,  weaponType: "greatsword",   skeleton: "static",   jointCount: 0  },
  elfKnight:  { id: "elfKnight",  name: "Elf Knight", modelPath: `${CHAR_BASE}/elf-knight.glb`, scale: 1.0,  weaponType: "sword-shield", skeleton: "static",   jointCount: 0  },
};

// ── KayKit embedded animation mapping ────────────────────────────────────────
//
// KayKit toon models (skeleton: "kaykit-41") ship with 95 embedded animation
// clips using their own bone rig (41 joints with IK).  External Mixamo
// animations are NOT compatible — use the embedded clips directly.
//
// This map translates KayKit clip names → our AnimState keys so the
// RemotePlayerManager (and local player) can drive them uniformly.

export const KAYKIT_ANIM_MAP: Record<string, Record<string, string>> = {
  /** Class-agnostic base animations (always registered) */
  base: {
    idle:     'Idle',
    walk:     'Walking_A',
    run:      'Running_A',
    death:    'Death_A',
    jump:     'Jump_Full_Short',
    dodge:    'Dodge_Forward',
    block:    'Blocking',
    harvest:  'Interact',
    crouch:   'Lie_Down',
    impact:   'Hit_A',
    taunt:    'Taunt',
    spawn:    'Skeletons_Awaken_Standing',
  },
  /** Warrior / sword-shield overrides */
  'sword-shield': {
    idle:     'Idle_Combat',
    attack1:  '1H_Melee_Attack_Chop',
    attack2:  '1H_Melee_Attack_Slice_Diagonal',
    attack3:  '1H_Melee_Attack_Stab',
    block:    'Block',
    blockIdle:'Blocking',
    kick:     'Unarmed_Melee_Attack_Kick',
  },
  /** Greatsword / 2H overrides */
  greatsword: {
    idle:     '2H_Melee_Idle',
    attack1:  '2H_Melee_Attack_Chop',
    attack2:  '2H_Melee_Attack_Slice',
    attack3:  '2H_Melee_Attack_Spin',
    special:  '2H_Melee_Attack_Spinning',
  },
  /** Longbow / ranged overrides */
  longbow: {
    attack1:  '1H_Ranged_Shoot',
    attack2:  '1H_Ranged_Shooting',
    draw:     '1H_Ranged_Aiming',
  },
  /** Magic / caster overrides */
  magic: {
    attack1:  'Spellcast_Shoot',
    attack2:  'Spellcast_Raise',
    cast:     'Spellcasting',
    special:  'Spellcast_Summon',
  },
};

/** Check if a skeleton type uses embedded KayKit animations */
export function isKaykitModel(skeletonType: SkeletonType): boolean {
  return skeletonType === 'kaykit-41';
}

/** Build the full embedded clip-name → AnimState map for a KayKit model + weapon */
export function getKaykitAnimMap(weaponType: WeaponType): Record<string, string> {
  // Merge: base defaults ← weapon overrides  (animState → clipName)
  const merged = { ...KAYKIT_ANIM_MAP.base, ...(KAYKIT_ANIM_MAP[weaponType] || {}) };
  // Invert: clipName → animState (what RemotePlayerManager needs to register clips)
  const inverted: Record<string, string> = {};
  for (const [state, clipName] of Object.entries(merged)) {
    inverted[clipName] = state;
  }
  return inverted;
}

// ── Race model lookup (freeform ARPG — weapons come from equipment, not class) ─

/**
 * @deprecated Soft starter hint only. Do NOT use to gate equip / combat / anims.
 * Prefer weaponTypeFromModel3d(equipment) for live play.
 */
export const CLASS_WEAPON_MAP: Record<string, WeaponType> = {
  warrior: "sword",
  ranger:  "bow",
  mage:    "arcane-staff",
  worg:    "greatsword",
  worge:   "greatsword",
};

/** Race → base body model (class no longer swaps body meshes). */
const RACE_MODEL_ID: Record<string, string> = {
  human: "human",
  barbarian: "barbarian",
  undead: "undead",
  orc: "orc",
  elf: "elf",
  dwarf: "dwarf",
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Race body model for play. Weapon type is NOT forced by class —
 * callers must resolve weapons from equipment / model3d.
 */
export function getModelForCharacter(raceId: string, _classId?: string): ModelUnit {
  // Accept WK_Characters_customizable / aliases
  let key = (raceId || "human").toLowerCase();
  if (!(key in RACE_MODEL_ID) && !(key in MODEL_MANIFEST)) {
    // Lazy normalize without circular import — mirror fleet normalizeRaceId tokens
    if (key.includes("barb") || key.includes("brb")) key = "barbarian";
    else if (key.includes("elf")) key = "elf";
    else if (key.includes("dwarf") || key.includes("dwf")) key = "dwarf";
    else if (key.includes("orc")) key = "orc";
    else if (key.includes("undead") || key.includes("ud_") || key === "ud") key = "undead";
    else if (key.includes("wk") || key.includes("human") || key.includes("characters")) key = "human";
  }
  const modelId = RACE_MODEL_ID[key] ?? (MODEL_MANIFEST[key] ? key : "human");
  let unit = MODEL_MANIFEST[modelId];

  // Fall back to human for incompatible skeletons (static/custom/kaykit-only).
  // Playable races are bip001 (grudge6) or legacy mixamo-24.
  if (!unit || !PLAYABLE_SKELETONS.has(unit.skeleton)) {
    unit = MODEL_MANIFEST.human;
  }

  // Keep unit.weaponType as a soft idle default only (usually "sword")
  return { ...unit };
}

/** Check if a model can be animated with fleet weapon / baked packs */
export function isAnimationCompatible(modelId: string): boolean {
  const unit = MODEL_MANIFEST[modelId];
  return !!unit && PLAYABLE_SKELETONS.has(unit.skeleton);
}

/** Get only animation-compatible model IDs */
export function getCompatibleModelIds(): string[] {
  return Object.keys(MODEL_MANIFEST).filter(isAnimationCompatible);
}

/** Get the animation set for a weapon type.
 *  Resolves all 17+ weapon types to the correct animation category. */
export function getAnimationSet(weaponType: WeaponType): Partial<Record<AnimState3D, AnimationDef>> {
  // Direct match first (legacy weapon types match CDN folders directly)
  if (weaponType in WEAPON_ANIMATION_SETS) {
    return WEAPON_ANIMATION_SETS[weaponType as AnimCategory];
  }
  // Resolve via category map
  const category = WEAPON_ANIM_CATEGORY[weaponType] ?? "sword-shield";
  return WEAPON_ANIMATION_SETS[category];
}

/** Get a single animation def for a character + state */
export function getCharacterAnimation(
  raceId: string,
  classId: string,
  state: AnimState3D,
): AnimationDef | null {
  const model = getModelForCharacter(raceId, classId);
  // Check model-specific overrides first
  if (model.animOverrides?.[state]) return model.animOverrides[state]!;
  // Then weapon-type set
  const set = getAnimationSet(model.weaponType);
  return set[state] ?? null;
}

/** Resolve a model path to a loadable URL.
 *  Absolute URLs pass through (after legacy race rewrite). Relative paths → R2 CDN.
 *  Same-origin /models/* is also valid when the file is shipped with the SPA. */
export function resolveModelUrl(path: string): string {
  if (!path) return path;
  if (/^(data:|blob:)/i.test(path)) return path;

  // Rewrite corrupt legacy race GLBs → grudge6 kits (also handles full CDN URLs).
  const canonical = resolveCanonicalRaceModelPath(path);
  path = canonical;

  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('//')) return `https:${path}`;

  const host = String(CDN).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  if (path.includes(host)) {
    return path.startsWith('http') ? path : `https://${path.replace(/^\/+/, '')}`;
  }

  const rel = path.startsWith('/') ? path : `/${path}`;
  const base = String(CDN).replace(/\/$/, '');
  return `${base}${rel}`;
}

/** List all available animation states for a weapon type */
export function getAvailableStates(weaponType: WeaponType): AnimState3D[] {
  const set = getAnimationSet(weaponType);
  return Object.keys(set) as AnimState3D[];
}

/** All registered model IDs */
export function getAllModelIds(): string[] {
  return Object.keys(MODEL_MANIFEST);
}
