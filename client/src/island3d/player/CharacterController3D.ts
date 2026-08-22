/**
 * CharacterController3D — WASD character controller with full physics.
 *
 * W = forward (away from camera), S = back, A/D = turn, Q/E = strafe.
 * Tab = soft-lock target cycle (yellow UI frame). Shift+Tab reverse.
 * Mode harvest/combat/build via ModePlayHUD UI (not Tab).
 * Z = put away / pull weapons. Auto-holster: climb, swim-edge, build.
 * Auto-draw: attack / skills while sheathed. Climb: Space hold, WASD, X off.
 */
import * as THREE from 'three';
import { getTerrainHeightAt, getSceneHeightAt } from '../terrain/IslandTerrainGenerator';
import {
  createJumpState,
  stepPlatformerJump,
  type PlatformerJumpConfig,
  type PlatformerJumpState,
} from '../physics/PlatformerJump';
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
import {
  equipHarvestPickaxe,
  unequipHarvestPickaxe,
  type HarvestPickaxeHandle,
} from '../building/HarvestPickaxeAttachment';
import { RACE_GRUDGE6, weaponTypeFromModel3d } from '@shared/fleet';
import { setupGrudge6Equipment, type Grudge6EquipmentManager } from '@/lib/grudge6Equipment';
import { applyExternalWeaponsForEquipment } from '@/lib/externalWeaponAttach';
import { applyCharacterColorTints, ensureCharacterTextureColorSpace } from '@/lib/characterAppearance';
import {
  ProductionSkillCombatRuntime,
  type CombatTarget as SkillCombatTarget,
} from '../combat/ProductionSkillCombatRuntime';
import { SpellTotemSystem } from '../combat/SpellTotemSystem';
import {
  isFriendlySkill,
  skillIntentFromId,
  totemPaintFromLoadout,
  SHIELD_SKILL_IDS,
  STUN_TOTEM_SKILL_IDS,
  STUN_TOTEM_RANGE_M,
  STUN_TOTEM_AOE_M,
} from '@shared/definitions/skillIntent';
import { buildAnimLoadMap } from '@/lib/animation/animationCatalog';
import { buildBip001AnimLoadMap } from '@/lib/animation/bip001DrcAnims';
import { CharacterAnimOrchestrator } from '@/lib/animation/characterAnimOrchestrator';
import { ExplorerAnimDriver } from '@/lib/animation/explorer/ExplorerAnimDriver';
import { MotionDash } from '@/lib/animation/explorer/MotionDash';
import type { MotionProfile } from '@/lib/animation/explorer/motionMath';
import { formatMotionLabel } from './combatHudState';
import type { CombatHudSnapshot } from './combatHudState';
import type { PhysicsWorld, CharacterController as RapierCct } from '../physics/PhysicsWorld';
import type { PlaybackSlot } from '@/lib/animation/animationCatalog';
import {
  fitCharacterRootToHeightM,
  reFitCharacterAfterAnimSample,
  sanitizeRaceScaleMult,
  PLAYER_HEIGHT_M,
  HUMAN_HEIGHT_M,
} from '../zoneWorldScale';
import {
  CharacterStateMachine,
  globalStateManager,
  type CharacterState,
  type StateContext,
} from '@/lib/characterStateMachine';
import { getSkillById } from '@/lib/skillTreeData';
import { WeaponHolsterController } from '@/lib/weaponHolsterController';
import {
  CLIMB_RULES,
  STAMINA_LOCOMOTION,
  HOLSTER_PROFILES,
  holsterClassForWeaponType,
  isForcedHolsterContext,
  WEAPON_TOGGLE_KEY,
  type DrawReason,
  type HolsterReason,
} from '@shared/definitions/weaponAttachSystem';
import {
  SoftLockSystem,
  type SoftLockScreenFrame,
  type SoftLockTarget,
} from './SoftLockSystem';

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
  onStaminaChange?: (stamina: number, max: number) => void;
  onDrownDamage?: (damage: number) => void;
  onMovementStateChange?: (prev: MovementState, next: MovementState) => void;
  onOxygenChange?: (oxygen: number, max: number) => void;
  /** Fired when weapons finish draw/holster transition */
  onWeaponHolsterChange?: (drawn: boolean) => void;
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
  /** Optional world FX bus (fire/smoke/teleport/dash feet) */
  private worldFx: import('../vfx/WorldFxBus').WorldFxBus | null = null;
  /** Optional foot IK (dash landing pulse + plant on uneven ground) */
  public characterIk: import('./CharacterIK').CharacterIK | null = null;
  /** Rapier CCT when Island3D PhysicsWorld is armed — same capsule as fleet HUMAN_CCT. */
  private rapierWorld: PhysicsWorld | null = null;
  private rapierCct: RapierCct | null = null;
  private harvestIkTarget: THREE.Vector3 | null = null;
  private harvestIkTimer = 0;
  /** Harvestable nodeId the current IK pulse is bound to */
  private harvestIkNodeId: string | null = null;
  /**
   * Animation / sim time scale (threejs-games player.timeScale pattern).
   * 1 = normal · 0.1 = RMB slow-mo (IK debug) · 0 = LMB freeze when ikDebug.
   */
  public timeScale = 1;
  private savedTimeScale = 1;
  private ikDebugSlowLmb = false;
  private ikDebugSlowRmb = false;
  /** Enable with ?ikdebug=1 or localStorage grudge_ik_debug=1 */
  public ikDebug = false;
  public weaponType: WeaponType = 'sword';
  public mode: ControlMode = 'harvest';
  /** True while LMB is held in combat mode (primary attack / boss damage ticks). */
  get isAttacking(): boolean {
    return this.mode === 'combat' && this.mouseDown;
  }
  public movementState: MovementState = 'falling';
  /** Panel equipment slots (MainHand rod → fishing, etc.) */
  public equipment: Record<string, string | null> = {};
  private deckCastLineHandler: (() => boolean) | null = null;
  private loadedModelScene: THREE.Object3D | null = null;
  private raceIdStored = 'human';
  private classIdStored = 'warrior';
  private model3dStored: Model3DField | null = null;
  private equipmentManager: Grudge6EquipmentManager | null = null;
  /** Production skill cast + projectile flight (keys 1–5) */
  private skillCombat: ProductionSkillCombatRuntime | null = null;
  private skillCombatHostiles: (() => SkillCombatTarget[]) | null = null;
  private skillCombatFriendlies: (() => SkillCombatTarget[]) | null = null;
  private spellTotems: SpellTotemSystem | null = null;
  /** First click on a heal/buff remaps 1=self, 2–4=allies. */
  private allyPick: { skillId: string; pendingSlot: number } | null = null;
  /** First click on stun totem: ground AOE zone follows look until LMB. */
  private zonePick: { skillId: string; pendingSlot: number } | null = null;
  private zonePoint = new THREE.Vector3();
  private readonly lookDir = new THREE.Vector3();
  /** Weapon draw/holster visual + transitional anims */
  private holster: WeaponHolsterController | null = null;
  /** True when weapons are currently in-hand (visual + combat ready) */
  public weaponsDrawn = false;
  /**
   * Player preference from Z toggle. Forced holster (climb/build) does not clear this;
   * when free again, Z still means "I want them out" only if they re-toggle or attack.
   * After forced holster we stay sheathed until Z or auto-draw attack.
   */
  private playerPrefersDrawn = false;
  /** Drawn state before build mode (restore on leave if player preferred drawn) */
  private drawnBeforeBuild = false;
  /** Soft-lock (Tab cycle) — engine feeds candidates each frame */
  public readonly softLock = new SoftLockSystem();
  private softLockFrame: SoftLockScreenFrame | null = null;
  private softLockProvider: (() => SoftLockTarget[]) | null = null;
  /** Survival-kit hammer mesh @ 0.8 scale in right hand while in build mode */
  private buildHammer: BuildHammerHandle | null = null;
  private harvestPickaxe: HarvestPickaxeHandle | null = null;
  /** Local stamina pool for climb / swim (syncs to state machine) */
  public stamina = STAMINA_LOCOMOTION.maxStamina;
  public maxStamina = STAMINA_LOCOMOTION.maxStamina;
  private staminaRegenDelay = 0;
  /** Climb wall contact */
  private climbNormal = new THREE.Vector3(0, 0, 1);
  private climbPoint = new THREE.Vector3();
  private spaceHoldTime = 0;
  private climbAttachLatch = false;
  private wallMoveDir = new THREE.Vector3();
  /**
   * Random-boxes FLY_JUMP (hold Space for variable height).
   * Opt-in via setPlatformerJump — Ethereal Falls, airship, volcanic climb.
   */
  private platformerJumpEnabled = false;
  private platformerJumpConfig: PlatformerJumpConfig | null = null;
  private platformerJumpState: PlatformerJumpState = createJumpState();
  private spaceWasHeld = false;
  /**
   * Combat hit: horizontal knockback (m/s) + stun lockout.
   * Boss AoE / shockwave / skills apply via applyCombatHit().
   */
  private knockVel = new THREE.Vector3();
  private stunTimer = 0;
  private hitReactTimer = 0;
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
  public actionBar: Record<number, string | null> = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  };
  public lastUsedSlot: number | undefined = undefined;
  private lastUsedTime = 0;

  public loadActionBar(bar: Record<number, string | null>) {
    if (bar && Object.keys(bar).length) {
      this.actionBar = { ...this.actionBar, ...bar };
    }
  }

  /**
   * Production hotbar from CharacterManager / spellbook (uMMORPG layout):
   *   1–5 weapon skills · 6–8 consumables · Shift+1–5 class abilities
   */
  public loadHotbar(hotbar: {
    weaponSkills?: Record<number, string | null>;
    consumables?: Record<number, string | null>;
    classAbilities?: Record<number, string | null>;
  }): void {
    if (hotbar.weaponSkills) {
      this.loadActionBar(hotbar.weaponSkills);
    }
    // Consumables / class abilities stored for HUD; combat keys 1–5 use actionBar
    (this as any)._consumableBar = hotbar.consumables ?? {};
    (this as any)._classAbilityBar = hotbar.classAbilities ?? {};
  }

  /** Assign skill ids into slots 1–5 (skillBar array from character / spellbook). */
  public setActionBarSlots(skills: Array<string | null | undefined>): void {
    const next: Record<number, string | null> = { ...this.actionBar };
    for (let i = 0; i < 5; i++) {
      const id = skills[i];
      if (id) next[i + 1] = id;
    }
    this.loadActionBar(next);
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
  /** SI walk (m/s). 1.8 ≈ one human-height / s. Shift sprints ~4.8. Was 5.5 (run as walk). */
  private baseMoveSpeed = 1.8;
  private static readonly SPRINT_GAIT = 2.65;
  private turnSpeed = 3;
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  /**
   * Sole play camera driver (WebGL Insights Ch.23 / CameraMode play_tps).
   * Created eagerly in constructor — no Orbit dual-write while active.
   */
  public thirdPersonCam: import('./ThirdPersonCameraSystem').ThirdPersonCameraSystem | null = null;
  /** When false, skip follow (cinematic / orbit_edit owns the lens). */
  public cameraFollowEnabled = true;

  // Climb raycast helpers
  private climbRaycaster = new THREE.Raycaster();
  private climbCheckDir = new THREE.Vector3();
  private climbMeshes: THREE.Object3D[] = [];
  private readonly _climbHitNormal = new THREE.Vector3();
  private readonly _climbLateral = new THREE.Vector3();
  /** When true, deck rig drives position — skip terrain physics */
  public shipDeckLocked = false;
  /** Tutorial wake cinematic — no move / no camera mouse until stand-up */
  public cinematicLock = false;
  /**
   * Load-gate: freeze locomotion + gravity until terrain/physics layer is
   * ready (Island3DEngine.armPhysicsLayer). Prevents fall-through on /play.
   */
  public entryLocked = false;
  /**
   * Tutorial shipwreck: use ONLY injured Mixamo pack for locomotion/reactions.
   * When true, idle/walk/run come from injured clips; invincible for opener UX.
   */
  public tutorialInjuredMode = false;
  /** Tutorial invincibility — ignore fall/drown damage callbacks */
  public invincible = false;
  /** Soft cap display HP (tutorial locks at 5) */
  public tutorialLockedHp: number | null = null;
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
  /**
   * Auto-walk to world XZ (farm harvest, interactables).
   * Cancelled by WASD/QE input or clearApproachTarget().
   */
  private approachTarget: THREE.Vector3 | null = null;
  private approachRange = 1.75;
  private onApproachArrive: (() => void) | null = null;

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

    // Eager TPC — sole play camera (no async gap / dual follow)
    void this.initThirdPersonCamera();

    // Empty root until loadCharacterFromManifest (CDN grudge6). No capsule placeholders.
    this.model = new THREE.Group();
    this.model.name = 'player_root';

    const startPos = config.startPosition || new THREE.Vector3(0, 20, 0);
    this.model.position.copy(startPos);
    config.scene.add(this.model);

    this.setupInputListeners();
  }

  /** Attach existing Island3D Rapier world — kinematic capsule, not a second engine. */
  attachRapierCct(world: PhysicsWorld): void {
    if (this.rapierCct) return;
    try {
      const r = 0.32;
      const half = Math.max(0.4, (this.physics.characterHeight - r * 2) * 0.5);
      this.rapierWorld = world;
      this.rapierCct = world.addCharacterCapsule(r, half, this.model.position.clone());
    } catch (err) {
      console.warn('[Character3D] Rapier CCT attach failed — height-sample walk stays', err);
      this.rapierCct = null;
      this.rapierWorld = null;
    }
  }

  hasRapierCct(): boolean {
    return !!this.rapierCct;
  }

  /** Aim right-hand IK at a harvest/combat strike (blend out after ~0.22s). */
  pulseHarvestHandIk(worldPoint: THREE.Vector3, nodeId?: string): void {
    this.harvestIkTarget = worldPoint.clone();
    this.harvestIkTimer = 0.22;
    this.harvestIkNodeId = nodeId ?? null;
  }

  lastHarvestIkNodeId(): string | null {
    return this.harvestIkNodeId;
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
      // Play kit is Toon RTS GLB (grudge6-cdn-ssot). Modular BRB_/WK_ paths stay fallbacks.
      const { getToonRtsPlayKitPath } = await import('@/lib/objectStoreApi');
      const modelPath = getToonRtsPlayKitPath(raceKey) || race.cdnPath || modelUnit.modelPath;

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
      // Same pipeline as uMMORPG / Unity race player prefabs:
      //   race GLB → mesh wardrobe → race textures → color tints → scale → anims → holster
      if (resolvedModel3d) {
        this.equipmentManager = setupGrudge6Equipment(race.prefix, loaded.scene, resolvedModel3d);
        try {
          const { applyGrudge6RaceTextures } = await import('@/lib/grudge6Textures');
          await applyGrudge6RaceTextures(loaded.scene, raceKey);
        } catch {
          /* textures optional offline */
        }
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
        try {
          const { applyGrudge6RaceTextures } = await import('@/lib/grudge6Textures');
          await applyGrudge6RaceTextures(loaded.scene, raceKey);
        } catch {
          /* optional */
        }
        ensureCharacterTextureColorSpace(loaded.scene);
      }

      // race height mult (1.0 human, 0.85 dwarf…) — NEVER trust scale:100 from DB
      const raceMult = sanitizeRaceScaleMult(
        resolvedModel3d?.scale ?? race.scale ?? modelUnit.scale ?? 1,
      );
      this.applyLoadedModel(loaded, raceMult);
      // Production grudge6 kits are T-pose — load Open Bip001 DRC packs (not Mixamo remap)
      await this.reloadWeaponAnimations(weaponType);
      if (this.animations?.hasClip('idle')) {
        this.animations.play('idle');
        // Pose changes bbox — re-fit after first mixer sample (100× / hip-float guard)
        this.animations.update?.(1 / 30);
        if (this.loadedModelScene) {
          reFitCharacterAfterAnimSample(this.loadedModelScene, raceMult, PLAYER_HEIGHT_M);
        }
      }
      const rep = this.loadedModelScene?.userData?.characterScale;
      if (rep) {
        console.info(
          `[Character] SI scale ${rep.diagnosis} h=${Number(rep.measuredAfter).toFixed(2)}m ` +
            `target=${Number(rep.targetHeight).toFixed(2)}m decade=${rep.unitDecade} ` +
            `(HUMAN=${HUMAN_HEIGHT_M}m)`,
          rep,
        );
      }

      // Foot IK is opt-in (?ikdebug=1). Play kit is Toon RTS GLB + existing
      // ground sampler — do not attach a second IK/terrain layer by default.
      try {
        const q = new URLSearchParams(window.location.search);
        this.ikDebug =
          q.get('ikdebug') === '1' ||
          localStorage.getItem('grudge_ik_debug') === '1';
      } catch {
        this.ikDebug = false;
      }
      if (this.ikDebug) {
        try {
          const { CharacterIK } = await import('./CharacterIK');
          this.characterIk = new CharacterIK(this.model);
        } catch {
          this.characterIk = null;
        }
      } else {
        this.characterIk = null;
      }

      this.initHolsterController(weaponType);
      // External prefabs (bone dagger, codex GLB) when kit mesh missing
      await this.applyExternalWeaponMeshes();
      // Default: weapons on back/hip — player pulls with Z (or auto-draw on attack)
      this.playerPrefersDrawn = false;
      this.beginHolsterWeapons('forced', true);

      this.ensureSkillCombat();
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
    this.initHolsterController(equippedWeaponType);
    await this.applyExternalWeaponMeshes();
    if (this.weaponsDrawn) {
      this.beginDrawWeapons(true);
    } else {
      this.beginHolsterWeapons('forced', true);
    }
  }

  /** Attach external GLB weapons (dagger etc.) after kit wardrobe equip. */
  private async applyExternalWeaponMeshes(): Promise<void> {
    const root = this.loadedModelScene ?? this.model;
    if (!root) return;
    try {
      await applyExternalWeaponsForEquipment(root, this.equipment, this.equipmentManager);
      this.holster?.rescanWeapons?.();
    } catch (err) {
      console.warn('[Character] external weapon attach failed', err);
    }
  }

  /** Lazy-init production skill combat + projectile runtime. */
  private ensureSkillCombat(): void {
    if (this.skillCombat) return;
    try {
      this.skillCombat = new ProductionSkillCombatRuntime(this.config.scene, this.worldFx);
      this.skillCombat.onAnim = (animKey) => {
        if (this.orchestrator && animKey) {
          try {
            this.orchestrator.playSkill(animKey, this.currentForm);
          } catch {
            /* anim optional */
          }
        }
      };
    } catch (err) {
      console.warn('[Character] skill combat runtime failed', err);
    }
  }

  /** Engine feeds hostiles for skill hit queries (creatures / PvE). */
  setSkillCombatHostiles(fn: (() => SkillCombatTarget[]) | null): void {
    this.skillCombatHostiles = fn;
  }

  /** Living allies (+ optional self) for heal pick + totem echo. */
  setSkillCombatFriendlies(fn: (() => SkillCombatTarget[]) | null): void {
    this.skillCombatFriendlies = fn;
  }

  private initHolsterController(weaponType: string): void {
    this.holster?.dispose();
    this.holster = null;
    const root = this.loadedModelScene ?? this.model;
    if (!root) return;
    this.holster = new WeaponHolsterController({
      root,
      equipment: this.equipmentManager,
      weaponType,
    });
  }

  /**
   * Holster weapons to hip/back. Auto contexts (climb/edge/build) or Z put-away.
   * Does not change control mode (Tab is independent).
   */
  beginHolsterWeapons(
    reason: HolsterReason = 'forced',
    instant = false,
  ): number {
    if (reason === 'player_toggle') {
      this.playerPrefersDrawn = false;
    }
    this.weaponsDrawn = false;
    const profile = HOLSTER_PROFILES[holsterClassForWeaponType(this.weaponType)] ?? HOLSTER_PROFILES.none;
    const quick =
      reason === 'climb_attach' ||
      reason === 'swim_to_edge' ||
      reason === 'edge_grab' ||
      reason === 'enter_build' ||
      reason === 'enter_harvest';
    const dur = this.holster?.requestState('holstered', {
      instant,
      durationSec: instant ? 0 : (quick ? CLIMB_RULES.quickHolsterSec : profile.transitionSec),
    }) ?? 0;

    if (!instant && this.animations && profile.holsterAnim === 'draw' && this.animations.hasClip('draw')) {
      this.animations.play('draw', { loop: false, fadeDuration: 0.15 });
      this.oneShotTimer = Math.max(this.oneShotTimer, dur || 0.35);
    }
    this.callbacks.onWeaponHolsterChange?.(false);
    return dur;
  }

  /** Draw weapons into hands — Z pull-out or auto on attack. */
  beginDrawWeapons(instant = false, reason: DrawReason = 'forced'): number {
    // Cannot draw while climbing or in pure build (hammer owns hands)
    if (
      isForcedHolsterContext({
        movementState: this.movementState,
        controlMode: this.mode,
      })
    ) {
      return 0;
    }
    if (reason === 'player_toggle' || reason === 'auto_attack' || reason === 'leave_build') {
      this.playerPrefersDrawn = true;
    }
    this.weaponsDrawn = true;
    const profile = HOLSTER_PROFILES[holsterClassForWeaponType(this.weaponType)] ?? HOLSTER_PROFILES.none;
    const dur = this.holster?.requestState('drawn', {
      instant,
      durationSec: instant ? 0 : (reason === 'auto_attack' ? Math.min(0.28, profile.transitionSec) : profile.transitionSec),
    }) ?? 0;

    if (!instant && this.animations && profile.drawAnim === 'draw' && this.animations.hasClip('draw')) {
      this.animations.play('draw', { loop: false, fadeDuration: 0.12 });
      this.oneShotTimer = Math.max(this.oneShotTimer, dur || 0.4);
    }
    this.callbacks.onWeaponHolsterChange?.(true);
    return dur;
  }

  /**
   * Z — put weapons away on back/hip, or pull them out.
   * Blocked while climbing / forced holster contexts.
   */
  toggleWeaponsDrawn(): boolean {
    if (
      isForcedHolsterContext({
        movementState: this.movementState,
        controlMode: this.mode,
      })
    ) {
      return false;
    }
    if (this.holster?.isBusy) return false;
    if (this.weaponsDrawn) {
      this.beginHolsterWeapons('player_toggle', false);
    } else {
      this.beginDrawWeapons(false, 'player_toggle');
    }
    return true;
  }

  /** Ensure weapons in-hand before an attack/skill (auto-draw when sheathed). */
  ensureWeaponsDrawnForAction(): void {
    if (this.weaponsDrawn) return;
    if (
      isForcedHolsterContext({
        movementState: this.movementState,
        controlMode: this.mode,
      })
    ) {
      return;
    }
    this.beginDrawWeapons(false, 'auto_attack');
  }

  get isClimbing(): boolean {
    return this.movementState === 'climbing';
  }

  /** True while on wall / climbing — stamina must not regen (Conan Exiles). */
  get blocksStaminaRegen(): boolean {
    return this.movementState === 'climbing' && CLIMB_RULES.blockStaminaRegen;
  }

  /**
   * Swap animation set when play mode or equipment changes.
   * Production grudge6 heroes: Open Bip001 baked packs (DRC).
   * Mixamo GLB remap kept only as last-resort fallback if all JSON 404.
   */
  async reloadWeaponAnimations(weaponType: WeaponType): Promise<void> {
    this.weaponType = weaponType;
    if (!this.animations) return;

    // Prefer Bip001 DRC (samurai 1H, run_forward, dual_wield skills)
    let animPaths = buildBip001AnimLoadMap(weaponType) as Partial<Record<AnimState, string>>;
    if (!animPaths.idle || !animPaths.walk) {
      const unarmed = buildBip001AnimLoadMap('unarmed') as Partial<Record<AnimState, string>>;
      if (!animPaths.idle && unarmed.idle) animPaths.idle = unarmed.idle;
      if (!animPaths.walk && unarmed.walk) animPaths.walk = unarmed.walk;
      if (!animPaths.run && unarmed.run) animPaths.run = unarmed.run;
    }

    if (Object.keys(animPaths).length > 0) {
      await this.animations.loadAnimations(animPaths);
    }

    // Fallback: legacy Mixamo GLB library if Bip001 failed entirely
    if (!this.animations.hasClip('idle')) {
      console.warn(
        '[Character] Bip001 DRC packs missing — falling back to Mixamo GLB set',
        weaponType,
      );
      animPaths = buildAnimLoadMap(weaponType) as Partial<Record<AnimState, string>>;
      if (!animPaths.idle || !animPaths.walk) {
        const unarmed = buildAnimLoadMap('unarmed') as Partial<Record<AnimState, string>>;
        if (!animPaths.idle && unarmed.idle) animPaths.idle = unarmed.idle;
        if (!animPaths.walk && unarmed.walk) animPaths.walk = unarmed.walk;
        if (!animPaths.run && unarmed.run) animPaths.run = unarmed.run;
      }
      if (Object.keys(animPaths).length > 0) {
        await this.animations.loadAnimations(animPaths);
      }
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
    const sl = this.softLock.getCurrent();
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
      actionBar: this.allyPick
        ? (() => {
            const map: Record<number, string | null> = { ...this.actionBar };
            const picks = this.listAllyPickTargets();
            map[1] = 'self';
            map[2] = picks[1]?.id ?? null;
            map[3] = picks[2]?.id ?? null;
            map[4] = picks[3]?.id ?? null;
            return map;
          })()
        : this.actionBar,
      allyPick: this.allyPick
        ? [1, 2, 3, 4].map((slot) => {
            const picks = this.listAllyPickTargets();
            const t = picks[slot - 1];
            return {
              slot,
              label: t
                ? t.id === 'self'
                  ? 'Self'
                  : t.name || `Ally ${slot - 1}`
                : '—',
              id: t?.id ?? '',
              hpFrac: t?.hpFrac,
            };
          })
        : null,
      allyPickSkill: this.allyPick?.skillId ?? null,
      zonePickSkill: this.zonePick?.skillId ?? null,
      lastUsedSlot: this.allyPick || this.zonePick ? undefined : this.lastUsedSlot,
      cooldowns: (() => {
        const out: Record<number, number> = {};
        this.ensureSkillCombat();
        const rt = this.skillCombat;
        if (!rt) return out;
        for (let s = 1; s <= 5; s++) {
          const id = this.actionBar[s];
          if (!id) continue;
          const def = rt.getDef(id);
          if (!def || def.cooldown <= 0) continue;
          out[s] = rt.cooldownProgress(id, def.cooldown);
        }
        return out;
      })(),
      ...(() => {
        const snap = this.skillCombat?.getCastSnapshot() ?? null;
        return {
          castName: snap?.name ?? null,
          castProgress: snap?.progress ?? 0,
          castRemainingSec: snap?.remainingSec ?? 0,
        };
      })(),
      softLock: this.softLockFrame,
      softLockTargetId: sl?.id ?? null,
      softLockTargetName: sl?.name ?? null,
    };
  }

  /** Engine supplies soft-lock candidates (creatures / bosses / camps). */
  setSoftLockProvider(fn: (() => SoftLockTarget[]) | null): void {
    this.softLockProvider = fn;
  }

  getSoftLockTargetId(): string | null {
    return this.softLock.lockedTargetId;
  }

  getSoftLockFrame(): SoftLockScreenFrame | null {
    return this.softLockFrame;
  }

  /**
   * Call each frame after camera update — refreshes lock + screen frame.
   * canvasW/H = container pixel size for HUD projection.
   */
  updateSoftLock(canvasW: number, canvasH: number): void {
    const candidates = this.softLockProvider?.() ?? [];
    const playerPos = this.model.position;
    const target = this.softLock.refresh(candidates, playerPos, this.camera);
    this.softLockFrame = this.softLock.projectToScreen(
      target,
      this.camera,
      canvasW,
      canvasH,
      playerPos,
    );
  }

  private cycleSoftLock(reverse: boolean): void {
    const candidates = this.softLockProvider?.() ?? [];
    this.softLock.cycle(candidates, this.model.position, this.camera, reverse);
    // Immediate frame refresh with last known canvas size fallback
    const w = (this.camera as THREE.PerspectiveCamera).aspect
      ? Math.max(320, window.innerWidth)
      : 1280;
    const h = Math.max(240, window.innerHeight);
    this.updateSoftLock(w, h);
  }

  /** Attach fire/smoke bus from Island3DEngine. */
  setWorldFxBus(bus: import('../vfx/WorldFxBus').WorldFxBus | null): void {
    this.worldFx = bus;
    // Recreate combat runtime with FX bus when available
    if (this.skillCombat) {
      this.skillCombat.dispose();
      this.skillCombat = null;
    }
    this.ensureSkillCombat();
  }

  /** Apply timeScale to mixer (0 freeze · 0.1 slow-mo · 1 normal). */
  setTimeScale(scale: number): void {
    this.timeScale = scale;
    if (this.animations) this.animations.timeScale = scale;
  }

  private refreshIkDebugTimeScale(): void {
    if (!this.ikDebug) {
      this.setTimeScale(this.savedTimeScale);
      return;
    }
    if (this.ikDebugSlowLmb) this.setTimeScale(0);
    else if (this.ikDebugSlowRmb) this.setTimeScale(0.1);
    else this.setTimeScale(this.savedTimeScale);
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
    // Attack fire spark at weapon reach
    if (this.worldFx) {
      const tip = this.model.position.clone();
      tip.y += 1.1;
      tip.x += dir.x * 1.4;
      tip.z += dir.z * 1.4;
      this.worldFx.attackBurst(tip);
    }
  }

  /** Set harvest / combat / build mode from UI */
  async setControlMode(mode: ControlMode, classId?: string, hasWeapon = false): Promise<void> {
    const prevMode = this.mode;
    this.mode = mode;
    this.stateMachine?.updateContext({ inCombat: mode === 'combat' });
    // Build mode = free WASD + mouse look (editor placement / build hammer)
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
      this.unequipHarvestPickaxeTool();
      await this.equipBuildHammerTool();
    } else if (mode === 'harvest') {
      this.unequipBuildHammerTool();
      // Pickaxe in hand + unarmed locomotion set (reloadWeaponAnimations above)
      await this.equipHarvestPickaxeTool();
      // Start in idle/walk blend ready — not T-pose
      if (this.animations?.hasClip('idle')) {
        this.animations.play('idle', { fadeDuration: 0.2 });
      }
    } else {
      this.unequipBuildHammerTool();
      this.unequipHarvestPickaxeTool();
    }

    // Refresh holster mesh catalog after equip swaps (tools may hide weapons)
    this.holster?.setWeaponType(
      mode === 'build' || mode === 'harvest' ? 'unarmed' : (equippedWt as string) || wt,
    );
    this.holster?.setEquipment(this.equipmentManager);
    this.holster?.rescanWeapons();

    // Enter harvest → sheath combat weapons, pickaxe in hand + harvest locomotion set.
    // Enter build → sheath + hammer. Leave harvest/build → restore draw preference in combat only.
    if (mode === 'harvest' && prevMode !== 'harvest') {
      if (prevMode === 'combat') {
        this.drawnBeforeBuild = this.weaponsDrawn || this.playerPrefersDrawn;
      }
      this.beginHolsterWeapons('enter_harvest', true);
      // Ensure harvest one-shot available (catalog maps attack → harvest when missing)
      if (this.animations?.hasClip('harvest')) {
        /* ready */
      } else if (this.animations?.hasClip('attack')) {
        /* harvest uses attack clip via catalog */
      }
    } else if (mode === 'build' && prevMode !== 'build') {
      if (prevMode === 'combat') {
        this.drawnBeforeBuild = this.weaponsDrawn || this.playerPrefersDrawn;
      }
      this.beginHolsterWeapons('enter_build', true);
    } else if (mode === 'combat' && prevMode !== 'combat') {
      if (this.drawnBeforeBuild || this.playerPrefersDrawn) {
        this.beginDrawWeapons(false, prevMode === 'harvest' ? 'leave_harvest' : 'leave_build');
      }
      // else stay holstered — player uses Z to pull out
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

  /** Put harvest pickaxe in hand (survival kit + race pick slot). Idempotent. */
  async equipHarvestPickaxeTool(): Promise<void> {
    if (this.harvestPickaxe?.attached && this.harvestPickaxe.root?.parent) {
      return; // already in hand
    }
    this.unequipHarvestPickaxeTool();
    const root = this.loadedModelScene ?? this.model;
    if (!root) return;
    try {
      this.harvestPickaxe = await equipHarvestPickaxe(root, this.equipmentManager);
    } catch (err) {
      console.warn('[Character] Harvest pickaxe equip failed:', err);
    }
  }

  unequipHarvestPickaxeTool(): void {
    unequipHarvestPickaxe(this.harvestPickaxe, this.equipmentManager);
    this.harvestPickaxe = null;
  }

  get hasHarvestPickaxe(): boolean {
    return this.harvestPickaxe != null;
  }

  /**
   * Harvest swing one-shot. Uses oneShotTimer so locomotion (walk/run/idle)
   * resumes after the clip without fighting the ground anim switch.
   */
  playHarvestSwing(): void {
    if (this.mode === 'build') return;
    // Harvest mode: keep pickaxe in hand. Combat node-clicks still play the swing.
    if (this.mode === 'harvest' && !this.harvestPickaxe) {
      void this.equipHarvestPickaxeTool();
    }
    const moving = this.velocity.lengthSq() > 0.04;
    const onDone = () => {
      if (this.mode !== 'harvest' || !this.animations) return;
      if (moving || this.velocity.lengthSq() > 0.04) {
        this.animations.play(this.keys.has('shift') ? 'run' : 'walk', { fadeDuration: 0.18 });
      } else {
        this.animations.play('idle', { fadeDuration: 0.2 });
      }
    };
    if (this.animations?.hasClip('harvest')) {
      this.animations.play('harvest', {
        loop: false,
        fadeDuration: 0.1,
        speed: 1.05,
        onFinish: onDone,
      });
      this.oneShotTimer = 0.55;
    } else if (this.animations?.hasClip('attack')) {
      this.animations.play('attack', {
        loop: false,
        fadeDuration: 0.1,
        speed: 1.1,
        onFinish: onDone,
      });
      this.oneShotTimer = 0.5;
    }
    if (this.stateMachine?.canTransitionTo('harvesting')) {
      this.stateMachine.transition('harvesting');
    }
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
        const animPaths = buildBip001AnimLoadMap('unarmed') as Partial<
          Record<AnimState, string>
        >;
        if (Object.keys(animPaths).length > 0) {
          await this.animations.loadAnimations(animPaths);
        }
      }
    } catch (err) {
      console.warn('Failed to load character model:', err);
    }
  }

  /**
   * Attach grudge6 race GLB under controller root, fit SI height, plant feet.
   * AnimationManager filled by reloadWeaponAnimations (Open Bip001 DRC packs).
   */
  private applyLoadedModel(loaded: LoadedModel, raceScaleMult: number): void {
    loaded.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    ensureCharacterTextureColorSpace(loaded.scene);

    // SI fit: 1 unit = 1 m, unit-decade UNCLAMPED (0.01 for classic 100× cm-as-m)
    const mult = sanitizeRaceScaleMult(raceScaleMult);
    fitCharacterRootToHeightM(loaded.scene, mult, PLAYER_HEIGHT_M);

    // Never leave an extra scale on the controller root (double-scale = 100× regressions)
    this.model.scale.set(1, 1, 1);

    while (this.model.children.length) {
      this.model.remove(this.model.children[0]);
    }
    this.model.add(loaded.scene);
    this.loadedModelScene = loaded.scene;

    // Mixer always; grudge6 race kits are usually T-pose — Bip001 packs fill idle/walk
    this.animations = new AnimationManager(loaded.scene);
    if (loaded.clips.length > 0) {
      loaded.clips.forEach((clip) => {
        const name = clip.name.toLowerCase();
        let state: AnimState = 'idle';
        if (name.includes('injured') && name.includes('walk')) state = 'walk';
        else if (name.includes('injured') && name.includes('run')) state = 'run';
        else if (name.includes('injured') && (name.includes('ground') || name.includes('lying'))) state = 'death';
        else if (name.includes('getting up') || name.includes('getup') || name.includes('stand up')) state = 'hard_landing';
        else if (name.includes('injured') && name.includes('idle')) state = 'idle';
        else if (name.includes('limp') && name.includes('walk')) state = 'walk';
        else if (name.includes('walk') || name.includes('run forward')) state = 'walk';
        else if (name.includes('run')) state = 'run';
        else if (name.includes('attack') || name.includes('slash')) state = 'attack';
        else if (name.includes('death') || name.includes('die')) state = 'death';
        else if (name.includes('hurt') || name.includes('hit react') || name.includes('impact')) state = 'impact';
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
      // Tab = soft-lock target cycle (yellow frame). Mode via ModePlayHUD UI.
      if (e.key === 'Tab') {
        e.preventDefault();
        this.cycleSoftLock(Boolean(e.shiftKey));
        return;
      }

      // Z — sheath / draw weapons (independent of Tab / combat mode)
      if (
        (e.key === WEAPON_TOGGLE_KEY || e.key === WEAPON_TOGGLE_KEY.toUpperCase()) &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        if (this.toggleWeaponsDrawn()) {
          e.preventDefault();
          return;
        }
      }

      // Climb detach — X while on wall (takes priority over combat X attack)
      if ((e.key === 'x' || e.key === 'X') && this.movementState === 'climbing') {
        this.detachFromClimb('input');
        e.preventDefault();
        return;
      }

      // Combat bindings — use easy-win clips from catalog
      if (this.mode === 'combat' && this.orchestrator && this.movementState !== 'climbing') {
        if (e.key === 'f' || e.key === 'F') {
          this.ensureWeaponsDrawnForAction();
          this.orchestrator.playDodge();
        }
        if (e.key === 'r' || e.key === 'R') {
          this.ensureWeaponsDrawnForAction();
          this.orchestrator.playBlock();
        }
        // C = former Z motion attack (Z is weapon toggle)
        if (e.key === 'c' || e.key === 'C') {
          this.ensureWeaponsDrawnForAction();
          this.orchestrator.playMotionAttack('attack2');
        }
        if (e.key === 'x' || e.key === 'X') {
          this.ensureWeaponsDrawnForAction();
          this.orchestrator.playMotionAttack('attack3');
        }

        // Slots 1-5: weapon skills. Shift+1–5: class abilities (Mage Shield, heals).
        const slotKey = parseInt(e.key);
        if (slotKey >= 1 && slotKey <= 5) {
          this.ensureWeaponsDrawnForAction();
          if (e.shiftKey) this.useClassAbilitySlot(slotKey);
          else this.useSkillSlot(slotKey);
          e.preventDefault();
        }
        if (e.key === 'Escape' && (this.allyPick || this.zonePick)) {
          this.allyPick = null;
          this.cancelZonePick();
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
        if (this.ikDebug) {
          this.ikDebugSlowRmb = true;
          this.refreshIkDebugTimeScale();
        }
        e.preventDefault();
        return;
      }
      if (e.button === 0) {
        this.mouseDown = true;
        if (this.ikDebug) {
          this.ikDebugSlowLmb = true;
          this.refreshIkDebugTimeScale();
        }
        if (this.zonePick) {
          this.confirmZonePick();
          e.preventDefault();
          return;
        }
        if (this.mode === 'combat' && this.orchestrator) {
          this.ensureWeaponsDrawnForAction();
          this.orchestrator.playComboHit();
        } else if (this.mode === 'harvest') {
          if (this.shipDeckLocked && this.deckCastLineHandler?.()) {
            return;
          }
          this.playHarvestSwing();
        } else if (this.mode === 'build' && this.stateMachine?.canTransitionTo('building')) {
          this.stateMachine.transition('building');
        }
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouseDown = false;
        if (this.ikDebug) {
          this.ikDebugSlowLmb = false;
          this.refreshIkDebugTimeScale();
        }
      }
      if (e.button === 2) {
        // Short RMB in combat = hard-focus toggle; harvest mode uses RMB for crop gather
        if (
          this.mode === 'combat' &&
          performance.now() - this.rmbDownAt < 220 &&
          !this.ikDebug
        ) {
          this.focusEnabled = !this.focusEnabled;
        }
        this.rmbHeld = false;
        if (this.ikDebug) {
          this.ikDebugSlowRmb = false;
          this.refreshIkDebugTimeScale();
        }
      }
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.rmbHeld = false;
      this.ikDebugSlowLmb = false;
      this.ikDebugSlowRmb = false;
      this.refreshIkDebugTimeScale();
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown || this.rmbHeld) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });
    // Zoom (three-player-controller style distance clamp)
    window.addEventListener(
      'wheel',
      (e) => {
        if (this.cinematicLock || this.entryLocked) return;
        this.thirdPersonCam?.applyZoom(e.deltaY);
      },
      { passive: true },
    );
  }

  /** Expose camera + IK knobs for editor / debug GUI. */
  getCameraEditableParams(): Record<string, number | boolean> | null {
    return this.thirdPersonCam?.getEditableParams() ?? null;
  }

  applyCameraEditableParams(p: Partial<Record<string, number | boolean>>): void {
    this.thirdPersonCam?.applyEditableParams(p);
  }

  getIkEditableParams(): Record<string, number | boolean> | null {
    return this.characterIk?.getEditableParams() ?? null;
  }

  applyIkEditableParams(p: Partial<Record<string, number | boolean>>): void {
    this.characterIk?.applyEditableParams(p);
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
    if (this.zonePick) return;
    if (this.allyPick) {
      this.confirmAllyPick(slot);
      return;
    }
    // Only fill demo if the entire bar is still empty (respect full user assignment from spellbook)
    const hasUserBar = this.actionBar[1] || this.actionBar[2] || this.actionBar[3] || this.actionBar[4] || this.actionBar[5];
    if (!hasUserBar) this.initDemoActionBarForForm();

    const skillId = this.actionBar[slot];
    if (!skillId) {
      console.log(`[Game Flow] Slot ${slot} is empty. Assign in /skill-tree (Hotkeys tab)`);
      return;
    }
    this.beginSkillCast(skillId, slot);
  }

  /** Shift+1–5 class abilities (Mage Shield, T0 missile / heal). */
  private useClassAbilitySlot(slot: number): void {
    if (this.zonePick) return;
    if (this.allyPick) {
      this.confirmAllyPick(slot);
      return;
    }
    const bar = (this as any)._classAbilityBar as Record<number, string | null> | undefined;
    const skillId = bar?.[slot] ?? null;
    if (!skillId) {
      console.log(`[Game Flow] Class slot Shift+${slot} empty`);
      return;
    }
    this.beginSkillCast(skillId, slot);
  }

  private beginSkillCast(skillId: string, slot: number): void {
    const intent = skillIntentFromId(skillId);
    if (STUN_TOTEM_SKILL_IDS.has(skillId)) {
      if (this.zonePick) return;
      this.allyPick = null;
      this.zonePick = { skillId, pendingSlot: slot };
      this.lastUsedTime = performance.now();
      this.ensureSpellTotem();
      return;
    }
    // First click of a heal/buff/friendly: remap 1–4 to Self / allies. Do not cast yet.
    if (intent === 'friendly' && !this.allyPick) {
      this.allyPick = { skillId, pendingSlot: slot };
      this.lastUsedTime = performance.now();
      return;
    }
    this.executeSkillCast(skillId, slot, intent === 'self' ? this.selfTarget() : null);
  }

  private confirmAllyPick(slot: number): void {
    const pick = this.allyPick;
    if (!pick) return;
    if (slot === 5) {
      this.allyPick = null;
      return;
    }
    if (slot > 4) return;
    const friends = this.listAllyPickTargets();
    const chosen = friends[slot - 1] ?? null;
    if (!chosen) return;
    this.allyPick = null;
    this.executeSkillCast(pick.skillId, pick.pendingSlot, chosen);
  }

  private selfTarget(): SkillCombatTarget {
    return {
      id: 'self',
      name: 'Self',
      position: this.model.position.clone(),
      hpFrac: this.stateMachine?.getContext?.()?.health != null
        ? (this.stateMachine.getContext().health /
            Math.max(1, this.stateMachine.getContext().maxHealth ?? 100))
        : 1,
    };
  }

  private listAllyPickTargets(): SkillCombatTarget[] {
    const self = this.selfTarget();
    const living = (this.skillCombatFriendlies?.() ?? []).filter((a) => a.id !== 'self');
    return [self, ...living].slice(0, 4);
  }

  private executeSkillCast(
    skillId: string,
    slot: number,
    preferred: SkillCombatTarget | null,
    echo = false,
  ): boolean {
    this.ensureSkillCombat();
    const combatDef = this.skillCombat?.getDef(skillId) ?? null;
    if (!echo && combatDef && this.skillCombat && !this.skillCombat.isReady(skillId)) return false;

    const now = performance.now();
    const skill = getSkillById(skillId);
    const display = skill ? skill.name : skillId;
    const intent = skillIntentFromId(skillId);
    const hostiles = this.skillCombatHostiles?.() ?? [];
    const friendlies = this.skillCombatFriendlies?.() ?? [];
    const lock = this.softLock.getCurrent();
    const lockTarget: SkillCombatTarget | null =
      preferred
      ?? (intent === 'self'
        ? this.selfTarget()
        : lock
          ? {
              id: lock.id,
              position: lock.position.clone(),
              hpFrac:
                lock.hp != null && lock.maxHp ? lock.hp / lock.maxHp : undefined,
            }
          : null);

    if (this.skillCombat && combatDef) {
      const hand =
        this.loadedModelScene?.getObjectByName('R_hand_container')
        ?? this.loadedModelScene?.getObjectByName('L_hand_container');
      const handPos = new THREE.Vector3();
      if (hand) hand.getWorldPosition(handPos);
      else handPos.copy(this.model.position).add(new THREE.Vector3(0, 1.35, 0));

      try {
        const result = this.skillCombat.cast(skillId, {
          casterPos: handPos,
          casterYaw: this.cameraYaw,
          lockTarget,
          hostiles: hostiles.length ? hostiles : (lockTarget ? [lockTarget] : []),
          friendlies,
          weaponType: this.weaponType,
          echo,
        });
        if (!result.ok) return false;
      } catch (err) {
        console.warn('[Skill] cast failed', skillId, err);
        return false;
      }
    }

    if (SHIELD_SKILL_IDS.has(skillId) && !echo) {
      this.dropSpellTotem();
    }
    if (!echo && !STUN_TOTEM_SKILL_IDS.has(skillId)) {
      this.ensureSpellTotem();
      this.spellTotems?.noteCast(skillId, intent, lockTarget);
    }

    if (echo) return true;

    console.log(`[Game Flow] Slot ${slot} → ${display} (id:${skillId}) form:${this.currentForm}`);
    this.lastUsedSlot = slot;
    this.lastUsedTime = now;

    if (this.mode === 'combat' && !this.weaponsDrawn) {
      this.beginDrawWeapons(true);
    }

    if (this.orchestrator) {
      this.orchestrator.playSkill(skillId, this.currentForm);
    }

    this.hitMarker = (this.hitMarker || 0) + 1;
    return true;
  }

  private ensureSpellTotem(): void {
    if (this.spellTotems) return;
    this.spellTotems = new SpellTotemSystem(this.config.scene);
    this.spellTotems.onEcho = (ev) => {
      this.executeSkillCast(ev.skillId, this.lastUsedSlot ?? 1, ev.target, true);
    };
    this.spellTotems.onStunPulse = (at, radius, stunSec) => {
      this.applyStunPulse(at, radius, stunSec);
    };
  }

  private confirmZonePick(): void {
    const pick = this.zonePick;
    if (!pick) return;
    this.ensureSkillCombat();
    if (this.skillCombat && !this.skillCombat.isReady(pick.skillId)) return;
    const at = this.lookGroundPoint(STUN_TOTEM_RANGE_M);
    if (!at) return;
    const planted = at.clone();
    const ok = this.executeSkillCast(pick.skillId, pick.pendingSlot, {
      id: 'stun_zone',
      position: planted,
    });
    if (!ok) return;
    this.zonePick = null;
    this.spellTotems?.setZonePreview(null, 0);
    this.dropStunTotem(planted);
  }

  private cancelZonePick(): void {
    this.zonePick = null;
    this.spellTotems?.setZonePreview(null, 0);
  }

  private dropStunTotem(at: THREE.Vector3): void {
    this.ensureSpellTotem();
    this.spellTotems?.spawnStun(at, STUN_TOTEM_AOE_M);
    this.worldFx?.totemEmerge(at);
  }

  private applyStunPulse(at: THREE.Vector3, radius: number, stunSec: number): void {
    this.worldFx?.stunBurst(at, radius);
    const r2 = radius * radius;
    for (const h of this.skillCombatHostiles?.() ?? []) {
      const dx = h.position.x - at.x;
      const dz = h.position.z - at.z;
      if (dx * dx + dz * dz > r2) continue;
      h.stun?.(stunSec);
    }
  }

  /** Camera look → first ground hit within range (SI metres from feet). */
  private lookGroundPoint(maxRange: number): THREE.Vector3 | null {
    const cam = this.camera;
    const dir = this.lookDir.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const from = cam.position;
    const feet = this.model.position;
    let hit: THREE.Vector3 | null = null;
    for (let t = 1.2; t <= maxRange + 8; t += 0.35) {
      const x = from.x + dir.x * t;
      const y = from.y + dir.y * t;
      const z = from.z + dir.z * t;
      const gy = this.sampleGroundHeight(x, z);
      if (gy == null) continue;
      if (y > gy + 0.45) continue;
      const dx = x - feet.x;
      const dz = z - feet.z;
      if (dx * dx + dz * dz > maxRange * maxRange) {
        const scale = maxRange / Math.max(0.01, Math.hypot(dx, dz));
        const cx = feet.x + dx * scale;
        const cz = feet.z + dz * scale;
        const cy = this.sampleGroundHeight(cx, cz) ?? gy;
        hit = this.zonePoint.set(cx, cy, cz);
        break;
      }
      hit = this.zonePoint.set(x, gy, z);
      break;
    }
    return hit;
  }

  private dropSpellTotem(): void {
    this.ensureSpellTotem();
    const bar = (this as any)._classAbilityBar as Record<number, string | null> | undefined;
    const paint = totemPaintFromLoadout(this.classIdStored, [
      ...Object.values(this.actionBar),
      ...Object.values(bar ?? {}),
    ]);
    const feet = this.model.position.clone();
    this.spellTotems?.spawn(feet, paint);
    this.worldFx?.totemEmerge(feet);
  }

  private tickSpellTotem(dt: number): void {
    if (this.zonePick) {
      const at = this.lookGroundPoint(STUN_TOTEM_RANGE_M);
      this.spellTotems?.setZonePreview(at, STUN_TOTEM_AOE_M);
    }
    this.spellTotems?.update(
      dt,
      performance.now(),
      this.skillCombatHostiles?.() ?? [],
      [this.selfTarget(), ...(this.skillCombatFriendlies?.() ?? [])],
    );
  }

  /** Hard land / slam: fall HP + one-shot ground-break VFX (then hide). */
  private hardGroundImpact(fallSpeed: number): void {
    const damage =
      (fallSpeed - this.physics.fallDamageThreshold) * this.physics.fallDamageScale;
    if (!this.invincible) this.callbacks.onFallDamage?.(damage);
    this.worldFx?.groundSlamBreak(this.model.position.clone());
  }

  // ─── Main update ───────────────────────────────────────────────────────────

  update(dt: number): void {
    // Keep mixer timeScale in sync (Three.js multiplies mixer.update by this)
    if (this.animations && this.animations.timeScale !== this.timeScale) {
      this.animations.timeScale = this.timeScale;
    }

    // Projectile flights + spiritual sword projectiles
    this.skillCombat?.update(dt * this.timeScale);
    this.tickSpellTotem(dt);

    // IK debug freeze (LMB → timeScale 0) — anims frozen, no locomotion
    if (this.ikDebug && this.timeScale <= 0) {
      this.animations?.update(dt);
      this.characterIk?.tickFootPhase(dt, false, false);
      return;
    }

    // Mouse look: RMB always; in free-move/build also allow when LMB not placing UI focus
    // (RMB is primary — matches editor free camera)
    const freeMove = this.freeMoveLocomotion || this.mode === 'build';
    if (this.rmbHeld || (this.mouseDown && !freeMove)) {
      if (this.thirdPersonCam) {
        this.thirdPersonCam.applyMouse(this.mouseDelta.x, this.mouseDelta.y);
        this.cameraYaw = this.thirdPersonCam.getYaw();
        this.cameraPitch = this.thirdPersonCam.getPitch();
      } else {
        this.cameraYaw -= this.mouseDelta.x * 0.003;
        this.cameraPitch = Math.max(0.1, Math.min(0.8, this.cameraPitch + this.mouseDelta.y * 0.003));
      }
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    } else {
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
      this.runFootIk(dt);
      return;
    }

    if (this.cinematicLock || this.entryLocked) {
      // Tutorial / load-gate — freeze locomotion; do not apply gravity
      this.velocity.set(0, 0, 0);
      this.verticalVelocity = 0;
      this.keys.clear();
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

    // Scaled sim dt (freeze / slow-mo for IK debug)
    const sdt = dt * (this.timeScale <= 0 ? 0 : this.timeScale);

    // ── Holster controller tick ──────────────────────────────────────────────
    this.holster?.update(sdt);
    // Wrist lock: clamp weapon grip after anim so blades do not clip torso
    this.equipmentManager?.updateWeaponWristLocks(sdt);
    this.updateStamina(sdt);

    // ── Climb attach / active wall move (Conan Exiles style) ─────────────────
    // Space hold near wall → attach (after holster). W/S up/down, A/D shimmy, X off.
    const climbHit = this.sampleClimbHit();
    const wasClimbing = this.movementState === 'climbing';

    if (wasClimbing) {
      if (this.stamina <= 0 && CLIMB_RULES.detachOnStaminaEmpty) {
        this.detachFromClimb('stamina');
      } else {
        const stillOnWall = this.updateClimbLocomotion(dt, climbHit);
        if (!stillOnWall && this.movementState === 'climbing') {
          this.detachFromClimb('lost_contact');
        }
      }
    } else if (climbHit && this.keys.has(' ')) {
      // Hold Space near climbable surface to grab
      this.spaceHoldTime += dt;
      if (this.spaceHoldTime >= CLIMB_RULES.attachHoldSec && this.stamina > 0) {
        this.tryAttachClimb(climbHit);
      }
    } else {
      this.spaceHoldTime = 0;
      this.climbAttachLatch = false;
    }

    // Swim-to-edge: quick holster when near climbable edge while swimming
    const groundHeightPre = this.sampleGroundHeight(this.model.position.x, this.model.position.z);
    const feetYPre = this.model.position.y;
    const caveInteriorPre =
      (this as CharacterController3D & { caveInteriorActive?: boolean }).caveInteriorActive === true;
    const inWaterPre = !caveInteriorPre && feetYPre < this.physics.waterLevel;
    if (
      inWaterPre &&
      climbHit &&
      climbHit.distance <= CLIMB_RULES.swimEdgeHolsterDist &&
      this.weaponsDrawn &&
      !wasClimbing
    ) {
      this.beginHolsterWeapons('swim_to_edge', false);
    }

    // ── Stun / hit-react timers ──────────────────────────────────────────────
    if (this.stunTimer > 0) this.stunTimer = Math.max(0, this.stunTimer - dt);
    if (this.hitReactTimer > 0) this.hitReactTimer = Math.max(0, this.hitReactTimer - dt);
    const stunned = this.stunTimer > 0;

    // ── Horizontal movement ──────────────────────────────────────────────────
    // Climbing uses wall-aligned move in updateClimbLocomotion — skip ground WASD.
    this.direction.set(0, 0, 0);
    let moving = false;

    if (this.movementState === 'climbing') {
      // Wall move already applied; keep velocity for anim flags
      moving = this.wallMoveDir.lengthSq() > 0.01;
      this.velocity.set(0, 0, 0);
      // Knockback can still detach from wall
      if (this.knockVel.lengthSq() > 0.5) {
        this.detachFromClimb('lost_contact');
      }
    } else if (stunned) {
      // Stun: no WASD, only knockback + gravity
      this.velocity.set(0, 0, 0);
      moving = false;
    } else {
      // Build / freeMove: WASD strafe relative to camera (editor free movement).
      // Default combat/harvest: W/S walk, E strafe right, A/D turn camera.
      // Q is reserved for combat ↔ harvest mode swap (ModePlayHUD) — not strafe.
      if (freeMove) {
        if (this.keys.has('w')) { this.direction.z -= 1; moving = true; }
        if (this.keys.has('s')) { this.direction.z += 1; moving = true; }
        if (this.keys.has('a')) { this.direction.x -= 1; moving = true; }
        if (this.keys.has('d')) { this.direction.x += 1; moving = true; }
        if (this.keys.has('e')) { this.direction.x += 1; moving = true; }
      } else {
        if (this.keys.has('w')) { this.direction.z -= 1; moving = true; }
        if (this.keys.has('s')) { this.direction.z += 1; moving = true; }
        if (this.keys.has('e')) { this.direction.x += 1; moving = true; }
        if (this.keys.has('a')) { this.cameraYaw += this.turnSpeed * dt; }
        if (this.keys.has('d')) { this.cameraYaw -= this.turnSpeed * dt; }
      }

      if (this.direction.length() > 0) this.direction.normalize();

      // Player steering cancels auto-approach (farm harvest walk)
      if (moving && this.approachTarget) {
        this.clearApproachTarget();
      }

      const moveDir = this.direction.clone();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

      // Auto-walk toward approach target when idle
      if (this.approachTarget && !moving) {
        const dx = this.approachTarget.x - this.model.position.x;
        const dz = this.approachTarget.z - this.model.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= this.approachRange) {
          const cb = this.onApproachArrive;
          this.clearApproachTarget();
          cb?.();
        } else if (dist > 1e-4) {
          moveDir.set(dx / dist, 0, dz / dist);
          moving = true;
          const targetAngle = Math.atan2(dx, dz);
          const cur = this.model.rotation.y;
          let diff = targetAngle - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          this.model.rotation.y = cur + diff * Math.min(1, dt * 10);
        }
      }

      const speedMult = CharacterController3D.SPEED_MULT[this.movementState];
      const sprinting =
        this.keys.has('shift') && !this.tutorialInjuredMode && moving;
      const gait = sprinting ? CharacterController3D.SPRINT_GAIT : 1;
      const effectiveSpeed = this.baseMoveSpeed * speedMult * gait;

      const dashing = this.motionDash.apply(this.model.position, dt);
      if (this.motionDash.consumeImpact()) {
        this.hitMarker += 1;
        // Foot IK plant + dash foot smoke (threejs-games LegIK + particles spirit)
        this.characterIk?.pulseDashFootIK();
        this.worldFx?.dashFootSmoke(
          this.model.position.clone(),
          this.cameraYaw,
        );
      }
      if (!dashing) {
        this.velocity.lerp(moveDir.multiplyScalar(effectiveSpeed), dt * 5);
        if (!this.rapierCct) {
          this.model.position.x += this.velocity.x * dt;
          this.model.position.z += this.velocity.z * dt;
        }
      } else {
        this.velocity.set(0, 0, 0);
        moving = false;
      }
    }

    // Apply residual knockback (boss AoE / skills) — physical push in XZ
    if (this.knockVel.lengthSq() > 1e-4) {
      if (!this.rapierCct) {
        this.model.position.x += this.knockVel.x * dt;
        this.model.position.z += this.knockVel.z * dt;
      }
      // Exponential decay (~0.2s half-life feel)
      const damp = Math.exp(-dt * 5.5);
      this.knockVel.x *= damp;
      this.knockVel.z *= damp;
      if (this.knockVel.lengthSq() < 0.05) this.knockVel.set(0, 0, 0);
    }

    // Rapier CCT owns XZ + gravity/jump when armed (not swim/climb/deck).
    if (
      this.rapierCct &&
      this.rapierWorld &&
      this.movementState !== 'climbing' &&
      !this.shipDeckLocked &&
      !inWaterPre
    ) {
      if (!this.platformerJumpEnabled) {
        const jumpHeldCct = this.keys.has(' ');
        if (this.isGrounded && jumpHeldCct && !stunned) {
          this.verticalVelocity = this.physics.jumpForce;
          this.isGrounded = false;
          this.keys.delete(' ');
        } else if (!this.isGrounded) {
          this.verticalVelocity += this.physics.gravity * dt;
        }
      }
      const wasGroundedCct = this.isGrounded;
      const prevVyCct = this.verticalVelocity;
      const desired = new THREE.Vector3(
        this.velocity.x * dt + this.knockVel.x * dt,
        this.platformerJumpEnabled ? 0 : this.verticalVelocity * dt,
        this.velocity.z * dt + this.knockVel.z * dt,
      );
      const center = this.rapierWorld.moveCharacter(this.rapierCct, desired, dt);
      const feetYCct =
        center.y - this.rapierCct.capsuleHalfHeight - this.rapierCct.capsuleRadius;
      this.model.position.x = center.x;
      this.model.position.z = center.z;
      if (!this.platformerJumpEnabled) {
        this.model.position.y = feetYCct;
        this.isGrounded = this.rapierWorld.isCharacterGrounded(this.rapierCct);
        if (
          !wasGroundedCct &&
          this.isGrounded &&
          prevVyCct < -this.physics.fallDamageThreshold
        ) {
          this.hardGroundImpact(Math.abs(prevVyCct));
        }
        if (this.isGrounded && this.verticalVelocity < 0) this.verticalVelocity = 0;
        this.setMovementState(
          this.isGrounded ? 'ground' : this.verticalVelocity > 0 ? 'jumping' : 'falling',
        );
      }
    }

    // ── Vertical physics ─────────────────────────────────────────────────────
    const groundHeight = this.sampleGroundHeight(this.model.position.x, this.model.position.z);
    const feetY = this.model.position.y;
    const headY = feetY + this.physics.characterHeight;
    // Cave interiors: never apply ocean water (even if world Y < 0)
    const caveInterior =
      (this as CharacterController3D & { caveInteriorActive?: boolean }).caveInteriorActive === true;
    const { waterLevel } = this.physics;
    const inWater = !caveInterior && feetY < waterLevel;
    const submerged = !caveInterior && headY < waterLevel;

    if (this.movementState === 'climbing') {
      // Vertical already applied in updateClimbLocomotion; no gravity
      this.isGrounded = false;
      this.jumpCount = 0;
    } else if (inWater) {
      const forceDive = this.keys.has('control');
      // ── Swimming / Underwater ────────────────────────────────────────────
      if (submerged || forceDive) {
        this.setMovementState('swimming_underwater');
        this.oxygen = Math.max(0, this.oxygen - dt);
        this.callbacks.onOxygenChange?.(this.oxygen, this.physics.maxOxygen);
        if (this.oxygen <= 0 && !this.invincible) {
          this.callbacks.onDrownDamage?.(this.physics.drownDamage * dt);
        }
        if (!this.keys.has('s')) {
          this.verticalVelocity += 4 * dt;
        }
        if (this.keys.has(' ') && !climbHit) this.verticalVelocity += 8 * dt;
        if (this.keys.has('s') || forceDive) this.verticalVelocity -= 4 * dt;
      } else {
        this.setMovementState('swimming_surface');
        this.oxygen = Math.min(this.physics.maxOxygen, this.oxygen + dt * 3);
        this.callbacks.onOxygenChange?.(this.oxygen, this.physics.maxOxygen);
        const surfaceTarget = waterLevel - 0.5;
        this.verticalVelocity = (surfaceTarget - feetY) * 5;
        // Space near shore with no wall = hop out; wall uses climb attach above
        if (this.keys.has(' ') && !climbHit && groundHeight !== null && groundHeight > waterLevel - 1) {
          this.verticalVelocity = this.physics.jumpForce * 0.7;
        }
      }
      this.drainStamina(this.physics.swimStaminaDrain * dt);
      this.verticalVelocity *= (1 - 2 * dt);
    } else {
      // ── Restore oxygen on land ──────────────────────────────────────────
      this.oxygen = Math.min(this.physics.maxOxygen, this.oxygen + dt * 5);

      // ── Ground / Air physics ───────────────────────────────────────────
      const distToGround = groundHeight !== null ? feetY - groundHeight : 999;
      const jumpHeld = this.keys.has(' ') && !climbHit && !stunned;
      const jumpPressed = jumpHeld && !this.spaceWasHeld;

      if (this.platformerJumpEnabled && this.platformerJumpConfig && !stunned) {
        // Random-boxes FLY_JUMP — hold Space for variable height (do not consume key)
        const prevVy = this.verticalVelocity;
        const result = stepPlatformerJump({
          dt,
          y: feetY,
          groundY: groundHeight,
          jumpHeld,
          jumpPressed,
          config: this.platformerJumpConfig,
          state: this.platformerJumpState,
        });
        this.platformerJumpState = result.state;
        this.verticalVelocity = result.state.velocityY;
        this.model.position.y = result.y;
        this.isGrounded = result.state.grounded;
        if (result.state.grounded) this.jumpCount = 0;
        else this.jumpCount = Math.max(this.jumpCount, 1);

        if (result.movement === 'ground') this.setMovementState('ground');
        else if (result.movement === 'jumping') this.setMovementState('jumping');
        else this.setMovementState('falling');

        // Fall damage on land transition
        if (result.state.grounded && prevVy < -this.physics.fallDamageThreshold) {
          this.hardGroundImpact(Math.abs(prevVy));
        }
      } else if (this.rapierCct && !inWater) {
        /* CCT already wrote feet Y + grounded */
      } else {
        if (distToGround <= 0.2 && this.verticalVelocity <= 0) {
          if (!this.isGrounded) {
            const fallSpeed = Math.abs(this.verticalVelocity);
            if (fallSpeed > this.physics.fallDamageThreshold) {
              this.hardGroundImpact(fallSpeed);
              if (this.animations) {
                if (this.tutorialInjuredMode && this.animations.hasClip('impact')) {
                  this.animations.play('impact', { loop: false });
                } else {
                  this.animations.play('hard_landing', { loop: false });
                }
                this.oneShotTimer = 0.8;
              }
            } else if (fallSpeed > 8) {
              if (this.animations && !this.tutorialInjuredMode) {
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
          this.isGrounded = false;
          this.verticalVelocity += this.physics.gravity * dt;
          this.setMovementState(this.verticalVelocity > 0 ? 'jumping' : 'falling');
        }

        // ── Jump input (Space) — disabled when stunned or climb-hold ─
        if (this.keys.has(' ') && !climbHit && !stunned) {
          const maxJumps = this.physics.doubleJump ? 2 : 1;
          if (this.jumpCount < maxJumps && (this.isGrounded || this.jumpCount > 0)) {
            this.verticalVelocity = this.physics.jumpForce;
            this.isGrounded = false;
            this.jumpCount++;
            this.setMovementState('jumping');
          }
          // Consume key so holding space doesn't re-trigger jump
          this.keys.delete(' ');
        } else if (this.keys.has(' ') && climbHit && this.spaceHoldTime < CLIMB_RULES.attachHoldSec) {
          // Holding for climb — do not jump
        }
      }
      this.spaceWasHeld = this.keys.has(' ');
    }

    // Apply vertical velocity (climb path applies its own; platformer jump already integrated y)
    if (
      this.movementState !== 'climbing' &&
      !this.platformerJumpEnabled &&
      !(this.rapierCct && !inWater)
    ) {
      this.model.position.y += this.verticalVelocity * dt;
    }

    // ── Character rotation ───────────────────────────────────────────────────
    if (this.movementState === 'climbing') {
      // Face into the wall (away from wall normal)
      const faceYaw = Math.atan2(-this.climbNormal.x, -this.climbNormal.z);
      this.model.rotation.y = THREE.MathUtils.lerp(this.model.rotation.y, faceYaw, dt * 12);
    } else if (this.mode === 'build' || this.freeMoveLocomotion) {
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
        this.runFootIk(dt);
        this.wasMoving = moving;
        return;
      }

      if (this.oneShotTimer > 0) {
        this.oneShotTimer -= dt;
        this.animations.update(dt);
        this.runFootIk(dt);
        this.wasMoving = moving;
        return;
      }

      if (this.wasMoving && !moving && this.movementState === 'ground') {
        this.animations.play('run_stop', { loop: false });
        this.oneShotTimer = 0.4;
      }

      switch (this.movementState) {
        case 'climbing': {
          // W/S vertical, A/D shimmy — pick best available climb clip
          const up = this.keys.has('w');
          const down = this.keys.has('s');
          const left = this.keys.has('a');
          const right = this.keys.has('d');
          let climbAnim: AnimState = 'climb_idle';
          if (up || down) climbAnim = 'climb_up';
          else if (left) climbAnim = 'climb_shimmy_l';
          else if (right) climbAnim = 'climb_shimmy_r';
          if (!this.animations.hasClip(climbAnim)) {
            if (this.animations.hasClip('climb_top')) climbAnim = 'climb_top';
            else if (this.animations.hasClip('climb_up')) climbAnim = 'climb_up';
            else climbAnim = moving ? 'walk' : 'idle';
          }
          this.animations.play(climbAnim);
          break;
        }

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
            // Tutorial opener: injured pack only (no healthy sprint)
            if (this.tutorialInjuredMode) {
              const sprint = this.keys.has('shift') && this.animations.hasClip('run');
              this.animations.play(sprint ? 'run' : 'walk');
            } else {
              this.animations.play(this.keys.has('shift') ? 'run' : 'walk');
            }
          } else {
            this.idleVariantTimer += dt;
            if (this.idleVariantTimer > 8 + Math.random() * 4) {
              this.idleVariantTimer = 0;
              this.useAltIdle = !this.useAltIdle;
            }
            this.animations.play(this.useAltIdle && this.animations.hasClip('idle_alt') ? 'idle_alt' : 'idle');
          }
          break;
      }

      this.animations.update(dt);
      this.runFootIk(dt);
    }

    this.wasMoving = moving;
  }

  /** Foot IK after FK animations (terrain plant + dash pulse). */
  private runFootIk(dt: number): void {
    if (!this.characterIk) return;
    const terrain: THREE.Object3D[] = [];
    if (this.terrainMesh) terrain.push(this.terrainMesh);
    if (this.groundObject) terrain.push(this.groundObject);
    // Ship deck plates when boarded
    if (this.shipDeckLocked && this.climbMeshes.length) {
      for (const m of this.climbMeshes) {
        if (m.userData?.shipDeck || m.userData?.shipHull) terrain.push(m);
      }
    }
    if (terrain.length === 0) return;
    this.characterIk.isMoving = this.velocity.lengthSq() > 0.25;
    this.characterIk.isGrounded = this.isGrounded || this.shipDeckLocked;
    // restore → already ran mixer in update(); IK adjusts on top of FK
    this.characterIk.updateFootIK(terrain, dt);
    if (this.harvestIkTimer > 0 && this.harvestIkTarget) {
      this.harvestIkTimer -= dt;
      const w = Math.max(0, Math.min(0.85, this.harvestIkTimer / 0.22));
      this.characterIk.updateHandIK('right', this.harvestIkTarget, w);
      if (this.harvestIkTimer <= 0) {
        this.harvestIkTarget = null;
        this.harvestIkNodeId = null;
      }
    }
  }

  // ─── Climbing detection ────────────────────────────────────────────────────

  private async initThirdPersonCamera(): Promise<void> {
    const { ThirdPersonCameraSystem } = await import('./ThirdPersonCameraSystem');
    if (this.thirdPersonCam) return;
    this.thirdPersonCam = new ThirdPersonCameraSystem(this.camera, {
      distance: 8,
      lookAtHeightRatio: 0.72,
      overShoulder: 0.45,
      minDistance: 2.2,
      maxDistance: 14,
    });
    this.thirdPersonCam.setCharacterHeight(this.physics.characterHeight);
    const cols: THREE.Object3D[] = [];
    if (this.terrainMesh) cols.push(this.terrainMesh);
    if (this.groundObject) cols.push(this.groundObject);
    this.thirdPersonCam.setColliders(cols);
    this.thirdPersonCam.setYaw(this.cameraYaw);
    this.thirdPersonCam.setPitch(this.cameraPitch);
  }

  /**
   * Play camera only. Skipped when cameraFollowEnabled is false
   * (cinematic / orbit_edit — see Island3DEngine.setCameraMode).
   * No inline dual-lerp fallback — TPC is the sole writer.
   */
  private syncCameraFollow(dt: number): void {
    if (!this.cameraFollowEnabled) return;
    if (!this.thirdPersonCam) {
      void this.initThirdPersonCamera();
      return;
    }
    this.thirdPersonCam.setCharacterHeight(this.physics.characterHeight);
    const cols: THREE.Object3D[] = [];
    if (this.terrainMesh) cols.push(this.terrainMesh);
    if (this.groundObject) cols.push(this.groundObject);
    for (const m of this.climbMeshes) cols.push(m);
    this.thirdPersonCam.setColliders(cols);
    this.thirdPersonCam.setYaw(this.cameraYaw);
    this.thirdPersonCam.update(this.model.position, dt);
    this.cameraPitch = this.thirdPersonCam.getPitch();
  }

  /** Climb surface sample — returns null if no climbable wall in range. */
  private sampleClimbHit(): { point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null {
    const chestY = this.model.position.y + this.physics.characterHeight * 0.5;
    const origin = new THREE.Vector3(this.model.position.x, chestY, this.model.position.z);
    const inWater = this.model.position.y < this.physics.waterLevel;
    this.climbCheckDir.set(0, 0, -1);
    if (this.movementState === 'climbing') {
      // Keep probing into last known wall
      this.climbCheckDir.copy(this.climbNormal).multiplyScalar(-1);
      if (this.climbCheckDir.lengthSq() < 0.01) this.climbCheckDir.set(0, 0, -1);
    } else if (inWater && this.climbMeshes.length > 0) {
      this.climbCheckDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    } else {
      this.climbCheckDir.applyQuaternion(this.model.quaternion);
    }
    this.climbRaycaster.set(origin, this.climbCheckDir.normalize());
    this.climbRaycaster.far = inWater
      ? Math.max(3.5, CLIMB_RULES.swimEdgeHolsterDist)
      : CLIMB_RULES.wallDetectDist;

    const maxNy = this.physics.climbableMaxNormalY ?? CLIMB_RULES.climbableMaxNormalY;
    const targets = [this.terrainMesh, ...this.climbMeshes];
    for (const target of targets) {
      if (!target) continue;
      const hits = this.climbRaycaster.intersectObject(target, true);
      if (hits.length === 0) continue;
      const hit = hits[0];
      const tagged = Boolean(hit.object.userData?.climbable || hit.object.userData?.shipHull);
      let worldNormal = this._climbHitNormal.set(0, 0, 1);
      if (hit.face) {
        worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
      } else if (hit.normal) {
        worldNormal.copy(hit.normal).normalize();
      }
      // Face outward from wall (toward free space)
      const toPlayer = origin.clone().sub(hit.point);
      if (worldNormal.dot(toPlayer) < 0) worldNormal.negate();

      if (tagged || worldNormal.y < maxNy) {
        return {
          point: hit.point.clone(),
          normal: worldNormal.clone(),
          distance: hit.distance,
        };
      }
    }
    return null;
  }

  /** @deprecated use sampleClimbHit — kept for callers expecting boolean */
  private checkClimbing(_dt: number): boolean {
    return this.sampleClimbHit() != null;
  }

  private tryAttachClimb(hit: { point: THREE.Vector3; normal: THREE.Vector3; distance: number }): void {
    if (this.climbAttachLatch || this.movementState === 'climbing') return;
    if (this.stamina <= 0) return;

    // Holster weapons before grab (hands free)
    if (CLIMB_RULES.holsterBeforeClimb && this.weaponsDrawn) {
      this.beginHolsterWeapons('climb_attach', false);
    } else if (CLIMB_RULES.holsterBeforeClimb) {
      this.beginHolsterWeapons('climb_attach', true);
    }

    this.climbNormal.copy(hit.normal).normalize();
    this.climbPoint.copy(hit.point);
    this.climbAttachLatch = true;
    this.spaceHoldTime = 0;
    this.verticalVelocity = 0;
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
    this.setMovementState('climbing');

    // Stick to wall
    const stick = hit.point.clone().addScaledVector(this.climbNormal, CLIMB_RULES.wallStickDistance);
    this.model.position.x = stick.x;
    this.model.position.z = stick.z;
    // Keep Y — climbing starts at current height

    if (this.animations) {
      if (this.animations.hasClip('climb_attach')) {
        this.animations.play('climb_attach', { loop: false, fadeDuration: 0.2 });
        this.oneShotTimer = 0.45;
      } else if (this.animations.hasClip('climb_idle')) {
        this.animations.play('climb_idle');
      } else if (this.animations.hasClip('climb_top')) {
        this.animations.play('climb_top');
      }
    }
  }

  /**
   * Wall locomotion: W/S vertical, A/D lateral along wall.
   * Returns false if contact lost or stamina empty.
   */
  private updateClimbLocomotion(
    dt: number,
    hit: { point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null,
  ): boolean {
    if (!hit) return false;

    this.climbNormal.copy(hit.normal).normalize();
    this.climbPoint.copy(hit.point);

    // Lateral = world up × wall normal (shimmy along wall)
    this._climbLateral.set(0, 1, 0).cross(this.climbNormal);
    if (this._climbLateral.lengthSq() < 0.01) {
      this._climbLateral.set(1, 0, 0).cross(this.climbNormal);
    }
    this._climbLateral.normalize();

    let vUp = 0;
    let vLat = 0;
    if (this.keys.has('w')) vUp += 1;
    if (this.keys.has('s')) vUp -= 1;
    if (this.keys.has('a')) vLat -= 1; // left on wall
    if (this.keys.has('d')) vLat += 1;

    this.wallMoveDir.set(0, 0, 0);
    if (vUp !== 0) this.wallMoveDir.y = vUp;
    if (vLat !== 0) {
      this.wallMoveDir.x += this._climbLateral.x * vLat;
      this.wallMoveDir.z += this._climbLateral.z * vLat;
    }

    const moving = vUp !== 0 || vLat !== 0;
    const ySpeed = CLIMB_RULES.climbSpeedVertical;
    const latSpeed = CLIMB_RULES.climbSpeedLateral;

    this.model.position.y += vUp * ySpeed * dt;
    this.model.position.x += this._climbLateral.x * vLat * latSpeed * dt;
    this.model.position.z += this._climbLateral.z * vLat * latSpeed * dt;

    // Stick to wall face
    const stick = hit.point.clone().addScaledVector(this.climbNormal, CLIMB_RULES.wallStickDistance);
    this.model.position.x = THREE.MathUtils.lerp(this.model.position.x, stick.x, 0.35);
    this.model.position.z = THREE.MathUtils.lerp(this.model.position.z, stick.z, 0.35);

    this.verticalVelocity = 0;

    // Stamina: always drain on wall; extra while moving (Conan style)
    const drain =
      CLIMB_RULES.staminaDrainPerSec *
      (moving ? CLIMB_RULES.moveDrainMult : 1) *
      dt;
    this.drainStamina(drain);

    if (CLIMB_RULES.detachOnStaminaEmpty && this.stamina <= 0) {
      return false;
    }

    // Mantle / top-out: if feet near ground above wall, exit climb to ground
    const gh = this.sampleGroundHeight(this.model.position.x, this.model.position.z);
    if (gh !== null && this.model.position.y <= gh + 0.25 && vUp > 0) {
      // Still on low wall — fine
    }
    if (gh !== null && this.model.position.y - gh < 0.15 && Math.abs(vUp) < 0.01 && hit.distance > 1.2) {
      // Standing on top ledge
      this.model.position.y = gh;
      this.detachFromClimb('mantle');
      return false;
    }

    return true;
  }

  private detachFromClimb(reason: 'input' | 'lost_contact' | 'stamina' | 'mantle'): void {
    if (this.movementState !== 'climbing') return;
    this.climbAttachLatch = false;
    this.spaceHoldTime = 0;
    this.wallMoveDir.set(0, 0, 0);
    this.verticalVelocity = reason === 'input' || reason === 'stamina' ? -1 : 0;

    if (this.animations) {
      if (reason === 'mantle' && this.animations.hasClip('climb_mantle')) {
        this.animations.play('climb_mantle', { loop: false });
        this.oneShotTimer = 0.5;
      } else if (this.animations.hasClip('climb_detach')) {
        this.animations.play('climb_detach', { loop: false });
        this.oneShotTimer = 0.35;
      }
    }

    // Stay holstered after climb — player pulls with Z (or auto-draw on next attack)
    this.setMovementState('falling');
  }

  private drainStamina(amount: number): void {
    if (amount <= 0) return;
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaRegenDelay = STAMINA_LOCOMOTION.regenDelaySec;
    this.callbacks.onStaminaDrain?.(amount);
    this.callbacks.onStaminaChange?.(this.stamina, this.maxStamina);
    // Avoid state-machine auto-sleep while hanging on a wall (climb handles empty stamina)
    if (this.movementState === 'climbing') {
      this.stateMachine?.updateContext({
        stamina: Math.max(0.01, this.stamina),
        maxStamina: this.maxStamina,
      });
    } else {
      this.stateMachine?.updateContext({ stamina: this.stamina, maxStamina: this.maxStamina });
    }
  }

  private updateStamina(dt: number): void {
    // Conan: no regen while climbing / on wall
    if (this.blocksStaminaRegen) {
      this.staminaRegenDelay = STAMINA_LOCOMOTION.regenDelaySec;
      return;
    }
    if (this.staminaRegenDelay > 0) {
      this.staminaRegenDelay -= dt;
      return;
    }
    if (this.stamina >= this.maxStamina) return;
    // Also no regen while actively swimming hard (surface still allows slow regen)
    if (this.movementState === 'swimming_underwater') return;

    const before = this.stamina;
    this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_LOCOMOTION.regenPerSec * dt);
    if (this.stamina !== before) {
      this.callbacks.onStaminaChange?.(this.stamina, this.maxStamina);
      this.stateMachine?.updateContext({ stamina: this.stamina, maxStamina: this.maxStamina });
    }
  }

  private sampleGroundHeight(x: number, z: number): number | null {
    try {
      if (this.shipDeckSampler) {
        const dh = this.shipDeckSampler(x, z);
        if (dh !== null) return dh;
      }
      if (this.groundSampler) {
        const h = this.groundSampler(x, z);
        if (h !== null) return h;
      }
      if (this.groundObject) {
        // High maxY so volcanic climb shelves above 400 m still ray-hit.
        // getSceneHeightAt only hits real meshes (sprites skip) — never throws.
        return getSceneHeightAt(this.groundObject, x, z, 2800);
      }
      return getTerrainHeightAt(this.terrainMesh, x, z);
    } catch (err) {
      // Last-resort: never let a bad raycast kill the /play frame loop
      console.warn('[CharacterController3D] sampleGroundHeight failed', err);
      return null;
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Enable random-boxes hold-to-jump (FLY_JUMP). Pass config from PlatformerJump presets.
   * When enabled, Space is held for variable height instead of one-shot impulse.
   */
  setPlatformerJump(enabled: boolean, config?: PlatformerJumpConfig): void {
    this.platformerJumpEnabled = enabled;
    this.platformerJumpConfig = enabled ? (config ?? null) : null;
    this.platformerJumpState = createJumpState();
    this.spaceWasHeld = false;
  }

  isPlatformerJumpEnabled(): boolean {
    return this.platformerJumpEnabled;
  }

  /** Swap BVH / Rapier height sampler after the physics layer arms. */
  setGroundSampler(sampler: ((x: number, z: number) => number | null) | null): void {
    this.groundSampler = sampler;
  }

  /**
   * Hold the captain still until Island3D reports physicsReady.
   * When unlocking, snap feet to a valid ground sample if one exists.
   */
  setEntryLocked(locked: boolean): void {
    this.entryLocked = locked;
    if (locked) {
      this.verticalVelocity = 0;
      this.velocity.set(0, 0, 0);
      return;
    }
    const y = this.sampleGroundHeight(this.model.position.x, this.model.position.z);
    if (y !== null && Number.isFinite(y)) {
      this.model.position.y = y;
      this.isGrounded = true;
      this.verticalVelocity = 0;
      this.setMovementState('ground');
    }
  }

  /**
   * Apply boss / skill combat hit: horizontal knockback, optional knock-up, stun lockout.
   * `deltaVel` is m/s (X/Z push + Y launch). Stun blocks WASD for `stunSec`.
   * Invincible / tutorial lockout skips application.
   */
  applyCombatHit(
    deltaVel: THREE.Vector3,
    stunSec = 0.3,
    opts?: { knockdown?: boolean; anim?: string },
  ): void {
    if (this.invincible || this.cinematicLock || this.entryLocked) return;

    this.knockVel.x += deltaVel.x;
    this.knockVel.z += deltaVel.z;
    // Cap horizontal knock so multi-hits don't launch to orbit
    const h = Math.hypot(this.knockVel.x, this.knockVel.z);
    if (h > 22) {
      this.knockVel.x = (this.knockVel.x / h) * 22;
      this.knockVel.z = (this.knockVel.z / h) * 22;
    }

    if (deltaVel.y > 0) {
      this.verticalVelocity = Math.max(this.verticalVelocity, deltaVel.y);
      this.isGrounded = false;
      this.setMovementState('jumping');
    }

    this.stunTimer = Math.max(this.stunTimer, stunSec);
    this.hitReactTimer = Math.max(this.hitReactTimer, Math.min(0.9, stunSec + 0.15));

    // Hit-react one-shot when anim pack has it
    if (this.animations && this.hitReactTimer > 0) {
      const key =
        opts?.anim === 'stun_loop'
          ? 'hit_reaction'
          : opts?.knockdown || deltaVel.y > 3
            ? 'hard_landing'
            : 'hit_reaction';
      if (this.animations.hasClip?.(key)) {
        this.animations.play(key, { loop: false });
        this.oneShotTimer = Math.min(0.85, stunSec + 0.2);
      } else if (this.animations.hasClip?.('impact')) {
        this.animations.play('impact', { loop: false });
        this.oneShotTimer = 0.5;
      }
    }
  }

  /** Convenience: radial knock from a world origin (boss AoE). */
  applyRadialKnock(
    origin: THREE.Vector3,
    knockbackMps: number,
    knockUpMps: number,
    stunSec: number,
    opts?: { knockdown?: boolean },
  ): void {
    const dx = this.model.position.x - origin.x;
    const dz = this.model.position.z - origin.z;
    let len = Math.hypot(dx, dz);
    if (len < 1e-4) {
      // Dead center — pick camera-away
      const yaw = this.cameraYaw;
      this.applyCombatHit(
        new THREE.Vector3(Math.sin(yaw) * knockbackMps, knockUpMps, Math.cos(yaw) * knockbackMps),
        stunSec,
        opts,
      );
      return;
    }
    this.applyCombatHit(
      new THREE.Vector3((dx / len) * knockbackMps, knockUpMps, (dz / len) * knockbackMps),
      stunSec,
      opts,
    );
  }

  isStunned(): boolean {
    return this.stunTimer > 0;
  }

  get stunRemaining(): number {
    return this.stunTimer;
  }

  getPosition(): THREE.Vector3 {
    return this.model.position.clone();
  }

  /**
   * Walk to world position (XZ), then fire onArrive when within range.
   * Used by farm crop harvest (RMB on final form).
   */
  setApproachTarget(
    worldPos: THREE.Vector3,
    onArrive?: () => void,
    rangeM = 1.75,
  ): void {
    this.approachTarget = worldPos.clone();
    this.onApproachArrive = onArrive ?? null;
    this.approachRange = rangeM;
  }

  clearApproachTarget(): void {
    this.approachTarget = null;
    this.onApproachArrive = null;
  }

  get hasApproachTarget(): boolean {
    return this.approachTarget != null;
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

  /**
   * Tutorial shipwreck opener: injured-only anims + invincibility + locked HP display.
   */
  enableTutorialInjuredMode(lockedHp = 5): void {
    this.tutorialInjuredMode = true;
    this.invincible = true;
    this.tutorialLockedHp = lockedHp;
    // Limp: slower base move during wash-up (SI m/s)
    this.baseMoveSpeed = Math.min(this.baseMoveSpeed, 1.15);
  }

  disableTutorialInjuredMode(): void {
    this.tutorialInjuredMode = false;
    this.invincible = false;
    this.tutorialLockedHp = null;
    // Restore SI walk (sprint is Shift × SPRINT_GAIT)
    this.baseMoveSpeed = 1.8;
  }

  /** Play injured ground loop (prone) for cinematic */
  playInjuredGround(): void {
    if (!this.animations) return;
    if (this.animations.hasClip('death')) {
      this.animations.play('death', { loop: true, fadeDuration: 0.4 });
    } else if (this.animations.hasClip('idle')) {
      this.animations.play('idle', { loop: true });
    }
  }

  /** Play get-up one-shot then injured idle */
  playInjuredGetUp(onDone?: () => void): void {
    if (!this.animations) {
      onDone?.();
      return;
    }
    if (this.animations.hasClip('hard_landing')) {
      this.animations.play('hard_landing', {
        loop: false,
        fadeDuration: 0.2,
        onFinish: () => {
          if (this.animations?.hasClip('idle')) this.animations.play('idle', { loop: true });
          onDone?.();
        },
      });
    } else {
      if (this.animations.hasClip('idle')) this.animations.play('idle', { loop: true });
      onDone?.();
    }
  }

  teleportTo(pos: THREE.Vector3): void {
    // Smoke at departure + arrival
    if (this.worldFx) {
      this.worldFx.teleportSmoke(this.model.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
    }
    this.model.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    if (this.worldFx) {
      this.worldFx.teleportSmoke(pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    }
  }

  registerClimbMeshes(meshes: THREE.Object3D[]): void {
    this.climbMeshes.push(...meshes);
  }

  clearClimbMeshes(meshes: THREE.Object3D[]): void {
    this.climbMeshes = this.climbMeshes.filter((m) => !meshes.includes(m));
  }

  /**
   * Lock feet to ship deck terrain.
   * Optional `opts.sampleLocalY(lx,lz)` samples multi-level deck (stairs → helm).
   * Optional `opts.deckColliders` used for raycast walkable Y.
   */
  enterShipDeckMode(
    shipRoot: THREE.Object3D,
    bounds: { halfWidth: number; halfLength: number; deckY: number; upperDeckY?: number },
    opts?: {
      sampleLocalY?: (localX: number, localZ: number) => number;
      deckColliders?: THREE.Object3D[];
    },
  ): void {
    this.shipDeckLocked = true;
    this.shipDeckSampler = (x, z) => {
      const local = new THREE.Vector3(x, 0, z);
      shipRoot.worldToLocal(local);
      if (Math.abs(local.x) > bounds.halfWidth || Math.abs(local.z) > bounds.halfLength) {
        return null;
      }
      let localY = bounds.deckY;
      if (opts?.sampleLocalY) {
        localY = opts.sampleLocalY(local.x, local.z);
      } else if (opts?.deckColliders?.length) {
        // Raycast down through deck plates
        shipRoot.updateWorldMatrix(true, true);
        const origin = shipRoot.localToWorld(
          new THREE.Vector3(local.x, (bounds.upperDeckY ?? bounds.deckY) + 5, local.z),
        );
        const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0), 0, 24);
        const hits = ray.intersectObjects(opts.deckColliders, true);
        if (hits.length) {
          const hitLocal = shipRoot.worldToLocal(hits[0].point.clone());
          localY = hitLocal.y;
        }
      }
      const deck = new THREE.Vector3(local.x, localY, local.z);
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

  /**
   * Play a video-mocap / bake clip on the character (fleet Anim Studio integration).
   * Clip tracks must match this model skeleton (mixamorig / remapped).
   */
  playMocapClip(
    clip: THREE.AnimationClip,
    opts?: { loop?: boolean; fadeDuration?: number; onFinish?: () => void },
  ): boolean {
    if (!this.animations) return false;
    this.animations.playMocapClip(clip, {
      state: "special",
      loop: opts?.loop,
      fadeDuration: opts?.fadeDuration ?? 0.15,
      onFinish: opts?.onFinish,
    });
    return true;
  }

  getActivityState(): CharacterState {
    return this.stateMachine?.getState() ?? 'idle';
  }

  getStamina(): number {
    return this.stamina;
  }

  getMaxStamina(): number {
    return this.maxStamina;
  }

  get weaponsAreDrawn(): boolean {
    return this.weaponsDrawn;
  }

  destroy(): void {
    this.unequipBuildHammerTool();
    this.unequipHarvestPickaxeTool();
    this.holster?.dispose();
    this.holster = null;
    this.orchestrator?.dispose();
    this.orchestrator = null;
    this.cancelZonePick();
    this.allyPick = null;
    this.spellTotems?.dispose();
    this.spellTotems = null;
    this.animations?.dispose();
    this.model.parent?.remove(this.model);
  }
}
