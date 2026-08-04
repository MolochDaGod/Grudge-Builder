/**
 * LeviathanAnimController — skeleton-aware leviathan performance driver.
 *
 * GLB skeleton (Object_4 · 32 bones, Japanese names):
 *   root_00 → dou_1_01 (core)
 *     body S-chain:  dou_13_03 → 14 → 15 → 16 → 17
 *     side chain:    dou_9_07 → 10 → 11 → 12
 *     tail chain:    dou_5_021 → 6 → 7 → 8 + fin bones
 *     chest:         dou_2_027 → 3 + munabire fins
 *     head:          atama_011 → kuchi_012 (mouth) + hige whiskers
 *
 * Clips in asset: idle · attack · attack and roar
 *
 * ── Joint SSOT (read from leviathan.glb idle, not invented) ──────────────
 * Original idle is already a multi-joint snake — same idea as linked segments
 * (cf. three.js physics_rapier_joints: chain of bodies with free rotation +
 * damping). Measured local translation hubs + rotation children:
 *
 *   HUB (local T + R)          idle Tamp (x,y,z)     idle R peak
 *   dou_1_01  core             (0, 4.3, 6.7)         ~9°
 *   dou_13_03 body anchor      (9.1, 1.9, 3.9)       ~43°
 *   dou_9_07  mid anchor       (7.7, 1.1, 16.2)      ~36°
 *   dou_5_021 tail anchor      (3.5, 4.3, 1.0)       ~52°
 *
 *   CHILDREN after each hub are rotation-only (linked segments).
 *   Stick retarget failed because it dropped hub T and collapsed joints.
 *
 * Modes:
 *   swim   — idle clip (base joint motion) + hub-T / child-R wave boost
 *   idle   — idle loop, light residual joints
 *   charge — blend idle + attack/roar; ping-pong 1.00↔1.45 + body joints
 *   attack / roar — full clip + light underlay
 */
import * as THREE from 'three';
import type { CinemaAnimDirector } from './CinemaAnimDirector';

export type LeviAnimMode = 'off' | 'swim' | 'idle' | 'charge' | 'attack' | 'roar';

/** User SSOT: charged maw window on attack/roar clip (seconds). */
export const LEVI_CHARGE_T0 = 1.0;
export const LEVI_CHARGE_T1 = 1.45;

/**
 * Idle-measured hub translation amplitudes (model local units from leviathan.glb).
 * Procedural layer uses a fraction of these so we do not invent new DOFs.
 */
const IDLE_HUB_T = {
  dou_1: new THREE.Vector3(0, 4.276, 6.66),
  dou_13: new THREE.Vector3(9.108, 1.909, 3.88),
  dou_9: new THREE.Vector3(7.673, 1.072, 16.236),
  dou_5: new THREE.Vector3(3.45, 4.309, 0.961),
} as const;

/** Idle-measured hub rotation peaks (radians). */
const IDLE_HUB_R = {
  dou_1: 0.154, // ~8.8°
  dou_13: 0.75, // ~43°
  dou_9: 0.623, // ~36°
  dou_5: 0.913, // ~52°
} as const;

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

function findBone(root: THREE.Object3D, re: RegExp): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (hit) return;
    if (re.test(o.name || '')) hit = o;
  });
  return hit;
}

function chainFrom(start: THREE.Object3D | null, max = 8): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  let cur: THREE.Object3D | null = start;
  while (cur && out.length < max) {
    out.push(cur);
    let next: THREE.Object3D | null = null;
    for (const ch of cur.children) {
      if (/dou_|asihire|munabire|atama|kuchi|hige/i.test(ch.name)) {
        next = ch;
        break;
      }
    }
    cur = next;
  }
  return out;
}

/** One joint hub: moves in local T (like a chain link anchor) + rotates; children R-only. */
type JointHub = {
  hub: THREE.Object3D;
  /** Children after hub (rotation-only links) */
  links: THREE.Object3D[];
  tAmp: THREE.Vector3;
  rAmp: number;
  /** Phase lag along body (radians of wave) */
  lag: number;
};

export class LeviathanAnimController {
  readonly mouthBone: THREE.Object3D | null;
  readonly headBone: THREE.Object3D | null;

