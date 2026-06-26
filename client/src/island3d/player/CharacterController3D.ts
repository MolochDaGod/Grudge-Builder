/**
 * CharacterController3D — WASD character controller with full physics.
 *
 * W = forward (away from camera), S = back, A/D = turn, Q/E = strafe.
 * Tab toggles combat mode (face mouse) vs harvest mode (face movement).
 * Space = jump (double-jump if warrior). Terrain following, swimming,
 * climbing, fall damage, and vertical physics.
 */
import * as THREE from 'three';
import { getTerrainHeightAt, getSceneHeightAt } from '../terrain/IslandTerrainGenerator';
import { AnimationManager, type AnimState } from './AnimationManager';
import { loadCharacterModel, type LoadedModel } from '@/lib/modelLoader';
import {
  getModelForCharacter,
  type WeaponType,
} from '@/lib/modelManifest';
import { getWeaponTypeForMode, parseModel3d, type Model3DField } from '@/lib/grudge6Character';
import { RACE_GRUDGE6, weaponTypeFromModel3d } from '@shared/fleet';
import { setupGrudge6Equipment } from '@/lib/grudge6Equipment';
import { buildAnimLoadMap } from '@/lib/animation/animationCatalog';
import { CharacterAnimOrchestrator } from '@/lib/animation/characterAnimOrchestrator';
import {
  CharacterStateMachine,
  globalStateManager,
  type CharacterState,
  type StateContext,
} from '@/lib/characterStateMachine';

export type ControlMode = 'harvest' | 'combat' | 'build';

export type MovementState =
  | 'ground'
  | 'falling'
  | 'jumping'
  | 'swimming_surface'
  | 'swimming_underwater'
  | 'climbing';

export interface PhysicsConfig {
  gravity: number;
  jumpForce: number;
  /** Allow double-jump (warrior class) */
  doubleJump: boolean;
  /** Water plane Y level */
  waterLevel: number;
  /** Character capsule height (feet to head) */
  characterHeight: number;
  /** Vertical velocity threshold for fall damage */
  fallDamageThreshold: number;
  /** Damage per unit of velocity beyond the threshold */
  fallDamageScale: number;
  /** Stamina cost per second while swimming */
  swimStaminaDrain: number;
  /** Stamina cost per second while climbing */
  climbStaminaDrain: number;
  /** Seconds of oxygen before drowning damage starts */
  maxOxygen: number;
  /** Damage per second while drowning */
  drownDamage: number;
  /** Minimum surface normal Y to count as "climbable" (0.0 = vertical, 1.0 = flat) */
  climbableMaxNormalY: number;
}

const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: -30,
  jumpForce: 12,
  doubleJump: false,
  waterLevel: -2,
  characterHeight: 3.2,
  fallDamageThreshold: 18,
  fallDamageScale: 2.5,
  swimStaminaDrain: 5,
  climbStaminaDrain: 8,
  maxOxygen: 15,
  drownDamage: 10,
  climbableMaxNormalY: 0.35,
};

/** Callbacks the engine can subscribe to for gameplay events */
export interface PhysicsCallbacks {
  onFallDamage?: (damage: number) => void;
  onStaminaDrain?: (amount: number) => void;
  onDrownDamage?: (damage: number) => void;
  onMovementStateChange?: (prev: MovementState, next: MovementState) => void;
  onOxygenChange?: (oxygen: number, max: number) => void;
}

export interface CharacterController3DConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  terrainMesh: THREE.Mesh;
  /** Lobby / zone GLTF root for recursive ground raycasts */
  groundObject?: THREE.Object3D;
  /** BVH collider height sampler (preferred over groundObject when set) */
  groundSampler?: (x: number, z: number) => number | null;
  modelPath?: string;
  startPosition?: THREE.Vector3;
  physics?: Partial<PhysicsConfig>;
  callbacks?: PhysicsCallbacks;
  /** Character id for state machine + multiplayer sync */
  characterId?: string;
  raceId?: string;
  classId?: string;
}

