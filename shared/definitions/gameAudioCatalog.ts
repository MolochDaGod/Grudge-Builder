/**
 * Game Audio Catalog — CANONICAL SFX / BGM event → CDN keys
 *
 * CDN base: https://assets.grudge-studio.com/
 * Upload: scripts/upload-game-audio.mjs (ObjectStore/audio → R2 audio/)
 *
 * play via: playGameSfx('skill.warrior.charge') from audioManager
 */

export const AUDIO_CDN_PREFIX = 'audio' as const;

export type GameAudioCategory =
  | 'ui'
  | 'combat_melee'
  | 'combat_ranged'
  | 'combat_magic'
  | 'skill'
  | 'status'
  | 'movement'
  | 'npc'
  | 'race'
  | 'class'
  | 'world'
  | 'music';

export interface GameAudioEvent {
  id: string;
  category: GameAudioCategory;
  /** R2 key relative to assets root (no leading slash) */
  key: string;
  /** Optional alternate keys for variety */
  variants?: string[];
  description: string;
  /** Default volume 0–1 */
  volume?: number;
  tags?: string[];
}

function fx(name: string): string {
  return `${AUDIO_CDN_PREFIX}/fx/${name}`;
}
function pack(name: string): string {
  return `${AUDIO_CDN_PREFIX}/sfx/pack/${name}`;
}
function music(name: string): string {
  return `${AUDIO_CDN_PREFIX}/music/${name}`;
}
function root(name: string): string {
  return `${AUDIO_CDN_PREFIX}/${name}`;
}

/**
 * Full event map — skills, combat, status, NPC, class cues.
 * Prefer short OGG for SFX; music stays longer form.
 */
