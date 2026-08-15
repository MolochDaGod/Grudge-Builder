/**
 * BossCinemaFx — PIP Skull–style arena VFX (shockwave, meteor, electric, phase pulse).
 *
 * Reference: https://bandinopla.github.io/pip-skull-demo/
 *   Shockwave post, bloom intensity, meteor impacts, electric arcs, ground slam.
 *
 * Pure Three.js meshes + lights — no post-composer required (safe for Island3D).
 * Optional hook to WorldFxBus supernova/codepen when present.
 */
import * as THREE from 'three';
import type { WorldFxBus } from '../vfx/WorldFxBus';

export interface CinemaHitEvent {
  kind: 'shockwave' | 'meteor' | 'aoe_disk' | 'electric';
  damage: number;
  pos: THREE.Vector3;
  origin: THREE.Vector3;
  knockdown: boolean;
  stunSec: number;
  knockbackMps: number;
  knockUpMps: number;
}

export interface ShockwaveRing {
  mesh: THREE.Mesh;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
  maxLife: number;
  thickness: number;
  damage: number;
  hitPlayers: Set<string>;
  knockdown: boolean;
  stunSec: number;
  knockbackMps: number;
  knockUpMps: number;
  origin: THREE.Vector3;
  innerSafe: number;
}

export interface MeteorMarker {
  group: THREE.Group;
  impact: THREE.Vector3;
  t: number;
  fallSec: number;
  damage: number;
  done: boolean;
  knockdown: boolean;
  stunSec: number;
  knockbackMps: number;
  knockUpMps: number;
}

export class BossCinemaFx {
  readonly root = new THREE.Group();
  private scene: THREE.Scene;
  private worldFx: WorldFxBus | null;
  private rings: ShockwaveRing[] = [];
  private meteors: MeteorMarker[] = [];
  private pulseLight: THREE.PointLight | null = null;
  private intensity = 0.5;
  private phaseColor = new THREE.Color(0xcbd5e1);
  private t = 0;

  constructor(scene: THREE.Scene, worldFx: WorldFxBus | null = null) {
    this.scene = scene;
    this.worldFx = worldFx;
    this.root.name = 'BossCinemaFx';
    scene.add(this.root);
  }

  setWorldFx(fx: WorldFxBus | null): void {
    this.worldFx = fx;
  }

  setPhase(intensity: number, colorHex: number, bossPos: THREE.Vector3): void {
    this.intensity = intensity;
    this.phaseColor.setHex(colorHex);
    if (!this.pulseLight) {
      this.pulseLight = new THREE.PointLight(colorHex, 1.2 * intensity, 40);
      this.root.add(this.pulseLight);
    }
    this.pulseLight.color.copy(this.phaseColor);
    this.pulseLight.intensity = 0.8 + intensity * 1.6;
    this.pulseLight.position.copy(bossPos);
    this.pulseLight.position.y += 4;
  }

