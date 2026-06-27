/**
 * CreatureManager — spawns and manages all wildlife in a zone.
 *
 * Handles:
 *   - Loading GLTF models from R2 CDN with proper animation binding
 *   - State-machine AI: idle → wander → flee/attack → dead → respawn
 *   - Fish swim below water surface with depth variance
 *   - Birds fly at fixed altitude
 *   - Combat: take damage, death animation, loot drop callback
 *   - Respawn on timer after death
 *
 * Usage (from play.tsx or tutorial.tsx):
 *   const cm = new CreatureManager(engine.getScene(), waterLevel);
 *   cm.spawnLandCreatures(terrainMesh, 12);
 *   cm.spawnFish(8);
 *   const unsub = engine.onUpdate(dt => cm.update(dt, playerPos));
 */
import * as THREE from 'three';
import { loadCharacterModel, type LoadedModel } from '@/lib/modelLoader';
import {
  getLandCreatures,
  getCotwCreatures,
  getFishCreatures,
  getWaterPredators,
  pickWeightedCreature,
  rollLoot,
  type CreatureDef,
} from './CreatureManifest';
import { resolveCotwAnimations } from './cotwAnimResolver';
import { CreatureBrain } from './CreatureBrain';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import type { TerrainNavMesh } from '../navigation/TerrainNavMesh';

// ── Types ────────────────────────────────────────────────────────────────────

type CreatureState = 'idle' | 'wander' | 'flee' | 'chase' | 'attack' | 'eat' | 'dead' | 'despawned';

interface CreatureInstance {
  id: string;
  def: CreatureDef;
  group: THREE.Group;
  model: LoadedModel | null;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  currentAnim: string;

  // State
  state: CreatureState;
  hp: number;
  stateTimer: number;
  respawnTimer: number;
  provoked: boolean;
  alerted: boolean;

  // Movement / brain
  brain: CreatureBrain;
  spawnPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
  swimY: number;
  loading: boolean;
}

export interface CreatureLootEvent {
  creatureId: string;
  creatureName: string;
  position: THREE.Vector3;
  loot: Array<{ itemId: string; name: string; quantity: number }>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WANDER_RADIUS = 25;
const WANDER_DURATION_MIN = 3;
const WANDER_DURATION_MAX = 8;
const IDLE_DURATION_MIN = 2;
const IDLE_DURATION_MAX = 6;
const DEATH_LINGER_TIME = 5;
const FLEE_DURATION = 4;
const BIRD_ALTITUDE = 30;

// ── Seeded RNG ───────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── CreatureManager ──────────────────────────────────────────────────────────

export class CreatureManager {
  private scene: THREE.Scene;
  private creatures = new Map<string, CreatureInstance>();
  private waterLevel: number;
  private rand: () => number;
  private nextId = 0;
  private navMesh: TerrainNavMesh | null = null;
  private sampleHeight: ((x: number, z: number) => number | null) | null = null;

  /** Called when a creature dies — provides loot data for the HUD */
  public onLootDrop?: (event: CreatureLootEvent) => void;
  /** Called when a creature attacks the player */
  public onPlayerDamage?: (damage: number, attackerId: string) => void;
  /** Called when huntable wildlife is spotted (alert state) */
  public onHuntAlert?: (creatureId: string, name: string, huntValue: number) => void;

  constructor(scene: THREE.Scene, waterLevel: number = -2, seed: number = 42) {
    this.scene = scene;
    this.waterLevel = waterLevel;
    this.rand = mulberry32(seed);
  }

  setNavMesh(navMesh: TerrainNavMesh | null): void {
    this.navMesh = navMesh;
  }

  setGroundSampler(sampleHeight: ((x: number, z: number) => number | null) | null): void {
    this.sampleHeight = sampleHeight;
  }

  private brainCtx() {
    return { navMesh: this.navMesh, sampleHeight: this.sampleHeight ?? undefined, rand: this.rand };
  }

  private landSpawnPool(): CreatureDef[] {
    const cotw = getCotwCreatures().filter((c) => c.category === 'land' || c.category === 'bird');
    return cotw.length > 0 ? cotw : getLandCreatures();
  }

  // ── Spawning ────────────────────────────────────────────────────────────

