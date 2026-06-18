/**
 * Animation Catalog — client bridge to CDN clips via modelManifest.
 * Team reference: see shared/animation for move language + state bridge.
 */

import type { AnimState3D, AnimationDef, WeaponType } from "@/lib/modelManifest";
import {
  getAnimationSet,
  getAvailableStates,
  resolveModelUrl,
} from "@/lib/modelManifest";
import type { BlendMode, ClipCategory, PlaybackSlot } from "@shared/animation/types";

export type { PlaybackSlot, ClipCategory, BlendMode };
export { CLIP_CATEGORIES } from "@shared/animation/types";

export const ANIM_STATE_TO_SLOT: Record<AnimState3D, PlaybackSlot> = {
  idle: "idle",
  walk: "walk",
  run: "run",
  attack1: "attack",
  attack2: "attack2",
  attack3: "attack3",
  slash1: "slash1",
  slash2: "slash2",
  block: "block",
  blockIdle: "block_idle",
  death: "death",
  jump: "jump",
  kick: "kick",
  cast: "cast",
  impact: "impact",
  crouch: "crouch",
  dodge: "dodge",
  draw: "draw",
  special: "special",
};

const CATEGORY_BY_STATE: Record<AnimState3D, ClipCategory> = {
  idle: "Locomotion",
  walk: "Locomotion",
  run: "Locomotion",
  attack1: "Attacks",
  attack2: "Attacks",
  attack3: "Attacks",
  slash1: "Attacks",
  slash2: "Attacks",
  block: "Defense",
  blockIdle: "Defense",
  death: "Hit Reactions",
  jump: "Parkour",
  kick: "Attacks",
  cast: "Casts",
  impact: "Hit Reactions",
  crouch: "Locomotion",
  dodge: "Defense",
  draw: "Attacks",
  special: "Attacks",
};

const BLEND_BY_STATE: Record<AnimState3D, BlendMode> = {
  idle: "locomotion",
  walk: "locomotion",
  run: "locomotion",
  attack1: "oneshot",
  attack2: "oneshot",
  attack3: "oneshot",
  slash1: "oneshot",
  slash2: "oneshot",
  block: "oneshot",
  blockIdle: "hold",
  death: "hold",
  jump: "oneshot",
  kick: "oneshot",
  cast: "oneshot",
  impact: "oneshot",
  crouch: "locomotion",
  dodge: "oneshot",
  draw: "oneshot",
  special: "oneshot",
};

const EASY_WIN_STATES: AnimState3D[] = [
  "attack2", "attack3", "slash1", "slash2", "block", "blockIdle",
  "dodge", "cast", "kick", "jump", "crouch", "draw", "special", "impact",
];

const LABELS: Record<AnimState3D, string> = {
  idle: "Idle", walk: "Walk", run: "Run",
  attack1: "Attack 1", attack2: "Attack 2", attack3: "Attack 3",
  slash1: "Slash 1", slash2: "Slash 2",
  block: "Block", blockIdle: "Block Idle", death: "Death",
  jump: "Jump", kick: "Kick", cast: "Cast", impact: "Impact",
  crouch: "Crouch Idle", dodge: "Dodge", draw: "Draw Weapon", special: "Special",
};

export const LEGACY_LOADED_SLOTS: PlaybackSlot[] = ["idle", "walk", "attack", "death"];

export interface CatalogEntry {
  id: AnimState3D;
  label: string;
  category: ClipCategory;
  playbackSlot: PlaybackSlot;
  blendMode: BlendMode;
  easyWin: boolean;
  loop: boolean;
  cdnFile?: string;
}

export function getCatalogForWeapon(weaponType: WeaponType): CatalogEntry[] {
  const set = getAnimationSet(weaponType);
  return getAvailableStates(weaponType)
    .filter((id) => set[id])
    .map((id) => ({
      id,
      label: LABELS[id] ?? id,
      category: CATEGORY_BY_STATE[id] ?? "Attacks",
      playbackSlot: ANIM_STATE_TO_SLOT[id],
      blendMode: BLEND_BY_STATE[id] ?? "oneshot",
      easyWin: EASY_WIN_STATES.includes(id),
      loop: set[id]!.loop,
      cdnFile: set[id]!.file,
    }));
}

export function getEasyBlendClips(weaponType: WeaponType): CatalogEntry[] {
  return getCatalogForWeapon(weaponType).filter((e) => e.easyWin);
}

export function getUnusedEasyWins(weaponType: WeaponType): CatalogEntry[] {
  const loaded = new Set(LEGACY_LOADED_SLOTS);
  return getEasyBlendClips(weaponType).filter((e) => !loaded.has(e.playbackSlot));
}

/** Load every CDN clip for a weapon into AnimationManager paths */
export function buildAnimLoadMap(
  weaponType: WeaponType,
): Partial<Record<PlaybackSlot, string>> {
  const set = getAnimationSet(weaponType);
  const paths: Partial<Record<PlaybackSlot, string>> = {};

  for (const [state, def] of Object.entries(set) as [AnimState3D, AnimationDef][]) {
    const slot = ANIM_STATE_TO_SLOT[state];
    if (slot && def?.file) {
      paths[slot] = resolveModelUrl(def.file);
    }
  }

  if (paths.run && !paths.run_stop) paths.run_stop = paths.run;
  if (paths.idle && !paths.idle_alt) paths.idle_alt = paths.idle;
  if (paths.attack && !paths.harvest) paths.harvest = paths.attack;

  return paths;
}

export function getAttackComboChain(weaponType: WeaponType): PlaybackSlot[] {
  const set = getAnimationSet(weaponType);
  const slots: PlaybackSlot[] = [];
  if (set.attack1) slots.push("attack");
  if (set.attack2) slots.push("attack2");
  if (set.attack3) slots.push("attack3");
  if (set.slash1) slots.push("slash1");
  if (set.slash2) slots.push("slash2");
  if (set.special) slots.push("special");
  return slots.length > 0 ? slots : ["attack"];
}