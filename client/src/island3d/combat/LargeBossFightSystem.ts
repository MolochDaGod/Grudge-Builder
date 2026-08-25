/**
 * LargeBossFightSystem — PIP Skull–style giant boss for dungeon rooms & PvE arenas.
 *
 * Reference: https://bandinopla.github.io/pip-skull-demo/
 * Patterns: intro roar, multi-phase HP, telegraphed slams, expanding shockwaves,
 * meteor rain, electric stun, sweep beams, weakness windows, large SI scale.
 *
 * Integrates: AttackWarningSystem telegraphs + BossCinemaFx + optional WorldFxBus.
 */
import * as THREE from 'three';
import {
  PIP_SKULL_BOSS_FIGHT,
  phaseForHpRatio,
  pickPipBossAttack,
  pipBossHeightM,
  type PipBossAttackDef,
  type PipBossFightConfig,
  type PipBossPhaseDef,
  type PipBossPhaseId,
} from '@shared/definitions/pipSkullBossFight';
import {
  AttackWarningSystem,
  pickWarningVariant,
  type WarningVariant,
} from './AttackWarningSystem';
import type { AttackPattern } from '@shared/definitions/orcWarriorBoss';
import { BossCinemaFx } from './BossCinemaFx';
import type { WorldFxBus } from '../vfx/WorldFxBus';
import {
  isLavaCaesarFight,
  LAVA_CAESAR_KIT,
} from '@shared/definitions/lavaCaesarBossFight';
import { LavaCaesarFightKit } from './LavaCaesarFightKit';
import { fitObjectHeight } from '../zone/gltfSceneUtils';

export type LargeBossState =
  | 'intro'
  | 'idle'
  | 'telegraph'
  | 'active'
  | 'recover'
  | 'weak'
  | 'dead'
  | 'submerged'
  | 'rising'
  | 'minion_wave'
  | 'stunned';

/** Full hit package for physical knockback / stun on CharacterController. */
export interface LargeBossHitEvent {
  damage: number;
  kind: string;
  origin: THREE.Vector3;
  targetPos: THREE.Vector3;
  knockdown?: boolean;
  stunSec?: number;
  knockbackMps?: number;
  knockUpMps?: number;
}

export interface LargeBossCallbacks {
  onPhase?: (phase: PipBossPhaseDef) => void;
  onAttack?: (attack: PipBossAttackDef) => void;
  /** Prefer this for knockback/stun wiring */
  onPlayerHit?: (hit: LargeBossHitEvent) => void;
  onWeakness?: (open: boolean) => void;
  onDeath?: (bossId: string) => void;
  onPrompt?: (msg: string | null) => void;
}

export interface LargeBossSpawnOpts {
  scene: THREE.Scene;
  position: THREE.Vector3;
  /** Arena center (leash). Defaults to position. */
  arenaCenter?: THREE.Vector3;
  cfg?: PipBossFightConfig;
  bossId?: string;
  worldFx?: WorldFxBus | null;
  cb?: LargeBossCallbacks;
  /** Optional GLB root; else procedural colossus proxy */
  model?: THREE.Object3D | null;
  /** Clips for Caesar / other skinned bosses (one mixer on model). */
  animations?: THREE.AnimationClip[];
  lavaY?: number;
  sampleHeight?: (x: number, z: number) => number | null;
}

export class LargeBossFightSystem {
  readonly root = new THREE.Group();
  readonly bossId: string;
  private scene: THREE.Scene;
  private cfg: PipBossFightConfig;
  private cb: LargeBossCallbacks;
  private arenaCenter: THREE.Vector3;
  private cinema: BossCinemaFx;
  private warnings: AttackWarningSystem;
  private state: LargeBossState = 'intro';
  private phase: PipBossPhaseDef;
  private hp: number;
  private maxHp: number;
  private cooldowns = new Map<string, number>();
  private stateT = 0;
  private currentAttack: PipBossAttackDef | null = null;
  private weakT = 0;
  private facing = 0;
  private disposed = false;
  private mesh: THREE.Object3D;
  private hpBar: THREE.Mesh | null = null;
  private weaknessOrbs: THREE.Mesh[] = [];
  private sweepGroup: THREE.Group | null = null;
  private introDone = false;
  private lavaKit: LavaCaesarFightKit | null = null;
  private surfaceY = 0;
  private risePlatform = 0;
  private fittedScale = 1;

