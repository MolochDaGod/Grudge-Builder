/**
 * AnimationMixerHub — fleet SSOT for Three.js AnimationMixer lifecycle.
 *
 * Best practices (three.js + annihilate + grudge6):
 *  - One mixer per animated root (never share a mixer across skeletons)
 *  - Share AnimationClips across instances; actions are per-mixer
 *  - Single hub.update(dt) from the frame loop (or per-controller when isolated)
 *  - Proper dispose: stopAllAction → uncacheRoot → drop refs
 *  - enabled=false skips update (frustum / distance cull)
 *  - Crossfade via fadeToAction (warps time for seamless transitions)
 *
 * Layers on top of modelLoader.AnimationController for registry + bookkeeping.
 */
import * as THREE from 'three';
import {
  AnimationController,
  fadeToAction,
  applyAnimationToMixer,
} from '@/lib/modelLoader';
import { optimizeAnimationClip } from '@/lib/three/WorldMath';

export type MixerHandleId = string;

export interface MixerHandle {
  id: MixerHandleId;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  controller: AnimationController;
  /** When false, hub skips mixer.update (culled / far). */
  enabled: boolean;
  /** Optional tag for debug / bulk ops (player, npc, creature, prop). */
  tag?: string;
  dispose: () => void;
}

export interface CreateMixerOpts {
  id?: string;
  tag?: string;
  /** Register clips immediately as stateName → clip */
  clips?: Record<string, THREE.AnimationClip>;
  /** Auto-play this state after register */
  autoPlay?: string;
  enabled?: boolean;
}

export interface FadeOpts {
  fadeDuration?: number;
  speed?: number;
  loop?: boolean;
  onFinish?: () => void;
}

let _seq = 0;
function nextId(prefix = 'mixer'): string {
  _seq += 1;
  return `${prefix}-${_seq}-${(Math.random() * 1e6) | 0}`;
}

/**
 * Global registry + update fan-out for every live AnimationMixer in a scene.
 * Prefer one hub per game world (Island3DEngine, lobby, boss map).
 */
export class AnimationMixerHub {
  private handles = new Map<MixerHandleId, MixerHandle>();
  /** Global time scale (slow-mo / pause). Multiplies per-mixer timeScale. */
  timeScale = 1;

  get size(): number {
    return this.handles.size;
  }

  list(tag?: string): MixerHandle[] {
    const all = Array.from(this.handles.values());
    return tag ? all.filter((h) => h.tag === tag) : all;
  }

  get(id: MixerHandleId): MixerHandle | undefined {
    return this.handles.get(id);
  }

  /**
   * Create mixer + AnimationController, register on hub.
   * Clips are optimized once; actions are mixer-local.
   */
  create(root: THREE.Object3D, opts: CreateMixerOpts = {}): MixerHandle {
    const id = opts.id ?? nextId(opts.tag ?? 'mixer');
    if (this.handles.has(id)) {
      this.dispose(id);
    }

    const mixer = new THREE.AnimationMixer(root);
    const controller = new AnimationController(mixer, root);

    if (opts.clips) {
      for (const [name, clip] of Object.entries(opts.clips)) {
        const c = optimizeAnimationClip(clip.clone());
        controller.registerClip(name, c);
      }
    }

    if (opts.autoPlay && controller.hasClip(opts.autoPlay)) {
      controller.play(opts.autoPlay, { fadeDuration: 0 });
    }

    const handle: MixerHandle = {
      id,
      root,
      mixer,
      controller,
      enabled: opts.enabled ?? true,
      tag: opts.tag,
      dispose: () => this.dispose(id),
    };

    this.handles.set(id, handle);
    return handle;
  }

  /**
   * Adopt an existing AnimationController (e.g. from AnimationManager).
   */
  adopt(
    controller: AnimationController,
    opts: { id?: string; tag?: string; enabled?: boolean } = {},
  ): MixerHandle {
    const id = opts.id ?? nextId(opts.tag ?? 'adopt');
    if (this.handles.has(id)) this.dispose(id);

    const handle: MixerHandle = {
      id,
      root: controller.root,
      mixer: controller.mixer,
      controller,
      enabled: opts.enabled ?? controller.enabled,
      tag: opts.tag,
      dispose: () => this.dispose(id),
    };
    this.handles.set(id, handle);
    return handle;
  }

  /** Frame tick — call once from the main loop with clamped dt. */
  update(dt: number): void {
    if (dt <= 0) return;
    const scaled = dt * this.timeScale;
    // Cap pathological spikes (tab-return) so blend weights don't explode
    const step = Math.min(scaled, 0.1);
    for (const h of this.handles.values()) {
      if (!h.enabled) continue;
      h.controller.enabled = true;
      h.controller.update(step);
    }
  }

