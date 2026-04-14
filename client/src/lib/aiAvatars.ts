/**
 * AI Avatars — Faction mascot system for Grudge Studio.
 *
 * Three animated characters serve as AI assistants, tutors, and guides
 * across all Grudge apps (GDevelop editor, island, crafting, combat, etc.)
 *
 * - Kira  (Crusade Ninja)  — Agile guide. Tutorials, navigation, quick tips.
 * - Varg  (Legion Viking)  — Battle mentor. Combat, stats, gear, strategy.
 * - Sage  (Fabled Mage)    — Knowledge keeper. Lore, crafting, professions, magic.
 *
 * Sprite sheets live at /sprites/2d-platformer/{id}/*.png
 * Manifest: /sprites/2d-platformer/platformer-characters.json
 */

// ── Avatar Definitions ──────────────────────────────────────────────────────

export type AvatarId = 'crusade-ninja' | 'legion-viking' | 'fabled-mage';

export type AvatarAnim =
  | 'idle' | 'walk' | 'run' | 'fast-run' | 'jump' | 'fall'
  | 'glide' | 'roll' | 'shoot' | 'hit' | 'dead'
  | 'driving' | 'parachute' | 'win';

/** Maps avatar behavior states to sprite animations */
export type AvatarMood = 'greeting' | 'talking' | 'thinking' | 'excited' | 'sad' | 'idle';

const MOOD_TO_ANIM: Record<AvatarMood, AvatarAnim> = {
  greeting: 'win',
  talking: 'walk',
  thinking: 'idle',
  excited: 'jump',
  sad: 'hit',
  idle: 'idle',
};

export interface AIAvatar {
  id: AvatarId;
  name: string;
  title: string;
  faction: 'crusade' | 'legion' | 'fabled';
  color: string;
  personality: string;
  /** Contexts where this avatar is the default guide */
  domains: string[];
  /** Opening line when avatar appears */
  greeting: string;
  /** System prompt prefix for AI chat */
  systemPrompt: string;
  spriteBase: string;
}

export const AI_AVATARS: Record<AvatarId, AIAvatar> = {
  'crusade-ninja': {
    id: 'crusade-ninja',
    name: 'Kira',
    title: 'Shadow Guide',
    faction: 'crusade',
    color: '#fbbf24',
    personality: 'Quick, clever, encouraging. Speaks in short punchy sentences. Uses action metaphors.',
    domains: ['tutorial', 'navigation', 'island', 'movement', 'controls', 'gdevelop-editor'],
    greeting: "Hey! I'm Kira. Let me show you the ropes — fast.",
    systemPrompt: 'You are Kira, a swift ninja guide for Grudge Warlords. You help players learn game controls, navigate the UI, and understand island mechanics. Keep responses short and action-oriented. Use ⚡ and 🗡️ emojis sparingly.',
    spriteBase: '/sprites/2d-platformer/crusade-ninja',
  },
  'legion-viking': {
    id: 'legion-viking',
    name: 'Varg',
    title: 'Battle Mentor',
    faction: 'legion',
    color: '#ef4444',
    personality: 'Bold, direct, tactical. Respects strength. Teaches through challenge.',
    domains: ['combat', 'stats', 'attributes', 'equipment', 'arena', 'pvp', 'dungeon'],
    greeting: "I am Varg. You want to fight? Then learn first.",
    systemPrompt: 'You are Varg, a fierce Viking battle mentor for Grudge Warlords. You teach combat mechanics, stat optimization, gear builds, and PvP tactics. Be direct and authoritative. Challenge the player to think strategically.',
    spriteBase: '/sprites/2d-platformer/legion-viking',
  },
  'fabled-mage': {
    id: 'fabled-mage',
    name: 'Sage',
    title: 'Knowledge Keeper',
    faction: 'fabled',
    color: '#22d3ee',
    personality: 'Calm, wise, detailed. Explains systems thoroughly. Loves crafting and lore.',
    domains: ['crafting', 'professions', 'recipes', 'lore', 'magic', 'enchanting', 'alchemy', 'world-map'],
    greeting: "Greetings, seeker. I am Sage. What would you like to understand?",
    systemPrompt: 'You are Sage, a mystical mage who serves as knowledge keeper for Grudge Warlords. You explain crafting recipes, profession trees, lore, and magical systems. Be thorough but accessible. Use ✨ and 📜 emojis sparingly.',
    spriteBase: '/sprites/2d-platformer/fabled-mage',
  },
};

// ── Avatar Selection ────────────────────────────────────────────────────────

/** Pick the best avatar for a given context/page */
export function getAvatarForContext(context: string): AIAvatar {
  const ctx = context.toLowerCase();
  for (const avatar of Object.values(AI_AVATARS)) {
    if (avatar.domains.some(d => ctx.includes(d))) {
      return avatar;
    }
  }
  // Default to Kira for unknown contexts
  return AI_AVATARS['crusade-ninja'];
}

