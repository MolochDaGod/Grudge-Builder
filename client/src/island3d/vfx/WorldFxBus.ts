/**
 * WorldFxBus — scene-level fire/smoke/teleport/dash emitters.
 * Attach once per Island3DEngine scene; call update(dt) each frame.
 * Supernova impact orbs (spell / weapon skill hits) via SupernovaImpactSystem.
 *
 * Also hosts CodePen KwaNNap smoke / barrel / trail / steam systems
 * (https://codepen.io/MolochDaGod/pen/KwaNNap) for fleet-consistent plumes.
 */
import * as THREE from 'three';
import {
  createParticleEmitter,
  FX_PRESETS,
  type FxPresetId,
  type ParticleEmitter,
} from './FireSmokeParticles';
import {
  SupernovaImpactSystem,
  setSupernovaImpactSystem,
  type SupernovaImpactSpawnOpts,
} from './SupernovaImpactSystem';
import type { SupernovaImpactVariant } from '@shared/definitions/supernovaImpactVfx';
import { SUPERNOVA_VARIANTS } from '@shared/definitions/supernovaImpactVfx';
import {
  createCodepenPresetEmitter,
  spawnTrailRibbon,
  type CodepenEmitterHandle,
  type CodepenPresetId,
  CODEPEN_SOURCE,
} from './CodepenParticleFx';
import {
  DragonKoiCastAuraSystem,
  type DragonKoiCastOpts,
} from './DragonKoiCastAura';
import { CastingMaster, type CastRequest } from '../casting/CastingMaster';
import type { SpellFxSystem } from './SpellFxSystem';

