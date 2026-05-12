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

  /** Legacy intro video (fallback) */
  introLegacy: 'https://i.imgur.com/qpcjvpR.mp4',
} as const;

// ── Character portraits (existing, from create-character.tsx) ────────────────

export const RACE_PORTRAITS = {
  elf:       'https://i.imgur.com/rWEKVAw.png',
  human:     'https://i.imgur.com/qBSRLZG.png',
  dwarf:     'https://i.imgur.com/6A4px2O.png',
  orc:       'https://i.imgur.com/4PyTEN5.png',
  barbarian: 'https://i.imgur.com/7WKJ8Bw.png',
  undead:    'https://i.imgur.com/mPTojTj.png',
} as const;

export const CLASS_HERO_IMAGES = {
  mage:    'https://i.imgur.com/vKQR4UT.png',
  warrior: 'https://i.imgur.com/Wj2mUH2.png',
  ranger:  'https://i.imgur.com/5A6e5kL.png',
  worg:    'https://i.imgur.com/BrQH0Bx.png',
} as const;

// ── Game card background images ──────────────────────────────────────────────

export const GAME_CARD_BACKGROUNDS: Record<string, string> = {
  rtsgrudge: BACKGROUNDS.grudgeRtsLogo,
  combat:    BACKGROUNDS.darkFantasy1,
  dungeon:   BACKGROUNDS.darkFantasy3,
  island:    BACKGROUNDS.darkFantasy4,
  harvest:   BACKGROUNDS.darkFantasy5,
} as const;
