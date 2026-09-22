/**
 * CreatureManager — spawns and manages all wildlife in a zone.
 *
 * Handles:
 *   - Loading GLTF models from R2 CDN with proper animation binding
 *   - State-machine AI: idle → wander → flee/attack → dead → respawn
 *   - Fish swim below water surface with depth variance
 *   - Birds fly above the same terrain sample as feet (not a fixed world Y)
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
  CREATURE_MANIFEST,
  type CreatureDef,
} from './CreatureManifest';
import { resolveCotwAnimations } from './cotwAnimResolver';
import { CreatureBrain } from './CreatureBrain';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import type { TerrainNavMesh } from '../navigation/TerrainNavMesh';
import { WILDLIFE_SIZE_FACTOR } from '../zoneWorldScale';
import {
  resolveBiomePalette,
  wildlifeCountForBiome,
  fishCountForBiome,
} from '@shared/definitions/biomeHarvestAssets';
import {
  WORLD_SURFACE,
  isDryLand,
  isWaterColumn,
} from '@shared/definitions/worldSurfaceLayers';
import { FAUNA_HEIGHT, fishSwimY } from './faunaHeight';
import {
  CORPSE_TO_SKELETON_S,
  SKELETON_LINGER_S,
  createSkeletonCorpse,
  preloadSkeletonCorpses,
  skeletonScaleForBodyHeight,
} from './SkeletonCorpse';
import {
  AttackWarningSystem,
  pickWarningForRange,
} from '../combat/AttackWarningSystem';

// ── Types ────────────────────────────────────────────────────────────────────

type CreatureState =
  | 'idle'
  | 'wander'
  | 'flee'
  | 'chase'
  | 'telegraph'
  | 'attack'
  | 'eat'
  | 'dead'
  | 'skeleton'
  | 'despawned';

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
  /** Seconds remaining of stun lockout (Freya stun totem, etc.). */
  stunTimer: number;
  /** WoW-style room pack — hitting one pulls the pack. */
  packId?: string;
  alerted: boolean;
  /** Flesh looted / skinned (or auto after 2 min → skeleton). */
  looted: boolean;
  /** True once Skeletons_Free residual is showing. */
  isSkeleton: boolean;
  skeletonT: number;
  fleshRoot: THREE.Object3D | null;

  // Movement / brain
  brain: CreatureBrain;
  spawnPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
  swimY: number;
  loading: boolean;
  /**
   * When true, this creature is owned by SectorRoom.state.enemies (server id).
   * No local respawn — removal/death comes from schema.
   */
  networkAuth?: boolean;
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
/** Flesh corpse window before auto-skeleton (also matches skin window). */
const DEATH_LINGER_TIME = CORPSE_TO_SKELETON_S;
const FLEE_DURATION = 4;
const BIRD_BOB_M = FAUNA_HEIGHT?.birdBobM ?? 0.45;
const FEET_ON_TERRAIN_M = FAUNA_HEIGHT?.feetOnTerrainM ?? 0.05;
const FISH_MIN_SEABED_M = FAUNA_HEIGHT?.fishMinAboveSeabedM ?? 0.4;
const FISH_MIN_SURFACE_M = FAUNA_HEIGHT?.fishMinUnderSurfaceM ?? 0.3;
const BIRD_ABOVE_M =
  typeof FAUNA_HEIGHT === 'object' && FAUNA_HEIGHT && typeof FAUNA_HEIGHT.birdAboveTerrainM === 'number'
    ? FAUNA_HEIGHT.birdAboveTerrainM
    : 30;
/** Melee floor — grudge-ai-brains: no silent instant wildlife hit */
const WILDLIFE_TELEGRAPH_SEC = 0.35;

