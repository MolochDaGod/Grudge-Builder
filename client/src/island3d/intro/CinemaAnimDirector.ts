/**
 * CinemaAnimDirector — Three.js AnimationMixer helper for production cinemas.
 *
 * Crossfade, clamp, timeScale (slow-mo roar), fuzzy clip names.
 */
import * as THREE from 'three';

export type ClipPlayOpts = {
  fade?: number;
  loop?: THREE.AnimationActionLoopStyles;
  timeScale?: number;
  clamp?: boolean;
  restart?: boolean;
};

/**
 * Strip root/hip translation tracks so grounded cinema kits keep feet on deck.
 * Rotation stays; only .position on Hips / Bip001 / Pelvis / Root.
 */
export function stripGroundedRootPositionTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
  const kept = clip.tracks.filter((t) => {
    const full = t.name || '';
    const bone = full.split('.')[0].toLowerCase().replace(/[:\s]/g, '');
    const isRootBone =
      bone === 'hips' ||
      bone === 'hip' ||
      bone === 'pelvis' ||
      bone === 'root' ||
      bone === 'bip001' ||
      bone === 'bip001hips' ||
      bone === 'bip001pelvis' ||
      bone === 'mixamorighips' ||
      bone === 'armature' ||
      bone.endsWith('hips') ||
      bone.endsWith('pelvis');
    // Strip root POSITION (grounding) and root SCALE (stretch) — keep limb motion
    if (isRootBone && (/\.position/i.test(full) || /\.scale/i.test(full))) return false;
    // Strip ANY scale tracks on the whole clip — non-uniform scale tracks stretch mesh
    if (/\.scale/i.test(full)) return false;
    return true;
  });
  if (kept.length === clip.tracks.length) return clip;
  const c = clip.clone();
  c.tracks = kept;
  return c;
}

export class CinemaAnimDirector {
  readonly mixer: THREE.AnimationMixer;
  private clips = new Map<string, THREE.AnimationClip>();
  private actions = new Map<string, THREE.AnimationAction>();
  private current: string | null = null;
  private timeScale = 1;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const raw of clips) {
      const c = stripGroundedRootPositionTracks(raw);
      this.clips.set(c.name, c);
      this.clips.set(c.name.toLowerCase(), c);
    }
  }

  findClip(...hints: string[]): THREE.AnimationClip | null {
    for (const h of hints) {
      const key = h.toLowerCase();
      // Prefer exact name match first
      for (const [name, clip] of this.clips) {
        if (name.toLowerCase() === key) return clip;
      }
      for (const [name, clip] of this.clips) {
        if (name.toLowerCase().includes(key)) return clip;
      }
    }
    // NEVER fall through to "first clip" — that spun mages when idle was missing
    return null;
  }

  hasClips(): boolean {
    return this.clips.size > 0;
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

  /** Ensure an action exists for fuzzy clip hints (does not change weights). */
  getOrCreateAction(hint: string | string[]): THREE.AnimationAction | null {
    const hints = Array.isArray(hint) ? hint : [hint];
    const clip = this.findClip(...hints);
    if (!clip) return null;
    let action = this.actions.get(clip.name);
    if (!action) {
      action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    }
    return action;
  }

  /** Soft dual-layer weights (idle + attack) without stopping the mixer. */
  setActionWeight(hint: string | string[], weight: number): void {
    const a = this.getOrCreateAction(hint);
    if (a) a.setEffectiveWeight(THREE.MathUtils.clamp(weight, 0, 1));
  }

  setActionTime(hint: string | string[], timeSec: number): void {
    const a = this.getOrCreateAction(hint);
    if (!a) return;
    const d = a.getClip().duration;
    a.time = THREE.MathUtils.clamp(timeSec, 0, Math.max(0, d - 1e-3));
  }

  setActionTimeScale(hint: string | string[], scale: number): void {
    const a = this.getOrCreateAction(hint);
    if (a) a.setEffectiveTimeScale(scale);
  }

  /** Mark which clip name is “primary” for debug / getActionTime. */
  setCurrentName(name: string | null): void {
    this.current = name;
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

  /** Inject extra clips (e.g. CDN 2H magic attack pack) after construct. */
  addClips(clips: THREE.AnimationClip[], aliasPrefix?: string): void {
    for (const raw of clips) {
      const c = stripGroundedRootPositionTracks(raw);
      this.clips.set(c.name, c);
      this.clips.set(c.name.toLowerCase(), c);
      if (aliasPrefix) {
        this.clips.set(`${aliasPrefix}${c.name}`, c);
        this.clips.set(`${aliasPrefix}${c.name.toLowerCase()}`, c);
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
  /** Slow dolly default — movie ease, not action-game whip */
  private blendSpeed = 0.45;
  private cut = false;
  /** Film impact: tiny FOV open + vertical pop (decays fast) */
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

  /**
   * Soft follow: update destination without restarting blend.
   * Eye/look should change slowly (ship ride), never orbit thrash.
   */
  followTo(
    pos: [number, number, number],
    look: [number, number, number],
    fov?: number,
  ): void {
    // Ease destination so per-frame subject motion doesn't whip the rig
    this.to.pos.lerp(new THREE.Vector3(...pos), 0.12);
    this.to.look.lerp(new THREE.Vector3(...look), 0.1);
    if (fov != null) this.to.fov = THREE.MathUtils.lerp(this.to.fov, fov, 0.08);
    if (this.blend > 0.9) this.blend = 1;
    this.cut = false;
  }

  /**
   * Hit impact — very mild FOV open + soft Y pop. Rare, not every beam frame.
   */
  impact(fovKick = 1.2, yPop = 0.08): void {
    this.impactFov = Math.max(this.impactFov, Math.min(2.2, Math.abs(fovKick)));
    this.impactY = Math.max(this.impactY, Math.min(0.18, Math.abs(yPop)));
  }

  /** Slower dolly for film masters (default ~0.45). */
  setBlendSpeed(speed: number): void {
    this.blendSpeed = Math.max(0.12, Math.min(1.2, speed));
  }

  update(dt: number): void {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt * this.blendSpeed);
    }
    // Fast settle — impacts should not linger as "pulse zoom"
    this.impactFov *= Math.exp(-dt * 7);
    this.impactY *= Math.exp(-dt * 8);
    if (this.impactFov < 0.03) this.impactFov = 0;
    if (this.impactY < 0.005) this.impactY = 0;
  }

  /**
   * Locked film evaluate — NO continuous sin/cos orbit/spin.
   * Optional micro breath only when handheld > 0 (rare hits).
   */
  evaluate(handheld = 0, _time = 0): VirtualCam {
    const u = this.cut ? 1 : this.smooth(this.blend);
    const pos = new THREE.Vector3().lerpVectors(this.from.pos, this.to.pos, u);
    const look = new THREE.Vector3().lerpVectors(this.from.look, this.to.look, u);
    let fov = THREE.MathUtils.lerp(this.from.fov, this.to.fov, u);
    fov = THREE.MathUtils.clamp(fov + this.impactFov, 40, 52);
    pos.y += this.impactY;
    // Absolute ban on constant camera spin. Tiny breath only on real handheld kicks.
    if (handheld > 0.02) {
      const h = Math.min(0.06, handheld);
      const t = performance.now() * 0.001;
      pos.x += Math.sin(t * 1.1) * h * 0.12;
      pos.y += Math.cos(t * 0.9) * h * 0.08;
    }
    return { pos, look, fov };
  }

  private smooth(t: number): number {
    // smootherstep — more cinematic ease than smoothstep
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
}
