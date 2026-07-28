/**
 * ui.grudge-studio.com — production UI kit SSOT for Warlords / home-island HUD.
 *
 * Landing: https://ui.grudge-studio.com/
 * Runtime:  /game-ui-runtime.js
 * Packs:    /game-ui-packs/{id}.json
 * Assets:   /assets/craftpix/** (frames, slots, icons)
 * Main panel equipment: /main-panel.html?era=warlords
 */

export const UI_STUDIO_ORIGIN = 'https://ui.grudge-studio.com' as const;

/** R2 craftpix RPG skin (CSS + 9-slice) — preferred for .cpx-* classes */
export const CRAFTPIX_RPG_CSS =
  'https://assets.grudge-studio.com/ui/craftpix-rpg/craftpix-rpg-ui.css' as const;

export const UI_STUDIO_RUNTIME = `${UI_STUDIO_ORIGIN}/game-ui-runtime.js` as const;
export const UI_STUDIO_PACKS_INDEX = `${UI_STUDIO_ORIGIN}/game-ui-packs/index.json` as const;
export const UI_STUDIO_MAIN_PANEL = `${UI_STUDIO_ORIGIN}/main-panel.html` as const;

/** Fleet pack ids from game-ui-packs/index.json */
export type UiStudioPackId =
  | 'warlords'
  | 'water-island'
  | 'player-grass'
  | 'survival'
  | 'foundry'
  | 'open'
  | 'wcs';

/** Map play surface → default pack */
export const PACK_FOR_SURFACE = {
  homeIsland: 'water-island' as UiStudioPackId,
  zone: 'warlords' as UiStudioPackId,
  lobby: 'warlords' as UiStudioPackId,
  play: 'warlords' as UiStudioPackId,
} as const;

export function packUrl(packId: UiStudioPackId | string): string {
  return `${UI_STUDIO_ORIGIN}/game-ui-packs/${packId}.json`;
}
