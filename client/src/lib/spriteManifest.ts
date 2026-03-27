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

export type AnimationState = "idle" | "walk" | "walk2" | "run" | "attack" | "attack2" | "attack3" | "cast" | "heal" | "hurt" | "death" | "block";

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
  idle: { frameCount: 6, fps: 8, loop: true, file: "Idle.png" },
  walk: { frameCount: 8, fps: 10, loop: true, file: "Walk.png" },
  walk2: { frameCount: 8, fps: 10, loop: true, file: "Walk02.png" },
  run: { frameCount: 8, fps: 12, loop: true, file: "Walk.png" },
  attack: { frameCount: 6, fps: 12, loop: false, file: "Attack01.png" },
  attack2: { frameCount: 6, fps: 12, loop: false, file: "Attack02.png" },
  attack3: { frameCount: 6, fps: 12, loop: false, file: "Attack03.png" },
  cast: { frameCount: 6, fps: 10, loop: false, file: "Cast.png" },
  heal: { frameCount: 6, fps: 10, loop: false, file: "Heal.png" },
  hurt: { frameCount: 4, fps: 8, loop: false, file: "Hurt.png" },
  death: { frameCount: 4, fps: 8, loop: false, file: "Death.png" },
  block: { frameCount: 4, fps: 8, loop: false, file: "Block.png" },
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

export function getAttackAnimations(id: string): AnimationState[] {
  const unit = getSpriteUnit(id);
  const attackTypes: AnimationState[] = ["attack", "attack2", "attack3", "cast", "heal"];
  return attackTypes.filter(anim => unit.animations[anim] !== undefined);
}

export function getEffectForAnimation(id: string, animState: AnimationState): EffectAnimation | null {
  const unit = getSpriteUnit(id);
  if (!unit.effects) return null;
  
  const effectMap: Record<AnimationState, EffectType> = {
    attack: "attack_effect",
    attack2: "attack2_effect",
    attack3: "attack3_effect",
    cast: "cast_effect",
    heal: "heal_effect",
    idle: "attack_effect",
    walk: "attack_effect",
    walk2: "attack_effect",
    run: "attack_effect",
    hurt: "attack_effect",
    death: "attack_effect",
    block: "attack_effect",
  };
  
  const effectType = effectMap[animState];
  return unit.effects[effectType] || null;
}

export function hasEffect(id: string, animState: AnimationState): boolean {
  return getEffectForAnimation(id, animState) !== null;
}

export function getAnimation(unit: SpriteUnit, state: AnimationState): SpriteAnimation {
  const anim = unit.animations[state];
  if (anim) return anim;
  if (unit.animations.idle) return unit.animations.idle;
  return DEFAULT_ANIMATIONS.idle;
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
};

export type ColorPalette = keyof typeof COLOR_PALETTES;
