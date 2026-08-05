/**
 * LeviathanDragonBeamVfx — cinema dragon beam (moon-beam structure, fire palette).
 *
 * Attack cadence (script-driven):
 *   1. SNAP   (~0.1 s)  — attack anim start, mouth hot-hands flash
 *   2. CHARGE (pause)   — sandbox fire_aura (vfxgrudge G/Q), hot hands, orbs at maw
 *   3. BLAST            — multi-layer dragon beam mouth → deck
 *   4. BOUNCE           — shield flame bounce + fire_aura burst on ward
 *
 * Flame aura SSOT: CinemaSandboxFireAura (Open Vfx.fireAura / auraRing / flame) —
 * NOT soft sphere shells.
 */
import * as THREE from 'three';
import { CIN_WARD_GLYPH_M } from '@shared/definitions/leviathanCinemaStage';
import { CinemaSandboxFireAura } from './CinemaSandboxFireAura';
import {
  applyCinemaBlend,
  CINEMA_RENDER_ORDER,
  smoothMaterialOpacity,
} from './CinemaMaterialBlend';

export type DragonBeamPhase = 'off' | 'snap' | 'charge' | 'blast' | 'aftermath';

export type DragonBeamOpts = {
  /** Mouth world position (updated each frame) */
  mouth: THREE.Vector3;
  /** Beam end: shield face while ward up, else deck */
  target: THREE.Vector3;
  /** Force-field / ring world positions for bounce contacts */
  shieldPoints: THREE.Vector3[];
  /** Leviathan root for flame aura parent (optional) */
  leviathanRoot?: THREE.Object3D | null;
  phase: DragonBeamPhase;
  /** 0..1 charge fill during charge phase */
  chargeU: number;
  /** 0..1 blast intensity */
  blastU: number;
  dt: number;
  elapsed: number;
  storm: number;
  /** When true, beam stops at shield + dense flame bounce FX */
  beamStopsAtShield?: boolean;
};

const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

/** Soft custom-blend materials (three.js webgl_materials_blending_custom). */
function addMat(color: number, opacity: number, additive = true): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  applyCinemaBlend(mat, {
    recipe: additive ? 'softAdditive' : 'softAlpha',
    opacity,
    toneMapped: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  return mat;
}

type FlyingOrb = {
  mesh: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  life: number;
  mode: 'gather' | 'shot' | 'bounce';
  /** Base uniform scale (glyph / orb) before flight pulse */
  baseScale: number;
  isGlyph?: boolean;
};

type Spark = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
};

/** One-shot spinning glyph flash at shield impact (GRDG-3DFX-789B55B0). */
type GlyphImpact = {
  root: THREE.Object3D;
  life: number;
  maxLife: number;
  spin: number;
  baseScale: number;
};

/**
 * Multi-layer dragon beam (moon-beam architecture):
 * core (white-hot) + sheath (orange) + outer soft (red) + spiral ribbons.
 */
export class LeviathanDragonBeamVfx {
  readonly root = new THREE.Group();
  private phase: DragonBeamPhase = 'off';

  // Beam layers (cylinder along +Y, reoriented each frame)
  private core: THREE.Mesh;
  private sheath: THREE.Mesh;
  private outer: THREE.Mesh;
  private ribbonA: THREE.Mesh;
  private ribbonB: THREE.Mesh;
  private beamGroup = new THREE.Group();

  // Charge / aura — sandbox fire_aura (rings + rising flame), not sphere shells
  private fireAura: CinemaSandboxFireAura;
  private mouthGlow: THREE.Mesh;
  private hotHandL: THREE.Mesh;
  private hotHandR: THREE.Mesh;
  private chargeOrbs: THREE.Mesh[] = [];
  private chargeLight: THREE.PointLight;
  private blastLight: THREE.PointLight;

  private flying: FlyingOrb[] = [];
  private sparks: Spark[] = [];
  private glyphImpacts: GlyphImpact[] = [];
  private bounceCd = 0;
  private fireballVolleyCd = 0;
  private snapFlash = 0;
  /** One-shot fire_aura on snap (avoid per-frame spam) */
  private snapAuraFired = false;

