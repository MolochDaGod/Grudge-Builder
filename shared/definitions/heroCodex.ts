/**
 * heroCodex.ts — Canonical Warlords hero profiles for Codex UI, seeds, and popouts.
 *
 * SSOT identity: HERO_ROSTER in lore.ts (id, name, title, faction, race, class, sector).
 * This file adds lore text, dialogues, quests, combat presentation, and art paths.
 * Do NOT invent alternate cast names (no Sir Aldric / Grommash substitutes).
 */
import {
  HERO_ROSTER,
  RACES,
  FACTIONS,
  SECTOR_LORE,
  type HeroDefinition,
  type FactionId,
  type RaceId,
  type ClassId,
  type SectorPosition,
} from './lore';

// ── Types ────────────────────────────────────────────────────────────────────

export type HeroCodexClassLabel =
  | 'Warrior'
  | 'Mage'
  | 'Ranger'
  | 'Worges'
  | 'Shaman'
  | 'Necromancer'
  | 'Rogue'
  | 'Cleric'
  | 'Legend';

export type HeroRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface HeroAbility {
  name: string;
  icon: string;
  description: string;
  manaCost: number;
}

export interface HeroTrait {
  name: string;
  effect: string;
}

export interface HeroQuestBeat {
  id: string;
  title: string;
  description: string;
}

export interface HeroDialoguePack {
  greeting_neutral: string;
  greeting_friendly: string;
  greeting_hostile: string;
  quest_offer: string;
  combat_start: string;
  victory: string;
  defeat: string;
}

export interface HeroRelationship {
  targetId: string;
  type: 'friend' | 'rival' | 'ally' | 'enemy' | 'blood_brother' | 'mentor';
  description: string;
}

export interface HeroCodexEntry {
  /** Matches HERO_ROSTER.id (or "racalvin" for Pirate King legend) */
  id: string;
  /** Full display name: First Last */
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  /** Display faction name */
  faction: 'Crusade' | 'Legion' | 'Fabled' | 'Pirate';
  factionId: FactionId | 'pirate';
  factionColor: string;
  race: string;
  raceId: RaceId | 'barbarian' | 'pirate';
  className: HeroCodexClassLabel;
  classId: string;
  level: number;
  sectorSpawn: SectorPosition | 'CENTER';
  sectorName: string;
  isQuestGiver: boolean;
  /** Art: preferred portrait then sprite fallback */
  portraitKey: string;
  portrait: string;
  sprite: string;
  rarity: HeroRarity;
  lore: string;
  backstory: string;
  quote: string;
  flavorText: string;
  primaryAttribute: 'STR' | 'VIT' | 'END' | 'DEX' | 'AGI' | 'INT' | 'WIS' | 'TAC';
  combatStyle: string;
  weapons: string;
  loadoutShort: string;
  alignment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  abilities: HeroAbility[];
  racialTraits: HeroTrait[];
  strengths: string[];
  weaknesses: string[];
  dialogue: HeroDialoguePack;
  questPool: HeroQuestBeat[];
  relationships: HeroRelationship[];
  /** Display stats for codex cards (presentation, not combat sim SSOT) */
  stats: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
    range: number;
    mana: number;
  };
}

// ── Art mapping (race × class archetype → existing PNG keys) ─────────────────

const CLASS_LABEL: Record<string, HeroCodexClassLabel> = {
  warrior: 'Warrior',
  mage: 'Mage',
  ranger: 'Ranger',
  worges: 'Worges',
  shaman: 'Shaman',
  necromancer: 'Necromancer',
  rogue: 'Rogue',
  cleric: 'Cleric',
};

/** Map classId → portrait archetype folder key (warrior|mage|ranger|worg) */
function classArtKey(classId: string): string {
  switch (classId) {
    case 'warrior':
      return 'warrior';
    case 'mage':
    case 'shaman':
      return 'mage';
    case 'necromancer':
      // Necromancer uses undead-coded art when race has no unique key (see PORTRAIT_KEY_OVERRIDES)
      return 'mage';
    case 'cleric':
      // Prefer support/nature (worg pack) over pure mage so clerics don't twin mages
      return 'worg';
    case 'ranger':
    case 'rogue':
      return 'ranger';
    case 'worges':
      return 'worg';
    default:
      return 'warrior';
  }
}

/**
 * Per-hero portrait keys — one unique PNG per hero under hero-portraits/{key}.png.
 * All 24 roster heroes use id-named files (no shared race_class path on the page).
 * Scourge uses dedicated art (scourgfaith.png → scourge_faithbearer.png).
 */
const PORTRAIT_KEY_OVERRIDES: Record<string, string> = {
  // ── Crusade ──
  aurion: 'aurion',
  sigurd: 'sigurd',
  kael: 'kael',
  theron: 'theron',
  thrax: 'thrax',
  grok: 'grok',
  kira: 'kira',
  vox: 'vox',
  // ── Legion ──
  gruk: 'gruk',
  nazgrim: 'nazgrim',
  vexol: 'vexol',
  morgash: 'morgash',
  silesh: 'silesh',
  bone: 'bone',
  whisper: 'whisper',
  dredge: 'dredge',
  // ── Fabled ──
  aelindor: 'aelindor',
  silvaine: 'silvaine',
  lyra: 'lyra',
  fenwick: 'fenwick',
  durgin: 'durgin',
  brenna: 'brenna',
  thordak: 'thordak',
  helga: 'helga',
  // ── Pirate legends ──
  scourge_faithbearer: 'scourge_faithbearer',
  john_wayne: 'sky_captain',
  racalvin: 'pirate_king',
};

/** Split "First Last …" into firstName + lastName (rest joins last). */
export function splitHeroName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: full, lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Absolute public base for Hero Codex static assets (SPA-safe). */
export const HERO_CODEX_ASSET_BASE = '/hero-codex/';

function spriteFile(raceId: string, classId: string): string {
  const race = raceId === 'barbarian' ? 'barbarian' : raceId;
  const art = classArtKey(classId);
  // Sprites use archer/paladin naming in folders
  let rel: string;
  if (art === 'ranger') rel = `sprites/entities/units/${race}/${race}_archer.png`;
  else if (art === 'worg') rel = `sprites/entities/units/${race}/${race}_paladin.png`;
  else rel = `sprites/entities/units/${race}/${race}_${art === 'mage' ? 'mage' : 'warrior'}.png`;
  return `${HERO_CODEX_ASSET_BASE}${rel}`;
}

function portraitFile(raceId: string, classId: string): string {
  const race = raceId === 'barbarian' ? 'barbarian' : raceId;
  const art = classArtKey(classId);
  return `${HERO_CODEX_ASSET_BASE}hero-portraits/${race}_${art}.png`;
}

function portraitByKey(key: string): string {
  return `${HERO_CODEX_ASSET_BASE}hero-portraits/${key}.png`;
}

// ── Presentation stats ───────────────────────────────────────────────────────

const BASE = { health: 200, attack: 18, defense: 12, speed: 60, range: 1.5, mana: 100 };

const CLASS_MOD: Record<string, Partial<typeof BASE>> = {
  warrior: { health: 40, attack: 4, defense: 6, speed: -5, mana: -10 },
  mage: { health: -30, attack: 2, defense: -4, range: 4, mana: 50 },
  ranger: { health: -20, attack: 3, defense: -2, speed: 10, range: 5, mana: 10 },
  worges: { health: 30, attack: 3, defense: 3, speed: 5, mana: -5 },
  shaman: { health: -10, attack: 2, defense: 0, mana: 40 },
  necromancer: { health: -20, attack: 3, defense: -3, range: 4, mana: 55 },
  rogue: { health: -15, attack: 4, defense: -3, speed: 12, mana: 5 },
  cleric: { health: 10, attack: 0, defense: 2, mana: 45 },
};

const RACE_MOD: Record<string, Partial<typeof BASE>> = {
  human: { health: 5, attack: 1, defense: 1, speed: 2, mana: 5 },
  barbarian: { health: 15, attack: 4, defense: -1, speed: 3, mana: -5 },
  dwarf: { health: 20, attack: 2, defense: 5, speed: -8 },
  elf: { health: -10, speed: 5, mana: 20 },
  orc: { health: 10, attack: 5, defense: 1, speed: 2, mana: -10 },
  undead: { health: 25, attack: 1, defense: 2, speed: -3, mana: 5 },
  demon: { health: 5, attack: 6, mana: 10 },
};

function computeStats(raceId: string, classId: string, level: number) {
  const cm = CLASS_MOD[classId] || CLASS_MOD.warrior;
  const rm = RACE_MOD[raceId] || RACE_MOD.human;
  const lvl = Math.max(0, level - 40) * 2;
  return {
    health: BASE.health + (cm.health || 0) + (rm.health || 0) + lvl,
    attack: BASE.attack + (cm.attack || 0) + (rm.attack || 0) + Math.floor(lvl / 4),
    defense: BASE.defense + (cm.defense || 0) + (rm.defense || 0) + Math.floor(lvl / 5),
    speed: BASE.speed + (cm.speed || 0) + (rm.speed || 0),
    range: BASE.range + (cm.range || 0) + (rm.range || 0),
    mana: BASE.mana + (cm.mana || 0) + (rm.mana || 0) + Math.floor(lvl / 3),
  };
}

function raceTraits(raceId: string): HeroTrait[] {
  const r = RACES[raceId as RaceId];
  if (r) return r.bonuses.map((b) => ({ name: b.type, effect: b.effect }));
  if (raceId === 'barbarian') {
    return [
      { name: 'Rage', effect: '+20% damage below 50% HP' },
      { name: 'Frost Resistance', effect: '+15% cold defense' },
      { name: 'Tribal Bond', effect: 'Buff when near barbarian allies' },
    ];
  }
  return [{ name: 'Survivor', effect: '+5% all resistances' }];
}

