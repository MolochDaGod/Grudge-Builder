/**
 * Grimoire / Wand / Worge Forms — CANONICAL cast & shapeshift SSOT
 *
 * Equipment idle (see weapon-attach design):
 *   - Wand  → same idle socket as grimoire: right belt chain (hip_r_belt)
 *   - Grimoire → hip_r_belt float book; also form UI + nature offhand tome
 *
 * Mage (wand equipped, humanoid):
 *   F        = Fireball (primary cast)
 *   Shift+1  = Mage Shield
 *   Shift+2  = Magic Missiles  OR  Heal        (spec branch)
 *   Shift+3  = Chain Lightning | Blink | Group Heal
 *   Shift+4  = Meteor | Portal
 *   Shift+5  = Reality Tear | Archmage apex (improves F / form kit)
 *
 * Worge (grimoire form book — 3 loadout slots):
 *   F        = Swap to MAIN form (slot 0)
 *   Shift+1  = Form slot 1
 *   Shift+2  = Form slot 2
 *   Shift+3  = Howl (any animal form)  — if form supports howl
 *   Shift+4  = Alpha's Call
 *   Shift+5  = Worge Lord  OR  Primal Avatar
 *
 * Hybrid (1H weapon + grimoire as nature offhand tome):
 *   Alt+1    = Regen (HoT)
 *   Alt+2    = Roots (underground root VFX → sprout)
 *
 * Form unlock: rare bloom wildlife (1/100 gold or blue bloom) + skin → form token;
 *              hidden missions: dragon, passenger flight, wareowl (secret).
 */

// ── Attach / equipment ───────────────────────────────────────────────────────

export type CastToolAttach = {
  /** Idle sheath socket — shared for wand + grimoire */
  idleSocket: 'hip_r_belt';
  readySocketWand: 'hand_r' | 'cast_float';
  readySocketGrimoire: 'cast_float' | 'hand_l';
};

export const CAST_TOOL_ATTACH: CastToolAttach = {
  idleSocket: 'hip_r_belt',
  readySocketWand: 'hand_r',
  readySocketGrimoire: 'cast_float',
};

/** Wand uses same belt idle as grimoire; only combat ready differs. */
export const WAND_ATTACH_CLASS = 'wand' as const;
export const GRIMOIRE_ATTACH_CLASS = 'tome' as const;

// ── Keybinds ─────────────────────────────────────────────────────────────────

export type Modifier = 'none' | 'shift' | 'alt' | 'ctrl';

export interface CastBinding {
  id: string;
  /** Physical key: F, 1-5 (with modifier) */
  key: 'F' | '1' | '2' | '3' | '4' | '5';
  mod: Modifier;
  label: string;
}

export const BIND = {
  F: { id: 'bind_f', key: 'F', mod: 'none', label: 'F' } as CastBinding,
  S1: { id: 'bind_s1', key: '1', mod: 'shift', label: 'Shift+1' } as CastBinding,
  S2: { id: 'bind_s2', key: '2', mod: 'shift', label: 'Shift+2' } as CastBinding,
  S3: { id: 'bind_s3', key: '3', mod: 'shift', label: 'Shift+3' } as CastBinding,
  S4: { id: 'bind_s4', key: '4', mod: 'shift', label: 'Shift+4' } as CastBinding,
  S5: { id: 'bind_s5', key: '5', mod: 'shift', label: 'Shift+5' } as CastBinding,
  A1: { id: 'bind_a1', key: '1', mod: 'alt', label: 'Alt+1' } as CastBinding,
  A2: { id: 'bind_a2', key: '2', mod: 'alt', label: 'Alt+2' } as CastBinding,
} as const;

// ── Mage wand bar ────────────────────────────────────────────────────────────

export type MageSpecPath = 'fire' | 'arcane' | 'holy';

export interface MageSlotDef {
  bind: CastBinding;
  /** Default ability when no branch chosen */
  defaultAbilityId: string;
  /** Spec choices fill this slot (player tree / grimoire talent) */
  options: Array<{
    abilityId: string;
    name: string;
    path?: MageSpecPath | 'any';
    /** Skill-tree id if already defined */
    skillTreeId?: string;
  }>;
}

/**
 * Mage casting bar — requires wand (or staff-as-wand) equipped.
 * F is always Fireball (class identity).
 */