export class CharacterController3D {
  public model: THREE.Group;
  public animations: AnimationManager | null = null;
  public stateMachine: CharacterStateMachine | null = null;
  public orchestrator: CharacterAnimOrchestrator | null = null;
  public weaponType: WeaponType = 'sword';
  public mode: ControlMode = 'harvest';
  public movementState: MovementState = 'falling';
  /** Track whether we were moving last frame (for run→stop transition) */
  private wasMoving = false;
  /** Timer for one-shot anims (hard landing, climb-to-top) */
  private oneShotTimer = 0;
  /** Idle variant timer — switch idle animation every 8-12s */
  private idleVariantTimer = 0;
  private useAltIdle = false;

  // Physics
  public readonly physics: PhysicsConfig;
  private callbacks: PhysicsCallbacks;
  private verticalVelocity = 0;
  private isGrounded = false;
  private jumpCount = 0;
  private oxygen: number;

  private camera: THREE.PerspectiveCamera;
  private terrainMesh: THREE.Mesh;
  private groundObject: THREE.Object3D | null;
  private groundSampler: ((x: number, z: number) => number | null) | null;
  private baseMoveSpeed = 30;
  private turnSpeed = 3;
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private cameraOffset = new THREE.Vector3(0, 15, 25); // over-the-shoulder

  // Climb raycast helpers
  private climbRaycaster = new THREE.Raycaster();
  private climbCheckDir = new THREE.Vector3();

  // Input state
  private keys: Set<string> = new Set();
  private mouseDown = false;
  private mouseDelta = { x: 0, y: 0 };
  private cameraYaw = 0;
  private cameraPitch = 0.3;

  // Speed multipliers per state
  private static readonly SPEED_MULT: Record<MovementState, number> = {
    ground: 1.0,
    falling: 0.85,
    jumping: 0.85,
    swimming_surface: 0.5,
    swimming_underwater: 0.35,
    climbing: 0.25,
  };

