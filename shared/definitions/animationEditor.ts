import type { SpellAnimation, SpellAnimationType, DamageElement } from "./spellAnimations";
import type { ClassSkillChoice } from "./classSkillTrees";

export type EffectPresetType = 
  | "spin"
  | "blink"
  | "fadeIn"
  | "fadeOut"
  | "pixelDissolve"
  | "scaleUp"
  | "scaleDown"
  | "shake"
  | "pulse"
  | "colorShift"
  | "flash"
  | "bounce";

export interface EffectPreset {
  id: EffectPresetType;
  name: string;
  description: string;
  defaultDuration: number;
  params: Record<string, number | string | boolean>;
}

export const EFFECT_PRESETS: Record<EffectPresetType, EffectPreset> = {
  spin: {
    id: "spin",
    name: "Spin",
    description: "Rotate continuously",
    defaultDuration: 1000,
    params: { rotations: 1, direction: "clockwise" }
  },
  blink: {
    id: "blink",
    name: "Blink",
    description: "Flash on/off rapidly",
    defaultDuration: 500,
    params: { frequency: 4, minOpacity: 0 }
  },
  fadeIn: {
    id: "fadeIn",
    name: "Fade In",
    description: "Gradually appear",
    defaultDuration: 300,
    params: { startOpacity: 0, endOpacity: 1 }
  },
  fadeOut: {
    id: "fadeOut",
    name: "Fade Out",
    description: "Gradually disappear",
    defaultDuration: 300,
    params: { startOpacity: 1, endOpacity: 0 }
  },
  pixelDissolve: {
    id: "pixelDissolve",
    name: "Pixel Dissolve",
    description: "Break into pixels",
    defaultDuration: 800,
    params: { pixelSize: 4, direction: "random" }
  },
  scaleUp: {
    id: "scaleUp",
    name: "Scale Up",
    description: "Grow larger",
    defaultDuration: 400,
    params: { startScale: 0.5, endScale: 1.5 }
  },
  scaleDown: {
    id: "scaleDown",
    name: "Scale Down",
    description: "Shrink smaller",
    defaultDuration: 400,
    params: { startScale: 1.5, endScale: 0.5 }
  },
  shake: {
    id: "shake",
    name: "Shake",
    description: "Vibrate rapidly",
    defaultDuration: 300,
    params: { intensity: 5, frequency: 30 }
  },
  pulse: {
    id: "pulse",
    name: "Pulse",
    description: "Rhythmic scale pulsing",
    defaultDuration: 600,
    params: { minScale: 0.9, maxScale: 1.1, cycles: 2 }
  },
  colorShift: {
    id: "colorShift",
    name: "Color Shift",
    description: "Tint color transition",
    defaultDuration: 500,
    params: { startColor: "#ffffff", endColor: "#ff0000" }
  },
  flash: {
    id: "flash",
    name: "Flash",
    description: "Quick white flash",
    defaultDuration: 100,
    params: { color: "#ffffff", intensity: 1 }
  },
  bounce: {
    id: "bounce",
    name: "Bounce",
    description: "Bouncy movement",
    defaultDuration: 400,
    params: { height: 20, bounces: 2 }
  }
};

export interface TimelineKeyframe {
  id: string;
  time: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  colorTint?: string;
  effect?: EffectPresetType;
  effectDuration?: number;
  effectParams?: Record<string, number | string | boolean>;
}

export interface AnimationTrack {
  id: string;
  name: string;
  spriteRef: string;
  spritePath: string;
  layer: number;
  startTime: number;
  endTime: number;
  keyframes: TimelineKeyframe[];
  visible: boolean;
  locked: boolean;
}

export type AbilitySourceType = "class" | "weapon" | "magic" | "item";

export interface AdminAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  sourceType: AbilitySourceType;
  sourceId: string;
  classId?: string;
  weaponType?: string;
  element?: DamageElement;
  animationType?: SpellAnimationType;
  tracks: AnimationTrack[];
  duration: number;
  version: number;
  lastModified: number;
}

export interface EditorState {
  selectedAbilityId: string | null;
  selectedTrackId: string | null;
  selectedKeyframeId: string | null;
  playheadTime: number;
  isPlaying: boolean;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface DragItem {
  type: "sprite" | "ability" | "keyframe" | "effect";
  id: string;
  data: unknown;
}

export const WEAPON_CATEGORIES = [
  { id: "sword", name: "Swords", icon: "/icons/weapons/Sword_01.png" },
  { id: "axe", name: "Axes", icon: "/icons/weapons/Axe_01.png" },
  { id: "mace", name: "Maces", icon: "/icons/weapons/Mace_01.png" },
  { id: "dagger", name: "Daggers", icon: "/icons/weapons/Dagger_01.png" },
  { id: "bow", name: "Bows", icon: "/icons/weapons/Bow_01.png" },
  { id: "staff", name: "Staves", icon: "/icons/weapons/Staff_01.png" },
  { id: "wand", name: "Wands", icon: "/icons/weapons/Wand_01.png" },
  { id: "spear", name: "Spears", icon: "/icons/weapons/Spear_01.png" }
] as const;

export function createDefaultKeyframe(time: number): TimelineKeyframe {
  return {
    id: `kf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    time,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1
  };
}

export function createDefaultTrack(name: string, spritePath: string): AnimationTrack {
  return {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    spriteRef: spritePath.split("/").pop() || name,
    spritePath,
    layer: 0,
    startTime: 0,
    endTime: 1000,
    keyframes: [createDefaultKeyframe(0), createDefaultKeyframe(1000)],
    visible: true,
    locked: false
  };
}

export function interpolateKeyframes(
  keyframes: TimelineKeyframe[],
  time: number
): Omit<TimelineKeyframe, "id" | "effect" | "effectParams"> {
  if (keyframes.length === 0) {
    return { time, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  }
  
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  
  if (time <= sorted[0].time) {
    return { ...sorted[0], time };
  }
  
  if (time >= sorted[sorted.length - 1].time) {
    return { ...sorted[sorted.length - 1], time };
  }
  
  let prev = sorted[0];
  let next = sorted[1];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].time <= time && sorted[i + 1].time >= time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }
  
  const t = (time - prev.time) / (next.time - prev.time);
  
  return {
    time,
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
    scale: prev.scale + (next.scale - prev.scale) * t,
    rotation: prev.rotation + (next.rotation - prev.rotation) * t,
    opacity: prev.opacity + (next.opacity - prev.opacity) * t,
    colorTint: next.colorTint || prev.colorTint
  };
}
