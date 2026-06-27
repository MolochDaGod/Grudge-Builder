/**
 * OrcBossController — Three.js rendering + world integration for Ghar'Thok.
 *
 * Responsibilities:
 *   1. Load all 20 GLB animation files (each has baked mesh)
 *   2. Share a single mesh + swap animation clips via AnimationMixer
 *   3. Move the boss in world space using navmesh pathfinding
 *   4. Sample terrain height for Y position
 *   5. Drive the OrcBossAI FSM each frame
 *   6. Render boss HP bar + phase indicator
 *   7. Expose hitbox cone check for player damage validation
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrcBossAI, type BossWorldInput, type BossAIOutput } from './OrcBossAI';
import { AttackWarningSystem, pickWarningVariant } from '../combat/AttackWarningSystem';
import {
  ORC_BOSS_MODEL_BASE,
  ORC_BOSS_ANIMS,
  ORC_BOSS_BASE_STATS,
  ORC_BOSS_LOOT,
  type OrcBossAnimKey,
  type AttackPattern,
  type LootDrop,
} from '@shared/definitions/orcWarriorBoss';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrcBossSpawnConfig {
  /** World-space spawn position */
  position: THREE.Vector3;
  /** Scene to add the boss to */
  scene: THREE.Scene;
  /** Terrain mesh for Y height sampling */
  terrainMesh?: THREE.Mesh;
  /** Optional navmesh for pathfinding (falls back to direct movement) */
  navMesh?: any; // TerrainNavMesh from ../navigation/
  /** Override base stats */
  statsOverride?: Partial<typeof ORC_BOSS_BASE_STATS>;
  /** Called when the boss dies — receives loot rolls */
  onDeath?: (loot: LootDrop[]) => void;
  /** Called on phase transition */
  onPhaseChange?: (phase: string, phaseName: string) => void;
}

// ── Controller ───────────────────────────────────────────────────────────────

export class OrcBossController {
  readonly ai: OrcBossAI;
  readonly group = new THREE.Group();

  // Three.js state
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<OrcBossAnimKey, THREE.AnimationAction>();
  private currentAction: THREE.AnimationAction | null = null;
  private currentAnimKey: OrcBossAnimKey | null = null;
  private model: THREE.Object3D | null = null;
  private loaded = false;

  // World state
  private spawnPos: THREE.Vector3;
  private position: THREE.Vector3;
  private facing = 0; // Y-axis rotation in radians

  // References
  private scene: THREE.Scene;
  private terrainMesh?: THREE.Mesh;
  private raycaster = new THREE.Raycaster();

  // HP bar
  private hpBarGroup: THREE.Group | null = null;
  private hpBarFill: THREE.Mesh | null = null;

  // Phase aura
  private auraLight: THREE.PointLight | null = null;

  // Callbacks
  private onDeath?: (loot: LootDrop[]) => void;
  private onPhaseChange?: (phase: string, name: string) => void;

  // Attack telegraphs
  private readonly warnings: AttackWarningSystem;
  private readonly warningId = 'orc_boss_main';

  // State
  private isDead = false;
  private lastOutput: BossAIOutput | null = null;
  private wasTelegraphing = false;

  constructor(config: OrcBossSpawnConfig) {
    this.ai = new OrcBossAI(config.statsOverride);
    this.spawnPos = config.position.clone();
    this.position = config.position.clone();
    this.scene = config.scene;
    this.terrainMesh = config.terrainMesh;
    this.onDeath = config.onDeath;
    this.onPhaseChange = config.onPhaseChange;

    this.group.name = 'orc_boss_gharthok';
    this.group.position.copy(this.position);
    this.group.scale.setScalar(this.ai.stats.scale);
    this.scene.add(this.group);

    this.warnings = new AttackWarningSystem(this.scene);
    this.createHPBar();
    this.createAura();
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    const animKeys = Object.keys(ORC_BOSS_ANIMS) as OrcBossAnimKey[];

    // Load the first GLB to get the mesh
    const firstKey = animKeys[0];
    const firstPath = `${ORC_BOSS_MODEL_BASE}/${ORC_BOSS_ANIMS[firstKey]}`;

    const firstGltf = await loader.loadAsync(firstPath);
    this.model = firstGltf.scene;
    this.model.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.group.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);

    // Store the first animation
    if (firstGltf.animations.length > 0) {
      const clip = firstGltf.animations[0];
      clip.name = firstKey;
      this.actions.set(firstKey, this.mixer.clipAction(clip));
    }