export class WorldFxBus {
  readonly root = new THREE.Group();
  private emitters: ParticleEmitter[] = [];
  /** CodePen-style smoke/fire/steam/barrel emitters */
  private codepenEmitters: CodepenEmitterHandle[] = [];
  private trails: Array<{ update: (dt: number) => boolean; dispose: () => void }> = [];
  private scene: THREE.Scene;
  /** Spell / weapon skill impact pack (4 color variants) */
  readonly supernova: SupernovaImpactSystem;
  /** Surrounding cast auras (dragon_koi multipack, multi color/opacity/shader) */
  readonly dragonKoiCast: DragonKoiCastAuraSystem;
  /**
   * Master casting orchestrator (Linear skillshots + Casting path/VFX).
   * Wired after SpellFxSystem is available via `attachCastingMaster`.
   */
  casting: CastingMaster | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = 'world_fx_bus';
    scene.add(this.root);
    this.supernova = new SupernovaImpactSystem(scene);
    setSupernovaImpactSystem(this.supernova);
    this.dragonKoiCast = new DragonKoiCastAuraSystem(scene);
    // Preload large pack in background so first skill hit isn't cold
    void this.supernova.preload();
    void this.dragonKoiCast.preload();
  }

  /**
   * Attach CastingMaster (Linear + CastingAbilities mastered stack).
   * Call once after SpellFxSystem is constructed for the island scene.
   */
  attachCastingMaster(opts?: {
    spellFx?: SpellFxSystem | null;
    getHeight?: (x: number, z: number) => number;
  }): CastingMaster {
    this.casting = new CastingMaster({
      scene: this.scene,
      worldFx: this,
      spellFx: opts?.spellFx ?? null,
      getHeight: opts?.getHeight,
    });
    return this.casting;
  }

  /** Weapon / element skill cast through master planner */
  castSkill(req: CastRequest) {
    if (!this.casting) this.attachCastingMaster();
    return this.casting!.cast(req);
  }

  /**
   * Surrounding cast FX while windup/channel runs.
   * Ends automatically after duration or call endCastAura(token).
   */
  beginCastAura(opts: DragonKoiCastOpts): number {
    return this.dragonKoiCast.beginCast(opts);
  }

  endCastAura(token?: number): void {
    this.dragonKoiCast.endCast(token);
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
      preset: preset in FX_PRESETS ? preset : 'attack_burst',
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

  /**
   * Spell / weapon skill impact — supernova pack with color variant.
   * original | blue | purple | yellow
   */
  spellImpact(
    at: THREE.Vector3,
    opts?: {
      variant?: SupernovaImpactVariant;
      school?: string;
      damageType?: string;
      vfxKey?: string;
      scale?: number;
      /** Also emit particle burst in matching color */
      withParticles?: boolean;
    },
  ): void {
    const spawn: SupernovaImpactSpawnOpts = {
      position: at.clone(),
      variant: opts?.variant,
      school: opts?.school,
      damageType: opts?.damageType,
      vfxKey: opts?.vfxKey,
      scale: opts?.scale,
    };
    this.supernova.spawn(spawn);

    if (opts?.withParticles !== false) {
      // Lightweight supporting sparks
      this.spawn('attack_burst', { position: at, burst: true, burstCount: 18 });
    }
  }

  /** Weapon skill hit helper (defaults to original / physical). */
  weaponSkillImpact(
    at: THREE.Vector3,
    damageType: string = 'physical',
    scale?: number,
  ): void {
    this.spellImpact(at, { damageType, scale, withParticles: true });
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
    // CodePen trail sparks along dash vector
    const dashDir = new THREE.Vector3(-Math.sin(facingYaw), 0, -Math.cos(facingYaw));
    this.spawnTrail(feetWorld, dashDir, { length: 0.9, width: 0.1, life: 0.28 });
  }

  // ── CodePen KwaNNap API (smoke / barrel / trail / steam) ─────────────────

  /**
   * Continuous CodePen-style plume (smoke_column | fire_plume | steam | …).
   * Prefer this over raw Points when you want pen-consistent look.
   */
  spawnCodepen(
    preset: CodepenPresetId,
    opts?: {
      position?: THREE.Vector3;
      attachTo?: THREE.Object3D;
      localOffset?: THREE.Vector3;
      direction?: THREE.Vector3;
      /** If true, burst then stop continuous spawn */
      burstOnly?: boolean;
      burstCount?: number;
    },
  ): CodepenEmitterHandle {
    const pos = opts?.position?.clone() ?? new THREE.Vector3();
    const em = createCodepenPresetEmitter(this.root, preset, pos, {
      attachTo: opts?.attachTo,
      localOffset: opts?.localOffset,
      direction: opts?.direction,
    });
    if (opts?.burstOnly) {
      em.burst(opts.burstCount ?? 16);
      em.stop();
    }
    this.codepenEmitters.push(em);
    return em;
  }

  /** Dark smoke column (pen emitter #2 look). */
  smokePlume(
    at: THREE.Vector3 | THREE.Object3D,
    opts?: { localOffset?: THREE.Vector3; intensity?: 'light' | 'heavy' },
  ): CodepenEmitterHandle {
    if (at instanceof THREE.Vector3) {
      return this.spawnCodepen(opts?.intensity === 'heavy' ? 'smoke_column' : 'steam', {
        position: at,
      });
    }
    return this.spawnCodepen(opts?.intensity === 'heavy' ? 'smoke_column' : 'steam', {
      attachTo: at,
      localOffset: opts?.localOffset ?? new THREE.Vector3(0, 0.3, 0),
    });
  }

  /**
   * Barrel / muzzle flash + smoke hang.
   * `direction` = barrel forward (world). Attach to cannon mesh for tracking.
   */
  barrelMuzzle(
    muzzleWorld: THREE.Vector3,
    direction: THREE.Vector3,
    opts?: { attachTo?: THREE.Object3D; localOffset?: THREE.Vector3 },
  ): void {
    const dir = direction.clone().normalize();
    // Bright flash burst
    const flash = this.spawnCodepen('barrel_muzzle', {
      position: muzzleWorld,
      attachTo: opts?.attachTo,
      localOffset: opts?.localOffset,
      direction: dir,
      burstOnly: true,
      burstCount: 18,
    });
    flash.burst(18);
    // Lingering smoke
    this.spawnCodepen('barrel_smoke', {
      position: muzzleWorld.clone().addScaledVector(dir, 0.15),
      attachTo: opts?.attachTo,
      localOffset: opts?.localOffset?.clone().add(dir.clone().multiplyScalar(0.15)),
      direction: dir,
      burstOnly: true,
      burstCount: 10,
    });
    // Trace streak out of barrel
    this.spawnTrail(muzzleWorld, dir, {
      length: 1.6,
      width: 0.08,
      life: 0.22,
      color: 0xffcc88,
      texture: 'spark',
    });
  }

  /** Oriented trail ribbon (pen TRACE style). */
  spawnTrail(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    opts?: {
      length?: number;
      width?: number;
      life?: number;
      color?: THREE.ColorRepresentation;
      texture?: 'smoke' | 'fire' | 'spark';
    },
  ): void {
    const trail = spawnTrailRibbon(this.root, origin, direction, opts);
    this.trails.push(trail);
  }

  /** Steam vent (camp kettle, geyser, damaged pipe). */
  steamVent(
    at: THREE.Vector3 | THREE.Object3D,
    opts?: { localOffset?: THREE.Vector3 },
  ): CodepenEmitterHandle {
    if (at instanceof THREE.Vector3) {
      return this.spawnCodepen('steam', { position: at });
    }
    return this.spawnCodepen('steam', {
      attachTo: at,
      localOffset: opts?.localOffset ?? new THREE.Vector3(0, 0.2, 0),
    });
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
    const cp = obj.userData?.codepenFx as CodepenEmitterHandle[] | undefined;
    if (cp) {
      for (const em of cp) {
        em.dispose();
        this.codepenEmitters = this.codepenEmitters.filter((e) => e !== em);
      }
      delete obj.userData.codepenFx;
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

    const stillCp: CodepenEmitterHandle[] = [];
    for (const em of this.codepenEmitters) {
      em.update(dt);
      if (em.root.parent) stillCp.push(em);
    }
    this.codepenEmitters = stillCp;

    const stillTrails = [];
    for (const t of this.trails) {
      if (t.update(dt)) stillTrails.push(t);
    }
    this.trails = stillTrails;

    this.supernova.update(dt);
    this.dragonKoiCast.update(dt);
    this.casting?.update(dt);
  }

  dispose(): void {
    for (const em of this.emitters) em.dispose();
    this.emitters = [];
    for (const em of this.codepenEmitters) em.dispose();
    this.codepenEmitters = [];
    for (const t of this.trails) t.dispose();
    this.trails = [];
    this.supernova.dispose();
    this.dragonKoiCast.dispose();
    this.casting?.dispose();
    this.casting = null;
    setSupernovaImpactSystem(null);
    this.scene.remove(this.root);
  }
}

/** Expose variant catalog for HUD / skill editors */
export { SUPERNOVA_VARIANTS };
export type { SupernovaImpactVariant };
export type { CodepenPresetId, CodepenEmitterHandle };
export { CODEPEN_SOURCE };

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