  private mode: LeviAnimMode = 'idle';
  private elapsed = 0;
  private chargeT = LEVI_CHARGE_T0;
  private chargeDir = 1;
  /** How fast we scrub 1.0→1.45 (seconds of wall time for one half-cycle). */
  private chargeHalfPeriod = 0.55;
  private shakeAmp = 0;
  private undulateW = 0;
  private modeBlend = 1;

  private bodyChain: THREE.Object3D[] = [];
  private sideChain: THREE.Object3D[] = [];
  private tailChain: THREE.Object3D[] = [];
  private finBones: THREE.Object3D[] = [];

  /** Joint hubs measured from original idle (core / body / mid / tail). */
  private hubs: JointHub[] = [];

  /** Sladania swim first, then stock idle */
  private idleHints = ['swim_idle', 'swim', 'idle'];
  private swimHints = ['swim', 'swim_idle', 'idle'];
  private attackHints = ['attack', 'dive', 'combat'];
  private roarHints = ['attack and roar', 'roar', 'emerge', 'attack'];

  constructor(
    private readonly root: THREE.Object3D,
    private readonly director: CinemaAnimDirector,
  ) {
    this.mouthBone =
      findBone(root, /kuchi/i) ||
      findBone(root, /mouth|jaw|maw/i) ||
      findBone(root, /atama/i) ||
      findBone(root, /head/i);
    this.headBone =
      findBone(root, /atama/i) || findBone(root, /head/i) || this.mouthBone;

    const core = findBone(root, /dou_1_01/i) || findBone(root, /dou_1/i);
    const bodyStart = findBone(root, /dou_13_03/i) || findBone(root, /dou_13/i);
    const sideStart = findBone(root, /dou_9_07/i) || findBone(root, /dou_9/i);
    const tailStart = findBone(root, /dou_5_021/i) || findBone(root, /dou_5/i);

    this.bodyChain = chainFrom(bodyStart, 6);
    this.sideChain = chainFrom(sideStart, 5);
    this.tailChain = chainFrom(tailStart, 5);
    root.traverse((o) => {
      if (/asihire|munabire/i.test(o.name || '')) this.finBones.push(o);
    });

    if (!this.bodyChain.length && core) {
      this.bodyChain = chainFrom(core, 6).slice(1);
    }

    // Build joint hubs from original idle structure (T hubs + R children)
    if (core) {
      this.hubs.push({
        hub: core,
        links: [],
        tAmp: IDLE_HUB_T.dou_1.clone(),
        rAmp: IDLE_HUB_R.dou_1,
        lag: 0,
      });
    }
    if (this.bodyChain[0]) {
      this.hubs.push({
        hub: this.bodyChain[0],
        links: this.bodyChain.slice(1),
        tAmp: IDLE_HUB_T.dou_13.clone(),
        rAmp: IDLE_HUB_R.dou_13,
        lag: 0.55,
      });
    }
    if (this.sideChain[0]) {
      this.hubs.push({
        hub: this.sideChain[0],
        links: this.sideChain.slice(1),
        tAmp: IDLE_HUB_T.dou_9.clone(),
        rAmp: IDLE_HUB_R.dou_9,
        lag: 1.05,
      });
    }
    if (this.tailChain[0]) {
      this.hubs.push({
        hub: this.tailChain[0],
        links: this.tailChain.slice(1),
        tAmp: IDLE_HUB_T.dou_5.clone(),
        rAmp: IDLE_HUB_R.dou_5,
        lag: 1.65,
      });
    }

    console.info(
      `[cinema] levi skeleton · mouth=${this.mouthBone?.name ?? '—'} head=${this.headBone?.name ?? '—'} ` +
        `body=${this.bodyChain.length} side=${this.sideChain.length} tail=${this.tailChain.length} fins=${this.finBones.length} ` +
        `hubs=${this.hubs.map((h) => h.hub.name).join(',') || '—'} (idle joint SSOT: hub T + child R)`,
    );
  }

  getMode(): LeviAnimMode {
    return this.mode;
  }

  /** Clip-local time used for charge beam (1.0–1.45 ping-pong). */
  getChargeTime(): number {
    return this.chargeT;
  }

  isChargeWindow(): boolean {
    return this.mode === 'charge';
  }