  constructor(scene: THREE.Scene) {
    this.root.name = 'leviathan_dragon_beam_vfx';
    scene.add(this.root);
    this.fireAura = new CinemaSandboxFireAura(this.root);

    // Beam cylinders (unit height 1, scale.y = length)
    this.core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 1, 12, 1, true),
      addMat(0xfff6d0, 0.95),
    );
    this.sheath = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.55, 1, 16, 1, true),
      addMat(0xff7722, 0.55),
    );
    this.outer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.1, 1, 16, 1, true),
      addMat(0xff2200, 0.22),
    );
    // Spiral “moon beam” ribbons → fire dragon twist
    this.ribbonA = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.06, 6, 24),
      addMat(0xffaa44, 0.65),
    );
    this.ribbonB = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.05, 6, 24),
      addMat(0xff5522, 0.45),
    );
    this.ribbonA.rotation.x = Math.PI / 2;
    this.ribbonB.rotation.x = Math.PI / 2;
    this.beamGroup.add(this.core, this.sheath, this.outer, this.ribbonA, this.ribbonB);
    this.beamGroup.visible = false;
    this.beamGroup.renderOrder = CINEMA_RENDER_ORDER.beam;
    this.root.add(this.beamGroup);

    // Mouth charge + hot hands
    this.mouthGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12),
      addMat(0xffee88, 0.0),
    );
    this.hotHandL = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      addMat(0xffcc44, 0.0),
    );
    this.hotHandR = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      addMat(0xff8822, 0.0),
    );
    this.root.add(this.mouthGlow, this.hotHandL, this.hotHandR);

    // Gather orbs around maw (fireball stand-ins)
    for (let i = 0; i < 6; i++) {
      const o = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 10),
        addMat(0xff6622, 0.0),
      );
      o.visible = false;
      this.chargeOrbs.push(o);
      this.root.add(o);
    }

    this.chargeLight = new THREE.PointLight(0xff6622, 0, 28, 2);
    this.blastLight = new THREE.PointLight(0xffaa44, 0, 40, 1.6);
    this.root.add(this.chargeLight, this.blastLight);
  }

  setPhase(phase: DragonBeamPhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    if (phase === 'snap') {
      this.snapFlash = 1;
      this.snapAuraFired = false;
    }
    if (phase === 'off') this.hideAll();
  }

  getPhase(): DragonBeamPhase {
    return this.phase;
  }

  /**
   * Fireball projectile (procedural layered orb — not whole fireball.glb scene).
   * Core + hot shell + soft outer; bounce mode = cyan ward reflection.
   */
  /**
   * Shield-block impact: sandbox fire_aura burst + sparks (no spell-glyph).
   */
  spawnShieldGlyphImpact(at: THREE.Vector3, _spanM = CIN_WARD_GLYPH_M * 1.15): void {
    this.spawnImpactSparks(at, 18);
    this.spawnShieldFlameBounce(at);
    // Full fire_aura read from VFX site (rings + flame column)
    this.fireAura.burst(at, 1.15);
  }

  /**
   * Cool bounce: orange + purple flame particles ricochet off the ward plate.
   */
  spawnShieldFlameBounce(at: THREE.Vector3, outDir?: THREE.Vector3): void {
    const n = 22;
    const baseDir = outDir?.clone().normalize() ?? new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const col = i % 3 === 0 ? 0xaa44ff : i % 3 === 1 ? 0xff6622 : 0xffcc44;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 6, 5),
        addMat(col, 0.95),
      );
      mesh.position.copy(at);
      this.root.add(mesh);
      // Bounce mostly outward + up from shield face
      const scatter = new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        0.4 + Math.random() * 1.8,
        (Math.random() - 0.5) * 2.2,
      );
      scatter.addScaledVector(baseDir, 2.5 + Math.random() * 4);
      this.sparks.push({
        mesh,
        vel: scatter,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
      });
    }
    // Larger soft flame puffs
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + Math.random() * 0.22, 8, 6),
        addMat(i % 2 === 0 ? 0xff5511 : 0x8833ff, 0.55),
      );
      mesh.position.copy(at).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          Math.random() * 0.4,
          (Math.random() - 0.5) * 0.6,
        ),
      );
      this.root.add(mesh);
      this.sparks.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          2 + Math.random() * 4,
          (Math.random() - 0.5) * 3,
        ),
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
      });
    }
  }

  launchFireball(from: THREE.Vector3, to: THREE.Vector3, mode: FlyingOrb['mode'] = 'shot'): void {
    const isBounce = mode === 'bounce';
    // Procedural orbs only — no glyph mesh
    const g = new THREE.Group();
    const coreCol = isBounce ? 0xaaffff : 0xffee88;
    const shellCol = isBounce ? 0x44ccff : 0xff5522;
    const outerCol = isBounce ? 0x2288dd : 0xff2200;
    const r = 0.22 + Math.random() * 0.12;
    const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 12, 10), addMat(coreCol, 0.95));
    const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), addMat(shellCol, 0.75));
    const outer = new THREE.Mesh(new THREE.SphereGeometry(r * 1.45, 12, 10), addMat(outerCol, 0.28));
    g.add(core, shell, outer);
    g.position.copy(from);
    g.userData.core = core;
    g.userData.shell = shell;
    g.userData.outer = outer;
    this.root.add(g);
    this.flying.push({
      mesh: g,
      from: from.clone(),
      to: to.clone(),
      t: 0,
      life: isBounce ? 0.5 : 0.95 + Math.random() * 0.25,
      mode,
      baseScale: 1,
      isGlyph: false,
    });
  }

  update(opts: DragonBeamOpts): void {
    const { mouth, target, shieldPoints, phase, chargeU, blastU, dt, elapsed, storm } = opts;
    this.setPhase(phase);

    // ── Mouth / hot hands placement ──────────────────────────────────
    this.mouthGlow.position.copy(mouth);
    _dir.copy(target).sub(mouth).normalize();
    // “Hot hands” = jaw corners offset perpendicular to aim
    const side = _tmp.set(-_dir.z, 0, _dir.x).normalize();
    this.hotHandL.position.copy(mouth).addScaledVector(side, 0.7).addScaledVector(_dir, 0.35);
    this.hotHandR.position.copy(mouth).addScaledVector(side, -0.7).addScaledVector(_dir, 0.35);
    this.hotHandL.position.y -= 0.15;
    this.hotHandR.position.y -= 0.15;

    const chargeVis = phase === 'snap' || phase === 'charge' || phase === 'blast';
    const blastVis = phase === 'blast';

    // Snap flash (0.1s attack start)
    this.snapFlash = Math.max(0, this.snapFlash - dt / 0.12);
    const snap = this.snapFlash;

    // Hot hands / mouth — smooth opacity (no hard pop between phases)
    const hotTarget =
      phase === 'off'
        ? 0
        : phase === 'snap'
          ? 0.4 + snap * 0.55
          : phase === 'charge'
            ? 0.55 + chargeU * 0.4 + Math.sin(elapsed * 12) * 0.08
            : phase === 'blast'
              ? 0.85 + Math.sin(elapsed * 20) * 0.1
              : 0.25;
    smoothMaterialOpacity(this.hotHandL.material, hotTarget, dt, 10);
    smoothMaterialOpacity(this.hotHandR.material, hotTarget * 0.9, dt, 10);
    const hotOp = (this.hotHandL.material as THREE.MeshBasicMaterial).opacity;
    this.hotHandL.visible = hotOp > 0.02;
    this.hotHandR.visible = hotOp > 0.02;
    this.hotHandL.scale.setScalar(1 + hotOp * 0.6 + snap);
    this.hotHandR.scale.setScalar(1 + hotOp * 0.55 + snap);

    const mouthTarget =
      phase === 'charge'
        ? 0.2 + chargeU * 0.7
        : phase === 'blast'
          ? 0.85
          : phase === 'snap'
            ? 0.5 + snap * 0.4
            : 0;
    smoothMaterialOpacity(this.mouthGlow.material, mouthTarget, dt, 9);
    const mouthOp = (this.mouthGlow.material as THREE.MeshBasicMaterial).opacity;
    this.mouthGlow.visible = mouthOp > 0.02;
    this.mouthGlow.scale.setScalar(0.8 + chargeU * 1.4 + (blastVis ? 0.5 : 0) + snap * 0.8);

    // Sandbox fire_aura (vfxgrudge fire_aura / Open Vfx.fireAura) — rings + rising flame
    const auraOn = chargeVis && (phase === 'charge' || phase === 'blast' || phase === 'snap');
    const auraI =
      phase === 'blast'
        ? 0.85 + blastU * 0.15
        : phase === 'charge'
          ? 0.35 + chargeU * 0.65
          : phase === 'snap'
            ? 0.55 + snap * 0.4
            : 0;
    // Anchor slightly behind maw toward body; scale for levi SI (~3–5 m ring)
    const auraPos = mouth.clone().addScaledVector(_dir, -2.0);
    auraPos.y -= 0.35;
    const auraScale = 3.4 + chargeU * 2.2 + (blastVis ? 1.0 : 0) + storm * 0.4;
    this.fireAura.setActive(auraOn, auraI, auraPos, auraScale);
    this.fireAura.update(dt, auraPos);
    if (phase === 'snap' && !this.snapAuraFired) {
      // One snap-in fire_aura burst like sandbox Alt+G / Q
      this.snapAuraFired = true;
      this.fireAura.burst(auraPos, 1.05 + chargeU * 0.35);
    }

    // Charge orbs orbit maw; during blast stream fireballs at deck (shield intercepts)
    for (let i = 0; i < this.chargeOrbs.length; i++) {
      const o = this.chargeOrbs[i];
      if (phase === 'charge' || (phase === 'snap' && snap > 0.2)) {
        o.visible = true;
        const ang = elapsed * (1.8 + i * 0.15) + (i / 6) * Math.PI * 2;
        const r = 1.1 + chargeU * 0.9 + Math.sin(elapsed * 3 + i) * 0.15;
        o.position.set(
          mouth.x + Math.cos(ang) * r,
          mouth.y + Math.sin(ang * 1.3) * 0.45 * (0.5 + chargeU),
          mouth.z + Math.sin(ang) * r,
        );
        const op = 0.35 + chargeU * 0.55;
        (o.material as THREE.MeshBasicMaterial).opacity = op;
        o.scale.setScalar(0.55 + chargeU * 0.9);
      } else if (phase === 'blast' && blastU < 0.35) {
        if (o.visible) {
          // Aim at a shield point if available so mages can block
          const aim =
            shieldPoints.length > 0
              ? shieldPoints[i % shieldPoints.length]
              : target;
          this.launchFireball(o.position.clone(), aim, 'shot');
          o.visible = false;
        }
      } else {
        o.visible = false;
      }
    }
    // Continuous fireball volley during blast (barrage aimed at mage shields)
    this.fireballVolleyCd -= dt;
    if (phase === 'blast' && shieldPoints.length && this.fireballVolleyCd <= 0) {
      this.fireballVolleyCd = 0.22;
      const aim = shieldPoints[Math.floor(Math.random() * shieldPoints.length)];
      const jitter = mouth.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 1.2,
        ),
      );
      this.launchFireball(jitter, aim, 'shot');
    }

    // Lights
    this.chargeLight.position.copy(mouth);
    this.chargeLight.intensity =
      phase === 'charge' ? 4 + chargeU * 18 : phase === 'snap' ? 8 + snap * 12 : 0;
    this.blastLight.position.copy(_mid.copy(mouth).lerp(target, 0.35));
    this.blastLight.intensity = blastVis ? 12 + blastU * 28 : 0;

    // ── Dragon beam (blast) ──────────────────────────────────────────
    this.beamGroup.visible = blastVis;
    if (blastVis) {
      const dist = Math.max(0.8, mouth.distanceTo(target));
      _mid.copy(mouth).lerp(target, 0.5);
      _dir.copy(target).sub(mouth).normalize();
      this.beamGroup.position.copy(_mid);
      // Orient cylinder +Y to aim direction
      _q.setFromUnitVectors(_up, _dir);
      this.beamGroup.quaternion.copy(_q);

      const pulse = 1 + Math.sin(elapsed * 28) * 0.08;
      const w = (0.7 + blastU * 0.6) * pulse;
      this.core.scale.set(w * 0.9, dist, w * 0.9);
      this.sheath.scale.set(w, dist, w);
      this.outer.scale.set(w * 1.15, dist, w * 1.15);
      (this.core.material as THREE.MeshBasicMaterial).opacity = 0.75 + blastU * 0.25;
      (this.sheath.material as THREE.MeshBasicMaterial).opacity = 0.4 + blastU * 0.35;
      (this.outer.material as THREE.MeshBasicMaterial).opacity = 0.15 + blastU * 0.2;

      // Ribbons slide along beam like moon-beam helix
      const slide = ((elapsed * 4) % 1) - 0.5;
      this.ribbonA.position.set(0, slide * dist * 0.8, 0);
      this.ribbonB.position.set(0, -slide * dist * 0.8, 0);
      this.ribbonA.rotation.z = elapsed * 6;
      this.ribbonB.rotation.z = -elapsed * 5;
      this.ribbonA.scale.setScalar(w * 1.1);
      this.ribbonB.scale.setScalar(w * 1.3);
    }

    // ── Shield bounce: flame aura particles ricochet where beam STOPS ─
    this.bounceCd -= dt;
    const stopAtShield = !!opts.beamStopsAtShield && shieldPoints.length > 0;
    if (
      (phase === 'blast' || (phase === 'charge' && chargeU > 0.55)) &&
      shieldPoints.length &&
      this.bounceCd <= 0
    ) {
      // Faster bounce FX when beam is locked on ward plate
      this.bounceCd = phase === 'blast' ? (stopAtShield ? 0.055 : 0.1) : 0.16;
      // Impact at beam end (shield face) first — that's where the beam stops
      let best = stopAtShield ? target.clone() : shieldPoints[0];
      if (!stopAtShield) {
        let bestD = Infinity;
        for (const p of shieldPoints) {
          const d = distToSegment(p, mouth, target);
          if (d < bestD) {
            bestD = d;
            best = p;
          }
        }
      }
      // Outward bounce direction: away from mouth along beam
      const bounceOut = target.clone().sub(mouth);
      if (bounceOut.lengthSq() > 1e-6) bounceOut.normalize();
      else bounceOut.set(0, 1, 0);
      this.spawnShieldFlameBounce(best, bounceOut);
      this.spawnImpactSparks(best, stopAtShield ? 16 : 10);
      // Rebound fireballs skim off the plate back toward maw
      if (phase === 'blast' || Math.random() < 0.6) {
        this.launchFireball(best, mouth, 'bounce');
        if (shieldPoints.length > 1 && Math.random() < 0.5) {
          const other = shieldPoints[Math.floor(Math.random() * shieldPoints.length)];
          this.launchFireball(best, other, 'bounce');
        }
      }
    }

    this.updateFlying(dt);
    this.updateSparks(dt);
    this.updateGlyphImpacts(dt);
  }

  private updateFlying(dt: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.life);
      f.mesh.position.lerpVectors(f.from, f.to, u);
      // Arc — shots lob toward deck / bounce glyphs skim back to maw
      f.mesh.position.y += Math.sin(u * Math.PI) * (f.mode === 'bounce' ? 1.15 : 2.8);
      f.mesh.rotation.y += dt * (f.isGlyph ? (f.mode === 'bounce' ? 14 : 9) : f.mode === 'bounce' ? 10 : 6);
      f.mesh.rotation.z += dt * (f.isGlyph ? 4 : 0);
      const pulse = 1 + Math.sin(u * Math.PI) * (f.isGlyph ? 0.55 : 0.35);
      f.mesh.scale.setScalar(f.baseScale * pulse);
      const fade = 1 - u * 0.9;
      f.mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          if ('opacity' in mat) {
            const base =
              m === f.mesh.userData?.core
                ? 0.95
                : m === f.mesh.userData?.outer
                  ? 0.28
                  : f.isGlyph
                    ? 0.92
                    : 0.75;
            (mat as THREE.MeshBasicMaterial).opacity =
              base * fade * (f.mode === 'bounce' ? 0.95 : 1);
          }
        }
      });
      if (u >= 1) {
        // Shot glyphs that hit shield: impact flash at end
        if (f.mode === 'shot' && f.isGlyph) {
          this.spawnShieldGlyphImpact(f.to, CIN_WARD_GLYPH_M * 1.6);
        }
        this.root.remove(f.mesh);
        f.mesh.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose?.();
            if (m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) mat.dispose?.();
            }
          }
        });
        this.flying.splice(i, 1);
      }
    }
  }

  private updateGlyphImpacts(dt: number): void {
    for (let i = this.glyphImpacts.length - 1; i >= 0; i--) {
      const g = this.glyphImpacts[i];
      g.life -= dt;
      const u = 1 - Math.max(0, g.life) / g.maxLife;
      g.root.rotation.y += g.spin * dt;
      g.root.rotation.z += g.spin * 0.35 * dt;
      // Punch in then fade out
      const sc = g.baseScale * (1 + Math.sin(Math.min(1, u * 3.2) * Math.PI) * 0.85);
      g.root.scale.setScalar(sc);
      const fade = Math.max(0, g.life / g.maxLife);
      g.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          if ('opacity' in mat) (mat as THREE.Material & { opacity: number }).opacity = 0.15 + fade * 0.85;
        }
      });
      if (g.life <= 0) {
        this.root.remove(g.root);
        g.root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose?.();
            if (m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) mat.dispose?.();
            }
          }
        });
        this.glyphImpacts.splice(i, 1);
      }
    }
  }

  private spawnImpactSparks(at: THREE.Vector3, n: number): void {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 6, 4),
        addMat(Math.random() > 0.4 ? 0xffaa44 : 0x88eeff, 0.95),
      );
      mesh.position.copy(at);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        2 + Math.random() * 6,
        (Math.random() - 0.5) * 8,
      );
      this.root.add(mesh);
      this.sparks.push({
        mesh,
        vel,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.7,
      });
    }
  }

  private updateSparks(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vel.y -= 14 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, s.life / s.maxLife);
      if (s.life <= 0) {
        this.root.remove(s.mesh);
        s.mesh.geometry.dispose();
        mat.dispose();
        this.sparks.splice(i, 1);
      }
    }
  }

  private hideAll(): void {
    this.beamGroup.visible = false;
    this.fireAura.setActive(false, 0);
    this.mouthGlow.visible = false;
    this.hotHandL.visible = false;
    this.hotHandR.visible = false;
    for (const o of this.chargeOrbs) o.visible = false;
    this.chargeLight.intensity = 0;
    this.blastLight.intensity = 0;
  }

  dispose(): void {
    this.hideAll();
    this.fireAura.dispose();
    for (const f of this.flying) {
      this.root.remove(f.mesh);
      f.mesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose?.();
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) mat.dispose?.();
          }
        }
      });
    }
    this.flying = [];
    for (const s of this.sparks) {
      this.root.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.sparks = [];
    for (const g of this.glyphImpacts) {
      this.root.remove(g.root);
      g.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose?.();
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) mat.dispose?.();
          }
        }
      });
    }
    this.glyphImpacts = [];
    this.root.parent?.remove(this.root);
  }
}