export const MAGE_WAND_BAR: MageSlotDef[] = [
  {
    bind: BIND.F,
    defaultAbilityId: 'mage_fireball',
    options: [
      {
        abilityId: 'mage_fireball',
        name: 'Fireball',
        path: 'fire',
        skillTreeId: 'mage_1_fireball',
      },
    ],
  },
  {
    bind: BIND.S1,
    defaultAbilityId: 'mage_shield',
    options: [
      {
        abilityId: 'mage_shield',
        name: 'Mage Shield',
        path: 'any',
        skillTreeId: 'mage_mana_shield',
      },
    ],
  },
  {
    bind: BIND.S2,
    defaultAbilityId: 'mage_magic_missile',
    options: [
      {
        abilityId: 'mage_magic_missile',
        name: 'Magic Missiles',
        path: 'arcane',
        skillTreeId: 'mage_0_missile',
      },
      {
        abilityId: 'mage_heal',
        name: 'Healing Light',
        path: 'holy',
        skillTreeId: 'mage_1_heal',
      },
    ],
  },
  {
    bind: BIND.S3,
    defaultAbilityId: 'mage_chain_lightning',
    options: [
      {
        abilityId: 'mage_chain_lightning',
        name: 'Chain Lightning',
        path: 'arcane',
      },
      {
        abilityId: 'mage_blink',
        name: 'Blink',
        path: 'arcane',
        skillTreeId: 'mage_10_blink',
      },
      {
        abilityId: 'mage_group_heal',
        name: 'Group Heal',
        path: 'holy',
        skillTreeId: 'mage_10_chain_heal',
      },
    ],
  },
  {
    bind: BIND.S4,
    defaultAbilityId: 'mage_meteor',
    options: [
      {
        abilityId: 'mage_meteor',
        name: 'Meteor',
        path: 'fire',
        skillTreeId: 'mage_5_meteor',
      },
      {
        abilityId: 'mage_portal',
        name: 'Portal',
        path: 'arcane',
      },
    ],
  },
  {
    bind: BIND.S5,
    defaultAbilityId: 'mage_reality_tear',
    options: [
      {
        abilityId: 'mage_reality_tear',
        name: 'Reality Tear',
        path: 'arcane',
      },
      {
        abilityId: 'mage_archmage',
        name: 'Archmage',
        path: 'any',
        skillTreeId: 'mage_20_arcane_form',
      },
    ],
  },
];

// ── Grimoire Alt bar (swappable spells / totems) ─────────────────────────────

export type GrimoireAltSlotKind = 'spell' | 'totem';

export interface GrimoireAltAbilityOption {
  abilityId: string;
  name: string;
  description: string;
  kind: GrimoireAltSlotKind;
  vfxKey?: string;
  /** Classes that may equip this option into Alt 1/2 */
  classes: Array<'mage' | 'worg' | 'worges' | 'ranger' | 'warrior' | 'any'>;
  /** Requires wand (mage totems / arcane) */
  requiresWand?: boolean;
  /** Requires grimoire equipped */
  requiresGrimoire?: boolean;
  /** Requires 1H mainhand (nature hybrid) */
  requiresOneHand?: boolean;
  /** Requires consumable totem item in bag slot */
  requiresConsumableTotem?: boolean;
  consumableItemId?: string;
}

/**
 * Pool of abilities that can be assigned to Alt+1 / Alt+2 in the grimoire UI.
 * Defaults: Regen + Roots for nature hybrid; mage/worge may load totems & spells.
 */
export const GRIMOIRE_ALT_ABILITY_POOL: GrimoireAltAbilityOption[] = [
  {
    abilityId: 'nature_regen',
    name: 'Regen',
    description: 'HoT on self or ally — green leaf particles over time.',
    kind: 'spell',
    vfxKey: 'vfx_nature_regen_hot',
    classes: ['worg', 'worges', 'any'],
    requiresGrimoire: true,
  },
  {
    abilityId: 'nature_roots',
    name: 'Roots',
    description:
      'Root target: underground root VFX travel then sprout upward (canonical root-sprout VFX pack).',
    kind: 'spell',
    vfxKey: 'vfx_roots_underground_then_sprout',
    classes: ['worg', 'worges', 'any'],
    requiresGrimoire: true,
  },
  {
    abilityId: 'nature_entangle',
    name: 'Entangle',
    description: 'Stronger multi-target root field.',
    kind: 'spell',
    classes: ['worg', 'worges', 'mage'],
    requiresGrimoire: true,
  },
  {
    abilityId: 'nature_barkskin',
    name: 'Barkskin',
    description: 'Temporary armor buff via grimoire nature rite.',
    kind: 'spell',
    classes: ['worg', 'worges'],
    requiresGrimoire: true,
  },
  {
    abilityId: 'totem_healing',
    name: 'Healing Totem',
    description: 'Place a totem that pulses HoT in a radius.',
    kind: 'totem',
    classes: ['mage', 'worg', 'worges', 'ranger', 'warrior'],
    requiresGrimoire: true,
  },
  {
    abilityId: 'totem_earthbind',
    name: 'Earthbind Totem',
    description: 'Totem that slows / roots nearby enemies.',
    kind: 'totem',
    classes: ['mage', 'worg', 'worges', 'ranger', 'warrior'],
  },
  {
    abilityId: 'totem_flame',
    name: 'Flame Totem',
    description: 'Arcane-fire totem — pulses burn in radius. Mage wand summon.',
    kind: 'totem',
    classes: ['mage'],
    requiresWand: true,
  },
  {
    abilityId: 'totem_mana',
    name: 'Mana Spring Totem',
    description: 'Restores mana to allies near the totem. Mage wand summon.',
    kind: 'totem',
    classes: ['mage'],
    requiresWand: true,
  },
  {
    abilityId: 'totem_sentry',
    name: 'Sentry Totem',
    description: 'Scout totem reveals stealth in radius. Ranger consumable totem.',
    kind: 'totem',
    classes: ['ranger'],
    requiresConsumableTotem: true,
    consumableItemId: 'consumable_totem_sentry',
  },
  {
    abilityId: 'totem_war_banner',
    name: 'War Banner Totem',
    description: 'Threat / defense aura totem. Warrior consumable totem.',
    kind: 'totem',
    classes: ['warrior'],
    requiresConsumableTotem: true,
    consumableItemId: 'consumable_totem_war_banner',
  },
  {
    abilityId: 'mage_wand_totem_barrier',
    name: 'Barrier Totem',
    description: 'Wand-summoned shield totem. On use applies mage shield cleanse rules to self.',
    kind: 'totem',
    classes: ['mage'],
    requiresWand: true,
  },
];