  /**
   * Resolve performance mode from beat anim + dragon phase + stage key.
   */
  resolveMode(opts: {
    anim?: string;
    dragonPhase?: string | null;
    at?: string;
    underwater?: number;
    visible?: boolean;
  }): LeviAnimMode {
    if (opts.visible === false) return 'off';
    const phase = opts.dragonPhase ?? 'off';
    if (phase === 'charge' || phase === 'snap' || phase === 'blast') return 'charge';
    if (phase === 'aftermath') return 'attack';

    const anim = (opts.anim || 'idle').toLowerCase();
    const at = (opts.at || '').toLowerCase();
    // Swim ONLY a moment: deep / beyond rocks / explicit swim — then idle on rise/surface/fight
    if (anim.includes('swim') || at.includes('swim') || at.includes('hidden')) {
      return 'swim';
    }
    // Early approach still deep → short swim; once rising/surfaced → idle
    if (at.includes('approach') && (opts.underwater ?? 0) > 0.55) return 'swim';
    if (anim.includes('roar')) return 'roar';
    if (anim.includes('attack') || anim.includes('dive')) return 'attack';
    // rise / surface / cast / beam / etc. → idle (Sladania swim_idle if present)
    return 'idle';
  }

  setMode(mode: LeviAnimMode, opts: { timeScale?: number; restart?: boolean } = {}): void {
    if (mode === this.mode && !opts.restart) {
      if (mode === 'idle' || mode === 'swim') {
        this.director.setActionTimeScale(
          mode === 'swim' ? this.swimHints : this.idleHints,
          opts.timeScale ?? 0.5,
        );
      }
      return;
    }
    this.mode = mode;
    this.modeBlend = 0;

    this.director.setActionWeight(this.idleHints, 0);
    this.director.setActionWeight(this.attackHints, 0);
    this.director.setActionWeight(this.roarHints, 0);

    if (mode === 'off') {
      this.director.setCurrentName(null);
      this.undulateW = 0;
      this.shakeAmp = 0;
      return;
    }

    if (mode === 'swim') {
      // Sladania.glb swim / swim_idle (S-wave) — user SSOT; 0.5× wall time
      const swim =
        this.director.getOrCreateAction(this.swimHints) ||
        this.director.getOrCreateAction(this.idleHints);
      if (swim) {
        swim.enabled = true;
        swim.setLoop(THREE.LoopRepeat, Infinity);
        swim.setEffectiveWeight(1);
        swim.setEffectiveTimeScale(opts.timeScale ?? 0.5);
        if (opts.restart !== false) swim.reset();
        swim.play();
      }
      this.director.setCurrentName(swim?.getClip().name ?? null);
      this.undulateW = 0.35; // clip already has full S — light hub boost only
      this.shakeAmp = 0;
      console.info('[cinema] levi SWIM clip', swim?.getClip().name ?? '(missing)');
      return;
    }

    if (mode === 'idle') {
      // Prefer swim_idle for surface hold when available
      const idle =
        this.director.getOrCreateAction(['swim_idle', 'idle', 'swim']) ||
        this.director.getOrCreateAction(this.idleHints);
      if (idle) {
        idle.enabled = true;
        idle.setLoop(THREE.LoopRepeat, Infinity);
        idle.setEffectiveWeight(1);
        idle.setEffectiveTimeScale(opts.timeScale ?? 0.5);
        if (opts.restart) idle.reset();
        idle.play();
      }
      this.director.setCurrentName(idle?.getClip().name ?? null);
      this.undulateW = 0.18;
      this.shakeAmp = 0;
      return;
    }

    if (mode === 'charge') {
      // Keep idle joints alive under charge so body is not a frozen stick
      const idle = this.director.getOrCreateAction(this.idleHints);
      const roar =
        this.director.getOrCreateAction(this.roarHints) ||
        this.director.getOrCreateAction(this.attackHints);
      if (idle) {
        idle.enabled = true;
        idle.setLoop(THREE.LoopRepeat, Infinity);
        idle.setEffectiveWeight(0.48);
        idle.setEffectiveTimeScale(opts.timeScale ?? 0.5);
        idle.play();
      }
      if (roar) {
        roar.enabled = true;
        roar.setLoop(THREE.LoopRepeat, Infinity);
        roar.setEffectiveWeight(0.72);
        // Charge holds clip scrub via chargeT (1.0↔1.45); base scale 0
        roar.setEffectiveTimeScale(0);
        roar.play();
        this.chargeT = LEVI_CHARGE_T0;
        this.chargeDir = 1;
        const dur = roar.getClip().duration;
        const t1 = Math.min(LEVI_CHARGE_T1, Math.max(LEVI_CHARGE_T0 + 0.05, dur - 0.02));
        (this as { _t1?: number })._t1 = t1;
        roar.time = this.chargeT;
      }
      this.director.setCurrentName(roar?.getClip().name ?? null);
      this.undulateW = 0.42;
      this.shakeAmp = 0.55;
      console.info(
        `[cinema] levi CHARGE ping-pong ${LEVI_CHARGE_T0}↔${Math.min(LEVI_CHARGE_T1, roar?.getClip().duration ?? LEVI_CHARGE_T1)}s + idle joints`,
      );
      return;
    }

    if (mode === 'attack' || mode === 'roar') {
      const hints = mode === 'roar' ? this.roarHints : this.attackHints;
      const act = this.director.getOrCreateAction(hints);
      if (act) {
        act.enabled = true;
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
        act.setEffectiveWeight(1);
        act.setEffectiveTimeScale(opts.timeScale ?? 0.5);
        if (opts.restart !== false) act.reset();
        act.play();
        this.director.setCurrentName(act.getClip().name);
      }
      const idle = this.director.getOrCreateAction(this.idleHints);
      if (idle) {
        idle.enabled = true;
        idle.setLoop(THREE.LoopRepeat, Infinity);
        idle.setEffectiveWeight(0.14);
        idle.setEffectiveTimeScale(0.5);
        idle.play();
      }
      this.undulateW = 0.12;
      this.shakeAmp = mode === 'roar' ? 0.25 : 0.12;
      return;
    }
  }

