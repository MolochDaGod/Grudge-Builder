/**
 * Solo starting adventure — shipwreck on pirate island.
 *
 * NOT multiplayer lobby. Room name: "tutorial" (alias "shipwreck").
 * Private instance: filterBy characterId, maxClients 1.
 *
 * Opener is driven by the Dock Quest Traveler (same quest line for every race;
 * destinations change). Full step SSOT: travelerTutorialQuest.ts
 *
 * After completion → sail to race faction island → meet commander
 * → then home-island video/creation/cNFT → real multiplayer.
 */

import type { FactionIslandRaceId } from "./factionLobbyIslands";
import {
  TRAVELER_TUTORIAL_STEPS,
  TRAVELER_NPC,
  fullTravelerQuestForRace,
} from "./travelerTutorialQuest";

// Re-export race type for consumers that import tutorialFlow only
export type { FactionIslandRaceId };

export const TUTORIAL_ROOM = "tutorial" as const;
/** Back-compat alias registered on Colyseus */
export const TUTORIAL_ROOM_ALIAS = "shipwreck" as const;

/** Dock traveler that opens the tutorial on every race boat (island1). */
export const TUTORIAL_OPENER_NPC = TRAVELER_NPC;

/**
 * Ordered solo mission steps (server schema + client checklist).
 * Aligned with traveler tutorial — ends on raft → faction island → commander.
 */
export const TUTORIAL_STEPS = [
  {
    id: "intro_video",
    title: "Watch the intro",
    detail:
      "TI / Warlords open movie ends → shipwreck load → slow zoom to unarmed Grudge6 near wreck, boats, and the Dock Quest Traveler.",
  },
  {
    id: "meet_traveler",
    title: "Speak with Dock Quest Traveler",
    detail:
      "Same quest line for all races. Traveler stands on the starter boat / dock (quest_traveler · starter_quest_boat).",
  },
  {
    id: "gather_sticks",
    title: "Collect sticks (×3)",
    detail: "Harvest driftwood / sticks in the wake pocket by the broken ship.",
  },
  {
    id: "gather_stones",
    title: "Collect stones (×2)",
    detail: "Gather small stones in the same wake area.",
  },
  {
    id: "craft_t0_tools",
    title: "Craft T0 harvest tools",
    detail:
      "Use sticks + stones to craft pickaxe (and hatchet) — equip MainHand for harvest anims.",
  },
  {
    id: "claim_and_harvest",
    title: "Claim flag + work nodes",
    detail: "Plant a claim (C) and harvest scripted nodes; learn respawn economy.",
  },
  {
    id: "craft_campfire",
    title: "Quick-craft a campfire",
    detail: "Open main panel quick-craft and place a campfire.",
  },
  {
    id: "fight_boar",
    title: "Defeat a training foe",
    detail: "Combat basics: attack, block, dodge — then loot.",
  },
  {
    id: "cook_meat",
    title: "Cook meat at the fire",
    detail: "Use the campfire to cook food.",
  },
  {
    id: "ui_ux_tour",
    title: "Learn the UI",
    detail: "Walkthrough: main panel, inventory, skills, hotbars, map basics.",
  },
  {
    id: "craft_raft",
    title: "Quick-craft a raft",
    detail: "Craft a raft from timber, deploy it in the water.",
  },
  {
    id: "board_raft",
    title: "Board the raft (E)",
    detail: "Enter the raft and prepare to sail.",
  },
  {
    id: "sail_faction_island",
    title: "Sail to your faction island",
    detail:
      "Race-specific destination only — human→Haven Reach, barbarian→Stormfang, elf→Starleaf, dwarf→Anvilspire, orc→Bloodwake, undead→Gravewake.",
  },
  {
    id: "meet_commander",
    title: "Meet your race commander",
    detail:
      "Dock and report to the mounted captain / commander. Traveler quest completes; improved rewards grant.",
  },
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEPS)[number]["id"];

/** Resolve full traveler opener (steps + rewards + commander) for a race. */
export function tutorialOpenerForRace(raceId: FactionIslandRaceId) {
  return fullTravelerQuestForRace(raceId);
}

/** Step ids from the traveler SSOT (for HUD checklists). */
export const TRAVELER_OPENER_STEP_IDS = TRAVELER_TUTORIAL_STEPS.map((s) => s.id);

/**
 * Post-tutorial player journey (real game — multiplayer Colyseus).
 *
 * 0. Traveler opener complete (raft → faction island → commander)
 * 1. Home-island video + creation + home-island cNFT
 * 2. Live on home_island (private/owned instance, can invite others)
 * 3. Raft travel → world map (9 sectors)
 * 4. Multiplayer: lobby, sector/zone, town, dungeon, instances
 * 5. Home-island invite: near portal/raft press E → create or accept invite
 */
export const POST_TUTORIAL_FLOW = {
  factionIslandReport: "/faction-island",
  homeIslandReveal: "/island-reveal",
  homeIslandPlay: "/home-island",
  worldMap: "/world-map",
  multiplayerLobby: "lobby",
  homeIslandRoom: "home_island",
  sectorRoom: "sector",
} as const;