  constructor(opts: LargeBossSpawnOpts) {
    this.scene = opts.scene;
    this.cfg = opts.cfg ?? PIP_SKULL_BOSS_FIGHT;
    this.cb = opts.cb ?? {};
    this.bossId = opts.bossId ?? this.cfg.id;
    this.maxHp = this.cfg.maxHP;
    this.hp = this.maxHp;
    this.phase = phaseForHpRatio(1, this.cfg);
    this.arenaCenter = (opts.arenaCenter ?? opts.position).clone();

    this.root.name = `LargeBoss_${this.bossId}`;
    this.root.position.copy(opts.position);
    this.scene.add(this.root);

    this.cinema = new BossCinemaFx(this.scene, opts.worldFx ?? null);
    this.warnings = new AttackWarningSystem(this.scene);
    void this.warnings.preload();

    this.mesh = opts.model ?? this.buildProxyColossus();
    this.root.add(this.mesh);
    if (isLavaCaesarFight(this.cfg) && opts.model) {
      fitObjectHeight(this.mesh, LAVA_CAESAR_KIT.bossHeightM);
      this.fittedScale = this.mesh.scale.x || 1;
    }
    this.applyScale();
    this.buildHpBar();
    this.buildWeaknessOrbs();

    if (isLavaCaesarFight(this.cfg)) {
      this.surfaceY = opts.lavaY != null ? opts.lavaY + 0.15 : opts.position.y;
      this.root.position.y = this.surfaceY;
      this.lavaKit = new LavaCaesarFightKit(
        this.scene,
        {
          root: this.root,
          mesh: this.mesh,
          arenaCenter: this.arenaCenter,
          cinema: this.cinema,
          emitHit: (pos, kind, dmg, origin) => this.emitHit(pos, kind, dmg, origin),
          onPrompt: (msg) => this.cb.onPrompt?.(msg),
          takeDamage: (n) => this.takeDamage(n),
        },
        {
          lavaY: opts.lavaY,
          sampleHeight: opts.sampleHeight,
        },
      );
      if (opts.animations?.length) this.lavaKit.bindBossAnims(this.mesh, opts.animations);
      void this.lavaKit.preload();
      this.lavaKit.playBoss('born', { loop: false });
    }

    this.cb.onPrompt?.(
      isLavaCaesarFight(this.cfg)
        ? `${this.cfg.name} rises from the magma — dive, brood, twister. Fireballs stun him.`
        : `${this.cfg.name} awakens — watch telegraphs, dodge shockwaves, punish the weak core.`,
    );
    this.cb.onPhase?.(this.phase);
    this.cinema.setPhase(
      this.phase.cinemaIntensity,
      this.phase.color,
      this.root.position,
    );
  }

