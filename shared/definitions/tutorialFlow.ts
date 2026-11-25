/**
 * Multiplayer starting adventure — Shipwreck Cove on the pirate-islands map.
 *
 * Room name: "tutorial" (alias "shipwreck").
 * Shared Colyseus shards host up to 24 survivors while tutorial progression,
 * crafting, rewards, and completion remain authoritative per character.
 *
 * Opener is driven by the Dock Quest Traveler (same quest line for every race;
 * destinations change). Full step SSOT: travelerTutorialQuest.ts
 *
 * After completion → sail to the shared pirate/faction lobby → race faction
 * island → commander → home island / open world.
 */

import type { FactionIslandRaceId } from "./factionLobbyIslands";
import {
  TRAVELER_TUTORIAL_STEPS,
  TRAVELER_NPC,
  fullTravelerQuestForRace,
} from "./travelerTutorialQuest";
import { MULTIPLAYER_SHIPWRECK } from "./multiplayerTutorial";

export type { FactionIslandRaceId };

export const TUTORIAL_ROOM = MULTIPLAYER_SHIPWRECK.roomName;
/** Back-compat alias registered on Colyseus */
export const TUTORIAL_ROOM_ALIAS = MULTIPLAYER_SHIPWRECK.legacyAlias;

/** Dock traveler that opens the tutorial for every race. */
export const TUTORIAL_OPENER_NPC = TRAVELER_NPC;

/**
 * Ordered mission steps (server titles + client checklist).
 * Completion is per character even though the world shard is multiplayer.
 */
export const TUTORIAL_STEPS = [
  {
    id: "intro_video",
    title: "Survive the Leviathan",
    detail:
      "Leviathan Ocean cinema destroys the first-voyage ship, then the hero wakes unarmed at multiplayer Shipwreck Cove.",
  },
  {
    id: "meet_traveler",
    title: "Speak with Dock Quest Traveler",
    detail:
      "Same quest line for all races. Other survivors may be completing their own objectives nearby.",
  },
  {
    id: "gather_sticks",
    title: "Collect sticks (×3)",
    detail: "Harvest driftwood / sticks in the wake pocket by the broken ship.",
  },
  {
    id: "gather_stones",
    title: "Collect stones (×2)",
    detail: "Gather small stones in the same wake area; tutorial resources are non-competitive.",
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
    detail: "Combat basics: attack, block, dodge. Nearby survivors can assist without stealing progression.",
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
    detail: "Enter the raft and prepare to sail from Shipwreck Cove.",
  },
  {
    id: "sail_faction_island",
    title: "Sail to your faction island",
    detail:
      "Enter the shared pirate/faction lobby and sail the outer ring to your race destination.",
  },
  {
    id: "meet_commander",
    title: "Meet your race commander",
    detail:
      "Dock at your faction island and report to the mounted captain / commander. The world game loop opens from here.",
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
 * Post-tutorial Warlords journey.
 *
 * 0. Shared Shipwreck Cove tutorial (Leviathan wash-up)
 * 1. Raft → multiplayer pirate/faction lobby
 * 2. Race faction island → commander / hero-NPC campaigns
 * 3. Home island + professions / crafting / building
 * 4. World map → 9 multiplayer sectors / towns / dungeons / bosses
 */
export const POST_TUTORIAL_FLOW = {
  factionLobby: "/island-3d?mode=lobby&map=pirate-islands&from=tutorial&focus=faction",
  factionIslandReport: "/faction-island",
  homeIslandReveal: "/island-reveal",
  homeIslandPlay: "/home-island",
  worldMap: "/world-map",
  multiplayerLobby: "lobby",
  homeIslandRoom: "home_island",
  sectorRoom: "sector",
} as const;
