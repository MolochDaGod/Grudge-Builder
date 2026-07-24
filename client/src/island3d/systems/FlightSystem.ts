/**
 * FlightSystem — flying mounts / gliders (planned CDN packs).
 *
 * CDN: models/vehicles/flight/{griffin|wyvern|glider}/
 * Status: scaffold — altitude + stamina; mesh packs not all on CDN yet.
 *
 * Ethereal Falls destruction half: surface physics break, but **flight is exempt**
 * (see EtherealDestructionSystem + etherealDestructionZone.flightExempt).
 * Flying mounts / airborne players remain controllable while water + islands
 * drift toward the Cosmic Waterfall tip.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { r2CdnUrl } from '@shared/fleet/r2Layout';

export type FlightMountId = 'griffin' | 'wyvern' | 'glider';

export interface FlightConfig {
  id: FlightMountId;
  /** Max altitude above terrain sample (m) */
  maxAltitude: number;
  /** Climb rate m/s */
  climbRate: number;
  /** Horizontal speed m/s */
  speed: number;
  /** Stamina drain per second while climbing */
  staminaDrain: number;
  /** Stamina max */
  staminaMax: number;
  glbUrl: string;
}

export const FLIGHT_MOUNTS: Record<FlightMountId, FlightConfig> = {
  griffin: {
    id: 'griffin',
    maxAltitude: 120,
    climbRate: 8,
    speed: 18,
    staminaDrain: 12,
    staminaMax: 100,
    glbUrl: r2CdnUrl('models/vehicles/flight/griffin/mount.glb'),
  },
  wyvern: {
    id: 'wyvern',
    maxAltitude: 160,
    climbRate: 10,
    speed: 22,
    staminaDrain: 15,
    staminaMax: 100,
    glbUrl: r2CdnUrl('models/vehicles/flight/wyvern/mount.glb'),
  },
  glider: {
    id: 'glider',
    maxAltitude: 80,
    climbRate: 3,
    speed: 14,
    staminaDrain: 6,
    staminaMax: 80,
    glbUrl: r2CdnUrl('models/vehicles/flight/glider/mount.glb'),
  },
};

export class FlightSystem {
  private scene: THREE.Scene;
  private loader = new GLTFLoader();
  private config: FlightConfig | null = null;
  private root: THREE.Group | null = null;
  private flying = false;
  private altitude = 0;
  private stamina = 100;
  private velocity = new THREE.Vector3();
  /** Optional world zones where flight is disabled */
  noFlyZones: Array<{ center: THREE.Vector3; radius: number }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get isFlying(): boolean {
    return this.flying;
  }

  get stamina01(): number {
    if (!this.config) return 0;
    return this.stamina / this.config.staminaMax;
  }

  async load(id: FlightMountId): Promise<void> {
    this.disposeMesh();
    this.config = FLIGHT_MOUNTS[id];
    this.stamina = this.config.staminaMax;
    const root = new THREE.Group();
    root.name = `flight_${id}`;
    try {
      const gltf = await this.loader.loadAsync(this.config.glbUrl);
      root.add(gltf.scene);
    } catch {
      // Placeholder wing disc until CDN pack exists
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.2 }),
      );
      root.add(mesh);
    }
    root.visible = false;
    this.scene.add(root);
    this.root = root;
  }

  takeOff(origin: THREE.Vector3): boolean {
    if (!this.config || !this.root) return false;
    if (this.inNoFly(origin)) return false;
    this.flying = true;
    this.altitude = 5;
    this.root.visible = true;
    this.root.position.copy(origin);
    this.root.position.y += this.altitude;
    return true;
  }

  land(groundY: number): void {
    if (!this.root) return;
    this.flying = false;
    this.root.position.y = groundY;
    this.root.visible = false;
    this.altitude = 0;
  }

  /**
   * @param input.forward -1..1
   * @param input.strafe -1..1
   * @param input.climb -1..1 (space/ctrl)
   * @param facing yaw radians
   * @param groundY terrain sample under flyer
   */
  update(
    dt: number,
    input: { forward: number; strafe: number; climb: number },
    facing: number,
    groundY: number,
  ): void {
    if (!this.flying || !this.config || !this.root) return;

    const cfg = this.config;
    const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    this.velocity.set(0, 0, 0);
    this.velocity.addScaledVector(forward, input.forward * cfg.speed);
    this.velocity.addScaledVector(right, input.strafe * cfg.speed * 0.7);

    let climb = input.climb * cfg.climbRate;
    if (climb > 0) {
      this.stamina = Math.max(0, this.stamina - cfg.staminaDrain * dt);
      if (this.stamina <= 0) climb = Math.min(climb, -2); // stall sink
    } else {
      this.stamina = Math.min(cfg.staminaMax, this.stamina + cfg.staminaDrain * 0.4 * dt);
    }

    this.altitude = THREE.MathUtils.clamp(
      this.altitude + climb * dt,
      2,
      cfg.maxAltitude,
    );

    this.root.position.x += this.velocity.x * dt;
    this.root.position.z += this.velocity.z * dt;
    this.root.position.y = groundY + this.altitude;
    this.root.rotation.y = facing;

    if (this.inNoFly(this.root.position)) {
      this.land(groundY);
    }
  }

  private inNoFly(pos: THREE.Vector3): boolean {
    return this.noFlyZones.some((z) => pos.distanceTo(z.center) < z.radius);
  }

  private disposeMesh(): void {
    if (this.root) {
      this.scene.remove(this.root);
      this.root = null;
    }
  }

  dispose(): void {
    this.disposeMesh();
    this.config = null;
    this.flying = false;
  }
}
