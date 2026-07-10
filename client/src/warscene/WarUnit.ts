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
}

export class WarUnit {
  readonly id: string;
  readonly archetype: WarUnitArchetype;
  readonly faction: WarFactionId;
  readonly root = new THREE.Group();
  readonly brain: WarAIBrain;
  hp: number;
  maxHp: number;
  dead = false;
  private anim: AnimationManager | null = null;
  private attackCd = 0;
  private loaded: LoadedModel | null = null;
  private facing = 0;
  private velocity = new THREE.Vector3();
  private hitFlash = 0;

  constructor(spawn: WarUnitSpawn) {
    this.id = spawn.id;
    this.archetype = spawn.archetype;
    this.faction = spawn.archetype.faction;
    this.maxHp = spawn.archetype.maxHp;
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
    const raceId = normalizeRaceId(this.archetype.raceId);
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
        if (wt.includes('shield')) weaponSlots.shield = 'A';
      }

      setupGrudge6Equipment(race.prefix, loaded.scene, {
        baseModelId: race.modelId,
        equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
        weaponSlots,
        faceVariant: 'A',
        skinColor: '#ffffff',
        armorColor: this.factionTint(),
        capeEnabled: false,
        scale: race.scale,
      });
      ensureCharacterTextureColorSpace(loaded.scene);
      fitCharacterRootToHeightM(loaded.scene, race.scale, PLAYER_HEIGHT_M * 0.95);
      this.root.add(loaded.scene);

      this.anim = new AnimationManager(loaded.scene);
      const animSet = getAnimationSet(this.archetype.weaponType as WeaponType);
      const paths: Partial<Record<AnimState, string>> = {};
      if (animSet.idle) paths.idle = resolveModelUrl(animSet.idle.file);
      if (animSet.run) paths.walk = resolveModelUrl(animSet.run.file);
      if (animSet.run) paths.run = resolveModelUrl(animSet.run.file);
      if (animSet.attack1) paths.attack = resolveModelUrl(animSet.attack1.file);
      if (animSet.death) paths.death = resolveModelUrl(animSet.death.file);
      // Unarmed fallbacks
      if (!paths.idle || !paths.walk) {
        const unarmed = getAnimationSet('unarmed');
        if (!paths.idle && unarmed.idle) paths.idle = resolveModelUrl(unarmed.idle.file);
        if (!paths.walk && unarmed.run) paths.walk = resolveModelUrl(unarmed.run.file);
      }
      await this.anim.loadAnimations(paths).catch(() => {});
      if (this.anim.hasClip('idle')) this.anim.play('idle');
    } catch (err) {
      console.warn(`[WarUnit] load failed ${this.id}`, err);
      // Placeholder capsule
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: this.factionColorHex() }),
      );
      body.position.y = 0.9;
      body.castShadow = true;
      this.root.add(body);
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
    this.brain.arbitrate(pos, this.hp, hostiles, dt);

    const target =
      hostiles.find((h) => h.id === this.brain.targetId) ??
      this.brain.pickNearestHostile(pos, hostiles);

    const moveTarget = this.brain.computeMoveTarget(pos, target);
    let moving = false;
    if (moveTarget) {
      const dx = moveTarget.x - pos.x;
      const dz = moveTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.4) {
        const step = Math.min(dist, this.archetype.moveSpeed * dt);
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
