/**
 * AnimationBlendManager — advanced animation system with:
 *  - Speed-based idle/walk/run blending (weighted, not crossfade)
 *  - Additive animation layers (breathing, combat hit react, etc.)
 *  - One-shot action support (attack, harvest, death) with auto-revert
 *  - Bone attachment system (weapons, shields, effects)
 *  - Spring-based procedural animation helpers
 *
 * Builds on top of Three.js AnimationMixer with game-ready patterns
 * derived from threejs-skills reference.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LocomotionState = 'idle' | 'walk' | 'run';
export type ActionState = 'attack' | 'harvest' | 'death' | 'dodge' | 'cast' | 'parry';
export type AdditiveLayer = 'breathing' | 'hitReact' | 'combatStance' | 'injured';
export type AnyAnimState = LocomotionState | ActionState | AdditiveLayer;

export interface BoneAttachment {
  boneName: string;
  object: THREE.Object3D;
  offset?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

// ─── Spring for procedural animation ─────────────────────────────────────────

export class Spring {
  position = 0;
  velocity = 0;
  target = 0;

  constructor(
    public stiffness = 100,
    public damping = 10,
  ) {}

  update(dt: number): number {
    const force = -this.stiffness * (this.position - this.target);
    const dampingForce = -this.damping * this.velocity;
    this.velocity += (force + dampingForce) * dt;
    this.position += this.velocity * dt;
    return this.position;
  }

  reset(value = 0): void {
    this.position = value;
    this.velocity = 0;
    this.target = value;
  }
}

export class Spring3 {
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  target = new THREE.Vector3();
  // Scratch — never allocate in update()
  private _force = new THREE.Vector3();
  private _tmp = new THREE.Vector3();

  constructor(
    public stiffness = 100,
    public damping = 10,
  ) {}

  update(dt: number): THREE.Vector3 {
    // F = k * (target - pos) - c * vel
    this._force.copy(this.target).sub(this.position).multiplyScalar(this.stiffness);
    this._tmp.copy(this.velocity).multiplyScalar(-this.damping);
    this._force.add(this._tmp);
    this.velocity.addScaledVector(this._force, dt);
    this.position.addScaledVector(this.velocity, dt);
    return this.position;
  }

  reset(v?: THREE.Vector3): void {
    if (v) this.position.copy(v);
    this.velocity.set(0, 0, 0);
    if (v) this.target.copy(v);
  }
}

// ─── Smooth Damp helper ──────────────────────────────────────────────────────

export function smoothDamp(
  current: number,
  target: number,
  velocityRef: { v: number },
  smoothTime: number,
  dt: number,
): number {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocityRef.v + omega * change) * dt;
  velocityRef.v = (velocityRef.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

// ─── Main Manager ────────────────────────────────────────────────────────────

export class AnimationBlendManager {
  private mixer: THREE.AnimationMixer;
  private locomotionClips = new Map<LocomotionState, THREE.AnimationAction>();
  private actionClips = new Map<ActionState, THREE.AnimationAction>();
  private additiveClips = new Map<AdditiveLayer, THREE.AnimationAction>();
  private allClips = new Map<string, THREE.AnimationAction>();

  // Current state
  private currentAction: ActionState | null = null;
  private actionCallback: (() => void) | null = null;
  private locomotionSpeed = 0;

  // Bone attachments
  private skeleton: THREE.Skeleton | null = null;
  private attachments = new Map<string, BoneAttachment>();

  // Procedural springs
  public headSpring = new Spring(80, 12);   // for procedural head look
  public breathSpring = new Spring(4, 2);    // subtle breathing

  // Config
  private fadeDuration = 0.25;
  private walkSpeedThreshold = 0.5;
  private runSpeedThreshold = 5;

  constructor(public model: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(model);

    // Find skeleton for bone attachments
    model.traverse((child) => {
      if ((child as any).isSkinnedMesh && (child as any).skeleton) {
        this.skeleton = (child as any).skeleton;
      }
    });

    // Listen for action completion
    this.mixer.addEventListener('finished', (e: any) => {
      const finishedAction = e.action as THREE.AnimationAction;
      // Check if this was a one-shot action
      for (const [state, action] of this.actionClips) {
        if (action === finishedAction && state === this.currentAction) {
          this.currentAction = null;
          this.actionCallback?.();
          this.actionCallback = null;
          // Fade back into locomotion
          this.updateLocomotionWeights();
          break;
        }
      }
    });
  }

  // ─── Clip registration ─────────────────────────────────────────────────────

  /** Register a locomotion clip (idle/walk/run) — these blend by speed */
  addLocomotionClip(state: LocomotionState, clip: THREE.AnimationClip): void {
    const action = this.mixer.clipAction(clip);
    action.play();
    action.setEffectiveWeight(state === 'idle' ? 1 : 0);
    this.locomotionClips.set(state, action);
    this.allClips.set(state, action);
  }

  /** Register a one-shot action clip (attack/harvest/death) */
  addActionClip(state: ActionState, clip: THREE.AnimationClip): void {
    const action = this.mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = state === 'death'; // death holds last frame
    action.setEffectiveWeight(0);
    this.actionClips.set(state, action);
    this.allClips.set(state, action);
  }

  /** Register an additive animation layer (breathing, hit react) */
  addAdditiveClip(layer: AdditiveLayer, clip: THREE.AnimationClip): void {
    THREE.AnimationUtils.makeClipAdditive(clip);
    const action = this.mixer.clipAction(clip);
    action.blendMode = THREE.AdditiveAnimationBlendMode;
    action.play();
    action.setEffectiveWeight(0);
    this.additiveClips.set(layer, action);
    this.allClips.set(layer, action);
  }

  /** Bulk load clips from a loaded GLTF's animation array */
  addClipsFromGLTF(
    clips: THREE.AnimationClip[],
    nameMap?: Partial<Record<string, AnyAnimState>>,
  ): void {
    for (const clip of clips) {
      const name = clip.name.toLowerCase();
      const mapped = nameMap?.[clip.name] || this.autoMapName(name);
      if (!mapped) continue;

      if (['idle', 'walk', 'run'].includes(mapped)) {
        this.addLocomotionClip(mapped as LocomotionState, clip);
      } else if (['attack', 'harvest', 'death', 'dodge', 'cast', 'parry'].includes(mapped)) {
        this.addActionClip(mapped as ActionState, clip);
      } else if (['breathing', 'hitReact', 'combatStance', 'injured'].includes(mapped)) {
        this.addAdditiveClip(mapped as AdditiveLayer, clip);
      }
    }
  }

  private autoMapName(name: string): AnyAnimState | null {
    if (name.includes('idle') || name.includes('stand')) return 'idle';
    if (name.includes('walk')) return 'walk';
    if (name.includes('run') || name.includes('sprint')) return 'run';
    if (name.includes('attack') || name.includes('slash') || name.includes('swing')) return 'attack';
    if (name.includes('harvest') || name.includes('chop') || name.includes('mine')) return 'harvest';
    if (name.includes('death') || name.includes('die')) return 'death';
    if (name.includes('dodge') || name.includes('roll')) return 'dodge';
    if (name.includes('cast') || name.includes('spell')) return 'cast';
    if (name.includes('parry') || name.includes('block')) return 'parry';
    if (name.includes('breath')) return 'breathing';
    if (name.includes('hit') || name.includes('hurt') || name.includes('damage')) return 'hitReact';
    if (name.includes('combat') || name.includes('fight')) return 'combatStance';
    if (name.includes('injured') || name.includes('limp')) return 'injured';
    return null;
  }

  // ─── Locomotion (speed-based blending) ─────────────────────────────────────

  /** Set movement speed — automatically blends idle/walk/run weights */
  setSpeed(speed: number): void {
    this.locomotionSpeed = speed;
    if (!this.currentAction) {
      this.updateLocomotionWeights();
    }
  }

  private updateLocomotionWeights(): void {
    const speed = this.locomotionSpeed;
    const idle = this.locomotionClips.get('idle');
    const walk = this.locomotionClips.get('walk');
    const run = this.locomotionClips.get('run');

    if (speed < this.walkSpeedThreshold) {
      // Pure idle
      idle?.setEffectiveWeight(1);
      walk?.setEffectiveWeight(0);
      run?.setEffectiveWeight(0);
    } else if (speed < this.runSpeedThreshold) {
      // Blend idle→walk
      const t = (speed - this.walkSpeedThreshold) / (this.runSpeedThreshold - this.walkSpeedThreshold);
      idle?.setEffectiveWeight(1 - t);
      walk?.setEffectiveWeight(t);
      run?.setEffectiveWeight(0);
    } else {
      // Blend walk→run
      const t = Math.min((speed - this.runSpeedThreshold) / this.runSpeedThreshold, 1);
      idle?.setEffectiveWeight(0);
      walk?.setEffectiveWeight(1 - t);
      run?.setEffectiveWeight(t);
    }
  }

  // ─── Actions (one-shot) ────────────────────────────────────────────────────

  /** Play a one-shot action (attack, harvest, etc.) — fades out locomotion, reverts on complete */
  playAction(state: ActionState, onComplete?: () => void): void {
    const action = this.actionClips.get(state);
    if (!action) return;

    // Fade out locomotion
    for (const [, a] of this.locomotionClips) {
      a.setEffectiveWeight(0.1); // keep subtle so blend-back is smooth
    }

    // Play action
    action.reset();
    action.setEffectiveWeight(1);
    action.fadeIn(this.fadeDuration);
    action.play();

    this.currentAction = state;
    this.actionCallback = onComplete || null;
  }

  /** Cancel current action and revert to locomotion */
  cancelAction(): void {
    if (!this.currentAction) return;
    const action = this.actionClips.get(this.currentAction);
    if (action) action.fadeOut(this.fadeDuration);
    this.currentAction = null;
    this.actionCallback = null;
    this.updateLocomotionWeights();
  }

  // ─── Additive layers ───────────────────────────────────────────────────────

  /** Set weight for an additive animation layer (0 = off, 1 = full) */
  setAdditiveWeight(layer: AdditiveLayer, weight: number): void {
    const action = this.additiveClips.get(layer);
    if (action) action.setEffectiveWeight(Math.max(0, Math.min(1, weight)));
  }

  /** Enable breathing additive layer */
  enableBreathing(weight = 0.3): void {
    this.setAdditiveWeight('breathing', weight);
  }

  /** Flash hit reaction */
  triggerHitReact(duration = 0.4): void {
    const action = this.additiveClips.get('hitReact');
    if (!action) return;
    action.reset();
    action.setEffectiveWeight(1);
    action.play();
    // Auto-fade
    setTimeout(() => action.fadeOut(duration), duration * 500);
  }

  // ─── Bone attachments ──────────────────────────────────────────────────────

  /** Attach an object to a named bone */
  attachToBone(id: string, attachment: BoneAttachment): boolean {
    if (!this.skeleton) return false;

    const bone = this.skeleton.bones.find((b) => b.name === attachment.boneName);
    if (!bone) {
      console.warn(`[AnimationBlendManager] Bone "${attachment.boneName}" not found`);
      return false;
    }

    if (attachment.offset) attachment.object.position.copy(attachment.offset);
    if (attachment.rotation) attachment.object.rotation.copy(attachment.rotation);
    if (attachment.scale) attachment.object.scale.copy(attachment.scale);

    bone.add(attachment.object);
    this.attachments.set(id, attachment);
    return true;
  }

  /** Remove a bone attachment */
  detach(id: string): void {
    const att = this.attachments.get(id);
    if (att) {
      att.object.parent?.remove(att.object);
      this.attachments.delete(id);
    }
  }

  /** Get all bones (for debugging or UI) */
  getBoneNames(): string[] {
    return this.skeleton?.bones.map((b) => b.name) || [];
  }

  // ─── Frame update ──────────────────────────────────────────────────────────

  update(dt: number): void {
    this.mixer.update(dt);

    // Procedural breathing spring (applies subtle Y scale oscillation)
    this.breathSpring.target = Math.sin(performance.now() * 0.002) * 0.005;
    const breathVal = this.breathSpring.update(dt);
    // Apply to model root if no additive breathing clip exists
    if (!this.additiveClips.has('breathing')) {
      this.model.scale.y = 1 + breathVal;
    }
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  /** Get skeleton helper for debugging */
  createSkeletonHelper(): THREE.SkeletonHelper | null {
    if (!this.skeleton) return null;
    return new THREE.SkeletonHelper(this.model);
  }

  /** Check if any action is playing */
  get isActionPlaying(): boolean {
    return this.currentAction !== null;
  }

  /** Get current action state */
  get activeAction(): ActionState | null {
    return this.currentAction;
  }

  get animationNames(): string[] {
    return Array.from(this.allClips.keys());
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.locomotionClips.clear();
    this.actionClips.clear();
    this.additiveClips.clear();
    this.allClips.clear();
    for (const [, att] of this.attachments) {
      att.object.parent?.remove(att.object);
    }
    this.attachments.clear();
  }
}
