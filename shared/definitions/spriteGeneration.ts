import type { AnimationSlot } from "../schema";

export interface SpriteTraits {
  weapon?: string;
  armor?: string;
  style?: string;
  size?: string;
  features?: string[];
  colors?: { primary?: string; secondary?: string; accent?: string };
}

export interface AnimationConfig {
  enabled: boolean;
  frameCount: number;
  fps: number;
  loop: boolean;
  hasEffect?: boolean;
}

export const DEFAULT_ANIMATIONS: Record<AnimationSlot, AnimationConfig> = {
  idle: { enabled: true, frameCount: 6, fps: 8, loop: true },
  walk: { enabled: true, frameCount: 8, fps: 10, loop: true },
  walk2: { enabled: false, frameCount: 8, fps: 10, loop: true },
  run: { enabled: false, frameCount: 8, fps: 12, loop: true },
  attack: { enabled: true, frameCount: 6, fps: 12, loop: false, hasEffect: true },
  attack2: { enabled: false, frameCount: 6, fps: 12, loop: false, hasEffect: true },
  attack3: { enabled: false, frameCount: 6, fps: 12, loop: false, hasEffect: true },
  cast: { enabled: false, frameCount: 6, fps: 10, loop: false, hasEffect: true },
  heal: { enabled: false, frameCount: 6, fps: 10, loop: false, hasEffect: true },
  hurt: { enabled: true, frameCount: 4, fps: 8, loop: false },
  death: { enabled: true, frameCount: 4, fps: 8, loop: false },
  block: { enabled: false, frameCount: 4, fps: 8, loop: false },
};

export const RACE_DESCRIPTORS: Record<string, string> = {
  human: "human warrior with fair skin",
  orc: "green-skinned muscular orc with tusks",
  elf: "slender elf with pointed ears and elegant features",
  dwarf: "stout bearded dwarf with broad shoulders",
  undead: "skeletal undead with glowing eyes and tattered remains",
  barbarian: "wild barbarian with war paint and tribal markings",
  goblin: "small green goblin with sharp teeth",
  troll: "large troll with regenerating skin and wild hair",
  demon: "demonic creature with horns and dark skin",
  angel: "celestial being with radiant aura",
};

export interface RaceSpriteConfig {
  name: string;
  description: string;
  referenceImage?: string;
  detailedPrompt: string;
  defaultWeapon: string;
  defaultArmor: string;
  defaultStyle: string;
  colors: { primary: string; secondary: string; accent: string };
  features: string[];
}

export const RACE_SPRITE_CONFIGS: Record<string, RaceSpriteConfig> = {
  barbarian: {
    name: "Barbarian",
    description: "Savage tribal warrior with fur and war paint",
    referenceImage: "/sprites/heroes/barbarian/barbside.png",
    detailedPrompt: "muscular barbarian warrior, tribal war paint on face and body, wild unkempt hair, fur cape and loincloth, leather straps and bone ornaments, scarred battle-hardened skin, fierce primal expression, bare chest with tribal tattoos",
    defaultWeapon: "axe",
    defaultArmor: "none",
    defaultStyle: "blood",
    colors: { primary: "#8B4513", secondary: "#654321", accent: "#FF4500" },
    features: ["tribal war paint", "fur cape", "bone jewelry", "battle scars", "wild hair"],
  },
  human: {
    name: "Human",
    description: "Versatile human warrior with balanced features",
    detailedPrompt: "human warrior, fair skin, determined expression, medium build, practical armor, well-maintained weapons, noble bearing",
    defaultWeapon: "sword",
    defaultArmor: "plate",
    defaultStyle: "dark",
    colors: { primary: "#C0C0C0", secondary: "#8B0000", accent: "#FFD700" },
    features: ["fair skin", "determined expression"],
  },
  orc: {
    name: "Orc",
    description: "Green-skinned brutish warrior with tusks",
    detailedPrompt: "massive orc warrior, green skin with darker patches, prominent lower tusks, muscular brutish build, tribal piercings and scars, fierce war cry expression, crude but effective armor",
    defaultWeapon: "axe",
    defaultArmor: "leather",
    defaultStyle: "blood",
    colors: { primary: "#228B22", secondary: "#2F4F4F", accent: "#8B0000" },
    features: ["green skin", "tusks", "tribal piercings", "muscular build"],
  },
  elf: {
    name: "Elf",
    description: "Graceful elven warrior with pointed ears",
    detailedPrompt: "elegant elf warrior, pale luminous skin, long pointed ears, slender athletic build, flowing silver or golden hair, ancient wisdom in eyes, ornate elven armor with nature motifs",
    defaultWeapon: "bow",
    defaultArmor: "leather",
    defaultStyle: "nature",
    colors: { primary: "#C0C0C0", secondary: "#228B22", accent: "#87CEEB" },
    features: ["pointed ears", "flowing hair", "luminous eyes", "slender build"],
  },
  dwarf: {
    name: "Dwarf",
    description: "Stout bearded warrior with masterwork armor",
    detailedPrompt: "stout dwarf warrior, thick braided beard with metal clasps, stocky powerful build, runic masterwork armor, wide stance for stability, proud expression, mining heritage visible",
    defaultWeapon: "hammer",
    defaultArmor: "plate",
    defaultStyle: "fire",
    colors: { primary: "#8B4513", secondary: "#C0C0C0", accent: "#FFD700" },
    features: ["thick beard", "braided hair", "runic armor", "stocky build"],
  },
  undead: {
    name: "Undead",
    description: "Skeletal warrior risen from death",
    detailedPrompt: "skeletal undead warrior, exposed bone and rotting flesh, glowing ethereal eyes, tattered ancient armor, dark necromantic energy, hollow expression, chains and burial cloth",
    defaultWeapon: "scythe",
    defaultArmor: "chain",
    defaultStyle: "shadow",
    colors: { primary: "#2F4F4F", secondary: "#4B0082", accent: "#00FF00" },
    features: ["exposed bones", "glowing eyes", "tattered remains", "ethereal glow"],
  },
  goblin: {
    name: "Goblin",
    description: "Small cunning creature with sharp teeth",
    detailedPrompt: "small goblin warrior, green mottled skin, large pointed ears, sharp jagged teeth, cunning beady eyes, hunched posture, scavenged mismatched armor, sneaky expression",
    defaultWeapon: "dagger",
    defaultArmor: "leather",
    defaultStyle: "shadow",
    colors: { primary: "#6B8E23", secondary: "#8B4513", accent: "#FF6347" },
    features: ["sharp teeth", "large ears", "cunning eyes", "small stature"],
  },
};

