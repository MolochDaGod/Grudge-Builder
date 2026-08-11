/**
 * CastingMaster — fleet-facing API merging Linear skillshots + Casting path/VFX
 * into island3d WorldFxBus + SpellFxSystem on three-layer islands.
 *
 * Full procedural GLSL abilities live under ./skillshot (vendored).
 * This class always works with lightweight SpellFx fallbacks when full
 * AbilityManager context (particles/decals pools) is not mounted.
 */
import * as THREE from "three";
import {
  planMasterCast,
  LINEAR_SHOT_META,
  PRODUCT_TO_LINEAR,
  type ElementalCastPlan,
  type LinearSkillshotId,
  CASTING_MASTER_VERSION,
  getMasterContract,
} from "@shared/casting/masterCatalog";
import type { WorldFxBus } from "../vfx/WorldFxBus";
import type { SpellFxSystem } from "../vfx/SpellFxSystem";

export interface CastingMasterOpts {
  scene: THREE.Scene;
  worldFx?: WorldFxBus | null;
  spellFx?: SpellFxSystem | null;
  /** Optional full linear bridge (when skillshot AbilityManager is wired) */
  linearCast?: (
    id: LinearSkillshotId,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    distance: number,
  ) => void;
  getHeight?: (x: number, z: number) => number;
}

export interface CastRequest {
  skill?: {
    id?: string;
    label?: string;
    element?: string;
    pathMode?: string;
    skillKind?: string;
    isFocus?: boolean;
    isWard?: boolean;
    vfxEffectId?: string;
  };
  /** Direct linear id override */
  linearId?: LinearSkillshotId;
  origin: THREE.Vector3;
  /** Flat aim direction (normalized) */
  direction?: THREE.Vector3;
  /** Aim point (zone) or far point (line) */
  aim?: THREE.Vector3;
  distance?: number;
  intensity?: number;
  focusCombat?: boolean;
  pathDrawn?: boolean;
  casterId?: string;
}

export class CastingMaster {
  readonly version = CASTING_MASTER_VERSION;
  private scene: THREE.Scene;
  private worldFx: WorldFxBus | null;
  private spellFx: SpellFxSystem | null;
  private linearCast?: CastingMasterOpts["linearCast"];
  private getHeight?: (x: number, z: number) => number;
  private tmp = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();
  private activeRibbons: Array<{
    mesh: THREE.Object3D;
    life: number;
    max: number;
  }> = [];

  constructor(opts: CastingMasterOpts) {
    this.scene = opts.scene;
    this.worldFx = opts.worldFx ?? null;
    this.spellFx = opts.spellFx ?? null;
    this.linearCast = opts.linearCast;
    this.getHeight = opts.getHeight;
  }

  getContract() {
    return getMasterContract();
  }

  /** Plan only — for UI / info codex */
  plan(req: CastRequest): ElementalCastPlan {
    if (req.linearId) {
      const meta = LINEAR_SHOT_META[req.linearId];
      return {
        element: meta.productElements[0] || req.linearId,
        linearId: req.linearId,
        linearShape: meta.shape,
        layers: [
          meta.shape === "zone" ? "linear_zone" : "linear_line",
          "spell_fx",
          "supernova_impact",
        ],
        useLinear: true,
        usePathAbility: false,
        useMeshDelivery: false,
        useSpellFx: true,
        intensity: req.intensity ?? 1,
        learn: meta.description,
        vfxEffectId:
          req.linearId === "meteor"
            ? "fireball"
            : req.linearId === "ice"
              ? "frost_wave"
              : req.linearId === "beam"
                ? "moon_beam"
                : "arcane_swirl",
      };
    }
    return planMasterCast(req.skill || { element: "arcane" }, {
      focusCombat: req.focusCombat,
      pathDrawn: req.pathDrawn,
      intensity: req.intensity,
    });
  }