function creatureTelegraphSec(def: CreatureDef): number {
  if (typeof def.telegraphSec === 'number' && def.telegraphSec > 0) return def.telegraphSec;
  return WILDLIFE_TELEGRAPH_SEC;
}

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
  private warnings: AttackWarningSystem;

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
    this.warnings = new AttackWarningSystem(scene);
    void this.warnings.preload();
    preloadSkeletonCorpses();
  }

  setNavMesh(navMesh: TerrainNavMesh | null): void {
    this.navMesh = navMesh;
  }

  setGroundSampler(sampleHeight: ((x: number, z: number) => number | null) | null): void {
    this.sampleHeight = sampleHeight;
  }

  /** Keep aquatic life on production tide surface */
  setWaterLevel(y: number): void {
    if (Number.isFinite(y)) this.waterLevel = y;
  }

  getWaterLevel(): number {
    return this.waterLevel;
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
      if (y === null || !isDryLand(y, this.waterLevel, WORLD_SURFACE.dryLandMarginM)) continue;
      if (def.category === 'bird') y = y + BIRD_ABOVE_M;

      this.spawnCreature(def, new THREE.Vector3(x, y, z));
    }
  }

  /**
   * Build a land wildlife pool for a biome (9-sector / home / pirate map).
   * Prefers CreatureManifest keys listed in biomeHarvestAssets.wildlife.
   */
  private poolForBiome(biome?: string): CreatureDef[] {
    if (!biome) return this.landSpawnPool();
    const palette = resolveBiomePalette(biome);
    const preferred: CreatureDef[] = [];
    for (const id of palette.wildlife) {
      const def = CREATURE_MANIFEST[id];
      if (def && def.category !== 'fish' && def.category !== 'predator') preferred.push(def);
    }
    if (preferred.length > 0) return preferred;
    return this.landSpawnPool();
  }

  /** Clamp creature respawn to 1–5 minutes (user spec). */
  private clampRespawnSec(sec: number): number {
    return Math.min(300, Math.max(60, sec));
  }

  /** Spawn land creatures scattered on terrain (dry land only). */
  spawnLandCreatures(
    terrainMesh: THREE.Mesh,
    count: number,
    radius: number = 200,
    biome?: string,
  ): void {
    const pool = this.poolForBiome(biome);
    if (pool.length === 0) return;

    const target = biome ? wildlifeCountForBiome(biome, this.rand) : count;
    const n = Math.max(count, 0) || target;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = n * 8;

    while (placed < n && attempts < maxAttempts) {
      attempts++;
      const def = pickWeightedCreature(pool, this.rand);
      const angle = this.rand() * Math.PI * 2;
      const dist = 20 + this.rand() * (radius - 20);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      let y = getTerrainHeightAt(terrainMesh, x, z);
      // Dry land only — animals never spawn in water (worldSurfaceLayers SSOT)
      if (y === null || !isDryLand(y, this.waterLevel)) continue;

      if (def.category === 'bird') y = y + BIRD_ABOVE_M;

      this.spawnCreature(def, new THREE.Vector3(x, y, z));
      placed++;
    }
  }

  /**
   * Biome-aware zone spawn: land animals on dry land + fish only in water.
   * Counts come from biomeHarvestAssets when not overridden.
   */
  spawnForBiome(
    terrainMesh: THREE.Mesh | null,
    biome: string,
    radius: number = 200,
    overrides?: { land?: number; fish?: number },
  ): void {
    const landN = overrides?.land ?? wildlifeCountForBiome(biome, this.rand);
    const fishN = overrides?.fish ?? fishCountForBiome(biome, this.rand);
    if (terrainMesh) this.spawnLandCreatures(terrainMesh, landN, radius, biome);
    this.spawnFish(fishN, radius);
  }

  /**
   * Spawn fish in water volumes only (never on dry land / under land mesh).
   * Uses terrain height sampler when available: seabed must sit below waterLevel
   * so fish swim in actual water columns, not buried under hills.
   */
  spawnFish(count: number, radius: number = 200): void {
    const pool = [...getFishCreatures(), ...getWaterPredators()];
    if (pool.length === 0) return;

    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 24;

    while (placed < count && attempts < maxAttempts) {
      attempts++;
      const def = pickWeightedCreature(pool, this.rand);
      const angle = this.rand() * Math.PI * 2;
      const dist = 30 + this.rand() * Math.max(40, radius - 30);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Reject dry land — fish only in valid water columns (worldSurfaceLayers)
      if (this.sampleHeight) {
        const groundY = this.sampleHeight(x, z);
        if (groundY === null || !Number.isFinite(groundY)) continue;
        if (!isWaterColumn(groundY, this.waterLevel, WORLD_SURFACE.minWaterColumnM)) continue;
      } else {
        // No sampler: still require deep water sample via optional terrain later — skip unsafe
        // without sampler only allow when waterLevel is known and we use pure sea plane
      }

      const groundY = this.sampleHeight ? this.sampleHeight(x, z) : this.waterLevel - 8;
      if (groundY === null || !Number.isFinite(groundY)) continue;
      let swimY = fishSwimY(groundY, this.waterLevel);
      if (swimY == null) continue;
      if (def.swimDepth) {
        const depth =
          def.swimDepth[0] + this.rand() * (def.swimDepth[1] - def.swimDepth[0]);
        const minY = groundY + (FAUNA_HEIGHT.fishMinAboveSeabedM ?? 0.4);
        const maxY = this.waterLevel - (FAUNA_HEIGHT.fishMinUnderSurfaceM ?? 0.3);
        swimY = Math.min(maxY, Math.max(minY, this.waterLevel - depth));
      }

      this.spawnCreature(def, new THREE.Vector3(x, swimY, z), swimY);
      placed++;
    }
  }

  private spawnCreature(
    def: CreatureDef,
    pos: THREE.Vector3,
    swimY?: number,
    fixedId?: string,
    networkAuth = false,
  ): void {
    const id = fixedId || `creature_${this.nextId++}`;
    if (this.creatures.has(id)) return;
    const group = new THREE.Group();
    group.position.copy(pos);
    this.scene.add(group);

    // Placeholder mesh while GLTF loads
    const isFish = def.category === 'fish' || def.category === 'predator';
    const color = isFish ? 0x4488cc :
      def.ai === 'aggressive' ? 0xcc4444 :
      def.ai === 'neutral' ? 0xccaa44 : 0x44cc44;
    const placeholder = new THREE.Mesh(
      isFish ? new THREE.ConeGeometry(0.5, 1.5, 6) : new THREE.BoxGeometry(0.7, 1.0, 0.7),
      new THREE.MeshLambertMaterial({ color }),
    );
    placeholder.position.y = isFish ? 0 : 0.5;
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
      stunTimer: 0,
      alerted: false,
      looted: false,
      isSkeleton: false,
      skeletonT: 0,
      fleshRoot: null,
      brain: new CreatureBrain(),
      spawnPos: pos.clone(),
      targetPos: pos.clone(),
      speed: def.moveSpeed,
      swimY: swimY ?? pos.y,
      loading: false,
      networkAuth,
    };

    this.creatures.set(id, instance);
    this.loadCreatureModel(instance);
  }

  /**
   * Bridge SectorRoom.state.enemies → local mesh with matching server id.
   * Dual-browser PvE: both clients spawn the same id so sendPveAttack hits schema.
   */
  upsertNetworkEnemy(
    id: string,
    enemyType: string,
    x: number,
    y: number,
    z: number,
    hp: number,
    maxHp: number,
    state = 'idle',
  ): void {
    const existing = this.creatures.get(id);
    if (existing) {
      existing.group.position.x = x;
      existing.group.position.z = z;
      if (this.sampleHeight) {
        const gy = this.sampleHeight(x, z);
        if (gy !== null) {
          if (existing.def.category === 'bird') {
            existing.group.position.y = gy + BIRD_ABOVE_M;
          } else if (
            existing.def.category !== 'fish' &&
            existing.def.category !== 'predator'
          ) {
            existing.group.position.y = gy + FEET_ON_TERRAIN_M;
            existing.group.position.y = gy + (FAUNA_HEIGHT.feetOnTerrainM ?? 0);
          }
        }
      } else if (y) {
        existing.group.position.y = y;
      }
      const prevHp = existing.hp;
      existing.hp = hp;
      if ((state === 'dead' || hp <= 0) && existing.state !== 'dead' && existing.state !== 'skeleton' && existing.state !== 'despawned') {
        this.setState(existing, 'dead', DEATH_LINGER_TIME);
        this.playAnim(existing, 'death', false);
      } else if (hp > 0 && hp < prevHp && existing.state !== 'dead') {
        // Hit react from remote attacker
        if (existing.def.anims.hitReact) {
          this.playAnim(existing, 'hitReact', false);
          existing.currentAnim = '';
        }
        existing.provoked = true;
      }
      return;
    }

    if (state === 'dead' || hp <= 0) return;

    const def = this.resolveNetworkEnemyDef(enemyType, maxHp || hp || 50);
    let spawnY = y;
    if (this.sampleHeight) {
      const gy = this.sampleHeight(x, z);
      if (gy !== null) spawnY = gy;
    }
    this.spawnCreature(def, new THREE.Vector3(x, spawnY, z), undefined, id, true);
    const spawned = this.creatures.get(id);
    if (spawned) spawned.hp = hp > 0 ? hp : def.hp;
  }

  removeNetworkEnemy(id: string): void {
    const c = this.creatures.get(id);
    if (!c) return;
    this.scene.remove(c.group);
    c.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material?.dispose();
      }
    });
    this.creatures.delete(id);
  }

  /** Map SectorRoom enemyType strings → manifest defs (fallback aggressive beetle). */
  private resolveNetworkEnemyDef(enemyType: string, maxHp: number): CreatureDef {
    const t = (enemyType || '').toLowerCase();
    const byKey =
      CREATURE_MANIFEST[t] ||
      CREATURE_MANIFEST[t.replace(/-/g, '_')] ||
      Object.values(CREATURE_MANIFEST).find(
        (d) => d.id === t || d.name.toLowerCase() === t || d.id.includes(t),
      );
    const base = byKey || CREATURE_MANIFEST.fire_beetle || Object.values(CREATURE_MANIFEST)[0];
    return {
      ...base,
      name: enemyType || base.name,
      hp: maxHp > 0 ? maxHp : base.hp,
      // Network corpses stay until server removes — no wildlife respawn loop
      respawnTime: 99999,
    };
  }

  // ── Model Loading ──────────────────────────────────────────────────────

  private async loadCreatureModel(instance: CreatureInstance): Promise<void> {
    if (instance.loading) return;
    instance.loading = true;

    try {
      let loaded: Awaited<ReturnType<typeof loadCharacterModel>>;
      try {
        loaded = await loadCharacterModel(instance.def.modelPath);
      } catch (cdnErr) {
        // Relative /models/… may exist in public/. Never retry a CDN miss
        // against this origin — Vercel serves index.html and GLTFLoader crashes.
        const src = instance.def.modelPath;
        if (/^https?:\/\//i.test(src)) throw cdnErr;
        const rel = src.startsWith('/') ? src : `/${src}`;
        loaded = await loadCharacterModel(rel);
      }
      instance.model = loaded;

      loaded.scene.scale.setScalar(instance.def.scale * WILDLIFE_SIZE_FACTOR);
      loaded.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove placeholder
      const placeholder = instance.group.getObjectByName('__placeholder');
      if (placeholder) instance.group.remove(placeholder);

      // Land animals / monsters / NPCs: bone-box feet on terrain (not pelvis).
      if (
        instance.def.category !== 'fish' &&
        instance.def.category !== 'predator' &&
        instance.def.category !== 'bird'
      ) {
        loaded.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(loaded.scene);
        if (Number.isFinite(box.min.y)) loaded.scene.position.y -= box.min.y;
      }
      instance.group.add(loaded.scene);

      instance.mixer = new THREE.AnimationMixer(loaded.scene);
      const clipNames = loaded.clips.map((c) => c.name);
      const animDef = instance.def.cotwAnim
        ? { ...resolveCotwAnimations(clipNames), ...instance.def.anims }
        : instance.def.anims;

      for (const clip of loaded.clips) {
        for (const [stateKey, clipName] of Object.entries(animDef)) {
          if (!clipName) continue;
          const exact = clip.name === clipName;
          const fuzzy =
            !exact &&
            (clip.name.toLowerCase().includes(String(clipName).toLowerCase()) ||
              String(clipName).toLowerCase().includes(clip.name.toLowerCase()));
          if (exact || fuzzy) {
            if (instance.actions.has(stateKey) && !exact) continue;
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

  // Distance bands for wildlife (meters) — skip AI/anim when far
  private static readonly AI_NEAR_M = 55;
  private static readonly AI_MID_M = 120;
  private static readonly AI_FAR_M = 200;
  private _aiFrame = 0;

  // ── Update (call every frame) ──────────────────────────────────────────

  update(dt: number, playerPos: THREE.Vector3): void {
    this._aiFrame++;
    for (const [, c] of this.creatures) {
      const dist = c.group.position.distanceTo(playerPos);

      // Culled: hide + no mixer / AI (cheapest)
      if (dist > CreatureManager.AI_FAR_M) {
        if (c.group.visible) c.group.visible = false;
        continue;
      }
      if (!c.group.visible) c.group.visible = true;

      // Far band: throttle AI to every 3rd frame, no shadows, still idle anim slowly
      if (dist > CreatureManager.AI_MID_M) {
        c.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.castShadow = false;
        });
        if (this._aiFrame % 3 !== 0) {
          c.mixer?.update(dt * 0.5);
          continue;
        }
      } else if (dist > CreatureManager.AI_NEAR_M) {
        // Mid: full AI, shadows off
        c.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.castShadow = false;
        });
      } else {
        c.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && m.userData.wantCastShadow !== false) m.castShadow = true;
        });
      }

      // Update mixer
      c.mixer?.update(dt);

      if (
        c.stunTimer > 0
        && c.state !== 'dead'
        && c.state !== 'skeleton'
        && c.state !== 'despawned'
      ) {
        c.stunTimer = Math.max(0, c.stunTimer - dt);
        continue;
      }

      // Server-owned enemies: pose/HP from schema only — no local wander/chase AI
      if (c.networkAuth) {
        if (c.state === 'dead') this.updateDead(c, dt);
        else if (c.state === 'skeleton') this.updateSkeleton(c, dt);
        else if (c.state === 'despawned') this.updateDespawned(c, dt);
        else this.playAnim(c, c.provoked ? 'idle' : 'idle');
        continue;
      }

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
        case 'telegraph':
          this.updateTelegraph(c, dt, playerPos);
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
        case 'skeleton':
          this.updateSkeleton(c, dt);
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
      const wind = creatureTelegraphSec(c.def);
      this.setState(c, 'telegraph', wind);
      return;
    }

    if (c.brain.path.length === 0) {
      c.brain.planPath(this.brainCtx(), c.group.position, playerPos);
    }
    this.moveAlongPath(c, c.def.moveSpeed, dt);
    this.playAnim(c, c.def.anims.run ? 'run' : 'walk');
  }

  private updateTelegraph(c: CreatureInstance, dt: number, playerPos: THREE.Vector3): void {
    c.stateTimer -= dt;
    this.playAnim(c, c.def.anims.idle || 'idle');
    const total = creatureTelegraphSec(c.def);
    const remaining = Math.max(0, c.stateTimer);
    const progress = 1 - remaining / Math.max(0.001, total);
    const facing = Math.atan2(
      playerPos.x - c.group.position.x,
      playerPos.z - c.group.position.z,
    );
    this.warnings.showTelegraph({
      id: c.id,
      variant: pickWarningForRange(c.def.attackRange),
      position: c.group.position.clone(),
      facing,
      range: Math.max(1.2, c.def.attackRange),
      arc: Math.PI * 0.7,
      totalSec: total,
      remainingSec: remaining,
      progress,
    });

    if (c.stateTimer <= 0) {
      this.warnings.hide(c.id);
      this.setState(c, 'attack', 0.35);
    }
  }

  private updateAttack(c: CreatureInstance, dt: number, playerPos: THREE.Vector3): void {
    c.stateTimer -= dt;
    this.playAnim(c, 'attack', false);

    if (c.stateTimer <= 0) {
      const dist = c.group.position.distanceTo(playerPos);
      if (dist <= c.def.attackRange * 1.5 && c.def.damage > 0) {
        this.onPlayerDamage?.(c.def.damage, c.id);
      }
      this.warnings.hide(c.id);
      this.setState(c, 'chase');
    }
  }

  getEnemyCasts(): Array<{ id: string; name: string; progress: number; remainingSec: number }> {
    const out: Array<{ id: string; name: string; progress: number; remainingSec: number }> = [];
    for (const c of this.creatures.values()) {
      if (c.state !== 'telegraph') continue;
      const total = creatureTelegraphSec(c.def);
      const remaining = Math.max(0, c.stateTimer);
      out.push({
        id: c.id,
        name: c.def.name,
        progress: 1 - remaining / Math.max(0.001, total),
        remainingSec: remaining,
      });
    }
    return out;
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

    // After 2 minutes unskinned → skeleton residual (Skeletons_Free).
    if (c.stateTimer <= 0) {
      void this.toSkeleton(c);
    }
  }

  private updateSkeleton(c: CreatureInstance, dt: number): void {
    c.skeletonT -= dt;
    if (c.skeletonT <= 0) {
      c.group.visible = false;
      c.state = 'despawned';
      c.respawnTimer = this.clampRespawnSec(c.def.respawnTime);
    }
  }

  private updateDespawned(c: CreatureInstance, dt: number): void {
    // Server-owned enemies never local-respawn (schema onRemove cleans up)
    if (c.networkAuth) return;
    c.respawnTimer -= dt;
    if (c.respawnTimer <= 0) {
      // Respawn at original position — restore flesh if it was a skeleton
      c.hp = c.def.hp;
      c.provoked = false;
      c.alerted = false;
      c.looted = false;
      c.isSkeleton = false;
      c.skeletonT = 0;
      // Remove skeleton residual, re-show original model
      const toRemove: THREE.Object3D[] = [];
      c.group.traverse((o) => {
        if (o.userData?.skeletonCorpse) toRemove.push(o);
      });
      for (const o of toRemove) o.parent?.remove(o);
      if (c.fleshRoot) c.fleshRoot.visible = true;
      if (c.model?.scene) c.model.scene.visible = true;
      c.group.position.copy(c.spawnPos);
      c.group.visible = true;
      c.group.rotation.y = this.rand() * Math.PI * 2;
      this.setState(c, 'idle', IDLE_DURATION_MIN + this.rand() * IDLE_DURATION_MAX);
      this.playAnim(c, 'idle');
    }
  }

  /** Replace flesh with Skeletons_Free residual (loot or 2 min dead). */
  private async toSkeleton(c: CreatureInstance): Promise<void> {
    if (c.isSkeleton || c.state === 'despawned') return;
    c.isSkeleton = true;
    c.looted = true;
    c.state = 'skeleton';
    c.skeletonT = SKELETON_LINGER_S;
    c.mixer?.stopAllAction();

    // Hide flesh mesh
    if (c.model?.scene) {
      c.fleshRoot = c.model.scene;
      c.model.scene.visible = false;
    }
    const placeholder = c.group.getObjectByName('__placeholder');
    if (placeholder) placeholder.visible = false;

    const scale = skeletonScaleForBodyHeight(
      c.def.category === 'bird' ? 0.35 : c.def.scale * 1.2 * WILDLIFE_SIZE_FACTOR,
    );
    const skel = await createSkeletonCorpse({
      position: new THREE.Vector3(0, 0, 0),
      yaw: c.group.rotation.y,
      scale,
      variant: 'humanoid',
      lieDown: true,
    });
    if (skel) c.group.add(skel);
  }

  /**
   * Skin / loot a nearby dead creature (huntable flesh only).
   * Grants loot once, then swaps to skeleton residual immediately.
   */
  trySkinNear(
    pos: THREE.Vector3,
    reach = 3.0,
  ): CreatureLootEvent | null {
    let best: CreatureInstance | null = null;
    let bestD = reach;
    for (const c of this.creatures.values()) {
      if (c.state !== 'dead' || c.looted || c.isSkeleton) continue;
      if (c.def.category === 'fish') continue;
      const d = c.group.position.distanceTo(pos);
      if (d <= bestD) {
        best = c;
        bestD = d;
      }
    }
    if (!best) return null;

    best.looted = true;
    const loot = rollLoot(best.def, this.rand);
    const event: CreatureLootEvent = {
      creatureId: best.id,
      creatureName: best.def.name,
      position: best.group.position.clone(),
      loot,
    };
    this.onLootDrop?.(event);
    void this.toSkeleton(best);
    return event;
  }

  /** Hitting one member pulls the pack (same packId, else same species in 6.5 m). */
  private provokePack(src: CreatureInstance, radiusM: number): void {
    const r2 = radiusM * radiusM;
    const sx = src.group.position.x;
    const sz = src.group.position.z;
    for (const [, o] of this.creatures) {
      if (o === src || o.state === 'dead' || o.state === 'skeleton' || o.state === 'despawned') {
        continue;
      }
      const dx = o.group.position.x - sx;
      const dz = o.group.position.z - sz;
      if (dx * dx + dz * dz > r2) continue;
      const samePack = src.packId && o.packId === src.packId;
      const sameKind = !src.packId && o.def.id === src.def.id;
      if (!samePack && !sameKind) continue;
      o.provoked = true;
      if (o.state === 'idle' || o.state === 'wander') {
        this.setState(o, 'chase');
      }
    }
  }

  /**
   * Deal damage to a creature.
   * On kill: starts 2-minute flesh corpse (skin with trySkinNear). Loot is
   * deferred until skin — no auto-drop on death.
   */
  dealDamage(creatureId: string, damage: number): CreatureLootEvent | null {
    const c = this.creatures.get(creatureId);
    if (!c || c.state === 'dead' || c.state === 'skeleton' || c.state === 'despawned') return null;

    c.hp = Math.max(0, c.hp - damage);

    // Hit react
    if (c.hp > 0) {
      if (c.def.anims.hitReact) {
        this.playAnim(c, 'hitReact', false);
        c.currentAnim = ''; // allow re-triggering
      }
      c.provoked = true;
      this.provokePack(c, 6.5);
      if (c.def.ai === 'neutral' || c.def.ai === 'passive') {
        this.setState(c, 'chase');
      }
      return null;
    }

    // Killed — flesh corpse for up to 2 minutes (or until skinned).
    c.looted = false;
    c.isSkeleton = false;
    this.warnings.hide(c.id);
    this.setState(c, 'dead', DEATH_LINGER_TIME);
    this.playAnim(c, 'death', false);
    return null;
  }

  /** Stun lockout — skips wander/chase/attack until timer elapses. */
  applyStun(creatureId: string, stunSec: number): void {
    const c = this.creatures.get(creatureId);
    if (!c || c.state === 'dead' || c.state === 'skeleton' || c.state === 'despawned') return;
    if (stunSec <= 0) return;
    c.stunTimer = Math.max(c.stunTimer || 0, stunSec);
    if (c.def.anims.hitReact) {
      this.playAnim(c, 'hitReact', false);
      c.currentAnim = '';
    }
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
      if (c.state === 'dead' || c.state === 'skeleton' || c.state === 'despawned') continue;
      if (category && c.def.category !== category) continue;
      if (huntableOnly && !c.def.huntable) continue;

      const dist = c.group.position.distanceTo(pos);
      if (dist < maxRange && (!nearest || dist < nearest.dist)) {
        nearest = { id, dist, name: c.def.name, huntValue: c.def.huntValue ?? 0 };
      }
    }

    return nearest;
  }

  /**
   * Soft-lock candidates — all non-dead land/predator/boss-like within range.
   * Fish excluded (not combat soft-lock targets).
   */
  listSoftLockTargets(
    pos: THREE.Vector3,
    maxRange: number,
  ): Array<{
    id: string;
    name: string;
    position: THREE.Vector3;
    hp: number;
    maxHp: number;
    dist: number;
    category: string;
  }> {
    const out: Array<{
      id: string;
      name: string;
      position: THREE.Vector3;
      hp: number;
      maxHp: number;
      dist: number;
      category: string;
    }> = [];
    for (const [id, c] of this.creatures) {
      if (c.state === 'dead' || c.state === 'skeleton' || c.state === 'despawned') continue;
      if (c.def.category === 'fish') continue;
      const dist = c.group.position.distanceTo(pos);
      if (dist > maxRange) continue;
      const chest = c.group.position.clone();
      chest.y += 1.2;
      out.push({
        id,
        name: c.def.name,
        position: chest,
        hp: c.hp ?? c.def.hp ?? 50,
        maxHp: c.def.hp ?? 50,
        dist,
        category: c.def.category,
      });
    }
    return out;
  }

  /** Alive check for soft-lock / combat preference */
  isAlive(id: string): boolean {
    const c = this.creatures.get(id);
    return !!c && c.state !== 'dead' && c.state !== 'skeleton' && c.state !== 'despawned';
  }

  getWorldPosition(id: string): THREE.Vector3 | null {
    const c = this.creatures.get(id);
    if (!c || c.state === 'dead' || c.state === 'skeleton' || c.state === 'despawned') return null;
    return c.group.position.clone();
  }

  /** Horizontal push (flame wall / knockback skills) */
  applyKnockback(id: string, dx: number, dz: number): void {
    const c = this.creatures.get(id);
    if (!c || c.state === 'dead' || c.state === 'skeleton' || c.state === 'despawned') return;
    c.group.position.x += dx;
    c.group.position.z += dz;
    if (this.sampleHeight) {
      const y = this.sampleHeight(c.group.position.x, c.group.position.z);
      if (
        y !== null &&
        c.def.category !== 'bird' &&
        c.def.category !== 'fish' &&
        c.def.category !== 'predator'
      ) {
        c.group.position.y = y + FEET_ON_TERRAIN_M;
        c.group.position.y = y + (FAUNA_HEIGHT.feetOnTerrainM ?? 0);
      }
    }
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
    const isFish = c.def.category === 'fish' || c.def.category === 'predator';

    // Fish / water predators: only roam in water columns (never onto land)
    if (isFish && this.sampleHeight) {
      let found = false;
      for (let i = 0; i < 10; i++) {
        const t = c.brain.pickRoamTarget(c.spawnPos, roam, this.brainCtx());
        const groundY = this.sampleHeight(t.x, t.z);
        if (groundY !== null && groundY <= this.waterLevel - 0.75) {
          t.y = c.swimY;
          c.targetPos.copy(t);
          found = true;
          break;
        }
      }
      if (!found) {
        c.targetPos.copy(c.spawnPos);
        c.targetPos.y = c.swimY;
      }
      // Direct swim path (no land navmesh)
      c.brain.clearPath();
      c.brain.path = [c.targetPos.clone()];
      c.brain.pathIndex = 0;
      return;
    }

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
      const gy = this.sampleHeight
        ? this.sampleHeight(c.group.position.x, c.group.position.z)
        : null;
      const base = (gy ?? c.spawnPos.y - BIRD_ABOVE_M) + BIRD_ABOVE_M;
      c.group.position.y =
        base + Math.sin(performance.now() * 0.0008) * BIRD_BOB_M;
    } else if (this.sampleHeight) {
      const y = this.sampleHeight(c.group.position.x, c.group.position.z);
      if (y !== null) c.group.position.y = y + FEET_ON_TERRAIN_M;
      if (y !== null) c.group.position.y = y + (FAUNA_HEIGHT.feetOnTerrainM ?? 0);
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
      if (c.state !== 'dead' && c.state !== 'skeleton' && c.state !== 'despawned') n++;
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
    this.warnings.dispose();
  }
}