export function buildRacePrompt(
  race: string,
  animation: AnimationSlot,
  overrides?: Partial<RaceSpriteConfig>
): string {
  const config = RACE_SPRITE_CONFIGS[race];
  if (!config) {
    return buildPromptFromSpec(race, "warrior", {}, animation);
  }

  const traits: SpriteTraits = {
    weapon: overrides?.defaultWeapon || config.defaultWeapon,
    armor: overrides?.defaultArmor || config.defaultArmor,
    style: overrides?.defaultStyle || config.defaultStyle,
    colors: overrides?.colors || config.colors,
    features: overrides?.features || config.features,
  };

  const animAction = ANIMATION_ACTION_PROMPTS[animation];
  
  const featuresPart = traits.features && traits.features.length > 0 
    ? `, with ${traits.features.join(", ")}` 
    : "";
  const colorsPart = traits.colors 
    ? `, primary color ${traits.colors.primary}, secondary color ${traits.colors.secondary}, accent color ${traits.colors.accent}`
    : "";
    
  return `2D pixel art RPG character sprite sheet, ${config.detailedPrompt}, ${WEAPON_DESCRIPTORS[traits.weapon!] || ""}, ${traits.armor === "none" ? "minimal clothing" : ARMOR_DESCRIPTORS[traits.armor!] || ""}, ${STYLE_DESCRIPTORS[traits.style!] || ""}, side view profile facing right, transparent background, game asset style, 100x100 pixel frame size, clean pixel art, fantasy RPG aesthetic, consistent character design across all frames, ${animAction}${featuresPart}${colorsPart}`.trim();
}

export const CLASS_DESCRIPTORS: Record<string, string> = {
  warrior: "heavily armored warrior stance",
  knight: "noble knight in shining armor",
  mage: "robed mage with magical aura",
  priest: "holy priest with divine symbols",
  ranger: "agile ranger with bow and leather armor",
  rogue: "stealthy rogue in dark leather",
  berserker: "raging berserker with minimal armor",
  paladin: "holy paladin with blessed armor",
  necromancer: "dark necromancer with death magic",
  shaman: "tribal shaman with nature spirits",
};

export const WEAPON_DESCRIPTORS: Record<string, string> = {
  sword: "wielding a longsword",
  axe: "wielding a battle axe",
  mace: "wielding a heavy mace",
  staff: "holding a magical staff",
  bow: "carrying a longbow",
  dagger: "holding twin daggers",
  spear: "carrying a spear",
  hammer: "wielding a warhammer",
  scythe: "wielding a dark scythe",
  fists: "bare-handed fighter stance",
};

export const ARMOR_DESCRIPTORS: Record<string, string> = {
  plate: "wearing heavy plate armor",
  chain: "wearing chainmail armor",
  leather: "wearing leather armor",
  robes: "wearing flowing robes",
  cloth: "wearing cloth garments",
  none: "minimal clothing",
};

export const STYLE_DESCRIPTORS: Record<string, string> = {
  dark: "dark sinister aesthetic with shadows",
  holy: "radiant holy glow with divine light",
  fire: "flames and burning embers aesthetic",
  ice: "frost and ice crystals aesthetic",
  nature: "natural green and earth tones",
  shadow: "shadowy ethereal appearance",
  blood: "crimson blood magic aesthetic",
  arcane: "purple arcane energy aesthetic",
};

