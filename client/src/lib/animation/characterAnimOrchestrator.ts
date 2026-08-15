/**
 * CharacterAnimOrchestrator — wires CharacterStateMachine → AnimationManager.
 *
 * Ensures easy-win clips (dodge, block, combo attacks) actually play instead of
 * being defined on CDN but never loaded. Compiles moveLanguage beats at runtime.
 */

import type { AnimationManager, AnimState } from "@/island3d/player/AnimationManager";
import type { CharacterStateMachine } from "@/lib/characterStateMachine";
import type { WeaponType } from "@/lib/modelManifest";
import {
  getAttackComboChain,
  type PlaybackSlot,
} from "@/lib/animation/animationCatalog";
import {
  ATTACK2_MOTION,
  ATTACK3_MOTION,
  comboMotionProfile,
  type MotionProfile,
} from "@/lib/animation/explorer/motionMath";
import {
  isActivityState,
  resolveStateAnim,
  type CharacterState,
} from "@shared/animation/stateAnimBridge";
import {
  moveById,
  moveDurationSec,
  type MoveSpec,
} from "@shared/animation/moveLanguage";
import { getProductionSkillCombat } from "@shared/definitions/weaponSkillCombatCatalog";

export interface OrchestratorCallbacks {
  onMoveBeat?: (emit: string, primary?: boolean) => void;
  onStateAnimChange?: (state: CharacterState, slot: PlaybackSlot) => void;
  /** Dangerroom MM body lunge paired with the attack clip. */
  onMotionAttack?: (profile: MotionProfile, slot: PlaybackSlot, clipDur: number, stage: number) => void;
}

export class CharacterAnimOrchestrator {
  private unsubscribe: (() => void) | null = null;
  private activityOverride = false;
  private activityTimer = 0;
  private comboIndex = 0;
  private comboChain: PlaybackSlot[] = [];
  private activeMove: MoveSpec | null = null;
  private moveElapsed = 0;
  private firedBeats = new Set<number>();

  constructor(
    private animations: AnimationManager,
    private stateMachine: CharacterStateMachine,
    weaponType: WeaponType,
    private callbacks: OrchestratorCallbacks = {},
  ) {
    this.comboChain = getAttackComboChain(weaponType);
    this.subscribe();
  }

  subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.stateMachine.subscribe((state) => {
      this.onStateChange(state);
    });
    this.onStateChange(this.stateMachine.getState());
  }

  hasActivityOverride(): boolean {
    return this.activityOverride || this.activeMove !== null;
  }

  /** Play a data-driven move from moveLanguage */
  playMove(moveId: string): boolean {
    const spec = moveById(moveId);
    if (!spec) return false;

    this.activeMove = spec;
    this.moveElapsed = 0;
    this.firedBeats.clear();
    this.activityOverride = true;
    this.activityTimer = moveDurationSec(spec);

    this.playSlot(spec.body, false);
    return true;
  }

  /** Combat combo step — cycles attack2/attack3/slash clips with +/- MM motion */
  playComboHit(): PlaybackSlot {
    const stage = this.comboIndex % this.comboChain.length;
    const slot = this.comboChain[stage];
    this.comboIndex++;
    this.activityOverride = true;
    this.activityTimer = 0.6;
    const profile = comboMotionProfile(stage);
    if (this.callbacks.onMotionAttack) {
      this.callbacks.onMotionAttack(profile, slot, 0.35, stage);
    } else {
      this.playSlot(slot, false);
    }
    return slot;
  }

  /** Explicit motion-math attack (Z = +100/-50 lunge, X = -50 retreat poke). */
  playMotionAttack(kind: 'attack2' | 'attack3'): PlaybackSlot {
    const profile = kind === 'attack2' ? ATTACK2_MOTION : ATTACK3_MOTION;
    const slot: PlaybackSlot = kind === 'attack2' ? 'attack2' : 'attack3';
    const stage = kind === 'attack2' ? 1 : 2;
    this.activityOverride = true;
    this.activityTimer = 0.55;
    if (this.callbacks.onMotionAttack) {
      this.callbacks.onMotionAttack(profile, slot, 0.35, stage);
    } else {
      this.playSlot(slot, false, 'attack');
    }
    return slot;
  }

  playDodge(): void {
    this.activityOverride = true;
    this.activityTimer = 0.5;
    this.playSlot("dodge", false, "attack");
  }

  playBlock(): void {
    this.activityOverride = true;
    this.activityTimer = 0.8;
    this.playSlot("block_idle", true, "block");
  }

  /** Production hotbar skill execution (1-5 slots). Maps skill id to appropriate catalog playback + timing for testing game flow.
   * Slot 1 "basic" or strike-like uses the full combo + MM motion for authentic feel.
   */
  playSkill(skillId: string, _form: number = 0): PlaybackSlot | null {
    const sid = (skillId || '').toLowerCase();

    const prod = getProductionSkillCombat(skillId);
    const catalogSlot = prod?.animKey as PlaybackSlot | undefined;
    if (
      catalogSlot &&
      (catalogSlot === 'special' ||
        catalogSlot === 'cast' ||
        catalogSlot === 'attack' ||
        catalogSlot === 'attack2' ||
        catalogSlot === 'attack3' ||
        catalogSlot === 'dodge' ||
        catalogSlot === 'slash1')
    ) {
      this.activityOverride = true;
      this.activityTimer = Math.max(0.7, prod?.windup ?? 0.2) + (prod?.active ?? 0.4);
      this.playSlot(catalogSlot, false, 'attack');
      return catalogSlot;
    }

    // Slot 1 basic / strike / warrior default -> use the rich combo system (like LMB)
    if (sid.includes('strike') || sid.includes('basic') || sid.includes('warrior_0') || sid === 'slot1' || sid.includes('power_strike')) {
      return this.playComboHit();
    }

    let slot: PlaybackSlot = 'special';
    let dur = 0.75;

    if (sid.includes('blast') || sid.includes('exp') || sid.includes('meteor') || sid.includes('cast') || sid.includes('bolt') || sid.includes('rune')) {
      slot = 'cast';
      dur = 0.9;
    } else if (sid.includes('ward') || sid.includes('shield') || sid.includes('block') || sid.includes('reflect') || sid.includes('fortify') || sid.includes('bulwark')) {
      slot = 'block_idle';
      dur = 1.0;
    } else if (sid.includes('minion') || sid.includes('summon') || sid.includes('conj') || sid.includes('lord') || sid.includes('ritual')) {
      slot = 'special';
      dur = 1.1;
    } else if (sid.includes('flurry') || sid.includes('cleave') || sid.includes('strike') || sid.includes('dual') || sid.includes('offhand') || sid.includes('whirl')) {
      slot = 'attack2';
      dur = 0.55;
    } else if (sid.includes('slash') || sid.includes('execute') || sid.includes('counter')) {
      slot = 'slash1';
      dur = 0.6;
    } else if (sid.includes('dodge') || sid.includes('shadow') || sid.includes('step') || sid.includes('vanish')) {
      slot = 'dodge';
      dur = 0.45;
    } else if (sid.includes('taunt') || sid.includes('aura') || sid.includes('surge')) {
      slot = 'special';
      dur = 0.8;
    }

    this.activityOverride = true;
    this.activityTimer = dur;
    this.playSlot(slot, false, 'attack');
    return slot;
  }

  update(dt: number): void {
    if (this.activeMove) {
      this.moveElapsed += dt;
      for (const beat of this.activeMove.beats) {
        if (!this.firedBeats.has(beat.at) && this.moveElapsed >= beat.at) {
          this.firedBeats.add(beat.at);
          this.callbacks.onMoveBeat?.(beat.emit, beat.primary);
        }
      }
      if (this.moveElapsed >= moveDurationSec(this.activeMove)) {
        this.activeMove = null;
        this.activityOverride = false;
        this.onStateChange(this.stateMachine.getState());
      }
      return;
    }

    if (this.activityOverride) {
      this.activityTimer -= dt;
      if (this.activityTimer <= 0) {
        this.activityOverride = false;
        this.onStateChange(this.stateMachine.getState());
      }
    }
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private onStateChange(state: CharacterState): void {
    if (this.activeMove) return;

    if (isActivityState(state)) {
      const mapping = resolveStateAnim(state);
      this.activityOverride = true;
      this.activityTimer = state === "sleeping" ? 999 : 1.5;
      this.playSlot(mapping.enter, mapping.loop ?? false, mapping.fallback);
      this.callbacks.onStateAnimChange?.(state, mapping.enter);
    } else {
      this.activityOverride = false;
      this.comboIndex = 0;
    }
  }

  private playSlot(
    slot: PlaybackSlot,
    loop: boolean,
    fallback?: PlaybackSlot,
  ): void {
    const state = slot as AnimState;
    const fb = fallback as AnimState | undefined;
    if (this.animations.hasClip(state)) {
      this.animations.play(state, { loop });
    } else if (fb && this.animations.hasClip(fb)) {
      this.animations.play(fb, { loop });
    }
  }
}