    // Load remaining animations in parallel (just clips, shared mesh)
    const loadPromises = animKeys.slice(1).map(async (key) => {
      try {
        const path = `${ORC_BOSS_MODEL_BASE}/${ORC_BOSS_ANIMS[key]}`;
        const gltf = await loader.loadAsync(path);
        if (gltf.animations.length > 0) {
          const clip = gltf.animations[0];
          clip.name = key;
          this.actions.set(key, this.mixer!.clipAction(clip, this.model!));
        }
      } catch (err) {
        console.warn(`[OrcBoss] Failed to load anim "${key}":`, err);
      }
    });

    await Promise.all(loadPromises);
    await this.warnings.preload();

    // Play idle
    this.playAnim('idle');
    this.loaded = true;
    console.log(`[OrcBoss] Loaded ${this.actions.size}/${animKeys.length} animations`);
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  private playAnim(key: OrcBossAnimKey, fadeDuration = 0.2): void {
    if (key === this.currentAnimKey) return;

    const next = this.actions.get(key);
    if (!next) return;

    next.reset().play();
    next.timeScale = 1;

    if (this.currentAction && this.currentAction !== next) {
      this.currentAction.crossFadeTo(next, fadeDuration, false);
    }

    this.currentAction = next;
    this.currentAnimKey = key;
  }

  // ── Update (call every frame) ──────────────────────────────────────────────

  update(dt: number, playerPos?: THREE.Vector3, playerIsAttacking = false): void {
    if (!this.loaded || this.isDead) {
      this.mixer?.update(dt);
      return;
    }

    // Build world input
    const targetPos = playerPos ? { x: playerPos.x, y: playerPos.y, z: playerPos.z } : null;
    const targetDistance = playerPos ? this.position.distanceTo(playerPos) : 999;

    const input: BossWorldInput = {
      bossPos: { x: this.position.x, y: this.position.y, z: this.position.z },
      spawnPos: { x: this.spawnPos.x, y: this.spawnPos.y, z: this.spawnPos.z },
      targetPos,
      targetDistance,
      targetIsAttacking: playerIsAttacking,
      dt,
    };

    // Tick AI
    const output = this.ai.tick(input);
    this.lastOutput = output;

    // Play animation
    this.playAnim(output.anim);

    this.updateAttackWarning(output);

    // Move
    if (output.moveDir && output.moveSpeed > 0) {
      this.position.x += output.moveDir.x * output.moveSpeed * dt;
      this.position.z += output.moveDir.z * output.moveSpeed * dt;

      // Sample terrain height
      const groundY = this.getTerrainHeight(this.position.x, this.position.z);
      if (groundY !== null) this.position.y = groundY;
    }

    // Face target
    if (output.faceTarget) {
      const targetAngle = Math.atan2(
        output.faceTarget.x - this.position.x,
        output.faceTarget.z - this.position.z,
      );
      // Smooth turn
      const turnRate = this.ai.stats.turnRate * dt;
      let diff = targetAngle - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
    }

    // Apply to group
    this.group.position.copy(this.position);
    this.group.rotation.y = this.facing;

    // Update HP bar
    this.updateHPBar(output.stats.currentHP, output.stats.maxHP);

    // Phase transition VFX
    if (output.phaseChanged) {
      this.updateAura(output.phase);
      this.onPhaseChange?.(output.phase, output.phase === 'phase2' ? 'Enraged' : 'Berserker');
    }

    // Death
    if (output.state === 'dead' && !this.isDead) {
      this.isDead = true;
      this.onBossDeath();
    }

    // Update mixer
    this.mixer?.update(dt);
  }

  private updateAttackWarning(output: BossAIOutput): void {
    if (output.telegraph) {
      const atk = output.telegraph.attack;
      const variant = pickWarningVariant(atk);
      const forward = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
      const origin = this.position.clone();

      if (variant === 'incoming' && output.faceTarget) {
        origin.set(output.faceTarget.x, this.position.y, output.faceTarget.z);
      } else if (variant === 'cone') {
        origin.addScaledVector(forward, atk.range * 0.45);
      }

      this.warnings.showTelegraph({
        id: this.warningId,
        variant,
        position: origin,
        facing: this.facing,
        range: atk.range,
        arc: atk.arc,
        totalSec: output.telegraph.totalSec,
        remainingSec: output.telegraph.remainingSec,
        progress: output.telegraph.progress,
      });
      this.wasTelegraphing = true;
      return;
    }

    if (this.wasTelegraphing) {
      this.warnings.hide(this.warningId);
      this.wasTelegraphing = false;
    }
  }

  // ── Damage ─────────────────────────────────────────────────────────────────

  /** Deal damage to the boss. Returns true if killed. */
  dealDamage(amount: number): boolean {
    return this.ai.takeDamage(amount);
  }

