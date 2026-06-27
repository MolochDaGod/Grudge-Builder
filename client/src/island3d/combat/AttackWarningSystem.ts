/**
 * AttackWarningSystem — GLB telegraphs for incoming / cone / AoE attacks.
 *
 * Models: warning_01 (incoming), warning_02 (cone arc), warning_03 (ground AoE).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from '@/lib/assetConfig';
import type { AttackPattern } from '@shared/definitions/orcWarriorBoss';

export type WarningVariant = 'incoming' | 'cone' | 'aoe';

export const WARNING_MODEL_PATHS: Record<WarningVariant, string> = {
  incoming: '/models/vfx/warning_01.glb',
  cone: '/models/vfx/warning_02.glb',
  aoe: '/models/vfx/warning_03.glb',
};

export interface AttackTelegraphState {
  id: string;
  variant: WarningVariant;
  position: THREE.Vector3;
  facing: number;
  range: number;
  arc: number;
  totalSec: number;
  remainingSec: number;
  progress: number;
}

const templateCache = new Map<WarningVariant, THREE.Group>();
const loader = new GLTFLoader();

function prepareWarningMesh(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const m = mat as THREE.MeshStandardMaterial;
      m.transparent = true;
      m.depthWrite = false;
      m.emissive = new THREE.Color(0xff2200);
      m.emissiveIntensity = 1.2;
      m.color = new THREE.Color(0xff4422);
      m.opacity = 0.55;
      m.side = THREE.DoubleSide;
    }
  });
}

async function loadTemplate(variant: WarningVariant): Promise<THREE.Group> {
  const cached = templateCache.get(variant);
  if (cached) return cached;

  const gltf = await loader.loadAsync(assetUrl(WARNING_MODEL_PATHS[variant]));
  const template = gltf.scene as THREE.Group;
  prepareWarningMesh(template);
  templateCache.set(variant, template);
  return template;
}

/** Map boss attack geometry to the best warning decal variant. */
export function pickWarningVariant(attack: AttackPattern): WarningVariant {
  if (attack.arc >= Math.PI * 1.6 || attack.id.includes('slam') || attack.id.includes('leap')) {
    return 'aoe';
  }
  if (attack.range >= 12 || attack.id.includes('bow') || attack.id.includes('shot')) {
    return 'incoming';
  }
  return 'cone';
}

interface ActiveWarning {
  group: THREE.Group;
  variant: WarningVariant;
  baseScale: number;
}

export class AttackWarningSystem {
  private readonly warnings = new Map<string, ActiveWarning>();
  private loaded = false;

  constructor(private readonly scene: THREE.Scene) {}

  async preload(): Promise<void> {
    await Promise.all(
      (Object.keys(WARNING_MODEL_PATHS) as WarningVariant[]).map((v) => loadTemplate(v)),
    );
    this.loaded = true;
  }

  /**
   * Show or update a telegraph warning. Re-call each frame while telegraphing.
   */
  showTelegraph(state: AttackTelegraphState): void {
    if (!this.loaded) return;

    let active = this.warnings.get(state.id);
    if (!active) {
      const template = templateCache.get(state.variant);
      if (!template) return;

      const group = template.clone(true);
      group.name = `attack_warning_${state.id}`;
      this.scene.add(group);
      active = { group, variant: state.variant, baseScale: 1 };
      this.warnings.set(state.id, active);
    }

    const { group, variant } = active;
    const groundY = state.position.y + 0.08;
    group.position.set(state.position.x, groundY, state.position.z);
    group.rotation.set(-Math.PI / 2, 0, state.facing);

    const rangeScale = Math.max(0.8, state.range);
    let sx = rangeScale;
    let sy = rangeScale;
    let sz = rangeScale;

    if (variant === 'cone') {
      const arcFactor = Math.max(0.35, state.arc / Math.PI);
      sx = rangeScale * 1.1;
      sy = rangeScale * arcFactor * 1.4;
      group.rotation.order = 'YXZ';
      group.rotation.set(-Math.PI / 2, state.facing, 0);
    } else if (variant === 'incoming') {
      sx = Math.max(1.2, state.range * 0.15);
      sy = sx;
      group.rotation.order = 'YXZ';
      group.rotation.set(-Math.PI / 2, state.facing, 0);
      group.position.y = groundY + 0.4;
    } else {
      sx = rangeScale * 2;
      sy = rangeScale * 2;
    }

    const pulse = 0.85 + state.progress * 0.35 + Math.sin(state.progress * Math.PI * 8) * 0.08;
    group.scale.set(sx * pulse, sz * pulse, sy * pulse);

    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const m = mat as THREE.MeshStandardMaterial;
        m.opacity = 0.25 + state.progress * 0.55;
        const heat = state.progress;
        m.emissive.setRGB(1, 0.35 - heat * 0.2, 0);
        m.emissiveIntensity = 0.8 + heat * 1.4;
      }
    });
  }

  hide(id: string): void {
    const active = this.warnings.get(id);
    if (!active) return;
    this.scene.remove(active.group);
    active.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.warnings.delete(id);
  }

  hideAll(): void {
    for (const id of [...this.warnings.keys()]) this.hide(id);
  }

  update(_dt: number): void {
    // Per-frame pulse handled via showTelegraph progress
  }

  dispose(): void {
    this.hideAll();
    for (const template of templateCache.values()) {
      template.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
    templateCache.clear();
    this.loaded = false;
  }
}