  /** Expanding ground ring (PIP shockwave feel). */
  spawnShockwave(
    origin: THREE.Vector3,
    maxRadius: number,
    damage: number,
    speed = 14,
    motion?: {
      knockdown?: boolean;
      stunSec?: number;
      knockbackMps?: number;
      knockUpMps?: number;
      innerSafe?: number;
    },
  ): void {
    const geo = new THREE.RingGeometry(0.4, 0.9, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(origin.x, origin.y + 0.12, origin.z);
    this.root.add(mesh);
    this.rings.push({
      mesh,
      radius: 0.5,
      maxRadius,
      speed,
      life: 0,
      maxLife: maxRadius / Math.max(1, speed) + 0.4,
      thickness: 1.5,
      damage,
      hitPlayers: new Set(),
      knockdown: motion?.knockdown ?? true,
      stunSec: motion?.stunSec ?? 0.4,
      knockbackMps: motion?.knockbackMps ?? 12,
      knockUpMps: motion?.knockUpMps ?? 4.5,
      origin: origin.clone(),
      innerSafe: motion?.innerSafe ?? 0,
    });
    try {
      this.worldFx?.spawn?.('attack_burst', {
        position: origin.clone(),
        burst: true,
        burstCount: 12,
      });
    } catch (err) {
      console.warn('[BossCinemaFx] shockwave burst skipped', err);
    }
  }

  /**
   * Instant full-disk AoE (ground slam impact) — hits everyone in radius once.
   * Also shows a brief flash ring for readability.
   */
  spawnAoeDisk(
    origin: THREE.Vector3,
    radius: number,
    damage: number,
    motion?: {
      knockdown?: boolean;
      stunSec?: number;
      knockbackMps?: number;
      knockUpMps?: number;
    },
  ): CinemaHitEvent[] {
    const geo = new THREE.RingGeometry(radius * 0.15, radius, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(origin.x, origin.y + 0.15, origin.z);
    this.root.add(mesh);
    const start = performance.now();
    const fade = () => {
      const u = (performance.now() - start) / 450;
      if (u >= 1) {
        this.root.remove(mesh);
        geo.dispose();
        mat.dispose();
        return;
      }
      mat.opacity = 0.65 * (1 - u);
      requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
    this.worldFx?.spawn?.('fire_burst' as any, {
      position: origin.clone(),
      burst: true,
      burstCount: 20,
    });
    // Caller tests player distance; return template for them
    return [
      {
        kind: 'aoe_disk',
        damage,
        pos: origin.clone(),
        origin: origin.clone(),
        knockdown: motion?.knockdown ?? true,
        stunSec: motion?.stunSec ?? 0.5,
        knockbackMps: motion?.knockbackMps ?? 11,
        knockUpMps: motion?.knockUpMps ?? 6,
      },
    ];
  }

  /** Sky rock/meteor with ground telegraph circle. */
  spawnMeteor(
    impact: THREE.Vector3,
    damage: number,
    fallSec = 1.35,
    motion?: {
      knockdown?: boolean;
      stunSec?: number;
      knockbackMps?: number;
      knockUpMps?: number;
    },
  ): void {
    const group = new THREE.Group();
    const mark = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.y = 0.1;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({
        color: 0x5c4033,
        emissive: 0xff4400,
        emissiveIntensity: 0.6,
        roughness: 0.9,
      }),
    );
    rock.position.y = 18;
    group.add(mark, rock);
    group.position.copy(impact);
    this.root.add(group);
    this.meteors.push({
      group,
      impact: impact.clone(),
      t: 0,
      fallSec,
      damage,
      done: false,
      knockdown: motion?.knockdown ?? true,
      stunSec: motion?.stunSec ?? 0.35,
      knockbackMps: motion?.knockbackMps ?? 7,
      knockUpMps: motion?.knockUpMps ?? 5,
    });
  }

  /** Electric burst sphere (stun telegraph). */
  spawnElectric(origin: THREE.Vector3, radius: number): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.35, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.45,
        wireframe: true,
      }),
    );
    mesh.position.copy(origin);
    mesh.position.y += 1.2;
    this.root.add(mesh);
    const start = performance.now();
    const tick = () => {
      const u = (performance.now() - start) / 900;
      if (u >= 1) {
        this.root.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        return;
      }
      mesh.scale.setScalar(1 + u * 2.2);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - u);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    this.worldFx?.spawn?.('smoke_puff' as any, {
      position: origin.clone(),
      burst: true,
      burstCount: 8,
    });
  }

  /** Beam sweep visual (two long boxes rotating). */
  spawnSweepBeams(origin: THREE.Vector3, range: number, facing: number): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(origin);
    g.position.y += 1.5;
    g.rotation.y = facing;
    for (const sign of [-1, 1]) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.35, range),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.55,
        }),
      );
      beam.position.z = -range * 0.5;
      beam.rotation.y = sign * 0.35;
      g.add(beam);
    }
    this.root.add(g);
    return g;
  }

  /**
   * Per-frame. Returns damage events for player at `playerPos`
   * with full knockback / stun payload.
   */
  update(
    dt: number,
    playerPos?: THREE.Vector3,
    playerId = 'local',
  ): CinemaHitEvent[] {
    this.t += dt;
    const hits: CinemaHitEvent[] = [];

    if (this.pulseLight) {
      this.pulseLight.intensity =
        (0.8 + this.intensity * 1.6) *
        (1 + Math.sin(this.t * (2 + this.intensity * 3)) * 0.15);
    }

    // Shockwave rings
    const liveRings: ShockwaveRing[] = [];
    for (const r of this.rings) {
      r.life += dt;
      r.radius = Math.min(r.maxRadius, r.radius + r.speed * dt);
      const s = Math.max(0.01, r.radius);
      r.mesh.scale.set(s, s, 1);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.75 * (1 - r.life / r.maxLife));

      if (playerPos) {
        const dx = playerPos.x - r.mesh.position.x;
        const dz = playerPos.z - r.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const band =
          dist >= Math.max(r.innerSafe, r.radius - r.thickness) &&
          dist <= r.radius + 0.45;
        if (band && !r.hitPlayers.has(playerId)) {
          r.hitPlayers.add(playerId);
          hits.push({
            kind: 'shockwave',
            damage: r.damage,
            pos: playerPos.clone(),
            origin: r.origin.clone(),
            knockdown: r.knockdown,
            stunSec: r.stunSec,
            knockbackMps: r.knockbackMps,
            knockUpMps: r.knockUpMps,
          });
        }
      }

      if (r.life < r.maxLife && r.radius < r.maxRadius + 0.5) {
        liveRings.push(r);
      } else {
        this.root.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
      }
    }
    this.rings = liveRings;

    // Meteors
    const liveM: MeteorMarker[] = [];
    for (const m of this.meteors) {
      m.t += dt;
      const u = Math.min(1, m.t / m.fallSec);
      const rock = m.group.children[1] as THREE.Mesh | undefined;
      if (rock) {
        rock.position.y = THREE.MathUtils.lerp(18, 0.5, u * u);
        rock.rotation.x += dt * 4;
        rock.rotation.z += dt * 3;
      }
      const mark = m.group.children[0] as THREE.Mesh | undefined;
      if (mark) {
        const pulse = 1 + Math.sin(m.t * 10) * 0.12;
        mark.scale.setScalar(pulse);
        (mark.material as THREE.MeshBasicMaterial).opacity = 0.35 + u * 0.4;
      }

      if (u >= 1 && !m.done) {
        m.done = true;
        if (playerPos && playerPos.distanceTo(m.impact) < 2.6) {
          hits.push({
            kind: 'meteor',
            damage: m.damage,
            pos: playerPos.clone(),
            origin: m.impact.clone(),
            knockdown: m.knockdown,
            stunSec: m.stunSec,
            knockbackMps: m.knockbackMps,
            knockUpMps: m.knockUpMps,
          });
        }
        this.worldFx?.spawn?.('fire_burst' as any, {
          position: m.impact.clone(),
          burst: true,
          burstCount: 16,
        });
        this.root.remove(m.group);
        m.group.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry?.dispose();
            const mat = o.material;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else (mat as THREE.Material)?.dispose?.();
          }
        });
      } else if (!m.done) {
        liveM.push(m);
      }
    }
    this.meteors = liveM;

    return hits;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
    this.rings = [];
    this.meteors = [];
  }
}