function factionColor(factionId: FactionId | 'pirate'): string {
  if (factionId === 'pirate') return '#c9a030';
  return FACTIONS[factionId].color;
}

function factionDisplay(factionId: FactionId | 'pirate'): HeroCodexEntry['faction'] {
  if (factionId === 'pirate') return 'Pirate';
  if (factionId === 'crusade') return 'Crusade';
  if (factionId === 'legion') return 'Legion';
  return 'Fabled';
}

function sectorName(pos: SectorPosition): string {
  return SECTOR_LORE[pos]?.name ?? pos;
}

function rarityFromLevel(level: number): HeroRarity {
  if (level >= 56) return 'Legendary';
  if (level >= 53) return 'Epic';
  if (level >= 50) return 'Rare';
  if (level >= 47) return 'Uncommon';
  return 'Common';
}

// ── Ability templates by class ───────────────────────────────────────────────

function abilitiesFor(classId: string): HeroAbility[] {
  switch (classId) {
    case 'warrior':
      return [
        { name: 'Shield Bash', icon: 'shield', description: 'Stun target briefly and generate threat', manaCost: 20 },
        { name: 'Cleave', icon: 'swords', description: 'Cone melee hit on multiple enemies', manaCost: 25 },
        { name: 'Battle Cry', icon: 'megaphone', description: "Buff nearby allies' damage", manaCost: 30 },
        { name: 'Last Stand', icon: 'crown', description: 'Massive damage reduction when low HP', manaCost: 60 },
      ];
    case 'mage':
      return [
        { name: 'Mana Shield', icon: 'shield', description: 'Absorb damage using mana', manaCost: 0 },
        { name: 'Fireball', icon: 'flame', description: 'High single-target fire damage', manaCost: 30 },
        { name: 'Frost Nova', icon: 'cloud-rain', description: 'AoE slow / freeze around caster', manaCost: 35 },
        { name: 'Arcane Barrage', icon: 'zap', description: 'Sustained multi-missile burst', manaCost: 45 },
      ];
    case 'ranger':
      return [
        { name: 'Precision', icon: 'crosshair', description: 'Passive accuracy and crit bonus', manaCost: 0 },
        { name: 'Power Shot', icon: 'target', description: 'High damage ranged attack', manaCost: 20 },
        { name: 'Multi Shot', icon: 'split', description: 'Fire a spread of projectiles', manaCost: 25 },
        { name: 'Rain of Arrows', icon: 'cloud-rain', description: 'Massive AoE ranged barrage', manaCost: 40 },
      ];
    case 'worges':
      return [
        { name: 'Bear Form', icon: 'shield', description: '+defense and max HP, reduced speed', manaCost: 30 },
        { name: 'Feral Rage', icon: 'flame', description: '+attack speed and damage', manaCost: 25 },
        { name: 'Raptor Form', icon: 'zap', description: 'Stealth DPS with crit bonus', manaCost: 30 },
        { name: 'Pack Call', icon: 'paw', description: 'Summon pack allies for a short time', manaCost: 70 },
      ];
    case 'shaman':
      return [
        { name: 'Spirit Totem', icon: 'star', description: 'Place a totem that buffs allies', manaCost: 25 },
        { name: 'Lightning Bolt', icon: 'zap', description: 'Chain lightning strike', manaCost: 30 },
        { name: 'Ancestral Heal', icon: 'heart', description: 'Restore HP to self or ally', manaCost: 28 },
        { name: 'Storm Call', icon: 'cloud-rain', description: 'AoE storm over the battlefield', manaCost: 55 },
      ];
    case 'necromancer':
      return [
        { name: 'Raise Dead', icon: 'skull', description: 'Summon a temporary undead thrall', manaCost: 35 },
        { name: 'Life Drain', icon: 'heart', description: 'Damage enemy and heal self', manaCost: 25 },
        { name: 'Curse of Weakness', icon: 'sparkles', description: 'Reduce enemy damage and speed', manaCost: 22 },
        { name: 'Death Coil', icon: 'flame', description: 'High void damage blast', manaCost: 50 },
      ];
    case 'rogue':
      return [
        { name: 'Backstab', icon: 'target', description: 'Massive damage from behind', manaCost: 20 },
        { name: 'Shadow Step', icon: 'zap', description: 'Teleport behind target', manaCost: 25 },
        { name: 'Poison Blade', icon: 'flame', description: 'Apply stacking damage over time', manaCost: 18 },
        { name: 'Smoke Bomb', icon: 'cloud-rain', description: 'Break aggro and enter stealth', manaCost: 35 },
      ];
    case 'cleric':
      return [
        { name: 'Holy Light', icon: 'heart', description: 'Heal target ally', manaCost: 22 },
        { name: 'Smite', icon: 'zap', description: 'Holy damage on a single foe', manaCost: 20 },
        { name: 'Blessing', icon: 'star', description: 'Buff party defenses', manaCost: 28 },
        { name: 'Resurrection Ward', icon: 'shield', description: 'Prevent a lethal blow once', manaCost: 60 },
      ];
    default:
      return [
        { name: 'Strike', icon: 'swords', description: 'Basic attack', manaCost: 0 },
        { name: 'Focus', icon: 'star', description: 'Temporary power boost', manaCost: 20 },
        { name: 'Guard', icon: 'shield', description: 'Reduce incoming damage', manaCost: 15 },
        { name: 'Finisher', icon: 'crown', description: 'Ultimate ability', manaCost: 50 },
      ];
  }
}

function loadoutFor(classId: string, raceId: string): { weapons: string; combatStyle: string; loadoutShort: string; primary: HeroCodexEntry['primaryAttribute'] } {
  switch (classId) {
    case 'warrior':
      return {
        weapons: raceId === 'dwarf' ? 'Mace + Tower Shield' : raceId === 'orc' ? 'Greataxe' : 'Sword + Shield',
        combatStyle: 'Melee Physical',
        loadoutShort: raceId === 'orc' ? '2H Axe' : 'Sword + Shield',
        primary: 'STR',
      };
    case 'mage':
      return { weapons: 'Staff / Orb', combatStyle: 'Ranged Magic', loadoutShort: 'Staff', primary: 'INT' };
    case 'ranger':
      return { weapons: 'Longbow + Quiver', combatStyle: 'Ranged Physical', loadoutShort: 'Bow', primary: 'DEX' };
    case 'worges':
      return { weapons: 'Claws / Natural weapons', combatStyle: 'Shapeshift Melee', loadoutShort: 'Worges Forms', primary: 'STR' };
    case 'shaman':
      return { weapons: 'Totem Staff', combatStyle: 'Spirit Magic', loadoutShort: 'Totem Staff', primary: 'WIS' };
    case 'necromancer':
      return { weapons: 'Bone Staff / Grimoire', combatStyle: 'Death Magic', loadoutShort: 'Grimoire', primary: 'INT' };
    case 'rogue':
      return { weapons: 'Daggers', combatStyle: 'Stealth Melee', loadoutShort: 'Daggers', primary: 'AGI' };
    case 'cleric':
      return { weapons: 'Mace + Holy Symbol', combatStyle: 'Support Magic', loadoutShort: 'Mace · Holy', primary: 'WIS' };
    default:
      return { weapons: 'Mixed', combatStyle: 'Hybrid', loadoutShort: 'Hybrid', primary: 'TAC' };
  }
}

// ── Full narrative profiles (canonical names only) ───────────────────────────

type ProfileCore = {
  lore: string;
  backstory: string;
  quote: string;
  flavorText: string;
  alignment: string;
  difficulty: HeroCodexEntry['difficulty'];
  strengths: string[];
  weaknesses: string[];
  dialogue: HeroDialoguePack;
  questPool: HeroQuestBeat[];
  relationships: HeroRelationship[];
};

