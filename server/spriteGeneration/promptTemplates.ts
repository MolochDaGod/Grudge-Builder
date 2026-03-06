export interface SpritePromptConfig {
  characterDescription: string;
  animationType: string;
  direction: string;
  frameCount: number;
  frameIndex?: number;
  weaponType?: string;
  spellType?: string;
  style?: string;
}

const ANIMATION_MOTION_DESCRIPTIONS: Record<string, string> = {
  Idle:
    "standing still in a relaxed ready stance, subtle breathing motion, weight evenly distributed",
  Walk:
    "walking with natural gait, arms swinging opposite to legs, smooth stepping motion",
  Run: "running at full speed, dynamic leg motion, arms pumping, slight forward lean",
  Jump:
    "jumping sequence: crouch preparation, ascending with arms up, peak height pose, descending, landing impact",
  Rotate:
    "turning in place, rotating body to face different directions smoothly",
  Interact:
    "reaching forward with hands, picking up or manipulating an object, engaged posture",
  Attack:
    "combat attack sequence: wind-up stance, weapon swing motion, follow-through, return to ready",
  Spell:
    "spellcasting sequence: gathering energy pose, arms raised channeling magic, casting release, magical afterglow",
};

const WEAPON_DESCRIPTIONS: Record<string, string> = {
  axe: "wielding a heavy battle axe with wooden handle and iron head",
  sword: "wielding a straight longsword with crossguard",
  dual: "wielding two short blades, one in each hand",
  bow: "holding a wooden recurve bow with arrow nocked",
  staff: "holding a wooden magical staff with glowing crystal top",
  mace: "wielding a flanged mace with spiked head",
  spear: "holding a long spear with iron tip",
  unarmed: "bare fisted in fighting stance",
};

const SPELL_EFFECT_DESCRIPTIONS: Record<string, string> = {
  fire: "channeling flames, fire emanating from hands, warm orange glow",
  ice: "casting frost magic, ice crystals forming, blue-white cold aura",
  lightning: "summoning electricity, sparks crackling, yellow-white bolts",
  heal: "healing light, soft green glow, nature energy swirling",
  dark: "dark energy gathering, purple-black shadows, ominous aura",
  arcane: "pure magical energy, multicolored motes, reality distortion",
};

export function buildMasterSystemPrompt(): string {
  return `You are a pixel art sprite generator specializing in 16x32 pixel RPG character sprites.

CRITICAL CONSTRAINTS:
- Output must be EXACTLY 16 pixels wide by 32 pixels tall
- Use limited color palette (16-32 colors maximum)
- Clean pixel edges, no anti-aliasing between colors
- Orthographic top-down RPG perspective (like classic RPGs)
- Transparent background (alpha channel)
- Each frame must show clear distinct pose progression
- Maintain consistent character proportions across all frames

STYLE GUIDELINES:
- Chibi proportions: large head (about 40% of height), compact body
- Clear silhouette readable at small size
- Bold outlines in darker shade of nearby colors
- Simple but expressive face (2-3 pixels for eyes)
- Distinct costume elements that read at pixel scale

SPRITESHEET FORMAT:
When generating multiple frames, arrange horizontally left-to-right
Frame 1 | Frame 2 | Frame 3 | ... in sequence`;
}

export function buildCharacterPrompt(config: SpritePromptConfig): string {
  const motion = ANIMATION_MOTION_DESCRIPTIONS[config.animationType] || "";
  const weapon = config.weaponType
    ? WEAPON_DESCRIPTIONS[config.weaponType] || ""
    : "";
  const spell = config.spellType
    ? SPELL_EFFECT_DESCRIPTIONS[config.spellType] || ""
    : "";

  let prompt = `Generate a 16x32 pixel art RPG character sprite.

CHARACTER: ${config.characterDescription}

ANIMATION: ${config.animationType}
MOTION: ${motion}

DIRECTION: ${config.direction}`;

  if (weapon) {
    prompt += `\nWEAPON: ${weapon}`;
  }

  if (spell) {
    prompt += `\nSPELL EFFECT: ${spell}`;
  }

  prompt += `

FRAME COUNT: ${config.frameCount} frames for complete animation cycle
${config.frameIndex !== undefined ? `SPECIFIC FRAME: Frame ${config.frameIndex + 1} of ${config.frameCount}` : "Generate all frames as horizontal strip"}

OUTPUT: ${config.frameCount > 1 ? `${16 * config.frameCount}x32 pixel spritesheet` : "Single 16x32 pixel sprite"}

Style: ${config.style || "classic 16-bit RPG pixel art, clean edges, limited palette"}`;

  return prompt;
}

export function buildDirectionStripPrompt(
  characterDescription: string,
  animationType: string,
  direction: string,
  frameCount: number,
  weaponType?: string,
  spellType?: string
): string {
  return buildCharacterPrompt({
    characterDescription,
    animationType,
    direction,
    frameCount,
    weaponType,
    spellType,
    style: "classic 16-bit RPG pixel art, chibi proportions, clean pixel edges",
  });
}

export function buildReferenceBasedPrompt(
  referenceDescription: string,
  animationType: string,
  direction: string,
  frameCount: number
): string {
  return `Generate a 16x32 pixel art RPG character sprite based on this reference:

REFERENCE CHARACTER: ${referenceDescription}

Recreate this character as a tiny pixel art sprite with:
- Same costume elements (fur collar, leather armor, boots)
- Same hair color and style
- Same weapon if visible
- Same body type and build

ANIMATION: ${animationType}
DIRECTION: ${direction}
FRAMES: ${frameCount} frames as horizontal strip

OUTPUT SIZE: ${16 * frameCount}x32 pixels total

STYLE: Classic 16-bit RPG pixel art, chibi proportions, limited palette (16-24 colors), clean pixel edges, no anti-aliasing`;
}

export const BARBARIAN_REFERENCE = `Muscular male barbarian warrior with:
- Long brown hair flowing past shoulders
- Full brown beard
- Bare muscular chest and arms
- White fur collar/mantle around shoulders
- Leather wrist guards/bracers
- Leather belt with metal buckle
- Brown fur-trimmed leather skirt/kilt
- Brown leather boots with white fur trim
- Carrying a hand axe
- Tanned/bronzed skin tone
- Fierce but noble expression`;

export function getBarbarian16x32Prompt(
  animationType: string,
  direction: string,
  frameCount: number,
  weaponType: string = "axe"
): string {
  return buildCharacterPrompt({
    characterDescription: BARBARIAN_REFERENCE,
    animationType,
    direction,
    frameCount,
    weaponType,
    style:
      "16-bit pixel art, chibi RPG style, limited palette, clean pixel edges",
  });
}
