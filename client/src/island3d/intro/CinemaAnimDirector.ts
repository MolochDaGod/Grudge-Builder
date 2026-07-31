/**
 * CinemaAnimDirector — Three.js AnimationMixer helper for production cinemas.
 *
 * Best practices:
 *  - Crossfade between actions (0.15–0.4s) instead of hard cuts
 *  - ClampWhenFinished for one-shots; LoopRepeat for swim/idle
 *  - timeScale for slow-mo roar / long beam holds
 *  - weight only one primary action when possible (avoid muddy blends)
 */
import * as THREE from 'three';

export type ClipPlayOpts = {
  fade?: number;
  loop?: THREE.AnimationActionLoopStyles;
  timeScale?: number;
  clamp?: boolean;
  /** Restart from t=0 even if same clip */
  restart?: boolean;
};

export class CinemaAnimDirector {
  readonly mixer: THREE.AnimationMixer;
  private clips = new Map<string, THREE.AnimationClip>();
  private actions = new Map<string, THREE.AnimationAction>();
  private current: string | null = null;
  private timeScale = 1;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) {
      this.clips.set(c.name, c);
      // also index lowercase / aliases
      this.clips.set(c.name.toLowerCase(), c);
    }
  }

  /** Find clip by fuzzy name (idle, attack, roar, cast, …) */
  findClip(...hints: string[]): THREE.AnimationClip | null {
    for (const h of hints) {
      const key = h.toLowerCase();
      for (const [name, clip] of this.clips) {
        if (name.toLowerCase().includes(key) || name.toLowerCase() === key) return clip;
      }
    }
    // first clip as last resort
    for (const c of this.clips.values()) return c;
    return null;
  }

  play(hint: string | string[], opts: ClipPlayOpts = {}): THREE.AnimationAction | null {
    const hints = Array.isArray(hint) ? hint : [hint];
    const clip = this.findClip(...hints);
    if (!clip) return null;

    const fade = opts.fade ?? 0.25;
    const name = clip.name;
    if (this.current === name && !opts.restart) {
      const cur = this.actions.get(name);
      if (cur) {
        cur.setEffectiveTimeScale(opts.timeScale ?? this.timeScale);
        return cur;
      }
    }

    let action = this.actions.get(name);
    if (!action) {
      action = this.mixer.clipAction(clip);
      this.actions.set(name, action);
    }

    const loop = opts.loop ?? THREE.LoopRepeat;
    action.reset();
    action.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
    action.clampWhenFinished = opts.clamp ?? loop === THREE.LoopOnce;
    action.enabled = true;
    action.setEffectiveTimeScale(opts.timeScale ?? this.timeScale);
    action.setEffectiveWeight(1);

    // Crossfade from previous
    if (this.current && this.current !== name) {
      const prev = this.actions.get(this.current);
      if (prev) {
        action.crossFadeFrom(prev, fade, false);
      }
    }
    action.play();
    this.current = name;
    return action;
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale;
    if (this.current) {
      const a = this.actions.get(this.current);
      if (a) a.setEffectiveTimeScale(scale);
    }
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.actions.clear();
  }
}

/**
 * Multi-camera director — blends or hard-cuts between virtual cinema cameras.
 * Sole lens owner during cinema (WebGL Insights).
 */
export type VirtualCam = {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
};

export class MultiCameraDirector {
  private from: VirtualCam = {
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    fov: 42,
  };
  private to: VirtualCam = {
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    fov: 42,
  };
  private blend = 1;
  private blendSpeed = 1.2; // ~0.8s full blend
  private cut = false;

  setTarget(
    pos: [number, number, number],
    look: [number, number, number],
    fov: number,
    mode: 'blend' | 'cut' = 'blend',
  ): void {
    if (mode === 'cut') {
      this.from.pos.set(...pos);
      this.from.look.set(...look);
      this.from.fov = fov;
      this.to.pos.copy(this.from.pos);
      this.to.look.copy(this.from.look);
      this.to.fov = fov;
      this.blend = 1;
      this.cut = true;
      return;
    }
    // start blend from current evaluated pose
    const cur = this.evaluate(0);
    this.from.pos.copy(cur.pos);
    this.from.look.copy(cur.look);
    this.from.fov = cur.fov;
    this.to.pos.set(...pos);
    this.to.look.set(...look);
    this.to.fov = fov;
    this.blend = 0;
    this.cut = false;
  }

  update(dt: number): void {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt * this.blendSpeed);
    }
  }

  evaluate(handheld = 0): VirtualCam {
    const u = this.cut ? 1 : this.smooth(this.blend);
    const pos = new THREE.Vector3().lerpVectors(this.from.pos, this.to.pos, u);
    const look = new THREE.Vector3().lerpVectors(this.from.look, this.to.look, u);
    const fov = THREE.MathUtils.lerp(this.from.fov, this.to.fov, u);
    if (handheld > 0) {
      const t = performance.now() * 0.001;
      pos.x += Math.sin(t * 2.1) * handheld;
      pos.y += Math.cos(t * 1.7) * handheld * 0.65;
    }
    return { pos, look, fov };
  }

  private smooth(t: number): number {
    return t * t * (3 - 2 * t);
  }
}