  setEnabled(id: MixerHandleId, enabled: boolean): void {
    const h = this.handles.get(id);
    if (!h) return;
    h.enabled = enabled;
    h.controller.enabled = enabled;
  }

  setTagEnabled(tag: string, enabled: boolean): void {
    for (const h of this.handles.values()) {
      if (h.tag === tag) {
        h.enabled = enabled;
        h.controller.enabled = enabled;
      }
    }
  }

  play(id: MixerHandleId, state: string, opts?: FadeOpts): boolean {
    const h = this.handles.get(id);
    if (!h) return false;
    return h.controller.play(state, opts);
  }

  /**
   * Low-level crossfade without state map (prop / one-off clips).
   */
  fade(
    id: MixerHandleId,
    next: THREE.AnimationAction,
    opts?: { duration?: number; loop?: boolean; speed?: number },
  ): THREE.AnimationAction | null {
    const h = this.handles.get(id);
    if (!h) return null;
    const cur = h.controller.currentAction;
    const action = fadeToAction(
      cur,
      next,
      opts?.duration ?? 0.15,
      opts?.loop ?? true,
      opts?.speed ?? 1,
    );
    h.controller.currentAction = action;
    h.controller.currentState = next.getClip().name || h.controller.currentState;
    return action;
  }

  /**
   * Register a clip on a handle (shared clip clone optimized once).
   */
  registerClip(id: MixerHandleId, name: string, clip: THREE.AnimationClip): boolean {
    const h = this.handles.get(id);
    if (!h) return false;
    h.controller.registerClip(name, optimizeAnimationClip(clip.clone()));
    return true;
  }

  /**
   * Wire embedded GLTF animations as named actions (idle/walk/… or clip.name).
   */
  registerGltfClips(
    id: MixerHandleId,
    clips: THREE.AnimationClip[],
    nameMap?: Record<string, string>,
  ): string[] {
    const h = this.handles.get(id);
    if (!h) return [];
    const registered: string[] = [];
    for (const clip of clips) {
      const name = nameMap?.[clip.name] ?? (clip.name || `clip_${registered.length}`);
      const c = optimizeAnimationClip(clip.clone());
      c.name = name;
      h.controller.registerClip(name, c);
      registered.push(name);
    }
    return registered;
  }

  dispose(id: MixerHandleId): void {
    const h = this.handles.get(id);
    if (!h) return;
    try {
      h.controller.dispose();
      // Uncache root so skinned pose memory can GC
      h.mixer.uncacheRoot(h.root);
    } catch {
      /* already torn down */
    }
    this.handles.delete(id);
  }

  disposeTag(tag: string): void {
    for (const h of [...this.handles.values()]) {
      if (h.tag === tag) this.dispose(h.id);
    }
  }

  disposeAll(): void {
    for (const id of [...this.handles.keys()]) {
      this.dispose(id);
    }
  }

  /** Debug: counts by tag */
  stats(): { total: number; enabled: number; byTag: Record<string, number> } {
    const byTag: Record<string, number> = {};
    let enabled = 0;
    for (const h of this.handles.values()) {
      if (h.enabled) enabled += 1;
      const t = h.tag ?? 'untagged';
      byTag[t] = (byTag[t] ?? 0) + 1;
    }
    return { total: this.handles.size, enabled, byTag };
  }
}

/** Optional process-wide hub for simple scenes (prefer explicit instance). */
let _defaultHub: AnimationMixerHub | null = null;

export function getDefaultMixerHub(): AnimationMixerHub {
  if (!_defaultHub) _defaultHub = new AnimationMixerHub();
  return _defaultHub;
}

export function resetDefaultMixerHub(): void {
  _defaultHub?.disposeAll();
  _defaultHub = null;
}

/**
 * Create a one-off mixer for ambient props without registering on a hub.
 * Caller must update + dispose.
 */
export function createStandaloneMixer(
  root: THREE.Object3D,
  clips?: THREE.AnimationClip[],
  autoPlayFirst = true,
): { mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction>; dispose: () => void } {
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<string, THREE.AnimationAction>();
  if (clips?.length) {
    for (const clip of clips) {
      const c = optimizeAnimationClip(clip.clone());
      const action = applyAnimationToMixer(mixer, root, c, c.name || 'clip');
      actions.set(c.name || 'clip', action);
    }
    if (autoPlayFirst) {
      const first = actions.values().next().value as THREE.AnimationAction | undefined;
      first?.reset().play();
    }
  }
  return {
    mixer,
    actions,
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      actions.clear();
    },
  };
}