function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = _tmp.copy(b).sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq())));
  const proj = a.clone().addScaledVector(ab, t);
  return p.distanceTo(proj);
}

// ── Water / leviathan body coupling ────────────────────────────────────

/**
 * Approximate Gerstner-style surface height for cinema (matches OceanShader
 * wind/storm feel without full GPU readback).
 */
export function sampleCinemaWaterY(
  x: number,
  z: number,
  t: number,
  storm: number,
  waveHeight = 1.35,
): number {
  const wh = waveHeight * (0.7 + storm * 0.55);
  // Sparse octaves — same wavelengths family as OceanShader
  const w1 = Math.sin(x * 0.042 + t * 0.62) * Math.cos(z * 0.038 - t * 0.55);
  const w2 = Math.sin(x * 0.078 - t * 0.85 + z * 0.05) * 0.55;
  const w3 = Math.sin((x + z) * 0.11 + t * 1.05) * 0.35;
  return (w1 + w2 + w3) * wh * 0.45;
}

/**
 * Drive leviathan vertical bob / submerge relative to waterline + phase.
 * Returns suggested world Y for leviathanRoot.
 */
export function leviathanWaterY(
  baseY: number,
  x: number,
  z: number,
  t: number,
  storm: number,
  /** submerged < 0 surface, > 0 above */
  surfaceBias: number,
): number {
  const water = sampleCinemaWaterY(x, z, t, storm, 1.55);
  // Stronger swell coupling so the body feels glued to the ocean
  if (surfaceBias < -4) {
    // Deep — slow undulation below waterline
    return baseY + water * 0.35 + Math.sin(t * 0.55) * 0.35;
  }
  if (surfaceBias < -1) {
    // Swim near surface — back breaks waves
    return baseY + water * 0.85 + Math.sin(t * 0.9 + x * 0.05) * 0.55;
  }
  if (surfaceBias < 2) {
    // Transition / surface — ride and punch through swell
    return baseY + water * 1.05 + Math.sin(t * 1.1) * 0.4;
  }
  // Breach / above — keel still tracks chop for weight
  return baseY + water * 0.75 + Math.sin(t * 0.7) * 0.25;
}