  constructor(private config: CharacterController3DConfig) {
    this.physics = { ...DEFAULT_PHYSICS, ...config.physics };
    this.callbacks = config.callbacks || {};
    this.oxygen = this.physics.maxOxygen;
    this.camera = config.camera;
    this.terrainMesh = config.terrainMesh;
    this.groundObject = config.groundObject ?? null;
    this.groundSampler = config.groundSampler ?? null;

    // Placeholder model (capsule) — will be replaced by GLTF
    this.model = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.8, 2, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x4488ff }),
    );
    body.position.y = 1.8;
    body.castShadow = true;
    this.model.add(body);

    // Direction indicator
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.8, 4),
      new THREE.MeshLambertMaterial({ color: 0xff4444 }),
    );
    arrow.position.set(0, 2.5, -1.2);
    arrow.rotation.x = -Math.PI / 2;
    this.model.add(arrow);

    const startPos = config.startPosition || new THREE.Vector3(0, 20, 0);
    this.model.position.copy(startPos);
    config.scene.add(this.model);

    this.setupInputListeners();
  }

  // ─── Model loading (unchanged API) ─────────────────────────────────────────

  async loadCharacterFromManifest(
    raceId: string,
    classId: string,
    characterId?: string,
    weaponTypeOverride?: WeaponType,
    model3d?: Partial<Model3DField>,
    equipment?: Record<string, string | null>,
  ): Promise<void> {
    try {
      const modelUnit = getModelForCharacter(raceId, classId);
      const resolvedModel3d = (model3d || equipment)
        ? parseModel3d({ raceId, classId, equipment: equipment ?? {}, model3d } as any)
        : null;

      const equippedWeaponType = resolvedModel3d
        ? (weaponTypeFromModel3d(resolvedModel3d, classId) as WeaponType)
        : modelUnit.weaponType;

      const weaponType = weaponTypeOverride ?? (
        this.mode === 'harvest' || this.mode === 'build' ? 'unarmed' : equippedWeaponType
      );
      this.weaponType = weaponType;
      const loaded = await loadCharacterModel(modelUnit.modelPath);

      if (resolvedModel3d) {
        const race = RACE_GRUDGE6[raceId] ?? RACE_GRUDGE6.human;
        setupGrudge6Equipment(race.prefix, loaded.scene, resolvedModel3d);
      }

      const scale = resolvedModel3d?.scale ?? modelUnit.scale;
      this.applyLoadedModel(loaded, scale);
      await this.reloadWeaponAnimations(weaponType);

      this.initStateMachine(characterId ?? 'local-player', raceId, classId, weaponType);
    } catch (err) {
      console.warn(`Failed to load character model for ${raceId}/${classId}:`, err);
    }
  }

  /** Swap animation set when play mode or equipment changes */
  async reloadWeaponAnimations(weaponType: WeaponType): Promise<void> {
    this.weaponType = weaponType;
    if (!this.animations) return;
    const animPaths = buildAnimLoadMap(weaponType) as Partial<Record<AnimState, string>>;
    if (Object.keys(animPaths).length > 0) {
      await this.animations.loadAnimations(animPaths);
    }
    if (this.orchestrator) {
      this.orchestrator.dispose();
      this.orchestrator = new CharacterAnimOrchestrator(
        this.animations,
        this.stateMachine!,
        weaponType,
      );
    }
  }

  /** Set harvest / combat / build mode from UI */
  async setControlMode(mode: ControlMode, classId?: string, hasWeapon = false): Promise<void> {
    this.mode = mode;
    this.stateMachine?.updateContext({ inCombat: mode === 'combat' });

    if (mode === 'combat') {
      this.stateMachine?.transition('combat');
    } else if (this.stateMachine?.getState() === 'combat') {
      this.stateMachine.transition(mode === 'build' ? 'building' : 'idle');
    } else if (mode === 'build') {
      this.stateMachine?.transition('building');
    } else {
      this.stateMachine?.transition('idle');
    }

    const wt = getWeaponTypeForMode(mode, classId ?? 'warrior', hasWeapon);
    await this.reloadWeaponAnimations(wt);
  }

  private initStateMachine(
    characterId: string,
    raceId: string,
    classId: string,
    weaponType: WeaponType,
  ): void {
    const context: StateContext = {
      characterId,
      stamina: 100,
      maxStamina: 100,
      health: 100,
      maxHealth: 100,
      position: { x: this.model.position.x, y: this.model.position.z },
      inCombat: this.mode === 'combat',
      isSailing: false,
      currentActivity: `${raceId}/${classId}`,
    };

    this.stateMachine = globalStateManager.getOrCreate(characterId, context);

    if (this.animations) {
      this.orchestrator?.dispose();
      this.orchestrator = new CharacterAnimOrchestrator(
        this.animations,
        this.stateMachine,
        weaponType,
      );
    }
  }

  async loadModel(path: string): Promise<void> {
    try {
      const loaded = await loadCharacterModel(path);
      this.applyLoadedModel(loaded, 2);
    } catch (err) {
      console.warn('Failed to load character model:', err);
    }
  }

  private applyLoadedModel(loaded: LoadedModel, scale: number): void {
    loaded.scene.scale.setScalar(scale);
    loaded.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    while (this.model.children.length) {
      this.model.remove(this.model.children[0]);
    }
    this.model.add(loaded.scene);

    if (loaded.clips.length > 0) {
      this.animations = new AnimationManager(loaded.scene);
      loaded.clips.forEach((clip) => {
        const name = clip.name.toLowerCase();
        let state: AnimState = 'idle';
        if (name.includes('walk') || name.includes('run forward')) state = 'walk';
        else if (name.includes('run')) state = 'run';
        else if (name.includes('attack') || name.includes('slash')) state = 'attack';
        else if (name.includes('death')) state = 'death';
        else if (name.includes('idle')) state = 'idle';
        this.animations!.addClipFromGLTF(state, clip);
      });
      this.animations.play('idle');
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Tab') {
        e.preventDefault();
        const cycle: ControlMode[] = ['harvest', 'combat', 'build'];
        const idx = cycle.indexOf(this.mode);
        this.mode = cycle[(idx + 1) % cycle.length];
        this.stateMachine?.updateContext({ inCombat: this.mode === 'combat' });
        if (this.mode === 'combat') {
          this.stateMachine?.transition('combat');
        } else if (this.mode === 'build') {
          this.stateMachine?.transition('building');
        } else if (this.stateMachine?.getState() === 'combat') {
          this.stateMachine.transition('idle');
        }
      }
      // Combat bindings — use easy-win clips from catalog
      if (this.mode === 'combat' && this.orchestrator) {
        if (e.key === 'f' || e.key === 'F') {
          this.orchestrator.playDodge();
        }
        if (e.key === 'r' || e.key === 'R') {
          this.orchestrator.playBlock();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        if (this.mode === 'combat' && this.orchestrator) {
          this.orchestrator.playComboHit();
        } else if (this.mode === 'harvest' && this.stateMachine?.canTransitionTo('harvesting')) {
          this.stateMachine.transition('harvesting');
        } else if (this.mode === 'build' && this.stateMachine?.canTransitionTo('building')) {
          this.stateMachine.transition('building');
        }
      }
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });
  }

  // ─── State transitions ─────────────────────────────────────────────────────

  private setMovementState(next: MovementState): void {
    if (next === this.movementState) return;
    const prev = this.movementState;
    this.movementState = next;
    this.callbacks.onMovementStateChange?.(prev, next);
  }

  // ─── Main update ───────────────────────────────────────────────────────────

  update(dt: number): void {
    // Camera rotation from mouse drag
    if (this.mouseDown) {
      this.cameraYaw -= this.mouseDelta.x * 0.003;
      this.cameraPitch = Math.max(0.1, Math.min(0.8, this.cameraPitch + this.mouseDelta.y * 0.003));
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }

    // ── Horizontal movement ──────────────────────────────────────────────────
    this.direction.set(0, 0, 0);
    let moving = false;

    if (this.keys.has('w')) { this.direction.z -= 1; moving = true; }
    if (this.keys.has('s')) { this.direction.z += 1; moving = true; }
    if (this.keys.has('q')) { this.direction.x -= 1; moving = true; }
    if (this.keys.has('e')) { this.direction.x += 1; moving = true; }
    if (this.keys.has('a')) { this.cameraYaw += this.turnSpeed * dt; }
    if (this.keys.has('d')) { this.cameraYaw -= this.turnSpeed * dt; }

    if (this.direction.length() > 0) this.direction.normalize();

    const moveDir = this.direction.clone();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const speedMult = CharacterController3D.SPEED_MULT[this.movementState];
    const effectiveSpeed = this.baseMoveSpeed * speedMult;

    this.velocity.lerp(moveDir.multiplyScalar(effectiveSpeed), dt * 5);
    this.model.position.x += this.velocity.x * dt;
    this.model.position.z += this.velocity.z * dt;

    // ── Vertical physics ─────────────────────────────────────────────────────
    const groundHeight = this.sampleGroundHeight(this.model.position.x, this.model.position.z);
    const feetY = this.model.position.y;
    const headY = feetY + this.physics.characterHeight;
    const { waterLevel } = this.physics;
    const inWater = feetY < waterLevel;
    const submerged = headY < waterLevel;

    if (inWater) {
      // ── Swimming / Underwater ────────────────────────────────────────────
      if (submerged) {
        this.setMovementState('swimming_underwater');
        // Oxygen drain
        this.oxygen = Math.max(0, this.oxygen - dt);
        this.callbacks.onOxygenChange?.(this.oxygen, this.physics.maxOxygen);
        if (this.oxygen <= 0) {
          this.callbacks.onDrownDamage?.(this.physics.drownDamage * dt);
        }
        // Buoyancy: slow upward drift when not pressing S
        if (!this.keys.has('s')) {
          this.verticalVelocity += 4 * dt;
        }
        // W/S = ascend/descend while underwater
        if (this.keys.has(' ')) this.verticalVelocity += 8 * dt;
        if (this.keys.has('s')) this.verticalVelocity -= 3 * dt;
      } else {
        this.setMovementState('swimming_surface');
        // Restore oxygen when head is above water
        this.oxygen = Math.min(this.physics.maxOxygen, this.oxygen + dt * 3);
        this.callbacks.onOxygenChange?.(this.oxygen, this.physics.maxOxygen);
        // Float at water surface
        const surfaceTarget = waterLevel - 0.5;
        this.verticalVelocity = (surfaceTarget - feetY) * 5;
        // Space = climb out (boost upward)
        if (this.keys.has(' ') && groundHeight !== null && groundHeight > waterLevel - 1) {
          this.verticalVelocity = this.physics.jumpForce * 0.7;
        }
      }
      // Stamina drain while swimming
      this.callbacks.onStaminaDrain?.(this.physics.swimStaminaDrain * dt);
      // Dampen horizontal velocity in water
      this.verticalVelocity *= (1 - 2 * dt);
    } else {
      // ── Restore oxygen on land ──────────────────────────────────────────
      this.oxygen = Math.min(this.physics.maxOxygen, this.oxygen + dt * 5);

      // ── Climbing check ──────────────────────────────────────────────────
      const climbDetected = this.checkClimbing(dt);

      if (climbDetected && this.keys.has('w')) {
        this.setMovementState('climbing');
        // Move up along the wall
        this.verticalVelocity = 6;
        this.callbacks.onStaminaDrain?.(this.physics.climbStaminaDrain * dt);
      } else {
        // ── Ground / Air physics ───────────────────────────────────────────
        const distToGround = groundHeight !== null ? feetY - groundHeight : 999;

        if (distToGround <= 0.2 && this.verticalVelocity <= 0) {
          // Landing — choose animation based on fall speed
          if (!this.isGrounded) {
            const fallSpeed = Math.abs(this.verticalVelocity);
            if (fallSpeed > this.physics.fallDamageThreshold) {
              // Hard landing — take damage + play impact anim
              const damage = (fallSpeed - this.physics.fallDamageThreshold) * this.physics.fallDamageScale;
              this.callbacks.onFallDamage?.(damage);
              if (this.animations) {
                this.animations.play('hard_landing', { loop: false });
                this.oneShotTimer = 0.8;
              }
            } else if (fallSpeed > 8) {
              // Medium fall — parkour roll landing
              if (this.animations) {
                this.animations.play('fall_roll', { loop: false });
                this.oneShotTimer = 0.6;
              }
            }
          }
          this.isGrounded = true;
          this.jumpCount = 0;
          this.verticalVelocity = 0;
          if (groundHeight !== null) {
            this.model.position.y = groundHeight;
          }
          this.setMovementState('ground');
        } else {
          // Airborne — apply gravity
          this.isGrounded = false;
          this.verticalVelocity += this.physics.gravity * dt;
          this.setMovementState(this.verticalVelocity > 0 ? 'jumping' : 'falling');
        }

        // ── Jump input ────────────────────────────────────────────────────
        if (this.keys.has(' ')) {
          const maxJumps = this.physics.doubleJump ? 2 : 1;
          if (this.jumpCount < maxJumps && (this.isGrounded || this.jumpCount > 0)) {
            this.verticalVelocity = this.physics.jumpForce;
            this.isGrounded = false;
            this.jumpCount++;
            this.setMovementState('jumping');
          }
          // Consume key so holding space doesn't re-trigger
          this.keys.delete(' ');
        }
      }
    }

    // Apply vertical velocity
    this.model.position.y += this.verticalVelocity * dt;

    // ── Character rotation ───────────────────────────────────────────────────
    if (this.mode === 'harvest' && moving) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetAngle, dt * 8);
    } else if (this.mode === 'combat') {
      this.model.rotation.y = this.cameraYaw + Math.PI;
    }

    // ── Camera follow ────────────────────────────────────────────────────────
    const cameraTarget = this.model.position.clone();
    const offsetRotated = this.cameraOffset.clone();
    offsetRotated.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    offsetRotated.y *= (1 + this.cameraPitch);

    const desiredCamPos = cameraTarget.clone().add(offsetRotated);
    this.camera.position.lerp(desiredCamPos, dt * 5);
    this.camera.lookAt(cameraTarget.x, cameraTarget.y + 3, cameraTarget.z);

    // ── State machine sync ─────────────────────────────────────────────────────
    if (this.stateMachine) {
      const pos = this.model.position;
      this.stateMachine.updateContext({
        position: { x: pos.x, y: pos.z },
        inCombat: this.mode === 'combat',
      });

      const smState = this.stateMachine.getState();
      if (moving && smState === 'idle' && !this.orchestrator?.hasActivityOverride()) {
        this.stateMachine.transition('moving');
      } else if (!moving && smState === 'moving' && !this.orchestrator?.hasActivityOverride()) {
        this.stateMachine.transition('idle');
      }
      if (smState === 'harvesting' && !moving) {
        this.stateMachine.transition('idle');
      }

      this.stateMachine.update(dt);
      this.orchestrator?.update(dt);
    }

    // ── Animations ───────────────────────────────────────────────────────────
    if (this.animations) {
      // Activity/combat override from orchestrator
      if (this.orchestrator?.hasActivityOverride()) {
        this.animations.update(dt);
        this.wasMoving = moving;
        return;
      }

      // One-shot timer (hard landing, climb-to-top) — don't interrupt until done
      if (this.oneShotTimer > 0) {
        this.oneShotTimer -= dt;
        this.animations.update(dt);
        this.wasMoving = moving;
        return;
      }

      // Run → stop deceleration transition
      if (this.wasMoving && !moving && this.movementState === 'ground') {
        this.animations.play('run_stop', { loop: false });
        this.oneShotTimer = 0.4; // brief stop anim
      }

      // State-driven animation selection
      switch (this.movementState) {
        case 'climbing':
          this.animations.play('climb_top');
          break;

        case 'falling':
          this.animations.play('falling');
          break;

        case 'jumping':
          this.animations.play('jump');
          break;

        case 'swimming_surface':
          this.animations.play(moving ? 'swim_surface' : 'idle');
          break;

        case 'swimming_underwater':
          this.animations.play('swim_underwater');
          break;

        case 'ground':
        default:
          if (moving) {
            this.animations.play(this.keys.has('shift') ? 'run' : 'walk');
            this.idleVariantTimer = 0;
          } else {
            // Alternate idle variants for ambient life
            this.idleVariantTimer += dt;
            if (this.idleVariantTimer > 8 + Math.random() * 4) {
              this.idleVariantTimer = 0;
              this.useAltIdle = !this.useAltIdle;
            }
            this.animations.play(this.useAltIdle ? 'idle_alt' : 'idle');
          }
          break;
      }

      this.animations.update(dt);
    }

    this.wasMoving = moving;
  }

  // ─── Climbing detection ────────────────────────────────────────────────────

  private checkClimbing(_dt: number): boolean {
    // Raycast forward from chest height to detect steep surfaces
    const chestY = this.model.position.y + this.physics.characterHeight * 0.5;
    const origin = new THREE.Vector3(this.model.position.x, chestY, this.model.position.z);

    // Forward direction based on model facing
    this.climbCheckDir.set(0, 0, -1).applyQuaternion(this.model.quaternion);
    this.climbRaycaster.set(origin, this.climbCheckDir);
    this.climbRaycaster.far = 1.5;

    const hits = this.climbRaycaster.intersectObject(this.terrainMesh);
    if (hits.length === 0) return false;

    const normal = hits[0].face?.normal;
    if (!normal) return false;

    // Transform normal to world space
    const worldNormal = normal.clone().applyQuaternion(this.terrainMesh.quaternion).normalize();
    // Steep surface = low Y component of normal
    return worldNormal.y < this.physics.climbableMaxNormalY;
  }

  private sampleGroundHeight(x: number, z: number): number | null {
    if (this.groundSampler) {
      const h = this.groundSampler(x, z);
      if (h !== null) return h;
    }
    if (this.groundObject) {
      return getSceneHeightAt(this.groundObject, x, z);
    }
    return getTerrainHeightAt(this.terrainMesh, x, z);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  getPosition(): THREE.Vector3 {
    return this.model.position.clone();
  }

  getKeys(): Set<string> {
    return this.keys;
  }

  getCameraYaw(): number {
    return this.cameraYaw;
  }

  getCameraPitch(): number {
    return this.cameraPitch;
  }

  setModelVisible(visible: boolean): void {
    this.model.visible = visible;
  }

  teleportTo(pos: THREE.Vector3): void {
    this.model.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
  }

  getFacing(): number {
    return this.model.rotation.y;
  }

  isMoving(): boolean {
    return this.velocity.length() > 0.5;
  }

  getMovementState(): MovementState {
    return this.movementState;
  }

  getOxygen(): number {
    return this.oxygen;
  }

  /** Update water level at runtime (e.g. tides) */
  setWaterLevel(y: number): void {
    (this.physics as any).waterLevel = y;
  }

  /** Enable/disable double jump (e.g. when switching to warrior class) */
  setDoubleJump(enabled: boolean): void {
    (this.physics as any).doubleJump = enabled;
  }

  /** Play a move from shared/animation/moveLanguage by id */
  playMove(moveId: string): boolean {
    return this.orchestrator?.playMove(moveId) ?? false;
  }

  getActivityState(): CharacterState {
    return this.stateMachine?.getState() ?? 'idle';
  }

  destroy(): void {
    this.orchestrator?.dispose();
    this.orchestrator = null;
    this.animations?.dispose();
    this.model.parent?.remove(this.model);
  }
}
