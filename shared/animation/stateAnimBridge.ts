/**
 * State ↔ Animation bridge
 *
 * Connects CharacterStateMachine activity states to PlaybackSlots.
 * The orchestrator reads this map — never hardcode anim names in controllers.
 */

import type { PlaybackSlot } from "./types";

export type CharacterState =
  | "idle"
  | "moving"
  | "harvesting"
  | "building"
  | "sleeping"
  | "combat"
  | "sailing"
  | "fishing"
  | "fishing_idle"
  | "fishing_casting"
  | "fishing_waiting"
  | "fishing_reeling"
  | "fishing_catching"
  | "fishing_failed"
  | "crafting"
  | "trading"
  | "talking";

export interface StateAnimMapping {
  enter: PlaybackSlot;
  loop?: boolean;
  fallback?: PlaybackSlot;
}

export const ACTIVITY_STATES: CharacterState[] = [
  "harvesting",
  "building",
  "sleeping",
  "combat",
  "fishing",
  "fishing_idle",
  "fishing_casting",
  "fishing_waiting",
  "fishing_reeling",
  "fishing_catching",
  "fishing_failed",
  "crafting",
  "trading",
  "talking",
  "sailing",
];

export const STATE_ANIM_MAP: Record<CharacterState, StateAnimMapping> = {
  idle: { enter: "idle", loop: true },
  moving: { enter: "walk", loop: true, fallback: "run" },
  harvesting: { enter: "harvest", loop: false, fallback: "attack" },
  building: { enter: "harvest", loop: false, fallback: "attack" },
  sleeping: { enter: "idle", loop: true },
  combat: { enter: "attack", loop: false },
  sailing: { enter: "idle", loop: true },
  fishing: { enter: "fishing_idle", loop: true, fallback: "idle" },
  fishing_idle: { enter: "fishing_idle", loop: true, fallback: "idle" },
  fishing_casting: { enter: "fishing_cast", loop: false, fallback: "cast" },
  fishing_waiting: { enter: "fishing_wait", loop: true, fallback: "idle" },
  fishing_reeling: { enter: "fishing_reel", loop: true, fallback: "attack" },
  fishing_catching: { enter: "fishing_catch", loop: false, fallback: "attack" },
  fishing_failed: { enter: "fishing_fail", loop: false, fallback: "impact" },
  crafting: { enter: "idle", loop: true },
  trading: { enter: "idle", loop: true },
  talking: { enter: "idle", loop: true },
};

export function isActivityState(state: CharacterState): boolean {
  return ACTIVITY_STATES.includes(state);
}

export function resolveStateAnim(state: CharacterState): StateAnimMapping {
  return STATE_ANIM_MAP[state] ?? { enter: "idle", loop: true };
}

export const LEGACY_ANIM_NAME_MAP: Record<string, PlaybackSlot> = {
  Idle: "idle",
  Walk: "walk",
  Run: "run",
  Attack: "attack",
  Death: "death",
  FishingIdle: "fishing_idle",
  FishingCast: "fishing_cast",
  FishingWait: "fishing_wait",
  FishingReel: "fishing_reel",
  FishingCatch: "fishing_catch",
  FishingFail: "fishing_fail",
};