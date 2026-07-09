/**
 * Art Assets — single source of truth for curated UI art.
 *
 * All binary assets resolve through assetUrl() → R2 CDN.
 * Legacy /assets/* paths are normalized automatically via legacyAssetPaths.
 */

import { assetUrl } from './assetConfig';
import { FLEET_VIDEO_CATALOG } from '@shared/fleet/videoCatalog';
import {
  getRacePortraitUrl,
  getClassHeroUrl,
  getClassAccentColor,
  getPanelParchmentUrl,
  getCombatClassBackgroundUrl,
  UI_ART_FALLBACK,
} from '@shared/fleet/uiArt';

export interface CombatBackground {
  id: string;
  name: string;
  path: string;
}

// ── Background images ────────────────────────────────────────────────────────

export const BACKGROUNDS = {
  /** GRUDGE RTS logo — pixel knight with banner (transparent PNG) */
  grudgeRtsLogo: assetUrl('/backgrounds/grudge-rts-logo.png'),

  /** Dark fantasy landscape 1 — atmospheric scene */
  darkFantasy1: assetUrl('/backgrounds/dark-fantasy-1.png'),

  /** Dark fantasy element 2 — small icon/element */
  darkFantasy2: assetUrl('/backgrounds/dark-fantasy-2.png'),

  /** Dark fantasy landscape 3 — environment art */
  darkFantasy3: assetUrl('/backgrounds/dark-fantasy-3.png'),

  /** Dark fantasy landscape 4 — environment art */
  darkFantasy4: assetUrl('/backgrounds/dark-fantasy-4.png'),

  /** Dark fantasy landscape 5 — environment art */
  darkFantasy5: assetUrl('/backgrounds/dark-fantasy-5.png'),
} as const;

// ── Videos ───────────────────────────────────────────────────────────────────
// Warlords era cinematic — grudge loadin.mp4 on fleet R2 (see fleetVideo.ts for catalog API).

export const VIDEOS = {
  intro: FLEET_VIDEO_CATALOG.warlordsIntro.r2_url,
  pvpLoadscreen: FLEET_VIDEO_CATALOG.warlordsPvpLoadscreen.r2_url,
  loading: FLEET_VIDEO_CATALOG.warlordsPvpLoadscreen.r2_url,
  pirateKingBanner: FLEET_VIDEO_CATALOG.warlordsIntro.r2_url,

  /** Legacy intro video (fallback) */
  introLegacy: assetUrl('/videos/intro-legacy.mp4'),
} as const;

// ── Character portraits ──────────────────────────────────────────────────────
// Fleet SSOT: ObjectStore /ui-art.json (class-selector.html art).

export const RACE_PORTRAITS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string) {
      return getRacePortraitUrl(prop);
    },
  },
);

export const CLASS_HERO_IMAGES: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string) {
      return getClassHeroUrl(prop);
    },
  },
);

export function getRacePortrait(race: string): string {
  return getRacePortraitUrl(race);
}

export function getClassHeroImage(cls: string): string {
  return getClassHeroUrl(cls);
}

/** Combat arena backgrounds — shared by CombatArena + admin-combat */
export const COMBAT_BACKGROUNDS: CombatBackground[] = [
  { id: 'fields', name: 'Open Fields', path: assetUrl('/backgrounds/verdant_plains.png') },
  { id: 'market', name: 'Town Market', path: assetUrl('/backgrounds/tavern_bg.png') },
  { id: 'settlement', name: 'Settlement Gates', path: assetUrl('/backgrounds/castle_arena.jpg') },
  { id: 'coast', name: 'Island Coast', path: assetUrl('/backgrounds/ocean_battle.png') },
  { id: 'dungeon', name: 'Shadow Depths', path: assetUrl('/backgrounds/purple_dungeon.png') },
  { id: 'lava', name: 'Volcanic Field', path: assetUrl('/backgrounds/volcanic_battle.png') },
  { id: 'frozen', name: 'Frozen Wastes', path: assetUrl('/backgrounds/frozen_battle.png') },
  { id: 'arena', name: 'Arena', path: assetUrl('/backgrounds/arena_battle.png') },
];

