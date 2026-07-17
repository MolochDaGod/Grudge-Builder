/**
 * AllyController — state-machine AI companion (Gouldstone system).
 *
 * States: idle → follow → combat → guard → return → dead
 * Uses TerrainNavMesh A* for pathfinding, AnimationBlendManager for anims.
 */
import * as THREE from 'three';
import { TerrainNavMesh, type NavPath } from '../navigation/TerrainNavMesh';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';

export type AllyState = 'idle' | 'follow' | 'combat' | 'guard' | 'return' | 'dead' | 'group';

export interface AllyStats {
  maxHp: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  moveSpeed: number;
  aggroRadius: number;
  /** Distance to maintain from follow target */
  followDistance: number;
}

export interface AllyConfig {
  id: string;
  /** Display name */
  name: string;
  stats: AllyStats;
  /** Starting position */
  position: THREE.Vector3;
  /** Guard position (set when switching to guard mode) */
  guardPosition?: THREE.Vector3;
  /** Source character ID (Gouldstone clone origin) */
  sourceCharacterId?: string;
}

const DEFAULT_STATS: AllyStats = {
  maxHp: 100,
  damage: 10,
  attackRange: 3,
  attackCooldown: 1.5,
  moveSpeed: 20,
  aggroRadius: 15,
  followDistance: 4,
};

/** Minimal enemy interface for combat targeting */
export interface CombatTarget {
  id: string;
  position: THREE.Vector3;
  hp: number;
  dead: boolean;
}

export class AllyController {
  public readonly id: string;
  public readonly name: string;
  public state: AllyState = 'idle';
  public hp: number;
  public readonly stats: AllyStats;
  public model: THREE.Group;

  // Pathfinding
  private navMesh: TerrainNavMesh;
  private terrainMesh: THREE.Mesh;
  private currentPath: NavPath | null = null;
  private pathIndex = 0;
  private repathTimer = 0;

  // Combat
  private target: CombatTarget | null = null;
  private attackTimer = 0;

  // Follow
  private followTarget: THREE.Vector3 | null = null;
  private guardPosition: THREE.Vector3 | null = null;
  private homePosition: THREE.Vector3 | null = null;
  private groupAnchor: THREE.Vector3 | null = null;
  /** Aggressive attack mode — chase beyond normal aggro */
  private aggressive = false;
  /** In player party (follow / group) */
  public joinParty = false;

  // Callbacks
  public onAttack?: (target: CombatTarget, damage: number) => void;
  public onDeath?: (ally: AllyController) => void;
  public onStateChange?: (prev: AllyState, next: AllyState) => void;