  private buildProxyColossus(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'PipColossusProxy';
    const h = pipBossHeightM(this.cfg);
    // Legs / body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(h * 0.1, h * 0.14, h * 0.55, 10),
      new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        roughness: 0.85,
        metalness: 0.15,
        emissive: 0x334155,
        emissiveIntensity: 0.25,
      }),
    );
    body.position.y = h * 0.35;
    // Skull-ish head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(h * 0.14, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.55,
        emissive: 0x64748b,
        emissiveIntensity: 0.35,
      }),
    );
    head.position.y = h * 0.72;
    head.scale.set(1.15, 1.0, 1.25);
    // Eye glow
    const eye = new THREE.PointLight(0xf97316, 2.5, h * 2);
    eye.position.set(0, h * 0.74, h * 0.12);
    g.add(body, head, eye);
    return g;
  }

  private applyScale(): void {
    const m = this.phase.scaleMult || 1;
    if (isLavaCaesarFight(this.cfg)) {
      this.mesh.scale.setScalar(this.fittedScale * m);
      return;
    }
    this.mesh.scale.setScalar(m);
  }

  private buildHpBar(): void {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.85 }),
    );
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(4.3, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    );
    fill.position.z = 0.02;
    fill.name = 'BossHpFill';
    const g = new THREE.Group();
    g.add(bg, fill);
    g.position.y = pipBossHeightM(this.cfg) * 0.95;
    this.root.add(g);
    this.hpBar = fill;
  }

  private buildWeaknessOrbs(): void {
    const h = pipBossHeightM(this.cfg);
    for (let i = 0; i < 3; i++) {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.0,
        }),
      );
      orb.visible = false;
      orb.userData.weaknessOrb = true;
      orb.userData.index = i;
      this.root.add(orb);
      this.weaknessOrbs.push(orb);
    }
    void h;
  }

  get isAlive(): boolean {
    return this.state !== 'dead' && this.hp > 0;
  }

  get currentPhase(): PipBossPhaseId {
    return this.phase.id;
  }

  get hpRatio(): number {
    return this.hp / this.maxHp;
  }

  get position(): THREE.Vector3 {
    return this.root.position.clone();
  }

  bindArena(arenaRoot: THREE.Object3D | null): void {
    this.lavaKit?.bindArena(arenaRoot);
  }

  loadSlotWorld(index: number): THREE.Vector3 | null {
    return this.lavaKit?.loadSlotWorld(index) ?? null;
  }

  getLavaSnapshot(): {
    bossState: string;
    bossPos: THREE.Vector3;
    bossHpRatio: number;
    threatened: number;
    minions: { id: string; position: THREE.Vector3; hp: number; dead: boolean }[];
    fireballs: THREE.Vector3[];
    loadSlots: THREE.Vector3[];
    combatT: number;
  } | null {
    if (!this.lavaKit) return null;
    return {
      bossState: this.state,
      bossPos: this.root.position.clone(),
      bossHpRatio: this.hpRatio,
      threatened: this.lavaKit.threatenedIndex,
      minions: this.lavaKit.minionTargets(),
      fireballs: this.lavaKit.fireballPositions(),
      loadSlots: [0, 1, 2, 3].map((i) => this.lavaKit!.loadSlotWorld(i)),
      combatT: this.lavaKit.combatT,
    };
  }

  /** Roots the player ray should test (boss + lava brood). */
  getHitObjects(): THREE.Object3D[] {
    const extra = this.lavaKit?.minionRoots() ?? [];
    return [this.root, ...extra];
  }

  /** Player deals damage; higher when weak / lava-stunned. */
  takeDamage(amount: number): void {
    if (this.state === 'dead' || this.state === 'intro') return;
    let mult = 1;
    if (this.state === 'weak' || this.state === 'stunned') {
      mult = this.lavaKit ? LAVA_CAESAR_KIT.stunDamageTakenMult : this.cfg.weakDamageTakenMult;
    } else if (this.state === 'submerged') {
      mult = LAVA_CAESAR_KIT.submergedDamageTakenMult;
    }
    this.hp = Math.max(0, this.hp - amount * mult);
    this.refreshHpBar();
    this.checkPhase();
    if (this.hp <= 0) this.die();
  }

  private refreshHpBar(): void {
    if (!this.hpBar) return;
    const r = this.hp / this.maxHp;
    this.hpBar.scale.x = Math.max(0.02, r);
    this.hpBar.position.x = -((1 - r) * 4.3) / 2;
    (this.hpBar.material as THREE.MeshBasicMaterial).color.setHex(
      r > 0.5 ? 0x22c55e : r > 0.25 ? 0xf59e0b : 0xef4444,
    );
  }

  private checkPhase(): void {
    const next = phaseForHpRatio(this.hp / this.maxHp, this.cfg);
    if (next.id !== this.phase.id && next.id !== 'dead') {
      this.phase = next;
      this.applyScale();
      this.cinema.setPhase(next.cinemaIntensity, next.color, this.root.position);
      this.cb.onPhase?.(next);
      this.cb.onPrompt?.(`Phase: ${next.name}`);
    }
  }

  private die(): void {
    this.state = 'dead';
    this.stateT = 0;
    this.lavaKit?.playBoss('dead', { loop: false, fade: 0.12 });
    this.cb.onDeath?.(this.bossId);
    this.cb.onPrompt?.(`${this.cfg.name} defeated.`);
    this.setWeaknessVisible(false);
  }

  private setWeaknessVisible(on: boolean): void {
    const h = pipBossHeightM(this.cfg) * (this.phase.scaleMult || 1);
    this.weaknessOrbs.forEach((orb, i) => {
      orb.visible = on;
      const mat = orb.material as THREE.MeshStandardMaterial;
      mat.opacity = on ? 0.9 : 0;
      const ang = (i / 3) * Math.PI * 2 + this.stateT;
      const r = 2.8 * this.cfg.baseScale * 0.35;
      orb.position.set(Math.cos(ang) * r, h * 0.55, Math.sin(ang) * r);
    });
    this.cb.onWeakness?.(on);
  }

  private warningVariantFor(atk: PipBossAttackDef): WarningVariant {
    if (atk.shape === 'aoe_ring' || atk.shape === 'radial_arms') return 'aoe';
    if (atk.shape === 'projectile' || atk.id.includes('meteor') || atk.id.includes('rock')) {
      return 'incoming';
    }
    if (atk.shape === 'beam' || atk.shape === 'melee_cone') return 'cone';
    const fake: AttackPattern = {
      id: atk.id,
      anim: 'attack' as any,
      damage: atk.damage,
      range: atk.rangeM,
      arc: atk.arcRad ?? Math.PI,
      cooldownSec: atk.cooldownSec,
      telegraphSec: atk.telegraphSec,
      blockable: false,
      knockdown: !!atk.knockdown,
      weight: atk.weight,
    };
    return pickWarningVariant(fake);
  }

  private emitHit(
    playerPos: THREE.Vector3,
    kind: string,
    damage: number,
    origin: THREE.Vector3,
    atk?: PipBossAttackDef | null,
  ): void {
    this.cb.onPlayerHit?.({
      damage,
      kind,
      origin: origin.clone(),
      targetPos: playerPos.clone(),
      knockdown: atk?.knockdown,
      stunSec: atk?.stunSec,
      knockbackMps: atk?.knockbackMps,
      knockUpMps: atk?.knockUpMps,
    });
  }

  private beginLavaDive(): void {
    this.lavaKit?.playBoss('spell4', { loop: false, fade: 0.12 });
    this.state = 'submerged';
    this.stateT = 0;
    this.cb.onPrompt?.('Caesar dives the magma…');
  }

  private beginLavaRise(playerPos?: THREE.Vector3): void {
    this.risePlatform = this.lavaKit?.pickPlatformToward(playerPos) ?? 0;
    this.lavaKit?.playBoss('spell1', { loop: false, fade: 0.1 });
    this.lavaKit?.spawnRiseTornado(this.risePlatform);
    this.state = 'rising';
    this.stateT = 0;
    this.cb.onPrompt?.('Tornado from below — brood incoming!');
  }

  private motionFromAtk(atk: PipBossAttackDef) {
    return {
      knockdown: !!atk.knockdown,
      stunSec: atk.stunSec ?? 0.35,
      knockbackMps: atk.knockbackMps ?? 10,
      knockUpMps: atk.knockUpMps ?? 4,
      innerSafe: atk.innerRadiusM ?? 0,
    };
  }

  private beginAttack(atk: PipBossAttackDef): void {
    this.currentAttack = atk;
    this.state = 'telegraph';
    this.stateT = 0;
    this.cooldowns.set(atk.id, atk.cooldownSec);
    this.cb.onAttack?.(atk);
    this.cb.onPrompt?.(`${atk.name} — dodge the warning!`);
    if (this.lavaKit) {
      if (atk.shape === 'projectile' || atk.vfx === 'fire_twister') {
        this.lavaKit.playBoss('spell2', { loop: false, fade: 0.1 });
      } else if (atk.vfx === 'lava_dive') {
        this.lavaKit.playBoss('spell4', { loop: false, fade: 0.1 });
      } else if (atk.shape === 'melee_cone' || atk.vfx === 'ground_slam' || atk.vfx === 'charge_stomp') {
        this.lavaKit.playBoss('atk', { loop: false, fade: 0.08 });
      }
    }

    const variant = this.warningVariantFor(atk);
    this.warnings.showTelegraph({
      id: `large_${this.bossId}`,
      variant,
      position: this.root.position.clone(),
      facing: this.facing,
      range: atk.rangeM,
      arc: atk.arcRad ?? Math.PI,
      totalSec: atk.telegraphSec,
      remainingSec: atk.telegraphSec,
      progress: 0,
    });
  }

  private fireActive(atk: PipBossAttackDef, playerPos: THREE.Vector3): void {
    const dmg = Math.round(atk.damage * this.phase.damageMult);
    const boss = this.root.position;
    const dist = playerPos.distanceTo(boss);
    const motion = this.motionFromAtk(atk);

    switch (atk.vfx) {
      case 'ground_slam': {
        // Instant disk AoE + expanding shockwave for PIP readability
        const disk = this.cinema.spawnAoeDisk(boss, atk.rangeM, dmg, motion);
        if (dist <= atk.rangeM) {
          this.emitHit(playerPos, 'slam', dmg, boss, atk);
        }
        void disk;
        this.cinema.spawnShockwave(
          boss,
          atk.rangeM * 1.35,
          Math.round(dmg * 0.55),
          14 + this.phase.speedMult * 3,
          motion,
        );
        break;
      }
      case 'shockwave':
        this.cinema.spawnShockwave(
          boss,
          atk.rangeM,
          dmg,
          12 + this.phase.speedMult * 4,
          motion,
        );
        break;
      case 'meteor_rain': {
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 3 + Math.random() * atk.rangeM * 0.7;
          const p = new THREE.Vector3(
            boss.x + Math.cos(ang) * r,
            boss.y,
            boss.z + Math.sin(ang) * r,
          );
          this.cinema.spawnMeteor(p, dmg * 0.85, 1.1 + Math.random() * 0.5, motion);
        }
        break;
      }
      case 'rock_throw': {
        const dir = playerPos.clone().sub(boss).setY(0);
        if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
        dir.normalize();
        const impact = playerPos.clone().addScaledVector(dir, -0.5);
        impact.y = boss.y;
        this.cinema.spawnMeteor(impact, dmg, 0.85, motion);
        this.lavaKit?.leaveProjectileBurn(impact);
        break;
      }
      case 'electric_shock':
        this.cinema.spawnElectric(boss, atk.rangeM);
        if (dist <= atk.rangeM) {
          this.emitHit(playerPos, 'electric', dmg, boss, atk);
        }
        break;
      case 'sweep_beam':
        this.sweepGroup?.parent?.remove(this.sweepGroup);
        this.sweepGroup = this.cinema.spawnSweepBeams(boss, atk.rangeM, this.facing);
        break;
      case 'whirlwind':
        this.cinema.spawnShockwave(boss, atk.rangeM * 0.7, dmg * 0.6, 8, motion);
        if (dist <= atk.rangeM * 0.7) {
          this.emitHit(playerPos, 'whirlwind', Math.round(dmg * 0.7), boss, atk);
        }
        break;
      case 'lava_dive':
        this.beginLavaDive();
        break;
      case 'lava_rise_tornado':
        this.lavaKit?.spawnRiseTornado(this.risePlatform);
        this.lavaKit?.playBoss('spell1', { loop: false });
        if (playerPos.distanceTo(this.lavaKit?.platformWorld(this.risePlatform) ?? boss) < 6) {
          this.emitHit(playerPos, 'lava_rise_tornado', dmg, boss, atk);
        }
        break;
      case 'spawn_lava_minions':
        this.lavaKit?.spawnMinionWave();
        this.lavaKit?.playBoss('spell4', { loop: false });
        this.state = 'minion_wave';
        this.stateT = 0;
        break;
      case 'fire_twister':
        this.lavaKit?.spawnLinearTwister(playerPos);
        this.lavaKit?.leaveProjectileBurn(playerPos);
        this.lavaKit?.playBoss('spell2', { loop: false });
        break;
      case 'charge_stomp': {
        // Frontal cone check
        const toP = playerPos.clone().sub(boss).setY(0);
        const face = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
        const ang = face.angleTo(toP.lengthSq() > 0.01 ? toP.normalize() : face);
        const arc = atk.arcRad ?? Math.PI * 0.7;
        if (dist <= atk.rangeM && ang <= arc * 0.5) {
          this.emitHit(playerPos, 'stomp', dmg, boss, atk);
        }
        this.cinema.spawnAoeDisk(boss, atk.rangeM * 0.55, Math.round(dmg * 0.4), motion);
        break;
      }
      default:
        break;
    }

    if (atk.opensWeakness) {
      this.state = 'weak';
      this.weakT = this.cfg.weaknessSec;
      this.setWeaknessVisible(true);
      this.cb.onPrompt?.('CORE EXPOSED — unload damage!');
    }
  }

  /**
   * Tick boss AI + VFX. Pass player world position for aggro/damage.
   */
  update(dt: number, playerPos?: THREE.Vector3): void {
    if (this.disposed) return;
    if (this.state === 'dead') {
      this.lavaKit?.update(dt);
      return;
    }

    // Cooldowns
    for (const [k, v] of this.cooldowns) {
      this.cooldowns.set(k, Math.max(0, v - dt));
    }

    this.stateT += dt;

    if (this.lavaKit) {
      const lavaTick = this.lavaKit.update(dt, playerPos);
      if (lavaTick.stunStarted && this.state !== 'dead') {
        this.state = 'stunned';
        this.stateT = 0;
        this.currentAttack = null;
        this.setWeaknessVisible(true);
        this.cb.onWeakness?.(true);
      }
      if (lavaTick.stunDone && this.state === 'stunned') {
        this.state = 'idle';
        this.stateT = 0;
        this.setWeaknessVisible(false);
      }
      if (lavaTick.waveExpired && this.state === 'minion_wave') {
        this.state = 'idle';
        this.stateT = 0;
        this.lavaKit.playBoss('idle', { loop: true });
      }
    }

    // Face player
    if (playerPos && this.state !== 'stunned' && this.state !== 'submerged') {
      const dx = playerPos.x - this.root.position.x;
      const dz = playerPos.z - this.root.position.z;
      if (dx * dx + dz * dz > 0.01) {
        const target = Math.atan2(dx, dz);
        const turn = this.phase.speedMult * 2.2 * dt;
        let d = target - this.facing;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.facing += THREE.MathUtils.clamp(d, -turn, turn);
        this.root.rotation.y = this.facing;
      }
    }

    // Cinema damage events (shockwave band / meteor impact) with knockback payload
    const fxHits = this.cinema.update(dt, playerPos);
    for (const h of fxHits) {
      this.cb.onPlayerHit?.({
        damage: h.damage,
        kind: h.kind,
        origin: h.origin,
        targetPos: h.pos,
        knockdown: h.knockdown,
        stunSec: h.stunSec,
        knockbackMps: h.knockbackMps,
        knockUpMps: h.knockUpMps,
      });
    }

    // Weakness orb orbit
    if (this.state === 'weak') {
      this.weakT -= dt;
      this.setWeaknessVisible(true);
      if (this.weakT <= 0) {
        this.state = 'idle';
        this.setWeaknessVisible(false);
        this.cb.onPrompt?.(null);
      }
    }

    // Sweep beam spin
    if (this.sweepGroup && this.state === 'active' && this.currentAttack?.id === 'sweep_beam') {
      this.sweepGroup.rotation.y += dt * 1.4 * this.phase.speedMult;
      if (playerPos) {
        // Approximate: damage if player in range of beams (disk)
        const d = playerPos.distanceTo(this.root.position);
        if (d < (this.currentAttack.rangeM ?? 10) && d > 1.5) {
          // Throttle via stateT
          if (Math.floor(this.stateT * 4) !== Math.floor((this.stateT - dt) * 4)) {
            this.emitHit(
              playerPos,
              'beam',
              Math.round((this.currentAttack.damage * this.phase.damageMult) * 0.35),
              this.root.position,
              this.currentAttack,
            );
          }
        }
      }
    }

    // State machine
    switch (this.state) {
      case 'intro': {
        if (this.stateT > 2.2 && !this.introDone) {
          this.introDone = true;
          this.cinema.spawnShockwave(this.root.position, 10, 0, 10);
          this.cb.onPrompt?.(`${this.cfg.name} — ${this.phase.name}`);
        }
        if (this.stateT > 3.2) {
          this.state = 'idle';
          this.stateT = 0;
          this.lavaKit?.playBoss('idle', { loop: true, fade: 0.25 });
        }
        if (!this.lavaKit) this.mesh.position.y = Math.sin(this.stateT * 2) * 0.08;
        break;
      }
      case 'submerged': {
        const dive = LAVA_CAESAR_KIT.diveDurationSec;
        const hide = LAVA_CAESAR_KIT.submergedSec;
        const t01 = Math.min(1, this.stateT / dive);
        this.lavaKit?.setBossY(this.surfaceY, true, t01);
        if (this.stateT >= dive + hide) this.beginLavaRise(playerPos);
        break;
      }
      case 'rising': {
        const rise = LAVA_CAESAR_KIT.riseDurationSec;
        const t01 = Math.min(1, this.stateT / rise);
        this.lavaKit?.setBossY(this.surfaceY, false, t01);
        if (this.stateT >= rise) {
          this.lavaKit?.spawnMinionWave();
          this.state = 'minion_wave';
          this.stateT = 0;
        }
        break;
      }
      case 'minion_wave': {
        if (this.lavaKit && this.lavaKit.livingMinionCount === 0 && this.stateT > 0.4) {
          this.state = 'idle';
          this.stateT = 0;
          this.lavaKit.playBoss('idle', { loop: true });
          this.lavaKit.clearThreatened();
          this.cb.onPrompt?.('Brood cleared — Caesar is exposed. Grab the fireballs.');
        }
        break;
      }
      case 'stunned':
        break;
      case 'idle': {
        if (!this.lavaKit) this.mesh.position.y = Math.sin(this.stateT * 1.5) * 0.06;
        if (!playerPos) break;
        const dist = playerPos.distanceTo(this.root.position);
        if (dist > this.cfg.aggroRadiusM) break;
        // Leash pull-back
        const fromArena = this.root.position.distanceTo(this.arenaCenter);
        if (fromArena > this.cfg.leashRadiusM) {
          const dir = this.arenaCenter.clone().sub(this.root.position).setY(0);
          if (dir.lengthSq() > 0.1) {
            dir.normalize();
            this.root.position.addScaledVector(dir, 4 * dt);
          }
          break;
        }
        // Pick attack after brief idle
        if (this.stateT > 0.55) {
          const atk = pickPipBossAttack(this.phase, this.cooldowns, this.cfg);
          if (atk) this.beginAttack(atk);
          else this.stateT = 0;
        }
        break;
      }
      case 'telegraph': {
        const atk = this.currentAttack;
        if (!atk) {
          this.state = 'idle';
          break;
        }
        const prog = Math.min(1, this.stateT / atk.telegraphSec);
        this.warnings.showTelegraph({
          id: `large_${this.bossId}`,
          variant: pickWarningVariant({
            id: atk.id,
            anim: 'attack' as any,
            damage: atk.damage,
            range: atk.rangeM,
            arc: atk.arcRad ?? Math.PI,
            cooldownSec: atk.cooldownSec,
            telegraphSec: atk.telegraphSec,
            blockable: false,
            knockdown: !!atk.knockdown,
            weight: atk.weight,
          }),
          position:
            atk.shape === 'projectile' && playerPos
              ? playerPos.clone()
              : this.root.position.clone(),
          facing: this.facing,
          range: atk.rangeM,
          arc: atk.arcRad ?? Math.PI,
          totalSec: atk.telegraphSec,
          remainingSec: Math.max(0, atk.telegraphSec - this.stateT),
          progress: prog,
        });
        if (!this.lavaKit) this.mesh.position.y = -prog * 0.35;
        if (this.stateT >= atk.telegraphSec) {
          this.state = 'active';
          this.stateT = 0;
          if (playerPos) this.fireActive(atk, playerPos);
          else this.fireActive(atk, this.root.position.clone());
        }
        break;
      }
      case 'active': {
        const atk = this.currentAttack;
        if (!atk) {
          this.state = 'idle';
          break;
        }
        if (!this.lavaKit) this.mesh.position.y = Math.sin(this.stateT * 20) * 0.12;
        if (this.stateT >= atk.activeSec) {
          this.warnings.hide(`large_${this.bossId}`);
          if (this.sweepGroup) {
            this.cinema.root.remove(this.sweepGroup);
            this.sweepGroup = null;
          }
          if (this.state !== 'weak') {
            this.state = 'recover';
            this.stateT = 0;
          }
        }
        break;
      }
      case 'recover': {
        const atk = this.currentAttack;
        const rec = atk?.recoverSec ?? 0.6;
        if (!this.lavaKit) this.mesh.position.y = 0;
        if (this.stateT >= rec) {
          this.state = 'idle';
          this.stateT = 0;
          this.currentAttack = null;
        }
        break;
      }
      default:
        break;
    }

    // Keep cinema light on boss
    this.cinema.setPhase(
      this.phase.cinemaIntensity,
      this.phase.color,
      this.root.position,
    );
  }

  /** Hit-test weakness orbs with a world ray/point (player attack). */
  tryHitWeakness(point: THREE.Vector3, damage: number): boolean {
    if (this.lavaKit?.tryHitMinion(point, damage)) return true;
    if (this.state === 'stunned') {
      if (point.distanceTo(this.root.position) < 6) {
        this.takeDamage(damage);
        return true;
      }
    }
    if (this.state === 'dead' || this.state === 'intro' || this.state === 'submerged') {
      return false;
    }
    if (this.lavaKit && point.distanceTo(this.root.position) < 5.2) {
      this.takeDamage(damage);
      return true;
    }
    if (this.state !== 'weak') return false;
    for (const orb of this.weaknessOrbs) {
      if (!orb.visible) continue;
      const wp = new THREE.Vector3();
      orb.getWorldPosition(wp);
      if (point.distanceTo(wp) < 1.2) {
        this.takeDamage(damage * 1.5);
        return true;
      }
    }
    // Body hit while weak still counts
    if (point.distanceTo(this.root.position) < 4 * this.cfg.baseScale * 0.3) {
      this.takeDamage(damage);
      return true;
    }
    return false;
  }

  dispose(): void {
    this.disposed = true;
    this.lavaKit?.dispose();
    this.lavaKit = null;
    this.cinema.dispose();
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else (m as THREE.Material)?.dispose?.();
      }
    });
  }
}