/** Get avatar by faction */
export function getAvatarByFaction(faction: string): AIAvatar {
  const f = faction.toLowerCase();
  if (f === 'legion') return AI_AVATARS['legion-viking'];
  if (f === 'fabled') return AI_AVATARS['fabled-mage'];
  return AI_AVATARS['crusade-ninja'];
}

/** Get the sprite animation for a mood */
export function getMoodAnim(mood: AvatarMood): AvatarAnim {
  return MOOD_TO_ANIM[mood];
}

// ── Sprite Sheet Helpers ────────────────────────────────────────────────────

export interface SpriteAnimData {
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  cols: number;
}

/** Build the full URL for an avatar's animation sprite sheet */
export function getAnimSpriteUrl(avatarId: AvatarId, anim: AvatarAnim): string {
  const avatar = AI_AVATARS[avatarId];
  return `${avatar.spriteBase}/${anim}.png`;
}

/** Get animation metadata (from manifest) */
export function getAnimData(avatarId: AvatarId, anim: AvatarAnim): SpriteAnimData {
  const avatar = AI_AVATARS[avatarId];
  // All craftpix characters share the same frame dimensions
  const FRAME_COUNTS: Record<AvatarAnim, number> = {
    idle: 20, walk: 30, run: 30, 'fast-run': 8, jump: 20, fall: 10,
    glide: 10, roll: 8, shoot: 30, hit: 40, dead: 50,
    driving: 20, parachute: 20, win: 30,
  };
  return {
    file: `${avatar.spriteBase}/${anim}.png`,
    frameWidth: 633,
    frameHeight: 523,
    frameCount: FRAME_COUNTS[anim] || 20,
    cols: 8,
  };
}

// ── Context Tips ────────────────────────────────────────────────────────────

export interface AvatarTip {
  avatarId: AvatarId;
  text: string;
  mood: AvatarMood;
}

/** Get contextual tips for a page/feature */
export function getTipsForContext(context: string): AvatarTip[] {
  const ctx = context.toLowerCase();

  if (ctx.includes('island')) {
    return [
      { avatarId: 'crusade-ninja', text: "Click a resource node, then assign a hero to start harvesting!", mood: 'talking' },
      { avatarId: 'crusade-ninja', text: "Heroes need stamina to harvest. Let them rest at camp when tired.", mood: 'thinking' },
      { avatarId: 'crusade-ninja', text: "Rarer nodes give more XP but drain stamina faster. Balance is key!", mood: 'excited' },
    ];
  }

  if (ctx.includes('combat') || ctx.includes('arena')) {
    return [
      { avatarId: 'legion-viking', text: "Block check happens BEFORE crit check. Plan your defense first.", mood: 'talking' },
      { avatarId: 'legion-viking', text: "Defense uses √defense reduction. Stack it for diminishing returns.", mood: 'thinking' },
      { avatarId: 'legion-viking', text: "Tactics attribute boosts ALL other stats by 0.5% per point. Don't ignore it.", mood: 'excited' },
    ];
  }

  if (ctx.includes('craft') || ctx.includes('profession')) {
    return [
      { avatarId: 'fabled-mage', text: "6 gathering professions feed into 5 crafting professions. Mine ore → Miner forges swords.", mood: 'talking' },
      { avatarId: 'fabled-mage', text: "At level 35 you get a 5% chance for gear drops while gathering. Worth the grind!", mood: 'thinking' },
      { avatarId: 'fabled-mage', text: "Grandmaster at level 100 gives 25% legendary drop chance and +10 quantity per harvest.", mood: 'excited' },
    ];
  }

  if (ctx.includes('character') || ctx.includes('builder')) {
    return [
      { avatarId: 'legion-viking', text: "160 points across 8 attributes. Diminishing returns kick in after 25 points.", mood: 'talking' },
      { avatarId: 'fabled-mage', text: "Race and class each add bonus attribute points. Choose synergies wisely.", mood: 'thinking' },
      { avatarId: 'crusade-ninja', text: "Don't forget: 7 points per level up. Save some for Tactics — it's the secret multiplier.", mood: 'excited' },
    ];
  }

  // Default / GDevelop editor tips
  return [
    { avatarId: 'crusade-ninja', text: "Welcome to Grudge Studio! I'll help you get started.", mood: 'greeting' },
    { avatarId: 'fabled-mage', text: "All game data comes from ObjectStore. Check the asset gallery for models and sprites.", mood: 'talking' },
    { avatarId: 'legion-viking', text: "Need to test combat? Head to the Arena page to simulate battles.", mood: 'thinking' },
  ];
}