export const GAME_AUDIO_EVENTS: GameAudioEvent[] = [
  // ── UI ───────────────────────────────────────────────────────────────────
  { id: 'ui.click', category: 'ui', key: fx('click.ogg'), description: 'Menu / button click' },
  { id: 'ui.select', category: 'ui', key: fx('select.ogg'), description: 'Selection confirm' },
  { id: 'ui.error', category: 'ui', key: fx('error.ogg'), description: 'Invalid action' },
  { id: 'ui.levelup', category: 'ui', key: fx('levelup.ogg'), description: 'Level up fanfare' },
  { id: 'ui.train', category: 'ui', key: fx('train.ogg'), description: 'Skill train / learn' },

  // ── Combat contact ───────────────────────────────────────────────────────
  {
    id: 'combat.hit.melee',
    category: 'combat_melee',
    key: root('swish_2.wav'),
    variants: [root('swish_3.wav'), root('swish_4.wav'), fx('sword_clash.ogg')],
    description: 'Generic melee hit / swing',
    tags: ['hurt', 'weapon'],
  },
  {
    id: 'combat.hit.sword',
    category: 'combat_melee',
    key: fx('sword_clash.ogg'),
    variants: [root('swish_2.wav'), root('swish_3.wav')],
    description: 'Sword clash / blade contact',
    tags: ['weapon', '1h', '2h'],
  },
  {
    id: 'combat.hit.bow',
    category: 'combat_ranged',
    key: root('bow.wav'),
    variants: [fx('arrow_fire.wav'), fx('arrow_hit.ogg')],
    description: 'Bow fire / arrow release',
    tags: ['weapon', 'bow'],
  },
  {
    id: 'combat.arrow.hit',
    category: 'combat_ranged',
    key: fx('arrow_hit.ogg'),
    description: 'Arrow impact',
  },
  {
    id: 'combat.magic.cast',
    category: 'combat_magic',
    key: fx('magic_cast.ogg'),
    description: 'Generic spell cast whoosh',
    tags: ['spell', 'mage'],
  },
  {
    id: 'combat.magic.fire',
    category: 'combat_magic',
    key: fx('fire_impact.ogg'),
    variants: [fx('magic_cast.ogg')],
    description: 'Fire spell impact / fireball',
    tags: ['spell', 'fire', 'burning'],
  },
  {
    id: 'combat.magic.thunder',
    category: 'combat_magic',
    key: fx('thunder.ogg'),
    description: 'Lightning / chain lightning',
    tags: ['spell', 'shocked'],
  },
  {
    id: 'combat.heal',
    category: 'combat_magic',
    key: fx('heal.ogg'),
    description: 'Heal / regen tick pulse',
    tags: ['spell', 'regenerating'],
  },
  {
    id: 'combat.cannon',
    category: 'combat_ranged',
    key: fx('cannon_fire.ogg'),
    description: 'Heavy gun / siege shot',
    tags: ['weapon', 'gun_2h'],
  },
  {
    id: 'combat.death',
    category: 'combat_melee',
    key: fx('death.ogg'),
    description: 'Unit death',
    tags: ['npc', 'player'],
  },
  {
    id: 'combat.defeat',
    category: 'ui',
    key: fx('defeat.ogg'),
    description: 'Party wipe / lose',
  },
  {
    id: 'combat.victory',
    category: 'ui',
    key: fx('victory.ogg'),
    description: 'Victory sting',
  },

  // ── Skills: Warrior ──────────────────────────────────────────────────────
  {
    id: 'skill.warrior.charge',
    category: 'skill',
    key: fx('move.ogg'),
    variants: [root('swish_3.wav'), fx('sword_clash.ogg')],
    description: 'Charge dash whoosh + impact',
    tags: ['warrior', 'charge'],
    volume: 0.7,
  },
  {
    id: 'skill.warrior.charge.impact',
    category: 'skill',
    key: fx('sword_clash.ogg'),
    description: 'Charge land / stun hit',
    tags: ['warrior', 'stunned'],
  },
  {
    id: 'skill.warrior.invincible',
    category: 'skill',
    key: fx('levelup.ogg'),
    variants: [fx('heal.ogg')],
    description: 'Invincible + taunt bubble',
    tags: ['warrior', 'invincible'],
  },
  {
    id: 'skill.warrior.taunt',
    category: 'skill',
    key: fx('select.ogg'),
    description: 'Taunt bark cue',
    tags: ['warrior'],
  },
  {
    id: 'skill.warrior.avatar',
    category: 'skill',
    key: fx('thunder.ogg'),
    variants: [fx('levelup.ogg'), fx('victory.ogg')],
    description: 'Avatar of War transform',
    tags: ['warrior', 'avatar'],
    volume: 0.85,
  },
  {
    id: 'skill.warrior.perfect_counter',
    category: 'skill',
    key: fx('sword_clash.ogg'),
    variants: [fx('build_complete.ogg')],
    description: 'Perfect counter / parry shimmer',
    tags: ['warrior'],
  },
  {
    id: 'skill.warrior.shield_wall',
    category: 'skill',
    key: fx('build_start.ogg'),
    description: 'Shield wall raise',
    tags: ['warrior', 'shielded'],
  },
  {
    id: 'skill.warrior.execute',
    category: 'skill',
    key: fx('death.ogg'),
    variants: [fx('sword_clash.ogg')],
    description: 'Execute finisher',
    tags: ['warrior'],
  },

  // ── Skills: Ranger ───────────────────────────────────────────────────────
  {
    id: 'skill.ranger.fade_in',
    category: 'skill',
    key: fx('move.ogg'),
    variants: [fx('magic_cast.ogg')],
    description: 'Going invisible / Fade enter',
    tags: ['ranger', 'stealthed'],
    volume: 0.55,
  },
  {
    id: 'skill.ranger.fade_out',
    category: 'skill',
    key: fx('select.ogg'),
    description: 'Stealth broken / become visible',
    tags: ['ranger'],
  },
  {
    id: 'skill.ranger.powershot',
    category: 'skill',
    key: root('bow.wav'),
    variants: [fx('arrow_fire.wav'), fx('cannon_fire.ogg')],
    description: 'Power shot leap + fire',
    tags: ['ranger'],
  },
  {
    id: 'skill.ranger.multishot',
    category: 'skill',
    key: fx('arrow_fire.wav'),
    variants: [root('bow.wav')],
    description: 'Multi shot volley',
    tags: ['ranger'],
  },
  {
    id: 'skill.ranger.explosive',
    category: 'skill',
    key: fx('fire_impact.ogg'),
    variants: [fx('cannon_fire.ogg')],
    description: 'Explosive shot',
    tags: ['ranger'],
  },
  {
    id: 'skill.ranger.shadow_step',
    category: 'skill',
    key: fx('magic_cast.ogg'),
    description: 'Shadow step teleport',
    tags: ['ranger', 'stealthed'],
  },
  {
    id: 'skill.ranger.shadow_master',
    category: 'skill',
    key: fx('thunder.ogg'),
    description: 'Shadow Master phase enter',
    tags: ['ranger', 'shadow_master'],
  },
  {
    id: 'skill.ranger.assassinate',
    category: 'skill',
    key: fx('death.ogg'),
    variants: [fx('sword_clash.ogg')],
    description: 'Assassinate strike',
    tags: ['ranger'],
  },

  // ── Skills: Mage ─────────────────────────────────────────────────────────
  {
    id: 'skill.mage.fireball',
    category: 'skill',
    key: fx('fire_impact.ogg'),
    variants: [fx('magic_cast.ogg')],
    description: 'Fireball cast + impact',
    tags: ['mage', 'burning'],
  },
  {
    id: 'skill.mage.shield',
    category: 'skill',
    key: fx('heal.ogg'),
    variants: [fx('magic_cast.ogg')],
    description: 'Mage shield up',
    tags: ['mage', 'mana_shield'],
  },
  {
    id: 'skill.mage.missile',
    category: 'skill',
    key: fx('magic_cast.ogg'),
    description: 'Magic missiles',
    tags: ['mage'],
  },
  {
    id: 'skill.mage.blink',
    category: 'skill',
    key: fx('move.ogg'),
    variants: [fx('magic_cast.ogg')],
    description: 'Blink teleport',
    tags: ['mage'],
  },
  {
    id: 'skill.mage.meteor',
    category: 'skill',
    key: fx('thunder.ogg'),
    variants: [fx('fire_impact.ogg'), fx('cannon_fire.ogg')],
    description: 'Meteor impact',
    tags: ['mage'],
    volume: 0.85,
  },
  {
    id: 'skill.mage.archmage',
    category: 'skill',
    key: fx('levelup.ogg'),
    variants: [fx('thunder.ogg')],
    description: 'Archmage / reality tear apex',
    tags: ['mage'],
  },

  // ── Skills: Worge ────────────────────────────────────────────────────────
  {
    id: 'skill.worge.form_swap',
    category: 'skill',
    key: fx('magic_cast.ogg'),
    variants: [fx('train.ogg')],
    description: 'Shapeshift form change',
    tags: ['worg', 'in_form'],
  },
  {
    id: 'skill.worge.howl',
    category: 'skill',
    key: fx('defeat.ogg'),
    variants: [fx('thunder.ogg')],
    description: 'Primal howl',
    tags: ['worg'],
  },
  {
    id: 'skill.worge.alpha_call',
    category: 'skill',
    key: fx('train.ogg'),
    description: "Alpha's Call summon",
    tags: ['worg'],
  },
  {
    id: 'skill.worge.primal_avatar',
    category: 'skill',
    key: fx('levelup.ogg'),
    variants: [fx('victory.ogg')],
    description: 'Primal Avatar transform',
    tags: ['worg'],
  },
  {
    id: 'skill.nature.roots',
    category: 'skill',
    key: fx('build_start.ogg'),
    variants: [fx('magic_cast.ogg')],
    description: 'Roots underground then sprout',
    tags: ['rooted', 'nature'],
  },
  {
    id: 'skill.nature.regen',
    category: 'skill',
    key: fx('heal.ogg'),
    description: 'Nature regen HoT',
    tags: ['regenerating'],
  },

  // ── Status apply / cleanse cues ──────────────────────────────────────────
  { id: 'status.apply.burning', category: 'status', key: fx('fire_impact.ogg'), description: 'Burn applied', tags: ['burning'] },
  { id: 'status.apply.poisoned', category: 'status', key: fx('heal.ogg'), description: 'Poison applied (wet/toxin)', tags: ['poisoned'] },
  { id: 'status.apply.stunned', category: 'status', key: fx('sword_clash.ogg'), description: 'Stun applied', tags: ['stunned'] },
  { id: 'status.apply.frozen', category: 'status', key: fx('magic_cast.ogg'), description: 'Freeze applied', tags: ['frozen'] },
  { id: 'status.cleanse', category: 'status', key: fx('heal.ogg'), description: 'DoT cleanse (Fade)', tags: ['stealthed'] },

  // ── NPC / dialogue flow ──────────────────────────────────────────────────
  { id: 'npc.greet', category: 'npc', key: fx('select.ogg'), description: 'NPC interaction open (pair with dialogue voice)' },
  { id: 'npc.quest', category: 'npc', key: fx('train.ogg'), description: 'Quest accept / turn-in' },
  { id: 'npc.shop', category: 'npc', key: fx('click.ogg'), description: 'Merchant open' },
  { id: 'npc.death', category: 'npc', key: fx('death.ogg'), description: 'NPC / enemy death' },

  // ── World / build ────────────────────────────────────────────────────────
  { id: 'world.build.start', category: 'world', key: fx('build_start.ogg'), description: 'Place building start' },
  { id: 'world.build.complete', category: 'world', key: fx('build_complete.ogg'), description: 'Build complete' },
  { id: 'world.move', category: 'movement', key: fx('move.ogg'), description: 'Footstep / move cue (sparse)' },
  { id: 'world.ship_sink', category: 'world', key: fx('ship_sink.ogg'), description: 'Ship sinks' },

  // ── Class / race flavor (shared stingers) ────────────────────────────────
  { id: 'class.warrior.ready', category: 'class', key: fx('sword_clash.ogg'), description: 'Warrior loadout equip' },
  { id: 'class.mage.ready', category: 'class', key: fx('magic_cast.ogg'), description: 'Mage loadout equip' },
  { id: 'class.ranger.ready', category: 'class', key: root('bow.wav'), description: 'Ranger loadout equip' },
  { id: 'class.worg.ready', category: 'class', key: fx('train.ogg'), description: 'Worge loadout equip' },
  { id: 'race.equip', category: 'race', key: fx('select.ogg'), description: 'Race select / equip generic' },

  // ── Music beds ───────────────────────────────────────────────────────────
  { id: 'music.battle', category: 'music', key: music('corrupted-circuitry.ogg'), description: 'Combat BGM' },
  { id: 'music.ocean', category: 'music', key: music('beach-vibes.ogg'), description: 'Ocean / sail' },
  { id: 'music.dungeon', category: 'music', key: music('temple-puzzle.ogg'), description: 'Dungeon' },
  { id: 'music.dawn', category: 'music', key: music('refreshing-dawn.ogg'), description: 'Peaceful dawn' },
  { id: 'music.tavern', category: 'music', key: root('bgm_tavern.ogg'), description: 'Tavern hub' },
  { id: 'music.explore', category: 'music', key: root('bgm_harukaze.ogg'), description: 'Explore overworld' },
  { id: 'music.camp', category: 'music', key: root('bgm_camping.ogg'), description: 'Camp / rest' },
  { id: 'music.title', category: 'music', key: root('intro_theme.mp3'), description: 'Title / intro' },
];