  /**
   * Execute a cast: linear (full or lightweight), spell FX, world impact.
   */
  cast(req: CastRequest): ElementalCastPlan {
    const plan = this.plan(req);
    const origin = req.origin.clone();
    // Plant on heightfield when available
    if (this.getHeight) {
      origin.y = this.getHeight(origin.x, origin.z) + 0.05;
    }

    let dir = (req.direction || new THREE.Vector3(0, 0, 1)).clone();
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    else dir.normalize();

    let distance = req.distance ?? 12;
    if (req.aim) {
      this.tmp.copy(req.aim).sub(origin);
      this.tmp.y = 0;
      distance = Math.max(2, Math.min(40, this.tmp.length()));
      if (this.tmp.lengthSq() > 1e-6) dir.copy(this.tmp).normalize();
    }

    // Linear skillshot
    if (plan.useLinear && plan.linearId) {
      if (this.linearCast) {
        this.linearCast(plan.linearId, origin, dir, distance);
      } else {
        this.lightweightLinear(plan.linearId, origin, dir, distance, plan.intensity);
      }
    }

    // Spell FX (lava wall / flame slash patterns already in SpellFxSystem)
    if (plan.useSpellFx && this.spellFx) {
      if (plan.element === "fire" || plan.linearId === "meteor") {
        this.spellFx.castFlameWall({
          center: origin,
          radius: 2.4 * plan.intensity,
          duration: 1.4,
          casterId: req.casterId,
        });
      } else if (plan.linearId === "beam" || plan.element === "holy" || plan.element === "storm") {
        const end = origin.clone().addScaledVector(dir, distance);
        this.spellFx.castBladeSlash({
          bladeWorld: origin.clone().add(new THREE.Vector3(0, 1.1, 0)),
          targetWorld: end,
          duration: plan.linearId === "beam" ? 1.1 : 0.65,
        });
      }
    }

    // Impact at far point
    const impact = origin.clone().addScaledVector(dir, distance * 0.92);
    if (this.getHeight) {
      impact.y = this.getHeight(impact.x, impact.z) + 0.1;
    } else {
      impact.y = origin.y + 0.2;
    }

    if (this.worldFx) {
      this.worldFx.spellImpact(impact, {
        school: plan.element,
        damageType: plan.element,
        vfxKey: plan.vfxEffectId,
        scale: 0.8 + plan.intensity * 0.4,
        withParticles: true,
      });
      // Buff / channel: particle tell at origin (full aura needs attachTo mesh)
      if (plan.layers.includes("buff")) {
        this.worldFx.spawn("attack_burst", {
          position: origin.clone().add(new THREE.Vector3(0, 1.1, 0)),
          burst: true,
          burstCount: 20,
        });
      }
    }

    return plan;
  }

  /** Fire by product element name */
  castElement(
    element: string,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    opts?: Partial<CastRequest>,
  ): ElementalCastPlan {
    const linearId = (PRODUCT_TO_LINEAR[element] || undefined) as
      | LinearSkillshotId
      | undefined;
    return this.cast({
      ...opts,
      skill: { element, ...(opts?.skill || {}) },
      linearId: opts?.linearId || linearId,
      origin,
      direction,
    });
  }

  update(dt: number): void {
    for (let i = this.activeRibbons.length - 1; i >= 0; i--) {
      const r = this.activeRibbons[i];
      r.life += dt;
      const t = r.life / r.max;
      r.mesh.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (m && "opacity" in m) {
          m.opacity = Math.max(0, 1 - t);
          m.transparent = true;
        }
      });
      if (r.life >= r.max) {
        this.scene.remove(r.mesh);
        r.mesh.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        });
        this.activeRibbons.splice(i, 1);
      }
    }
  }

  /**
   * Lightweight line/zone VFX when full AbilityManager not mounted —
   * still reads Linear meta (colors, shapes) for correct skill identity.
   */
  private lightweightLinear(
    id: LinearSkillshotId,
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    distance: number,
    intensity: number,
  ): void {
    const meta = LINEAR_SHOT_META[id];
    const color = new THREE.Color(meta.color);
    const group = new THREE.Group();
    group.name = `cast_linear_${id}`;

    if (meta.shape === "line") {
      const len = distance;
      const geo = new THREE.CylinderGeometry(0.08 * intensity, 0.18 * intensity, len, 8, 1, true);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const beam = new THREE.Mesh(geo, mat);
      beam.position.copy(origin).addScaledVector(dir, len * 0.5);
      beam.position.y += 0.4;
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      group.add(beam);

      // core
      const coreGeo = new THREE.CylinderGeometry(0.03, 0.05, len, 6, 1, true);
      coreGeo.rotateX(Math.PI / 2);
      const core = new THREE.Mesh(
        coreGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      core.position.copy(beam.position);
      core.quaternion.copy(beam.quaternion);
      group.add(core);
    } else {
      // zone circle
      const r = Math.min(8, Math.max(2.5, distance * 0.35)) * intensity;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.85, r, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const target = origin.clone().addScaledVector(dir, distance);
      if (this.getHeight) target.y = this.getHeight(target.x, target.z) + 0.08;
      else target.y = origin.y + 0.05;
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(target);
      group.add(ring);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.45, 3 * intensity, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      pillar.position.copy(target);
      pillar.position.y += 1.5 * intensity;
      group.add(pillar);
    }

    this.scene.add(group);
    this.activeRibbons.push({
      mesh: group,
      life: 0,
      max: id === "beam" ? 1.6 : 1.1,
    });
  }

  dispose(): void {
    for (const r of this.activeRibbons) {
      this.scene.remove(r.mesh);
    }
    this.activeRibbons.length = 0;
  }
}