/**
 * Pitch/roll from local wave slope — makes the levi heave with the sea (yaw separate).
 */
export function leviathanWaveTilt(
  x: number,
  z: number,
  t: number,
  storm: number,
  surfaceBias: number,
): { pitch: number; roll: number } {
  if (surfaceBias < -6) return { pitch: 0, roll: 0 };
  const eps = 1.2;
  const h = sampleCinemaWaterY(x, z, t, storm, 1.55);
  const hx = sampleCinemaWaterY(x + eps, z, t, storm, 1.55);
  const hz = sampleCinemaWaterY(x, z + eps, t, storm, 1.55);
  const k = surfaceBias < 0 ? 0.12 : 0.22;
  const pitch = THREE.MathUtils.clamp(-(hz - h) * k, -0.28, 0.28);
  const roll = THREE.MathUtils.clamp((hx - h) * k, -0.22, 0.22);
  // Breach: stronger nose-up
  const breach = surfaceBias > 4 ? 0.12 : 0;
  return { pitch: pitch - breach, roll };
}

/**
 * Apply wet/emissive charge look on leviathan meshes during fire phases.
 */
export function applyLeviathanChargeLook(
  root: THREE.Object3D | null,
  chargeU: number,
  blastU: number,
  underwater: number,
): void {
  if (!root) return;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std.isMeshStandardMaterial && !(std as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
        // MeshBasic / other — skip
        continue;
      }
      if (std.userData.__leviBaseEmissive == null) {
        std.userData.__leviBaseEmissive = std.emissive?.clone?.() ?? new THREE.Color(0);
        std.userData.__leviBaseEmissiveIntensity = std.emissiveIntensity ?? 0;
        std.userData.__leviBaseRoughness = std.roughness ?? 0.7;
      }
      const fire = Math.max(chargeU * 0.55, blastU * 0.9);
      if (!std.emissive) std.emissive = new THREE.Color(0);
      std.emissive.setRGB(0.45 + fire * 0.5, 0.12 + fire * 0.08, 0.02);
      std.emissiveIntensity = (std.userData.__leviBaseEmissiveIntensity as number) + fire * 1.8;
      // Wet when underwater
      if (std.roughness != null) {
        std.roughness = THREE.MathUtils.lerp(
          std.userData.__leviBaseRoughness as number,
          0.25,
          Math.min(1, underwater * 1.2),
        );
      }
      if (std.metalness != null) {
        std.metalness = Math.min(0.45, fire * 0.25);
      }
    }
  });
}
