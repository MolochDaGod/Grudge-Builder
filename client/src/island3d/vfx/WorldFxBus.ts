/**
 * WorldFxBus — scene-level fire/smoke/teleport/dash emitters.
 * Attach once per Island3DEngine scene; call update(dt) each frame.
 */
import * as THREE from 'three';
import {
  createParticleEmitter,
  type FxPresetId,
  type ParticleEmitter,
} from './FireSmokeParticles';

export class WorldFxBus {
  readonly root = new THREE.Group();
  private emitters: ParticleEmitter[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = 'world_fx_bus';
    scene.add(this.root);
  }

  /** Continuous or burst emitter at a world position (or attached to object). */
  spawn(
    preset: FxPresetId,
    opts?: {
      position?: THREE.Vector3;
      attachTo?: THREE.Object3D;
      localOffset?: THREE.Vector3;
      burst?: boolean;
      burstCount?: number;
    },
  ): ParticleEmitter {
    const em = createParticleEmitter({
      scene: this.root,
      preset,
      position: opts?.position,
      attachTo: opts?.attachTo,
      localOffset: opts?.localOffset,
      autoRemove: !FX_IS_CONTINUOUS(preset) || opts?.burst === true,
    });
    if (opts?.burst || !FX_IS_CONTINUOUS(preset)) {
      em.burst(opts?.burstCount);
      em.stop(); // continuous false after burst
    }
    this.emitters.push(em);
    return em;
  }

  /** Fire + smoke stack for damaged boats */
  attachBoatDamage(shipRoot: THREE.Object3D, intensity: 'damaged' | 'sunk' = 'damaged'): void {
    // Remove prior boat fx on this root
    this.detachFrom(shipRoot);
    const y = intensity === 'sunk' ? 0.5 : 2.2;
    const fire = this.spawn('boat_fire', {
      attachTo: shipRoot,
      localOffset: new THREE.Vector3(0, y, 0),
    });
    const smoke = this.spawn('boat_smoke', {
      attachTo: shipRoot,
      localOffset: new THREE.Vector3(0.5, y + 0.8, 0),
    });
    (shipRoot as any).userData = (shipRoot as any).userData || {};
    shipRoot.userData.boatFx = [fire, smoke];
    if (intensity === 'sunk') {
      // heavier smoke, less fire
      fire.stop();
    }
  }

  /** Warm campfire at world position or attach */
  attachCampfire(target: THREE.Object3D | THREE.Vector3): ParticleEmitter {
    if (target instanceof THREE.Vector3) {
      return this.spawn('campfire', { position: target });
    }
    return this.spawn('campfire', {
      attachTo: target,
      localOffset: new THREE.Vector3(0, 0.4, 0),
    });
  }

  attackBurst(at: THREE.Vector3): void {
    this.spawn('attack_burst', { position: at, burst: true, burstCount: 24 });
  }

  teleportSmoke(at: THREE.Vector3): void {
    this.spawn('teleport_smoke', { position: at, burst: true, burstCount: 36 });
  }

  /** Foot dust/smoke on dash impact — left + right offset */
  dashFootSmoke(feetWorld: THREE.Vector3, facingYaw = 0): void {
    const side = new THREE.Vector3(Math.cos(facingYaw), 0, -Math.sin(facingYaw));
    const left = feetWorld.clone().addScaledVector(side, -0.18);
    const right = feetWorld.clone().addScaledVector(side, 0.18);
    left.y += 0.05;
    right.y += 0.05;
    this.spawn('dash_foot', { position: left, burst: true, burstCount: 10 });
    this.spawn('dash_foot', { position: right, burst: true, burstCount: 10 });
  }

  detachFrom(obj: THREE.Object3D): void {
    const list = obj.userData?.boatFx as ParticleEmitter[] | undefined;
    if (list) {
      for (const em of list) {
        em.dispose();
        this.emitters = this.emitters.filter((e) => e !== em);
      }
      delete obj.userData.boatFx;
    }
  }

  update(dt: number): void {
    const still: ParticleEmitter[] = [];
    for (const em of this.emitters) {
      em.update(dt);
      // disposed emitters remove themselves from parent — drop if no parent
      if (em.root.parent) still.push(em);
    }
    this.emitters = still;
  }

  dispose(): void {
    for (const em of this.emitters) em.dispose();
    this.emitters = [];
    this.scene.remove(this.root);
  }
}

function FX_IS_CONTINUOUS(id: FxPresetId): boolean {
  return (
    id === 'fire' ||
    id === 'smoke' ||
    id === 'campfire' ||
    id === 'boat_fire' ||
    id === 'boat_smoke'
  );
}

/** Global weak map so sailing / zone code can reach the bus without prop drilling */
let _bus: WorldFxBus | null = null;

export function setWorldFxBus(bus: WorldFxBus | null): void {
  _bus = bus;
}

export function getWorldFxBus(): WorldFxBus | null {
  return _bus;
}