/** Attribute sigil icons (8 core stats) */
export const ATTRIBUTE_SIGILS: Record<string, string> = {
  strength:  assetUrl('/icons/sigils/strength.png'),
  vitality:  assetUrl('/icons/sigils/vitality.png'),
  endurance: assetUrl('/icons/sigils/endurance.png'),
  intellect: assetUrl('/icons/sigils/intellect.png'),
  wisdom:    assetUrl('/icons/sigils/wisdom.png'),
  dexterity: assetUrl('/icons/sigils/dexterity.png'),
  agility:   assetUrl('/icons/sigils/agility.png'),
  tactics:   assetUrl('/icons/sigils/tactics.png'),
} as const;

// ── Game card background images ──────────────────────────────────────────────

export const GAME_CARD_BACKGROUNDS: Record<string, string> = {
  island:       assetUrl('/backgrounds/island-map.png'),
  island2d:     assetUrl('/backgrounds/island-map.png'),
  crafting:     assetUrl('/images/professions/steampunk_blueprint_background_with_gears.png'),
  character:    BACKGROUNDS.darkFantasy1,
  tutorial:     assetUrl('/images/events/dungeon-raid-1.png'),
  homeisland:   assetUrl('/backgrounds/island-map.png'),
  tactical:     assetUrl('/backgrounds/general.png'),
  ocean:        assetUrl('/backgrounds/general.png'),
  play:         assetUrl('/images/events/faction-war.png'),
  'islands-hub': assetUrl('/backgrounds/island-map.png'),
  rtsgrudge:    assetUrl('/images/events/faction-war.png'),
  warlords3d:   BACKGROUNDS.darkFantasy3,
  forge:        assetUrl('/images/professions/steampunk_blueprint_background_with_gears.png'),
  combat:       assetUrl('/backgrounds/main-menu.png'),
  dungeon:      assetUrl('/images/events/dungeon-raid-1.png'),
  professions:  assetUrl('/images/professions/dark_underground_mine_with_glowing_crystals.png'),
  worldmap:     assetUrl('/backgrounds/general.png'),
  skills:       assetUrl('/images/professions/cosmic_arcane_void_magic_background.png'),
  harvest:      assetUrl('/images/professions/ancient_mystical_forest_with_glowing_particles.png'),
  sailing:      assetUrl('/backgrounds/general.png'),
} as const;

// ── Profession icons & backgrounds (CDN — migrated from /assets/professions/) ──

export const PROFESSION_ICONS: Record<string, string> = {
  miner:    assetUrl('/images/professions/miner_profession_game_icon.png'),
  forester: assetUrl('/images/professions/forester_profession_game_icon.png'),
  mystic:   assetUrl('/images/professions/mystic_profession_game_icon.png'),
  chef:     assetUrl('/images/professions/chef_profession_game_icon.png'),
  engineer: assetUrl('/images/professions/engineer_profession_game_icon.png'),
} as const;

export const PROFESSION_BACKGROUNDS: Record<string, string> = {
  miner:    assetUrl('/images/professions/dark_underground_mine_with_glowing_crystals.png'),
  forester: assetUrl('/images/professions/ancient_mystical_forest_with_glowing_particles.png'),
  mystic:   assetUrl('/images/professions/cosmic_arcane_void_magic_background.png'),
  chef:     assetUrl('/images/professions/rustic_fantasy_kitchen_hearth.png'),
  engineer: assetUrl('/images/professions/steampunk_blueprint_background_with_gears.png'),
} as const;

/** Illustrated skill-tree panel backgrounds (crafting art) */
export const PROFESSION_SKILL_TREE_BACKGROUNDS: Record<string, string> = {
  miner:    assetUrl('/images/professions/miner_skill_tree_background_illustrated_style.png'),
  forester: assetUrl('/images/professions/forester_skill_tree_background_illustrated_style.png'),
  mystic:   assetUrl('/images/professions/mystic_skill_tree_background_illustrated_style.png'),
  chef:     assetUrl('/images/professions/rustic_fantasy_kitchen_hearth.png'),
  engineer: assetUrl('/images/professions/engineer_skill_tree_background_illustrated_style.png'),
} as const;

/** Home page quick-access tile icons */
export const QUICK_ACCESS_ICONS = {
  professions: PROFESSION_ICONS.miner,
  skillTree:   assetUrl('/images/skill-icons/FireMage_Free/FireMage_1.png'),
  arsenal:     assetUrl('/images/skill-icons/Hunter_Free/Hunter_1.png'),
  missions:    assetUrl('/images/skill-icons/Necromancer_Free/Necromancer_1.png'),
} as const;