export interface GrimoireAltLoadout {
  /** Ability ids assigned to Alt+1 / Alt+2 (from GRIMOIRE_ALT_ABILITY_POOL) */
  alt1: string;
  alt2: string;
}

/** Default nature hybrid loadout */
export const DEFAULT_GRIMOIRE_ALT_LOADOUT: GrimoireAltLoadout = {
  alt1: 'nature_regen',
  alt2: 'nature_roots',
};

/** @deprecated use GRIMOIRE_ALT_ABILITY_POOL + loadout — kept for resolveCast defaults */
export interface NatureTomeSlot {
  bind: CastBinding;
  abilityId: string;
  name: string;
  description: string;
  vfxKey?: string;
}

export const NATURE_TOME_BAR: NatureTomeSlot[] = [
  {
    bind: BIND.A1,
    abilityId: 'nature_regen',
    name: 'Regen',
    description: 'HoT on self or ally — green leaf particles over time.',
    vfxKey: 'vfx_nature_regen_hot',
  },
  {
    bind: BIND.A2,
    abilityId: 'nature_roots',
    name: 'Roots',
    description:
      'Root target: underground root VFX travel then sprout upward (canonical root-sprout VFX pack).',
    vfxKey: 'vfx_roots_underground_then_sprout',
  },
];

// ── Totems ───────────────────────────────────────────────────────────────────

export type TotemSummonMethod =
  | 'mage_wand' // mage places with wand (no consumable)
  | 'grimoire_alt' // assigned to Alt 1/2 in grimoire
  | 'consumable_slot'; // ranger/warrior drop if totem in consumable bag

export interface TotemDef {
  id: string;
  name: string;
  abilityId: string;
  summonMethods: TotemSummonMethod[];
  durationSec: number;
  radiusM: number;
  maxActive: number;
  description: string;
  /** Inventory item for consumable method */
  consumableItemId?: string;
}

export const TOTEM_DEFS: TotemDef[] = [
  {
    id: 'totem_healing',
    name: 'Healing Totem',
    abilityId: 'totem_healing',
    summonMethods: ['grimoire_alt', 'mage_wand', 'consumable_slot'],
    durationSec: 30,
    radiusM: 8,
    maxActive: 1,
    description: 'Pulses HoT to allies.',
    consumableItemId: 'consumable_totem_healing',
  },
  {
    id: 'totem_earthbind',
    name: 'Earthbind Totem',
    abilityId: 'totem_earthbind',
    summonMethods: ['grimoire_alt', 'mage_wand', 'consumable_slot'],
    durationSec: 20,
    radiusM: 6,
    maxActive: 1,
    description: 'Slows/roots enemies (snare).',
    consumableItemId: 'consumable_totem_earthbind',
  },
  {
    id: 'totem_flame',
    name: 'Flame Totem',
    abilityId: 'totem_flame',
    summonMethods: ['mage_wand', 'grimoire_alt'],
    durationSec: 25,
    radiusM: 5,
    maxActive: 1,
    description: 'Mage wand fire pulse totem.',
  },
  {
    id: 'totem_mana',
    name: 'Mana Spring Totem',
    abilityId: 'totem_mana',
    summonMethods: ['mage_wand', 'grimoire_alt'],
    durationSec: 30,
    radiusM: 8,
    maxActive: 1,
    description: 'Ally mana restore aura.',
  },
  {
    id: 'totem_sentry',
    name: 'Sentry Totem',
    abilityId: 'totem_sentry',
    summonMethods: ['consumable_slot', 'grimoire_alt'],
    durationSec: 45,
    radiusM: 12,
    maxActive: 1,
    description: 'Reveals stealth in radius. Ranger consumable.',
    consumableItemId: 'consumable_totem_sentry',
  },
  {
    id: 'totem_war_banner',
    name: 'War Banner Totem',
    abilityId: 'totem_war_banner',
    summonMethods: ['consumable_slot', 'grimoire_alt'],
    durationSec: 40,
    radiusM: 10,
    maxActive: 1,
    description: 'Defense/threat aura. Warrior consumable.',
    consumableItemId: 'consumable_totem_war_banner',
  },
  {
    id: 'totem_barrier',
    name: 'Barrier Totem',
    abilityId: 'mage_wand_totem_barrier',
    summonMethods: ['mage_wand'],
    durationSec: 20,
    radiusM: 6,
    maxActive: 1,
    description: 'Wand-only shield totem for mage.',
  },
];

