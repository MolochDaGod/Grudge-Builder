/**
 * Combo design system — multi-hit chains with rigid-body policy.
 * Aligns with combat-map.json + moveLanguage phases.
 */

import type { ComboDef, ComboStepDef, RigidBodyAnimPolicy } from "./types";
import { DEFAULT_RIGID_BODY_ANIM_POLICY } from "./types";

const RB: RigidBodyAnimPolicy = {
  ...DEFAULT_RIGID_BODY_ANIM_POLICY,
  notes: [
    ...DEFAULT_RIGID_BODY_ANIM_POLICY.notes,
    "Combo steps are one-shots; gait muted via overlay weight",
    "linkWindowSec gates input chaining without double-root impulses",
  ],
};

function step(
  partial: ComboStepDef,
): ComboStepDef {
  return {
    linkWindowSec: 0.35,
    cancelWindowSec: 0.12,
    weight: "medium",
    phase: { windup: 0.1, active: 0.25, recovery: 0.2 },
    ...partial,
  };
}

/** Greatsword samurai two-hit cleave (fleet reference) */
export const COMBO_GS_SAMURAI_CLEAVE: ComboDef = {
  id: "gs_samurai_cleave_combo",
  label: "Samurai Cleave Combo",
  weaponType: "GREATSWORD",
  animPack: "greatsword_samurai",
  version: "1.0.0",
  rigidBody: RB,
  steps: [
    step({
      id: "gs_samurai_combo_a",
      clipKey: "gs_samurai_combo_a",
      bodySlot: "attack",
      durationSec: 0.55,
      sourceArt: ["2Combo_1"],
      beats: [{ at: 0.28, emit: "slash", primary: true }],
      weight: "medium",
    }),
    step({
      id: "gs_samurai_combo_b",
      clipKey: "gs_samurai_combo_b",
      bodySlot: "attack2",
      durationSec: 0.6,
      sourceArt: ["3Combo_2"],
      beats: [{ at: 0.32, emit: "slash", primary: true }],
      weight: "heavy",
      rootImpulse: { z: 0.4 },
    }),
  ],
};

/** Generic light–medium–heavy melee trio */
export const COMBO_MELEE_3HIT: ComboDef = {
  id: "melee_3hit_standard",
  label: "Standard 3-Hit Melee",
  weaponType: "SWORD",
  animPack: "sword_shield",
  version: "1.0.0",
  rigidBody: RB,
  maxChain: 3,
  steps: [
    step({
      id: "melee_a",
      clipKey: "attack",
      bodySlot: "attack",
      durationSec: 0.45,
      weight: "light",
      beats: [{ at: 0.2, emit: "slash", primary: true }],
    }),
    step({
      id: "melee_b",
      clipKey: "attack2",
      bodySlot: "attack2",
      durationSec: 0.5,
      weight: "medium",
      beats: [{ at: 0.22, emit: "slash", primary: true }],
    }),
    step({
      id: "melee_c",
      clipKey: "attack3",
      bodySlot: "attack3",
      durationSec: 0.65,
      weight: "heavy",
      beats: [
        { at: 0.3, emit: "slash", primary: true },
        { at: 0.35, emit: "impact", primary: true },
      ],
      rootImpulse: { z: 0.55 },
    }),
  ],
};

/** Dual slash from mocap-friendly short takes */
export const COMBO_MOCAP_DUAL_SLASH: ComboDef = {
  id: "mocap_dual_slash",
  label: "Mocap Dual Slash (2–4s takes)",
  version: "1.0.0",
  rigidBody: RB,
  steps: [
    step({
      id: "mocap_slash_1",
      clipKey: "mocap_slash_1",
      bodySlot: "attack",
      durationSec: 0.7,
      weight: "medium",
      phase: { windup: 0.15, active: 0.25, recovery: 0.3 },
    }),
    step({
      id: "mocap_slash_2",
      clipKey: "mocap_slash_2",
      bodySlot: "attack2",
      durationSec: 0.85,
      weight: "heavy",
      phase: { windup: 0.12, active: 0.35, recovery: 0.38 },
      rootImpulse: { z: 0.35 },
    }),
  ],
};

export const COMBO_LIBRARY: ComboDef[] = [
  COMBO_GS_SAMURAI_CLEAVE,
  COMBO_MELEE_3HIT,
  COMBO_MOCAP_DUAL_SLASH,
];

export function comboById(id: string): ComboDef | undefined {
  return COMBO_LIBRARY.find((c) => c.id === id);
}

/** Build a combo from N reconstructed motion ids */
export function buildComboFromMotions(
  id: string,
  label: string,
  motionIds: string[],
  opts?: Partial<ComboDef>,
): ComboDef {
  return {
    id,
    label,
    version: "1.0.0",
    rigidBody: RB,
    ...opts,
    steps: motionIds.map((mid, i) =>
      step({
        id: `${id}_step_${i}`,
        clipKey: mid,
        bodySlot: i === 0 ? "attack" : i === 1 ? "attack2" : "attack3",
        durationSec: 0.6,
        weight: i >= 2 ? "heavy" : i === 1 ? "medium" : "light",
      }),
    ),
  };
}

/**
 * Combo runtime helper — which step index to play after elapsed chain time.
 */
export function resolveComboStep(
  combo: ComboDef,
  chainIndex: number,
  timeSinceStepStart: number,
  inputQueued: boolean,
): { step: ComboStepDef; nextIndex: number | null; finished: boolean } {
  const idx = Math.max(0, Math.min(chainIndex, combo.steps.length - 1));
  const stepDef = combo.steps[idx];
  const dur = stepDef.durationSec ?? 0.55;
  const link = stepDef.linkWindowSec ?? 0.35;
  const inLink =
    timeSinceStepStart >= dur - link && timeSinceStepStart <= dur + 0.05;

  if (inputQueued && inLink && idx + 1 < combo.steps.length) {
    return { step: stepDef, nextIndex: idx + 1, finished: false };
  }
  if (timeSinceStepStart >= dur) {
    return {
      step: stepDef,
      nextIndex: null,
      finished: true,
    };
  }
  return { step: stepDef, nextIndex: null, finished: false };
}
