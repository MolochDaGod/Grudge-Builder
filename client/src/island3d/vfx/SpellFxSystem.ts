/**
 * SpellFxSystem — combat spell VFX using threejs-games patterns:
 *   • Lava shader (25-shaders/lava) — flame wall AoE + blade spline
 *   • Fire particles (20-particles/fire) — trails / slash projectiles
 *
 * Demos:
 *   https://threejs-games.github.io/examples/25-shaders/lava/
 *   https://threejs-games.github.io/examples/20-particles/fire/
 */
import * as THREE from 'three';
import {
  createParticleEmitter,
  type ParticleEmitter,
} from './FireSmokeParticles';
import {
  createLavaFlameWall,
  createLavaRibbon,
  createLavaMaterial,
  type LavaMaterialHandle,
} from './LavaShader';

export interface SpellKnockbackHit {
  /** World center of push */
  origin: THREE.Vector3;
  radius: number;
  /** Horizontal impulse (m/s scale for controller/creatures) */
  force: number;
  /** Source character id */
  casterId?: string;
}

export interface SpellFxSystemOpts {
  parent: THREE.Object3D;
  onKnockback?: (hit: SpellKnockbackHit) => void;
}

interface ActiveFx {
  update: (dt: number, elapsed: number) => boolean; // false = done
  dispose: () => void;
}

export class SpellFxSystem {
  private parent: THREE.Object3D;
  private onKnockback?: (hit: SpellKnockbackHit) => void;
  private active: ActiveFx[] = [];
  private elapsed = 0;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmp3 = new THREE.Vector3();

  constructor(opts: SpellFxSystemOpts) {
    this.parent = opts.parent;
    this.onKnockback = opts.onKnockback;
  }

  /**
   * Flame wall — lava-shader cylinder around caster.
   * Pushes units outward in radius (AoE knockback).
   */
  castFlameWall(opts: {
    center: THREE.Vector3;
    radius?: number;
    height?: number;
    duration?: number;
    pushForce?: number;
    casterId?: string;
  }): void {
    const radius = opts.radius ?? 3.2;
    const height = opts.height ?? 2.4;
    const duration = opts.duration ?? 1.8;
    const pushForce = opts.pushForce ?? 14;
    const { mesh, lava } = createLavaFlameWall(radius * 0.35, height);
    mesh.position.copy(opts.center);
    mesh.position.y += height * 0.5;
    mesh.scale.setScalar(0.2);
    this.parent.add(mesh);

    // Fire particles on the rim (threejs-game Fire style — rising billboards)
    const rimFire = createParticleEmitter({
      scene: this.parent,
      preset: 'spell_fire_trail',
      position: opts.center.clone().add(new THREE.Vector3(0, height * 0.4, 0)),
    });
    rimFire.start();

    let t = 0;
    let pushed = false;
    this.active.push({
      update: (dt, elapsed) => {
        t += dt;
        lava.update(elapsed);
        // Expand ring
        const expand = Math.min(1, t / 0.35);
        const rScale = THREE.MathUtils.lerp(0.25, 1, expand);
        mesh.scale.set(rScale, 1, rScale);
        mesh.rotation.y += dt * 0.8;
        // Pulse opacity via material fog
        lava.uniforms.fogDensity.value = 0.01 + Math.sin(elapsed * 6) * 0.005;

        const rim = opts.center.clone();
        rim.y += height * 0.35;
        rimFire.setPosition(rim);

        // Knockback once when wall fully formed
        if (!pushed && t >= 0.28) {
          pushed = true;
          this.onKnockback?.({
            origin: opts.center.clone(),
            radius,
            force: pushForce,
            casterId: opts.casterId,
          });
        }

        if (t >= duration) {
          rimFire.dispose();
          this.parent.remove(mesh);
          lava.dispose();
          (mesh.geometry as THREE.BufferGeometry).dispose();
          return false;
        }
        // Fade scale in last 0.4s
        if (t > duration - 0.4) {
          const f = (duration - t) / 0.4;
          mesh.scale.y = f;
        }
        return true;
      },
      dispose: () => {
        rimFire.dispose();
        this.parent.remove(mesh);
        lava.dispose();
        (mesh.geometry as THREE.BufferGeometry).dispose();
      },
    });
  }