export const TOTEM_BY_ABILITY: Record<string, TotemDef> = Object.fromEntries(
  TOTEM_DEFS.map((t) => [t.abilityId, t]),
);

/**
 * Who can drop a totem right now?
 * - Mage: wand equipped → wand summons (no consumable required for mage totems)
 * - Ranger/Warrior: need matching totem item in consumable slot
 * - Anyone with grimoire: Alt 1/2 if assigned a totem ability
 */
export function canSummonTotem(opts: {
  classId: string;
  abilityId: string;
  hasWand: boolean;
  hasGrimoire: boolean;
  /** Item id in consumable bag slot (or null) */
  consumableSlotItemId: string | null;
  altLoadout: GrimoireAltLoadout;
}): { ok: boolean; method?: TotemSummonMethod; reason?: string } {
  const def = TOTEM_BY_ABILITY[opts.abilityId];
  if (!def) return { ok: false, reason: 'Unknown totem' };

  const isMage = opts.classId === 'mage';
  const isRanger = opts.classId === 'ranger';
  const isWarrior = opts.classId === 'warrior';

  if (
    opts.hasGrimoire &&
    (opts.altLoadout.alt1 === opts.abilityId || opts.altLoadout.alt2 === opts.abilityId) &&
    def.summonMethods.includes('grimoire_alt')
  ) {
    return { ok: true, method: 'grimoire_alt' };
  }

  if (isMage && opts.hasWand && def.summonMethods.includes('mage_wand')) {
    return { ok: true, method: 'mage_wand' };
  }

  if (
    (isRanger || isWarrior) &&
    def.summonMethods.includes('consumable_slot') &&
    def.consumableItemId &&
    opts.consumableSlotItemId === def.consumableItemId
  ) {
    return { ok: true, method: 'consumable_slot' };
  }

  if ((isRanger || isWarrior) && def.summonMethods.includes('consumable_slot')) {
    return {
      ok: false,
      reason: 'Equip a totem item in the consumable slot to drop this totem.',
    };
  }

  return { ok: false, reason: 'Cannot summon this totem with current loadout' };
}

// ── Grimoire form UI (3 loadout slots) ────────────────────────────────────────

export const GRIMOIRE_FORM_SLOTS = 3 as const;

export interface GrimoireFormLoadout {
  /** Slot 0 = MAIN (F). Slots 1–2 = Shift+1 / Shift+2 */
  slots: [string | null, string | null, string | null];
  /** formId currently transformed into (null = humanoid) */
  activeFormId: string | null;
}

export const DEFAULT_GRIMOIRE_FORM_LOADOUT: GrimoireFormLoadout = {
  slots: [null, null, null],
  activeFormId: null,
};

export const WORGE_FORM_BAR = {
  /** F → equip / transform to main form (slot 0) */
  mainForm: BIND.F,
  form1: BIND.S1,
  form2: BIND.S2,
  /** Howl — only valid while in an animal form that supports howl */
  howl: BIND.S3,
  alphaCall: BIND.S4,
  apex: BIND.S5,
} as const;

export const WORGE_APEX_OPTIONS = [
  {
    abilityId: 'worg_worge_lord',
    name: 'Worge Lord',
    skillTreeId: 'worg_20_pack_master',
    description: 'Command beast spirits; pack leadership apex.',
  },
  {
    abilityId: 'worg_primal_avatar',
    name: 'Primal Avatar',
    skillTreeId: 'worg_20_primal_avatar',
    description: 'Nature avatar — massive stat surge + aura.',
  },
] as const;

export const WORGE_SHARED_ABILITIES = {
  howl: {
    abilityId: 'worg_howl',
    name: 'Primal Howl',
    skillTreeId: 'worg_1_howl',
    requiresAnimalForm: true,
  },
  alphaCall: {
    abilityId: 'worg_alpha_call',
    name: "Alpha's Call",
    skillTreeId: 'worg_5_alpha_call',
    requiresAnimalForm: false,
  },
} as const;

// ── Canonical Worge forms ────────────────────────────────────────────────────

export type WorgeFormRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'secret';
export type WorgeFormTier = 'starter' | 'wild' | 'predator' | 'flight' | 'aquatic' | 'mythic' | 'secret';
export type WorgeUnlockMethod =
  | 'class_start'
  | 'skill_tree'
  | 'rare_bloom_skin'
  | 'hidden_mission'
  | 'secret';