  /** Spawn land creatures in a ring (lobby / GLTF maps with custom height sampler) */
  spawnLandCreaturesInArea(
    sampleHeight: (x: number, z: number) => number | null,
    center: THREE.Vector3,
    innerRadius: number,
    outerRadius: number,
    count: number,
  ): void {
    const pool = this.landSpawnPool();
    if (pool.length === 0) return;

    for (let i = 0; i < count; i++) {
      const def = pickWeightedCreature(pool, this.rand);
      const angle = this.rand() * Math.PI * 2;
      const dist = innerRadius + this.rand() * (outerRadius - innerRadius);
      const x = center.x + Math.cos(angle) * dist;
      const z = center.z + Math.sin(angle) * dist;

      let y = sampleHeight(x, z);
      if (y === null || y < this.waterLevel + 1) continue;
      if (def.category === 'bird') y = BIRD_ALTITUDE;

      this.spawnCreature(def, new THREE.Vector3(x, y, z));
    }
  }

  /** Spawn land creatures scattered on terrain */
  spawnLandCreatures(terrainMesh: THREE.Mesh, count: number, radius: number = 200): void {
    const pool = getLandCreatures();
    if (pool.length === 0) return;

    for (let i = 0; i < count; i++) {
      const def = pickWeightedCreature(pool, this.rand);
      const angle = this.rand() * Math.PI * 2;
      const dist = 20 + this.rand() * (radius - 20);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      let y = getTerrainHeightAt(terrainMesh, x, z);
      if (y === null || y < this.waterLevel + 1) continue; // skip water areas

      if (def.category === 'bird') y = BIRD_ALTITUDE;

      this.spawnCreature(def, new THREE.Vector3(x, y, z));
    }
  }

  /** Spawn fish in water areas */
  spawnFish(count: number, radius: number = 200): void {
    const pool = [...getFishCreatures(), ...getWaterPredators()];
    if (pool.length === 0) return;

    for (let i = 0; i < count; i++) {
      const def = pickWeightedCreature(pool, this.rand);
      const angle = this.rand() * Math.PI * 2;
      const dist = 30 + this.rand() * (radius - 30);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const depthRange = def.swimDepth || [2, 8];
      const depth = depthRange[0] + this.rand() * (depthRange[1] - depthRange[0]);
      const swimY = this.waterLevel - depth;

      this.spawnCreature(def, new THREE.Vector3(x, swimY, z), swimY);
    }
  }

  private spawnCreature(def: CreatureDef, pos: THREE.Vector3, swimY?: number): void {
    const id = `creature_${this.nextId++}`;
    const group = new THREE.Group();
    group.position.copy(pos);
    this.scene.add(group);

    // Placeholder mesh while GLTF loads
    const isFish = def.category === 'fish' || def.category === 'predator';
    const color = isFish ? 0x4488cc :
      def.ai === 'aggressive' ? 0xcc4444 :
      def.ai === 'neutral' ? 0xccaa44 : 0x44cc44;
    const placeholder = new THREE.Mesh(
      isFish ? new THREE.ConeGeometry(0.5, 1.5, 6) : new THREE.CapsuleGeometry(0.5, 1, 6, 8),
      new THREE.MeshLambertMaterial({ color }),
    );
    placeholder.position.y = isFish ? 0 : 1;
    if (isFish) placeholder.rotation.x = Math.PI / 2;
    placeholder.castShadow = true;
    placeholder.name = '__placeholder';
    group.add(placeholder);

    // Nameplate
    const nameSprite = this.createNameplate(def.name, def.hp);
    nameSprite.position.y = isFish ? 2 : 3.5;
    group.add(nameSprite);

    const instance: CreatureInstance = {
      id,
      def,
      group,
      model: null,
      mixer: null,
      actions: new Map(),
      currentAnim: '',
      state: 'idle',
      hp: def.hp,
      stateTimer: IDLE_DURATION_MIN + this.rand() * (IDLE_DURATION_MAX - IDLE_DURATION_MIN),
      respawnTimer: 0,
      provoked: false,
      alerted: false,
      brain: new CreatureBrain(),
      spawnPos: pos.clone(),
      targetPos: pos.clone(),
      speed: def.moveSpeed,
      swimY: swimY ?? pos.y,
      loading: false,
    };

    this.creatures.set(id, instance);
    this.loadCreatureModel(instance);
  }

  // ── Model Loading ──────────────────────────────────────────────────────

