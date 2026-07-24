/**
 * WarUnit — animated combatant baked onto battle scene proxy pose.
 * Uses grudge6 race GLB + Mixamo weapon clips + WarAIBrain.
 */
import * as THREE from 'three';
import { loadCharacterModel, type LoadedModel } from '@/lib/modelLoader';
import { RACE_GRUDGE6, normalizeRaceId } from '@shared/fleet';
import { setupGrudge6Equipment } from '@/lib/grudge6Equipment';
import { ensureCharacterTextureColorSpace } from '@/lib/characterAppearance';
import {
  getAnimationSet,
  resolveModelUrl,
  type WeaponType,
} from '@/lib/modelManifest';
import { AnimationManager, type AnimState } from '@/island3d/player/AnimationManager';
import { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } from '@/island3d/zoneWorldScale';
import type { WarUnitArchetype, WarFactionId } from '@shared/definitions/medievalBattleScene';
import { WarAIBrain, type WarSenseTarget } from './WarAIBrain';

export interface WarUnitSpawn {
  id: string;
  archetype: WarUnitArchetype;
  position: THREE.Vector3;
  rotationY: number;
  /** Source scene proxy mesh (hidden) */
  proxy?: THREE.Object3D;
  /** Player-controlled grudge6 hero */
  isPlayer?: boolean;
  /** Override race (hero select) */
  raceId?: string;
  displayName?: string;
}

export class WarUnit {
  readonly id: string;
  readonly archetype: WarUnitArchetype;
  readonly faction: WarFactionId;
  readonly root = new THREE.Group();
  readonly brain: WarAIBrain;
  readonly isPlayer: boolean;
  readonly displayName: string;
  hp: number;
  maxHp: number;
  dead = false;
  /** Player click-move destination */
  playerMoveTo: THREE.Vector3 | null = null;
  private anim: AnimationManager | null = null;
  private attackCd = 0;
  private loaded: LoadedModel | null = null;
  private facing = 0;
  private velocity = new THREE.Vector3();
  private hitFlash = 0;
  private raceOverride: string | null = null;

  constructor(spawn: WarUnitSpawn) {
    this.id = spawn.id;
    this.archetype = spawn.archetype;
    this.faction = spawn.archetype.faction;
    this.isPlayer = !!spawn.isPlayer;
    this.displayName = spawn.displayName ?? spawn.archetype.label;
    this.raceOverride = spawn.raceId ?? null;
    this.maxHp = spawn.isPlayer ? spawn.archetype.maxHp * 1.35 : spawn.archetype.maxHp;
    this.hp = this.maxHp;
    this.root.name = `war_unit_${spawn.id}`;
    this.root.position.copy(spawn.position);
    this.facing = spawn.rotationY;
    this.root.rotation.y = this.facing;
    this.brain = new WarAIBrain({
      faction: spawn.archetype.faction,
      role: spawn.archetype.role,
      maxHp: spawn.archetype.maxHp,
      attackRange: spawn.archetype.attackRange,
      aggroRadius: spawn.archetype.aggroRadius,
      moveSpeed: spawn.archetype.moveSpeed,
    });
    this.brain.setSpawn(spawn.position.clone());
    if (spawn.proxy) spawn.proxy.visible = false;
  }