  /**
   * Call AFTER director.mixer.update(dt).
   * Scrubs charge window + original-style hub-T / child-R joint wave.
   */
  update(dt: number): void {
    this.elapsed += dt;
    this.modeBlend = Math.min(1, this.modeBlend + dt * 2.2);

    if (this.mode === 'charge') {
      const t0 = LEVI_CHARGE_T0;
      const t1 =
        (this as { _t1?: number })._t1 ??
        Math.min(
          LEVI_CHARGE_T1,
          Math.max(t0 + 0.05, this.director.getClipDuration() - 0.02 || LEVI_CHARGE_T1),
        );
      const span = Math.max(0.05, t1 - t0);
      const rate = span / this.chargeHalfPeriod;
      this.chargeT += this.chargeDir * rate * dt;
      if (this.chargeT >= t1) {
        this.chargeT = t1;
        this.chargeDir = -1;
      } else if (this.chargeT <= t0) {
        this.chargeT = t0;
        this.chargeDir = 1;
      }
      this.director.setActionTime(this.roarHints, this.chargeT);
      this.director.setActionTime(this.attackHints, this.chargeT);
      this.director.setActionTimeScale(this.roarHints, 0);
      this.director.setActionTimeScale(this.attackHints, 0);
      const u = (this.chargeT - t0) / span;
      this.shakeAmp = 0.35 + u * 0.55;
    }

    this.applyJointSnake(dt);
    this.applyChargeShake();
  }

  /** 0..1 how open the charged maw is (for beam intensity). */
  getMawOpenU(): number {
    if (this.mode !== 'charge') {
      if (this.mode === 'attack' || this.mode === 'roar') {
        return THREE.MathUtils.clamp(this.director.getActionProgress(), 0, 1);
      }
      return 0;
    }
    const t0 = LEVI_CHARGE_T0;
    const t1 = (this as { _t1?: number })._t1 ?? LEVI_CHARGE_T1;
    return THREE.MathUtils.clamp((this.chargeT - t0) / Math.max(0.05, t1 - t0), 0, 1);
  }