  /** Force knockdown (from a player ability) */
  knockDown(): void {
    this.ai.knockDown();
  }

  // ── Hitbox Check ───────────────────────────────────────────────────────────

  /**
   * Check if a point (player position) is within the boss's active attack hitbox.
   * Returns the damage amount if hit, or 0 if not.
   */
  checkHitbox(targetPos: THREE.Vector3): number {
    if (!this.lastOutput?.activeAttack) return 0;

    const atk = this.lastOutput.activeAttack;
    const dist = this.position.distanceTo(targetPos);
    if (dist > atk.range) return 0;

    // Check arc — angle between boss facing and direction to target
    const toTarget = Math.atan2(
      targetPos.x - this.position.x,
      targetPos.z - this.position.z,
    );
    let angleDiff = Math.abs(toTarget - this.facing);
    while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    if (angleDiff > atk.arc / 2) return 0;

    // Hit! Return phase-modified damage
    const phaseCfg = this.lastOutput.phase;
    const multiplier = phaseCfg === 'phase3' ? 2.0 : phaseCfg === 'phase2' ? 1.5 : 1.0;
    return atk.damage * multiplier;
  }

  // ── Death + Loot ───────────────────────────────────────────────────────────

  private onBossDeath(): void {
    // Roll loot
    const drops: LootDrop[] = [];
    for (const item of ORC_BOSS_LOOT) {
      if (Math.random() <= item.dropChance) {
        drops.push({
          ...item,
          minQuantity: item.minQuantity + Math.floor(Math.random() * (item.maxQuantity - item.minQuantity + 1)),
        });
      }
    }

    this.onDeath?.(drops);

    // Hide HP bar
    if (this.hpBarGroup) this.hpBarGroup.visible = false;
    if (this.auraLight) this.auraLight.visible = false;
  }

  // ── Terrain Height ─────────────────────────────────────────────────────────

  private getTerrainHeight(x: number, z: number): number | null {
    if (!this.terrainMesh) return null;
    this.raycaster.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
    const hits = this.raycaster.intersectObject(this.terrainMesh);
    return hits.length > 0 ? hits[0].point.y : null;
  }

  // ── HP Bar ─────────────────────────────────────────────────────────────────

  private createHPBar(): void {
    this.hpBarGroup = new THREE.Group();
    this.hpBarGroup.position.y = 4.5;

    // Background
    const bgGeo = new THREE.PlaneGeometry(3, 0.25);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarGroup.add(bg);

    // Fill
    const fillGeo = new THREE.PlaneGeometry(3, 0.25);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    this.hpBarFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpBarFill.position.z = 0.01;
    this.hpBarGroup.add(this.hpBarFill);

    this.group.add(this.hpBarGroup);
  }

  private updateHPBar(current: number, max: number): void {
    if (!this.hpBarFill || !this.hpBarGroup) return;
    const ratio = Math.max(0, current / max);
    this.hpBarFill.scale.x = ratio;
    this.hpBarFill.position.x = -(1 - ratio) * 1.5;

    // Color transitions: green → yellow → red
    const mat = this.hpBarFill.material as THREE.MeshBasicMaterial;
    if (ratio > 0.6) mat.color.setHex(0x22c55e);
    else if (ratio > 0.25) mat.color.setHex(0xfbbf24);
    else mat.color.setHex(0xef4444);

    // Billboard — face camera
    this.hpBarGroup.lookAt(
      this.hpBarGroup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 1)),
    );
  }

  // ── Phase Aura ─────────────────────────────────────────────────────────────

  private createAura(): void {
    this.auraLight = new THREE.PointLight(0x22c55e, 2, 15);
    this.auraLight.position.y = 2;
    this.group.add(this.auraLight);
  }

  private updateAura(phase: string): void {
    if (!this.auraLight) return;
    switch (phase) {
      case 'phase1': this.auraLight.color.setHex(0x22c55e); this.auraLight.intensity = 2; break;
      case 'phase2': this.auraLight.color.setHex(0xf97316); this.auraLight.intensity = 3; break;
      case 'phase3': this.auraLight.color.setHex(0xef4444); this.auraLight.intensity = 5; break;
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  getPosition(): THREE.Vector3 { return this.position.clone(); }
  getPhase(): string { return this.ai.phase; }
  getHP(): number { return this.ai.stats.currentHP; }
  getMaxHP(): number { return this.ai.stats.maxHP; }
  getState(): string { return this.ai.state; }
  isAlive(): boolean { return !this.isDead; }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.warnings.hideAll();
    this.mixer?.stopAllAction();
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.Material[]
          : [(child as THREE.Mesh).material as THREE.Material];
        mats.forEach(m => m.dispose());
      }
    });
  }
}