  async load(): Promise<void> {
    const raceId = normalizeRaceId(this.raceOverride ?? this.archetype.raceId);
    const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
    const path = race.cdnPath;
    try {
      const loaded = await loadCharacterModel(path);
      this.loaded = loaded;
      // Default toon kit: base armor + role weapon
      const weaponSlots: Record<string, string> = {};
      const wt = this.archetype.weaponType;
      if (wt.includes('bow')) weaponSlots.bow = '_default';
      else if (wt.includes('staff') || wt.includes('magic') || wt.includes('arcane')) {
        weaponSlots.staff = 'A';
      } else if (wt.includes('axe')) weaponSlots.axe = 'A';
      else if (wt.includes('hammer')) weaponSlots.hammer = 'A';
      else if (wt.includes('greatsword') || wt.includes('spear')) {
        weaponSlots.sword = 'B';
      } else {
        weaponSlots.sword = 'A';
        if (wt.includes('shield') || this.isPlayer) weaponSlots.shield = 'A';
      }

      setupGrudge6Equipment(race.prefix, loaded.scene, {
        baseModelId: race.modelId,
        equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
        weaponSlots,
        faceVariant: 'A',
        skinColor: '#ffffff',
        armorColor: this.isPlayer ? '#d4a574' : this.factionTint(),
        capeEnabled: this.isPlayer,
        scale: race.scale * (this.isPlayer ? 1.05 : 1),
      });
      ensureCharacterTextureColorSpace(loaded.scene);
      // Force sRGB on all maps (webP from CDN)
      loaded.scene.traverse((c) => {
        if (!(c as THREE.Mesh).isMesh) return;
        const mesh = c as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std?.map) {
            std.map.colorSpace = THREE.SRGBColorSpace;
            std.map.needsUpdate = true;
          }
          if (std) {
            std.roughness = Math.min(0.95, std.roughness ?? 0.7);
            std.metalness = Math.min(0.25, std.metalness ?? 0);
            std.needsUpdate = true;
          }
        }
      });
      fitCharacterRootToHeightM(
        loaded.scene,
        race.scale,
        PLAYER_HEIGHT_M * (this.isPlayer ? 1.0 : 0.95),
      );
      this.root.add(loaded.scene);