  private async loadCreatureModel(instance: CreatureInstance): Promise<void> {
    if (instance.loading) return;
    instance.loading = true;

    try {
      const loaded = await loadCharacterModel(instance.def.modelPath);
      instance.model = loaded;

      loaded.scene.scale.setScalar(instance.def.scale);
      loaded.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove placeholder
      const placeholder = instance.group.getObjectByName('__placeholder');
      if (placeholder) instance.group.remove(placeholder);

      instance.group.add(loaded.scene);

      instance.mixer = new THREE.AnimationMixer(loaded.scene);
      const clipNames = loaded.clips.map((c) => c.name);
      const animDef = instance.def.cotwAnim
        ? { ...resolveCotwAnimations(clipNames), ...instance.def.anims }
        : instance.def.anims;

      for (const clip of loaded.clips) {
        for (const [stateKey, clipName] of Object.entries(animDef)) {
          if (clipName && clip.name === clipName) {
            const action = instance.mixer.clipAction(clip, loaded.scene);
            instance.actions.set(stateKey, action);
          }
        }
      }

      if (instance.def.cotwAnim) {
        for (const [stateKey, clipName] of Object.entries(animDef)) {
          if (!clipName || instance.actions.has(stateKey)) continue;
          const clip = loaded.clips.find((c) => c.name === clipName);
          if (clip) instance.actions.set(stateKey, instance.mixer.clipAction(clip, loaded.scene));
        }
      }

      // Play idle
      this.playAnim(instance, 'idle');
      console.log(`[CreatureManager] Loaded ${instance.def.name} (${instance.id}): ${instance.actions.size} animations`);
    } catch (err) {
      console.warn(`[CreatureManager] Failed to load ${instance.def.name}:`, err);
    }

    instance.loading = false;
  }

  // ── Animation ──────────────────────────────────────────────────────────

  private playAnim(instance: CreatureInstance, state: string, loop = true): void {
    if (instance.currentAnim === state) return;
    const action = instance.actions.get(state);
    if (!action) return;

    // Crossfade from current
    const currentAction = instance.actions.get(instance.currentAnim);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;

    if (currentAction && currentAction !== action) {
      action.reset().play();
      currentAction.crossFadeTo(action, 0.2, true);
    } else {
      action.reset().play();
    }

    instance.currentAnim = state;
  }

  // ── Update (call every frame) ──────────────────────────────────────────

  update(dt: number, playerPos: THREE.Vector3): void {
    for (const [, c] of this.creatures) {
      // Update mixer
      c.mixer?.update(dt);

      switch (c.state) {
        case 'idle':
          this.updateIdle(c, dt, playerPos);
          break;
        case 'wander':
          this.updateWander(c, dt, playerPos);
          break;
        case 'flee':
          this.updateFlee(c, dt);
          break;
        case 'chase':
          this.updateChase(c, dt, playerPos);
          break;
        case 'attack':
          this.updateAttack(c, dt, playerPos);
          break;
        case 'eat':
          this.updateEat(c, dt);
          break;
        case 'dead':
          this.updateDead(c, dt);
          break;
        case 'despawned':
          this.updateDespawned(c, dt);
          break;
      }
    }
  }

  // ── State Updates ──────────────────────────────────────────────────────

  private updateIdle(c: CreatureInstance, dt: number, playerPos: THREE.Vector3): void {
    c.stateTimer -= dt;

    const dist = c.group.position.distanceTo(playerPos);
    const aggro = c.brain.decideAggro(c.def, dist, c.provoked, this.brainCtx());
    if (aggro === 'flee') {
      this.beginFlee(c, playerPos);
      return;
    }
    if (aggro === 'chase') {
      this.setState(c, 'chase');
      return;
    }
    if (aggro === 'alert' && !c.alerted) {
      c.alerted = true;
      this.onHuntAlert?.(c.id, c.def.name, c.def.huntValue ?? 0);
    }

    if (c.stateTimer <= 0) {
      this.pickWanderTarget(c);
      const wanderTime = WANDER_DURATION_MIN + this.rand() * (WANDER_DURATION_MAX - WANDER_DURATION_MIN);
      this.setState(c, 'wander', wanderTime);
    }

    this.playAnim(c, 'idle');
  }

