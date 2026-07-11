/**
 * Solo starting adventure — shipwreck on pirate island.
 *
 * NOT multiplayer lobby. Room name: "tutorial" (alias "shipwreck").
 * Private instance: filterBy characterId, maxClients 1.
 *
 * After completion → home-island video/creation/cNFT → real multiplayer.
 */

export const TUTORIAL_ROOM = "tutorial" as const;
/** Back-compat alias registered on Colyseus */
export const TUTORIAL_ROOM_ALIAS = "shipwreck" as const;

/**
 * Ordered solo mission steps (server schema + client checklist).
 */
export const TUTORIAL_STEPS = [
  {
    id: "intro_video",
    title: "Watch the intro",
    detail: "Intro cinematic — wash ashore on the pirate island shipwreck.",
  },
  {
    id: "gather_sticks",
    title: "Collect sticks (×3)",
    detail: "Harvest driftwood / sticks on the beach near the wreck.",
  },
  {
    id: "gather_stones",
    title: "Collect stones (×2)",
    detail: "Gather stone on the shore.",
  },
  {
    id: "craft_campfire",
    title: "Quick-craft a campfire",
    detail: "Open main panel quick-craft and place a campfire.",
  },
  {
    id: "fight_boar",
    title: "Defeat the boar",
    detail: "A boar spawns on the island — combat, then skin it.",
  },
  {
    id: "cook_meat",
    title: "Cook meat at the fire",
    detail: "Use the campfire to cook boar meat.",
  },
  {
    id: "ui_ux_tour",
    title: "Learn the UI",
    detail: "Walkthrough: main panel, hotbars, modes, map basics.",
  },
  {
    id: "craft_raft",
    title: "Quick-craft a raft",
    detail: "Craft a raft, deploy it in the water, press E to board.",
  },
  {
    id: "board_raft",
    title: "Board the raft (E)",
    detail: "Enter the raft → end-of-tutorial cutscene.",
  },
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEPS)[number]["id"];

/**
 * Post-tutorial player journey (real game — multiplayer Colyseus).
 *
 * 1. Home-island video + creation + home-island cNFT
 * 2. Live on home_island (private/owned instance, can invite others)
 * 3. Raft travel → world map (9 sectors)
 * 4. Multiplayer: lobby, sector/zone, town, dungeon, instances
 * 5. Home-island invite: near portal/raft press E → create or accept invite
 */
export const POST_TUTORIAL_FLOW = {
  homeIslandReveal: "/island-reveal",
  homeIslandPlay: "/home-island",
  worldMap: "/world-map",
  multiplayerLobby: "lobby",
  homeIslandRoom: "home_island",
  sectorRoom: "sector",
} as const;