  /**
   * Additive joint chain after mixer — same structure as original idle:
   * hub local translation (chain anchors) + hub/link rotations with phase lag.
   *
   * Intensity is a fraction of idle Tamp so we boost / fill freezes without
   * inventing a second skeleton.
   */
  private applyJointSnake(_dt: number): void {
    const w = this.undulateW * this.modeBlend;
    if (w < 0.01 || !this.hubs.length) return;

    const t = this.elapsed;
    // Swim pushes harder; idle residual soft; charge keeps body alive under maw hold
    const speed = this.mode === 'swim' ? 2.05 : this.mode === 'charge' ? 1.35 : 1.1;
    // Fraction of original idle T amplitudes (idle clip already carries base motion)
    const tFrac =
      this.mode === 'swim' ? 0.28 : this.mode === 'charge' ? 0.22 : 0.1;
    const rFrac =
      this.mode === 'swim' ? 0.22 : this.mode === 'charge' ? 0.18 : 0.08;
    const intensity = w;

    for (let h = 0; h < this.hubs.length; h++) {
      const joint = this.hubs[h];
      const phase = t * speed - joint.lag;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      const s2 = Math.sin(phase * 0.72 + 0.4);

      // Hub translation — original idle drives these four anchors
      _v.copy(joint.tAmp).multiplyScalar(tFrac * intensity);
      joint.hub.position.x += _v.x * s;
      joint.hub.position.y += _v.y * s2;
      joint.hub.position.z += _v.z * c;

      // Hub rotation
      const r = joint.rAmp * rFrac * intensity;
      _e.set(
        Math.sin(phase * 0.55) * r * 0.35,
        s * r,
        Math.sin(phase * 0.85 + 0.3) * r * 0.4,
      );
      _q.setFromEuler(_e);
      joint.hub.quaternion.multiply(_q);

      // Child links — rotation only (linked segments after hub), phase lag per joint
      for (let i = 0; i < joint.links.length; i++) {
        const linkPhase = phase - (i + 1) * 0.62;
        const lr = r * (0.85 + i * 0.12);
        const ls = Math.sin(linkPhase);
        _e.set(
          Math.sin(linkPhase * 0.5) * lr * 0.28,
          ls * lr,
          Math.sin(linkPhase * 0.9 + 0.35) * lr * 0.38,
        );
        _q.setFromEuler(_e);
        joint.links[i].quaternion.multiply(_q);
      }
    }

    // Fins — secondary flutter (original idle also animates asihire/munabire hard)
    const finAmp = (this.mode === 'swim' ? 0.14 : 0.06) * intensity;
    for (let i = 0; i < this.finBones.length; i++) {
      const a = Math.sin(t * speed * 1.45 + i * 0.9) * finAmp;
      _e.set(a * 0.55, a, a * 0.3);
      _q.setFromEuler(_e);
      this.finBones[i].quaternion.multiply(_q);
    }
  }

  private applyChargeShake(): void {
    if (this.shakeAmp <= 0.02 || !(this.headBone || this.mouthBone)) return;
    const t = this.elapsed;
    const sh = this.shakeAmp * this.modeBlend;
    const sx =
      (Math.sin(t * 27.3) * 0.55 + Math.sin(t * 41.7) * 0.35 + Math.sin(t * 9.2) * 0.2) *
      sh *
      0.045;
    const sy =
      (Math.sin(t * 23.1 + 1.2) * 0.5 + Math.sin(t * 37.5) * 0.4) * sh * 0.038;
    const sz =
      (Math.sin(t * 19.8 + 0.7) * 0.45 + Math.sin(t * 31.2) * 0.35) * sh * 0.032;
    if (this.headBone) {
      _e.set(sx, sy, sz);
      _q.setFromEuler(_e);
      this.headBone.quaternion.multiply(_q);
    }
    if (this.mouthBone && this.mouthBone !== this.headBone) {
      const open = this.mode === 'charge' ? 0.12 + this.getMawOpenU() * 0.18 : 0.06;
      _e.set(open + sx * 0.8, sy * 0.5, sz * 0.4);
      _q.setFromEuler(_e);
      this.mouthBone.quaternion.multiply(_q);
    }
  }

  dispose(): void {
    this.bodyChain = [];
    this.sideChain = [];
    this.tailChain = [];
    this.finBones = [];
    this.hubs = [];
  }
}