  private updateWander(c: CreatureInstance, dt: number, playerPos: THREE.Vector3): void {
    c.stateTimer -= dt;

    const playerDist = c.group.position.distanceTo(playerPos);
    const aggro = c.brain.decideAggro(c.def, playerDist, c.provoked, this.brainCtx());
    if (aggro === 'flee') {
      this.beginFlee(c, playerPos);
      return;
    }
    if (aggro === 'chase') {
      this.setState(c, 'chase');
      return;
    }

    const arrived = this.moveAlongPath(c, c.def.moveSpeed * 0.4, dt);
    this.playAnim(c, c.def.category === 'fish' ? 'swim' : 'walk');

    if (arrived || c.stateTimer <= 0) {
      const idleTime = IDLE_DURATION_MIN + this.rand() * (IDLE_DURATION_MAX - IDLE_DURATION_MIN);
      this.setState(c, this.rand() < 0.3 ? 'eat' : 'idle', idleTime);
    }
  }

  private updateFlee(c: CreatureInstance, dt: number): void {
    c.stateTimer -= dt;
    this.moveAlongPath(c, c.def.moveSpeed, dt);
    this.playAnim(c, c.def.category === 'fish' ? 'swimFast' : (c.def.anims.run ? 'run' : 'walk'));

    if (c.stateTimer <= 0) {
      c.alerted = false;
      this.setState(c, 'idle', IDLE_DURATION_MIN);
    }
  }

  private updateChase(c: CreatureInstance, dt: number, playerPos: THREE.Vector3): void {
    const dist = c.group.position.distanceTo(playerPos);

    if (dist > c.def.alertRadius * 2) {
      // Lost interest — return
      this.setState(c, 'wander');
      c.targetPos.copy(c.spawnPos);
      return;
    }

    if (dist <= c.def.attackRange) {
      this.setState(c, 'attack', c.def.attackRange > 0 ? 1.5 : 0);
      return;
    }

    if (c.brain.path.length === 0) {
      c.brain.planPath(this.brainCtx(), c.group.position, playerPos);
    }
    this.moveAlongPath(c, c.def.moveSpeed, dt);
    this.playAnim(c, c.def.anims.run ? 'run' : 'walk');
  }

  private updateAttack(c: CreatureInstance, dt: number, playerPos: THREE.Vector3): void {
    c.stateTimer -= dt;
    this.playAnim(c, 'attack', false);

    if (c.stateTimer <= 0) {
      // Deal damage
      const dist = c.group.position.distanceTo(playerPos);
      if (dist <= c.def.attackRange * 1.5 && c.def.damage > 0) {
        this.onPlayerDamage?.(c.def.damage, c.id);
      }
      // Return to chase
      this.setState(c, 'chase');
    }
  }

  private updateEat(c: CreatureInstance, dt: number): void {
    c.stateTimer -= dt;
    this.playAnim(c, c.def.anims.eat ? 'eat' : 'idle');
    if (c.stateTimer <= 0) {
      this.setState(c, 'idle', IDLE_DURATION_MIN + this.rand() * IDLE_DURATION_MAX);
    }
  }

  private updateDead(c: CreatureInstance, dt: number): void {
    c.stateTimer -= dt;
    this.playAnim(c, 'death', false);

    if (c.stateTimer <= 0) {
      // Hide and start respawn timer
      c.group.visible = false;
      c.state = 'despawned';
      c.respawnTimer = c.def.respawnTime;
    }
  }

  private updateDespawned(c: CreatureInstance, dt: number): void {
    c.respawnTimer -= dt;
    if (c.respawnTimer <= 0) {
      // Respawn at original position
      c.hp = c.def.hp;
      c.provoked = false;
      c.alerted = false;
      c.group.position.copy(c.spawnPos);
      c.group.visible = true;
      c.group.rotation.y = this.rand() * Math.PI * 2;
      this.setState(c, 'idle', IDLE_DURATION_MIN + this.rand() * IDLE_DURATION_MAX);
      this.playAnim(c, 'idle');
    }
  }

  // ── Combat Interface ───────────────────────────────────────────────────

