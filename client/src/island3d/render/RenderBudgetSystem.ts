/**
 * RenderBudgetSystem — distance bands, frustum-aware visibility, and renderer
 * quality knobs so the island only pays for what the player can see.
 *
 * Tiers (from camera or player):
 *   NEAR   ≤ nearM     — full update, shadows, animations
 *   MID    ≤ midM      — visible, cheaper shadows, throttled AI
 *   FAR    ≤ farM      — visible, no shadows, rare AI tick
 *   CULLED > farM      — hidden, no update
 */
import * as THREE from 'three';
import type { QualityPreset } from './PostProcessing';

export type DistanceTier = 'near' | 'mid' | 'far' | 'culled';

export interface BudgetDistances {
  nearM: number;
  midM: number;
  farM: number;
  /** Directional shadow camera half-extent (meters) */
  shadowExtentM: number;
  /** Max device pixel ratio */
  maxPixelRatio: number;
  /** Update AI/anim for far tier every N frames */
  farUpdateEveryN: number;
}

const PRESET_DISTANCES: Record<QualityPreset, BudgetDistances> = {
  low: {
    nearM: 40,
    midM: 90,
    farM: 160,
    shadowExtentM: 80,
    maxPixelRatio: 1.25,
    farUpdateEveryN: 4,
  },
  medium: {
    nearM: 55,
    midM: 120,
    farM: 220,
    shadowExtentM: 120,
    maxPixelRatio: 1.5,
    farUpdateEveryN: 3,
  },
  high: {
    nearM: 80,
    midM: 180,
    farM: 320,
    shadowExtentM: 180,
    maxPixelRatio: 2,
    farUpdateEveryN: 2,
  },
};

export interface BudgetRegistration {
  id: string;
  /** Object whose visibility / matrix we manage */
  object: THREE.Object3D;
  /** Optional world position override (for groups whose origin is not the visual) */
  getPosition?: () => THREE.Vector3;
  /** Hide when culled (default true) */
  hideWhenCulled?: boolean;
  /** Disable castShadow past mid band (default true) */
  stripFarShadows?: boolean;
  /** Callback when tier changes */
  onTier?: (tier: DistanceTier) => void;
  /** Last computed tier */
  tier?: DistanceTier;
  /** Frame counter for throttling */
  frame?: number;
}

export class RenderBudgetSystem {
  readonly distances: BudgetDistances;
  private regs = new Map<string, BudgetRegistration>();
  private _tmp = new THREE.Vector3();
  private _frustum = new THREE.Frustum();
  private _projScreen = new THREE.Matrix4();
  private _sphere = new THREE.Sphere();
  private frame = 0;
  private origin = new THREE.Vector3();

  constructor(quality: QualityPreset = 'medium') {
    this.distances = { ...PRESET_DISTANCES[quality] ?? PRESET_DISTANCES.medium };
  }

  /** Apply quality to WebGLRenderer + sun shadow frustum. */
  applyToRenderer(
    renderer: THREE.WebGLRenderer,
    sun?: THREE.DirectionalLight | null,
  ): void {
    const d = this.distances;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, d.maxPixelRatio));
    // Prefer performance shadow type on low
    if (d.maxPixelRatio <= 1.25) {
      renderer.shadowMap.type = THREE.BasicShadowMap;
    } else {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = true;

    if (sun?.shadow?.camera) {
      const cam = sun.shadow.camera as THREE.OrthographicCamera;
      const e = d.shadowExtentM;
      cam.left = -e;
      cam.right = e;
      cam.top = e;
      cam.bottom = -e;
      cam.far = e * 3;
      cam.updateProjectionMatrix();
      const mapSize = d.maxPixelRatio <= 1.25 ? 1024 : d.maxPixelRatio <= 1.5 ? 2048 : 2048;
      sun.shadow.mapSize.set(mapSize, mapSize);
      sun.shadow.needsUpdate = true;
    }
  }

  /** Tighten fog so far culled content is not demanded by the skybox feel. */
  applyFog(scene: THREE.Scene, color = 0x87ceeb): void {
    const far = this.distances.farM;
    // Exp2 density ≈ visibility to far band
    const density = 1.2 / Math.max(far, 80);
    scene.fog = new THREE.FogExp2(color, density * 0.35);
  }

  register(reg: BudgetRegistration): void {
    this.regs.set(reg.id, { hideWhenCulled: true, stripFarShadows: true, frame: 0, ...reg });
  }

  unregister(id: string): void {
    this.regs.delete(id);
  }

  clear(): void {
    this.regs.clear();
  }

  setOrigin(x: number, y: number, z: number): void {
    this.origin.set(x, y, z);
  }

  getOrigin(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this.origin);
  }

  tierForDistance(dist: number): DistanceTier {
    const d = this.distances;
    if (dist <= d.nearM) return 'near';
    if (dist <= d.midM) return 'mid';
    if (dist <= d.farM) return 'far';
    return 'culled';
  }

  /**
   * Call once per frame with camera. Updates object visibility and shadow flags.
   * Returns counts for HUD/debug.
   */
  update(camera: THREE.Camera): {
    near: number;
    mid: number;
    far: number;
    culled: number;
    total: number;
  } {
    this.frame++;
    this._projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._projScreen);

    let near = 0;
    let mid = 0;
    let far = 0;
    let culled = 0;

    for (const reg of this.regs.values()) {
      const pos = reg.getPosition
        ? reg.getPosition()
        : reg.object.getWorldPosition(this._tmp);
      const dist = pos.distanceTo(this.origin);
      let tier = this.tierForDistance(dist);

      // Frustum: if fully outside and not near, cull early
      if (tier !== 'near' && tier !== 'culled') {
        // Cheap sphere test — use object radius if set, else 2m
        const radius = (reg.object.userData.budgetRadius as number) || 2;
        this._sphere.center.copy(pos);
        this._sphere.radius = radius;
        if (!this._frustum.intersectsSphere(this._sphere)) {
          tier = 'culled';
        }
      }

      if (tier !== reg.tier) {
        reg.tier = tier;
        reg.onTier?.(tier);
      }

      const hide = reg.hideWhenCulled !== false && tier === 'culled';
      reg.object.visible = !hide;

      if (reg.stripFarShadows !== false) {
        reg.object.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          // Keep shadows only in near band
          if (tier === 'near') {
            if (m.userData.wantCastShadow !== false) m.castShadow = !!m.userData.wantCastShadow || m.castShadow;
          } else {
            m.castShadow = false;
          }
        });
      }

      if (tier === 'near') near++;
      else if (tier === 'mid') mid++;
      else if (tier === 'far') far++;
      else culled++;
    }

    return { near, mid, far, culled, total: this.regs.size };
  }

  /** Whether a far-tier entity should run AI this frame. */
  shouldUpdateFar(regId: string): boolean {
    const reg = this.regs.get(regId);
    if (!reg) return true;
    if (reg.tier === 'near' || reg.tier === 'mid') return true;
    if (reg.tier === 'culled') return false;
    const n = this.distances.farUpdateEveryN;
    return this.frame % n === (reg.frame ?? 0) % n;
  }

  getTier(id: string): DistanceTier | undefined {
    return this.regs.get(id)?.tier;
  }

  get stats() {
    return {
      registered: this.regs.size,
      distances: this.distances,
      frame: this.frame,
    };
  }
}

/** Shared helper: horizontal distance ignoring Y. */
export function horizontalDistance(
  a: THREE.Vector3,
  b: THREE.Vector3,
): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}
