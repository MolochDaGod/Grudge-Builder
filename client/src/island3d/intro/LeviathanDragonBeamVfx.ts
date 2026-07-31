/**
 * LeviathanDragonBeamVfx — cinema dragon beam (moon-beam structure, fire palette).
 *
 * Attack cadence (script-driven):
 *   1. SNAP   (~0.1 s)  — attack anim start, mouth hot-hands flash
 *   2. CHARGE (pause)   — flame aura, hot hands, fireball orbs gather at maw
 *   3. BLAST            — multi-layer dragon beam mouth → deck
 *   4. BOUNCE           — flame aura / embers ricochet off mage force-field wards
 *
 * All procedural (no fireball.glb whole-scene load). Optional orb GLBs soft-fail.
 * SI metres. One-shot pieces hide/remove when life ends.
 */
import * as THREE from 'three';

export type DragonBeamPhase = 'off' | 'snap' | 'charge' | 'blast' | 'aftermath';

export type DragonBeamOpts = {
  /** Mouth world position (updated each frame) */
  mouth: THREE.Vector3;
  /** Deck / ward aim world position */
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
};

const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

function addMat(color: number, opacity: number, additive = true): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

type FlyingOrb = {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  life: number;
  mode: 'gather' | 'shot' | 'bounce';
};