      this.anim = new AnimationManager(loaded.scene);
      const weaponKey = (this.archetype.weaponType || 'sword') as WeaponType;
      const animSet = getAnimationSet(weaponKey);
      const unarmed = getAnimationSet('unarmed');
      const paths: Partial<Record<AnimState, string>> = {};
      const pick = (a?: { file: string }, b?: { file: string }) =>
        a?.file ? resolveModelUrl(a.file) : b?.file ? resolveModelUrl(b.file) : undefined;
      const idle = pick(animSet.idle, unarmed.idle);
      const run = pick(animSet.run, unarmed.run);
      const atk = pick(animSet.attack1, unarmed.attack1);
      const death = pick(animSet.death, unarmed.death);
      if (idle) paths.idle = idle;
      if (run) {
        paths.walk = run;
        paths.run = run;
      }
      if (atk) paths.attack = atk;
      if (death) paths.death = death;
      await this.anim.loadAnimations(paths).catch((e) => {
        console.warn(`[WarUnit] anim load ${this.id}`, e);
      });
      // Retry unarmed-only if nothing loaded
      if (!this.anim.hasClip('idle') && unarmed.idle) {
        await this.anim
          .loadAnimations({
            idle: resolveModelUrl(unarmed.idle.file),
            walk: unarmed.run ? resolveModelUrl(unarmed.run.file) : undefined,
            run: unarmed.run ? resolveModelUrl(unarmed.run.file) : undefined,
            attack: unarmed.attack1 ? resolveModelUrl(unarmed.attack1.file) : undefined,
          })
          .catch(() => {});
      }
      if (this.anim.hasClip('idle')) this.anim.play('idle');
    } catch (err) {
      console.warn(`[WarUnit] load failed ${this.id} — no capsule fallback (CDN only)`, err);
    }
  }

  private factionTint(): string {
    switch (this.faction) {
      case 'crimson': return '#c45c4a';
      case 'azure': return '#4a7ec4';
      case 'gold': return '#c4a24a';
      default: return '#ffffff';
    }
  }

  private factionColorHex(): number {
    switch (this.faction) {
      case 'crimson': return 0xb83a2e;
      case 'azure': return 0x2e6bb8;
      case 'gold': return 0xb8942e;
      default: return 0x888888;
    }
  }

  toSense(): WarSenseTarget {
    return {
      id: this.id,
      faction: this.faction,
      position: this.root.position.clone(),
      hp: this.hp,
      dead: this.dead,
      kind: 'unit',
    };
  }

  takeDamage(amount: number, fromId?: string): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.15;
    if (fromId && this.brain.goal === 'hold') {
      this.brain.targetId = fromId;
      this.brain.goal = 'chase';
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.brain.goal = 'dead';
      this.anim?.play('death', { loop: false });
    }
  }

  update(
    dt: number,
    hostiles: WarSenseTarget[],
    sampleGround: (x: number, z: number) => number | null,
    onAttack?: (attacker: WarUnit, targetId: string, damage: number, skill: string) => void,
  ): void {
    if (this.dead) {
      this.anim?.update(dt);
      return;
    }

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    const pos = this.root.position;
    let target =
      hostiles.find((h) => h.id === this.brain.targetId) ??
      this.brain.pickNearestHostile(pos, hostiles);

    // Player: click-move takes priority; auto-aggro when close
    let moveTarget: THREE.Vector3 | null = null;
    if (this.isPlayer && this.playerMoveTo) {
      moveTarget = this.playerMoveTo;
      const d = Math.hypot(this.playerMoveTo.x - pos.x, this.playerMoveTo.z - pos.z);
      if (d < 0.6) this.playerMoveTo = null;
    } else if (!this.isPlayer) {
      this.brain.arbitrate(pos, this.hp, hostiles, dt);
      target =
        hostiles.find((h) => h.id === this.brain.targetId) ??
        this.brain.pickNearestHostile(pos, hostiles);
      moveTarget = this.brain.computeMoveTarget(pos, target);
    } else {
      // Player idle: auto attack nearest in range
      this.brain.arbitrate(pos, this.hp, hostiles, dt);
      target =
        hostiles.find((h) => h.id === this.brain.targetId) ??
        this.brain.pickNearestHostile(pos, hostiles);
      if (target && !this.brain.shouldAttack(pos, target)) {
        moveTarget = target.position;
      }
    }

    let moving = false;
    if (moveTarget) {
      const dx = moveTarget.x - pos.x;
      const dz = moveTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.4) {
        const spd = this.archetype.moveSpeed * (this.isPlayer ? 1.15 : 1);
        const step = Math.min(dist, spd * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        this.facing = Math.atan2(dx, dz);
        this.root.rotation.y = this.facing;
        moving = true;
      }
    } else if (target && this.brain.shouldAttack(pos, target)) {
      const dx = target.position.x - pos.x;
      const dz = target.position.z - pos.z;
      this.facing = Math.atan2(dx, dz);
      this.root.rotation.y = this.facing;
    }

    // Ground snap
    const gy = sampleGround(pos.x, pos.z);
    if (gy != null) pos.y = gy;

    // Attack
    if (this.brain.shouldAttack(pos, target) && this.attackCd <= 0 && target) {
      this.attackCd = this.archetype.attackCooldown;
      const skill =
        this.archetype.skills[Math.floor(Math.random() * this.archetype.skills.length)] ??
        'slash';
      this.anim?.play('attack', { loop: false });
      onAttack?.(this, target.id, this.archetype.damage, skill);
    } else if (moving) {
      const moveState = this.anim?.hasClip('run') ? 'run' : 'walk';
      if (this.anim && this.anim.current !== moveState && this.anim.current !== 'attack') {
        if (this.anim.hasClip(moveState as any)) this.anim.play(moveState as any);
      }
    } else if (this.anim && this.anim.current !== 'idle' && this.anim.current !== 'attack') {
      this.anim.play('idle');
    }

    // Hit flash
    if (this.hitFlash > 0 && this.loaded) {
      this.loaded.scene.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (m?.emissive) m.emissive.setHex(0x440000);
        }
      });
    }

    this.anim?.update(dt);
  }

  dispose(): void {
    this.root.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }
}
