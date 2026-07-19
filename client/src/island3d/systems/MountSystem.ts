/**
 * MountSystem — uMMORPG cavalry mounts on Three.js characters.
 *
 * CDN: models/vehicles/mounts/{race}/cavalry.glb
 * Catalog: assets.grudge-studio.com/models/ummorpg-vehicles-catalog.json
 * SSOT: shared/fleet/vehicles.ts + warlordsSystemsCatalog mounts
 *
 * Status: scaffold — load + attach; full input/locomotion wiring next.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RACE_VEHICLES,
  type VehicleRaceId,
  UMMORPG_VEHICLES_CATALOG_URL,
} from '@shared/fleet/vehicles';

export interface MountState {
  raceId: VehicleRaceId;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  mounted: boolean;
}

export class MountSystem {
  private loader = new GLTFLoader();
  private state: MountState | null = null;
  private scene: THREE.Scene;
  private rider: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get isMounted(): boolean {
    return !!this.state?.mounted;
  }

  get current(): MountState | null {
    return this.state;
  }

  /** Load race cavalry mount from CDN (does not auto-mount). */
  async loadMount(raceId: VehicleRaceId): Promise<MountState> {
    this.dispose();
    const def = RACE_VEHICLES[raceId]?.mount;
    if (!def) throw new Error(`No mount defined for race ${raceId}`);

    const gltf = await this.loader.loadAsync(def.cdnUrl);
    const root = new THREE.Group();
    root.name = `mount_${raceId}_cavalry`;
    root.add(gltf.scene);

    const mixer = gltf.animations.length
      ? new THREE.AnimationMixer(gltf.scene)
      : null;
    const actions = new Map<string, THREE.AnimationAction>();
    if (mixer) {
      for (const clip of gltf.animations) {
        actions.set(clip.name, mixer.clipAction(clip));
      }
      // Prefer idle-like clip
      const idle =
        actions.get('01_idle') ||
        [...actions.values()].find((a) => /idle/i.test(a.getClip().name));
      idle?.play();
    }

    root.visible = false;
    this.scene.add(root);

    this.state = { raceId, root, mixer, actions, mounted: false };
    return this.state;
  }

  /**
   * Attach rider to mount. rider should be the character root.
   * Bone attach uses catalog riderBone when present on mount skeleton.
   */
  mount(rider: THREE.Object3D, worldPosition?: THREE.Vector3): void {
    if (!this.state) throw new Error('loadMount() first');
    this.rider = rider;
    const { root } = this.state;
    root.visible = true;
    if (worldPosition) root.position.copy(worldPosition);

    const def = RACE_VEHICLES[this.state.raceId].mount!;
    // Simple parenting with Y offset (bone resolve is best-effort)
    let attach: THREE.Object3D = root;
    root.traverse((o) => {
      if (o.name === def.riderBone || o.name.includes('Bip001')) attach = o;
    });

    // Keep rider world scale; offset up on saddle
    rider.position.set(0, def.riderOffsetY, 0);
    attach.add(rider);
    this.state.mounted = true;

    const run =
      this.state.actions.get('03_run') ||
      [...this.state.actions.values()].find((a) => /run|walk/i.test(a.getClip().name));
    run?.reset().fadeIn(0.2).play();
  }

  dismount(worldPosition?: THREE.Vector3): void {
    if (!this.state || !this.rider) return;
    const rider = this.rider;
    const pos = worldPosition ?? new THREE.Vector3();
    if (!worldPosition) rider.getWorldPosition(pos);

    this.state.root.remove(rider);
    // Re-parent to scene
    this.scene.add(rider);
    rider.position.copy(pos);
    rider.position.y += 0.1;

    this.state.root.visible = false;
    this.state.mounted = false;
    this.rider = null;

    const idle = this.state.actions.get('01_idle');
    idle?.reset().fadeIn(0.2).play();
  }

  /** Play named anim if present (01_idle, 03_run, 10_death_B, …). */
  playAnim(name: string, fade = 0.15): void {
    if (!this.state) return;
    const next = this.state.actions.get(name);
    if (!next) return;
    for (const a of this.state.actions.values()) {
      if (a !== next && a.isRunning()) a.fadeOut(fade);
    }
    next.reset().fadeIn(fade).play();
  }

  update(dt: number): void {
    this.state?.mixer?.update(dt);
  }

  dispose(): void {
    if (this.state?.mounted && this.rider) {
      try {
        this.dismount();
      } catch {
        /* ignore */
      }
    }
    if (this.state) {
      this.scene.remove(this.state.root);
      this.state.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat.dispose());
        }
      });
    }
    this.state = null;
    this.rider = null;
  }

  /** Optional: refresh remote catalog (debug / hot reload). */
  static async fetchCatalog(): Promise<unknown> {
    const res = await fetch(UMMORPG_VEHICLES_CATALOG_URL);
    if (!res.ok) throw new Error(`Mount catalog HTTP ${res.status}`);
    return res.json();
  }
}
