import { assetUrl } from "@/lib/assetConfig";
/**
 * SPRITE MANIFEST - Central registry for all animated game sprites
 * 
 * SPRITE TYPES AND FORMATS:
 * 
 * 1. GRUDGE RPG SPRITES (100x100px frames)
 *    - Location: /sprites/GrudgeRPGAssets2d/Characters(100x100)/
 *    - Format: Horizontal spritesheets, each action in separate file
 *    - Actions: Idle, Walk, Attack, Hurt, Death (some have Block, Run)
 *    - Examples: Archer, Knight, Skeleton, Orc, Wizard
 * 
 * 2. VAMPIRE SPRITES (128x128px frames)
 *    - Location: /sprites/enemies/vampire/
 *    - Format: Horizontal spritesheets, each action in separate file
 *    - Variants: Vampire_Girl, Converted_Vampire, Countess_Vampire
 * 
 * 3. FANTASY ENEMIES (128x128px frames)
 *    - Location: /sprites/enemies/fantasy/
 *    - Format: Horizontal spritesheets
 *    - Examples: Fire_Spirit, Plent (Poison Plant), Skeleton
 * 
 * 4. SATYR SPRITES (128x128px frames)
 *    - Location: /sprites/rpg/satyr/
 *    - Variants: Satyr_1 (Warrior), Satyr_2 (Shaman), Satyr_3 (Elder)
 * 
 * 5. SHINOBI SPRITES (128x128px frames)
 *    - Location: /sprites/rpg/shinobi/
 *    - Variants: Shinobi, Samurai, Fighter
 * 
 * 6. WEREWOLF/WORG SPRITES (128x128px frames)
 *    - Location: /sprites/rpg/werewolf/
 *    - Variants: Black_Werewolf (Shadow), Red_Werewolf (Blood), White_Werewolf (Frost)
 * 
 * 7. KNIGHT SPRITES (128x128px frames)
 *    - Location: /sprites/rpg/knight/
 *    - Variants: Knight_1 (Captain), Knight_2 (Champion), Knight_3 (Commander)
 * 
 * 8. DUNGEON SPRITES (Directional, 48x64px or 47x63px)
 *    - Location: /sprites/dampdungeons/animations/
 *    - Format: 4-row spritesheets (Down, Left, Right, Up)
 *    - Used by: DirectionalSprite, DungeonHeroSprite, DungeonMonsterSprite
 *    - Not in this manifest - handled by DirectionalSprite.tsx component
 * 
 * 9. HERO RACE SPRITES (Variable sizes, bounding box metadata)
 *    - Location: /sprites/heroes/{race}/
 *    - Format: Large spritesheets with JSON bounding box data
 *    - Races: human, elf, dwarf, orc, undead, barbarian
 *    - Used by: HeroSpriteAnimator.tsx component
 * 
 * USAGE:
 * - Use getSpriteUnit(id) to get sprite configuration
 * - Use getAnimation(unit, state) to get animation settings
 * - Use getSpriteSheetPath(unit, animation) to get the image URL
 * - SpriteAnimator component handles rendering with proper frame timing
 */

export type AnimationState =
  // ─── Locomotion ────────────────────────────────────────────────────
  | "idle" | "walk" | "walk2" | "run"
  | "jump"    | "swim"    | "climb"  | "turn"
  | "getup"   | "dodge"   | "roll"
  // ─── Movement variants (sprint styles, stances, unique locomotion) ─
  | "move1"   | "move2"   | "move3"  | "move4"
  // ─── Attacks (look for these even if the sprite doesn't have them) ─
  | "attack"  | "attack2" | "attack3" | "attack4"
  // ─── Class-specific skills (class-unique combos / specials) ────────
  | "class1"  | "class2"  | "class3"
  // ─── Special / magic ───────────────────────────────────────────────
  | "special" | "cast"    | "heal"
  // ─── Air attacks ───────────────────────────────────────────────────
  | "jumpattack"
  // ─── Visual effects (particle bursts, summons, transformations) ────
  | "effect1" | "effect2" | "effect3" | "effect4"
  // ─── Auras (persistent looping overlays — buff, curse, stance) ─────
  | "aura1"   | "aura2"
  // ─── Defense ───────────────────────────────────────────────────────
  | "block"   | "parry"
  // ─── Damage / death ────────────────────────────────────────────────
  | "hurt"    | "death";

export type EffectType = "attack_effect" | "attack2_effect" | "attack3_effect" | "cast_effect" | "heal_effect" | "projectile";

export interface SpriteAnimation {
  frameCount: number;
  fps: number;
  loop: boolean;
  file?: string;
}

export interface EffectAnimation {
  frameCount: number;
  fps: number;
  loop: boolean;
  file: string;
  type: "projectile" | "impact" | "aoe";
  travelSpeed?: number;
}

export interface SpriteUnit {
  id: string;
  name: string;
  basePath: string;
  frameWidth: number;
  frameHeight: number;
  animations: Partial<Record<AnimationState, SpriteAnimation>>;
  effects?: Partial<Record<EffectType, EffectAnimation>>;
  tintable: boolean;
  defaultTint?: string;
}