  constructor(
    config: AllyConfig,
    navMesh: TerrainNavMesh,
    terrainMesh: THREE.Mesh,
    scene: THREE.Scene,
  ) {
    this.id = config.id;
    this.name = config.name;
    this.stats = { ...DEFAULT_STATS, ...config.stats };
    this.hp = this.stats.maxHp;
    this.navMesh = navMesh;
    this.terrainMesh = terrainMesh;
    this.guardPosition = config.guardPosition || null;

    // Placeholder model (green capsule — replaced by GLTF later)
    this.model = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.7, 1.8, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x44cc44 }),
    );
    body.position.y = 1.5;
    body.castShadow = true;
    this.model.add(body);

    // Nameplate
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#44cc44';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.position.y = 4;
    sprite.scale.set(4, 1, 1);
    this.model.add(sprite);

    this.model.position.copy(config.position);
    scene.add(this.model);
  }

  // ─── State transitions ──────────────────────────────────────────────────────

  private setState(next: AllyState): void {
    if (next === this.state) return;
    const prev = this.state;
    this.state = next;
    this.currentPath = null;
    this.pathIndex = 0;
    this.onStateChange?.(prev, next);
  }

  /** Command: follow the player (join party) */
  commandFollow(playerPosition: THREE.Vector3): void {
    this.followTarget = playerPosition.clone();
    this.aggressive = false;
    this.joinParty = true;
    this.setState('follow');
  }

  /** Command: guard current position */
  commandGuard(): void {
    this.guardPosition = this.model.position.clone();
    this.aggressive = false;
    this.joinParty = false;
    this.setState('guard');
  }

  /** F1 — Defend camp at home post */
  commandDefendCamp(homePosition: THREE.Vector3): void {
    this.homePosition = homePosition.clone();
    this.guardPosition = homePosition.clone();
    this.aggressive = false;
    this.joinParty = false;
    this.followTarget = null;
    this.setState('guard');
  }

  /** F3 — Go home to camp garrison post */
  commandGoHome(homePosition: THREE.Vector3): void {
    this.homePosition = homePosition.clone();
    this.guardPosition = homePosition.clone();
    this.followTarget = null;
    this.aggressive = false;
    this.joinParty = false;
    this.target = null;
    this.setState('return');
  }

  /** F4 — Attack: aggressive pursue hostiles */
  commandAttackAggressive(): void {
    this.aggressive = true;
    this.joinParty = false;
    this.setState('combat');
  }

  /** F5 — Group on me: rally tight, then hold near player */
  commandGroupOnMe(playerPosition: THREE.Vector3): void {
    this.groupAnchor = playerPosition.clone();
    this.followTarget = playerPosition.clone();
    this.aggressive = false;
    this.joinParty = true;
    this.setState('group');
  }

  /** Command: recall (stop and idle) */
  commandRecall(): void {
    this.target = null;
    this.followTarget = null;
    this.aggressive = false;
    this.joinParty = false;
    this.setState('idle');
  }

  /** Take damage */
  takeDamage(amount: number): void {
    if (this.state === 'dead') return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.setState('dead');
      this.onDeath?.(this);
    }
  }

  // ─── Update (called every frame) ───────────────────────────────────────────

  update(
    dt: number,
    playerPosition: THREE.Vector3,
    enemies: CombatTarget[],
  ): void {
    if (this.state === 'dead') return;

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.repathTimer -= dt;

    // Check for nearby enemies (all states except dead)
    const nearestEnemy = this.findNearestEnemy(enemies);

    switch (this.state) {
      case 'idle':
        // Just stand around; will auto-aggro if enemy is close
        if (nearestEnemy) this.engageCombat(nearestEnemy);
        break;

      case 'follow':
        this.followTarget = playerPosition;
        // Aggro check
        if (nearestEnemy) {
          this.engageCombat(nearestEnemy);
          break;
        }
        this.moveToward(playerPosition, this.stats.followDistance, dt);
        break;

      case 'combat':
        if (!this.target || this.target.dead || this.target.hp <= 0) {
          // Target dead — return to previous behavior
          this.target = null;
          this.setState(this.followTarget ? 'follow' : this.guardPosition ? 'guard' : 'idle');
          break;
        }
        this.updateCombat(dt);
        break;

      case 'guard':
        if (nearestEnemy) {
          this.engageCombat(nearestEnemy);
          break;
        }
        // Return to guard position if drifted
        if (this.guardPosition) {
          this.moveToward(this.guardPosition, 1, dt);
        }
        break;

      case 'return': {
        const returnTarget =
          this.homePosition || this.guardPosition || this.followTarget || playerPosition;
        const dist = this.model.position.distanceTo(returnTarget);
        if (dist < 2.5) {
          this.guardPosition = returnTarget.clone();
          this.setState('guard');
        } else {
          this.moveToward(returnTarget, 1, dt);
        }
        break;
      }

      case 'group': {
        // Rally to player, then hold formation (tighter than follow)
        this.groupAnchor = playerPosition.clone();
        if (nearestEnemy) {
          this.engageCombat(nearestEnemy);
          break;
        }
        const gDist = this.model.position.distanceTo(playerPosition);
        if (gDist > 2.2) {
          this.moveToward(playerPosition, 1.8, dt);
        }
        break;
      }
    }

    // Terrain snap
    const h = getTerrainHeightAt(this.terrainMesh, this.model.position.x, this.model.position.z);
    if (h !== null) {
      this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, h, dt * 10);
    }
  }

  // ─── Combat ─────────────────────────────────────────────────────────────────

  private engageCombat(enemy: CombatTarget): void {
    this.target = enemy;
    this.setState('combat');
  }

  private updateCombat(dt: number): void {
    if (!this.target) return;

    const dist = this.model.position.distanceTo(this.target.position);

    if (dist > this.stats.attackRange) {
      // Move toward target
      this.moveToward(this.target.position, this.stats.attackRange * 0.8, dt);
    } else {
      // Face target
      const dir = this.target.position.clone().sub(this.model.position);
      this.model.rotation.y = Math.atan2(dir.x, dir.z);

      // Attack
      if (this.attackTimer <= 0) {
        this.onAttack?.(this.target, this.stats.damage);
        this.attackTimer = this.stats.attackCooldown;
      }
    }

    // Leash: if target gets too far, disengage
    if (dist > this.stats.aggroRadius * 2) {
      this.target = null;
      this.setState('return');
    }
  }

  private findNearestEnemy(enemies: CombatTarget[]): CombatTarget | null {
    let nearest: CombatTarget | null = null;
    let nearestDist = this.stats.aggroRadius;

    let aggroRange =
      this.state === 'guard' ? this.stats.aggroRadius * 0.85 : this.stats.aggroRadius;
    if (this.aggressive || this.state === 'combat') {
      aggroRange = this.stats.aggroRadius * 2.2;
    }
    if (this.state === 'group' || this.state === 'follow') {
      aggroRange = this.stats.aggroRadius * 1.2;
    }

    for (const e of enemies) {
      if (e.dead || e.hp <= 0) continue;
      const dist = this.model.position.distanceTo(e.position);
      if (dist < aggroRange && dist < nearestDist) {
        nearest = e;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  // ─── Movement ───────────────────────────────────────────────────────────────

  private moveToward(target: THREE.Vector3, stopDist: number, dt: number): void {
    const dist = this.model.position.distanceTo(target);
    if (dist <= stopDist) return;

    // Repath periodically
    if (this.repathTimer <= 0 || !this.currentPath) {
      this.currentPath = this.navMesh.findPath(
        this.model.position.x, this.model.position.z,
        target.x, target.z,
      );
      this.pathIndex = 0;
      this.repathTimer = 0.5;
    }

    if (!this.currentPath || this.currentPath.points.length === 0) {
      // Fallback: direct move
      const dir = target.clone().sub(this.model.position).normalize();
      this.model.position.x += dir.x * this.stats.moveSpeed * dt;
      this.model.position.z += dir.z * this.stats.moveSpeed * dt;
      this.model.rotation.y = Math.atan2(dir.x, dir.z);
      return;
    }

    // Follow path
    if (this.pathIndex < this.currentPath.points.length) {
      const wp = this.currentPath.points[this.pathIndex];
      const dx = wp.x - this.model.position.x;
      const dz = wp.z - this.model.position.z;
      const wpDist = Math.sqrt(dx * dx + dz * dz);

      if (wpDist < 2) {
        this.pathIndex++;
      } else {
        const dir = new THREE.Vector3(dx, 0, dz).normalize();
        this.model.position.x += dir.x * this.stats.moveSpeed * dt;
        this.model.position.z += dir.z * this.stats.moveSpeed * dt;
        this.model.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.model.parent?.remove(this.model);
    this.model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose();
      }
    });
  }
}

// ─── AllyManager ──────────────────────────────────────────────────────────────

export const MAX_ALLIES = 15;

export class AllyManager {
  private allies = new Map<string, AllyController>();
  private scene: THREE.Scene;
  private navMesh: TerrainNavMesh;
  private terrainMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, navMesh: TerrainNavMesh, terrainMesh: THREE.Mesh) {
    this.scene = scene;
    this.navMesh = navMesh;
    this.terrainMesh = terrainMesh;
  }

  /** Deploy a new ally (Gouldstone clone). Returns null if at capacity. */
  deploy(config: Omit<AllyConfig, 'id'>): AllyController | null {
    if (this.allies.size >= MAX_ALLIES) return null;

    const id = `ally_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ally = new AllyController(
      { ...config, id },
      this.navMesh,
      this.terrainMesh,
      this.scene,
    );
    this.allies.set(id, ally);
    return ally;
  }

  /** Recall (remove) an ally */
  recall(id: string): void {
    const ally = this.allies.get(id);
    if (!ally) return;
    ally.destroy();
    this.allies.delete(id);
  }

  /** Recall all allies */
  recallAll(): void {
    for (const [id] of this.allies) this.recall(id);
  }

  /** Update all allies */
  update(dt: number, playerPosition: THREE.Vector3, enemies: CombatTarget[]): void {
    for (const [, ally] of this.allies) {
      ally.update(dt, playerPosition, enemies);
    }
  }

  /** Command all allies to follow */
  commandAllFollow(playerPosition: THREE.Vector3): void {
    for (const [, ally] of this.allies) ally.commandFollow(playerPosition);
  }

  /** Command all allies to guard their current positions */
  commandAllGuard(): void {
    for (const [, ally] of this.allies) ally.commandGuard();
  }

  commandAllDefend(home: THREE.Vector3): void {
    for (const [, ally] of this.allies) ally.commandDefendCamp(home);
  }

  commandAllGoHome(home: THREE.Vector3): void {
    for (const [, ally] of this.allies) ally.commandGoHome(home);
  }

  commandAllAttack(): void {
    for (const [, ally] of this.allies) ally.commandAttackAggressive();
  }

  commandAllGroupOnMe(playerPosition: THREE.Vector3): void {
    for (const [, ally] of this.allies) ally.commandGroupOnMe(playerPosition);
  }

  getAlly(id: string): AllyController | undefined {
    return this.allies.get(id);
  }

  /** Get all living allies */
  getLiving(): AllyController[] {
    return Array.from(this.allies.values()).filter(a => a.state !== 'dead');
  }

  /** Get all ally positions (for multiplayer broadcast) */
  getPositions(): Array<{ id: string; x: number; y: number; z: number; state: AllyState }> {
    return Array.from(this.allies.values()).map(a => ({
      id: a.id,
      x: a.model.position.x,
      y: a.model.position.y,
      z: a.model.position.z,
      state: a.state,
    }));
  }

  get count(): number { return this.allies.size; }
  get maxAllies(): number { return MAX_ALLIES; }

  destroy(): void {
    for (const [, ally] of this.allies) ally.destroy();
    this.allies.clear();
  }
}
