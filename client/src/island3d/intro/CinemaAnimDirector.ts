/**
 * CinemaAnimDirector — Three.js AnimationMixer helper for production cinemas.
 *
 * Crossfade, clamp, timeScale (slow-mo roar), fuzzy clip names.
 * Clips are rematched onto the skeleton under `root` so Bip001 spaced vs underscore names bind.
 */
import * as THREE from 'three';
import { rematchClipToSkeleton } from './cinemaGrudge6';

export type ClipPlayOpts = {
  fade?: number;
  loop?: THREE.AnimationActionLoopStyles;
  timeScale?: number;
  clamp?: boolean;
  restart?: boolean;
};

export class CinemaAnimDirector {
  readonly mixer: THREE.AnimationMixer;
  readonly root: THREE.Object3D;
  private clips = new Map<string, THREE.AnimationClip>();
  private actions = new Map<string, THREE.AnimationAction>();
  private current: string | null = null;
  private timeScale = 1;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[], rematch = true) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) {
      const clip = rematch ? rematchClipToSkeleton(c.clone(), root) : c;
      this.clips.set(clip.name, clip);
      this.clips.set(clip.name.toLowerCase(), clip);
    }
  }

  findClip(...hints: string[]): THREE.AnimationClip | null {
    for (const h of hints) {
      const key = h.toLowerCase();
      for (const [name, clip] of this.clips) {
        if (name.toLowerCase().includes(key) || name.toLowerCase() === key) return clip;
      }
    }
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

    if (this.current && this.current !== name) {
      const prev = this.actions.get(this.current);
      if (prev) action.crossFadeFrom(prev, fade, false);
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

  /** Current clip local time (seconds into the action). */
  getActionTime(): number {
    if (!this.current) return 0;
    const a = this.actions.get(this.current);
    return a?.time ?? 0;
  }

  /** Duration of the currently playing clip (seconds). */
  getClipDuration(): number {
    if (!this.current) return 0;
    const a = this.actions.get(this.current);
    return a?.getClip()?.duration ?? 0;
  }

  getCurrentName(): string | null {
    return this.current;
  }

  /** True if current action is playing an attack-family clip. */
  isPlayingAttack(): boolean {
    if (!this.current) return false;
    const n = this.current.toLowerCase();
    return n.includes('attack') || n.includes('roar') || n.includes('bite');
  }

  /** Normalized 0..1 progress through current clip. */
  getActionProgress(): number {
    const d = this.getClipDuration();
    if (d <= 1e-4) return 0;
    return THREE.MathUtils.clamp(this.getActionTime() / d, 0, 1);
  }

  /** Seek into current action (stagger idles / cast phase without new play). */
  seekTime(t: number): void {
    if (!this.current) return;
    const a = this.actions.get(this.current);
    if (!a) return;
    const d = a.getClip().duration;
    a.time = d > 1e-4 ? ((t % d) + d) % d : 0;
  }

  /** Inject extra clips (e.g. CDN 2H magic attack pack) after construct. */
  addClips(clips: THREE.AnimationClip[], aliasPrefix?: string): void {
    for (const c of clips) {
      const clip = rematchClipToSkeleton(c.clone(), this.root);
      this.clips.set(clip.name, clip);
      this.clips.set(clip.name.toLowerCase(), clip);
      if (aliasPrefix) {
        this.clips.set(`${aliasPrefix}${clip.name}`, clip);
        this.clips.set(`${aliasPrefix}${clip.name.toLowerCase()}`, clip);
      }
    }
  }

  /** All known clip names (debug). */
  listClipNames(): string[] {
    return [...new Set([...this.clips.keys()])];
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.actions.clear();
  }
}

export type VirtualCam = {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
};

/** Multi-camera director — blend or hard-cut between virtual cinema cameras. */
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
  private blendSpeed = 1.15;
  private cut = false;
  /** Film impact: FOV kick + vertical pop (decays each frame) */
  private impactFov = 0;
  private impactY = 0;

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

  /** Hit impact — FOV punch + camera Y pop (beam / pinata / roar). */
  impact(fovKick = 5, yPop = 0.45): void {
    this.impactFov = Math.max(this.impactFov, fovKick);
    this.impactY = Math.max(this.impactY, yPop);
  }

  /** Slower dolly for emotional beats; faster for action. */
  setBlendSpeed(speed: number): void {
    this.blendSpeed = Math.max(0.2, speed);
  }

  update(dt: number): void {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt * this.blendSpeed);
    }
    // Decay impact like a film punch-in
    this.impactFov *= Math.exp(-dt * 4.5);
    this.impactY *= Math.exp(-dt * 5.5);
    if (this.impactFov < 0.05) this.impactFov = 0;
    if (this.impactY < 0.01) this.impactY = 0;
  }

  evaluate(handheld = 0): VirtualCam {
    const u = this.cut ? 1 : this.smooth(this.blend);
    const pos = new THREE.Vector3().lerpVectors(this.from.pos, this.to.pos, u);
    const look = new THREE.Vector3().lerpVectors(this.from.look, this.to.look, u);
    let fov = THREE.MathUtils.lerp(this.from.fov, this.to.fov, u);
    // Impact FOV opens then settles (classic action beat)
    fov += this.impactFov;
    pos.y += this.impactY;
    if (handheld > 0) {
      const t = performance.now() * 0.001;
      pos.x += Math.sin(t * 2.1) * handheld;
      pos.y += Math.cos(t * 1.7) * handheld * 0.65;
      pos.z += Math.sin(t * 1.3) * handheld * 0.4;
    }
    return { pos, look, fov };
  }

  private smooth(t: number): number {
    // smootherstep — more cinematic ease than smoothstep
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
}