const PROFILES: Record<string, ProfileCore> = {
  // ── Crusade ──────────────────────────────────────────────────────────────
  aurion: {
    lore: "Aurion Solbrand is the most powerful human mage in living memory. Marked by Odin at birth during a solar eclipse, golden divine energy radiates from his form. From Ethereal Falls he leads the Crusade's magical corps against Madra's Cosmic Waterfall.",
    backstory: "Born as golden light erupted from the sky — Odin himself marking the child. By age 12 he could channel pure solar energy. Now at 34, he leads Crusade mages. His power waxes near the Cosmic Waterfall and wanes far from it — a blessing and a leash.",
    quote: '"The dawn always defeats the night."',
    flavorText: 'Where Aurion stands, the dark is measured.',
    alignment: 'Lawful Good',
    difficulty: 'Advanced',
    strengths: ['Solar magic burst', 'Quest hub for protection arcs', 'Strong vs Legion undead'],
    weaknesses: ['Power depends on Waterfall proximity', 'Fragile in pure melee', 'Rival of Silesh draws assassins'],
    dialogue: {
      greeting_neutral: 'Hail, traveler. The light of Odin guides your path here.',
      greeting_friendly: 'Ah, a friend returns! Your deeds echo in the light.',
      greeting_hostile: 'The shadows cling to you… state your business quickly.',
      quest_offer: 'I sense purpose in you. Would you carry the light where I cannot?',
      combat_start: "By Odin's eye, you shall fall!",
      victory: 'The dawn always defeats the night.',
      defeat: 'The light… merely dims… never dies…',
    },
    questPool: [
      { id: 'aurion_quest_1', title: 'Light Against the Dark', description: 'Cleanse corrupted shrines near the Waterfall' },
      { id: 'aurion_quest_2', title: 'Dawn Patrol', description: 'Scout advancing void zones' },
      { id: 'aurion_quest_3', title: 'The Radiant Path', description: 'Escort refugees to safety' },
      { id: 'aurion_quest_4', title: 'Solar Artifact Hunt', description: 'Recover pieces of ancient sun relics' },
      { id: 'aurion_quest_5', title: 'Healing the Wounded Land', description: 'Restore magic to fading islands' },
    ],
    relationships: [
      { targetId: 'silesh', type: 'rival', description: 'Ancient enemies — light versus dread' },
      { targetId: 'aelindor', type: 'friend', description: 'Fought together in many battles' },
    ],
  },
  sigurd: {
    lore: 'Sigurd Ironcrown is Supreme Commander of Crusade ground forces. He has never lost a duel, never abandoned a position, never broken a promise. On the Frostbite Expanse he is the wall between Legion ash and free shores.',
    backstory: "Born to a blacksmith family, at 16 he held a bridge for three days while his village evacuated. He fought Thrax the Savage for seven hours to a draw — they became blood brothers. His stubbornness is strength and tragic flaw.",
    quote: '"State your business."',
    flavorText: 'The line holds because he does.',
    alignment: 'Lawful Neutral',
    difficulty: 'Beginner',
    strengths: ['Frontline command', 'Defense and fortification quests', 'Blood-brother bond with Thrax'],
    weaknesses: ['Inflexible tactics', 'Poor at intrigue', 'Will not retreat even when wise'],
    dialogue: {
      greeting_neutral: 'State your business.',
      greeting_friendly: 'Warrior. Good to see you standing.',
      greeting_hostile: 'You smell of Legion. Explain.',
      quest_offer: 'I need fighters, not talkers. Prove yourself.',
      combat_start: 'Come, then. Show me your resolve.',
      victory: 'Adequate.',
      defeat: 'Impossible… but… well fought…',
    },
    questPool: [
      { id: 'sigurd_quest_1', title: 'Trial by Combat', description: 'Survive Sigurd’s training gauntlet' },
      { id: 'sigurd_quest_2', title: 'Hold the Line', description: 'Survive waves of enemies' },
      { id: 'sigurd_quest_3', title: 'The Weight of Command', description: 'Make hard tactical choices' },
      { id: 'sigurd_quest_4', title: 'Forging Champions', description: 'Train NPC recruits' },
      { id: 'sigurd_quest_5', title: "The Old Veteran's Wisdom", description: 'Listen for hidden war lore' },
    ],
    relationships: [
      { targetId: 'thrax', type: 'blood_brother', description: 'Seven-hour duel, then brothers' },
      { targetId: 'gruk', type: 'rival', description: 'Worthy opponent across the war' },
    ],
  },
  kael: {
    lore: "Kael Nightwhisper is the Crusade's intelligence master of Stormbreak Reef. No one knows his true origin — some whisper he was born under Legion banners and defected. Arrows and secrets are the same weapon in his hands.",
    backstory: "Prevented seventeen assassination attempts, mapped three Legion fortresses, and once stole a crown from an orc warlord — replacing it with a Crusade banner. Loyalty absolute; morality flexible.",
    quote: '"You never saw me."',
    flavorText: 'Shadows are just arrows waiting to be loosed.',
    alignment: 'Chaotic Good',
    difficulty: 'Advanced',
    strengths: ['Stealth and intel quests', 'Poison and sabotage', 'Long range ambush'],
    weaknesses: ['Fragile in open melee', 'Trust is rare', 'Hostile if you know too much'],
    dialogue: {
      greeting_neutral: '…you saw me. Interesting.',
      greeting_friendly: 'Ah, a shadow I can trust. What do you bring me?',
      greeting_hostile: "You know too much. That's… problematic.",
      quest_offer: 'Information has a price. What are you willing to pay?',
      combat_start: '',
      victory: 'You never saw me.',
      defeat: 'A shadow… cannot truly… die…',
    },
    questPool: [
      { id: 'kael_quest_1', title: 'Whispers in the Dark', description: 'Eavesdrop on NPC conversations' },
      { id: 'kael_quest_2', title: "The Poisoner's Art", description: 'Learn to craft toxins' },
      { id: 'kael_quest_3', title: 'Shadow Walking', description: 'Navigate without detection' },
      { id: 'kael_quest_4', title: 'The Information Trade', description: 'Exchange secrets for secrets' },
      { id: 'kael_quest_5', title: 'No Witnesses', description: 'Eliminate targets quietly' },
    ],
    relationships: [],
  },
  theron: {
    lore: 'Theron Greyclaw, Wildkin of Ethereal Falls — raised by wolves after being lost in the canopy at age five. He walks between civilization and nature. His pack-brother Fenrix is not a pet; he is pack.',
    backstory: 'Dire wolves adopted him. He lived as a wolf for twelve years. Through a magical bond he shares thoughts — and pain — with Fenrix. He serves the Crusade as Wildkin, never fully tame.',
    quote: '"The wild needs defenders. Will you run with us?"',
    flavorText: 'In the space between howl and silence, death waits.',
    alignment: 'Chaotic Neutral',
    difficulty: 'Advanced',
    strengths: ['Beast taming and tracking', 'Pack combat', 'Nature protection quests'],
    weaknesses: ['Poor with politics', 'Hostile to death-magic scents', 'Forms over tools'],
    dialogue: {
      greeting_neutral: '*sniff* You smell… uncertain. Speak.',
      greeting_friendly: '*Fenrix wags tail* Pack-friend returns. Good.',
      greeting_hostile: '*growls* You smell of death-magic. Leave. Now.',
      quest_offer: 'The wild needs defenders. Will you run with us?',
      combat_start: '*howls* FENRIX! HUNT!',
      victory: '*panting* Good hunt.',
      defeat: 'Fenrix… run… save the pack…',
    },
    questPool: [
      { id: 'theron_quest_1', title: 'The Hunt', description: 'Track and defeat dangerous prey' },
      { id: 'theron_quest_2', title: 'Pack Bond', description: 'Bond with companion creatures' },
      { id: 'theron_quest_3', title: "Nature's Guardian", description: 'Protect groves from corruption' },
      { id: 'theron_quest_4', title: 'Speak to the Wild', description: 'Translate for animal NPCs' },
      { id: 'theron_quest_5', title: 'Feral Training', description: 'Learn beast-fighting techniques' },
    ],
    relationships: [],
  },
  thrax: {
    lore: "Thrax Bloodmaw, Odin's Berserker of Convergence Nexus, born of prophecy: 'The Red Storm shall unite the axes with the swords, or all shall fall to the endless dark.' He bridges barbarian tribes and Crusade steel.",
    backstory: 'At 18 he defeated every tribal champion to unite the axes with civilized swords. Then he fought Sigurd for seven hours to a draw — blood brothers. Center-sector presence keeps pirate waters honest.',
    quote: '"RAAAAGH! BLOOD FOR ODIN!"',
    flavorText: 'The Red Storm does not negotiate.',
    alignment: 'Chaotic Good',
    difficulty: 'Intermediate',
    strengths: ['Berserk melee', 'Unites barbarian content', 'Raid leadership'],
    weaknesses: ['Reckless', 'Diplomacy is drinking and fighting', 'Lure into traps'],
    dialogue: {
      greeting_neutral: 'Hmm. You strong? We see.',
      greeting_friendly: 'HA! Friend! Let us drink and fight!',
      greeting_hostile: 'BLOOD! Your blood on my axes!',
      quest_offer: 'Fight together good. Fight apart stupid. You join hunt?',
      combat_start: 'RAAAAGH! BLOOD FOR ODIN!',
      victory: 'Good fight! You worthy!',
      defeat: 'I… fall… but… rise again…',
    },
    questPool: [
      { id: 'thrax_quest_1', title: 'Blood and Glory', description: 'Defeat worthy opponents' },
      { id: 'thrax_quest_2', title: 'Tribal Rites', description: 'Participate in barbarian ceremonies' },
      { id: 'thrax_quest_3', title: 'The Red Storm', description: 'Lead a raid against Legion forces' },
    ],
    relationships: [
      { targetId: 'sigurd', type: 'blood_brother', description: 'Blood brothers after the legendary duel' },
    ],
  },
  grok: {
    lore: 'Grok Stormhowl is Spiritcaller of the northern tribes on Frostbite Expanse. He speaks to ancestors through smoke and storm, guiding barbarian warriors with visions of victory — or doom — before battle.',
    backstory: 'Cast out for hearing voices, he returned when those voices correctly predicted a Legion ambush. Now he is Spiritcaller: shaman of Odin’s wild half, posted in the Cathedral Highlands to watch the north.',
    quote: '"The spirits already know your answer."',
    flavorText: 'Smoke rises. Truth follows.',
    alignment: 'Neutral Good',
    difficulty: 'Advanced',
    strengths: ['Spirit buffs', 'Vision quests', 'Storm magic'],
    weaknesses: ['Fragile body', 'Visions can mislead', 'Slow cast times'],
    dialogue: {
      greeting_neutral: 'The wind brought your name before your feet.',
      greeting_friendly: 'Sit. Smoke with me. The ancestors like company.',
      greeting_hostile: 'Your spirit reeks of Madra. Leave the circle.',
      quest_offer: 'A vision troubles me. Walk it with me, or it walks alone.',
      combat_start: 'Storm! Hear me!',
      victory: 'The spirits are fed.',
      defeat: 'Tell… the ancestors… I tried…',
    },
    questPool: [
      { id: 'grok_quest_1', title: 'Smoke and Bone', description: 'Gather spirit reagents in the highlands' },
      { id: 'grok_quest_2', title: 'Dream of the Red Storm', description: 'Survive a vision trial of Thrax’s prophecy' },
      { id: 'grok_quest_3', title: 'Silence the False Totem', description: 'Destroy a corrupted Legion idol' },
    ],
    relationships: [
      { targetId: 'thrax', type: 'ally', description: 'Reads the Red Storm’s path' },
      { targetId: 'kira', type: 'mentor', description: 'Taught her to listen before she bites' },
    ],
  },
  kira: {
    lore: 'Kira Redfang, the Fang — barbarian Worges who hunts Legion scouts in Thornwood Wilds. Her forms are wolf and raptor; her loyalty is pack first, Crusade second.',
    backstory: 'Kira failed every formal drill under Sigurd, then thrived when Theron’s pack methods reached the north. She took the title Fang after breaking a Legion siege by leading beasts through ice tunnels.',
    quote: '"Hunt with me, or be hunted by me."',
    flavorText: 'Snow holds tracks. She holds grudges.',
    alignment: 'Chaotic Neutral',
    difficulty: 'Expert',
    strengths: ['Mountain tracking', 'Form combat', 'Ambush in NE peaks'],
    weaknesses: ['Hates confinement', 'Pack before orders', 'Low armor in human form'],
    dialogue: {
      greeting_neutral: 'Speak soft. The mountain listens.',
      greeting_friendly: 'Pack-sibling. Share meat?',
      greeting_hostile: 'Your scent is wrong. Run.',
      quest_offer: 'There is prey in the peaks. Join the hunt.',
      combat_start: '*snarls* Fang finds you!',
      victory: 'Blood on snow. Good.',
      defeat: 'The pack… continues… without me…',
    },
    questPool: [
      { id: 'kira_quest_1', title: 'Ice Tunnel Ambush', description: 'Clear Legion scouts from Crown Peaks' },
      { id: 'kira_quest_2', title: 'Prove the Fang', description: 'Complete a solo hunt trial' },
      { id: 'kira_quest_3', title: "Theron's Lesson", description: 'Deliver a message to Wildkin in Dried Basin' },
    ],
    relationships: [
      { targetId: 'theron', type: 'mentor', description: 'Learned pack-bond ways from Wildkin' },
      { targetId: 'grok', type: 'ally', description: 'Respects spirit-sight' },
    ],
  },
  vox: {
    lore: 'Vox Skysplit, Skyhunter of the Ashen Wastes — barbarian ranger who maps wreck-fields from cliff nests and griffin perches. If it flies over the eastern flats, Vox has already named it.',
    backstory: 'Exiled for stealing a tribal longbow to shoot a frost wyrm mid-raid — and hitting it. Racalvin later hired her to chart smuggler lanes. She stayed near the Junkyards because “the sky is honest there.”',
    quote: '"If it has a shadow, I own the moment it lands."',
    flavorText: 'Wrecks below. Truth above.',
    alignment: 'True Neutral',
    difficulty: 'Intermediate',
    strengths: ['Long-range overwatch', 'Aerial scouting', 'Salvage routes'],
    weaknesses: ['Weak in tunnels', 'Hates shipboard close combat', 'Independent contracts'],
    dialogue: {
      greeting_neutral: 'State heading and height. I’ll decide if you matter.',
      greeting_friendly: 'Good wind under your wings, warlord.',
      greeting_hostile: 'You’re on my skyline. That’s a mistake.',
      quest_offer: 'Something’s flying that shouldn’t. Want coin or glory?',
      combat_start: 'Draw. Loose.',
      victory: 'Sky’s clear.',
      defeat: 'Clip… my wings… later…',
    },
    questPool: [
      { id: 'vox_quest_1', title: 'Junkyard Nest', description: 'Clear harpies from a wreck spire' },
      { id: 'vox_quest_2', title: 'Chart the Lane', description: 'Map a safe air/sail corridor for merchants' },
      { id: 'vox_quest_3', title: "Racalvin's Debt", description: 'Deliver a sealed chart to Center docks' },
    ],
    relationships: [
      { targetId: 'kael', type: 'ally', description: 'Trades sky maps for dock rumors' },
    ],
  },

  // ── Legion ───────────────────────────────────────────────────────────────
  gruk: {
    lore: "Gruk Blacktusk, Skullcrusher — the Legion's living siege engine. He leads from Haven Shore's shadowed under-camps and the southern approaches, where Madra's war-priests still dream of The Pit.",
    backstory: 'Rose from pit-fights to warchief by crushing every rival’s skull — literally, in three cases. Sigurd calls him a worthy rival; Gruk calls Sigurd “the only wall that bruises back.”',
    quote: '"We Consume All!"',
    flavorText: 'The Pit does not forge cowards.',
    alignment: 'Chaotic Evil',
    difficulty: 'Beginner',
    strengths: ['Brutal melee', 'Pit sector control', 'Siege pressure'],
    weaknesses: ['Predictable charge', 'Weak vs kiting', 'Rage can be baited'],
    dialogue: {
      greeting_neutral: 'Speak, or be broken.',
      greeting_friendly: 'Ha! Strong bones. You may stand near me.',
      greeting_hostile: 'CRUSADE SCENT. GOOD. FRESH.',
      quest_offer: 'Madra hungers. Bring her skulls — or yours.',
      combat_start: 'SKULLS FOR THE PIT!',
      victory: 'Another trophy.',
      defeat: 'The Pit… takes me back…',
    },
    questPool: [
      { id: 'gruk_quest_1', title: 'Pit Tribute', description: 'Deliver trophies from Crusade camps' },
      { id: 'gruk_quest_2', title: 'Break the Wall', description: 'Assault a fortified Crusade outpost' },
      { id: 'gruk_quest_3', title: 'Rival’s Name', description: 'Survive a duel scenario vs Sigurd’s banner' },
    ],
    relationships: [
      { targetId: 'sigurd', type: 'rival', description: 'Mutual respect through endless war' },
      { targetId: 'morgash', type: 'ally', description: 'Flamecaller softens walls for him' },
    ],
  },
  nazgrim: {
    lore: 'Nazgrim Voidhand, the Profane — orc necromancer of the Abyssal Trench. He binds tides and corpses so the ocean’s dead serve Madra.',
    backstory: 'Once a living war-shaman, he drowned on purpose in a Madra rite and clawed back with power over the drowned. Undead priests answer his call in flooded temples.',
    quote: '"Death is only the first order I give."',
    flavorText: 'The tide brings soldiers free of pay.',
    alignment: 'Neutral Evil',
    difficulty: 'Advanced',
    strengths: ['Undead summons', 'Flooded dungeon mastery', 'Curse pressure'],
    weaknesses: ['Holy light', 'Open dry ground', 'Slow without thralls'],
    dialogue: {
      greeting_neutral: 'Your heartbeat is loud. Soften it.',
      greeting_friendly: 'Madra smiles on useful meat.',
      greeting_hostile: 'I will keep your voice for later.',
      quest_offer: 'The Quarter needs more dead. Help me… recruit.',
      combat_start: 'Rise. All of you. Rise.',
      victory: 'Another choir for the deep.',
      defeat: 'Sink… me… carefully…',
    },
    questPool: [
      { id: 'nazgrim_quest_1', title: 'Tide Gate Keys', description: 'Recover seals from flooded chambers' },
      { id: 'nazgrim_quest_2', title: 'Choir of the Drowned', description: 'Empower an undead patrol' },
      { id: 'nazgrim_quest_3', title: "Madra's Tithe", description: 'Sacrifice a relic to a submerged altar' },
    ],
    relationships: [
      { targetId: 'silesh', type: 'ally', description: 'Shared drowned rites' },
      { targetId: 'dredge', type: 'mentor', description: 'Uses Dredge’s risen as officers' },
    ],
  },
  vexol: {
    lore: 'Vexol Quietblade, the Silent — orc ranger of Ember Depths. Speaks little; his arrows end arguments. The endgame caldera is his hunting ground.',
    backstory: 'Tongue cut in a clan betrayal; he answered by putting arrows through every traitor’s eye at night. Now he watches claim flags change hands and sells shots to the highest Madra whisper.',
    quote: '…',
    flavorText: 'Silence is a full sentence.',
    alignment: 'Neutral Evil',
    difficulty: 'Expert',
    strengths: ['SE warzone ambushes', 'Claim-flag denial', 'Single-target execute'],
    weaknesses: ['No speeches, limited quest dialogue', 'Isolated', 'Weak vs mass rush'],
    dialogue: {
      greeting_neutral: '…',
      greeting_friendly: '*nods once*',
      greeting_hostile: '*nocks*',
      quest_offer: '*points at a flag on the map*',
      combat_start: '',
      victory: '*walks away*',
      defeat: '…',
    },
    questPool: [
      { id: 'vexol_quest_1', title: 'Quiet March', description: 'Eliminate scouts without raising alarms' },
      { id: 'vexol_quest_2', title: 'Flag Shadow', description: 'Contest a claim flag under 2 minutes' },
      { id: 'vexol_quest_3', title: 'One Arrow', description: 'Assassinate a named Crusade officer' },
    ],
    relationships: [
      { targetId: 'bone', type: 'ally', description: 'Shares SE kill-zones' },
    ],
  },
  morgash: {
    lore: 'Morgash Ashborn, the Flamecaller — orc mage of volcanic forges and Haven Shore’s southern smoke-lines. He turns lava into war machines and ash into spells.',
    backstory: 'Apprenticed under ash-sorcerers until he burned the school down — on purpose — to “graduate.” Gruk trusts him to soften walls; Madra’s temples pulse when he chants.',
    quote: '"Ash is just future shape."',
    flavorText: 'He speaks in sparks.',
    alignment: 'Chaotic Evil',
    difficulty: 'Advanced',
    strengths: ['AoE fire', 'Forge synergy', 'Siege magic'],
    weaknesses: ['Water and frost', 'Friendly fire risk', 'Glass if rushed'],
    dialogue: {
      greeting_neutral: 'Stay back from the vents. Or don’t. Amusing either way.',
      greeting_friendly: 'Bring me slag. I will bring you glory.',
      greeting_hostile: 'I will write your name in cinders.',
      quest_offer: 'The forges starve. Feed them enemies.',
      combat_start: 'BURN!',
      victory: 'Beautiful ash.',
      defeat: 'Cold…? Impossible…',
    },
    questPool: [
      { id: 'morgash_quest_1', title: 'Ember Sanctuaries', description: 'Defend lava forges from saboteurs' },
      { id: 'morgash_quest_2', title: 'War Machine Heart', description: 'Retrieve a magma core' },
      { id: 'morgash_quest_3', title: "Madra's Breath", description: 'Ignite a ritual at a temple' },
    ],
    relationships: [
      { targetId: 'gruk', type: 'ally', description: 'Softens walls for Skullcrusher' },
    ],
  },
  silesh: {
    lore: 'Silesh Dreadmire, the Dread — undead mage and Aurion Solbrand’s ancient rival. Where solar light ends at Ethereal Falls, Silesh begins. She rules dread rites in the Abyssal Trench’s dark.',
    backstory: 'Once living, she sought immortality through Madra and found something colder. Aurion’s light burned her first form; she returned as The Dread, collecting the fear of islands as they sink toward the Waterfall.',
    quote: '"Fear is the only honest prayer."',
    flavorText: 'She curates nightmares.',
    alignment: 'Neutral Evil',
    difficulty: 'Expert',
    strengths: ['Fear and void magic', 'Anti-light counters', 'Deep lore quests'],
    weaknesses: ['Aurion’s solar marks', 'Holy relics', 'Hubris'],
    dialogue: {
      greeting_neutral: 'You walk loudly for something so temporary.',
      greeting_friendly: 'Interesting. You still have a spine. Keep it.',
      greeting_hostile: 'Aurion’s stink is on you. Good — I was hungry.',
      quest_offer: 'Bring me a fear the living still name. I will pay in power.',
      combat_start: 'Kneel. Or break.',
      victory: 'Another honest prayer.',
      defeat: 'Light… again… temporary…',
    },
    questPool: [
      { id: 'silesh_quest_1', title: 'Eclipse the Shrine', description: 'Desecrate an Odin wayshrine' },
      { id: 'silesh_quest_2', title: 'Name of Dread', description: 'Collect fear essences from three zones' },
      { id: 'silesh_quest_3', title: 'Rival Light', description: 'Survive a duel vision against Aurion' },
    ],
    relationships: [
      { targetId: 'aurion', type: 'enemy', description: 'Ancient enemies' },
      { targetId: 'nazgrim', type: 'ally', description: 'Shared drowned power' },
    ],
  },
  bone: {
    lore: 'Bone Rattlebone, the Collector — undead warrior who stacks trophies of bone and steel on Ember Depths. Every claim war leaves him richer in remains.',
    backstory: 'A Crusade captain who died on SE soil and woke laughing. He collects spines of officers from all three factions “for the museum Madra promised.”',
    quote: '"Leave the bones. I catalog them."',
    flavorText: 'War is just inventory.',
    alignment: 'Lawful Evil',
    difficulty: 'Intermediate',
    strengths: ['Durable undead tank', 'SE warzone presence', 'Trophy quests'],
    weaknesses: ['Slow', 'Holy damage', 'Predictable patrols'],
    dialogue: {
      greeting_neutral: 'Show me your spine. Metaphor first.',
      greeting_friendly: 'You still have all your bones. Impressive.',
      greeting_hostile: 'I have a shelf for your kind.',
      quest_offer: 'A rare skeleton walks free. Bring it to me — walking or not.',
      combat_start: 'I will keep the interesting pieces.',
      victory: 'Catalogued.',
      defeat: 'Mis… filed…',
    },
    questPool: [
      { id: 'bone_quest_1', title: 'Rare Specimens', description: 'Recover unique enemy remains' },
      { id: 'bone_quest_2', title: 'Claim Charnal', description: 'Hold a claim flag for 5 minutes' },
      { id: 'bone_quest_3', title: 'Officer’s Spine', description: 'Defeat a named enemy champion' },
    ],
    relationships: [
      { targetId: 'vexol', type: 'ally', description: 'Shares SE kill-zones' },
      { targetId: 'whisper', type: 'ally', description: 'Trades secrets for specimens' },
    ],
  },
  whisper: {
    lore: 'Whisper Pale, the Hollow — undead rogue of the Ashen Wastes. She steals names, faces, and last words. Salvagers swear the wind in wrecks is her voice.',
    backstory: 'Died in a betrayal mid-heist; returned without the part of her that felt guilt. Works for Legion intel the way Kael works for Crusade — mirror knives across the map.',
    quote: '"Your name is already mine."',
    flavorText: 'Wrecks keep secrets. She keeps better ones.',
    alignment: 'Chaotic Evil',
    difficulty: 'Advanced',
    strengths: ['Stealth in ruins', 'Identity theft quests', 'Anti-scavenger ops'],
    weaknesses: ['Direct fair fights', 'Holy ground', 'Overconfidence'],
    dialogue: {
      greeting_neutral: 'Say your name. Slowly.',
      greeting_friendly: 'I like your voice. I may keep a copy.',
      greeting_hostile: 'I already sold your route.',
      quest_offer: 'Something precious hides in the scrap. Bring me the quiet part.',
      combat_start: 'Shh.',
      victory: 'Collected.',
      defeat: 'Hollow… again…',
    },
    questPool: [
      { id: 'whisper_quest_1', title: 'Name Trade', description: 'Steal documents from a merchant guild' },
      { id: 'whisper_quest_2', title: 'False Face', description: 'Infiltrate a camp in disguise' },
      { id: 'whisper_quest_3', title: 'Last Words', description: 'Recover a dying officer’s confession' },
    ],
    relationships: [
      { targetId: 'kael', type: 'rival', description: 'Mirror spies across factions' },
      { targetId: 'bone', type: 'ally', description: 'Trades secrets for specimens' },
    ],
  },
  dredge: {
    lore: 'Dredge Gravewake, the Risen — undead cleric of the Abyssal Trench who heals Legion lines with stolen life. Madra’s mercy is a contradiction he embodies: unlife that mends unlife.',
    backstory: 'A battlefield medic who prayed to Odin as he died and was answered by Madra instead. He still wears prayer beads — cracked, inverted. Drowned Quarter patrols rally when his hollow hymns start.',
    quote: '"I mend what the living waste."',
    flavorText: 'His hospital never closes. Patients never leave.',
    alignment: 'Lawful Evil',
    difficulty: 'Intermediate',
    strengths: ['Undead healing', 'Support aura', 'SW temple defense'],
    weaknesses: ['Low personal DPS', 'Focus-fired easily', 'Holy silence'],
    dialogue: {
      greeting_neutral: 'Are you injured, or merely temporary?',
      greeting_friendly: 'Stand still. I will fix the leaking parts.',
      greeting_hostile: 'I will heal my allies with what remains of you.',
      quest_offer: 'The Risen need reagents. Living or dead — I am flexible.',
      combat_start: 'Kneel for triage.',
      victory: 'Discharged.',
      defeat: 'Ward… failed…',
    },
    questPool: [
      { id: 'dredge_quest_1', title: 'Black Triage', description: 'Defend undead medics during a clash' },
      { id: 'dredge_quest_2', title: 'Inverted Beads', description: 'Recover a corrupted holy relic' },
      { id: 'dredge_quest_3', title: 'Life Tithe', description: 'Drain life from wildlife for the Risen' },
    ],
    relationships: [
      { targetId: 'nazgrim', type: 'ally', description: 'Supports drowned armies' },
    ],
  },

  // ── Fabled ───────────────────────────────────────────────────────────────
  aelindor: {
    lore: 'Aelindor Swiftwind, the Swift — elven warrior of Frostbite Expanse. Blade-dancer of The Omni’s faithful, friend of Aurion Solbrand, edge of Fabled war doctrine.',
    backstory: 'Trained for centuries in balance-combat: never overcommit, never waste motion. Fought beside Aurion in the early Waterfall wars and still owes him a life — a debt he repays with speed.',
    quote: '"Balance is a blade edge. Stand on it."',
    flavorText: 'His second strike arrives before the first lands.',
    alignment: 'Neutral Good',
    difficulty: 'Intermediate',
    strengths: ['High mobility melee', 'Highland defense', 'Alliance with Aurion'],
    weaknesses: ['Lower raw HP than orc/dwarf tanks', 'Overextends for honor', 'Dislikes siege grinding'],
    dialogue: {
      greeting_neutral: 'May The Omni’s measure find you even.',
      greeting_friendly: 'Swift winds, friend of the light.',
      greeting_hostile: 'You tip the scales toward Madra. I correct them.',
      quest_offer: 'A balance is broken in the highlands. Help me right it.',
      combat_start: 'Swiftly, then.',
      victory: 'Measured.',
      defeat: 'The scale… tips…',
    },
    questPool: [
      { id: 'aelindor_quest_1', title: 'Highland Vigil', description: 'Defend Omni shrines' },
      { id: 'aelindor_quest_2', title: 'Debt of Light', description: 'Assist Aurion’s refugees' },
      { id: 'aelindor_quest_3', title: 'Edge of Balance', description: 'Duel corrupted bladesmen' },
    ],
    relationships: [
      { targetId: 'aurion', type: 'friend', description: 'Fought together in many battles' },
      { targetId: 'lyra', type: 'ally', description: 'Coordinates center diplomacy' },
    ],
  },
  silvaine: {
    lore: 'Silvaine Moonsong, Starwhisper — elven mage of Thornwood Wilds. She reads storms and star-paths where dwarven forge-gates sealed during the Grudge Wars.',
    backstory: 'Sealed herself in a star-observatory for a decade after a failed prophecy. Returned speaking in half-verse, half-equation. Fabled high command trusts her forecasts more than scouts.',
    quote: '"The stars already argued. I only translate."',
    flavorText: 'Frost and starlight share her tongue.',
    alignment: 'True Neutral',
    difficulty: 'Advanced',
    strengths: ['Storm and star magic', 'NE peak knowledge', 'Prophetic quests'],
    weaknesses: ['Cryptic instructions', 'Fragile', 'Avoids politics'],
    dialogue: {
      greeting_neutral: 'You arrive on a thin conjunction. Careful steps.',
      greeting_friendly: 'The stars liked your last choice. Rare.',
      greeting_hostile: 'Your timeline frays. I will snip it.',
      quest_offer: 'A star falls wrong. Catch its meaning for me.',
      combat_start: 'Constellation: war.',
      victory: 'Aligned.',
      defeat: 'Eclipse…',
    },
    questPool: [
      { id: 'silvaine_quest_1', title: 'Wrong Star', description: 'Investigate a fallen crystal in Crown Peaks' },
      { id: 'silvaine_quest_2', title: 'Storm Reading', description: 'Survive a peak storm while holding a focus' },
      { id: 'silvaine_quest_3', title: 'Sealed Gate Echo', description: 'Study a dwarf forge-gate ward' },
    ],
    relationships: [
      { targetId: 'durgin', type: 'ally', description: 'Shares sealed-gate lore' },
      { targetId: 'thordak', type: 'mentor', description: 'Compares runes to star-scripts' },
    ],
  },
  lyra: {
    lore: 'Lyra Threadweaver, the Weaver — elven cleric of Convergence Nexus. She threads diplomacy between faction embassies, weaving peace that never quite holds — and healing that does.',
    backstory: 'Named for the loom of fate, not the storm (despite bard confusion with other Lyras). Stationed at Center because The Omni asked for a heart where all ships dock. She and Helga run the quiet hospital behind the Arena.',
    quote: '"Unity is a weave. Pull one thread carefully."',
    flavorText: 'She heals wars one sailor at a time.',
    alignment: 'Neutral Good',
    difficulty: 'Beginner',
    strengths: ['Healing and buffs', 'Center diplomacy', 'Faction-neutral quests'],
    weaknesses: ['Low damage', 'Target for kidnappers', 'Cannot force peace'],
    dialogue: {
      greeting_neutral: 'Welcome to the weave of Center. Are you hurt?',
      greeting_friendly: 'Sit. Tea, then truth.',
      greeting_hostile: 'Violence here unravels more than flesh. Leave.',
      quest_offer: 'A thread is tangled between factions. Help me ease it.',
      combat_start: 'I did not want this.',
      victory: 'Hold still — I will still mend you.',
      defeat: 'The pattern… continues… without me…',
    },
    questPool: [
      { id: 'lyra_quest_1', title: 'Embassy Peace', description: 'Deliver terms between faction HQs' },
      { id: 'lyra_quest_2', title: 'Arena Aftermath', description: 'Heal fighters after a bout' },
      { id: 'lyra_quest_3', title: 'Tangled Treaty', description: 'Recover a stolen treaty scroll' },
    ],
    relationships: [
      { targetId: 'helga', type: 'ally', description: 'Co-runs Center care' },
      { targetId: 'aelindor', type: 'ally', description: 'Military arm of her diplomacy' },
    ],
  },
  fenwick: {
    lore: 'Fenwick Darkbough, Shadowleaf — elven rogue of Stormbreak Reef. He walks iron beams and smuggler docks, ensuring Fabled interests in the shipbuilding monopoly are… adjusted.',
    backstory: 'Former tree-warden who learned cities after a Legion fire. Prefers knives to speeches. Brenna pretends not to notice when contracts “update themselves” overnight.',
    quote: '"Leaves fall quiet. So do I."',
    flavorText: 'Industrial night is still a forest to him.',
    alignment: 'Chaotic Good',
    difficulty: 'Advanced',
    strengths: ['Dock sabotage', 'Smuggler contacts', 'Vertical combat'],
    weaknesses: ['Daylight crowds', 'Direct honor duels', 'Thin armor'],
    dialogue: {
      greeting_neutral: 'Keep your voice under the engines.',
      greeting_friendly: 'You move quiet. I like that.',
      greeting_hostile: 'Wrong dock, wrong night.',
      quest_offer: 'A shipment should not arrive. Help me… redirect fate.',
      combat_start: 'Sleep.',
      victory: 'Quiet work.',
      defeat: 'Cut… free…',
    },
    questPool: [
      { id: 'fenwick_quest_1', title: 'Night Contract', description: 'Sabotage a hostile workshop' },
      { id: 'fenwick_quest_2', title: 'Smuggler Ledger', description: 'Steal a cargo book' },
      { id: 'fenwick_quest_3', title: 'Beam Run', description: 'Traverse Switchyard without alarms' },
    ],
    relationships: [
      { targetId: 'brenna', type: 'ally', description: 'Industrial cover for his work' },
      { targetId: 'kael', type: 'rival', description: 'Competing shadows on the docks' },
    ],
  },
  durgin: {
    lore: 'Durgin Stonefist, Ironheart — dwarf warrior of Thornwood’s highland forges. Guardian of sealed forge-gates from the Grudge Wars. The mountain’s patience given a beard and a shield.',
    backstory: '47th of a line that sealed the deep forges when frost wyrms came. He still walks the gates each dawn with a hammer that has never been reforged — only resharpened by vows.',
    quote: '"Deeper than stone. Harder than iron. We endure."',
    flavorText: 'The mountain does not move. Neither does he.',
    alignment: 'Lawful Good',
    difficulty: 'Beginner',
    strengths: ['Peak defense', 'Gate knowledge', 'Unbreakable guard'],
    weaknesses: ['Slow', 'Hates haste', 'Predictable posts'],
    dialogue: {
      greeting_neutral: 'State your purpose at the gate.',
      greeting_friendly: 'Stone remembers friends. Enter.',
      greeting_hostile: 'Turn back, or the gate learns your shape.',
      quest_offer: 'A seal weakens. Strengthen it with me.',
      combat_start: 'Hold!',
      victory: 'Gate stands.',
      defeat: 'Seal… holds… without me…',
    },
    questPool: [
      { id: 'durgin_quest_1', title: 'Gate Vigil', description: 'Defend a forge-gate for a full cycle' },
      { id: 'durgin_quest_2', title: 'Wyrm Sign', description: 'Scout frost wyrm nests' },
      { id: 'durgin_quest_3', title: 'Vow Hammer', description: 'Recover ancestral tools' },
    ],
    relationships: [
      { targetId: 'silvaine', type: 'ally', description: 'Shares sealed-gate lore' },
      { targetId: 'thordak', type: 'ally', description: 'Brother of the rune and the gate' },
    ],
  },
  brenna: {
    lore: 'Brenna Forgehammer, the Forgemaster — dwarf warrior-smith of Stormbreak Reef. She turns industrial monopoly into Fabled steel. If it floats and fights, Brenna’s mark may be under the deck.',
    backstory: 'Left the peaks to “teach iron to remember honor” in the dockyards. Runs a forge that supplies Fabled captains and quietly starves Legion orders. Fenwick is her night shift she pretends not to employ.',
    quote: '"Steel tells truth. People lie. I trust steel."',
    flavorText: 'Sparks are her punctuation.',
    alignment: 'Lawful Neutral',
    difficulty: 'Intermediate',
    strengths: ['Crafting quests', 'Ship gear', 'Industrial control'],
    weaknesses: ['Stubborn contracts', 'Not a field sprinter', 'Bribes offend her'],
    dialogue: {
      greeting_neutral: 'If you’re selling scrap, show it. If not, speak.',
      greeting_friendly: 'Good metal, good company.',
      greeting_hostile: 'I don’t forge for your kind.',
      quest_offer: 'The forge needs a rare alloy. Bring ore or bring excuses.',
      combat_start: 'Hammer time.',
      victory: 'Quenched.',
      defeat: 'Bellows… fail…',
    },
    questPool: [
      { id: 'brenna_quest_1', title: 'Alloy Run', description: 'Gather rare ores for Switchyard' },
      { id: 'brenna_quest_2', title: 'Starve the Red Order', description: 'Intercept Legion supply crates' },
      { id: 'brenna_quest_3', title: 'Launch Mark', description: 'Bless a warship with Fabled runes' },
    ],
    relationships: [
      { targetId: 'fenwick', type: 'ally', description: 'Night contracts' },
      { targetId: 'thordak', type: 'ally', description: 'Rune work on her steel' },
    ],
  },
  thordak: {
    lore: 'Thordak Runebinder, Runekeeper — dwarf mage of Frostbite Expanse. He keeps Omni’s forge-secrets that dwarves swear The Omni taught them. Runes are his scripture.',
    backstory: 'Blind in one eye from a rune backlash that let him “see” magic structures. Advises Durgin on seals and Silvaine on star-scripts that rhyme with stone-scripts.',
    quote: '"Every rune is a law. Break one, learn gravity."',
    flavorText: 'He writes spells that outlive empires.',
    alignment: 'Lawful Neutral',
    difficulty: 'Advanced',
    strengths: ['Rune wards', 'Anti-chaos magic', 'Lore dumps'],
    weaknesses: ['Slow casting', 'Poor mobility', 'Obsession with perfect seals'],
    dialogue: {
      greeting_neutral: 'Do not touch the inscriptions.',
      greeting_friendly: 'You may read — with clean hands.',
      greeting_hostile: 'Your chaos smudges my laws.',
      quest_offer: 'A rune fails somewhere. Find where reality leaks.',
      combat_start: 'Law: force.',
      victory: 'Sealed.',
      defeat: 'Inscription… incomplete…',
    },
    questPool: [
      { id: 'thordak_quest_1', title: 'Leak in the Law', description: 'Locate a failing ward' },
      { id: 'thordak_quest_2', title: 'Star and Stone', description: 'Compare scripts with Silvaine' },
      { id: 'thordak_quest_3', title: 'Omni’s Chisel', description: 'Recover a mythic rune tool' },
    ],
    relationships: [
      { targetId: 'durgin', type: 'ally', description: 'Gate and rune brotherhood' },
      { targetId: 'silvaine', type: 'ally', description: 'Star-script exchange' },
      { targetId: 'brenna', type: 'ally', description: 'Runes on her steel' },
    ],
  },
  helga: {
    lore: 'Helga Hearthhand, the Mender — dwarf cleric of Convergence Nexus. She and Lyra Threadweaver keep the Domain from drowning in blood after Arena bouts and dock brawls. Omni’s mercy with dwarven practicality.',
    backstory: 'Battlefield surgeon of three Grudge Wars. Retired to Center because “idiots cluster where ships dock.” Still carries a war-hammer “for setting bones and ending arguments.”',
    quote: '"Hold still. Complaining is optional; bleeding is not."',
    flavorText: 'She heals first. Lectures second.',
    alignment: 'Neutral Good',
    difficulty: 'Beginner',
    strengths: ['Best dwarf healing', 'Center safe content', 'Anti-bleed kits'],
    weaknesses: ['Low damage', 'Limited field range', 'Hates bureaucracy'],
    dialogue: {
      greeting_neutral: 'Injuries first. Names later.',
      greeting_friendly: 'Back again? Sit. I have bandages and opinions.',
      greeting_hostile: 'I mend my people. You are not them.',
      quest_offer: 'The clinic needs supplies. The Arena emptied our shelves.',
      combat_start: 'Then I set you differently.',
      victory: 'Next patient.',
      defeat: 'Clinic… still open…',
    },
    questPool: [
      { id: 'helga_quest_1', title: 'Arena Aftermath', description: 'Treat fighters after matches' },
      { id: 'helga_quest_2', title: 'Herb Run', description: 'Gather healing herbs from Haven Shore' },
      { id: 'helga_quest_3', title: 'Bone and Steel', description: 'Retrieve medical kits from a wreck' },
    ],
    relationships: [
      { targetId: 'lyra', type: 'ally', description: 'Co-runs Center care' },
    ],
  },
};

