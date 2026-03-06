export interface SpriteTypeDefinition {
  id: string;
  name: string;
  description: string;
  directional: boolean;
  directions?: string[];
  frameWidth?: number;
  frameHeight?: number;
  animations: string[];
  filePattern: RegExp;
  folderPattern: RegExp;
  usageInstructions: string;
  examplePath?: string;
}

export const SPRITE_TYPES: Record<string, SpriteTypeDefinition> = {
  chibi: {
    id: "chibi",
    name: "Chibi Character",
    description: "Side-scrolling chibi-style characters with extensive animation sets. Single direction facing right.",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Idle Blinking", "Walking", "Running", 
      "Slashing", "Slashing in The Air", "Run Slashing",
      "Throwing", "Throwing in The Air", "Run Throwing",
      "Kicking", "Jump Start", "Jump Loop", "Falling Down",
      "Sliding", "Hurt", "Dying"
    ],
    filePattern: /^(\d+)_([A-Za-z_]+)_([A-Za-z_\s]+)_(\d{3})\.png$/,
    folderPattern: /^chibi-/,
    usageInstructions: `Load from PNG/PNG Sequences/{Animation}/ folder.
Frame naming: {variant}_{CharacterName}_{Animation}_{frame:3d}.png
Example: 0_Skeleton_Warrior_Idle_000.png
Use flip for left-facing. Typical frame rate: 10-12 FPS.`,
    examplePath: "2dassets/chibi-skeleton-warrior/Skeleton_Warrior_1/PNG/PNG Sequences"
  },

  topdown: {
    id: "topdown",
    name: "Top-Down Character",
    description: "4-directional top-down characters with sprite sheets and individual frames.",
    directional: true,
    directions: ["Front", "Back", "Left", "Right"],
    frameWidth: 64,
    frameHeight: 64,
    animations: [
      "Idle", "Idle Blinking", "Walking", "Running",
      "Attacking", "Hurt", "Dying"
    ],
    filePattern: /^([A-Za-z]+)\s*-\s*([A-Za-z\s]+)_(\d+)\.png$/,
    folderPattern: /^(topdown|orc-topdown)/,
    usageInstructions: `Has both PNG Sequences and Spritesheets.
- Spritesheets: "{Direction} - {Animation}.png" (e.g., "Front - Walking.png")
- Sequences: "{Direction} - {Animation}/" folder with numbered frames
Use Spritesheets for efficient loading, Sequences for precise control.`,
    examplePath: "topdown/goblin/Male Goblin/PNG"
  },

  vampire: {
    id: "vampire",
    name: "Vampire Series",
    description: "128x128 vampire character sprites with simple animation strips.",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Walk", "Run", "Jump", "Hurt", "Dead",
      "Attack_1", "Attack_2", "Attack_3", "Attack_4"
    ],
    filePattern: /^([A-Za-z_]+)\.png$/,
    folderPattern: /^(vampire|Vampire_Girl|Countess_Vampire|Converted_Vampire)/,
    usageInstructions: `Single sprite sheet files per animation.
Each file is a horizontal strip of frames.
Load sheet, divide by frame width to get frame count.
Attack animations have numbered variants (Attack_1 through Attack_4).`,
    examplePath: "enemies/vampire/Vampire_Girl"
  },

  wraith: {
    id: "wraith",
    name: "Wraith Series",
    description: "Ethereal wraith characters with multiple color variants.",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Idle Blink", "Walking", "Attacking",
      "Casting Spells", "Hurt", "Dying", "Taunt"
    ],
    filePattern: /^(\d+)_Wraith_(\d+)_([A-Za-z_]+)_(\d{3})\.png$/,
    folderPattern: /^wraith$/,
    usageInstructions: `Multiple variants: Wraith_01, Wraith_02, Wraith_03.
Each variant has own color scheme.
Load from PNG/Wraith_{nn}/PNG Sequences/{Animation}/.
Use for ghost/spirit enemy types.`,
    examplePath: "2dassets/wraith/PNG/Wraith_01/PNG Sequences"
  },

  fantasy: {
    id: "fantasy",
    name: "Fantasy Enemies",
    description: "128x128 fantasy creature sprites (spirits, skeletons, plants).",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Idle_2", "Run", "Attack", "Charge",
      "Shot", "Flame", "Explosion", "Hurt", "Dead"
    ],
    filePattern: /^([A-Za-z_]+)\.png$/,
    folderPattern: /^(Fire_Spirit|Plent|Skeleton)$/,
    usageInstructions: `Sprite sheet files per animation.
Special attacks vary by creature type:
- Fire_Spirit: Flame, Shot, Explosion, Charge
- Skeleton: Standard melee attacks
- Plent: Plant-based attacks`,
    examplePath: "enemies/fantasy/Fire_Spirit"
  },

  hero: {
    id: "hero",
    name: "Hero Race Sprites",
    description: "Large hero sprites with bounding box JSON metadata.",
    directional: false,
    frameWidth: 256,
    frameHeight: 256,
    animations: ["walk", "attack", "death", "magic"],
    filePattern: /^(walk|attack|death|magic)\.png$/,
    folderPattern: /^(human|elf|orc|dwarf|barbarian|undead)$/,
    usageInstructions: `Large sprite sheets with bounding box data.
Load {animation}.png and {animation}_bbox.json together.
bbox.json contains per-frame hitbox coordinates:
{ x, y, width, height, frameIndex, row, col }
Use for precise collision detection.`,
    examplePath: "heroes/human"
  },

  satyr: {
    id: "satyr",
    name: "Satyr Series",
    description: "128x128 satyr characters (Warrior, Shaman, Elder variants).",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Walk", "Run", "Attack_1", "Attack_2",
      "Hurt", "Dead", "Skill"
    ],
    filePattern: /^([A-Za-z_]+)\.png$/,
    folderPattern: /^(Satyr|satyr)/,
    usageInstructions: `Horizontal sprite strips per animation.
Variants: Warrior (melee), Shaman (magic), Elder (boss).
Each sheet is single animation.`,
    examplePath: "enemies/satyr"
  },

  shinobi: {
    id: "shinobi",
    name: "Shinobi Series",
    description: "128x128 ninja/samurai characters.",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Walk", "Run", "Jump", "Attack_1", "Attack_2",
      "Attack_3", "Throw", "Hurt", "Dead"
    ],
    filePattern: /^([A-Za-z_]+)\.png$/,
    folderPattern: /^(Shinobi|Samurai|Fighter)/,
    usageInstructions: `Japanese warrior sprites.
Variants: Shinobi (ninja), Samurai (sword), Fighter (fist).
Throw animation for ranged attacks.`,
    examplePath: "enemies/shinobi"
  },

  werewolf: {
    id: "werewolf",
    name: "Werewolf/Worg Series",
    description: "128x128 werewolf sprites with faction color variants.",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Walk", "Run", "Attack_1", "Attack_2",
      "Howl", "Hurt", "Dead", "Transform"
    ],
    filePattern: /^([A-Za-z_]+)\.png$/,
    folderPattern: /^(werewolf|worg|Shadow_Worg|Blood_Worg|Frost_Worg)/,
    usageInstructions: `Faction-specific variants:
- Shadow_Worg: Legion faction (dark colors)
- Blood_Worg: Crusade faction (red tones)
- Frost_Worg: Fabled faction (blue/white)
Transform animation for shapeshifter class.`,
    examplePath: "enemies/werewolf"
  },

  knight: {
    id: "knight",
    name: "RPG Knight Series",
    description: "128x128 armored knight characters.",
    directional: false,
    frameWidth: 128,
    frameHeight: 128,
    animations: [
      "Idle", "Walk", "Run", "Attack_1", "Attack_2", "Attack_3",
      "Block", "Hurt", "Dead"
    ],
    filePattern: /^([A-Za-z_]+)\.png$/,
    folderPattern: /^(Captain|Champion|Commander|Knight)/,
    usageInstructions: `Heavy armor knight variants.
Block animation for defensive stance.
Multiple attack combos available.
Use for elite soldier enemies or player classes.`,
    examplePath: "enemies/knight"
  },

  icons: {
    id: "icons",
    name: "Icon Pack",
    description: "Static icon images for UI, items, skills.",
    directional: false,
    animations: [],
    filePattern: /^[A-Za-z0-9_-]+\.png$/,
    folderPattern: /^icons-/,
    usageInstructions: `Static icons, not animated.
Often include shadow and without_shadow variants.
AI source files available for customization.
Organize by category: potions, herbs, meat, skills, etc.`,
    examplePath: "2dassets/icons-alchemy-herbs/PNG"
  },

  dungeon: {
    id: "dungeon",
    name: "Dungeon Crawler",
    description: "48x64 4-directional dungeon sprites.",
    directional: true,
    directions: ["down", "left", "right", "up"],
    frameWidth: 48,
    frameHeight: 64,
    animations: ["idle", "walk"],
    filePattern: /^([a-z]+)_([a-z]+)_(\d+)\.png$/,
    folderPattern: /^(dampdungeons|dungeon)/,
    usageInstructions: `Small dungeon crawler sprites.
4 directions: down(0), left(1), right(2), up(3).
Designed for tile-based movement.
Use with fog of war and tile maps.`,
    examplePath: "dampdungeons"
  },

  grudge: {
    id: "grudge",
    name: "Grudge RPG",
    description: "100x100 custom Grudge Warlords sprites.",
    directional: false,
    frameWidth: 100,
    frameHeight: 100,
    animations: [
      "Idle", "Walk", "Walk_Alt", "Run", "Attack", "Attack_2", "Attack_3",
      "Cast", "Heal", "Hurt", "Death", "Block"
    ],
    filePattern: /^([A-Za-z_]+)-([a-z]+)-(\d+)\.png$/,
    folderPattern: /^(grudge|GrudgeRPGAssets2d)/,
    usageInstructions: `Custom Grudge Warlords sprites.
Naming: {character}-{animation}-{frame}.png
Match animations to character class abilities.
Use for player characters and major NPCs.`,
    examplePath: "GrudgeRPGAssets2d"
  }
};

