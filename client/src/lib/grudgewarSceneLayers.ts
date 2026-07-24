/**
 * Z-index / layer constants ported from Puter GrudgeWar
 * (GrudgeWars/src/constants/layers.js) for client scene ports.
 * Skill: grudgewar-puter-scenes
 */
export const GRUDGEWAR_SCENE = {
  AMBIENT_FX: 5,
  PATHS: 5,
  LABELS: 10,
  HERO: 12,
  NODES: 15,
  HEADER: 20,
  BACK_BUTTON: 30,
  TOOLTIP: 40,
  POPUP: 50,
} as const;

export const GRUDGEWAR_BOSS_WALKUP = {
  AMBIENT: 5,
  HERO: 10,
  BOSS: 12,
  DIALOGUE: 20,
  TEXT: 30,
  SKIP_BUTTON: 30,
} as const;

/** Puter battle formation x% (reference for 3D deploy) */
export const GRUDGEWAR_BATTLE_ROWS = {
  player: { protection: 22, battle: 32, back: 18 },
  enemy: { charge: 55, vanguard: 65, formation: 74 },
  bossScale: 1.6,
} as const;