type Spark = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
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

  // Charge / aura
  private auraShell: THREE.Mesh;
  private auraRim: THREE.Mesh;
  private mouthGlow: THREE.Mesh;
  private hotHandL: THREE.Mesh;
  private hotHandR: THREE.Mesh;
  private chargeOrbs: THREE.Mesh[] = [];
  private chargeLight: THREE.PointLight;
  private blastLight: THREE.PointLight;

  private flying: FlyingOrb[] = [];
  private sparks: Spark[] = [];
  private bounceCd = 0;
  private snapFlash = 0;

  constructor(scene: THREE.Scene) {
    this.root.name = 'leviathan_dragon_beam_vfx';
    scene.add(this.root);

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
    this.root.add(this.beamGroup);

    // Flame aura around body (danger-room shell, fire palette)
    this.auraShell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 18),
      addMat(0xff5511, 0.12),
    );
    this.auraRim = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 14, 10),
      addMat(0xffaa44, 0.2),
    );
    (this.auraRim.material as THREE.MeshBasicMaterial).wireframe = true;
    this.auraShell.visible = false;
    this.auraRim.visible = false;
    this.root.add(this.auraShell, this.auraRim);

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
    if (phase === 'snap') this.snapFlash = 1;
    if (phase === 'off') this.hideAll();
  }

  getPhase(): DragonBeamPhase {
    return this.phase;
  }

  /** Fire a one-shot fireball from mouth toward target (or bounce reverse). */
  launchFireball(from: THREE.Vector3, to: THREE.Vector3, mode: FlyingOrb['mode'] = 'shot'): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35 + Math.random() * 0.15, 12, 10),
      addMat(mode === 'bounce' ? 0x66ddff : 0xff5522, 0.9),
    );
    mesh.position.copy(from);
    this.root.add(mesh);
    this.flying.push({
      mesh,
      from: from.clone(),
      to: to.clone(),
      t: 0,
      life: mode === 'bounce' ? 0.55 : 0.85,
      mode,
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

    // Hot hands opacity
    const hotOp =
      phase === 'off'
        ? 0
        : phase === 'snap'
          ? 0.4 + snap * 0.55
          : phase === 'charge'
            ? 0.55 + chargeU * 0.4 + Math.sin(elapsed * 12) * 0.08
            : phase === 'blast'
              ? 0.85 + Math.sin(elapsed * 20) * 0.1
              : 0.25;
    (this.hotHandL.material as THREE.MeshBasicMaterial).opacity = hotOp;
    (this.hotHandR.material as THREE.MeshBasicMaterial).opacity = hotOp * 0.9;
    this.hotHandL.visible = hotOp > 0.02;
    this.hotHandR.visible = hotOp > 0.02;
    this.hotHandL.scale.setScalar(1 + hotOp * 0.6 + snap);
    this.hotHandR.scale.setScalar(1 + hotOp * 0.55 + snap);

    // Mouth glow
    const mouthOp =
      phase === 'charge'
        ? 0.2 + chargeU * 0.7
        : phase === 'blast'
          ? 0.85
          : phase === 'snap'
            ? 0.5 + snap * 0.4
            : 0;
    (this.mouthGlow.material as THREE.MeshBasicMaterial).opacity = mouthOp;
    this.mouthGlow.visible = mouthOp > 0.02;
    this.mouthGlow.scale.setScalar(0.8 + chargeU * 1.4 + (blastVis ? 0.5 : 0) + snap * 0.8);

    // Flame aura (body shell — parent near mouth / upper body)
    const auraOn = chargeVis && (phase === 'charge' || phase === 'blast' || phase === 'snap');
    this.auraShell.visible = auraOn;
    this.auraRim.visible = auraOn;
    if (auraOn) {
      // Slightly behind mouth toward body center
      this.auraShell.position.copy(mouth).addScaledVector(_dir, -2.2);
      this.auraShell.position.y -= 0.5;
      this.auraRim.position.copy(this.auraShell.position);
      const ar = 3.2 + chargeU * 2.5 + (blastVis ? 1.2 : 0) + storm * 0.5;
      this.auraShell.scale.setScalar(ar);
      this.auraRim.scale.setScalar(ar * 1.05);
      this.auraRim.rotation.y += dt * 1.4;
      this.auraRim.rotation.x += dt * 0.35;
      (this.auraShell.material as THREE.MeshBasicMaterial).opacity =
        0.08 + chargeU * 0.14 + (blastVis ? 0.1 : 0);
      (this.auraRim.material as THREE.MeshBasicMaterial).opacity =
        0.15 + chargeU * 0.2 + Math.sin(elapsed * 5) * 0.05;
    }

    // Charge orbs orbit maw (fireball gather — moon-beam charge motif)
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
      } else if (phase === 'blast' && blastU < 0.25) {
        // Launch gather orbs as fireballs once
        if (o.visible) {
          this.launchFireball(o.position, target, 'shot');
          o.visible = false;
        }
      } else {
        o.visible = false;
      }
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

    // ── Shield bounce: flame aura ricochets off wards ─────────────────
    this.bounceCd -= dt;
    if (
      (phase === 'blast' || (phase === 'charge' && chargeU > 0.55)) &&
      shieldPoints.length &&
      this.bounceCd <= 0
    ) {
      this.bounceCd = phase === 'blast' ? 0.09 : 0.18;
      // Pick nearest shield to the beam path
      let best = shieldPoints[0];
      let bestD = Infinity;
      for (const p of shieldPoints) {
        // Distance from point to segment mouth→target
        const d = distToSegment(p, mouth, target);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      // Impact spark at shield + bounce fireball back toward mouth
      this.spawnImpactSparks(best, 8 + Math.floor(blastU * 10));
      if (phase === 'blast' || Math.random() < 0.45) {
        // Bounce: cyan-tinted ward reflection → orange flame reverse
        this.launchFireball(best, mouth, 'bounce');
        // Secondary scatter toward other shields (aura chain between boat and beast)
        if (shieldPoints.length > 1 && Math.random() < 0.5) {
          const other = shieldPoints[Math.floor(Math.random() * shieldPoints.length)];
          this.launchFireball(best, other, 'bounce');
        }
      }
    }

    this.updateFlying(dt);
    this.updateSparks(dt);
  }

  private updateFlying(dt: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.life);
      f.mesh.position.lerpVectors(f.from, f.to, u);
      // Arc
      f.mesh.position.y += Math.sin(u * Math.PI) * (f.mode === 'bounce' ? 1.2 : 2.2);
      const spin = f.mode === 'bounce' ? 14 : 8;
      f.mesh.rotation.y += dt * spin;
      const mat = f.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - u) * (f.mode === 'bounce' ? 0.85 : 0.95);
      f.mesh.scale.setScalar(1 + u * 0.4);
      if (u >= 1) {
        this.root.remove(f.mesh);
        f.mesh.geometry.dispose();
        mat.dispose();
        this.flying.splice(i, 1);
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
    this.auraShell.visible = false;
    this.auraRim.visible = false;
    this.mouthGlow.visible = false;
    this.hotHandL.visible = false;
    this.hotHandR.visible = false;
    for (const o of this.chargeOrbs) o.visible = false;
    this.chargeLight.intensity = 0;
    this.blastLight.intensity = 0;
  }

  dispose(): void {
    this.hideAll();
    for (const f of this.flying) {
      this.root.remove(f.mesh);
      f.mesh.geometry.dispose();
      (f.mesh.material as THREE.Material).dispose();
    }
    this.flying = [];
    for (const s of this.sparks) {
      this.root.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.sparks = [];
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
  const water = sampleCinemaWaterY(x, z, t, storm);
  // When underwater, sit below waterline; when surface/breach ride the swell
  if (surfaceBias < -2) {
    return baseY + water * 0.15;
  }
  if (surfaceBias < 1) {
    // Transitioning — stick near water with swell
    return Math.min(baseY, water + 0.4) * 0.35 + baseY * 0.65 + water * 0.25;
  }
  // Above water: keel follows swell lightly
  return baseY + water * 0.55;
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