  /**
   * Slash / projectile with fire trail + lava spline from blade toward target.
   * Blade → mid control → target (CatmullRom), tube lava + fire particles along path.
   */
  castBladeSlash(opts: {
    bladeWorld: THREE.Vector3;
    targetWorld: THREE.Vector3;
    /** Optional second blade (dual wield) */
    bladeB?: THREE.Vector3;
    duration?: number;
    projectileSpeed?: number;
  }): void {
    const duration = opts.duration ?? 0.55;
    const from = opts.bladeWorld.clone();
    const to = opts.targetWorld.clone();
    // Arc control point — raised mid spline
    const mid = from.clone().lerp(to, 0.45);
    mid.y += 0.85 + from.distanceTo(to) * 0.08;
    // Extend slightly past target (blade “reach”)
    const extend = to.clone().sub(from).normalize();
    const tip = to.clone().addScaledVector(extend, 0.6);

    const points = [from.clone(), mid, tip];
    if (opts.bladeB) {
      // Dual: second spline slightly offset
      this.spawnSplineLava(opts.bladeB.clone(), mid.clone().add(new THREE.Vector3(0.2, 0, 0.15)), tip.clone(), duration * 0.9);
    }

    const { mesh, lava } = createLavaRibbon(points, { radius: 0.07, tubularSegs: 56 });
    this.parent.add(mesh);

    // Fire projectile head that travels blade → target
    const head = createParticleEmitter({
      scene: this.parent,
      preset: 'spell_fire_projectile',
      position: from.clone(),
    });
    head.burst(16);
    head.start();

    // Trail emitter following head
    const trail = createParticleEmitter({
      scene: this.parent,
      preset: 'spell_fire_trail',
      position: from.clone(),
    });
    trail.start();

    let t = 0;
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
    this.active.push({
      update: (dt, elapsed) => {
        t += dt;
        const u = Math.min(1, t / duration);
        lava.update(elapsed);

        // Rebuild tube slightly thinner as it fades
        const pos = curve.getPoint(u);
        head.setPosition(pos);
        trail.setPosition(curve.getPoint(Math.max(0, u - 0.08)));
        if (u < 0.15 || (u > 0.2 && u < 0.85 && Math.random() < 0.3)) {
          head.burst(4);
        }

        mesh.material = lava.material;
        // Opacity fade via fog
        lava.uniforms.fogDensity.value = THREE.MathUtils.lerp(0.005, 0.08, u);

        if (u >= 1) {
          // Impact burst at tip
          head.setPosition(tip);
          head.burst(22);
          trail.stop();
          // keep one frame of impact then dispose next tick
          if (t >= duration + 0.12) {
            head.dispose();
            trail.dispose();
            this.parent.remove(mesh);
            lava.dispose();
            (mesh.geometry as THREE.BufferGeometry).dispose();
            return false;
          }
        }
        return true;
      },
      dispose: () => {
        head.dispose();
        trail.dispose();
        this.parent.remove(mesh);
        lava.dispose();
        (mesh.geometry as THREE.BufferGeometry).dispose();
      },
    });
  }

  /** Pure fire trail along a path (no lava mesh) — spell channel / beam follow */
  castFireTrailSpline(opts: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    duration?: number;
    samples?: number;
  }): void {
    const duration = opts.duration ?? 0.7;
    const samples = opts.samples ?? 12;
    const mid = opts.from.clone().lerp(opts.to, 0.5);
    mid.y += 0.5;
    const curve = new THREE.CatmullRomCurve3([opts.from.clone(), mid, opts.to.clone()]);
    const emitters: ParticleEmitter[] = [];
    for (let i = 0; i < samples; i++) {
      const p = curve.getPoint(i / (samples - 1));
      const em = createParticleEmitter({
        scene: this.parent,
        preset: 'spell_fire_trail',
        position: p,
      });
      em.burst(6);
      emitters.push(em);
    }
    let t = 0;
    this.active.push({
      update: (dt) => {
        t += dt;
        const u = Math.min(1, t / duration);
        // Move last emitters along path as traveling flame
        const head = curve.getPoint(u);
        emitters[emitters.length - 1]?.setPosition(head);
        if (t > 0.05) emitters[emitters.length - 1]?.burst(3);
        if (t >= duration) {
          emitters.forEach((e) => e.dispose());
          return false;
        }
        return true;
      },
      dispose: () => emitters.forEach((e) => e.dispose()),
    });
  }

  private spawnSplineLava(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    duration: number,
  ): void {
    const { mesh, lava } = createLavaRibbon([a, b, c], { radius: 0.05, tubularSegs: 40 });
    this.parent.add(mesh);
    let t = 0;
    this.active.push({
      update: (dt, elapsed) => {
        t += dt;
        lava.update(elapsed);
        if (t >= duration) {
          this.parent.remove(mesh);
          lava.dispose();
          (mesh.geometry as THREE.BufferGeometry).dispose();
          return false;
        }
        return true;
      },
      dispose: () => {
        this.parent.remove(mesh);
        lava.dispose();
        (mesh.geometry as THREE.BufferGeometry).dispose();
      },
    });
  }

  /**
   * Lava ball projectile that follows a spline to target, with fire trail.
   */
  castLavaProjectile(opts: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    speed?: number;
    radius?: number;
  }): void {
    const speed = opts.speed ?? 28;
    const dist = opts.from.distanceTo(opts.to);
    const duration = Math.max(0.2, dist / speed);
    const mid = opts.from.clone().lerp(opts.to, 0.4);
    mid.y += 1.2;
    const curve = new THREE.CatmullRomCurve3([opts.from.clone(), mid, opts.to.clone()]);

    const lava = createLavaMaterial({ uvScale: new THREE.Vector2(2, 2) });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(opts.radius ?? 0.22, 16, 16), lava.material);
    ball.position.copy(opts.from);
    this.parent.add(ball);

    const trail = createParticleEmitter({
      scene: this.parent,
      preset: 'spell_fire_trail',
      position: opts.from.clone(),
    });
    trail.start();

    let t = 0;
    this.active.push({
      update: (dt, elapsed) => {
        t += dt;
        const u = Math.min(1, t / duration);
        lava.update(elapsed);
        const p = curve.getPoint(u);
        ball.position.copy(p);
        trail.setPosition(curve.getPoint(Math.max(0, u - 0.05)));
        ball.rotation.x += dt * 4;
        ball.rotation.y += dt * 6;
        if (u >= 1) {
          // Impact: expand small lava shell + fire burst
          trail.burst(28);
          trail.stop();
          if (t >= duration + 0.15) {
            trail.dispose();
            this.parent.remove(ball);
            lava.dispose();
            ball.geometry.dispose();
            return false;
          }
        }
        return true;
      },
      dispose: () => {
        trail.dispose();
        this.parent.remove(ball);
        lava.dispose();
        ball.geometry.dispose();
      },
    });
  }

  update(dt: number): void {
    this.elapsed += dt;
    const still: ActiveFx[] = [];
    for (const fx of this.active) {
      if (fx.update(dt, this.elapsed)) still.push(fx);
    }
    this.active = still;
  }

  dispose(): void {
    for (const fx of this.active) fx.dispose();
    this.active = [];
  }
}