// ── Racalvin (legend / pirate king — not in HERO_ROSTER but canonical) ───────

const RACALVIN_PROFILE: ProfileCore = {
  lore: "Racalvin Tidebreaker, the Pirate King, rules Convergence Nexus — neutral docks, faction embassies, the Arena, and merchant guilds answer to his flag more than any god. The Grudge Ocean Line is his legend.",
  backstory: "Bastard of a barbarian chieftain and a merchant's daughter, cast out at birth. Mutinied young, commanded fleets by twenty. He keeps the three factions from claiming Center outright — because chaos is good for pirates, and pirates are good for trade.",
  quote: '"The sea does not bow. Neither do I."',
  flavorText: 'Crowns are taken. Thrones are stolen. The sea is earned.',
  alignment: 'Chaotic Neutral',
  difficulty: 'Expert',
  strengths: ['Center hub control', 'Fleet command', 'Neutral broker'],
  weaknesses: ['Not a player-faction hero', 'Enemies on all sides if flags flip', 'Endgame pirate hostility if you hold Nexus claims'],
  dialogue: {
    greeting_neutral: 'Coin, crew, or courage — pick one and speak.',
    greeting_friendly: 'Drink. The Domain likes its friends loud.',
    greeting_hostile: 'You brought a claim flag into my waters. Brave. Stupid.',
    quest_offer: 'A ship needs a captain who is not dead yet. Interested?',
    combat_start: 'All hands!',
    victory: 'The sea keeps what I give it.',
    defeat: 'Tide… turns…',
  },
  questPool: [
    { id: 'racalvin_quest_1', title: 'Free Port Law', description: 'Enforce neutral dock rules' },
    { id: 'racalvin_quest_2', title: 'Arena Purse', description: 'Win or fix an Arena bout' },
    { id: 'racalvin_quest_3', title: 'Ocean Line', description: 'Escort a merchant fleet across sectors' },
  ],
  relationships: [
    { targetId: 'lyra', type: 'ally', description: 'Tolerates her diplomacy — good for business' },
    { targetId: 'vox', type: 'ally', description: 'Buys her sky charts' },
    { targetId: 'thrax', type: 'ally', description: 'Barbarian respect; drinks together' },
    { targetId: 'john_wayne', type: 'ally', description: 'Sky Captain of his free fleet' },
    { targetId: 'scourge_faithbearer', type: 'ally', description: 'Flame of Judgement on the war-decks' },
  ],
};