export function detectSpriteType(folderPath: string): SpriteTypeDefinition | null {
  const pathLower = folderPath.toLowerCase();
  const segments = folderPath.split('/').filter(s => s.length > 0);
  
  // Check each segment against folder patterns
  for (const type of Object.values(SPRITE_TYPES)) {
    for (const segment of segments) {
      if (type.folderPattern.test(segment)) {
        return type;
      }
    }
  }
  
  // Fallback substring checks for all types
  if (pathLower.includes('chibi-')) return SPRITE_TYPES.chibi;
  if (pathLower.includes('topdown') || pathLower.includes('goblin')) return SPRITE_TYPES.topdown;
  if (pathLower.includes('vampire')) return SPRITE_TYPES.vampire;
  if (pathLower.includes('wraith')) return SPRITE_TYPES.wraith;
  if (pathLower.includes('icons-')) return SPRITE_TYPES.icons;
  if (pathLower.includes('heroes/') || pathLower.includes('/heroes')) return SPRITE_TYPES.hero;
  if (pathLower.includes('satyr')) return SPRITE_TYPES.satyr;
  if (pathLower.includes('shinobi') || pathLower.includes('samurai')) return SPRITE_TYPES.shinobi;
  if (pathLower.includes('werewolf') || pathLower.includes('worg')) return SPRITE_TYPES.werewolf;
  if (pathLower.includes('knight') || pathLower.includes('captain') || pathLower.includes('champion')) return SPRITE_TYPES.knight;
  if (pathLower.includes('fantasy') || pathLower.includes('fire_spirit') || pathLower.includes('plent')) return SPRITE_TYPES.fantasy;
  if (pathLower.includes('dungeon') || pathLower.includes('dampdungeons')) return SPRITE_TYPES.dungeon;
  if (pathLower.includes('grudge') || pathLower.includes('grudgerpgassets')) return SPRITE_TYPES.grudge;
  
  return null;
}

export interface SpritePackageMetadata {
  type: SpriteTypeDefinition | null;
  hasAiFile: boolean;
  aiFilePath?: string;
  hasLicense: boolean;
  licensePath?: string;
  hasReadme: boolean;
  readmePath?: string;
  hasBboxJson: boolean;
  bboxFiles?: string[];
  hasSpritesheets: boolean;
  spritesheetFiles?: string[];
  hasUnityPackage: boolean;
  variants?: string[];
}
