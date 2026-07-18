/**
 * Dock Quest Traveler — island1 / faction starting-zone tutorial opener.
 *
 * Source of truth for the NPC on each race's starter boat:
 *   factionLobbyIslands.ts → role: quest_traveler · dialogueSetId: starter_quest_boat
 *   open-world gmap mission_dock_starter (Welcome Aboard)
 *
 * Quest STEPS are identical for every race. Only destinations (waypoints, island
 * name, commander name) change with the player's race / faction.
 *
 * Flow ends: craft raft → board → sail to faction island → meet race commander.
 */

import type { FactionIslandRaceId } from './factionLobbyIslands';
import { RACE_ISLAND_NAMES, FACTION_HEROES_BY_RACE } from './factionLobbyIslands';

export const TRAVELER_NPC = {
  role: 'quest_traveler' as const,
  name: 'Dock Quest Traveler',
  /** Canonical dialogue set on each race boat */
  dialogueSetId: 'starter_quest_boat',
  /** Entity id pattern: `${raceId}_quest_traveler_boat` */
  entityIdSuffix: '_quest_traveler_boat',
  /** Human model on boat (neutral guide), not race-locked */
  modelRaceId: 'human' as const,
  modelPath: 'https://assets.grudge-studio.com/models/grudge6/races/WK_Characters.glb',
  /** Super Dialogue Audio Pack voice for traveler barks */
  voiceId: 'sean-lenhart' as const,
} as const;

export type TravelerStepKind =
  | 'dialogue'
  | 'move'
  | 'harvest'
  | 'craft'
  | 'equip'
  | 'combat'
  | 'claim'
  | 'board'
  | 'sail'
  | 'talk_commander';

export interface TravelerStepReward {
  gold?: number;
  xp?: number;
  wood?: number;
  stone?: number;
  herb?: number;
  items?: Array<{ id: string; name: string; qty: number }>;
}

export interface TravelerTutorialStep {
  id: string;
  kind: TravelerStepKind;
  title: string;
  /** Player-facing objective (may include {island} {commander} tokens) */
  objective: string;
  hint: string;
  /** Traveler vocal line (text). Audio uses voice pack category below. */
  travelerLine: string;
  /** Super-pack bark category */
  vocalCategory:
    | 'greeting'
    | 'confirmation'
    | 'miscellaneous'
    | 'completion'
    | 'farewell'
    | 'shouting';
  /** Optional count for gather/kill */
  targetCount?: number;
  rewards: TravelerStepReward;
}

/**
 * Shared tutorial chain — same for all 6 races.
 * Tokens: {island} {commander} {race} {faction}
 */