/** Resolve profession art by any casing ("Miner", "miner", "MINER") */
export function professionIcon(name: string): string | undefined {
  return PROFESSION_ICONS[name.toLowerCase()];
}

export function professionBackground(name: string): string | undefined {
  return PROFESSION_BACKGROUNDS[name.toLowerCase()];
}

export function professionSkillTreeBackground(name: string): string | undefined {
  return PROFESSION_SKILL_TREE_BACKGROUNDS[name.toLowerCase()];
}

export function attributeSigil(attrId: string): string | undefined {
  return ATTRIBUTE_SIGILS[attrId.toLowerCase()];
}

// ── Faction emblems ──────────────────────────────────────────────────────────
// TODO: migrate to CDN or local. Using placeholder gradients via onerror in UI.

export const FACTION_EMBLEMS: Record<string, string> = {
  crusade: assetUrl('/factions/crusade-emblem.png'),
  fabled:  assetUrl('/factions/fabled-emblem.png'),
  legion:  assetUrl('/factions/legion-emblem.png'),
} as const;

// ── Class stage backgrounds (cycling hero-art from ui-art.json) ─────────────

export const CLASS_STAGE_BACKGROUNDS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string) {
      return getClassHeroUrl(prop);
    },
  },
);

export const CLASS_ACCENT_COLORS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string) {
      return getClassAccentColor(prop);
    },
  },
);

export const CLASS_CYCLE = ['warrior', 'mage', 'ranger', 'worge'] as const;

export const PANEL_BG = UI_ART_FALLBACK.panels.parchment;

export const COMBAT_CLASS_BACKGROUNDS: Record<string, string> = {
  melee: getCombatClassBackgroundUrl('melee'),
  caster: getCombatClassBackgroundUrl('caster'),
  ranger: getCombatClassBackgroundUrl('ranger'),
};

// ── Class colors (for themed borders, glows, etc.) ───────────────────────────

export const CLASS_COLORS = {
  mage:    { primary: '#6aa9ff', bg: '#bcd8ff', text: '#03132c' },
  warrior: { primary: '#ff6b57', bg: '#ffb3a6', text: '#2a0a07' },
  ranger:  { primary: '#6bdc8b', bg: '#b2f0c4', text: '#08220f' },
  worg:    { primary: '#c792ff', bg: '#e1c8ff', text: '#1c0a3a' },
} as const;

// ── Hero codex character portraits (local) ───────────────────────────────────

export const HERO_PORTRAITS: Record<string, string> = {
  barbarian_warrior: '/hero-codex/sprites/entities/units/barbarian/barbarian_warrior.png',
  barbarian_mage:    '/hero-codex/sprites/entities/units/barbarian/barbarian_mage.png',
  barbarian_ranger:  '/hero-codex/sprites/entities/units/barbarian/barbarian_archer.png',
  dwarf_warrior:     '/hero-codex/sprites/entities/units/dwarf/dwarf_warrior.png',
  dwarf_mage:        '/hero-codex/sprites/entities/units/dwarf/dwarf_mage.png',
  dwarf_ranger:      '/hero-codex/sprites/entities/units/dwarf/dwarf_archer.png',
  elf_warrior:       '/hero-codex/sprites/entities/units/elf/elf_warrior.png',
  elf_mage:          '/hero-codex/sprites/entities/units/elf/elf_mage.png',
  elf_ranger:        '/hero-codex/sprites/entities/units/elf/elf_archer.png',
  human_warrior:     '/hero-codex/sprites/entities/units/human/human_warrior.png',
  human_mage:        '/hero-codex/sprites/entities/units/human/human_mage.png',
  human_ranger:      '/hero-codex/sprites/entities/units/human/human_archer.png',
  orc_warrior:       '/hero-codex/sprites/entities/units/orc/orc_warrior.png',
  orc_mage:          '/hero-codex/sprites/entities/units/orc/orc_mage.png',
  orc_ranger:        '/hero-codex/sprites/entities/units/orc/orc_archer.png',
  undead_warrior:    '/hero-codex/sprites/entities/units/undead/undead_warrior.png',
  undead_mage:       '/hero-codex/sprites/entities/units/undead/undead_mage.png',
  undead_ranger:     '/hero-codex/sprites/entities/units/undead/undead_archer.png',
} as const;
