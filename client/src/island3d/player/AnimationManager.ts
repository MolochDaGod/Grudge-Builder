/**
 * AnimationManager — loads GLB animations and handles blending/transitions.
 *
 * Manages an AnimationMixer with fade-in/out transitions between states
 * (idle, walk, run, harvest, combat).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AnimState = 'idle' | 'walk' | 'run' | 'harvest' | 'attack' | 'death';

interface AnimClip {
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
}

export class AnimationManager {
  private mixer: THREE.AnimationMixer;
  private clips: Map<AnimState, AnimClip> = new Map();
  private currentState: AnimState = 'idle';
  private fadeDuration = 0.25;

  constructor(public model: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(model);
  }

  /** Load animation clips from GLB files */
  async loadAnimations(animPaths: Partial<Record<AnimState, string>>): Promise<void> {
    const loader = new GLTFLoader();

    const promises = Object.entries(animPaths).map(async ([state, path]) => {
      try {
        const gltf = await loader.loadAsync(path);
        if (gltf.animations.length > 0) {
          const clip = gltf.animations[0];
          const action = this.mixer.clipAction(clip);
          action.setEffectiveWeight(0);
          this.clips.set(state as AnimState, { clip, action });
        }
      } catch (err) {
        console.warn(`Failed to load animation ${state} from ${path}:`, err);
      }
    });

    await Promise.all(promises);

    // Start with idle if available
    this.play('idle');
  }

  /** Add a clip from an already-loaded GLTF scene's animations */
  addClipFromGLTF(state: AnimState, clip: THREE.AnimationClip): void {
    const action = this.mixer.clipAction(clip);
    action.setEffectiveWeight(0);
    this.clips.set(state, { clip, action });
  }

  /** Crossfade to a new animation state */
  play(state: AnimState): void {
    if (state === this.currentState) return;

    const newClip = this.clips.get(state);
    const oldClip = this.clips.get(this.currentState);

    if (newClip) {
      newClip.action.reset();
      newClip.action.setEffectiveWeight(1);
      newClip.action.play();

      if (oldClip) {
        oldClip.action.crossFadeTo(newClip.action, this.fadeDuration, true);
      }

      this.currentState = state;
    }
  }

  /** Update the mixer each frame */
  update(dt: number): void {
    this.mixer.update(dt);
  }

  get current(): AnimState {
    return this.currentState;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.clips.clear();
  }
}