export const TRAVELER_TUTORIAL_STEPS: TravelerTutorialStep[] = [
  {
    id: 'meet_traveler',
    kind: 'dialogue',
    title: 'Welcome Aboard',
    objective: 'Speak with the Dock Quest Traveler on your starter boat',
    hint: 'Press E near the traveler on the dock boat',
    travelerLine:
      'Easy there, shipwrecked. I am the Dock Traveler — every race hears the same first lesson. Listen close.',
    vocalCategory: 'greeting',
    rewards: { gold: 15, xp: 25, items: [{ id: 'item_ration_t0', name: 'Travel Ration', qty: 2 }] },
  },
  {
    id: 'learn_move',
    kind: 'move',
    title: 'Find Your Feet',
    objective: 'Walk from the boat to the beach marker',
    hint: 'WASD · camera drag · Sprint with Shift',
    travelerLine: 'First lesson: move. Reach the beach marker before the tide takes your courage.',
    vocalCategory: 'confirmation',
    rewards: { xp: 20 },
  },
  {
    id: 'gather_basics',
    kind: 'harvest',
    title: 'Gather to Survive',
    objective: 'Collect sticks (×3) and stones (×2) near the wreck',
    hint: 'E / RMB / 1 / 2 — harvest nodes glow when you are close',
    travelerLine: 'Empty hands fill with sticks and stone. Harvest is life on these islands.',
    vocalCategory: 'miscellaneous',
    targetCount: 5,
    rewards: {
      xp: 40,
      wood: 3,
      stone: 2,
      items: [{ id: 't0_tool_kit_token', name: 'Tool Kit Token', qty: 1 }],
    },
  },
  {
    id: 'craft_tools',
    kind: 'craft',
    title: 'Craft T0 Tools',
    objective: 'Quick-craft a Flint Pickaxe (and optionally Hatchet)',
    hint: 'Main Panel → Quick Craft · 1 stick + 1 stone for pickaxe',
    travelerLine: 'Tools make the traveler. Craft a pickaxe — then we talk iron and timber.',
    vocalCategory: 'confirmation',
    rewards: {
      xp: 50,
      gold: 20,
      items: [{ id: 't0_pickaxe', name: 'Flint Pickaxe', qty: 1 }],
    },
  },
  {
    id: 'equip_tool',
    kind: 'equip',
    title: 'Equip Main Hand',
    objective: 'Equip the pickaxe to MainHand',
    hint: 'Inventory → Character equipment → MainHand',
    travelerLine: 'A tool in the bag is a hope. A tool in the hand is a plan.',
    vocalCategory: 'confirmation',
    rewards: { xp: 25 },
  },
  {
    id: 'harvest_node',
    kind: 'harvest',
    title: 'Work a Node',
    objective: 'Fully harvest one stone node and one wood node',
    hint: 'Hold harvest on a large rock, then a tree inland',
    travelerLine: 'Nodes refill in time. Take what you need — leave the island breathing.',
    vocalCategory: 'miscellaneous',
    targetCount: 2,
    rewards: { xp: 45, wood: 5, stone: 5, gold: 15 },
  },
  {
    id: 'claim_flag',
    kind: 'claim',
    title: 'Plant a Claim',
    objective: 'Plant a claim flag and harvest a scripted node inside the ring',
    hint: 'Press C to plant · gather one node that appears in the claim',
    travelerLine:
      'Claim the ground and the ground answers with resources. Flags mark what you mean to keep.',
    vocalCategory: 'shouting',
    rewards: {
      xp: 60,
      gold: 30,
      items: [{ id: 'item_claim_flag_t0', name: 'Practice Claim Flag', qty: 1 }],
    },
  },
  {
    id: 'first_fight',
    kind: 'combat',
    title: 'First Blood',
    objective: 'Defeat one weak foe (boar / skeleton minion)',
    hint: 'F / RMB attack · Q block · Shift dodge',
    travelerLine: 'Steel answers steel. Finish one foe cleanly — block, dodge, strike.',
    vocalCategory: 'shouting',
    targetCount: 1,
    rewards: {
      xp: 80,
      gold: 40,
      items: [
        { id: 'potion_minor_heal', name: 'Minor Healing Potion', qty: 3 },
        { id: 't0_sidearm', name: 'Traveler Sidearm', qty: 1 },
      ],
    },
  },
  {
    id: 'ui_basics',
    kind: 'dialogue',
    title: 'Know Your Panels',
    objective: 'Open Main Panel, Skills, and Inventory once each',
    hint: 'Hotkeys: I inventory · K skills · Esc closes',
    travelerLine:
      'Panels are your second map. Inventory, skills, and the main board — open each before we sail.',
    vocalCategory: 'miscellaneous',
    rewards: { xp: 30, gold: 10 },
  },
  {
    id: 'craft_raft',
    kind: 'craft',
    title: 'Build the Raft',
    objective: 'Quick-craft a raft from gathered timber',
    hint: 'Quick Craft → Raft · needs wood from trees / claim nodes',
    travelerLine:
      'Last craft of the shore: a raft. Build it true — then we leave the wreck behind.',
    vocalCategory: 'confirmation',
    rewards: {
      xp: 100,
      gold: 50,
      items: [{ id: 'item_raft_t0', name: 'Coastal Raft', qty: 1 }],
    },
  },
  {
    id: 'board_raft',
    kind: 'board',
    title: 'Board the Raft',
    objective: 'Deploy the raft and press E to board',
    hint: 'Place raft in water near the dock · E to board',
    travelerLine: 'Board when ready. The sea between wreck and home is short — if you keep the heading.',
    vocalCategory: 'confirmation',
    rewards: { xp: 40 },
  },
  {
    id: 'sail_faction',
    kind: 'sail',
    title: 'Sail to Your People',
    objective: 'Sail the raft to {island} ({race} faction island)',
    hint: 'Hold forward · aim for the faction banner on the horizon',
    travelerLine:
      'Same road for every bloodline — only the shore changes. Sail for {island}. Your commander waits.',
    vocalCategory: 'shouting',
    rewards: { xp: 120, gold: 75 },
  },
  {
    id: 'meet_commander',
    kind: 'talk_commander',
    title: 'Report to the Commander',
    objective: 'Speak with {commander} at {island}',
    hint: 'Dock · walk to the mounted captain / commander · press E',
    travelerLine:
      'I leave you here. Report to {commander}. The fleet needs sailors who can gather, claim, fight, and sail.',
    vocalCategory: 'farewell',
    rewards: {
      xp: 200,
      gold: 150,
      items: [
        { id: 'item_faction_badge', name: 'Faction Recruit Badge', qty: 1 },
        { id: 'item_traveler_satchel', name: 'Traveler Satchel', qty: 1 },
        { id: 'potion_minor_heal', name: 'Minor Healing Potion', qty: 5 },
      ],
    },
  },
];

export type TravelerStepId = (typeof TRAVELER_TUTORIAL_STEPS)[number]['id'];

/** Race-specific destinations for the shared quest line */
export interface RaceTravelerDest {
  raceId: FactionIslandRaceId;
  islandId: string;
  islandName: string;
  islandSubtitle: string;
  /** Mounted captain / commander display name */
  commanderName: string;
  commanderTitle: string;
  commanderHeroId: string;
  /** Faction label for dialogue */
  factionName: string;
  /** Starter boat entity id on island1 */
  questTravelerEntityId: string;
  starterBoatEntityId: string;
  dialogueSetId: typeof TRAVELER_NPC.dialogueSetId;
}