export interface WorgeFormDef {
  id: string;
  name: string;
  /** Short codex blurb */
  title: string;
  tier: WorgeFormTier;
  rarity: WorgeFormRarity;
  unlock: WorgeUnlockMethod;
  /** CreatureManifest / wildlife id for rare bloom spawns (if any) */
  sourceCreatureId?: string;
  /** Supports Howl (Shift+3 in animal form) */
  canHowl: boolean;
  /** Can carry a passenger (flight / large mounts) */
  passengerFlight?: boolean;
  /** Flight without passenger */
  flight?: boolean;
  /** Role tags for UI tooltips */
  roles: Array<'tank' | 'dps' | 'stealth' | 'scout' | 'support' | 'travel' | 'pvp'>;
  /** Skill-tree gate if any */
  skillTreeId?: string;
  /** Hidden until discovered */
  secret?: boolean;
  notes?: string;
}

/**
 * Full canonical form catalog.
 * Starter/tree forms are always known; wild forms unlock via bloom skin or missions.
 */
export const WORGE_FORMS: WorgeFormDef[] = [
  // ── Starter / skill tree ─────────────────────────────────────────────────
  {
    id: 'form_humanoid',
    name: 'True Shape',
    title: 'Humanoid',
    tier: 'starter',
    rarity: 'common',
    unlock: 'class_start',
    canHowl: false,
    roles: ['support'],
    notes: 'Not a beast form — default body. F returns here if main slot empty.',
  },
  {
    id: 'form_bear',
    name: 'Bear Form',
    title: 'The Unbroken Hide',
    tier: 'starter',
    rarity: 'common',
    unlock: 'class_start',
    sourceCreatureId: 'cotw_bear',
    canHowl: true,
    roles: ['tank', 'dps'],
    skillTreeId: 'worg_primal_shift',
    notes: 'Default tank form — Primal Shift special.',
  },
  {
    id: 'form_wolf',
    name: 'Wolf Form',
    title: 'Pack Runner',
    tier: 'starter',
    rarity: 'common',
    unlock: 'class_start',
    sourceCreatureId: 'wolf',
    canHowl: true,
    roles: ['dps', 'travel'],
  },
  {
    id: 'form_cat',
    name: 'Cat Form',
    title: 'Silent Claw',
    tier: 'predator',
    rarity: 'uncommon',
    unlock: 'skill_tree',
    sourceCreatureId: 'cotw_lynx',
    canHowl: false,
    roles: ['dps', 'stealth'],
    skillTreeId: 'worg_10_cat_form',
  },
  {
    id: 'form_turtle',
    name: 'Turtle Form',
    title: 'Living Bulwark',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'skill_tree',
    canHowl: false,
    roles: ['tank', 'support'],
    skillTreeId: 'worg_10_turtle_form',
  },
  {
    id: 'form_bird',
    name: 'Bird Form',
    title: 'Sky Scout',
    tier: 'flight',
    rarity: 'uncommon',
    unlock: 'skill_tree',
    sourceCreatureId: 'hawk',
    canHowl: false,
    flight: true,
    roles: ['scout', 'travel'],
    skillTreeId: 'worg_10_bird_form',
  },
  {
    id: 'form_dire',
    name: 'Dire Beast',
    title: 'Terror of the Wilds',
    tier: 'predator',
    rarity: 'epic',
    unlock: 'skill_tree',
    canHowl: true,
    roles: ['tank', 'dps', 'pvp'],
    skillTreeId: 'worg_15_dire_form',
  },

  // ── Wild unlocks (rare bloom 1/100 + skin) ────────────────────────────────
  {
    id: 'form_deer',
    name: 'Stag Form',
    title: 'Forest Strider',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'deer',
    canHowl: false,
    roles: ['travel', 'scout'],
  },
  {
    id: 'form_buffalo',
    name: 'Buffalo Form',
    title: 'Stampede Heart',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'buffalo',
    canHowl: true,
    roles: ['tank', 'dps'],
  },
  {
    id: 'form_boar',
    name: 'Boar Form',
    title: 'Tusk Charge',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_boar',
    canHowl: false,
    roles: ['dps', 'tank'],
  },
  {
    id: 'form_lion',
    name: 'Lioness Form',
    title: 'Pride Hunter',
    tier: 'predator',
    rarity: 'rare',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_lioness',
    canHowl: true,
    roles: ['dps', 'pvp'],
  },
  {
    id: 'form_lynx',
    name: 'Lynx Form',
    title: 'Frost Step',
    tier: 'predator',
    rarity: 'rare',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_lynx',
    canHowl: false,
    roles: ['dps', 'stealth', 'scout'],
  },
  {
    id: 'form_ibex',
    name: 'Ibex Form',
    title: 'Cliff Dancer',
    tier: 'wild',
    rarity: 'rare',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_ibex',
    canHowl: false,
    roles: ['travel', 'scout'],
  },
  {
    id: 'form_alligator',
    name: 'Alligator Form',
    title: 'River Death',
    tier: 'aquatic',
    rarity: 'rare',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_alligator',
    canHowl: false,
    roles: ['tank', 'dps'],
  },
  {
    id: 'form_beaver',
    name: 'Beaver Form',
    title: 'Dam Builder',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_beaver',
    canHowl: false,
    roles: ['support', 'travel'],
  },
  {
    id: 'form_raccoon',
    name: 'Raccoon Form',
    title: 'Night Finger',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_raccoon',
    canHowl: false,
    roles: ['stealth', 'scout'],
  },
  {
    id: 'form_mink',
    name: 'Mink Form',
    title: 'River Needle',
    tier: 'wild',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_mink',
    canHowl: false,
    roles: ['stealth', 'dps'],
  },
  {
    id: 'form_mallard',
    name: 'Mallard Form',
    title: 'Pond Wing',
    tier: 'flight',
    rarity: 'uncommon',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'cotw_mallard',
    canHowl: false,
    flight: true,
    roles: ['scout', 'travel'],
  },
  {
    id: 'form_hawk',
    name: 'Hawk Form',
    title: 'Keen Eye',
    tier: 'flight',
    rarity: 'rare',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'hawk',
    canHowl: false,
    flight: true,
    roles: ['scout', 'travel', 'dps'],
  },
  {
    id: 'form_shark',
    name: 'Shark Form',
    title: 'Blood Wake',
    tier: 'aquatic',
    rarity: 'epic',
    unlock: 'rare_bloom_skin',
    sourceCreatureId: 'shark',
    canHowl: false,
    roles: ['dps', 'pvp'],
    notes: 'Ocean / trench sectors only for bloom spawn.',
  },

  // ── Mission / secret ─────────────────────────────────────────────────────
  {
    id: 'form_dragon',
    name: 'Dragon Form',
    title: 'First Flame Kin',
    tier: 'mythic',
    rarity: 'legendary',
    unlock: 'hidden_mission',
    canHowl: true,
    flight: true,
    passengerFlight: true,
    roles: ['tank', 'dps', 'travel', 'pvp'],
    notes: 'Hidden mission chain — not bloom drop. Passenger flight unlocked with form.',
  },
  {
    id: 'form_flight_carrier',
    name: 'Skybeast Form',
    title: 'Bearer of the Pack',
    tier: 'flight',
    rarity: 'epic',
    unlock: 'hidden_mission',
    canHowl: false,
    flight: true,
    passengerFlight: true,
    roles: ['travel', 'support'],
    notes: 'Hidden mission: learn to carry one passenger while flying.',
  },
  {
    id: 'form_wareowl',
    name: 'Wareowl Form',
    title: 'Moonless Watcher',
    tier: 'secret',
    rarity: 'secret',
    unlock: 'secret',
    canHowl: false,
    flight: true,
    secret: true,
    roles: ['scout', 'stealth', 'pvp'],
    notes: 'Secret form — no UI spoiler until unlocked. Night / owl shrines.',
  },
];

