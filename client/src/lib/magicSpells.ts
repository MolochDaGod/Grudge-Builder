import { assetUrl } from "@/lib/assetConfig";
export interface MagicSpell {
  id: string;
  name: string;
  element: "fire" | "water";
  type: "arrow" | "ball" | "spell";
  frames: string[];
  frameCount: number;
  animationSpeed: number;
}

const generateFramePaths = (folder: string, prefix: string, count: number): string[] => {
  const frames: string[] = [];
  for (let i = 1; i <= count; i++) {
    const paddedNum = i.toString().padStart(2, "0");
    frames.push(assetUrl(`/sprites/magic/${folder}/${prefix}_Frame_${paddedNum}.png`));
  }
  return frames;
};

export const MAGIC_SPELLS: MagicSpell[] = [
  {
    id: "fire_arrow",
    name: "Fire Arrow",
    element: "fire",
    type: "arrow",
    frames: generateFramePaths("fire_arrow", "Fire Arrow", 8),
    frameCount: 8,
    animationSpeed: 100
  },
  {
    id: "fire_ball",
    name: "Fire Ball",
    element: "fire",
    type: "ball",
    frames: generateFramePaths("fire_ball", "Fire Ball", 8),
    frameCount: 8,
    animationSpeed: 100
  },
  {
    id: "fire_spell",
    name: "Fire Spell",
    element: "fire",
    type: "spell",
    frames: generateFramePaths("fire_spell", "Fire Spell", 8),
    frameCount: 8,
    animationSpeed: 100
  },
  {
    id: "water_arrow",
    name: "Water Arrow",
    element: "water",
    type: "arrow",
    frames: generateFramePaths("water_arrow", "Water Arrow", 9),
    frameCount: 9,
    animationSpeed: 100
  },
  {
    id: "water_ball",
    name: "Water Ball",
    element: "water",
    type: "ball",
    frames: generateFramePaths("water_ball", "Water Ball", 12),
    frameCount: 12,
    animationSpeed: 80
  },
  {
    id: "water_spell",
    name: "Water Spell",
    element: "water",
    type: "spell",
    frames: generateFramePaths("water_spell", "Water Spell", 8),
    frameCount: 8,
    animationSpeed: 100
  }
];

export const getMagicSpell = (id: string): MagicSpell | undefined => {
  return MAGIC_SPELLS.find(spell => spell.id === id);
};

export const getSpellsByElement = (element: "fire" | "water"): MagicSpell[] => {
  return MAGIC_SPELLS.filter(spell => spell.element === element);
};

export const getSpellsByType = (type: "arrow" | "ball" | "spell"): MagicSpell[] => {
  return MAGIC_SPELLS.filter(spell => spell.type === type);
};

export const MAGIC_ICONS = {
  fire: assetUrl("/sprites/magic/icons"),
  water: assetUrl("/sprites/magic/icons")
};