const FACTION_NAME: Record<FactionIslandRaceId, string> = {
  human: 'Crusade',
  barbarian: 'Crusade',
  elf: 'Fabled',
  dwarf: 'Fabled',
  orc: 'Legion',
  undead: 'Legion',
};

/** Prefer warrior-style captain as “commander” when present */
function pickCommander(raceId: FactionIslandRaceId) {
  const heroes = FACTION_HEROES_BY_RACE[raceId];
  const warrior = heroes.find((h) => /warrior|captain/i.test(h.classId)) ?? heroes[0]!;
  return warrior;
}

export function raceTravelerDest(raceId: FactionIslandRaceId): RaceTravelerDest {
  const meta = RACE_ISLAND_NAMES[raceId];
  const cmd = pickCommander(raceId);
  return {
    raceId,
    islandId: `faction_island_${raceId}`,
    islandName: meta.name,
    islandSubtitle: meta.subtitle,
    commanderName: cmd.name,
    commanderTitle: cmd.title,
    commanderHeroId: cmd.heroId,
    factionName: FACTION_NAME[raceId],
    questTravelerEntityId: `${raceId}_quest_traveler_boat`,
    starterBoatEntityId: `${raceId}_starter_boat`,
    dialogueSetId: TRAVELER_NPC.dialogueSetId,
  };
}

export function fillTravelerTokens(text: string, dest: RaceTravelerDest): string {
  return text
    .replace(/\{island\}/g, dest.islandName)
    .replace(/\{commander\}/g, `${dest.commanderName} ${dest.commanderTitle}`)
    .replace(/\{race\}/g, dest.raceId)
    .replace(/\{faction\}/g, dest.factionName);
}

export function travelerStepForRace(
  step: TravelerTutorialStep,
  raceId: FactionIslandRaceId,
): TravelerTutorialStep {
  const dest = raceTravelerDest(raceId);
  return {
    ...step,
    objective: fillTravelerTokens(step.objective, dest),
    hint: fillTravelerTokens(step.hint, dest),
    travelerLine: fillTravelerTokens(step.travelerLine, dest),
  };
}

export function fullTravelerQuestForRace(raceId: FactionIslandRaceId): {
  dest: RaceTravelerDest;
  steps: TravelerTutorialStep[];
  totalRewards: TravelerStepReward;
} {
  const dest = raceTravelerDest(raceId);
  const steps = TRAVELER_TUTORIAL_STEPS.map((s) => travelerStepForRace(s, raceId));
  const totalRewards: TravelerStepReward = { gold: 0, xp: 0, wood: 0, stone: 0, herb: 0, items: [] };
  for (const s of steps) {
    totalRewards.gold = (totalRewards.gold ?? 0) + (s.rewards.gold ?? 0);
    totalRewards.xp = (totalRewards.xp ?? 0) + (s.rewards.xp ?? 0);
    totalRewards.wood = (totalRewards.wood ?? 0) + (s.rewards.wood ?? 0);
    totalRewards.stone = (totalRewards.stone ?? 0) + (s.rewards.stone ?? 0);
    totalRewards.herb = (totalRewards.herb ?? 0) + (s.rewards.herb ?? 0);
    if (s.rewards.items) totalRewards.items!.push(...s.rewards.items);
  }
  return { dest, steps, totalRewards };
}

/** Improved total opener rewards (sum of step grants). */
export const TRAVELER_OPENER_REWARD_SUMMARY = {
  gold: 440,
  xp: 835,
  highlightItems: [
    'Flint Pickaxe',
    'Traveler Sidearm',
    'Coastal Raft',
    'Faction Recruit Badge',
    'Traveler Satchel',
    'Healing Potions',
  ],
} as const;

/**
 * Dialogue set: starter_quest_boat — lines used by all race boat travelers.
 * Variants rotate; race tokens filled at runtime.
 */
export const STARTER_QUEST_BOAT_DIALOGUE = {
  id: 'starter_quest_boat',
  greetings: [
    'Wash the salt from your eyes. I am the Dock Traveler — same words for every race that wrecks here.',
    'You live. Good. The boat behind me is not your end; {island} is your beginning.',
    'Every bloodline starts on this rail. Listen, then work, then sail.',
  ],
  onStepComplete: [
    'That is the way. Next lesson.',
    'Good hands. Keep them busy.',
    'The sea is patient. You should not be.',
  ],
  onRaftBuilt: [
    'Raft is true. Board when your courage is.',
    'Wood holds. Now hold your course for {island}.',
  ],
  onSail: [
    'Hold the heading. {commander} watches the docks of {island}.',
    'Same quest for every race — different shore. Sail.',
  ],
  farewellToCommander: [
    'I leave you with {commander}. Earn your place in the {faction}.',
    'Report clean. The traveler\'s work is done; the soldier\'s begins.',
  ],
} as const;