const GRUDGE_BASE = assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)");

function grudgeSprite(
  id: string, 
  name: string, 
  anims: Partial<Record<AnimationState, SpriteAnimation>>, 
  effects?: Partial<Record<EffectType, EffectAnimation>>,
  tint?: string
): SpriteUnit {
  return {
    id,
    name,
    basePath: `${GRUDGE_BASE}/${id}/${id}`,
    frameWidth: 100,
    frameHeight: 100,
    tintable: true,
    defaultTint: tint,
    animations: anims,
    effects: effects
  };
}

const GRUDGE_EFFECTS_BASE = assetUrl("/sprites/GrudgeRPGAssets2d/Characters(100x100)");

function getEffectPath(characterId: string, effectFile: string): string {
  return `${GRUDGE_EFFECTS_BASE}/${characterId}/${characterId}(Split Effects)/${effectFile}`;
}

function getProjectilePath(characterId: string, effectFile: string): string {
  return `${GRUDGE_EFFECTS_BASE}/${characterId}/Magic(projectile)/${effectFile}`;
}

export const SPRITE_MANIFEST: Record<string, SpriteUnit> = {
  "Archer": grudgeSprite("Archer", "Archer", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Archer-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Archer-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Archer-Attack01.png" },
    attack2: { frameCount: 9, fps: 12, loop: false, file: "Archer-Attack02.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Archer-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Archer-Death.png" },
  }, {
    attack_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Archer", "Archer-Attack01_Effect.png"), type: "projectile", travelSpeed: 400 },
    attack2_effect: { frameCount: 12, fps: 12, loop: false, file: getEffectPath("Archer", "Archer-Attack02_Effect.png"), type: "projectile", travelSpeed: 400 },
  }),
  "Armored Axeman": grudgeSprite("Armored Axeman", "Armored Axeman", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Armored Axeman-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Armored Axeman-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Armored Axeman-Attack01.png" },
    attack2: { frameCount: 9, fps: 12, loop: false, file: "Armored Axeman-Attack02.png" },
    attack3: { frameCount: 9, fps: 12, loop: false, file: "Armored Axeman-Attack03.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Armored Axeman-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Armored Axeman-Death.png" },
  }, {
    attack_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Armored Axeman", "Armored Axeman-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Armored Axeman", "Armored Axeman-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 12, fps: 12, loop: false, file: getEffectPath("Armored Axeman", "Armored Axeman-Attack03_Effect.png"), type: "impact" },
  }),
  "Armored Orc": grudgeSprite("Armored Orc", "Armored Orc", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Armored Orc-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Armored Orc-Walk.png" },
    attack: { frameCount: 7, fps: 12, loop: false, file: "Armored Orc-Attack01.png" },
    attack2: { frameCount: 7, fps: 12, loop: false, file: "Armored Orc-Attack02.png" },
    attack3: { frameCount: 7, fps: 12, loop: false, file: "Armored Orc-Attack03.png" },
    block: { frameCount: 4, fps: 8, loop: false, file: "Armored Orc-Block.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Armored Orc-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Armored Orc-Death.png" },
  }, {
    attack_effect: { frameCount: 7, fps: 12, loop: false, file: getEffectPath("Armored Orc", "Armored Orc-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 8, fps: 12, loop: false, file: getEffectPath("Armored Orc", "Armored Orc-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Armored Orc", "Armored Orc-Attack03_Effect.png"), type: "impact" },
  }),
  "Armored Skeleton": grudgeSprite("Armored Skeleton", "Armored Skeleton", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Armored Skeleton-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Armored Skeleton-Walk.png" },
    attack: { frameCount: 8, fps: 12, loop: false, file: "Armored Skeleton-Attack01.png" },
    attack2: { frameCount: 8, fps: 12, loop: false, file: "Armored Skeleton-Attack02.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Armored Skeleton-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Armored Skeleton-Death.png" },
  }, {
    attack_effect: { frameCount: 8, fps: 12, loop: false, file: getEffectPath("Armored Skeleton", "Armored Skeleton-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Armored Skeleton", "Armored Skeleton-Attack02_Effect.png"), type: "impact" },
  }),
  "Elite Orc": grudgeSprite("Elite Orc", "Elite Orc", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Elite Orc-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Elite Orc-Walk.png" },
    attack: { frameCount: 7, fps: 12, loop: false, file: "Elite Orc-Attack01.png" },
    attack2: { frameCount: 7, fps: 12, loop: false, file: "Elite Orc-Attack02.png" },
    attack3: { frameCount: 7, fps: 12, loop: false, file: "Elite Orc-Attack03.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Elite Orc-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Elite Orc-Death.png" },
  }, {
    attack_effect: { frameCount: 7, fps: 12, loop: false, file: getEffectPath("Elite Orc", "Elite Orc-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 11, fps: 12, loop: false, file: getEffectPath("Elite Orc", "Elite Orc-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Elite Orc", "Elite Orc-Attack03_Effect.png"), type: "impact" },
  }),
  "Greatsword Skeleton": grudgeSprite("Greatsword Skeleton", "Greatsword Skeleton", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Greatsword Skeleton-Idle.png" },
    walk: { frameCount: 9, fps: 10, loop: true, file: "Greatsword Skeleton-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Greatsword Skeleton-Attack01.png" },
    attack2: { frameCount: 9, fps: 12, loop: false, file: "Greatsword Skeleton-Attack02.png" },
    attack3: { frameCount: 9, fps: 12, loop: false, file: "Greatsword Skeleton-Attack03.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Greatsword Skeleton-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Greatsword Skeleton-Death.png" },
  }, {
    attack_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Greatsword Skeleton", "Greatsword Skeleton-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 12, fps: 12, loop: false, file: getEffectPath("Greatsword Skeleton", "Greatsword Skeleton-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 8, fps: 12, loop: false, file: getEffectPath("Greatsword Skeleton", "Greatsword Skeleton-Attack03_Effect.png"), type: "impact" },
  }),
  "Knight": grudgeSprite("Knight", "Knight", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Knight-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Knight-Walk.png" },
    attack: { frameCount: 7, fps: 12, loop: false, file: "Knight-Attack01.png" },
    attack2: { frameCount: 7, fps: 12, loop: false, file: "Knight-Attack02.png" },
    attack3: { frameCount: 7, fps: 12, loop: false, file: "Knight-Attack03.png" },
    block: { frameCount: 4, fps: 8, loop: false, file: "Knight-Block.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Knight-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Knight-Death.png" },
  }, {
    attack_effect: { frameCount: 7, fps: 12, loop: false, file: getEffectPath("Knight", "Knight-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 10, fps: 12, loop: false, file: getEffectPath("Knight", "Knight-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 11, fps: 12, loop: false, file: getEffectPath("Knight", "Knight-Attack03_Effect.png"), type: "impact" },
  }),
  "Knight Templar": grudgeSprite("Knight Templar", "Knight Templar", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Knight Templar-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Knight Templar-Walk01.png" },
    walk2: { frameCount: 8, fps: 10, loop: true, file: "Knight Templar-Walk02.png" },
    attack: { frameCount: 7, fps: 12, loop: false, file: "Knight Templar-Attack01.png" },
    attack2: { frameCount: 7, fps: 12, loop: false, file: "Knight Templar-Attack02.png" },
    attack3: { frameCount: 7, fps: 12, loop: false, file: "Knight Templar-Attack03.png" },
    block: { frameCount: 4, fps: 8, loop: false, file: "Knight Templar-Block.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Knight Templar-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Knight Templar-Death.png" },
  }, {
    attack_effect: { frameCount: 7, fps: 12, loop: false, file: getEffectPath("Knight Templar", "Knight Templar-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 8, fps: 12, loop: false, file: getEffectPath("Knight Templar", "Knight Templar-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 11, fps: 12, loop: false, file: getEffectPath("Knight Templar", "Knight Templar-Attack03_Effect.png"), type: "impact" },
  }),
  "Lancer": grudgeSprite("Lancer", "Lancer", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Lancer-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Lancer-Walk01.png" },
    walk2: { frameCount: 8, fps: 10, loop: true, file: "Lancer-Walk02.png" },
    attack: { frameCount: 6, fps: 12, loop: false, file: "Lancer-Attack01.png" },
    attack2: { frameCount: 6, fps: 12, loop: false, file: "Lancer-Attack02.png" },
    attack3: { frameCount: 6, fps: 12, loop: false, file: "Lancer-Attack03.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Lancer-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Lancer-Death.png" },
  }, {
    attack_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Lancer", "Lancer-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Lancer", "Lancer-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 8, fps: 12, loop: false, file: getEffectPath("Lancer", "Lancer-Attack03_Effect.png"), type: "impact" },
  }),
  "Orc": grudgeSprite("Orc", "Orc", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Orc-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Orc-Walk.png" },
    attack: { frameCount: 6, fps: 12, loop: false, file: "Orc-Attack01.png" },
    attack2: { frameCount: 6, fps: 12, loop: false, file: "Orc-Attack02.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Orc-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Orc-Death.png" },
  }, {
    attack_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Orc", "Orc-attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Orc", "Orc-attack02_Effect.png"), type: "impact" },
  }),
  "Orc rider": grudgeSprite("Orc rider", "Orc Rider", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Orc rider-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Orc rider-Walk.png" },
    attack: { frameCount: 8, fps: 12, loop: false, file: "Orc rider-Attack01.png" },
    attack2: { frameCount: 8, fps: 12, loop: false, file: "Orc rider-Attack02.png" },
    attack3: { frameCount: 8, fps: 12, loop: false, file: "Orc rider-Attack03.png" },
    block: { frameCount: 4, fps: 8, loop: false, file: "Orc rider-Block.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Orc rider-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Orc rider-Death.png" },
  }, {
    attack_effect: { frameCount: 8, fps: 12, loop: false, file: getEffectPath("Orc rider", "Orc rider-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Orc rider", "Orc rider-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 11, fps: 12, loop: false, file: getEffectPath("Orc rider", "Orc rider-Attack03_Effect.png"), type: "impact" },
  }),
  "Priest": grudgeSprite("Priest", "Priest", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Priest-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Priest-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Priest-Attack.png" },
    cast: { frameCount: 9, fps: 12, loop: false, file: "Priest-Attack.png" },
    heal: { frameCount: 6, fps: 10, loop: false, file: "Priest-Heal.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Priest-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Priest-Death.png" },
  }, {
    cast_effect: { frameCount: 9, fps: 12, loop: false, file: getProjectilePath("Priest", "Priest-Attack_Effect.png"), type: "projectile", travelSpeed: 300 },
    heal_effect: { frameCount: 6, fps: 10, loop: false, file: getProjectilePath("Priest", "Priest-Heal_Effect.png"), type: "aoe" },
  }),
  "Skeleton": grudgeSprite("Skeleton", "Skeleton", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Skeleton-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Skeleton-Walk.png" },
    attack: { frameCount: 6, fps: 12, loop: false, file: "Skeleton-Attack01.png" },
    attack2: { frameCount: 6, fps: 12, loop: false, file: "Skeleton-Attack02.png" },
    block: { frameCount: 4, fps: 8, loop: false, file: "Skeleton-Block.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Skeleton-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Skeleton-Death.png" },
  }, {
    attack_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Skeleton", "Skeleton-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 7, fps: 12, loop: false, file: getEffectPath("Skeleton", "Skeleton-Attack02_Effect.png"), type: "impact" },
  }),
  "Skeleton Archer": grudgeSprite("Skeleton Archer", "Skeleton Archer", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Skeleton Archer-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Skeleton Archer-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Skeleton Archer-Attack.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Skeleton Archer-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Skeleton Archer-Death.png" },
  }, {
    attack_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Skeleton Archer", "Skeleton Archer-Attack_Effect.png"), type: "projectile", travelSpeed: 400 },
  }),
  "Slime": grudgeSprite("Slime", "Slime", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Slime-Idle.png" },
    walk: { frameCount: 6, fps: 10, loop: true, file: "Slime-Walk.png" },
    attack: { frameCount: 6, fps: 12, loop: false, file: "Slime-Attack01.png" },
    attack2: { frameCount: 6, fps: 12, loop: false, file: "Slime-Attack02.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Slime-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Slime-Death.png" },
  }, {
    attack_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Slime", "Slime-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 12, fps: 12, loop: false, file: getEffectPath("Slime", "Slime-Attack02_Effect.png"), type: "impact" },
  }),
  "Soldier": grudgeSprite("Soldier", "Soldier", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Soldier-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Soldier-Walk.png" },
    attack: { frameCount: 6, fps: 12, loop: false, file: "Soldier-Attack01.png" },
    attack2: { frameCount: 6, fps: 12, loop: false, file: "Soldier-Attack02.png" },
    attack3: { frameCount: 6, fps: 12, loop: false, file: "Soldier-Attack03.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Soldier-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Soldier-Death.png" },
  }, {
    attack_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Soldier", "Soldier-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 6, fps: 12, loop: false, file: getEffectPath("Soldier", "Soldier-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Soldier", "Soldier-Attack03_Effect.png"), type: "impact" },
  }),
  "Swordsman": grudgeSprite("Swordsman", "Swordsman", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Swordsman-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Swordsman-Walk.png" },
    attack: { frameCount: 7, fps: 12, loop: false, file: "Swordsman-Attack01.png" },
    attack2: { frameCount: 7, fps: 12, loop: false, file: "Swordsman-Attack02.png" },
    attack3: { frameCount: 7, fps: 12, loop: false, file: "Swordsman-Attack3.png" },
    hurt: { frameCount: 5, fps: 8, loop: false, file: "Swordsman-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Swordsman-Death.png" },
  }, {
    attack_effect: { frameCount: 7, fps: 12, loop: false, file: getEffectPath("Swordsman", "Swordsman-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 15, fps: 12, loop: false, file: getEffectPath("Swordsman", "Swordsman-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 12, fps: 12, loop: false, file: getEffectPath("Swordsman", "Swordsman-Attack3_Effect.png"), type: "impact" },
  }),
  "Werebear": grudgeSprite("Werebear", "Werebear", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Werebear-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Werebear-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Werebear-Attack01.png" },
    attack2: { frameCount: 9, fps: 12, loop: false, file: "Werebear-Attack02.png" },
    attack3: { frameCount: 9, fps: 12, loop: false, file: "Werebear-Attack03.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Werebear-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Werebear-Death.png" },
  }, {
    attack_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Werebear", "Werebear-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 13, fps: 12, loop: false, file: getEffectPath("Werebear", "Werebear-Attack02_Effect.png"), type: "impact" },
    attack3_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Werebear", "Werebear-Attack03_Effect.png"), type: "impact" },
  }),
  "Werewolf": grudgeSprite("Werewolf", "Werewolf", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Werewolf-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Werewolf-Walk.png" },
    attack: { frameCount: 9, fps: 12, loop: false, file: "Werewolf-Attack01.png" },
    attack2: { frameCount: 9, fps: 12, loop: false, file: "Werewolf-Attack02.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Werewolf-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Werewolf-Death.png" },
  }, {
    attack_effect: { frameCount: 9, fps: 12, loop: false, file: getEffectPath("Werewolf", "Werewolf-Attack01_Effect.png"), type: "impact" },
    attack2_effect: { frameCount: 13, fps: 12, loop: false, file: getEffectPath("Werewolf", "Werewolf-Attack02_Effect.png"), type: "impact" },
  }),
  "Wizard": grudgeSprite("Wizard", "Wizard", {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Wizard-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Wizard-Walk.png" },
    attack: { frameCount: 6, fps: 10, loop: false, file: "Wizard-Attack01.png" },
    attack2: { frameCount: 6, fps: 10, loop: false, file: "Wizard-Attack02.png" },
    cast: { frameCount: 6, fps: 10, loop: false, file: "Wizard-Attack01.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Wizard-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Wizard-DEATH.png" },
  }, {
    attack_effect: { frameCount: 10, fps: 10, loop: false, file: getEffectPath("Wizard", "Wizard-Attack01_Effect.png"), type: "projectile", travelSpeed: 350 },
    attack2_effect: { frameCount: 7, fps: 10, loop: false, file: getEffectPath("Wizard", "Wizard-Attack02_Effect.png"), type: "projectile", travelSpeed: 350 },
    cast_effect: { frameCount: 10, fps: 10, loop: false, file: getEffectPath("Wizard", "Wizard-Attack01_Effect.png"), type: "projectile", travelSpeed: 350 },
  }),
  
  "Vampire_Girl": {
    id: "Vampire_Girl",
    name: "Vampire Fledgling",
    basePath: assetUrl("/sprites/enemies/vampire/Vampire_Girl"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 5, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 10, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Converted_Vampire": {
    id: "Converted_Vampire",
    name: "Converted Vampire",
    basePath: assetUrl("/sprites/enemies/vampire/Converted_Vampire"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 5, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 10, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Countess_Vampire": {
    id: "Countess_Vampire",
    name: "Countess Valdara",
    basePath: assetUrl("/sprites/enemies/vampire/Countess_Vampire"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 5, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack_1.png" },
      cast: { frameCount: 5, fps: 10, loop: false, file: "Blood_Charge_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 10, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Satyr_1": {
    id: "Satyr_1",
    name: "Satyr Warrior",
    basePath: assetUrl("/sprites/rpg/satyr/Satyr_1"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 7, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack.png" },
      cast: { frameCount: 4, fps: 10, loop: false, file: "Charge.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Satyr_2": {
    id: "Satyr_2",
    name: "Satyr Shaman",
    basePath: assetUrl("/sprites/rpg/satyr/Satyr_2"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 7, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack.png" },
      cast: { frameCount: 4, fps: 10, loop: false, file: "Charge.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Satyr_3": {
    id: "Satyr_3",
    name: "Satyr Elder",
    basePath: assetUrl("/sprites/rpg/satyr/Satyr_3"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 7, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack.png" },
      cast: { frameCount: 4, fps: 10, loop: false, file: "Charge.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Shinobi": {
    id: "Shinobi",
    name: "Shinobi Assassin",
    basePath: assetUrl("/sprites/rpg/shinobi/Shinobi"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 6, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Samurai": {
    id: "Samurai",
    name: "Samurai Warrior",
    basePath: assetUrl("/sprites/rpg/shinobi/Samurai"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 6, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Fighter": {
    id: "Fighter",
    name: "Fighter",
    basePath: assetUrl("/sprites/rpg/shinobi/Fighter"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 6, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 8, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 8, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 4, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 3, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 3, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Black_Werewolf": {
    id: "Black_Werewolf",
    name: "Shadow Worg (Legion)",
    basePath: assetUrl("/sprites/rpg/werewolf/Black_Werewolf"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 8, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 11, fps: 10, loop: true, file: "walk.png" },
      run: { frameCount: 9, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 2, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Red_Werewolf": {
    id: "Red_Werewolf",
    name: "Blood Worg (Crusade)",
    basePath: assetUrl("/sprites/rpg/werewolf/Red_Werewolf"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 8, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 11, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 9, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 2, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "White_Werewolf": {
    id: "White_Werewolf",
    name: "Frost Worg (Fabled)",
    basePath: assetUrl("/sprites/rpg/werewolf/White_Werewolf"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 8, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 11, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 9, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 2, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Knight_1": {
    id: "Knight_1",
    name: "Knight Captain",
    basePath: assetUrl("/sprites/rpg/knight/Knight_1"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 4, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 8, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 7, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack 1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
      block: { frameCount: 5, fps: 8, loop: false, file: "Defend.png" },
    }
  },
  
  "Knight_2": {
    id: "Knight_2",
    name: "Knight Champion",
    basePath: assetUrl("/sprites/rpg/knight/Knight_2"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 4, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 8, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 7, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack 1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
      block: { frameCount: 5, fps: 8, loop: false, file: "Defend.png" },
    }
  },
  
  "Knight_3": {
    id: "Knight_3",
    name: "Knight Commander",
    basePath: assetUrl("/sprites/rpg/knight/Knight_3"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 4, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 8, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 7, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack 1.png" },
      hurt: { frameCount: 2, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
      block: { frameCount: 5, fps: 8, loop: false, file: "Defend.png" },
    }
  },
  
  "Fire_Spirit": {
    id: "Fire_Spirit",
    name: "Fire Spirit",
    basePath: assetUrl("/sprites/enemies/fantasy/Fire_Spirit"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 6, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 8, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 8, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 6, fps: 12, loop: false, file: "Attack.png" },
      cast: { frameCount: 8, fps: 10, loop: false, file: "Charge.png" },
      hurt: { frameCount: 3, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 6, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Plent": {
    id: "Plent",
    name: "Poison Plant",
    basePath: assetUrl("/sprites/enemies/fantasy/Plent"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 5, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 6, fps: 10, loop: true, file: "Walk.png" },
      attack: { frameCount: 5, fps: 12, loop: false, file: "Attack_1.png" },
      cast: { frameCount: 6, fps: 10, loop: false, file: "Poison.png" },
      hurt: { frameCount: 3, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 5, fps: 8, loop: false, file: "Dead.png" },
    }
  },
  
  "Fantasy_Skeleton": {
    id: "Fantasy_Skeleton",
    name: "Skeleton Warrior",
    basePath: assetUrl("/sprites/enemies/fantasy/Skeleton"),
    frameWidth: 128,
    frameHeight: 128,
    tintable: false,
    animations: {
      idle: { frameCount: 7, fps: 8, loop: true, file: "Idle.png" },
      walk: { frameCount: 7, fps: 10, loop: true, file: "Walk.png" },
      run: { frameCount: 8, fps: 12, loop: true, file: "Run.png" },
      attack: { frameCount: 4, fps: 12, loop: false, file: "Attack_1.png" },
      hurt: { frameCount: 3, fps: 8, loop: false, file: "Hurt.png" },
      death: { frameCount: 5, fps: 8, loop: false, file: "Dead.png" },
    }
  },
};

const DEFAULT_ANIMATIONS: Record<AnimationState, SpriteAnimation> = {
  // ─── Locomotion ────────────────────────────────────────────────────
  idle:       { frameCount: 6, fps: 8,  loop: true,  file: "Idle.png" },
  walk:       { frameCount: 8, fps: 10, loop: true,  file: "Walk.png" },
  walk2:      { frameCount: 8, fps: 10, loop: true,  file: "Walk02.png" },
  run:        { frameCount: 8, fps: 12, loop: true,  file: "Walk.png" },
  jump:       { frameCount: 6, fps: 12, loop: false, file: "Jump.png" },
  swim:       { frameCount: 8, fps: 8,  loop: true,  file: "Swim.png" },
  climb:      { frameCount: 6, fps: 8,  loop: true,  file: "Climb.png" },
  turn:       { frameCount: 4, fps: 10, loop: false, file: "Turn.png" },
  getup:      { frameCount: 6, fps: 10, loop: false, file: "GetUp.png" },
  dodge:      { frameCount: 6, fps: 14, loop: false, file: "Dodge.png" },
  roll:       { frameCount: 8, fps: 14, loop: false, file: "Roll.png" },
  // ─── Movement variants ────────────────────────────────────────────
  move1:      { frameCount: 8, fps: 10, loop: true,  file: "Move01.png" },
  move2:      { frameCount: 8, fps: 10, loop: true,  file: "Move02.png" },
  move3:      { frameCount: 8, fps: 12, loop: true,  file: "Move03.png" },
  move4:      { frameCount: 8, fps: 12, loop: true,  file: "Move04.png" },
  // ─── Attacks ──────────────────────────────────────────────────────
  attack:     { frameCount: 6, fps: 12, loop: false, file: "Attack01.png" },
  attack2:    { frameCount: 6, fps: 12, loop: false, file: "Attack02.png" },
  attack3:    { frameCount: 6, fps: 12, loop: false, file: "Attack03.png" },
  attack4:    { frameCount: 6, fps: 12, loop: false, file: "Attack04.png" },
  // ─── Class skills ─────────────────────────────────────────────────
  class1:     { frameCount: 8, fps: 12, loop: false, file: "Class01.png" },
  class2:     { frameCount: 8, fps: 12, loop: false, file: "Class02.png" },
  class3:     { frameCount: 8, fps: 12, loop: false, file: "Class03.png" },
  // ─── Special / magic ──────────────────────────────────────────────
  special:    { frameCount: 8, fps: 10, loop: false, file: "Special.png" },
  cast:       { frameCount: 6, fps: 10, loop: false, file: "Cast.png" },
  heal:       { frameCount: 6, fps: 10, loop: false, file: "Heal.png" },
  // ─── Air attack ───────────────────────────────────────────────────
  jumpattack: { frameCount: 6, fps: 14, loop: false, file: "JumpAttack.png" },
  // ─── Visual effects (one-shot) ────────────────────────────────────
  effect1:    { frameCount: 8, fps: 12, loop: false, file: "Effect01.png" },
  effect2:    { frameCount: 8, fps: 12, loop: false, file: "Effect02.png" },
  effect3:    { frameCount: 8, fps: 12, loop: false, file: "Effect03.png" },
  effect4:    { frameCount: 8, fps: 12, loop: false, file: "Effect04.png" },
  // ─── Auras (looping overlay) ──────────────────────────────────────
  aura1:      { frameCount: 6, fps: 8,  loop: true,  file: "Aura01.png" },
  aura2:      { frameCount: 6, fps: 8,  loop: true,  file: "Aura02.png" },
  // ─── Defense ──────────────────────────────────────────────────────
  block:      { frameCount: 4, fps: 8,  loop: false, file: "Block.png" },
  parry:      { frameCount: 4, fps: 16, loop: false, file: "Parry.png" },
  // ─── Damage / death ───────────────────────────────────────────────
  hurt:       { frameCount: 4, fps: 8,  loop: false, file: "Hurt.png" },
  death:      { frameCount: 4, fps: 8,  loop: false, file: "Death.png" },
};

export const FALLBACK_UNIT: SpriteUnit = {
  id: "fallback",
  name: "Unknown",
  basePath: `${GRUDGE_BASE}/Knight/Knight`,
  frameWidth: 100,
  frameHeight: 100,
  tintable: true,
  defaultTint: "grayscale(0.5)",
  animations: {
    idle: { frameCount: 6, fps: 8, loop: true, file: "Knight-Idle.png" },
    walk: { frameCount: 8, fps: 10, loop: true, file: "Knight-Walk.png" },
    attack: { frameCount: 7, fps: 12, loop: false, file: "Knight-Attack01.png" },
    block: { frameCount: 4, fps: 8, loop: false, file: "Knight-Block.png" },
    hurt: { frameCount: 4, fps: 8, loop: false, file: "Knight-Hurt.png" },
    death: { frameCount: 4, fps: 8, loop: false, file: "Knight-Death.png" },
  }
};

export function getSpriteUnit(id: string): SpriteUnit {
  return SPRITE_MANIFEST[id] || FALLBACK_UNIT;
}

export function getAvailableAnimations(id: string): AnimationState[] {
  const unit = getSpriteUnit(id);
  return Object.keys(unit.animations) as AnimationState[];
}

/**
 * Returns all "action" animations available on a sprite unit
 * (attacks, class skills, special, magic, air attacks).
 * States that aren't defined on the sprite are omitted — n/a is safe.
 */
export function getAttackAnimations(id: string): AnimationState[] {
  const unit = getSpriteUnit(id);
  const actionTypes: AnimationState[] = [
    // Attacks
    "attack", "attack2", "attack3", "attack4",
    // Class skills
    "class1", "class2", "class3",
    // Special / magic
    "special", "cast", "heal",
    // Air
    "jumpattack",
    // Movement variants
    "move1", "move2", "move3", "move4",
    // Visual effects
    "effect1", "effect2", "effect3", "effect4",
    // Auras
    "aura1", "aura2",
    // Mobility actions
    "jump", "dodge", "roll",
    // Defense
    "parry",
  ];
  return actionTypes.filter(anim => unit.animations[anim] !== undefined);
}

export function getEffectForAnimation(id: string, animState: AnimationState): EffectAnimation | null {
  const unit = getSpriteUnit(id);
  if (!unit.effects) return null;
  
  const effectMap: Partial<Record<AnimationState, EffectType>> = {
    attack:     "attack_effect",
    attack2:    "attack2_effect",
    attack3:    "attack3_effect",
    attack4:    "attack3_effect",  // reuse attack3 effect until attack4_effect exists
    class1:     "attack_effect",
    class2:     "attack2_effect",
    class3:     "attack3_effect",
    special:    "attack3_effect",
    cast:       "cast_effect",
    heal:       "heal_effect",
    jumpattack: "attack_effect",
    parry:      "attack_effect",
  };
  
  const effectType = effectMap[animState];
  return unit.effects[effectType] || null;
}

export function hasEffect(id: string, animState: AnimationState): boolean {
  return getEffectForAnimation(id, animState) !== null;
}

/**
 * Cascade fallback chains for animations.
 * When a sprite doesn't have the requested state, try each fallback in
 * order before giving up to idle.
 *
 * Rule: always fall back to a simpler / lower-numbered version first.
 *   attack4 → attack3 → attack2 → attack
 *   class3  → class2  → class1  → special → attack
 *   etc.
 */
const ANIMATION_FALLBACKS: Partial<Record<AnimationState, AnimationState[]>> = {
  // ─── Attacks: cascade down to attack1 ─────────────────────────────
  attack4:    ["attack3", "attack2", "attack"],
  attack3:    ["attack2", "attack"],
  attack2:    ["attack"],
  // ─── Class skills: cascade down, then try special / attack ────────
  class3:     ["class2", "class1", "special", "attack"],
  class2:     ["class1", "special", "attack"],
  class1:     ["special", "attack"],
  // ─── Special / magic ───────────────────────────────────────────────
  special:    ["cast", "attack"],
  heal:       ["cast"],
  // ─── Visual effects: cascade down to effect1, then special/cast ───
  effect4:    ["effect3", "effect2", "effect1", "special", "cast"],
  effect3:    ["effect2", "effect1", "special", "cast"],
  effect2:    ["effect1", "special", "cast"],
  effect1:    ["special", "cast"],
  // ─── Auras: cascade down, then idle (auras loop) ──────────────────
  aura2:      ["aura1"],
  aura1:      [],   // shows idle if missing
  // ─── Air ───────────────────────────────────────────────────────────
  jumpattack: ["attack", "jump"],
  jump:       ["run"],
  // ─── Defense ───────────────────────────────────────────────────────
  parry:      ["block"],
  block:      [],
  // ─── Movement variants: cascade down to walk ──────────────────────
  move4:      ["move3", "move2", "move1", "run", "walk"],
  move3:      ["move2", "move1", "run", "walk"],
  move2:      ["move1", "run", "walk"],
  move1:      ["run", "walk"],
  // ─── Mobility ──────────────────────────────────────────────────────
  dodge:      ["roll", "run"],
  roll:       ["dodge", "run"],
  run:        ["walk"],
  walk2:      ["walk"],
  swim:       ["walk"],
  climb:      ["walk"],
  turn:       [],
  getup:      ["hurt"],
  // ─── Damage — these should always exist, but just in case ─────────
  hurt:       [],
  death:      [],
};

/**
 * Resolve the best available animation for a unit + requested state.
 *
 * 1. Return the animation if the unit has it directly.
 * 2. Walk ANIMATION_FALLBACKS in order — return the first one found.
 * 3. Fall back to idle as a last resort.
 *
 * This means requesting "attack4" on a sprite that only has attack2
 * will silently show attack2 instead of a broken frame.
 */
export function getAnimation(unit: SpriteUnit, state: AnimationState): SpriteAnimation {
  // 1. Direct hit
  if (unit.animations[state]) return unit.animations[state]!;

  // 2. Walk the fallback chain
  const chain = ANIMATION_FALLBACKS[state] ?? [];
  for (const fallback of chain) {
    if (unit.animations[fallback]) return unit.animations[fallback]!;
  }

  // 3. Idle as ultimate fallback
  return unit.animations.idle ?? DEFAULT_ANIMATIONS.idle;
}

const spriteUrlCache: Map<string, string> = new Map();

export function setSpriteUrlOverride(localPath: string, objectStorageUrl: string): void {
  spriteUrlCache.set(localPath, objectStorageUrl);
}

export function clearSpriteUrlCache(): void {
  spriteUrlCache.clear();
}

export function getSpriteSheetPath(unit: SpriteUnit, animation: SpriteAnimation): string {
  const file = animation.file || `${unit.id}-Idle.png`;
  const fullPath = `${unit.basePath}/${file}`;
  const encodedPath = encodeURI(fullPath);
  
  const cachedUrl = spriteUrlCache.get(fullPath) || spriteUrlCache.get(encodedPath);
  if (cachedUrl) {
    return cachedUrl;
  }
  
  return encodedPath;
}

export const COLOR_PALETTES = {
  default: "",
  fire: "sepia(1) hue-rotate(-10deg) saturate(2)",
  ice: "hue-rotate(180deg) saturate(1.5) brightness(1.2)",
  poison: "hue-rotate(90deg) saturate(1.5)",
  shadow: "brightness(0.5) contrast(1.5)",
  holy: "brightness(1.3) saturate(0.5) sepia(0.3)",
  blood: "sepia(1) hue-rotate(-30deg) saturate(2.5)",
  nature: "hue-rotate(60deg) saturate(1.3)",
  arcane: "hue-rotate(270deg) saturate(1.8)",
  // Extended palette for character variety
  crimson: "sepia(1) hue-rotate(-20deg) saturate(1.8) brightness(0.9)",
  ocean: "hue-rotate(200deg) saturate(1.4) brightness(1.1)",
  golden: "sepia(0.8) saturate(1.6) brightness(1.15)",
  void: "hue-rotate(260deg) saturate(1.2) brightness(0.7)",
  ember: "sepia(0.7) hue-rotate(10deg) saturate(2.2) brightness(1.05)",
  frost: "hue-rotate(190deg) saturate(1.1) brightness(1.3)",
};

export type ColorPalette = keyof typeof COLOR_PALETTES;

const PALETTE_KEYS = Object.keys(COLOR_PALETTES).filter(k => k !== 'default') as ColorPalette[];

/**
 * Get a deterministic color palette for a character based on their ID.
 * Same character always gets the same tint, providing visual variety
 * without random shifts between sessions.
 */
export function getCharacterPalette(characterId: string): ColorPalette {
  let hash = 0;
  for (let i = 0; i < characterId.length; i++) {
    hash = ((hash << 5) - hash) + characterId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit int
  }
  const index = Math.abs(hash) % PALETTE_KEYS.length;
  return PALETTE_KEYS[index];
}