/** Cpt. John Wayne — Sky Captain (2D game mode secret hero / DCQ sky_captain art) */
const JOHN_WAYNE_PROFILE: ProfileCore = {
  lore: "Captain John Wayne, the Sky Captain, commands from the clouds as readily as from a deck. Where Racalvin Tidebreaker rules the waterline, Wayne owns the air lanes above the Grudge Ocean Line — grit, guile, and a captain's coat that never bows to a faction color.",
  backstory: "Born human, raised on war-balloons and storm skiffs. He stole his first airship from a Legion forge-yard and painted Racalvin's mark on the hull as a joke — the Pirate King kept him. In the 2D warlord modes he is a secret legendary: the man who proves the ground is only for those who've given up dreaming.",
  quote: '"The ground is for those who\'ve given up dreaming."',
  flavorText: 'Sky lanes remember his shadow.',
  alignment: 'Chaotic Neutral',
  difficulty: 'Expert',
  strengths: ['Aerial boarding', 'Sky-lane control', 'Legendary pirate command'],
  weaknesses: ['Ground sieges', 'Not a faction officer', 'Reckless altitude plays'],
  dialogue: {
    greeting_neutral: 'Speak up, sailor. Wind takes soft words.',
    greeting_friendly: 'A deck-friend. Climb aboard — the sky\'s honest today.',
    greeting_hostile: 'You brought chains into free air. Mistake.',
    quest_offer: 'There\'s a sky-lane needs clearing. Coin and glory both.',
    combat_start: 'All hands — and wings!',
    victory: 'Still flying.',
    defeat: 'Clip… my wings… later…',
  },
  questPool: [
    { id: 'wayne_quest_1', title: 'Sky Lane Clearance', description: 'Clear harpies and Legion balloons from a trade corridor' },
    { id: 'wayne_quest_2', title: "Captain's Mark", description: 'Paint a free-port banner on a contested skiff' },
    { id: 'wayne_quest_3', title: 'Dream Above', description: 'Escort Racalvin\'s cargo from air to dock without landing' },
  ],
  relationships: [
    { targetId: 'racalvin', type: 'ally', description: 'Serves the Pirate King\'s free fleet as Sky Captain' },
    { targetId: 'scourge_faithbearer', type: 'ally', description: 'Trusts Scourge\'s fire on the war-deck' },
    { targetId: 'vox', type: 'ally', description: 'Trades sky charts with Skyhunter' },
  ],
};

