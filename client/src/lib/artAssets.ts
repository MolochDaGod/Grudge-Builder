/**
 * Art Assets — CDN-hosted background images, logos, and videos.
 *
 * All assets served from R2 CDN (assets.grudge-studio.com).
 * Migrated from Imgur on 2026-05-28.
 */

import { assetUrl } from './assetConfig';

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

export const VIDEOS = {
  /** Intro/loading screen cinematic */
  loading: assetUrl('/videos/loading-cinematic.mp4'),

  /** Pirate King banner — loading transitions between game modes */
  pirateKingBanner: '/assets/videos/piratekingbanner.mp4',

  /** Legacy intro video (fallback) */
  introLegacy: assetUrl('/videos/intro-legacy.mp4'),
} as const;

// ── Character portraits ──────────────────────────────────────────────────────
// Imgur URLs — proven working from class-selector.html; CDN copies are backup.

export const RACE_PORTRAITS: Record<string, string> = {
  elf:       'https://i.imgur.com/rWEKVAw.png',
  human:     'https://i.imgur.com/qBSRLZG.png',
  dwarf:     'https://i.imgur.com/6A4px2O.png',
  orc:       'https://i.imgur.com/4PyTEN5.png',
  barbarian: 'https://i.imgur.com/7WKJ8Bw.png',
  undead:    'https://i.imgur.com/mPTojTj.png',
} as const;

export const CLASS_HERO_IMAGES: Record<string, string> = {
  mage:    'https://i.imgur.com/vKQR4UT.png',
  warrior: 'https://i.imgur.com/Wj2mUH2.png',
  ranger:  'https://i.imgur.com/5A6e5kL.png',
  worg:    'https://i.imgur.com/BrQH0Bx.png',
  worge:   'https://i.imgur.com/BrQH0Bx.png',
} as const;

// ── Game card background images ──────────────────────────────────────────────

export const GAME_CARD_BACKGROUNDS: Record<string, string> = {
  island:      '/assets/backgrounds/island-map.png',
  crafting:    '/assets/professions/steampunk_blueprint_background_with_gears.png',
  character:   BACKGROUNDS.darkFantasy1,
  rtsgrudge:   '/assets/events/faction-war.png',
  combat:      '/assets/backgrounds/main-menu.png',
  dungeon:     '/assets/events/dungeon-raid-1.png',
  professions: '/assets/professions/dark_underground_mine_with_glowing_crystals.png',
  worldmap:    '/assets/backgrounds/general.png',
  skills:      '/assets/professions/cosmic_arcane_void_magic_background.png',
  harvest:     '/assets/professions/ancient_mystical_forest_with_glowing_particles.png',
} as const;

// ── Profession icons (local assets from WCS) ─────────────────────────────────

export const PROFESSION_ICONS: Record<string, string> = {
  miner:    '/assets/professions/miner_profession_game_icon.png',
  forester: '/assets/professions/forester_profession_game_icon.png',
  mystic:   '/assets/professions/mystic_profession_game_icon.png',
  chef:     '/assets/professions/chef_profession_game_icon.png',
  engineer: '/assets/professions/engineer_profession_game_icon.png',
} as const;

export const PROFESSION_BACKGROUNDS: Record<string, string> = {
  miner:    '/assets/professions/dark_underground_mine_with_glowing_crystals.png',
  forester: '/assets/professions/ancient_mystical_forest_with_glowing_particles.png',
  mystic:   '/assets/professions/cosmic_arcane_void_magic_background.png',
  chef:     '/assets/professions/rustic_fantasy_kitchen_hearth.png',
  engineer: '/assets/professions/steampunk_blueprint_background_with_gears.png',
} as const;

// ── Faction emblems ──────────────────────────────────────────────────────────
// TODO: migrate to CDN or local. Using placeholder gradients via onerror in UI.

export const FACTION_EMBLEMS: Record<string, string> = {
  crusade: assetUrl('/factions/crusade-emblem.png'),
  fabled:  assetUrl('/factions/fabled-emblem.png'),
  legion:  assetUrl('/factions/legion-emblem.png'),
} as const;

// ── Class stage backgrounds (cycling hero-art from class-selector.html) ──────
// Imgur URLs — same proven source as class-selector.html

export const CLASS_STAGE_BACKGROUNDS: Record<string, string> = {
  mage:    'https://i.imgur.com/vKQR4UT.png',
  warrior: 'https://i.imgur.com/Wj2mUH2.png',
  ranger:  'https://i.imgur.com/5A6e5kL.png',
  worge:   'https://i.imgur.com/BrQH0Bx.png',
} as const;

export const CLASS_ACCENT_COLORS: Record<string, string> = {
  mage:    '#6aa9ff',
  warrior: '#ff6b57',
  ranger:  '#6bdc8b',
  worge:   '#c792ff',
} as const;

export const CLASS_CYCLE = ['warrior', 'mage', 'ranger', 'worge'] as const;

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