export const WORGE_FORMS_BY_ID: Record<string, WorgeFormDef> = Object.fromEntries(
  WORGE_FORMS.map((f) => [f.id, f]),
);

export function getWorgeForm(id: string): WorgeFormDef | undefined {
  return WORGE_FORMS_BY_ID[id];
}

export function listUnlockableBloomForms(): WorgeFormDef[] {
  return WORGE_FORMS.filter((f) => f.unlock === 'rare_bloom_skin' && f.sourceCreatureId);
}

export function listSecretForms(): WorgeFormDef[] {
  return WORGE_FORMS.filter((f) => f.secret || f.unlock === 'secret');
}

// ── Rare bloom wildlife ──────────────────────────────────────────────────────

export type BloomTint = 'gold' | 'blue';

export interface RareBloomRules {
  /** 1 out of N spawns is a rare bloom variant */
  spawnDenominator: number;
  tints: BloomTint[];
  /** Visual: bloom intensity on creature materials */
  bloomIntensity: { gold: number; blue: number };
  /** Must kill + skin to receive form token */
  requiresSkinning: boolean;
  /** Item granted → unlocks form in grimoire inventory */
  formTokenItemPrefix: string;
  /** Optional second drop: rare pelt */
  bonusLootChance: number;
}

export const RARE_BLOOM_RULES: RareBloomRules = {
  spawnDenominator: 100,
  tints: ['gold', 'blue'],
  bloomIntensity: { gold: 1.4, blue: 1.25 },
  requiresSkinning: true,
  formTokenItemPrefix: 'worge_form_token_',
  bonusLootChance: 0.35,
};

export function formTokenItemId(formId: string): string {
  return `${RARE_BLOOM_RULES.formTokenItemPrefix}${formId}`;
}

