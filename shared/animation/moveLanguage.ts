/**
 * Move Language — data-driven skill/move authoring (ported from vfx-sandbox).
 */

import type { PlaybackSlot } from "./types";

export type MoveWeight = "light" | "medium" | "heavy";
export type MoveArc = "straight" | "sweep" | "overhead" | "lob";
export type MoveEmit = "slash" | "projectile" | "trail" | "impact";
export type MoveCategory = "melee" | "ranged" | "caster" | "weapon-trail" | "utility";

export interface MoveBeat {
  at: number;
  emit: MoveEmit;
  yawDeg?: number;
  roll?: number;
  primary?: boolean;
  effectUuid?: string;
}

export interface MovePhases {
  windup: number;
  active: number;
  recovery: number;
}

export interface MoveSpec {
  id: string;
  label: string;
  category: MoveCategory;
  blurb: string;
  body: PlaybackSlot;
  weight: MoveWeight;
  arc: MoveArc;
  phases: MovePhases;
  beats: MoveBeat[];
}

export function moveDurationSec(spec: MoveSpec): number {
  const { windup, active, recovery } = spec.phases;
  return windup + active + recovery;
}

export const WEIGHT_HIT: Record<
  MoveWeight,
  { power: number; big: boolean; scale: number }
> = {
  light: { power: 0.6, big: false, scale: 0.8 },
  medium: { power: 1.0, big: true, scale: 1.0 },
  heavy: { power: 1.5, big: true, scale: 1.35 },
};

export const MOVE_SPECS: MoveSpec[] = [
  {
    id: "move-blade-dance",
    label: "Blade Dance",
    category: "melee",
    blurb: "Three-step combo: cross cuts left, right, then lunging finisher.",
    body: "attack",
    weight: "heavy",
    arc: "sweep",
    phases: { windup: 0.12, active: 0.46, recovery: 0.24 },
    beats: [
      { at: 0.14, emit: "slash", yawDeg: -18 },
      { at: 0.3, emit: "slash", yawDeg: 18 },
      { at: 0.52, emit: "slash", yawDeg: 0, primary: true },
      { at: 0.56, emit: "impact", primary: true },
    ],
  },
  {
    id: "move-spinning-glaive",
    label: "Spinning Glaive",
    category: "weapon-trail",
    blurb: "Wide windup then hurling arc toward target.",
    body: "special",
    weight: "medium",
    arc: "lob",
    phases: { windup: 0.24, active: 0.2, recovery: 0.3 },
    beats: [
      { at: 0.0, emit: "trail" },
      { at: 0.28, emit: "projectile", primary: true },
    ],
  },
  {
    id: "move-crescent-flourish",
    label: "Crescent Flourish",
    category: "weapon-trail",
    blurb: "Wide blade flourish left-to-right.",
    body: "slash1",
    weight: "light",
    arc: "sweep",
    phases: { windup: 0.1, active: 0.42, recovery: 0.2 },
    beats: [
      { at: 0.0, emit: "trail" },
      { at: 0.16, emit: "slash", yawDeg: -28 },
      { at: 0.3, emit: "slash", yawDeg: 0, primary: true },
      { at: 0.44, emit: "slash", yawDeg: 28 },
    ],
  },
  {
    id: "move-dodge-roll",
    label: "Combat Roll",
    category: "utility",
    blurb: "Quick dodge with brief i-frames window.",
    body: "dodge",
    weight: "light",
    arc: "straight",
    phases: { windup: 0.05, active: 0.35, recovery: 0.15 },
    beats: [],
  },
  {
    id: "move-arcane-bolt",
    label: "Arcane Bolt",
    category: "caster",
    blurb: "1H cast into projectile impact.",
    body: "cast",
    weight: "medium",
    arc: "straight",
    phases: { windup: 0.2, active: 0.3, recovery: 0.25 },
    beats: [
      { at: 0.22, emit: "projectile", primary: true },
      { at: 0.45, emit: "impact", primary: true },
    ],
  },
  {
    id: "move-shield-bash",
    label: "Shield Bash",
    category: "melee",
    blurb: "Block into impact stagger.",
    body: "block",
    weight: "medium",
    arc: "straight",
    phases: { windup: 0.1, active: 0.2, recovery: 0.3 },
    beats: [{ at: 0.18, emit: "impact", primary: true }],
  },
];

export function moveById(id: string): MoveSpec | undefined {
  return MOVE_SPECS.find((m) => m.id === id);
}

export function movesByCategory(category: MoveCategory): MoveSpec[] {
  return MOVE_SPECS.filter((m) => m.category === category);
}