export const GAME_AUDIO_BY_ID: Record<string, GameAudioEvent> = Object.fromEntries(
  GAME_AUDIO_EVENTS.map((e) => [e.id, e]),
);

/** Ability / status id → default audio event */
export const ABILITY_AUDIO: Record<string, string> = {
  warrior_charge: 'skill.warrior.charge',
  warrior_invincible: 'skill.warrior.invincible',
  warrior_taunt: 'skill.warrior.taunt',
  warrior_avatar: 'skill.warrior.avatar',
  warrior_perfect_counter: 'skill.warrior.perfect_counter',
  warrior_shield_wall: 'skill.warrior.shield_wall',
  warrior_execute: 'skill.warrior.execute',
  warrior_quick_strike: 'combat.hit.melee',
  warrior_double_strike: 'combat.hit.melee',
  warrior_life_drain: 'combat.heal',
  warrior_dual_combo_stun: 'combat.hit.sword',

  ranger_fade: 'skill.ranger.fade_in',
  ranger_powershot: 'skill.ranger.powershot',
  ranger_multishot: 'skill.ranger.multishot',
  ranger_explosive_shot: 'skill.ranger.explosive',
  ranger_shadow_step: 'skill.ranger.shadow_step',
  ranger_shadow_master: 'skill.ranger.shadow_master',
  ranger_assassinate: 'skill.ranger.assassinate',
  ranger_clean_strike: 'combat.hit.melee',
  ranger_poison_strike: 'combat.hit.melee',
  ranger_headshot: 'combat.hit.bow',
  ranger_rain_of_arrows: 'skill.ranger.multishot',
  ranger_storm_of_arrows: 'skill.ranger.powershot',

  mage_fireball: 'skill.mage.fireball',
  mage_shield: 'skill.mage.shield',
  mage_magic_missile: 'skill.mage.missile',
  mage_heal: 'combat.heal',
  mage_blink: 'skill.mage.blink',
  mage_meteor: 'skill.mage.meteor',
  mage_archmage: 'skill.mage.archmage',
  mage_reality_tear: 'skill.mage.archmage',
  mage_chain_lightning: 'combat.magic.thunder',
  mage_group_heal: 'combat.heal',
  mage_portal: 'skill.mage.blink',

  worg_howl: 'skill.worge.howl',
  worg_alpha_call: 'skill.worge.alpha_call',
  worg_primal_avatar: 'skill.worge.primal_avatar',
  worg_worge_lord: 'skill.worge.alpha_call',
  nature_roots: 'skill.nature.roots',
  nature_regen: 'skill.nature.regen',
};

export const STATUS_AUDIO: Record<string, string> = {
  burning: 'status.apply.burning',
  poisoned: 'status.apply.poisoned',
  stunned: 'status.apply.stunned',
  frozen: 'status.apply.frozen',
  stealthed: 'skill.ranger.fade_in',
  regenerating: 'combat.heal',
  invincible: 'skill.warrior.invincible',
  avatar: 'skill.warrior.avatar',
  damage_surge: 'skill.warrior.charge.impact',
};

export function resolveAudioEventId(opts: {
  abilityId?: string;
  statusId?: string;
  eventId?: string;
}): string | null {
  if (opts.eventId && GAME_AUDIO_BY_ID[opts.eventId]) return opts.eventId;
  if (opts.abilityId && ABILITY_AUDIO[opts.abilityId]) return ABILITY_AUDIO[opts.abilityId];
  if (opts.statusId && STATUS_AUDIO[opts.statusId]) return STATUS_AUDIO[opts.statusId];
  return null;
}

export function audioCdnUrl(key: string, base = 'https://assets.grudge-studio.com'): string {
  return `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}