  /** Deal damage to a creature. Returns loot if killed. */
  dealDamage(creatureId: string, damage: number): CreatureLootEvent | null {
    const c = this.creatures.get(creatureId);
    if (!c || c.state === 'dead' || c.state === 'despawned') return null;

    c.hp = Math.max(0, c.hp - damage);

    // Hit react
    if (c.hp > 0) {
      if (c.def.anims.hitReact) {
        this.playAnim(c, 'hitReact', false);
        c.currentAnim = ''; // allow re-triggering
      }
      c.provoked = true;
      if (c.def.ai === 'neutral' || c.def.ai === 'passive') {
        this.setState(c, 'chase');
      }
      return null;
    }

    // Killed
    this.setState(c, 'dead', DEATH_LINGER_TIME);

    const loot = rollLoot(c.def, this.rand);
    const event: CreatureLootEvent = {
      creatureId: c.id,
      creatureName: c.def.name,
      position: c.group.position.clone(),
      loot,
    };
    this.onLootDrop?.(event);
    return event;
  }

  /** Find nearest alive creature within range of a position */
  findNearest(
    pos: THREE.Vector3,
    maxRange: number,
    category?: string,
    huntableOnly = true,
  ): { id: string; dist: number; name: string; huntValue: number } | null {
    let nearest: { id: string; dist: number; name: string; huntValue: number } | null = null;

    for (const [id, c] of this.creatures) {
      if (c.state === 'dead' || c.state === 'despawned') continue;
      if (category && c.def.category !== category) continue;
      if (huntableOnly && !c.def.huntable) continue;

      const dist = c.group.position.distanceTo(pos);
      if (dist < maxRange && (!nearest || dist < nearest.dist)) {
        nearest = { id, dist, name: c.def.name, huntValue: c.def.huntValue ?? 0 };
      }
    }

    return nearest;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private setState(c: CreatureInstance, state: CreatureState, timer?: number): void {
    c.state = state;
    c.stateTimer = timer ?? 0;
    if (state !== 'chase') c.brain.clearPath();
  }

  private beginFlee(c: CreatureInstance, threatPos: THREE.Vector3): void {
    const away = c.group.position.clone().sub(threatPos).normalize();
    const fleeDist = 30 + this.rand() * 20;
    c.targetPos.copy(c.group.position).addScaledVector(away, fleeDist);
    c.brain.planPath(this.brainCtx(), c.group.position, c.targetPos);
    this.setState(c, 'flee', FLEE_DURATION);
  }

  private pickWanderTarget(c: CreatureInstance): void {
    const roam = c.def.roamRadius ?? WANDER_RADIUS;
    c.targetPos.copy(c.brain.pickRoamTarget(c.spawnPos, roam, this.brainCtx()));
    c.brain.planPath(this.brainCtx(), c.group.position, c.targetPos);
  }

  private moveAlongPath(c: CreatureInstance, speed: number, dt: number): boolean {
    const swimY = (c.def.category === 'fish' || c.def.category === 'predator') ? c.swimY : undefined;
    const arrived = c.brain.followPath(c.group.position, speed, dt, this.brainCtx(), swimY);

    const next = c.brain.path[c.brain.pathIndex];
    if (next) {
      const dx = next.x - c.group.position.x;
      const dz = next.z - c.group.position.z;
      if (dx * dx + dz * dz > 0.01) c.group.rotation.y = Math.atan2(dx, dz);
    }

    if (c.def.category === 'fish' || c.def.category === 'predator') {
      c.group.position.y = c.swimY + Math.sin(performance.now() * 0.001 + c.swimY) * 0.3;
    } else if (c.def.category === 'bird') {
      c.group.position.y = BIRD_ALTITUDE + Math.sin(performance.now() * 0.0008) * 3;
    } else if (this.sampleHeight) {
      const y = this.sampleHeight(c.group.position.x, c.group.position.z);
      if (y !== null) c.group.position.y = y;
    }

    return arrived;
  }

  private createNameplate(name: string, hp: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.roundRect(4, 4, 248, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 30);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3, 0.6, 1);
    return sprite;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  get count(): number {
    return this.creatures.size;
  }

  get aliveCount(): number {
    let n = 0;
    for (const [, c] of this.creatures) {
      if (c.state !== 'dead' && c.state !== 'despawned') n++;
    }
    return n;
  }

  dispose(): void {
    for (const [, c] of this.creatures) {
      this.scene.remove(c.group);
      c.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
          else mesh.material?.dispose();
        }
      });
    }
    this.creatures.clear();
  }
}