export const ANIMATION_ACTION_PROMPTS: Record<AnimationSlot, string> = {
  idle: "standing idle pose, relaxed but alert, breathing animation",
  walk: "walking cycle animation, smooth stride motion",
  walk2: "alternate walking cycle, different gait",
  run: "running cycle animation, dynamic motion",
  attack: "attack swing motion, weapon strike animation",
  attack2: "secondary attack animation, different strike pattern",
  attack3: "third attack combo, powerful finishing blow",
  cast: "spellcasting animation, magical energy gathering",
  heal: "healing animation, restorative energy flowing",
  hurt: "taking damage reaction, pain response animation",
  death: "death fall animation, collapse to ground",
  block: "defensive block stance, shield raised position",
};

export const DEFAULT_PROMPT_BLUEPRINT = {
  name: "Grudge RPG Pixel Art",
  description: "Default prompt template for generating 100x100 pixel art RPG sprites",
  basePrompt: `2D pixel art RPG character sprite sheet, {race} {class}, {weapon}, {armor}, {style}, 
side view profile facing right, transparent background, game asset style,
100x100 pixel frame size, clean pixel art, fantasy RPG aesthetic,
consistent character design across all frames, {animation_action}`,
  negativePrompt: "blurry, 3D, realistic, photo, multiple characters, text, watermark, signature, background scenery",
  styleModifiers: {
    pixelArt: "retro pixel art style, 16-bit era graphics, clean pixels, limited color palette",
    fantasy: "high fantasy art style, detailed shading, rich colors",
    anime: "anime-inspired pixel art, vibrant colors, expressive features",
  },
};

export function buildPromptFromSpec(
  race: string,
  classType: string,
  traits: SpriteTraits,
  animation: AnimationSlot
): string {
  const raceDesc = RACE_DESCRIPTORS[race] || race;
  const classDesc = CLASS_DESCRIPTORS[classType] || classType;
  const weaponDesc = traits.weapon ? WEAPON_DESCRIPTORS[traits.weapon] || traits.weapon : "";
  const armorDesc = traits.armor ? ARMOR_DESCRIPTORS[traits.armor] || traits.armor : "";
  const styleDesc = traits.style ? STYLE_DESCRIPTORS[traits.style] || traits.style : "";
  const animAction = ANIMATION_ACTION_PROMPTS[animation];

  let prompt = DEFAULT_PROMPT_BLUEPRINT.basePrompt
    .replace("{race}", raceDesc)
    .replace("{class}", classDesc)
    .replace("{weapon}", weaponDesc)
    .replace("{armor}", armorDesc)
    .replace("{style}", styleDesc)
    .replace("{animation_action}", animAction);

  if (traits.features && traits.features.length > 0) {
    prompt += `, with ${traits.features.join(", ")}`;
  }

  if (traits.colors) {
    const colorParts = [];
    if (traits.colors.primary) colorParts.push(`primary color ${traits.colors.primary}`);
    if (traits.colors.secondary) colorParts.push(`secondary color ${traits.colors.secondary}`);
    if (traits.colors.accent) colorParts.push(`accent color ${traits.colors.accent}`);
    if (colorParts.length > 0) {
      prompt += `, ${colorParts.join(", ")}`;
    }
  }

  return prompt.trim();
}

export interface SpriteUnitFolderStructure {
  root: string;
  base: string;
  withShadows: string;
  splitEffects: string;
  projectiles?: string;
  shadowSprites: string;
}

export function getSpriteUnitFolderStructure(unitId: string, basePath: string): SpriteUnitFolderStructure {
  const root = `${basePath}/${unitId}`;
  return {
    root,
    base: `${root}/${unitId}`,
    withShadows: `${root}/${unitId} with shadows`,
    splitEffects: `${root}/${unitId}(Split Effects)`,
    shadowSprites: `${root}/${unitId}/Shadow sprites`,
  };
}

export function getSpriteFilename(unitId: string, animation: AnimationSlot): string {
  const animationMap: Record<AnimationSlot, string> = {
    idle: "Idle",
    walk: "Walk",
    walk2: "Walk02",
    run: "Run",
    attack: "Attack01",
    attack2: "Attack02",
    attack3: "Attack03",
    cast: "Cast",
    heal: "Heal",
    hurt: "Hurt",
    death: "Death",
    block: "Block",
  };
  return `${unitId}-${animationMap[animation]}.png`;
}

export function getEffectFilename(unitId: string, animation: AnimationSlot): string {
  const animationMap: Record<AnimationSlot, string> = {
    idle: "Idle",
    walk: "Walk",
    walk2: "Walk02",
    run: "Run",
    attack: "Attack01_Effect",
    attack2: "Attack02_Effect",
    attack3: "Attack03_Effect",
    cast: "Cast_Effect",
    heal: "Heal_Effect",
    hurt: "Hurt",
    death: "Death",
    block: "Block",
  };
  return `${unitId}-${animationMap[animation]}.png`;
}