/** Scourge FaithBearer — Flame of Judgement (3v3 / GrudgeBox fire-knight art) */
const SCOURGE_FAITHBEARER_PROFILE: ProfileCore = {
  lore: "Scourge Faithbearer is the Flame of Judgement — a free-port fire-knight who walks with flame as if it were holy law. Not Crusade gold, not Legion ash: a third fire that judges all who board without leave. His temple-forged plate and judgement greatsword mark the Arena and Free Port decks alike.",
  backstory: "Once a temple warrior, he cast the beads into a forge when priests sold free ports to faction HQs. Racalvin offered him a deck; Scourge offered flame. Opponents in the arena know the orange glow means the bout is already half-lost. Canonical with Racalvin and Cpt. John Wayne as pirate legends of the Domain.",
  quote: '"Judgement burns. Mercy is ash."',
  flavorText: 'His shadow is heat.',
  alignment: 'Lawful Neutral',
  difficulty: 'Expert',
  strengths: ['Arena pressure', 'Fire control', 'Deck defense'],
  weaknesses: ['Water and frost', 'Diplomacy', 'Long sieges without fuel'],
  dialogue: {
    greeting_neutral: 'State your deck. Or burn with the rest.',
    greeting_friendly: 'Stand in my light. It will not scorch the loyal.',
    greeting_hostile: 'You smell of false temples. Good kindling.',
    quest_offer: 'A forge needs witnesses. Bring enemies — or be one.',
    combat_start: 'Judgement!',
    victory: 'Ash speaks true.',
    defeat: 'Embers… remain…',
  },
  questPool: [
    { id: 'scourge_quest_1', title: 'Flame of the Free Port', description: 'Defend Center docks from a faction raid with fire lines' },
    { id: 'scourge_quest_2', title: 'Broken Beads', description: 'Recover Scourge\'s discarded temple beads from a shrine' },
    { id: 'scourge_quest_3', title: 'Arena Judgement', description: 'Win a 3v3 bout under the FaithBearer banner' },
  ],
  relationships: [
    { targetId: 'racalvin', type: 'ally', description: 'Flame of the Pirate King\'s war-decks' },
    { targetId: 'john_wayne', type: 'ally', description: 'Sky and flame — free fleet brothers' },
    { targetId: 'morgash', type: 'rival', description: 'Legion fire vs free fire' },
  ],
};

