/**
 * AnimationManager — thin wrapper over lib/modelLoader's AnimationController.
 *
 * Delegates to the shared AnimationController which handles Mixamo bone-name
 * remapping, clip caching, and fadeToAction crossfading. This avoids duplicate
 * animation logic between island3d and the rest of the app.
 */
import * as THREE from 'three';
import {
  AnimationController,
  loadAnimationClip,
  loadCharacterModel,
} from '@/lib/modelLoader';

export type AnimState =
  | 'idle' | 'idle_alt'
  | 'walk' | 'run' | 'run_stop'
  | 'harvest' | 'attack' | 'death'
  // Parkour / falling
  | 'falling' | 'fall_roll' | 'hard_landing' | 'jump'
  // Climbing
  | 'climb_top'
  // Cover system
  | 'enter_cover' | 'exit_cover' | 'cover_sneak_l' | 'cover_sneak_r'
  // Stealth
  | 'crouch_sneak_l' | 'crouch_sneak_r'
  // Swimming (placeholder until swim anims arrive)
  | 'swim_surface' | 'swim_underwater';

export class AnimationManager {
  private controller: AnimationController;

  constructor(public model: THREE.Object3D) {
    const mixer = new THREE.AnimationMixer(model);
    this.controller = new AnimationController(mixer, model);
  }

  /** Load animation clips from GLB files (with Mixamo prefix remapping) */
  async loadAnimations(animPaths: Partial<Record<AnimState, string>>): Promise<void> {
    const entries = Object.entries(animPaths) as [AnimState, string][];
    await Promise.all(
      entries.map(async ([state, path]) => {
        const clip = await loadAnimationClip(path);
        if (clip) {
          this.controller.registerClip(state, clip);
        }
      }),
    );
    // Start with idle if available
    this.play('idle');
  }

  /** Add a clip from an already-loaded GLTF scene's animations */
  addClipFromGLTF(state: AnimState, clip: THREE.AnimationClip): void {
    this.controller.registerClip(state, clip);
  }

  /** Crossfade to a new animation state */
  play(state: AnimState, opts?: { speed?: number; loop?: boolean }): void {
    this.controller.play(state, {
      fadeDuration: 0.25,
      speed: opts?.speed,
      loop: opts?.loop,
    });
  }

  /** Update the mixer each frame */
  update(dt: number): void {
    this.controller.update(dt);
  }

  get current(): string {
    return this.controller.currentState;
  }

  dispose(): void {
    this.controller.dispose();
  }
}
