/**
 * Cartoonish-flame leftover burns — DoT stacks on platforms / cone marks /
 * projectile impacts. One compact clone per patch (not 1500-mesh dumps).
 */
import * as THREE from 'three';
import { LAVA_CAESAR_LOAD } from '@shared/definitions/lavaCaesarBossFight';
import { loadAssetGltf, cloneGltfScene } from '@/lib/three/SharedGltfPipeline';

export interface FlamePatch {
  root: THREE.Group;
  pos: THREE.Vector3;
  radius: number;
  life: number;
  maxLife: number;
  stacks: number;
  kind: 'disk' | 'cone';
}

export interface FlameTickHit {
  stacks: number;
  dps: number;
  pos: THREE.Vector3;
}

function compactFlame(src: THREE.Object3D, maxMeshes = 8): THREE.Group {
  const meshes: THREE.Mesh[] = [];
  src.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry) meshes.push(o);
  });
  meshes.sort((a, b) => {
    const va = a.geometry.getAttribute('position')?.count ?? 0;
    const vb = b.geometry.getAttribute('position')?.count ?? 0;
    return vb - va;
  });
  const g = new THREE.Group();
  g.name = 'FlameCompact';
  for (const m of meshes.slice(0, maxMeshes)) {
    const c = m.clone();
    c.matrix.copy(m.matrixWorld);
    c.matrix.decompose(c.position, c.quaternion, c.scale);
    g.add(c);
  }
  if (!g.children.length) {
    g.add(
      new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.2, 8, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0xff6a00,
          emissive: 0xff3d00,
          emissiveIntensity: 1.3,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
        }),
      ),
    );
  }
  return g;
}

export class LavaFlamePatchSystem {
  private scene: THREE.Scene;
  private template: THREE.Group | null = null;
  private mixerTpl: THREE.AnimationClip | null = null;
  private patches: FlamePatch[] = [];
  private tickAcc = 0;
  readonly dpsPerStack: number;
  readonly maxStacks: number;
  readonly tickSec: number;

  constructor(
    scene: THREE.Scene,
    opts?: { dpsPerStack?: number; maxStacks?: number; tickSec?: number },
  ) {
    this.scene = scene;
    this.dpsPerStack = opts?.dpsPerStack ?? 18;
    this.maxStacks = opts?.maxStacks ?? 5;
    this.tickSec = opts?.tickSec ?? 0.5;
  }

  async preload(): Promise<void> {
    for (const url of LAVA_CAESAR_LOAD.flame) {
      const gltf = await loadAssetGltf(url, 'low');
      if (!gltf?.scene) continue;
      this.template = compactFlame(gltf.scene);
      this.mixerTpl = gltf.animations[0] ?? null;
      return;
    }
  }

  spawnDisk(at: THREE.Vector3, radius = 2.4, life = 6.5): void {
    this.spawn(at, radius, life, 'disk');
  }

  spawnCone(origin: THREE.Vector3, facing: number, range: number, arc: number, life = 5.5): void {
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const r = range * t;
      const spread = (arc * 0.5) * t;
      for (const s of [-1, 0, 1]) {
        const ang = facing + s * spread * 0.65;
        const p = new THREE.Vector3(
          origin.x + Math.sin(ang) * r,
          origin.y,
          origin.z + Math.cos(ang) * r,
        );
        this.spawn(p, 1.4 + t, life, 'cone');
      }
    }
  }

  private spawn(at: THREE.Vector3, radius: number, life: number, kind: FlamePatch['kind']): void {
    const root = new THREE.Group();
    root.name = `FlamePatch_${kind}`;
    if (this.template) {
      const mesh = this.template.clone(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const s = (radius * 2) / Math.max(size.x, size.y, size.z, 0.2);
      mesh.scale.multiplyScalar(s);
      root.add(mesh);
    }
    root.position.copy(at);
    root.position.y += 0.12;
    this.scene.add(root);
    this.patches.push({
      root,
      pos: at.clone(),
      radius,
      life,
      maxLife: life,
      stacks: 1,
      kind,
    });
  }

  /** Overlap patches stack. Returns DoT hits this tick. */
  update(dt: number, bodies: THREE.Vector3[]): FlameTickHit[] {
    for (const p of this.patches) {
      p.life -= dt;
      p.root.rotation.y += dt * 2.2;
      const fade = Math.max(0.15, p.life / p.maxLife);
      p.root.scale.setScalar(0.85 + 0.2 * Math.sin(p.life * 8));
      p.root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const m = o.material as THREE.MeshStandardMaterial;
          if (m.opacity != null) m.opacity = fade;
        }
      });
    }
    this.patches = this.patches.filter((p) => {
      if (p.life > 0) return true;
      this.scene.remove(p.root);
      return false;
    });

    this.tickAcc += dt;
    if (this.tickAcc < this.tickSec) return [];
    this.tickAcc = 0;
    const hits: FlameTickHit[] = [];
    for (const b of bodies) {
      let stacks = 0;
      let pos = b;
      for (const p of this.patches) {
        if (b.distanceTo(p.pos) <= p.radius + 0.4) {
          stacks = Math.min(this.maxStacks, stacks + p.stacks);
          pos = p.pos;
        }
      }
      if (stacks > 0) {
        hits.push({ stacks, dps: this.dpsPerStack * stacks, pos });
      }
    }
    return hits;
  }

  dispose(): void {
    for (const p of this.patches) this.scene.remove(p.root);
    this.patches.length = 0;
  }
}
