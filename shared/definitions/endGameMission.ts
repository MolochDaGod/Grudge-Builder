/**
 * End Game mission — OPTIONAL lore cinematic (no longer unlocks home island).
 *
 * Happy path (2026-07): home island is available immediately after first character.
 * This mission may still play abandon-ship as flavor when accepted from a captain.
 *
 * Flow (optional):
 *   1. Talk to race captain on faction island
 *   2. Accept mission "End Game"
 *   3. Optional abandon-ship intro
 *   4. Continue on /home-island (already unlocked)
 *
 * Production home island URL:
 *   https://client.grudge-studio.com/home-island
 */

import { WARLORDS_HOME_ISLAND_MIN_LEVEL } from './warlordsProductionFlow';

export const END_GAME_MISSION_ID = 'mission_end_game' as const;
export const END_GAME_MISSION_TITLE = 'End Game' as const;
export const END_GAME_MIN_LEVEL = WARLORDS_HOME_ISLAND_MIN_LEVEL;

/** localStorage / session keys */
export const END_GAME_FLAGS = {
  missionOffered: 'warlords_end_game_offered_v1',
  missionAccepted: 'warlords_end_game_accepted_v1',
  cinematicComplete: 'warlords_end_game_cinematic_v1',
  homeIslandSpawned: 'warlords_end_game_home_spawned_v1',
} as const;

export interface EndGameDialogueLine {
  speaker: 'captain' | 'player' | 'narrator';
  text: string;
}

export const END_GAME_CAPTAIN_DIALOGUE: EndGameDialogueLine[] = [
  {
    speaker: 'captain',
    text: 'You have proven yourself in open water and war, {name}. The fleet has one last order.',
  },
  {
    speaker: 'captain',
    text: 'They call it End Game. You will not be thrown overboard like a slave. When the cannons answer, we abandon ship together — every soul jumps free as the hull goes under.',
  },
  {
    speaker: 'captain',
    text: 'Survive the swim and claim your own island. That is where a level {level} hero builds their legend.',
  },
  {
    speaker: 'player',
    text: 'I accept. End Game.',
  },
  {
    speaker: 'captain',
    text: 'Then to the guns. Abandon ship when I give the word. Your home waits beyond the wreck.',
  },
];

export interface EndGameMissionDef {
  id: typeof END_GAME_MISSION_ID;
  title: typeof END_GAME_MISSION_TITLE;
  minLevel: number;
  giverRole: 'captain_mounted';
  giverDialogueSetId: 'end_game_captain';
  /** Cinematic variant id */
  introVariant: 'abandon_ship_home_island';
  /** After cinematic */
  destinations: {
    /** Production path (same-origin) */
    homeIslandPath: string;
    /** Absolute production host (docs / external) */
    homeIslandUrl: string;
    /** First-time create/reveal */
    islandRevealPath: string;
  };
  steps: Array<{ id: string; title: string; detail: string }>;
  rewards: Array<{ kind: string; id: string; qty?: number; note?: string }>;
}

export const END_GAME_MISSION: EndGameMissionDef = {
  id: END_GAME_MISSION_ID,
  title: END_GAME_MISSION_TITLE,
  minLevel: END_GAME_MIN_LEVEL,
  giverRole: 'captain_mounted',
  giverDialogueSetId: 'end_game_captain',
  introVariant: 'abandon_ship_home_island',
  destinations: {
    homeIslandPath: '/home-island',
    homeIslandUrl: 'https://client.grudge-studio.com/home-island',
    islandRevealPath: '/island-reveal?from=end-game',
  },
  steps: [
    {
      id: 'talk_captain',
      title: 'Speak with your faction captain',
      detail: 'Optional flavor — find the mounted captain on a faction island.',
    },
    {
      id: 'accept_end_game',
      title: 'Accept “End Game”',
      detail: 'Optional abandon-ship cinematic (does not unlock home island).',
    },
    {
      id: 'abandon_ship_cinematic',
      title: 'Abandon ship',
      detail: 'Cannon fire · hull sinks · all models jump free (no overboard throw).',
    },
    {
      id: 'return_home_island',
      title: 'Return to home island',
      detail: 'Continue on your personal home island (already available after first character).',
    },
  ],
  rewards: [
    { kind: 'title', id: 'island_founder', note: 'End Game survivor (flavor)' },
  ],
};

/** Build captain lines with hero name / level */
export function formatEndGameDialogue(
  name: string,
  level: number,
): EndGameDialogueLine[] {
  return END_GAME_CAPTAIN_DIALOGUE.map((line) => ({
    ...line,
    text: line.text
      .replace(/\{name\}/g, name || 'Hero')
      .replace(/\{level\}/g, String(level || END_GAME_MIN_LEVEL)),
  }));
}

export function canOfferEndGame(level: number, missionAccepted?: boolean): boolean {
  if (missionAccepted) return true;
  return level >= END_GAME_MIN_LEVEL;
}

export function endGameCinematicUrl(opts?: {
  characterId?: string;
  characterName?: string;
  raceId?: string;
}): string {
  const u = new URL('/homeisland', 'https://client.grudge-studio.com');
  u.searchParams.set('cinematic', 'abandon-ship');
  u.searchParams.set('from', 'end-game');
  if (opts?.characterId) u.searchParams.set('characterId', opts.characterId);
  if (opts?.characterName) u.searchParams.set('hero', opts.characterName);
  if (opts?.raceId) u.searchParams.set('race', opts.raceId);
  // same-origin path for SPA
  return `/homeisland?${u.searchParams.toString()}`;
}

export function endGameAfterCinematicPath(hasIsland: boolean, characterId?: string): string {
  const base = hasIsland
    ? `/home-island?from=end-game`
    : END_GAME_MISSION.destinations.islandRevealPath;
  if (!characterId) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}characterId=${encodeURIComponent(characterId)}`;
}