/** Map creature → form for bloom skin rewards */
export function formIdForCreature(creatureId: string): string | undefined {
  return WORGE_FORMS.find((f) => f.sourceCreatureId === creatureId)?.id;
}

// ── Hidden missions ──────────────────────────────────────────────────────────

export interface WorgeHiddenMission {
  id: string;
  name: string;
  rewardsFormId: string;
  spoilerFreeHint: string;
  /** True = never show form name until complete */
  secret: boolean;
}

export const WORGE_HIDDEN_MISSIONS: WorgeHiddenMission[] = [
  {
    id: 'mission_dragon_kin',
    name: 'First Flame Kin',
    rewardsFormId: 'form_dragon',
    spoilerFreeHint: 'Follow ash trails where the sky itself was burned.',
    secret: false,
  },
  {
    id: 'mission_passenger_flight',
    name: 'Bearer of the Pack',
    rewardsFormId: 'form_flight_carrier',
    spoilerFreeHint: 'Carry another soul above the canopy without faltering.',
    secret: false,
  },
  {
    id: 'mission_wareowl',
    name: 'Moonless Watcher',
    rewardsFormId: 'form_wareowl',
    spoilerFreeHint: '…',
    secret: true,
  },
];

// ── Grimoire UI model ────────────────────────────────────────────────────────

export interface GrimoireFormInventoryEntry {
  formId: string;
  unlockedAt: number;
  source: WorgeUnlockMethod;
}

export interface GrimoireUiState {
  /** Three loadout slots — drag forms from inventory */
  loadout: GrimoireFormLoadout;
  /** Unlocked forms (tooltips below slots) */
  inventory: GrimoireFormInventoryEntry[];
  /** Mage path picks for Shift bar options */
  mageSlotChoices: Partial<Record<'s2' | 's3' | 's4' | 's5', string>>;
  /** Worge apex choice */
  worgeApexAbilityId: 'worg_worge_lord' | 'worg_primal_avatar';
  /**
   * Alt+1 / Alt+2 ability ids (from GRIMOIRE_ALT_ABILITY_POOL).
   * Swappable in grimoire UI — spells, totems, etc.
   */
  altLoadout: GrimoireAltLoadout;
}

export const DEFAULT_GRIMOIRE_UI: GrimoireUiState = {
  loadout: DEFAULT_GRIMOIRE_FORM_LOADOUT,
  inventory: [
    {
      formId: 'form_bear',
      unlockedAt: 0,
      source: 'class_start',
    },
    {
      formId: 'form_wolf',
      unlockedAt: 0,
      source: 'class_start',
    },
  ],
  mageSlotChoices: {},
  worgeApexAbilityId: 'worg_primal_avatar',
  altLoadout: { ...DEFAULT_GRIMOIRE_ALT_LOADOUT },
};

/**
 * Resolve which ability fires for a key given class + gear + grimoire state.
 * Runtime combat should call this — do not hardcode binds in UI only.
 */
export type CastContext = {
  classId: string;
  /** true if wand equipped (or staff casting as wand) */
  hasWand: boolean;
  /** grimoire equipped */
  hasGrimoire: boolean;
  /** 1H in mainhand */
  hasOneHand: boolean;
  /** Currently in animal form */
  inAnimalForm: boolean;
  activeFormId: string | null;
  grimoire: GrimoireUiState;
  /** Item in consumable bag slot (totems for ranger/warrior) */
  consumableSlotItemId?: string | null;
};

export type ResolvedCast =
  | { kind: 'ability'; abilityId: string; bind: CastBinding; cleanseProfile?: string }
  | { kind: 'form_swap'; formId: string | null; bind: CastBinding; cleanseProfile: 'traps_and_movement' }
  | { kind: 'totem'; abilityId: string; bind: CastBinding; method: string }
  | { kind: 'none'; reason: string };

