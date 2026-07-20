/**
 * SupernovaImpactSystem — spell/weapon hit impact orbs.
 * Prefers CDN mesh packs when available; otherwise emits a colored pulse sphere.
 */
import * as THREE from "three";
import {
  resolveSupernovaVariant,
  SUPERNOVA_VARIANTS,
  type SupernovaImpactVariant,
} from "@shared/definitions/supernovaImpactVfx";

export interface SupernovaImpactSpawnOpts {
  position: THREE.Vector3;
  variant?: SupernovaImpactVariant;
  school?: string;
  damageType?: string;
  vfxKey?: string;
  scale?: number;
}

type ActivePulse = {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  geo: THREE.BufferGeometry;
  age: number;
  duration: number;
};

export class SupernovaImpactSystem {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private active: ActivePulse[] = [];
  private camera: THREE.Camera | null = null;
  private ready = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = "supernova_impact_system";
    scene.add(this.root);
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  async preload(): Promise<void> {
    // Mesh pack preload hook — safe no-op until R2 packs ship
    this.ready = true;
  }

  spawn(opts: SupernovaImpactSpawnOpts): void {
    const variant = resolveSupernovaVariant({
      variant: opts.variant,
      school: opts.school,
      damageType: opts.damageType,
      vfxKey: opts.vfxKey,
    });
    const def = SUPERNOVA_VARIANTS[variant];
    const scale = opts.scale ?? 1;
    const radius = 0.55 * scale;

    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: def.hex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(opts.position);
    this.root.add(mesh);
    this.active.push({ mesh, mat, geo, age: 0, duration: 0.45 });
  }

  update(dt: number): void {
    const still: ActivePulse[] = [];
    for (const p of this.active) {
      p.age += dt;
      const t = p.age / p.duration;
      if (t >= 1) {
        this.root.remove(p.mesh);
        p.geo.dispose();
        p.mat.dispose();
        continue;
      }
      p.mesh.scale.setScalar(1 + t * 2.2);
      p.mat.opacity = 0.65 * (1 - t);
      if (this.camera) {
        p.mesh.lookAt(this.camera.position);
      }
      still.push(p);
    }
    this.active = still;
  }

  dispose(): void {
    for (const p of this.active) {
      this.root.remove(p.mesh);
      p.geo.dispose();
      p.mat.dispose();
    }
    this.active = [];
    this.scene.remove(this.root);
  }
}

let singleton: SupernovaImpactSystem | null = null;

export function getSupernovaImpactSystem(): SupernovaImpactSystem | null {
  return singleton;
}

export function setSupernovaImpactSystem(sys: SupernovaImpactSystem | null): void {
  singleton = sys;
}

export function spawnSupernovaImpact(opts: SupernovaImpactSpawnOpts): void {
  singleton?.spawn(opts);
}
