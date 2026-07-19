/** Playback slot used by island3d AnimationManager */
export type PlaybackSlot =
  | "idle"
  | "idle_alt"
  | "walk"
  | "run"
  | "run_stop"
  | "harvest"
  | "attack"
  | "attack2"
  | "attack3"
  | "slash1"
  | "slash2"
  | "block"
  | "block_idle"
  | "dodge"
  | "cast"
  | "kick"
  | "jump"
  | "crouch"
  | "draw"
  | "special"
  | "impact"
  | "death"
  | "falling"
  | "fall_roll"
  | "hard_landing"
  | "climb_top"
  | "climb_attach"
  | "climb_detach"
  | "climb_idle"
  | "climb_up"
  | "climb_shimmy_l"
  | "climb_shimmy_r"
  | "climb_mantle"
  | "swim_surface"
  | "swim_underwater"
  | "fishing_idle"
  | "fishing_cast"
  | "fishing_wait"
  | "fishing_reel"
  | "fishing_catch"
  | "fishing_fail";

export const CLIP_CATEGORIES = [
  "Locomotion",
  "Attacks",
  "Casts",
  "Defense",
  "Hit Reactions",
  "Parkour",
  "Fishing",
  "Gestures",
] as const;

export type ClipCategory = (typeof CLIP_CATEGORIES)[number];
export type BlendMode = "locomotion" | "oneshot" | "additive" | "hold";