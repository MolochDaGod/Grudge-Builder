/**
 * MODEL MANIFEST — Central registry for all 3D character models & animations
 *
 * ALL assets served from R2 CDN: assets.grudge-studio.com
 *   Race models:  /models/characters/races/{race}.glb
 *   Characters:   /models/characters/{name}.glb
 *   Animations:   /models/animations/{weapon-type}/{file}.glb
 *
 * USAGE:
 *   getModelForCharacter(raceId, classId) → ModelUnit
 *   getAnimationSet(weaponType)           → Record<AnimState3D, string>
 */

import { ASSET_CDN_BASE } from "@/lib/assetConfig";

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

export type WeaponType = "sword-shield" | "greatsword" | "longbow" | "magic" | "unarmed";

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
export type SkeletonType = "mixamo-24" | "mixamo-62" | "custom" | "static";

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

export const WEAPON_ANIMATION_SETS: Record<WeaponType, Partial<Record<AnimState3D, AnimationDef>>> = {
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
  greatsword: {
    idle:      { file: animPath("greatsword", "great sword idle.glb"), loop: true },
    run:       { file: animPath("greatsword", "great sword run.glb"), loop: true },
    walk:      { file: animPath("greatsword", "great sword walk.glb"), loop: true },
    attack1:   { file: animPath("greatsword", "great sword attack.glb"), loop: false },
    slash1:    { file: animPath("greatsword", "great sword slash.glb"), loop: false },
    slash2:    { file: animPath("greatsword", "great sword slash (2).glb"), loop: false },
    attack2:   { file: animPath("greatsword", "great sword slash (3).glb"), loop: false },
    block:     { file: animPath("greatsword", "great sword blocking.glb"), loop: false },
    death:     { file: animPath("greatsword", "two handed sword death.glb"), loop: false },
    jump:      { file: animPath("greatsword", "great sword jump.glb"), loop: false },
    special:   { file: animPath("greatsword", "great sword high spin attack.glb"), loop: false },
    kick:      { file: animPath("greatsword", "great sword kick.glb"), loop: false },
    cast:      { file: animPath("greatsword", "great sword casting.glb"), loop: false },
    impact:    { file: animPath("greatsword", "great sword impact.glb"), loop: false },
    draw:      { file: animPath("greatsword", "draw a great sword 1.glb"), loop: false },
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
  unarmed: {
    // Unarmed falls back to sword-shield without weapon visuals
    idle:      { file: animPath("sword-shield", "sword and shield idle.glb"), loop: true },
    run:       { file: animPath("sword-shield", "sword and shield run.glb"), loop: true },
    attack1:   { file: animPath("sword-shield", "sword and shield kick.glb"), loop: false },
    death:     { file: animPath("sword-shield", "sword and shield death.glb"), loop: false },
  },
};

// ── Character model registry ────────────────────────────────────────────────

/** Race models on R2 — /models/characters/races/ */
const RACE_BASE = `${CDN}/models/characters/races`;
/** Detailed character models on R2 — /models/characters/ */
const CHAR_BASE = `${CDN}/models/characters`;

export const MODEL_MANIFEST: Record<string, ModelUnit> = {
  // ── Mixamo-24 race models (COMPATIBLE — share all weapon animations) ────
  human:      { id: "human",      name: "Human",      modelPath: `${RACE_BASE}/human.glb`,      scale: 1.0,  weaponType: "sword-shield", skeleton: "mixamo-24", jointCount: 24 },
  barbarian:  { id: "barbarian",  name: "Barbarian",  modelPath: `${RACE_BASE}/barbarian.glb`,  scale: 1.1,  weaponType: "greatsword",   skeleton: "mixamo-24", jointCount: 24 },
  dwarf:      { id: "dwarf",      name: "Dwarf",      modelPath: `${RACE_BASE}/dwarf.glb`,      scale: 0.85, weaponType: "sword-shield", skeleton: "mixamo-24", jointCount: 24 },
  elf:        { id: "elf",        name: "Elf",        modelPath: `${RACE_BASE}/elf.glb`,        scale: 1.0,  weaponType: "longbow",      skeleton: "mixamo-24", jointCount: 24 },
  orc:        { id: "orc",        name: "Orc",        modelPath: `${RACE_BASE}/orc.glb`,        scale: 1.15, weaponType: "greatsword",   skeleton: "mixamo-24", jointCount: 24 },
  undead:     { id: "undead",     name: "Undead",     modelPath: `${RACE_BASE}/undead.glb`,     scale: 1.0,  weaponType: "sword-shield", skeleton: "custom",    jointCount: 0  },

  // ── Faction NPC models ─────────────────────────────────────────────────
  "fabled-worker": { id: "fabled-worker", name: "Fabled Worker", modelPath: `${CHAR_BASE}/fabledworker.glb`, scale: 1.0, weaponType: "unarmed", skeleton: "mixamo-24", jointCount: 24 },

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

// ── Race × Class → Model + Weapon mapping ───────────────────────────────────

/** Class → default weapon type */
export const CLASS_WEAPON_MAP: Record<string, WeaponType> = {
  warrior: "sword-shield",
  ranger:  "longbow",
  mage:    "magic",
  worg:    "greatsword",
};

/** Race × Class → model ID (mirrors SPRITE_MATRIX from gameData.ts) */
const RACE_MODEL_MATRIX: Record<string, Record<string, string>> = {
  human:     { warrior: "human",     mage: "human",     ranger: "human",     worg: "human" },
  barbarian: { warrior: "barbarian", mage: "barbarian", ranger: "barbarian", worg: "barbarian" },
  undead:    { warrior: "undead",    mage: "undead",    ranger: "undead",    worg: "undead" },
  orc:       { warrior: "orc",       mage: "orc",       ranger: "orc",       worg: "orc" },
  elf:       { warrior: "elf",       mage: "elf",       ranger: "elf",       worg: "elf" },
  dwarf:     { warrior: "dwarf",     mage: "dwarf",     ranger: "dwarf",     worg: "dwarf" },
};

// ── Public API ──────────────────────────────────────────────────────────────

/** Get the 3D model unit for a race×class combo */
export function getModelForCharacter(raceId: string, classId: string): ModelUnit {
  const modelId = RACE_MODEL_MATRIX[raceId]?.[classId] ?? raceId;
  let unit = MODEL_MANIFEST[modelId];

  // If the resolved model isn't animation-compatible, fall back to human
  if (!unit || unit.skeleton !== "mixamo-24") {
    unit = MODEL_MANIFEST.human;
  }

  // Override weapon type based on class
  const weaponType = CLASS_WEAPON_MAP[classId] ?? unit.weaponType;
  return { ...unit, weaponType };
}

/** Check if a model can use the shared Mixamo animation library */
export function isAnimationCompatible(modelId: string): boolean {
  const unit = MODEL_MANIFEST[modelId];
  return unit?.skeleton === "mixamo-24";
}

/** Get only animation-compatible model IDs */
export function getCompatibleModelIds(): string[] {
  return Object.keys(MODEL_MANIFEST).filter(isAnimationCompatible);
}

/** Get the animation set for a weapon type */
export function getAnimationSet(weaponType: WeaponType): Partial<Record<AnimState3D, AnimationDef>> {
  return WEAPON_ANIMATION_SETS[weaponType] ?? WEAPON_ANIMATION_SETS["sword-shield"];
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
 *  Paths that are already absolute CDN URLs are returned as-is.
 *  All models live on R2 CDN — no local fallback needed. */
export function resolveModelUrl(path: string): string {
  if (path.startsWith('https://') || path.startsWith('http://')) return path;
  return `${CDN}${path.startsWith('/') ? path : '/' + path}`;
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