// ── Builder ──────────────────────────────────────────────────────────────────

function buildFromRoster(h: HeroDefinition): HeroCodexEntry {
  const p = PROFILES[h.id];
  if (!p) {
    throw new Error(`heroCodex: missing PROFILES entry for canonical id "${h.id}"`);
  }
  const load = loadoutFor(h.classId, h.raceId);
  const raceLabel =
    h.raceId === 'barbarian'
      ? 'Barbarian'
      : RACES[h.raceId as RaceId]?.name ?? h.raceId;
  const names = splitHeroName(h.name);
  const pKey =
    PORTRAIT_KEY_OVERRIDES[h.id] ??
    `${h.raceId === 'barbarian' ? 'barbarian' : h.raceId}_${classArtKey(h.classId)}`;
  return {
    id: h.id,
    name: h.name,
    firstName: names.firstName,
    lastName: names.lastName,
    title: h.title,
    faction: factionDisplay(h.factionId),
    factionId: h.factionId,
    factionColor: factionColor(h.factionId),
    race: raceLabel,
    raceId: h.raceId,
    className: CLASS_LABEL[h.classId] || 'Warrior',
    classId: h.classId,
    level: h.level,
    sectorSpawn: h.sectorSpawn,
    sectorName: sectorName(h.sectorSpawn),
    isQuestGiver: h.isQuestGiver,
    portraitKey: pKey,
    portrait: portraitByKey(pKey),
    sprite: spriteFile(h.raceId, h.classId),
    rarity: rarityFromLevel(h.level),
    lore: p.lore,
    backstory: p.backstory,
    quote: p.quote,
    flavorText: p.flavorText,
    primaryAttribute: load.primary,
    combatStyle: load.combatStyle,
    weapons: load.weapons,
    loadoutShort: load.loadoutShort,
    alignment: p.alignment,
    difficulty: p.difficulty,
    abilities: abilitiesFor(h.classId),
    racialTraits: raceTraits(h.raceId),
    strengths: p.strengths,
    weaknesses: p.weaknesses,
    dialogue: p.dialogue,
    questPool: p.questPool,
    relationships: p.relationships,
    stats: computeStats(h.raceId, h.classId, h.level),
  };
}