export function resolveCast(
  ctx: CastContext,
  bind: CastBinding,
): ResolvedCast {
  const isWorge = ctx.classId === 'worg' || ctx.classId === 'worges';
  const isMage = ctx.classId === 'mage';
  const isRanger = ctx.classId === 'ranger';
  const isWarrior = ctx.classId === 'warrior';

  // Grimoire Alt bar — swappable spells / totems (requires grimoire, or mage wand totems)
  if (bind.mod === 'alt') {
    const abilityId =
      bind.id === BIND.A1.id
        ? ctx.grimoire.altLoadout.alt1
        : bind.id === BIND.A2.id
          ? ctx.grimoire.altLoadout.alt2
          : null;
    if (!abilityId) return { kind: 'none', reason: 'No Alt ability assigned in grimoire' };

    const opt = GRIMOIRE_ALT_ABILITY_POOL.find((o) => o.abilityId === abilityId);
    if (!opt) return { kind: 'none', reason: 'Unknown Alt ability' };

    if (opt.kind === 'totem') {
      const check = canSummonTotem({
        classId: ctx.classId,
        abilityId,
        hasWand: ctx.hasWand,
        hasGrimoire: ctx.hasGrimoire,
        consumableSlotItemId: ctx.consumableSlotItemId ?? null,
        altLoadout: ctx.grimoire.altLoadout,
      });
      if (!check.ok) return { kind: 'none', reason: check.reason ?? 'Cannot place totem' };
      return {
        kind: 'totem',
        abilityId,
        bind,
        method: check.method ?? 'grimoire_alt',
      };
    }

    // Spell from alt loadout
    if (opt.requiresGrimoire && !ctx.hasGrimoire) {
      return { kind: 'none', reason: 'Grimoire required' };
    }
    // Nature hybrid still works with 1H+grimoire; pure grimoire spells OK with grimoire alone for worge
    if (opt.requiresOneHand && !ctx.hasOneHand) {
      return { kind: 'none', reason: 'One-hand weapon required' };
    }
    return { kind: 'ability', abilityId, bind };
  }

  // Mage wand totem hotkey optional: if Alt not used, still can resolve totem via pool + wand
  // (placement UI may call canSummonTotem directly)

  // Worge form book
  if (isWorge && ctx.hasGrimoire) {
    if (bind.id === BIND.F.id) {
      const main = ctx.grimoire.loadout.slots[0];
      return {
        kind: 'form_swap',
        formId: main,
        bind,
        cleanseProfile: 'traps_and_movement',
      };
    }
    if (bind.id === BIND.S1.id) {
      return {
        kind: 'form_swap',
        formId: ctx.grimoire.loadout.slots[1],
        bind,
        cleanseProfile: 'traps_and_movement',
      };
    }
    if (bind.id === BIND.S2.id) {
      return {
        kind: 'form_swap',
        formId: ctx.grimoire.loadout.slots[2],
        bind,
        cleanseProfile: 'traps_and_movement',
      };
    }
    if (bind.id === BIND.S3.id) {
      const form = ctx.activeFormId ? WORGE_FORMS_BY_ID[ctx.activeFormId] : null;
      if (!ctx.inAnimalForm || !form?.canHowl) {
        return { kind: 'none', reason: 'Howl requires a howling animal form' };
      }
      return { kind: 'ability', abilityId: WORGE_SHARED_ABILITIES.howl.abilityId, bind };
    }
    if (bind.id === BIND.S4.id) {
      return {
        kind: 'ability',
        abilityId: WORGE_SHARED_ABILITIES.alphaCall.abilityId,
        bind,
      };
    }
    if (bind.id === BIND.S5.id) {
      return {
        kind: 'ability',
        abilityId: ctx.grimoire.worgeApexAbilityId,
        bind,
      };
    }
  }

  // Mage wand bar
  if (isMage && ctx.hasWand) {
    const slot = MAGE_WAND_BAR.find((s) => s.bind.id === bind.id);
    if (!slot) return { kind: 'none', reason: 'No mage slot' };
    // Pick player choice if multi-option
    const key =
      bind.id === BIND.S2.id
        ? 's2'
        : bind.id === BIND.S3.id
          ? 's3'
          : bind.id === BIND.S4.id
            ? 's4'
            : bind.id === BIND.S5.id
              ? 's5'
              : null;
    const chosen = key ? ctx.grimoire.mageSlotChoices[key] : undefined;
    const abilityId =
      chosen && slot.options.some((o) => o.abilityId === chosen)
        ? chosen
        : slot.defaultAbilityId;
    // Mana Shield on use: full cleansable debuff wipe
    if (abilityId === 'mage_shield') {
      return {
        kind: 'ability',
        abilityId,
        bind,
        cleanseProfile: 'all_cleansable_debuffs',
      };
    }
    return { kind: 'ability', abilityId, bind };
  }

  return { kind: 'none', reason: 'No matching loadout for this key' };
}

// ── UX copy helpers ──────────────────────────────────────────────────────────

export const GRIMOIRE_UI_COPY = {
  title: 'Grimoire',
  formSlotsTitle: 'Active Forms (3)',
  formSlotsHint: 'F = main form · Shift+1 / Shift+2 = other two · Drag forms from inventory below',
  inventoryTitle: 'Known Forms',
  inventoryEmpty: 'Hunt rare bloom wildlife and skin them to learn new forms.',
  altSlotsTitle: 'Alt Skills (2)',
  altSlotsHint:
    'Alt+1 / Alt+2 — drag spells or totems from the grimoire pool. Defaults: Regen + Roots.',
  wandHint: 'Wand on belt — F Fireball · Shift 1–5 mage arts · wand can place mage totems',
  natureTomeHint: 'Alt skills swappable — nature spells, totems, etc.',
  totemHint:
    'Mage: summon totems with wand. Ranger/Warrior: drop totem if consumable slot holds a totem item.',
  formCleanseHint:
    'Worge form swap clears traps + movement impairs only (not burns/poisons/curses).',
  rareBloomHint: '1 in 100 wildlife glows gold or blue — kill and skin to claim its form.',
} as const;
