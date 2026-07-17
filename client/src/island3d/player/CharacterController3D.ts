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
import {
  equipBuildHammer,
  unequipBuildHammer,
  type BuildHammerHandle,
} from '../building/BuildHammerAttachment';
import { RACE_GRUDGE6, weaponTypeFromModel3d } from '@shared/fleet';
import { setupGrudge6Equipment, type Grudge6EquipmentManager } from '@/lib/grudge6Equipment';
import { applyCharacterColorTints, ensureCharacterTextureColorSpace } from '@/lib/characterAppearance';
import { buildAnimLoadMap } from '@/lib/animation/animationCatalog';
import { CharacterAnimOrchestrator } from '@/lib/animation/characterAnimOrchestrator';
import { ExplorerAnimDriver } from '@/lib/animation/explorer/ExplorerAnimDriver';
import { MotionDash } from '@/lib/animation/explorer/MotionDash';
import type { MotionProfile } from '@/lib/animation/explorer/motionMath';
import { formatMotionLabel } from './combatHudState';
import type { CombatHudSnapshot } from './combatHudState';
import type { PlaybackSlot } from '@/lib/animation/animationCatalog';
import { fitCharacterRootToHeightM, PLAYER_HEIGHT_M } from '../zoneWorldScale';
import {
  CharacterStateMachine,
  globalStateManager,
  type CharacterState,
  type StateContext,
} from '@/lib/characterStateMachine';
import { getSkillById } from '@/lib/skillTreeData';

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
  /** Match CHARACTER_REFERENCE_HEIGHT_M (2m hero) — was 3.2 and looked giant on the board */
  characterHeight: 2.0,
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
  /** Dangerroom explorer LocomotionBlend driver. */
  public explorerAnim: ExplorerAnimDriver | null = null;
  /** MM body lunge paired with attack clips. */
  private readonly motionDash = new MotionDash();
  public weaponType: WeaponType = 'sword';
  public mode: ControlMode = 'harvest';
  public movementState: MovementState = 'falling';
  /** Panel equipment slots (MainHand rod → fishing, etc.) */
  public equipment: Record<string, string | null> = {};
  private deckCastLineHandler: (() => boolean) | null = null;
  private loadedModelScene: THREE.Object3D | null = null;
  private raceIdStored = 'human';
  private classIdStored = 'warrior';
  private model3dStored: Model3DField | null = null;
  private equipmentManager: Grudge6EquipmentManager | null = null;
  /** Survival-kit hammer mesh @ 0.8 scale in right hand while in build mode */
  private buildHammer: BuildHammerHandle | null = null;
  /**
   * Editor-style free locomotion: WASD relative to camera, mouse look (RMB).
   * Auto-enabled in build mode (Dune / Conan placement feel).
   */
  public freeMoveLocomotion = false;

  /** Current form index for special weapons (grimoire 3 forms, wand, nimble, dual wield etc.)
   *  Switched with Shift + F1 / F2 / F3 as per game design.
   */
  public currentForm: number = 0; // 0 = form1, 1 = form2, 2 = form3

  /** Assigned action bar slots 1-5 from spellbook (uMMORPG Grudge Warlords style) */
  public actionBar: Record<number, string> = {1: null, 2: null, 3: null, 4: null, 5: null};
  public lastUsedSlot: number | undefined = undefined;
  private lastUsedTime = 0;
  private skillCooldowns: Record<number, number> = {};

  public loadActionBar(bar: Record<number, string>) {
    if (bar && Object.keys(bar).length) {
      this.actionBar = { ...this.actionBar, ...bar };
    }
  }

  /** For testing game flow - default real skill ids (only if completely empty) */
  private initDemoActionBarForForm() {
    const hasAny = this.actionBar[1] || this.actionBar[2] || this.actionBar[3] || this.actionBar[4] || this.actionBar[5];
    if (hasAny) return;
    const form = this.currentForm;
    this.actionBar = {
      1: 'warrior_0_strike', // basic slot always usable
      2: form === 0 ? 'grim_dest_blast' : form === 1 ? 'grim_prot_ward' : 'grim_conj_minion',
      3: form === 0 ? 'grim_dest_exp' : form === 1 ? 'grim_prot_shield' : 'grim_conj_ritual',
      4: form === 0 ? 'grim_dest_chain' : form === 1 ? 'grim_prot_reflect' : 'grim_conj_swarm',
      5: form === 0 ? 'grim_dest_meteor' : form === 1 ? 'grim_prot_fortify' : 'grim_conj_lord'
    };
  }
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
  private cameraOffset = new THREE.Vector3(0, 4.5, 8); // OTS for 2m hero (was 15/25 → god-cam on giants)

  // Climb raycast helpers
  private climbRaycaster = new THREE.Raycaster();
  private climbCheckDir = new THREE.Vector3();
  private climbMeshes: THREE.Object3D[] = [];
  /** When true, deck rig drives position — skip terrain physics */
  public shipDeckLocked = false;
  private shipDeckSampler: ((x: number, z: number) => number | null) | null = null;

  // Input state
  private keys: Set<string> = new Set();
  private mouseDown = false;
  private rmbHeld = false;
  /** RMB toggle — dangerroom hard focus / strafe lock. */
  public focusEnabled = false;
  private mouseDelta = { x: 0, y: 0 };
  private cameraYaw = 0;
  private cameraPitch = 0.3;
  private comboStage = 0;
  private lastMotionProfile: MotionProfile | null = null;
  private hitMarker = 0;
  private rmbDownAt = 0;

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
      // Normalize WK_Characters_customizable / aliases → human|elf|…
      const { normalizeRaceId } = await import('@shared/fleet');
      const raceKey = normalizeRaceId(raceId);
      this.raceIdStored = raceKey;
      this.classIdStored = classId || 'adventurer';
      if (equipment) this.equipment = { ...equipment };

      const modelUnit = getModelForCharacter(raceKey, classId);
      const race = RACE_GRUDGE6[raceKey] ?? RACE_GRUDGE6.human;
      // Prefer RACE_GRUDGE6.cdnPath (canonical) over manifest when they diverge
      const modelPath = race.cdnPath || modelUnit.modelPath;

      const resolvedModel3d = (model3d || equipment)
        ? parseModel3d({ raceId: raceKey, classId, equipment: this.equipment, model3d } as any)
        : null;
      if (resolvedModel3d) this.model3dStored = resolvedModel3d;

      const equippedWeaponType = resolvedModel3d
        ? (weaponTypeFromModel3d(resolvedModel3d, classId) as WeaponType)
        : modelUnit.weaponType;

      const weaponType = weaponTypeOverride ?? (
        this.mode === 'harvest' || this.mode === 'build' ? 'unarmed' : equippedWeaponType
      );
      this.weaponType = weaponType;
      const loaded = await loadCharacterModel(modelPath);

      // Mesh catalog + swap BEFORE fit (equip hides non-selected Units_* meshes)
      if (resolvedModel3d) {
        this.equipmentManager = setupGrudge6Equipment(race.prefix, loaded.scene, resolvedModel3d);
        ensureCharacterTextureColorSpace(loaded.scene);
        applyCharacterColorTints(
          loaded.scene,
          resolvedModel3d.skinColor,
          resolvedModel3d.armorColor,
        );
      } else {
        // Still hide weapon soup — show base armor A
        this.equipmentManager = setupGrudge6Equipment(race.prefix, loaded.scene, {
          baseModelId: race.modelId,
          equippedMeshes: { body: 'A', arms: 'A', legs: 'A', head: 'A' },
          weaponSlots: { sword: 'A' },
          faceVariant: 'A',
          skinColor: '#ffffff',
          armorColor: '#ffffff',
          capeEnabled: false,
          scale: race.scale,
        });
        ensureCharacterTextureColorSpace(loaded.scene);
      }

      // race height mult (1.0 human, 0.85 dwarf…) — fit to 2m world
      const raceMult = resolvedModel3d?.scale ?? race.scale ?? modelUnit.scale ?? 1;
      this.applyLoadedModel(loaded, raceMult);
      // Always load Mixamo idle/walk/run — race GLBs are often T-pose with no clips
      await this.reloadWeaponAnimations(weaponType);
      if (this.animations?.hasClip('idle')) {
        this.animations.play('idle');
      }

      this.initStateMachine(characterId ?? 'local-player', raceKey, classId, weaponType);
    } catch (err) {
      console.warn(`Failed to load character model for ${raceId}/${classId}:`, err);
    }
  }

  /**
   * Full race swap — reloads race GLB + re-applies equipment mesh catalog.
   * Prefer this over refreshAppearance when raceId changes.
   */
  async swapRace(
    raceId: string,
    opts?: {
      classId?: string;
      characterId?: string;
      equipment?: Record<string, string | null>;
      model3d?: Partial<Model3DField>;
    },
  ): Promise<void> {
    await this.loadCharacterFromManifest(
      raceId,
      opts?.classId ?? this.classIdStored,
      opts?.characterId,
      undefined,
      opts?.model3d ?? this.model3dStored,
      opts?.equipment ?? this.equipment,
    );
  }

  /** Re-apply equipment meshes on the loaded GLB without a full model reload. */
  async refreshAppearance(
    equipment?: Record<string, string | null>,
    model3d?: Partial<Model3DField>,
  ): Promise<void> {
    if (equipment) this.equipment = { ...equipment };
    const resolvedModel3d = parseModel3d({
      raceId: this.raceIdStored,
      classId: this.classIdStored,
      equipment: this.equipment,
      model3d: { ...this.model3dStored, ...model3d },
    } as any);
    this.model3dStored = resolvedModel3d;

    // Race change requested via model3d.baseModelId → full swap
    const nextRaceHint = model3d?.baseModelId;
    if (nextRaceHint) {
      const { normalizeRaceId } = await import('@shared/fleet');
      const nextRace = normalizeRaceId(nextRaceHint);
      if (nextRace !== this.raceIdStored) {
        await this.swapRace(nextRace, { model3d: resolvedModel3d, equipment: this.equipment });
        return;
      }
    }

    if (!this.loadedModelScene) return;

    const race = RACE_GRUDGE6[this.raceIdStored] ?? RACE_GRUDGE6.human;
    this.equipmentManager = setupGrudge6Equipment(race.prefix, this.loadedModelScene, resolvedModel3d);
    ensureCharacterTextureColorSpace(this.loadedModelScene);
    applyCharacterColorTints(
      this.loadedModelScene,
      resolvedModel3d.skinColor,
      resolvedModel3d.armorColor,
    );

    const equippedWeaponType = weaponTypeFromModel3d(resolvedModel3d, this.classIdStored) as WeaponType;
    const weaponType = (this.mode === 'harvest' || this.mode === 'build')
      ? 'unarmed'
      : equippedWeaponType;
    await this.reloadWeaponAnimations(weaponType);
  }

  /** Swap animation set when play mode or equipment changes */
  async reloadWeaponAnimations(weaponType: WeaponType): Promise<void> {
    this.weaponType = weaponType;
    if (!this.animations) return;
    const animPaths = buildAnimLoadMap(weaponType) as Partial<Record<AnimState, string>>;
    // Guarantee locomotion even if weapon set is sparse (stops permanent T-pose)
    if (!animPaths.idle || !animPaths.walk) {
      const unarmed = buildAnimLoadMap('unarmed') as Partial<Record<AnimState, string>>;
      if (!animPaths.idle && unarmed.idle) animPaths.idle = unarmed.idle;
      if (!animPaths.walk && unarmed.walk) animPaths.walk = unarmed.walk;
      if (!animPaths.run && unarmed.run) animPaths.run = unarmed.run;
    }
    if (Object.keys(animPaths).length > 0) {
      await this.animations.loadAnimations(animPaths);
    }
    if (this.animations.hasClip('idle')) {
      this.animations.play('idle');
    }
    if (this.orchestrator) {
      this.orchestrator.dispose();
      this.orchestrator = this.createOrchestrator(weaponType);
    }
  }

  private createOrchestrator(weaponType: WeaponType): CharacterAnimOrchestrator {
    return new CharacterAnimOrchestrator(
      this.animations!,
      this.stateMachine!,
      weaponType,
      {
        onMotionAttack: (profile, slot, clipDur, stage) => {
          this.applyMotionAttack(profile, slot, clipDur, stage);
        },
      },
    );
  }

  getCombatHudSnapshot(): CombatHudSnapshot {
    return {
      combatMode: this.mode === 'combat',
      focusEnabled: this.focusEnabled,
      crosshairVisible: this.mode === 'combat',
      comboStage: this.comboStage,
      motionProfile: this.lastMotionProfile,
      motionLabel: formatMotionLabel(this.lastMotionProfile),
      isDashing: this.motionDash.isActive,
      hitMarker: this.hitMarker,
      spread: this.motionDash.isActive ? 4 : this.focusEnabled ? 2 : 0,
      rangeState: this.focusEnabled ? 'optimal' : 'none',
      currentForm: this.currentForm,
      actionBar: this.actionBar,
      lastUsedSlot: this.lastUsedSlot,
      cooldowns: (() => {
        const out: Record<number, number> = {};
        const now = performance.now();
        Object.keys(this.skillCooldowns || {}).forEach((k) => {
          const end = this.skillCooldowns[Number(k)];
          out[Number(k)] = Math.max(0, Math.min(1, (end - now) / 650));
        });
        return out;
      })(),
    };
  }

  /** Camera-forward attack lunge using dangerroom +/- MM profiles. */
  private applyMotionAttack(profile: MotionProfile, slot: PlaybackSlot, clipDur: number, stage: number): void {
    this.comboStage = stage;
    this.lastMotionProfile = profile;
    const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    this.motionDash.startFromProfile(this.model.position, dir, profile, clipDur);
    const dur = clipDur || 0.5;
    if (this.explorerAnim) {
      this.explorerAnim.playOneShot(slot as AnimState, dur);
    } else if (this.animations?.hasClip(slot as AnimState)) {
      this.animations.play(slot as AnimState, { loop: false });
    } else if (this.animations?.hasClip('attack')) {
      this.animations.play('attack', { loop: false });
    }
  }

  /** Set harvest / combat / build mode from UI */
  async setControlMode(mode: ControlMode, classId?: string, hasWeapon = false): Promise<void> {
    this.mode = mode;
    this.stateMachine?.updateContext({ inCombat: mode === 'combat' });
    // Build mode = free WASD + mouse look (editor placement)
    this.freeMoveLocomotion = mode === 'build';

    if (mode === 'combat') {
      this.stateMachine?.transition('combat');
    } else if (this.stateMachine?.getState() === 'combat') {
      this.stateMachine.transition(mode === 'build' ? 'building' : 'idle');
    } else if (mode === 'build') {
      this.stateMachine?.transition('building');
    } else {
      this.stateMachine?.transition('idle');
    }

    // Freeform ARPG: anim set follows current equipment, not class
    // Build uses unarmed locomotion + Build Hammer tool mesh in hand
    const equippedWt = this.model3dStored
      ? (weaponTypeFromModel3d(this.model3dStored, classId) as WeaponType)
      : this.weaponType;
    const wt = getWeaponTypeForMode(mode, classId ?? 'adventurer', hasWeapon, equippedWt);
    await this.reloadWeaponAnimations(wt);

    if (mode === 'build') {
      await this.equipBuildHammerTool();
    } else {
      this.unequipBuildHammerTool();
    }
  }

  /** Put Build Hammer (0.8× survival kit hammer mesh) in the character's hand. */
  async equipBuildHammerTool(): Promise<void> {
    this.unequipBuildHammerTool();
    const root = this.loadedModelScene ?? this.model;
    if (!root) return;
    try {
      this.buildHammer = await equipBuildHammer(root, this.equipmentManager);
    } catch (err) {
      console.warn('[Character] Build Hammer equip failed:', err);
    }
  }

  unequipBuildHammerTool(): void {
    unequipBuildHammer(this.buildHammer, this.equipmentManager);
    this.buildHammer = null;
  }

  /** Whether the build hammer tool is currently in-hand. */
  get hasBuildHammer(): boolean {
    return this.buildHammer != null;
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
      this.orchestrator = this.createOrchestrator(weaponType);
      this.explorerAnim?.dispose();
      this.explorerAnim = new ExplorerAnimDriver(this.animations);
    }
  }

  async loadModel(path: string): Promise<void> {
    try {
      const loaded = await loadCharacterModel(path);
      this.applyLoadedModel(loaded, 1);
      // Default locomotion so non-manifest loads still idle
      if (this.animations) {
        const animPaths = buildAnimLoadMap('unarmed') as Partial<Record<AnimState, string>>;
        if (Object.keys(animPaths).length > 0) {
          await this.animations.loadAnimations(animPaths);
        }
      }
    } catch (err) {
      console.warn('Failed to load character model:', err);
    }
  }

  /**
   * Attach GLB under controller root, fit to ~2m × raceMult, plant feet on board/terrain origin.
   * Always builds AnimationManager (external Mixamo idle loaded via reloadWeaponAnimations).
   */
  private applyLoadedModel(loaded: LoadedModel, raceScaleMult: number): void {
    loaded.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    ensureCharacterTextureColorSpace(loaded.scene);

    // Fit to world meters + center on tile (prevents giant T-pose off-square)
    // Uses visible equip meshes only (catalog already ran)
    fitCharacterRootToHeightM(loaded.scene, raceScaleMult, PLAYER_HEIGHT_M);

    while (this.model.children.length) {
      this.model.remove(this.model.children[0]);
    }
    this.model.add(loaded.scene);
    this.loadedModelScene = loaded.scene;

    // Always create mixer — embedded clips optional; Mixamo set fills idle/walk
    this.animations = new AnimationManager(loaded.scene);
    if (loaded.clips.length > 0) {
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
    }
    if (this.animations.hasClip('idle')) {
      this.animations.play('idle');
    }
    this.explorerAnim?.dispose();
    this.explorerAnim = new ExplorerAnimDriver(this.animations);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Tab') {
        e.preventDefault();
        const cycle: ControlMode[] = ['harvest', 'combat', 'build'];
        const idx = cycle.indexOf(this.mode);
        const next = cycle[(idx + 1) % cycle.length];
        // Full mode swap (hammer equip + free-move) — fire-and-forget
        void this.setControlMode(next, this.classIdStored, Boolean(this.model3dStored?.hasWeapon));
      }
      // Combat bindings — use easy-win clips from catalog
      if (this.mode === 'combat' && this.orchestrator) {
        if (e.key === 'f' || e.key === 'F') {
          this.orchestrator.playDodge();
        }
        if (e.key === 'r' || e.key === 'R') {
          this.orchestrator.playBlock();
        }
        if (e.key === 'z' || e.key === 'Z') {
          this.orchestrator.playMotionAttack('attack2');
        }
        if (e.key === 'x' || e.key === 'X') {
          this.orchestrator.playMotionAttack('attack3');
        }

        // Slots 1-5 for weapon/special skills like uMMORPG - production game flow
        const slotKey = parseInt(e.key);
        if (slotKey >= 1 && slotKey <= 5) {
          this.useSkillSlot(slotKey);
          e.preventDefault();
        }
      }

      // Form switching: Shift + F1 / F2 / F3
      // Camp unit orders (owned camp): plain F1–F5 handled by CampCommandBar / engine
      if (e.shiftKey) {
        const k = e.key;
        if (k === 'F1' || k === 'f1') {
          this.setForm(0);
          e.preventDefault();
        } else if (k === 'F2' || k === 'f2') {
          this.setForm(1);
          e.preventDefault();
        } else if (k === 'F3' || k === 'f3') {
          this.setForm(2);
          e.preventDefault();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.rmbHeld = true;
        this.rmbDownAt = performance.now();
        e.preventDefault();
        return;
      }
      if (e.button === 0) {
        this.mouseDown = true;
        if (this.mode === 'combat' && this.orchestrator) {
          this.orchestrator.playComboHit();
        } else if (this.mode === 'harvest') {
          if (this.shipDeckLocked && this.deckCastLineHandler?.()) {
            return;
          }
          if (this.stateMachine?.canTransitionTo('harvesting')) {
            this.stateMachine.transition('harvesting');
          }
        } else if (this.mode === 'build' && this.stateMachine?.canTransitionTo('building')) {
          this.stateMachine.transition('building');
        }
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) {
        if (performance.now() - this.rmbDownAt < 220) {
          this.focusEnabled = !this.focusEnabled;
        }
        this.rmbHeld = false;
      }
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.rmbHeld = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown || this.rmbHeld) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });
  }

  // ─── State transitions ─────────────────────────────────────────────────────

  setMovementState(next: MovementState): void {
    if (next === this.movementState) return;
    const prev = this.movementState;
    this.movementState = next;
    this.callbacks.onMovementStateChange?.(prev, next);
  }

  /** Switch to a form (0,1,2) for special weapons. Updates state and can notify HUD/orchestrator. */
  private setForm(formIndex: number): void {
    if (formIndex < 0 || formIndex > 2) return;
    this.currentForm = formIndex;
    this.initDemoActionBarForForm();
    console.log(`[CharacterController3D] Switched to form ${formIndex} (Shift+F${formIndex + 1}) for special weapon (grimoire/wand/nimble/dual etc.)`);
    // Keep user's assigned actionBar; demo only fills blanks. Snapshot picks up live.
  }

  /** Use skill from slot 1-5 (production uMMORPG style flow). Real skill ids from spellbook assignment. */
  private useSkillSlot(slot: number): void {
    // Only fill demo if the entire bar is still empty (respect full user assignment from spellbook)
    const hasUserBar = this.actionBar[1] || this.actionBar[2] || this.actionBar[3] || this.actionBar[4] || this.actionBar[5];
    if (!hasUserBar) this.initDemoActionBarForForm();

    const skillId = this.actionBar[slot];
    if (!skillId) {
      console.log(`[Game Flow] Slot ${slot} is empty. Assign in /skill-tree (Hotkeys tab)`);
      return;
    }

    // Cooldown to feel like real game (no spam during test)
    const now = performance.now();
    if (this.skillCooldowns[slot] && now < this.skillCooldowns[slot]) return;
    this.skillCooldowns[slot] = now + 650; // ~0.65s test cooldown

    const skill = getSkillById(skillId);
    const display = skill ? skill.name : skillId;
    console.log(`[Game Flow] Slot ${slot} → ${display} (id:${skillId}) form:${this.currentForm}`);

    this.lastUsedSlot = slot;
    this.lastUsedTime = now;

    if (this.orchestrator) {
      // For slot 1 basic or strike-like, the orchestrator will prefer combo for authentic warlords feel.
      // Other skills get specialized playback.
      this.orchestrator.playSkill(skillId, this.currentForm);
    }

    // Feedback + hit marker like DangerRoom
    this.hitMarker = (this.hitMarker || 0) + 1;

    // Simple effect categorization for testing (extend here for real damage/vfx/projectiles later)
    if (skillId.includes('blast') || skillId.includes('meteor') || skillId.includes('exp') || skillId.includes('chain')) {
      console.log(`[Skill] ${display}: casting projectile / AoE blast`);
    } else if (skillId.includes('ward') || skillId.includes('shield') || skillId.includes('block') || skillId.includes('reflect') || skillId.includes('fortify')) {
      console.log(`[Skill] ${display}: activating defense buff`);
    } else if (skillId.includes('minion') || skillId.includes('conj') || skillId.includes('summon') || skillId.includes('lord')) {
      console.log(`[Skill] ${display}: summoning entity`);
    } else {
      console.log(`[Skill] ${display}: executing attack/motion`);
    }
  }

  // ─── Main update ───────────────────────────────────────────────────────────

  update(dt: number): void {
    // Mouse look: RMB always; in free-move/build also allow when LMB not placing UI focus
    // (RMB is primary — matches editor free camera)
    const freeMove = this.freeMoveLocomotion || this.mode === 'build';
    if (this.rmbHeld || (this.mouseDown && !freeMove)) {
      this.cameraYaw -= this.mouseDelta.x * 0.003;
      this.cameraPitch = Math.max(0.1, Math.min(0.8, this.cameraPitch + this.mouseDelta.y * 0.003));
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    } else if (freeMove && this.rmbHeld) {
      // already handled above when rmbHeld
    } else {
      // discard unused delta so it doesn't accumulate
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }

    if (this.shipDeckLocked) {
      this.syncCameraFollow(dt);
      if (this.stateMachine) {
        this.stateMachine.update(dt);
        this.orchestrator?.update(dt);
      }
      this.animations?.update(dt);
      return;
    }

    // Clear last hotbar use highlight after short flash (for dr-hotbar testing feedback)
    if (this.lastUsedSlot && performance.now() - this.lastUsedTime > 700) {
      this.lastUsedSlot = undefined;
    }

    // ── Horizontal movement ──────────────────────────────────────────────────
    // Build / freeMove: WASD strafe relative to camera (editor free movement).
    // Default combat/harvest: W/S walk, Q/E strafe, A/D turn camera.
    this.direction.set(0, 0, 0);
    let moving = false;

    const freeMove = this.freeMoveLocomotion || this.mode === 'build';
    if (freeMove) {
      if (this.keys.has('w')) { this.direction.z -= 1; moving = true; }
      if (this.keys.has('s')) { this.direction.z += 1; moving = true; }
      if (this.keys.has('a')) { this.direction.x -= 1; moving = true; }
      if (this.keys.has('d')) { this.direction.x += 1; moving = true; }
      // Optional Q/E still strafe
      if (this.keys.has('q')) { this.direction.x -= 1; moving = true; }
      if (this.keys.has('e')) { this.direction.x += 1; moving = true; }
    } else {
      if (this.keys.has('w')) { this.direction.z -= 1; moving = true; }
      if (this.keys.has('s')) { this.direction.z += 1; moving = true; }
      if (this.keys.has('q')) { this.direction.x -= 1; moving = true; }
      if (this.keys.has('e')) { this.direction.x += 1; moving = true; }
      if (this.keys.has('a')) { this.cameraYaw += this.turnSpeed * dt; }
      if (this.keys.has('d')) { this.cameraYaw -= this.turnSpeed * dt; }
    }

    if (this.direction.length() > 0) this.direction.normalize();

    const moveDir = this.direction.clone();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const speedMult = CharacterController3D.SPEED_MULT[this.movementState];
    const effectiveSpeed = this.baseMoveSpeed * speedMult;

    const dashing = this.motionDash.apply(this.model.position, dt);
    if (this.motionDash.consumeImpact()) {
      this.hitMarker += 1;
    }
    if (!dashing) {
      this.velocity.lerp(moveDir.multiplyScalar(effectiveSpeed), dt * 5);
      this.model.position.x += this.velocity.x * dt;
      this.model.position.z += this.velocity.z * dt;
    } else {
      this.velocity.set(0, 0, 0);
      moving = false;
    }

    // ── Vertical physics ─────────────────────────────────────────────────────
    const groundHeight = this.sampleGroundHeight(this.model.position.x, this.model.position.z);
    const feetY = this.model.position.y;
    const headY = feetY + this.physics.characterHeight;
    const { waterLevel } = this.physics;
    const inWater = feetY < waterLevel;
    const submerged = headY < waterLevel;

    if (inWater) {
      const climbFromWater =
        this.checkClimbing(dt) || this.movementState === 'climbing';
      if (climbFromWater && this.keys.has('w')) {
        this.setMovementState('climbing');
        this.verticalVelocity = 6;
        this.callbacks.onStaminaDrain?.(this.physics.climbStaminaDrain * dt);
      } else {
      const forceDive = this.keys.has('control');
      // ── Swimming / Underwater ────────────────────────────────────────────
      if (submerged || forceDive) {
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
        // Space = ascend, S / Ctrl = descend while underwater
        if (this.keys.has(' ')) this.verticalVelocity += 8 * dt;
        if (this.keys.has('s') || forceDive) this.verticalVelocity -= 4 * dt;
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
      }
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
    if (this.mode === 'build' || this.freeMoveLocomotion) {
      // Free-move editor: face move direction, or camera forward when idle (RMB look)
      if (moving && this.velocity.lengthSq() > 0.01) {
        const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
        this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetAngle, dt * 10);
      } else if (this.rmbHeld) {
        this.model.rotation.y = THREE.MathUtils.lerp(
          this.model.rotation.y,
          this.cameraYaw + Math.PI,
          dt * 8,
        );
      }
    } else if (this.mode === 'harvest' && moving) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetAngle, dt * 8);
    } else if (this.mode === 'combat') {
      const strafeLock = this.focusEnabled || this.rmbHeld;
      if (strafeLock || !moving) {
        this.model.rotation.y = this.cameraYaw + Math.PI;
      } else {
        const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
        this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, targetAngle, dt * 8);
      }
    }

    this.syncCameraFollow(dt);

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
      if (smState === 'harvesting' && !moving && this.stateMachine.canTransitionTo('idle')) {
        this.stateMachine.transition('idle');
      }

      this.stateMachine.update(dt);
      this.orchestrator?.update(dt);
    }

    // ── Animations (dangerroom explorer LocomotionBlend + MM one-shots) ─────
    if (this.animations) {
      const explorerBusy =
        this.explorerAnim?.isOneShotActive() ||
        this.orchestrator?.hasActivityOverride() ||
        this.motionDash.isActive;

      if (explorerBusy) {
        this.animations.update(dt);
        this.wasMoving = moving;
        return;
      }

      if (this.oneShotTimer > 0) {
        this.oneShotTimer -= dt;
        this.animations.update(dt);
        this.wasMoving = moving;
        return;
      }

      if (this.wasMoving && !moving && this.movementState === 'ground') {
        this.animations.play('run_stop', { loop: false });
        this.oneShotTimer = 0.4;
      }

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
          if (this.explorerAnim && this.movementState === 'ground') {
            this.explorerAnim.updateLocomotion({
              moving,
              sprinting: this.keys.has('shift'),
              dt,
            });
          } else if (moving) {
            this.animations.play(this.keys.has('shift') ? 'run' : 'walk');
          } else {
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

  private syncCameraFollow(dt: number): void {
    const cameraTarget = this.model.position.clone();
    const offsetRotated = this.cameraOffset.clone();
    offsetRotated.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    offsetRotated.y *= (1 + this.cameraPitch);
    const desiredCamPos = cameraTarget.clone().add(offsetRotated);
    this.camera.position.lerp(desiredCamPos, dt * 5);
    this.camera.lookAt(cameraTarget.x, cameraTarget.y + 3, cameraTarget.z);
  }

  private checkClimbing(_dt: number): boolean {
    const chestY = this.model.position.y + this.physics.characterHeight * 0.5;
    const origin = new THREE.Vector3(this.model.position.x, chestY, this.model.position.z);
    const inWater = this.model.position.y < this.physics.waterLevel;
    this.climbCheckDir.set(0, 0, -1);
    if (inWater && this.climbMeshes.length > 0) {
      this.climbCheckDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    } else {
      this.climbCheckDir.applyQuaternion(this.model.quaternion);
    }
    this.climbRaycaster.set(origin, this.climbCheckDir);
    this.climbRaycaster.far = inWater ? 3.5 : 2.0;

    const targets = [this.terrainMesh, ...this.climbMeshes];
    for (const target of targets) {
      const hits = this.climbRaycaster.intersectObject(target, true);
      if (hits.length === 0) continue;
      const hit = hits[0];
      if (hit.object.userData?.climbable || hit.object.userData?.shipHull) return true;
      const normal = hit.face?.normal;
      if (!normal) continue;
      const worldNormal = normal.clone();
      if (hit.object.parent) {
        hit.object.getWorldQuaternion(new THREE.Quaternion());
      }
      worldNormal.transformDirection(hit.object.matrixWorld).normalize();
      if (worldNormal.y < this.physics.climbableMaxNormalY) return true;
    }
    return false;
  }

  private sampleGroundHeight(x: number, z: number): number | null {
    if (this.shipDeckSampler) {
      const dh = this.shipDeckSampler(x, z);
      if (dh !== null) return dh;
    }
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

  setEquipment(slots: Record<string, string | null>): void {
    this.equipment = { ...slots };
    void this.refreshAppearance();
  }

  setDeckCastLineHandler(handler: (() => boolean) | null): void {
    this.deckCastLineHandler = handler;
  }

  teleportTo(pos: THREE.Vector3): void {
    this.model.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
  }

  registerClimbMeshes(meshes: THREE.Object3D[]): void {
    this.climbMeshes.push(...meshes);
  }

  clearClimbMeshes(meshes: THREE.Object3D[]): void {
    this.climbMeshes = this.climbMeshes.filter((m) => !meshes.includes(m));
  }

  enterShipDeckMode(
    shipRoot: THREE.Object3D,
    bounds: { halfWidth: number; halfLength: number; deckY: number },
  ): void {
    this.shipDeckLocked = true;
    this.shipDeckSampler = (x, z) => {
      const local = new THREE.Vector3(x, 0, z);
      shipRoot.worldToLocal(local);
      if (Math.abs(local.x) > bounds.halfWidth || Math.abs(local.z) > bounds.halfLength) {
        return null;
      }
      const deck = new THREE.Vector3(0, bounds.deckY, 0);
      shipRoot.localToWorld(deck);
      return deck.y;
    };
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
  }

  exitShipDeckMode(groundRoot?: THREE.Object3D): void {
    this.shipDeckLocked = false;
    this.shipDeckSampler = null;
    if (groundRoot) {
      this.groundObject = groundRoot;
    }
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
    this.unequipBuildHammerTool();
    this.orchestrator?.dispose();
    this.orchestrator = null;
    this.animations?.dispose();
    this.model.parent?.remove(this.model);
  }
}