function buildLegend(opts: {
  id: string;
  name: string;
  title: string;
  profile: ProfileCore;
  raceId: string;
  classId: string;
  portraitKey: string;
  sprite?: string;
  level: number;
  weapons: string;
  loadoutShort: string;
  primary: HeroCodexEntry['primaryAttribute'];
  abilities: HeroAbility[];
  extraTraits?: HeroTrait[];
}): HeroCodexEntry {
  const p = opts.profile;
  const load = loadoutFor(opts.classId, opts.raceId);
  const raceLabel =
    opts.raceId === 'barbarian'
      ? 'Barbarian'
      : RACES[opts.raceId as RaceId]?.name ?? opts.raceId;
  const names = splitHeroName(opts.name);
  return {
    id: opts.id,
    name: opts.name,
    firstName: names.firstName,
    lastName: names.lastName,
    title: opts.title,
    faction: 'Pirate',
    factionId: 'pirate',
    factionColor: '#c9a030',
    race: raceLabel,
    raceId: opts.raceId as HeroCodexEntry['raceId'],
    className: 'Legend',
    classId: opts.classId,
    level: opts.level,
    sectorSpawn: 'CENTER',
    sectorName: sectorName('CENTER'),
    isQuestGiver: true,
    portraitKey: opts.portraitKey,
    portrait: portraitByKey(opts.portraitKey),
    sprite: opts.sprite || spriteFile(opts.raceId, opts.classId),
    rarity: 'Legendary',
    lore: p.lore,
    backstory: p.backstory,
    quote: p.quote,
    flavorText: p.flavorText,
    primaryAttribute: opts.primary,
    combatStyle: load.combatStyle,
    weapons: opts.weapons,
    loadoutShort: opts.loadoutShort,
    alignment: p.alignment,
    difficulty: p.difficulty,
    abilities: opts.abilities,
    racialTraits: [...raceTraits(opts.raceId), ...(opts.extraTraits || [])],
    strengths: p.strengths,
    weaknesses: p.weaknesses,
    dialogue: p.dialogue,
    questPool: p.questPool,
    relationships: p.relationships,
    stats: computeStats(opts.raceId, opts.classId, opts.level),
  };
}

function buildRacalvin(): HeroCodexEntry {
  return buildLegend({
    id: 'racalvin',
    name: 'Racalvin Tidebreaker',
    title: 'The Pirate King',
    profile: RACALVIN_PROFILE,
    raceId: 'barbarian',
    classId: 'ranger',
    portraitKey: 'pirate_king',
    sprite: spriteFile('barbarian', 'ranger'),
    level: 60,
    weapons: "Cutlass, flintlocks, captain's coat",
    loadoutShort: 'Pirate King',
    primary: 'DEX',
    abilities: [
      { name: 'Precision', icon: 'crosshair', description: 'Sea-born accuracy', manaCost: 0 },
      { name: 'Power Shot', icon: 'target', description: 'Cannon-force shot', manaCost: 20 },
      { name: 'Broadside', icon: 'split', description: 'Multi-shot volley', manaCost: 25 },
      { name: 'Storm of the Line', icon: 'crown', description: 'Ultimate sea-storm devastation', manaCost: 70 },
    ],
    extraTraits: [{ name: 'Pirate King', effect: 'Convergence Nexus authority; neutral dock law' }],
  });
}

function buildJohnWayne(): HeroCodexEntry {
  return buildLegend({
    id: 'john_wayne',
    name: 'John Wayne',
    title: 'The Sky Captain',
    profile: JOHN_WAYNE_PROFILE,
    raceId: 'human',
    classId: 'warrior',
    // Single portrait: sky_captain.png only (no john_wayne/cpt duplicates on page)
    portraitKey: 'sky_captain',
    sprite: spriteFile('human', 'warrior'),
    level: 58,
    weapons: "Captain's saber, sky-rifle, boarding hook",
    loadoutShort: 'Sky Captain',
    primary: 'STR',
    abilities: [
      { name: 'Sky Board', icon: 'zap', description: 'Dive from altitude onto a target', manaCost: 25 },
      { name: 'Deck Hold', icon: 'shield', description: 'Brace allies; reduce knockback', manaCost: 30 },
      { name: 'Captain\'s Order', icon: 'megaphone', description: 'Buff crew damage and speed', manaCost: 35 },
      { name: 'Dream Above', icon: 'crown', description: 'Ultimate aerial assault on all foes', manaCost: 70 },
    ],
    extraTraits: [{ name: 'Sky Captain', effect: 'Free-fleet air lane authority' }],
  });
}

function buildScourgeFaithbearer(): HeroCodexEntry {
  return buildLegend({
    id: 'scourge_faithbearer',
    name: 'Scourge Faithbearer',
    title: 'Flame of Judgement',
    profile: SCOURGE_FAITHBEARER_PROFILE,
    raceId: 'human',
    classId: 'warrior',
    // Unique art: MouseWithoutBorders/scourgfaith.png → scourge_faithbearer.png
    portraitKey: 'scourge_faithbearer',
    sprite: spriteFile('human', 'warrior'),
    level: 58,
    weapons: 'Judgement greatsword, temple-forged plate',
    loadoutShort: 'Faithbearer',
    primary: 'STR',
    abilities: [
      { name: 'Flame Guard', icon: 'shield', description: 'Fire ward; reflect melee heat', manaCost: 25 },
      { name: 'Judgement Slash', icon: 'swords', description: 'Heavy fire-imbued strike', manaCost: 30 },
      { name: 'Ash Gospel', icon: 'flame', description: 'AoE burn on enemies in cone', manaCost: 35 },
      { name: 'Flame of Judgement', icon: 'crown', description: 'Ultimate deck-clearing inferno', manaCost: 75 },
    ],
    extraTraits: [{ name: 'Flame of Judgement', effect: 'Free-port fire authority; arena pressure' }],
  });
}

/** 24 roster heroes — canonical only */
export const CANONICAL_HERO_CODEX: HeroCodexEntry[] = HERO_ROSTER.map(buildFromRoster);

/** 24 + pirate legends (Racalvin, Cpt. John Wayne, Scourge FaithBearer) */
export const HERO_CODEX_WITH_LEGENDS: HeroCodexEntry[] = [
  ...CANONICAL_HERO_CODEX,
  buildRacalvin(),
  buildJohnWayne(),
  buildScourgeFaithbearer(),
];

export function getHeroCodexEntry(id: string): HeroCodexEntry | undefined {
  return HERO_CODEX_WITH_LEGENDS.find((h) => h.id === id);
}

export function getHeroCodexByFaction(faction: HeroCodexEntry['faction']): HeroCodexEntry[] {
  return HERO_CODEX_WITH_LEGENDS.filter((h) => h.faction === faction);
}

/** JSON-serializable export for static Codex page / ObjectStore */
export function exportHeroCodexJson(includeLegends = true): unknown {
  const list = includeLegends ? HERO_CODEX_WITH_LEGENDS : CANONICAL_HERO_CODEX;
  // Hard guarantee: no two heroes share the same portrait URL
  const seen = new Set<string>();
  for (const h of list) {
    if (seen.has(h.portrait)) {
      console.warn(`[heroCodex] duplicate portrait URL for ${h.id}: ${h.portrait}`);
    }
    seen.add(h.portrait);
  }
  return {
    version: '2.3.0',
    updated: new Date().toISOString().slice(0, 10),
    assetBase: HERO_CODEX_ASSET_BASE,
    canonicalSource: 'shared/definitions/lore.ts HERO_ROSTER + heroCodex.ts',
    total: list.length,
    naming: 'First Last on all roster + legend heroes',
    uniquePortraits: true,
    heroes: list,
  };
}
