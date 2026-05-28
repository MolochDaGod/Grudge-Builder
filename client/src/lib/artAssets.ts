/**
 * Art Assets — CDN-hosted background images, logos, and videos.
 *
 * All assets are served from Imgur CDN. For R2 migration, replace these URLs
 * with assets.grudge-studio.com paths and update assetUrl() calls.
 *
 * Albums:
 *   https://imgur.com/a/D92MEoS — GRUDGE RTS logo
 *   https://imgur.com/a/E9EEjua — Dark fantasy art 2
 *   https://imgur.com/a/nzpLJGf — Dark fantasy art 3
 *   https://imgur.com/a/a4piu0x — Dark fantasy art 4
 *   https://imgur.com/a/LI7di76 — Dark fantasy art 5
 *   https://imgur.com/a/1p1ZaTO — Dark fantasy art 6
 */

// ── Background images ────────────────────────────────────────────────────────

export const BACKGROUNDS = {
  /** GRUDGE RTS logo — pixel knight with banner (transparent PNG) */
  grudgeRtsLogo: 'https://i.imgur.com/pluH0k6.png',

  /** Dark fantasy landscape 1 — atmospheric scene */
  darkFantasy1: 'https://i.imgur.com/7ZTde2Z.png',

  /** Dark fantasy element 2 — small icon/element */
  darkFantasy2: 'https://i.imgur.com/pE6c2nh.png',

  /** Dark fantasy landscape 3 — environment art */
  darkFantasy3: 'https://i.imgur.com/jOfNKpl.png',

  /** Dark fantasy landscape 4 — environment art */
  darkFantasy4: 'https://i.imgur.com/byUrl5f.png',

  /** Dark fantasy landscape 5 — environment art */
  darkFantasy5: 'https://i.imgur.com/ibZp0vj.png',
} as const;

// ── Videos ───────────────────────────────────────────────────────────────────

export const VIDEOS = {
  /** Intro/loading screen cinematic */
  loading: 'https://i.imgur.com/wSesBRh.mp4',

  /** Pirate King banner — loading transitions between game modes */
  pirateKingBanner: '/assets/videos/piratekingbanner.mp4',

  /** Legacy intro video (fallback) */
  introLegacy: 'https://i.imgur.com/qpcjvpR.mp4',
} as const;

// ── Character portraits ──────────────────────────────────────────────────────
// Local hero-codex portraits (no external CDN dependency).
// Imgur fallbacks kept in comments for reference.

export const RACE_PORTRAITS = {
  elf:       '/hero-codex/hero-portraits/elf_warrior.png',
  human:     '/hero-codex/hero-portraits/human_warrior.png',
  dwarf:     '/hero-codex/hero-portraits/dwarf_warrior.png',
  orc:       '/hero-codex/hero-portraits/orc_warrior.png',
  barbarian: '/hero-codex/hero-portraits/barbarian_warrior.png',
  undead:    '/hero-codex/hero-portraits/undead_warrior.png',
} as const;

export const CLASS_HERO_IMAGES = {
  mage:    '/hero-codex/hero-portraits/human_mage.png',
  warrior: '/hero-codex/hero-portraits/human_warrior.png',
  ranger:  '/hero-codex/hero-portraits/elf_ranger.png',
  worg:    '/hero-codex/hero-portraits/orc_worg.png',
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

export const FACTION_EMBLEMS: Record<string, string> = {
  crusade: '/assets/factions/crusade-emblem.png',
  fabled:  '/assets/factions/fabled-emblem.png',
  legion:  '/assets/factions/legion-emblem.png',
} as const;

// ── Class stage backgrounds (cycling hero-art) ──────────────────────────────

export const CLASS_STAGE_BACKGROUNDS: Record<string, string> = {
  mage:    '/hero-codex/hero-portraits/human_mage.png',
  warrior: '/hero-codex/hero-portraits/human_warrior.png',
  ranger:  '/hero-codex/hero-portraits/elf_ranger.png',
  worge:   '/hero-codex/hero-portraits/orc_worg.png',
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
