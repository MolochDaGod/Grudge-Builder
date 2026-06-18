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
  isActivityState,
  resolveStateAnim,
  type CharacterState,
} from "@shared/animation/stateAnimBridge";
import {
  moveById,
  moveDurationSec,
  type MoveSpec,
} from "@shared/animation/moveLanguage";

export interface OrchestratorCallbacks {
  onMoveBeat?: (emit: string, primary?: boolean) => void;
  onStateAnimChange?: (state: CharacterState, slot: PlaybackSlot) => void;
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

  /** Combat combo step — cycles attack2/attack3/slash clips */
  playComboHit(): PlaybackSlot {
    const slot = this.comboChain[this.comboIndex % this.comboChain.length];
    this.comboIndex++;
    this.activityOverride = true;
    this.activityTimer = 0.6;
    this.playSlot(slot, false);
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