import type { EffectVisual, DamageType, AnimationType } from "./types";

export interface AnimationConfig {
  id: string;
  name: string;
  effectVisual: EffectVisual;
  duration: number;
  particleCount: number;
  color: string;
  secondaryColor?: string;
  glowColor?: string;
  intensity: "low" | "medium" | "high";
  soundEffect?: string;
  screenShake?: boolean;
  flashScreen?: boolean;
}

export const DAMAGE_TYPE_TO_EFFECT: Record<DamageType, EffectVisual> = {
  physical: "slash",
  fire: "fire",
  ice: "ice",
  electric: "electric",
  poison: "poison",
  holy: "holy",
  shadow: "shadow",
  nature: "nature",
  arcane: "arcane",
  bleed: "blood"
};

export const ANIMATION_CONFIGS: Record<EffectVisual, AnimationConfig> = {
  slash: {
    id: "anim_slash",
    name: "Slash Effect",
    effectVisual: "slash",
    duration: 0.4,
    particleCount: 3,
    color: "#ff6b6b",
    secondaryColor: "#ffffff",
    glowColor: "#ff4444",
    intensity: "medium",
    screenShake: true
  },
  
  fire: {
    id: "anim_fire",
    name: "Fire Effect",
    effectVisual: "fire",
    duration: 0.8,
    particleCount: 12,
    color: "#ff9500",
    secondaryColor: "#ff5500",
    glowColor: "#ff3300",
    intensity: "high",
    screenShake: true,
    flashScreen: true
  },
  
  ice: {
    id: "anim_ice",
    name: "Ice Effect",
    effectVisual: "ice",
    duration: 0.7,
    particleCount: 8,
    color: "#00d4ff",
    secondaryColor: "#88eeff",
    glowColor: "#00aaff",
    intensity: "medium"
  },
  
  electric: {
    id: "anim_electric",
    name: "Electric Effect",
    effectVisual: "electric",
    duration: 0.4,
    particleCount: 10,
    color: "#ffff00",
    secondaryColor: "#ffffff",
    glowColor: "#ffaa00",
    intensity: "high",
    flashScreen: true
  },
  
  poison: {
    id: "anim_poison",
    name: "Poison Effect",
    effectVisual: "poison",
    duration: 1.0,
    particleCount: 6,
    color: "#00ff88",
    secondaryColor: "#88ff00",
    glowColor: "#00cc44",
    intensity: "low"
  },
  
  holy: {
    id: "anim_holy",
    name: "Holy Effect",
    effectVisual: "holy",
    duration: 0.8,
    particleCount: 8,
    color: "#ffdd00",
    secondaryColor: "#ffffff",
    glowColor: "#ffee88",
    intensity: "high"
  },
  
  shadow: {
    id: "anim_shadow",
    name: "Shadow Effect",
    effectVisual: "shadow",
    duration: 0.6,
    particleCount: 8,
    color: "#6600cc",
    secondaryColor: "#000000",
    glowColor: "#440088",
    intensity: "medium"
  },
  
  nature: {
    id: "anim_nature",
    name: "Nature Effect",
    effectVisual: "nature",
    duration: 0.7,
    particleCount: 6,
    color: "#22cc22",
    secondaryColor: "#88ff88",
    glowColor: "#00aa00",
    intensity: "low"
  },
  
  arcane: {
    id: "anim_arcane",
    name: "Arcane Effect",
    effectVisual: "arcane",
    duration: 0.5,
    particleCount: 10,
    color: "#aa44ff",
    secondaryColor: "#ff44ff",
    glowColor: "#8800ff",
    intensity: "medium"
  },
  
  blood: {
    id: "anim_blood",
    name: "Blood Effect",
    effectVisual: "blood",
    duration: 0.6,
    particleCount: 8,
    color: "#cc0000",
    secondaryColor: "#880000",
    glowColor: "#ff0000",
    intensity: "medium",
    screenShake: true
  },
  
  crit: {
    id: "anim_crit",
    name: "Critical Hit",
    effectVisual: "crit",
    duration: 0.6,
    particleCount: 12,
    color: "#ff0000",
    secondaryColor: "#ffffff",
    glowColor: "#ff0000",
    intensity: "high",
    screenShake: true,
    flashScreen: true
  },
  
  stun: {
    id: "anim_stun",
    name: "Stun Effect",
    effectVisual: "stun",
    duration: 0.5,
    particleCount: 4,
    color: "#ffff88",
    secondaryColor: "#ffffff",
    glowColor: "#ffff00",
    intensity: "low"
  },
  
  heal: {
    id: "anim_heal",
    name: "Heal Effect",
    effectVisual: "heal",
    duration: 0.8,
    particleCount: 8,
    color: "#00ff00",
    secondaryColor: "#88ff88",
    glowColor: "#00cc00",
    intensity: "medium"
  },
  
  defense: {
    id: "anim_defense",
    name: "Defense Effect",
    effectVisual: "defense",
    duration: 0.6,
    particleCount: 6,
    color: "#4488ff",
    secondaryColor: "#88bbff",
    glowColor: "#2266ff",
    intensity: "low"
  },
  
  buff_attack: {
    id: "anim_buff_attack",
    name: "Attack Buff",
    effectVisual: "buff_attack",
    duration: 0.7,
    particleCount: 6,
    color: "#ff4400",
    secondaryColor: "#ffaa00",
    glowColor: "#ff6600",
    intensity: "medium"
  },
  
  buff_defense: {
    id: "anim_buff_defense",
    name: "Defense Buff",
    effectVisual: "buff_defense",
    duration: 0.7,
    particleCount: 6,
    color: "#0088ff",
    secondaryColor: "#00ccff",
    glowColor: "#0066ff",
    intensity: "medium"
  },
  
  debuff: {
    id: "anim_debuff",
    name: "Debuff Effect",
    effectVisual: "debuff",
    duration: 0.5,
    particleCount: 4,
    color: "#880088",
    secondaryColor: "#440044",
    glowColor: "#660066",
    intensity: "low"
  }
};

export const ANIMATION_TYPE_SPRITES: Record<AnimationType, { frames: number; speed: number }> = {
  slash: { frames: 6, speed: 0.08 },
  thrust: { frames: 5, speed: 0.06 },
  overhead: { frames: 8, speed: 0.10 },
  projectile: { frames: 4, speed: 0.05 },
  beam: { frames: 6, speed: 0.04 },
  explosion: { frames: 10, speed: 0.08 },
  aura: { frames: 8, speed: 0.12 },
  buff: { frames: 6, speed: 0.10 },
  debuff: { frames: 6, speed: 0.10 },
  heal: { frames: 8, speed: 0.10 },
  summon: { frames: 12, speed: 0.08 },
  transform: { frames: 10, speed: 0.12 }
};

export function getAnimationConfig(visual: EffectVisual): AnimationConfig {
  return ANIMATION_CONFIGS[visual];
}

export function getEffectForDamageType(damageType: DamageType): EffectVisual {
  return DAMAGE_TYPE_TO_EFFECT[damageType];
}
