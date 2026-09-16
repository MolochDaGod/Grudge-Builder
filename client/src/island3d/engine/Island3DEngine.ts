/**
 * Island3DEngine — orchestrates the full 3D island scene.
 *
 * Creates the Three.js renderer, scene, camera, lighting, water plane,
 * terrain, resource nodes, decorations, and runs the game loop.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  generateIslandTerrainWithBridge,
  flattenCampPlateau,
  getTerrainHeightAt,
  getTerrainNormalAt,
  type IslandTerrainConfig,
  type IslandTerrainResult,
} from '../terrain/IslandTerrainGenerator';
import type { RtsHeightmapPayload } from '@shared/definitions/rtsTerrainBridge';
import { createTerrainMaterialAsync } from '../terrain/TerrainMaterial';
import {
  sculptTerrainFromRay,
  SHOVEL_BRUSH,
  type ShovelSculptMode,
} from '../terrain/ShovelTerrainSculptor';
import {
  getEquippedToolType,
  hasShovelEquipped,
  hasHoeEquipped,
  hasBucketEquipped,
  hasWaterBucket,
  shovelModeFromModifiers,
  type GroundToolId,
  type HarvestRadialToolId,
  DEFAULT_HARVEST_RADIAL_TOOL,
} from '@/game/harvest/HarvestToolActions';
import { FarmPlotSystem } from '../farming/FarmPlotSystem';
import { GroundToolBrush } from '../farming/GroundToolBrush';
import { preloadCropPack } from '../farming/CropPackLoader';
import {
  ITEM_EMPTY_BUCKET,
  ITEM_WATER_BUCKET,
  STARTER_SEED_STACKS,
  FARM_HARVEST_RANGE_M,
  tryAutoWaterCraft,
  getSeedById,
} from '@shared/definitions/farming';
import { placeResourceNodes, type PlacedNode3D } from '../terrain/NodePlacer';
import { createScatterDecorations } from '../objects/ScatterDecorations';
import { createHarvestableTree, type HarvestableTree } from '../objects/HarvestableTree';
import { createHarvestableRock, type HarvestableRock } from '../objects/HarvestableRock';
import {
  createCrystalCluster, createHempPlant, createFlowerPatch, createScrapPile, createDock,
  type HarvestableCrystal, type HarvestableHemp, type HarvestableFlower, type HarvestableScrap,
} from '../objects/HomeIslandNodes';
import { DetailLayer, createGrassBlades } from '../terrain/DetailLayers';
import { MultiplayerSync, type MultiplayerConfig } from '../sync/MultiplayerSync';
import { loadLobbyMap, getLobbyMap, type LobbyLoadResult } from './LobbyIslandLoader';
import {
  LOBBY_WATER_LEVEL,
  createLobbyCapturePoints,
  createLobbyShipSystem,
  getLobbySpawnPosition,
  type LobbyCaptureSystem,
  type LobbyShipSystem,
} from './LobbyGameplay';
import { applyLobbySurfaceLayers } from '../terrain/LobbySurfaceLayers';
import {
  buildLobbyCollider,
  buildWalkableColliderFromMeshes,
  meshTriangleCount,
  selectNearMeshes,
  type LobbyColliderResult,
} from '../physics/LobbyColliderSystem';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { RAPIER_FLEET } from '../physics/fleet';
import {
  PHYSICS_NEAR_SPAWN_M,
  RAPIER_TRIMESH_TRI_BUDGET,
  SPAWN_PAD_HALF,
  isPhysicsReadyForEntry,
  sceneLoadLabel,
  waitForGroundSample,
  yieldToBrowser,
  type SceneLoadStage,
} from '../physics/sceneLoadGate';
import { createLobbyPlayZone, type LobbyPlayZoneResult } from './LobbyPlayZone';
import {
  createFactionLobbyIslands,
  type FactionIslandRuntime,
} from '../lobby/FactionIslandGenerator';
import {
  fetchProductionGmap,
  applyGmapEntityOverlays,
  resolveHudFromGmap,
  type LoadedGmap,
} from '../lobby/loadProductionGmap';
import type { ProductionHudSchema } from '@shared/definitions/productionMapPackage';
import {
  createOceanMesh,
  updateOceanMaterial,
  bindOceanMaps,
  flattenTerrainBelowWater as flattenTerrainVertsBelowWater,
  removeDuplicateWaterMeshes,
} from '../terrain/WaterMaterial';
import {
  createPirateLobbyOcean,
  inferLobbyShoreDisks,
  updatePirateLobbyOcean,
  isPirateLobbyOcean,
} from '../terrain/PirateLobbyOcean';
import {
  OceanReflectionRig,
  createProceduralOceanTextures,
} from '../terrain/OceanReflectionRig';
import { UnderwaterPost } from '../terrain/UnderwaterPost';
import { BoatWakeSystem } from '../terrain/BoatWakeSystem';
import type { QualityPreset } from '../render/PostProcessing';
import { registerMeshPrefabs, sculptSandPrefab } from '../map/MeshPrefabRegistry';
import { PostProcessing, type QualityPreset } from '../render/PostProcessing';
import { DayNightCycle, type DayNightConfig } from '../environment/DayNightCycle';
import { getTideHeight, DAY_NIGHT_DEFAULTS } from '@shared/definitions/gameClock';
import { CharacterController3D, type CharacterController3DConfig, type PhysicsCallbacks } from '../player/CharacterController3D';
import {
  type CameraMode,
  orbitEnabledForMode,
  playCameraActive,
} from '../player/CameraMode';
import { TerrainNavMesh } from '../navigation/TerrainNavMesh';
import {
  loadWarlordsMapLandmarks,
  type LandmarkLoadResult,
} from '../map/WarlordsMapLandmarks';
import { HUMAN_HEIGHT_M } from '../zoneWorldScale';
import { AllyManager, type CombatTarget } from '../ai/AllyController';
import { BuildingSystem, type PieceType } from '../building/BuildingSystem';
import {
  SectionalDamageSystem,
  BuildHammerRepair,
  registerBuildingSections,
  registerWatercraftSections,
  createPinataDestroyHandler,
  type DamageSection,
} from '../damage';
import { getSectorById, type WorldSector } from '@shared/definitions/worldMapSectors';
import {
  generateZonePopulation, getNodesByCategory,
  type ZonePopulation, type IslandNode, type SpawnPointNode, type DockNode,
  type HarvestNode,
} from '@shared/definitions/zoneServerNodes';
import { buildZoneScene, type ZoneSceneResult } from './ZoneSceneBuilder';
import { CreatureManager, type CreatureLootEvent } from '../creatures/CreatureManager';
import {
  GroundLootSystem,
  type GroundLootItem,
  type GroundLootPile,
} from '../loot/GroundLootSystem';
import {
  createWebGLPlayRenderer,
  getRenderCapabilitiesSync,
  formatRenderCapsLine,
} from '@/lib/renderBackend';
import { NpcCampSystem, spawnZoneCamps } from '../camps/NpcCampSystem';
import { CampUnitSystem } from '../camps/CampUnitSystem';
import { CAMP_UPGRADES, type CampFaction } from '@shared/definitions/npcCamps';
import type { CampUnitOrderId } from '@shared/definitions/campUnits';
import {
  createEvilMountainTriad,
  EvilMountainTriadSystem,
} from '../objects/EvilMountainTriad';
import {
  createHiddenMountainCity,
  type HiddenMountainCityRuntime,
} from '../objects/HiddenMountainCity';
import {
  createSectorEventLandmarks,
  type SectorEventLandmarksRuntime,
} from '../objects/SectorEventLandmarks';
import { isHiddenMountainCitySector } from '@shared/definitions/hiddenMountainCity';
import {
  getSectorProductionContent,
  resolveSectorSeeds,
  type SectorProductionContent,
} from '@shared/definitions/sectorProductionContent';
import { preloadIslandResources } from '../objects/IslandResourceLoader';
import type { RtsNatureScatterPayload } from '@shared/definitions/rtsNatureScatter';
import { resolveHomeIslandFoundation } from '@shared/definitions/homeIslandFoundations';
import { placeProceduralHarvestZones } from '../harvest/HarvestZonePlacer';
import { buildHarvestZones, type HarvestZonesResult } from '../harvest/HarvestZoneBuilder';
import { spawnZoneHarvestNodes } from '../harvest/ZoneHarvestSpawner';
import { spawnRaceCapitalInZone, type ZoneCapitalResult } from '../zone/ZoneCapitalSpawner';
import { spawnZoneDungeonPortals, type ZoneDungeonPortalsResult } from '../zone/ZoneDungeonPortals';
import { CaveInteriorSystem } from '../dungeon/CaveInteriorSystem';
import {
  loadHavenShoreFoundation,
  type HavenFoundationResult,
} from '../zone/HavenShoreFoundationLoader';
import {
  loadFabledZoneFoundation,
  type FabledFoundationResult,
} from '../zone/FabledZoneFoundationLoader';
import { EtherealDestructionSystem } from '../zone/EtherealDestructionSystem';
import { EtherealFloatingIslandSystem } from '../zone/EtherealFloatingIslandSystem';
import { EventIslandSystem } from '../zone/EventIslandSystem';
import { BossRoomInstanceSystem } from '../zone/BossRoomInstanceSystem';
import { VolcanicClimbIslandSystem } from '../zone/VolcanicClimbIslandSystem';
import { resolveZoneInteract } from '../zone/zoneInteract';
import { placeIcelandScene, type IcelandPlaceResult } from '../zone/IcelandScenePlacer';
import { resolvePlatformerJumpForSector } from '../physics/PlatformerJump';
import { ETHEREAL_FALLS_SECTOR_ID } from '@shared/definitions/etherealDestructionZone';
import {
  isHothEligibleSector,
  isIcelandSector,
  isSpiralEventSector,
  isBossInstanceSector,
  pickBossRoomInstance,
} from '@shared/definitions/floatingIslandBossAssets';
import {
  isVolcanicClimbSector,
  layoutVolcanicClimbFloor,
  volcanicClimbOrigin,
  volcanicClimbSpawnY,
} from '@shared/definitions/volcanicClimb';
import {
  isHavenShoreSector,
  HAVEN_SHORE_FOUNDATION,
  havenHarvestToZoneNodes,
} from '@shared/definitions/havenShoreFoundation';
import {
  isFabledZoneSector,
  FABLED_ZONE_FOUNDATION,
  fabledZoneScaleForSector,
} from '@shared/definitions/fabledZoneFoundation';
import { getRaceCityBySector, getRaceCityById } from '@shared/definitions/raceCities';
import {
  HARVEST_RESPAWN_MS,
  beginTreeFall,
  updateTreeFall,
  swapTreeToStump,
  spawnResourceDrops,
  updateHarvestDrops,
  resetHarvestableTree,
  resetHarvestableRock,
  resetHarvestableCrystal,
  resetSimpleHarvestNode,
  markDepleted,
  type HarvestDrop,
  type HarvestDropKind,
} from '../harvest/HarvestFeedback';
import { tickGrowth, isHarvestable } from '../harvest/RegenerativeHarvest';
import { PinataHarvestBreakSystem } from '../harvest/PinataHarvestBreak';
import { FirewoodChopSystem } from '../harvest/FirewoodChopSystem';
import type { HarvestNodeClass } from '../harvest/HarvestNodeRecognition';
import { resolveBossHitResponse } from '../combat/HitResponseSystem';
import type { LargeBossHitEvent } from '../combat/LargeBossFightSystem';
import { PveBossInstanceSystem } from '../systems/PveBossInstanceSystem';
import {
  generateMountainTriadSeed,
  HOME_ISLAND_WORLD_SIZE_M,
  type MountainTriadSeed,
} from '@shared/definitions/homeIslandSeed';
import {
  campPercentToWorld,
  HOME_ISLAND_ANIMAL_TARGET,
  HOME_ISLAND_BUILDABLE_MAX_HEIGHT_M,
  HOME_ISLAND_BUILDABLE_MAX_SLOPE_RAD,
  HOME_ISLAND_BUILDABLE_MIN_HEIGHT_M,
  HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
  HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M,
  HOME_ISLAND_DEFAULT_CAMP_PERCENT,
  HOME_ISLAND_HARVEST_ZONE_COUNT,
  HOME_ISLAND_HARVEST_ZONE_SPACING_M,
  HOME_ISLAND_NAVMESH_CELL_M,
  HOME_ISLAND_OCEAN_SEGMENTS,
  HOME_ISLAND_OCEAN_SIZE_M,
  HOME_ISLAND_SEAFLOOR_DEPTH_M,
  HOME_ISLAND_TERRAIN_SEGMENTS,
  HOME_ISLAND_BOARD_CELL_M,
  HOME_ISLAND_DISABLE_OCEAN,
} from '@shared/definitions/homeIslandQuality';
import {
  createBoardGrid3D,
  boardSpawnPosition,
  BOARD_CELL_M,
  type BoardCell,
} from '../terrain/BoardGrid3D';
import { scatterBattleNatureOnTerrain } from '../objects/BattleNatureScatter';
import { MineEntranceSystem } from '../objects/MineEntranceSystem';
import type { MineLootItem } from '@shared/definitions/homeIslandMines';

export type Island3DMode = 'procedural' | 'lobby' | 'zone';
export type { SceneLoadStage };

/**
 * Free-surface Y for procedural home-island ocean.
 * waterLevel ≡ oceanSurfaceY ≡ open water / sea (namingSsot).
 */
export const PROCEDURAL_WATER_LEVEL = -2;
/** Preferred alias of PROCEDURAL_WATER_LEVEL */
export const PROCEDURAL_OCEAN_SURFACE_Y = PROCEDURAL_WATER_LEVEL;

export interface Island3DEngineConfig {
  seed: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Optional multiplayer config — omit for offline / solo play */
  multiplayer?: MultiplayerConfig;
  /** 'procedural' = seed-based terrain (default), 'lobby' = pre-built GLTF map, 'zone' = full sector */
  mode?: Island3DMode;
  /** Lobby map ID (e.g. 'pirate-islands'). Only used when mode='lobby'. */
  lobbyMapId?: string;
  /**
   * Production island id for map composition / gmap (e.g. grudge-open-world).
   * Used when mode='lobby' with chicken-gun pirate map.
   */
  lobbyIslandId?: string;
  /** Sector ID from WORLD_SECTORS. Only used when mode='zone'. */
  sectorId?: string;
  /** World seed shared across all zone instances for determinism. */
  worldSeed?: string;
  /** Progress callback for lobby / zone / procedural loading (0-100) */
  onLoadProgress?: (pct: number) => void;
  /** Staged load-gate labels (rest → terrain → physics → player) */
  onLoadStage?: (stage: SceneLoadStage, label: string) => void;
  /** Post-processing quality (default 'medium') */
  quality?: QualityPreset;
  /** Day/night cycle config (omit to disable) */
  dayNight?: Partial<DayNightConfig>;
  /** Enable the playable character controller (default true for procedural) */
  enableCharacter?: boolean;
  /** Place tower / fortress / jungle rock landmarks (SI prop scale). Default true. */
  enableLandmarks?: boolean;
  /** Physics callbacks from the character controller */
  physicsCallbacks?: PhysicsCallbacks;
  /** Fired when player enters a home-island mountain dungeon portal */
  onDungeonEnter?: (dungeonId: string, dungeonName: string) => void;
  /** Persisted mountain triad seed from Railway (Sketchfab 3-peak dungeon layout) */
  mountainTriad?: import('@shared/definitions/homeIslandSeed').MountainTriadSeed;
  /** RTS-Grudge export heightmap — shapes center of 1024m terrain when present */
  rtsHeightmap?: RtsHeightmapPayload;
  /**
   * @deprecated Home island foliage is battle NatureDecor only (scatterBattleNatureOnTerrain).
   * Kept for save/API compat; ignored during initProcedural.
   */
  rtsNatureScatter?: RtsNatureScatterPayload;
  /** Island biome label — resolves Driftwood Bay vs Ironfang Spire */
  biome?: string;
  /** Camp hub on 2D percent coords (north = low y) — flattens build plateau in 3D */
  campPositionPercent?: { x: number; y: number };
  /** Regrowing forest grove + quarry + beach anchors from island state */
  regrowRegions?: import('@shared/definitions/homeIslandSpec').HomeIslandRegrowRegion[];
  /** Fired when a harvestable node is depleted (tree felled, rock mined) */
  onHarvest?: (event: {
    nodeId?: string;
    resourceType: string;
    position: THREE.Vector3;
  }) => void;
  /**
   * Fired when local combat deals damage to a creature (soft-lock / nearest).
   * Multiplayer: play.tsx → sendPveAttack + anim/fx (SectorRoom already handles).
   */
  onCombatHit?: (event: {
    creatureId: string;
    damage: number;
    position: THREE.Vector3;
  }) => void;
  /** Account + captain for dock ship roster */
  accountId?: string;
  captainId?: string | null;
  /** Player race for claim-flag unarmed garrison spawns */
  raceId?: string;
  /** Mine run loot bag (miner / engineer / mystic harvest) */
  onMineLoot?: (items: MineLootItem[], mineId: string) => void;
  /**
   * Home island: omit Gerstner ocean plane (default true — board play surface).
   * Lobby / zone still use water where appropriate.
   */
  disableOcean?: boolean;
  /** Draw board XY grid + cell labels (default true for procedural home island) */
  showBoardGrid?: boolean;
}

/** Taberna inn staff talk payload — IslandPlayOverlay + playNPCGreeting. */
export interface InnTalkNpc {
  id: string;
  name: string;
  role: string;
  greeting: string;
  dialogueSetId?: string;
  travel?: boolean;
  race?: string;
}

export class Island3DEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  /**
   * Sole camera ownership (WebGL Insights Ch.23).
   * play_tps → CharacterController3D.thirdPersonCam only.
   * orbit_edit / map → OrbitControls only.
   * cinematic → external (wake/flyby); neither TPC nor Orbit write.
   */
  private cameraMode: CameraMode = 'orbit_edit';
  private cameraModeBeforeCinematic: CameraMode | null = null;
  /**
   * Frame timing — THREE.Timer (r183+) replaces deprecated Clock.
   * Call update(timestamp) once per RAF before getDelta/getElapsed.
   */
  private timer: THREE.Timer;
  private animationFrameId: number | null = null;
  private isRunning = false;
  /** External update callbacks — added via onUpdate(), called each frame */
  private externalUpdates: Array<(dt: number) => void> = [];

  // Terrain
  public terrain: IslandTerrainResult | null = null;
  private waterPlane: THREE.Mesh | null = null;
  /** Dual-pass reflect/refract RTs for ocean (Captain-style polish) */
  private oceanReflectionRig: OceanReflectionRig | null = null;
  /** Camera-below-water fog + tint */
  private underwaterPost: UnderwaterPost | null = null;
  private oceanProcTextures: ReturnType<typeof createProceduralOceanTextures> = null;
  private _oceanRes = new THREE.Vector2(1920, 1080);
  /** off = Gerstner only · low = no dual-pass · high = full polish */
  private oceanQuality: 'off' | 'low' | 'high' = 'high';
  private boatWake: BoatWakeSystem | null = null;
  private _shipPrevPos = new THREE.Vector3();
  private _shipHasPrev = false;

  // Interactable objects
  public trees: HarvestableTree[] = [];
  public rocks: HarvestableRock[] = [];
  public crystals: HarvestableCrystal[] = [];
  public hemps: HarvestableHemp[] = [];
  public flowers: HarvestableFlower[] = [];
  public scraps: HarvestableScrap[] = [];
  public placedNodes: PlacedNode3D[] = [];

  // Detail layers (grass/sand overlay)
  private grassLayer: DetailLayer | null = null;
  private sandLayer: DetailLayer | null = null;
  private grassBlades: { mesh: THREE.InstancedMesh; update: (time: number, cameraPos: THREE.Vector3) => void } | null = null;

  // Multiplayer
  public multiplayer: MultiplayerSync | null = null;

  // Post-processing
  private postProcessing: PostProcessing | null = null;

  // Day/night cycle
  public dayNight: DayNightCycle | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Lobby map
  private lobbyResult: LobbyLoadResult | null = null;
  private lobbyAnimMixer: THREE.AnimationMixer | null = null;
  public lobbyCapture: LobbyCaptureSystem | null = null;
  public lobbyShip: LobbyShipSystem | null = null;

  /** Bounds for LobbyMiniMap / island SSOT world projection */
  /** Nearest Taberna inn staff within 3.2 m (same E range as voxel vendors). */
  pickInnStaffTalk(playerPos: THREE.Vector3): InnTalkNpc | null {
    const ids = new Set([
      'innkeeper',
      'apothecary',
      'smith',
      'inn_trader',
      'stationmaster',
    ]);
    let best: { d: number; o: THREE.Object3D } | null = null;
    const wp = new THREE.Vector3();
    this.scene.traverse((o) => {
      const id = String(o.userData?.npcId ?? '');
      if (!ids.has(id)) return;
      o.getWorldPosition(wp);
      const d = Math.hypot(playerPos.x - wp.x, playerPos.z - wp.z);
      if (d > 3.2) return;
      if (!best || d < best.d) best = { d, o };
    });
    if (!best) return null;
    const u = best.o.userData;
    return {
      id: String(u.npcId),
      name: String(u.npcName ?? u.npcId),
      role: String(u.vendorId ?? u.npcId),
      greeting: String(u.greeting ?? 'Well met, traveler.'),
      dialogueSetId: u.dialogueSetId,
      travel: !!u.travel,
      race: u.race,
    };
  }

  public getLobbyMapBounds(): { center: THREE.Vector3; size: THREE.Vector3 } | null {
    if (!this.lobbyResult) return null;
    return { center: this.lobbyResult.center, size: this.lobbyResult.size };
  }

  public getLobbyScene(): THREE.Group | null {
    return this.lobbyResult?.scene ?? null;
  }

  /** Sample walkable height on lobby map (pirate-islands colliders). */
  public sampleLobbyGroundHeight(x: number, z: number): number | null {
    if (!this.lobbyCollider?.sampleHeight) return null;
    const y = this.lobbyCollider.sampleHeight(x, z);
    return typeof y === 'number' && Number.isFinite(y) ? y : null;
  }

  /**
   * Hot-reload published production .gmap → entity overlays + HUD schema.
   * Safe to call after lobby load or when publish API updates package.
   */
  public async reloadProductionGmap(): Promise<LoadedGmap | null> {
    if (this.gmapOverlayRoot) {
      this.scene.remove(this.gmapOverlayRoot);
      this.gmapOverlayRoot.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat?.dispose?.());
        }
      });
      this.gmapOverlayRoot = null;
    }

    const gmap = await fetchProductionGmap();
    this.productionGmap = gmap;
    this.productionHud = resolveHudFromGmap(gmap);

    if (gmap && this.lobbyResult) {
      this.gmapOverlayRoot = applyGmapEntityOverlays(
        this.scene,
        gmap,
        { x: this.lobbyResult.center.x, z: this.lobbyResult.center.z },
        { x: this.lobbyResult.size.x, z: this.lobbyResult.size.z },
      );
    }

    // Notify UI layers (React can subscribe)
    try {
      window.dispatchEvent(
        new CustomEvent('grudge:production-gmap', {
          detail: { gmap, hud: this.productionHud },
        }),
      );
    } catch {
      /* non-browser */
    }

    return gmap;
  }
  /** Set when player presses E at south dock — UI shows ShipDockPanel */
  public dockInteractPending = false;
  /** E on Taberna inn staff — React overlay talks (existing dialogue + npc chat). */
  public onInnTalk: ((npc: InnTalkNpc) => void) | null = null;
  /** E while a play UI (inn talk) is open — overlay closes and returns true. */
  public onClosePlayUi: (() => boolean) | null = null;
  public lobbyPlayZone: LobbyPlayZoneResult | null = null;
  /** 6 race faction islands on pirate open-world borders */
  public factionIslands: FactionIslandRuntime | null = null;
  /** Hot-loaded production .gmap (publish API / static) */
  public productionGmap: LoadedGmap | null = null;
  /** HUD layout from gmap (panels + flags) */
  public productionHud: ProductionHudSchema | null = null;
  private gmapOverlayRoot: THREE.Group | null = null;
  private lobbyCollider: LobbyColliderResult | null = null;
  private lobbyCapturing = false;
  /**
   * Rapier world — fleet PhysicsWorld. Armed before player spawn.
   * Walkable BVH is `walkCollider` / `lobbyCollider`.
   */
  public physics: PhysicsWorld | null = null;
  /** True only after terrain walkable + valid ground sample at spawn. */
  public physicsReady = false;
  /** Zone / procedural BVH walk layer (lobby reuses lobbyCollider). */
  private walkCollider: LobbyColliderResult | null = null;
  /** Zone sampler restored when leaving a boss instance. */
  private zoneGroundSampler: ((x: number, z: number) => number | null) | null = null;

  // Zone mode
  public zoneScene: ZoneSceneResult | null = null;
  public zonePopulation: ZonePopulation | null = null;
  public zoneSector: WorldSector | null = null;
  /** Race capital (Unity world map city) placed in this sector */
  public zoneCapital: ZoneCapitalResult | null = null;
  /** Haven Shore Fruzer foundation (PVE trade village) — only for haven_shore */
  public havenFoundation: HavenFoundationResult | null = null;
  /** Fabled core (fabledzone.glb) + cave portals → dwarf castle / interiors */
  public fabledFoundation: FabledFoundationResult | null = null;
  /** Dungeon entrance portals from zone population */
  public zoneDungeonPortals: ZoneDungeonPortalsResult | null = null;
  /** Cave interiors — access points, navmesh, water-suppressed layers */
  public caveInteriors: CaveInteriorSystem | null = null;
  /**
   * Thornwood Wilds (top-right / NE): mountainshiddencity.glb + island boss.
   * Defeat the Warden to unseal the door into the city under the mountain.
   */
  public hiddenMountainCity: HiddenMountainCityRuntime | null = null;
  /** Production sector landmarks (event falls, biome kits, etc.) */
  public sectorEventLandmarks: SectorEventLandmarksRuntime | null = null;
  /**
   * Ethereal Falls only — NW diagonal destruction half:
   * ship no-return, void death drops, ally perma-death, broken surface physics
   * (flight exempt).
   */
  public etherealDestruction: EtherealDestructionSystem | null = null;
  /** Lyoko stacked floating islands (2 variants: scale/color/texture). */
  public etherealFloatIslands: EtherealFloatingIslandSystem | null = null;
  /** Spiral mountain event islands — sink/raise + NPC/boss rotation. */
  public eventIslands: EventIslandSystem | null = null;
  /** Hoth (frozen) boss room instance from event/mountain/dungeon portals. */
  public bossRooms: BossRoomInstanceSystem | null = null;
  /** Open-zone boss_arena PvE fights (PIP-style large bosses) */
  public arenaBosses: import('../combat/LargeBossFightSystem').LargeBossFightSystem[] = [];
  /**
   * Home-island evil mountain doorway + Warlords under-mountain / dungeon PvE
   * boss chambers (PIP-style colossus).
   */
  public pveBossInstance: PveBossInstanceSystem | null = null;
  /** Iceland cinematic plate in frozen / near-frozen sectors. */
  public icelandScene: IcelandPlaceResult | null = null;
  /**
   * Ember Spire infinite climb — volcanic platforms + summit chests
   * (random-boxes style jumper on fleet assets).
   */
  public volcanicClimb: VolcanicClimbIslandSystem | null = null;
  private _bossPortalKey: ((e: KeyboardEvent) => void) | null = null;
  /** Full per-sector production package (textures, seeds, monsters, harvest…) */
  public sectorProduction: SectorProductionContent | null = null;
  /** Fire / smoke / teleport / dash-foot particle bus (threejs-games style) */
  public worldFx: import('../vfx/WorldFxBus').WorldFxBus | null = null;

  // Player character
  public character: CharacterController3D | null = null;
  private characterActive = false;

  // Navigation + AI
  public navMesh: TerrainNavMesh | null = null;
  public allyManager: AllyManager | null = null;
  private _savedGravity: number | null = null;
  private lavaParty: import('../combat/LavaCaesarPartyBrain').LavaCaesarPartyBrain | null = null;
  /** Towers / fortress / jungle rocks — SI scale + AABB colliders */
  public mapLandmarks: LandmarkLoadResult | null = null;

  // Building
  public building: BuildingSystem | null = null;

  /**
   * Progressive hide-chunk damage for boats / buildings / vehicles / enemies.
   * Damaged sections are hidden; repair with build hammer + 1 wood (RMB then LMB).
   */
  public sectionalDamage: SectionalDamageSystem | null = null;
  /** Toolkit repair controller (RMB select damaged chunk, LMB spend wood + restore). */
  public hammerRepair: BuildHammerRepair | null = null;
  /**
   * Optional boat / ship cargo hold for repair wood.
   * Hosts (dock / boarding) may merge ship storage here.
   */
  public boatCargo: Record<string, number> = {};
  /** Last sectional repair / select prompt for HUD */
  public lastRepairPrompt: string | null = null;

  // Wildlife
  public creatures: CreatureManager | null = null;

  /**
   * World ground loot piles — icon sprites (slow rotate) pickable with E.
   * Creature skin / chest / craft reward drops land here.
   */
  public groundLoot: GroundLootSystem | null = null;

  // Faction NPC camps (stylized camp GLB + upgrades)
  public npcCamps: NpcCampSystem | null = null;
  /** Claim-flag garrison + F1–F5 orders + bench professions */
  public campUnits: CampUnitSystem | null = null;
  /** Player faction for camp ally/enemy resolution */
  public playerFaction: CampFaction | string = 'crusade';

  // Mountain dungeon triad (procedural home island)
  public mountainTriad: EvilMountainTriadSystem | null = null;
  public harvestZones: HarvestZonesResult | null = null;
  /** Board XY labels / lines for hero placement */
  public boardGrid: THREE.Group | null = null;
  /** 4 canopy layers around forest zones (not a second full scatter) */
  public treeCanopyLayers: THREE.Group | null = null;
  /** Last board cell the hero snapped to */
  public spawnBoardCell: BoardCell | null = null;
  /** Craftpix mines (≥2) + optional event mountain */
  public mineSystem: MineEntranceSystem | null = null;

  // Raycaster for mouse picking
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  /**
   * Harvest HUD ground tool: shovel | hoe | seed | bucket.
   * When null, equipment MainHand is used for shovel/hoe/bucket.
   */
  public harvestToolOverride: GroundToolId = null;
  /**
   * R-radial harvest tool (hatchet / pick / knife / fishing / build hammer).
   * Last selection is restored when re-entering harvest (default hatchet).
   */
  public activeHarvestTool: HarvestRadialToolId = DEFAULT_HARVEST_RADIAL_TOOL;
  public lastHarvestTool: HarvestRadialToolId = DEFAULT_HARVEST_RADIAL_TOOL;
  /** True when build hammer is selected — build UI open under harvest shell. */
  public harvestBuildUiOpen = false;
  /** Selected seed item id for planting (from action slots / inventory). */
  public selectedSeedId: string | null = null;
  /** Empty vs full water bucket (Valheim pail). */
  public bucketHasWater = false;
  /** Water charges for auto-craft (each fill adds charges; each water use spends 1). */
  public waterCharges = 0;
  /** Local farm inventory overlay (seeds + harvest) — merged with HUD resources. */
  public farmInventory: Record<string, number> = { ...STARTER_SEED_STACKS, [ITEM_EMPTY_BUCKET]: 1 };
  /** Last shovel stroke feedback for HUD */
  public lastShovelStroke: { mode: ShovelSculptMode; ok: boolean; at: number } | null = null;
  private shovelCooldownUntil = 0;
  private groundToolCooldownUntil = 0;

  /** Square 4×4 garden beds (hoe / seed / water / RMB harvest) */
  public farmPlots: FarmPlotSystem | null = null;
  /** Ground-tool brush preview (square plot / shovel circle) */
  public groundBrush: GroundToolBrush | null = null;
  /** Optional external bag merge (page resources) */
  private externalResourceGetter: (() => Record<string, number>) | null = null;
  private externalResourceSetter: ((bag: Record<string, number>) => void) | null = null;

  // Harvest FX — log/debris drops + tree fall animations
  private harvestDrops: HarvestDrop[] = [];
  private treeFallCompleting = new Set<HarvestableTree>();
  /** three-pinata fracture for rock/ore/tree chips */
  public pinataHarvest: PinataHarvestBreakSystem | null = null;
  /**
   * Firewood-style axe: base angle notch → directional fall → ground split → collect.
   * Reference: https://screen.toys/firewood/
   */
  public firewoodChop: FirewoodChopSystem | null = null;
  public dockRaftLab: import('../zone/DockRaftLabSystem').DockRaftLabSystem | null = null;

  constructor(private config: Island3DEngineConfig) {
    // Renderer — WebGL2 when available (THREE.WebGLRenderer), high-perf GPU,
    // sRGB + ACES. Capabilities: client/src/lib/renderBackend.ts
    // Optional WebGPU: ?webgpu=1 via createPlayRenderer (async paths later).
    this.renderer = createWebGLPlayRenderer({
      canvas: config.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      maxPixelRatio: 1.5,
    });
    this.renderer.setSize(config.width, config.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    try {
      const caps = getRenderCapabilitiesSync();
      console.info("[Island3D] render backend:", formatRenderCapsLine(caps), caps);
      (this.renderer.domElement as HTMLCanvasElement).dataset.renderApi = caps.webgl2
        ? "webgl2"
        : caps.webgl
          ? "webgl"
          : "none";
    } catch {
      /* ok */
    }
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      (ev) => {
        ev.preventDefault();
        console.warn("[Island3D] WebGL context lost");
      },
      false,
    );

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);

    // Camera — over-the-shoulder; far plane covers 1024m island + deep ocean horizon
    this.camera = new THREE.PerspectiveCamera(60, config.width / config.height, 0.4, 4000);
    this.camera.position.set(0, 120, 200);

    // Controls (orbit for now — will switch to character controller later)
    this.controls = new OrbitControls(this.camera, config.canvas);
    this.controls.target.set(0, 10, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 900;
    this.controls.update();

    this.timer = new THREE.Timer();
    this.timer.connect(document);

    this.setupLighting();

    // Fire/smoke + supernova + CastingMaster (Linear skillshots + Casting VFX)
    void Promise.all([
      import('../vfx/WorldFxBus'),
      import('../vfx/SpellFxSystem'),
    ]).then(([{ WorldFxBus, setWorldFxBus }, { SpellFxSystem }]) => {
      this.worldFx = new WorldFxBus(this.scene);
      this.worldFx.supernova.setCamera(this.camera);
      const spellFx = new SpellFxSystem({ parent: this.scene });
      (this as any)._spellFx = spellFx;
      this.worldFx.attachCastingMaster({
        spellFx,
        getHeight: (x, z) => {
          // Prefer live terrain height when island generator is present
          const fn = (this as any).getTerrainHeightAt as
            | ((x: number, z: number) => number)
            | undefined;
          return fn ? fn(x, z) : 0;
        },
      });
      setWorldFxBus(this.worldFx);
      this.character?.setWorldFxBus?.(this.worldFx);
    });

    // Post-processing — default to 'low' for performance
    this.postProcessing = new PostProcessing(
      this.renderer, this.scene, this.camera,
      { quality: config.quality || 'low' },
    );
  }

  private setupLighting(): void {
    // Hemisphere light — sky + ground ambient
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.6);
    this.scene.add(this.hemiLight);

    // Directional sun — SI-ish intensity; tight shadow frustum for FPS
    // (prefer follow-player update in tick over world-scale 2048 maps).
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sunLight.position.set(150, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.04;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 400;
    this.scene.add(this.sunLight.target);
    this.scene.add(this.sunLight);

    // Subtle fill light from opposite side
    const fill = new THREE.DirectionalLight(0x8ec8e8, 0.3);
    fill.position.set(-100, 80, -100);
    this.scene.add(fill);

    // Day/night cycle (if configured)
    if (this.config.dayNight !== undefined && this.sunLight && this.hemiLight) {
      this.dayNight = new DayNightCycle(
        this.scene, this.sunLight, this.hemiLight, this.config.dayNight,
      );
    }
  }

  /** Generate terrain, water, nodes, decorations — or load a lobby/zone map */
  async init(): Promise<void> {
    this.reportLoad('rest', 4);
    await yieldToBrowser();

    // Rapier WASM in parallel with meshopt — must finish before player spawn
    const rapierWarm = PhysicsWorld.create({ gravity: RAPIER_FLEET.gravityY })
      .then((world) => {
        this.physics = world;
      })
      .catch((err) => {
        console.warn('[Island3D] Rapier WASM init failed — BVH walk layer only', err);
      });

    try {
      const { ensureSharedGltfReady } = await import('@/lib/three/SharedGltfPipeline');
      await ensureSharedGltfReady();
    } catch (e) {
      console.warn('[Island3D] SharedGltf ready failed — meshopt GLBs may error', e);
    }

    this.reportLoad('assets', 10);
    await yieldToBrowser();
    await rapierWarm;

    let mode = this.config.mode || 'procedural';

    // Production open-world: mode=zone&sector=lobby → pirate lobby systems
    // (sector "lobby" is not a WorldSector mesh — it is the open-world hub)
    const sector = (this.config.sectorId || '').toLowerCase();
    if (
      mode === 'zone' &&
      (sector === 'lobby' ||
        sector === 'pirate' ||
        sector === 'pirate-islands' ||
        sector === 'open-world' ||
        sector === 'grudge-open-world')
    ) {
      mode = 'lobby';
      if (!this.config.lobbyMapId) this.config.lobbyMapId = 'pirate-islands';
    }

    if (mode === 'lobby') {
      await this.initLobby();
    } else if (mode === 'zone') {
      await this.initZone();
    } else {
      await this.initProcedural();
    }

    if (this.config.enableCharacter !== false && !this.physicsReady) {
      throw new Error(
        '[Island3D] Physics layer not ready — refusing player entry (no walkable ground)',
      );
    }

    // Multiplayer (if configured) — works with both modes
    if (this.config.multiplayer) {
      this.multiplayer = new MultiplayerSync(this.config.multiplayer, this.scene);
      this.multiplayer.connect();
    }
  }

  private reportLoad(stage: SceneLoadStage, progress: number, extra?: string): void {
    const label = sceneLoadLabel(stage, extra);
    this.config.onLoadProgress?.(progress);
    this.config.onLoadStage?.(stage, label);
  }

  /**
   * Arm BVH walkable + Rapier terrain/pad, then wait for a dry ground sample.
   * All Warlords modes call this before constructing CharacterController3D.
   */
  private async armPhysicsLayer(opts: {
    meshes: THREE.Mesh[];
    spawn: THREE.Vector3;
    waterLevel: number;
    existingSampler?: (x: number, z: number) => number | null;
    label: string;
  }): Promise<(x: number, z: number) => number | null> {
    this.reportLoad('physics', 84, opts.label);
    await yieldToBrowser();

    if (!this.physics) {
      try {
        this.physics = await PhysicsWorld.create({ gravity: RAPIER_FLEET.gravityY });
      } catch (err) {
        console.warn('[Island3D] Rapier create failed', err);
      }
    }

    const near = selectNearMeshes(opts.meshes, opts.spawn, PHYSICS_NEAR_SPAWN_M);
    const forCollider = near.length ? near : opts.meshes;

    if (!opts.existingSampler && forCollider.length > 0) {
      try {
        this.walkCollider?.dispose();
        if (this.walkCollider?.colliderMesh.parent) {
          this.scene.remove(this.walkCollider.colliderMesh);
        }
        this.walkCollider = buildWalkableColliderFromMeshes(
          forCollider,
          `${opts.label}-walk-collider`,
        );
        this.scene.add(this.walkCollider.colliderMesh);
      } catch (err) {
        console.warn('[Island3D] BVH walk collider failed', err);
      }
    }

    await yieldToBrowser();

    const sampler = (x: number, z: number): number | null => {
      const fromExisting = opts.existingSampler?.(x, z);
      if (fromExisting !== null && fromExisting !== undefined && Number.isFinite(fromExisting)) {
        if (fromExisting > opts.waterLevel + 0.4) return fromExisting;
      }
      const fromBvh = this.walkCollider?.sampleHeight(x, z) ?? null;
      if (fromBvh !== null) return fromBvh;
      if (this.physics) return this.physics.groundCheck(x, z, 800);
      return null;
    };

    let groundY = await waitForGroundSample({
      sample: sampler,
      x: opts.spawn.x,
      z: opts.spawn.z,
      waterLevel: opts.waterLevel,
    });

    if (this.physics) {
      if (groundY !== null) {
        try {
          this.physics.addSpawnPad(
            new THREE.Vector3(opts.spawn.x, groundY, opts.spawn.z),
            SPAWN_PAD_HALF,
          );
        } catch (err) {
          console.warn('[Island3D] spawn pad failed', err);
        }
      }
      for (const mesh of forCollider) {
        const tris = meshTriangleCount(mesh);
        if (tris <= 0 || tris > RAPIER_TRIMESH_TRI_BUDGET) continue;
        try {
          mesh.updateMatrixWorld(true);
          this.physics.addTerrainCollider(mesh);
        } catch (err) {
          console.warn('[Island3D] terrain trimesh skipped', mesh.name, err);
        }
      }
      this.physics.update(1 / 60);
    }

    if (groundY === null) {
      groundY = await waitForGroundSample({
        sample: sampler,
        x: opts.spawn.x,
        z: opts.spawn.z,
        waterLevel: opts.waterLevel,
        attempts: 4,
      });
    }
    if (groundY === null) {
      const box = new THREE.Box3();
      const center = new THREE.Vector3();
      for (const mesh of forCollider) {
        try {
          box.setFromObject(mesh);
          box.getCenter(center);
        } catch {
          continue;
        }
        groundY = await waitForGroundSample({
          sample: sampler,
          x: center.x,
          z: center.z,
          waterLevel: opts.waterLevel,
          attempts: 2,
          offsetsM: [0, 8],
        });
        if (groundY !== null) {
          opts.spawn.x = center.x;
          opts.spawn.z = center.z;
          break;
        }
      }
    }

    this.physicsReady = isPhysicsReadyForEntry({
      rapierWorld: !!this.physics,
      walkableReady: !!(this.walkCollider || opts.existingSampler || this.lobbyCollider),
      groundY,
      walkableCount: forCollider.length,
      waterLevel: opts.waterLevel,
    });

    if (groundY !== null) {
      opts.spawn.y = groundY;
    }

    console.log(
      `[Island3D] Physics layer ${this.physicsReady ? 'ready' : 'BLOCKED'} ` +
        `rapier=${!!this.physics} walk=${forCollider.length} ` +
        `groundY=${groundY ?? 'null'} spawn=(${opts.spawn.x.toFixed(1)},${opts.spawn.z.toFixed(1)})`,
    );

    if (!this.physicsReady) {
      throw new Error(
        `[Island3D] No walkable ground at spawn in ${opts.label} — holding loadscreen`,
      );
    }

    this.reportLoad('player', 94);
    return sampler;
  }

  /** Island + foundation + climb/float decks — never ocean, sprites, or markers. */
  private collectZoneWalkableMeshes(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    const seen = new Set<THREE.Mesh>();
    const pushMesh = (m: THREE.Object3D | null | undefined) => {
      const mesh = m as THREE.Mesh | null;
      if (!mesh?.isMesh || !mesh.geometry || seen.has(mesh)) return;
      const n = (mesh.name || '').toLowerCase();
      if (n.includes('water') || n.includes('ocean') || n.includes('marker')) return;
      seen.add(mesh);
      out.push(mesh);
    };
    const walkRoot = (root: THREE.Object3D | null | undefined) => {
      if (!root) return;
      try {
        root.updateMatrixWorld(true);
      } catch {
        /* incomplete */
      }
      root.traverse((o) => {
        if ((o as THREE.Sprite).isSprite) return;
        pushMesh(o);
      });
    };
    if (this.zoneScene) {
      for (const mesh of this.zoneScene.islandMeshes.values()) pushMesh(mesh);
    }
    if (this.havenFoundation?.groundMeshes) {
      for (const g of this.havenFoundation.groundMeshes) pushMesh(g);
    }
    // Climb / floating decks are the walk surface — do not merge whole village GLBs
    walkRoot(this.volcanicClimb?.root);
    walkRoot(this.etherealFloatIslands?.root);
    return out;
  }

  /** Load a pre-built GLTF lobby map + open-world gameplay layer */
  private async initLobby(): Promise<void> {
    await preloadIslandResources().catch(() => undefined);
    const mapDef = getLobbyMap(this.config.lobbyMapId);

    this.lobbyResult = await loadLobbyMap(mapDef, (pct) => {
      this.config.onLoadProgress?.(Math.round(pct * 0.35));
    });
    this.scene.add(this.lobbyResult.scene);

    const surface = await applyLobbySurfaceLayers(this.lobbyResult, (pct) => {
      this.config.onLoadProgress?.(35 + Math.round(pct * 0.25));
    });
    this.lobbyCollider = buildLobbyCollider(this.lobbyResult, surface.walkableMeshes);
    this.scene.add(this.lobbyCollider.colliderMesh);
    const sampleGround = this.lobbyCollider.sampleHeight;

    const maxDim = Math.max(
      this.lobbyResult.size.x,
      this.lobbyResult.size.y,
      this.lobbyResult.size.z,
    );

    // Every mesh = prefab (houses, rocks, docks, sand…); sand marked sculptable
    const prefabReg = registerMeshPrefabs(
      this.lobbyResult.scene,
      this.config.lobbyIslandId || 'grudge-open-world',
    );

    // Map composition overlays (tents, chests, modular dock, nature samples)
    try {
      if (mapDef.id === 'shipwreck-island') {
        console.log('[Island3D] Baked shipwreck island — skip pirate composition overlay');
      } else {
      const { loadMapComposition } = await import('../map/MapCompositionLoader');
      const comp = await loadMapComposition(
        this.scene,
        this.config.lobbyIslandId || 'grudge-open-world',
        this.lobbyResult.scene,
        (pct, label) => {
          this.config.onLoadProgress?.(55 + Math.round(pct * 0.1));
          if (pct % 30 === 0) console.log(`[Island3D] Map chunks: ${label}`);
        },
      );
      // Drop composition's generic ocean — we use TI-quality pirate ocean below
      if (comp.ocean) {
        this.scene.remove(comp.ocean);
        comp.ocean.geometry?.dispose();
        (comp.ocean.material as THREE.Material)?.dispose?.();
      }
      console.log(`[Island3D] ${comp.summary}`);
      }
    } catch (err) {
      console.warn('[Island3D] Map composition overlay skipped', err);
    }

    // TI-quality ocean: calm under decks/piers → shallow beach → deep falloff
    removeDuplicateWaterMeshes(this.scene);
    if (this.waterPlane) {
      this.scene.remove(this.waterPlane);
      this.waterPlane.geometry?.dispose();
      this.waterPlane = null;
    }
    const shores = inferLobbyShoreDisks(
      this.lobbyResult.scene,
      this.lobbyResult.center,
      this.lobbyResult.size,
    );
    this.waterPlane = createPirateLobbyOcean({
      size: Math.max(maxDim * 6, 2400),
      segments: 128,
      waterLevel: LOBBY_WATER_LEVEL,
      oceanFloorLevel: -24,
      islands: shores.islands,
      piers: shores.piers,
    });
    this.scene.add(this.waterPlane);
    this.setupOceanPolish(LOBBY_WATER_LEVEL);
    console.log(
      `[Island3D] Pirate TI ocean · reflect/refract · prefabs=${prefabReg.prefabs.length} · ` +
        `sculptable sand=${prefabReg.sculptable.length} · ` +
        `islands=${shores.islands.length} piers=${shores.piers.length}`,
    );

    // Play any embedded animations
    if (this.lobbyResult.animations.length > 0) {
      this.lobbyAnimMixer = new THREE.AnimationMixer(this.lobbyResult.scene);
      for (const clip of this.lobbyResult.animations) {
        this.lobbyAnimMixer.clipAction(clip).play();
      }
    }

    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.5 / maxDim);

    // RTS capture flags + dock ship (tactical open-water sailing)
    this.lobbyCapture = createLobbyCapturePoints(this.scene, this.lobbyResult);
    this.lobbyShip = await createLobbyShipSystem(
      this.scene,
      this.lobbyResult,
      this.config.accountId ?? 'guest',
      this.config.captainId ?? null,
    );
    // Hide-chunk sectional damage on lobby dock ship (hammer repair ready)
    if (this.lobbyShip?.shipGroup) {
      this.registerWatercraftDamage('lobby_dock_ship', this.lobbyShip.shipGroup);
    }

    // Building + fish life
    this.building = new BuildingSystem(this.scene, this.camera);
    this.creatures = new CreatureManager(this.scene, LOBBY_WATER_LEVEL, this.config.seed.length + 7);
    this.creatures.setGroundSampler(sampleGround);
    this.creatures.spawnFish(14, maxDim * 0.9);

    // Center hub — vendors, harvest ring, PvE
    this.lobbyPlayZone = await createLobbyPlayZone(
      this.scene,
      this.lobbyResult,
      sampleGround,
      this.creatures,
      this.config.seed,
    );
    this.harvestZones = this.lobbyPlayZone.harvestZones;
    this.trees.push(...this.lobbyPlayZone.trees);
    this.rocks.push(...this.lobbyPlayZone.rocks);
    this.crystals.push(...this.lobbyPlayZone.crystals);
    this.hemps.push(...this.lobbyPlayZone.hemps);

    // Evil mountain triad — seeded dungeon event on a northern island
    await this.createLobbyMountainDungeon();

    // 6 race faction islands on map borders (4 docks · 5 buildings · heroes · boat)
    try {
      this.factionIslands = await createFactionLobbyIslands({
        scene: this.scene,
        lobbyCenter: {
          x: this.lobbyResult.center.x,
          z: this.lobbyResult.center.z,
        },
        lobbySize: {
          x: this.lobbyResult.size.x,
          z: this.lobbyResult.size.z,
        },
      });
      console.log(
        `[Island3D] Faction islands ×${this.factionIslands.islands.length} ` +
          `(captain+mount · traveler · blacksmith · benches · siege · dock boat)`,
      );
    } catch (err) {
      console.warn('[Island3D] Faction islands skipped', err);
      this.factionIslands = null;
    }

    // Hot-reload production .gmap (publish API / static package) → overlays + HUD
    await this.reloadProductionGmap();

    this.reportLoad('terrain', 88);

    // Playable Grudge6 character on lobby terrain
    if (this.config.enableCharacter !== false) {
      await this.spawnLobbyCharacter();
    } else {
      this.camera.position.copy(mapDef.cameraPosition);
      this.controls.target.copy(mapDef.cameraTarget);
      this.controls.maxDistance = Math.max(mapDef.cameraPosition.length() * 3, 1000);
      this.controls.minDistance = 5;
      this.controls.maxPolarAngle = Math.PI * 0.85;
      this.controls.update();
    }

    // Day/night on open-world lobby (same production clock as zones)
    if (this.config.dayNight !== undefined && this.sunLight && this.hemiLight && !this.dayNight) {
      this.dayNight = new DayNightCycle(
        this.scene, this.sunLight, this.hemiLight, this.config.dayNight,
      );
    }

    // Faction NPC camps on lobby land for PvE / open combat
    if (!this.npcCamps) {
      this.ensureCampSystems(LOBBY_WATER_LEVEL, sampleGround);
      const half = maxDim * 0.35;
      void spawnZoneCamps(
        this.npcCamps!,
        [
          { x: half * 0.4, z: half * 0.2, radius: half * 0.25 },
          { x: -half * 0.35, z: half * 0.3, radius: half * 0.22 },
          { x: half * 0.15, z: -half * 0.4, radius: half * 0.2 },
        ],
        {
          playerFaction: this.playerFaction,
          seed: (this.config.seed?.length || 1) * 1337,
          campsPerIsland: 1,
        },
      ).then((n) => console.log(`[Island3D] Lobby PvE camps: ${n}`));
    }

    this.config.onLoadProgress?.(100);
  }

  private async spawnLobbyCharacter(): Promise<void> {
    if (!this.lobbyResult) return;

    const lobbyGround = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    lobbyGround.name = 'lobby-ground-proxy';
    this.terrain = {
      terrainScene: this.lobbyResult.scene,
      terrainMesh: lobbyGround,
      biomeMap: [],
      elevationMap: new Float32Array(0),
      moistureMap: new Float32Array(0),
      gridW: 0,
      gridH: 0,
    };

    const sampleGround = this.lobbyCollider?.sampleHeight;
    const startPos = getLobbySpawnPosition(this.lobbyResult, sampleGround);
    const walkMeshes: THREE.Mesh[] = [];
    if (this.lobbyCollider?.colliderMesh) walkMeshes.push(this.lobbyCollider.colliderMesh);
    const physicsSampler = await this.armPhysicsLayer({
      meshes: walkMeshes,
      spawn: startPos,
      waterLevel: LOBBY_WATER_LEVEL,
      existingSampler: sampleGround,
      label: 'lobby',
    });
    this.zoneGroundSampler = physicsSampler;
    this.character = new CharacterController3D({
      scene: this.scene,
      camera: this.camera,
      terrainMesh: this.lobbyCollider?.colliderMesh ?? lobbyGround,
      groundSampler: physicsSampler,
      startPosition: startPos,
      physics: { waterLevel: LOBBY_WATER_LEVEL, doubleJump: true },
      callbacks: this.config.physicsCallbacks,
    });
    this.character.setEntryLocked(false);
    this.character.setWorldFxBus?.(this.worldFx);
    if (this.physics) this.character.attachRapierCct(this.physics);

    // Grudge6 race prefab + main-panel meshes + weapon skills (uMMORPG parity)
    try {
      const { applyGrudge6PlayerToController } = await import('@/lib/loadGrudge6Player');
      await applyGrudge6PlayerToController(this.character, { forceDefault: true });
    } catch (err) {
      console.warn('[Island3D] Lobby Grudge6 character apply failed — capsule until UI reload', err);
    }
    this.setCameraMode('play_tps');
    this.lobbyShip?.attachBoarding(this.character);

    this.camera.position.set(
      startPos.x - 12,
      startPos.y + 18,
      startPos.z + 22,
    );
    this.controls.target.copy(startPos);
    this.controls.update();
  }

  /** Full generative home-island pipeline: terrain → ocean → zones → harvest → nature → nav → systems */
  private async initProcedural(): Promise<void> {
    const progress = (pct: number) => this.config.onLoadProgress?.(pct);

    progress(4);
    await preloadIslandResources().catch((err) => {
      console.warn('[Island3D] Resource preload failed — harvest will retry per-node', err);
    });

    // 1. Foundation + terrain (1024m, high-res mesh, bay/spire shape)
    const foundation = resolveHomeIslandFoundation(
      this.config.seed,
      this.config.biome ?? 'beach',
    );
    progress(12);
    const terrainMaterial = await createTerrainMaterialAsync({
      biome: this.config.biome ?? 'beach',
    });
    const segs = HOME_ISLAND_TERRAIN_SEGMENTS;
    const terrainConfig: IslandTerrainConfig = {
      seed: this.config.seed,
      xSegments: segs,
      ySegments: segs,
      xSize: HOME_ISLAND_WORLD_SIZE_M,
      ySize: HOME_ISLAND_WORLD_SIZE_M,
      minHeight: foundation.minElevationM,
      maxHeight: foundation.maxElevationM,
      rtsHeightmap: this.config.rtsHeightmap,
      foundationShape: {
        landmassFill: foundation.landmassFill,
        bayIndent: foundation.layout.bayIndent,
        spireBias: foundation.layout.spireBias,
        beachBandDepthM: foundation.beachBandDepthM,
        campPercent: this.config.campPositionPercent ?? foundation.layout.defaultCampPercent,
        mountainPercent: foundation.layout.defaultMountainPercent,
      },
    };

    this.terrain = generateIslandTerrainWithBridge(terrainConfig);
    console.log(
      `[Island3D] Generative home island — ${foundation.label}, world ${foundation.worldSizeM}m, ` +
        `mesh ${segs}², elev ${foundation.minElevationM}..${foundation.maxElevationM}m, biome=${this.config.biome ?? 'beach'}`,
    );
    if (this.config.rtsHeightmap) {
      console.log('[Island3D] Terrain from RTS heightmap export (200m → 1024m upsample)');
    }

    const campPct =
      this.config.campPositionPercent
      ?? foundation.layout.defaultCampPercent
      ?? HOME_ISLAND_DEFAULT_CAMP_PERCENT;
    const campWorld = campPercentToWorld(campPct, HOME_ISLAND_WORLD_SIZE_M);
    flattenCampPlateau(
      this.terrain.terrainMesh,
      campWorld.x,
      campWorld.z,
      foundation.campClearRadiusM ?? HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
      foundation.campPlateauHeightM ?? HOME_ISLAND_CAMP_PLATEAU_HEIGHT_M,
    );

    this.terrain.terrainMesh.material = terrainMaterial;
    // Enable terrain as primary collider mesh for raycasts / feet
    this.terrain.terrainMesh.userData.collider = true;
    this.terrain.terrainMesh.receiveShadow = true;

    const noOcean =
      this.config.disableOcean !== false && HOME_ISLAND_DISABLE_OCEAN !== false;
    if (!noOcean) {
      this.flattenTerrainBelowWater(
        this.terrain.terrainMesh,
        PROCEDURAL_WATER_LEVEL,
        HOME_ISLAND_SEAFLOOR_DEPTH_M,
      );
    }
    this.scene.add(this.terrain.terrainScene);
    this.ensureFarmSystems();
    progress(28);

    // 2. Ocean optional — home island defaults to dry board (no conflicting water plane)
    if (!noOcean) {
      this.createWaterPlane();
    } else {
      removeDuplicateWaterMeshes(this.scene);
      this.waterPlane = null;
      console.log('[Island3D] Ocean disabled — board landmass only (no Gerstner plane)');
    }
    progress(32);

    // 3. Harvest zones (forest / rock / gem / hemp / flower / scrap) — dry land only
    const waterY = PROCEDURAL_WATER_LEVEL;
    const zoneDefs = placeProceduralHarvestZones(
      this.config.seed,
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
      {
        zoneCount: HOME_ISLAND_HARVEST_ZONE_COUNT,
        minSpacing: HOME_ISLAND_HARVEST_ZONE_SPACING_M,
        spawnClearRadius: foundation.campClearRadiusM ?? HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
        terrainSize: HOME_ISLAND_WORLD_SIZE_M,
        waterLevel: waterY,
        regrowRegions: this.config.regrowRegions,
      },
    );
    this.harvestZones = await buildHarvestZones(this.scene, zoneDefs, {
      sampleHeight: (x, z) => getTerrainHeightAt(this.terrain!.terrainMesh, x, z),
      waterLevel: waterY,
    });
    this.trees.push(...this.harvestZones.trees);
    this.rocks.push(...this.harvestZones.rocks);
    this.crystals.push(...this.harvestZones.crystals);
    this.hemps.push(...this.harvestZones.hemps);
    this.flowers.push(...this.harvestZones.flowers);
    this.scraps.push(...this.harvestZones.scraps);
    console.log(
      `[Island3D] Harvest zones: ${zoneDefs.length} patches,`,
      `${this.harvestZones.trees.length} trees,`,
      `${this.harvestZones.rocks.length} rocks,`,
      `${this.harvestZones.forests.length} instanced forests`,
      `(nodes dry-land only; fishing separate)`,
    );
    progress(48);

    // 4. Shore dock + fishing only — land harvest lives in zones
    this.placedNodes = placeResourceNodes(
      this.terrain.biomeMap,
      this.terrain.terrainMesh,
      this.terrain.gridW,
      this.terrain.gridH,
      HOME_ISLAND_WORLD_SIZE_M,
      HOME_ISLAND_WORLD_SIZE_M,
      this.config.seed,
      {
        waterLevel: waterY,
        // zone system owns primary land harvest
        excludeTypes: ['tree', 'rock', 'crystal', 'hemp', 'flower', 'bush', 'herb', 'scrap'],
      },
    );

    // 5. Dock / scrap harvestables only
    this.createHarvestables();
    progress(55);

    // 6. Scatter decorations (rocks/props) — not a second tree forest
    this.createDecorations();

    // 6b. BATTLE nature pack (game.grudge-studio.com/game/battle NatureDecor)
    // CommonTree / DeadTree / Pine / Pebble / Bush — NOT stylized multi-pack dumps
    this.treeCanopyLayers = await scatterBattleNatureOnTerrain(
      this.scene,
      this.terrain.terrainMesh,
      {
        worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
        seed: this.config.seed,
        biome: this.config.biome ?? 'beach',
        campClearRadiusM: foundation.campClearRadiusM ?? HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
        campX: campWorld.x,
        campZ: campWorld.z,
        layers: 4,
        treeCount: 200,
        rockCount: 100,
        bushCount: 80,
      },
    );
    // BattleNatureScatter already places 4 density layers (CommonTree pack).
    // Do NOT stack stylized / realistic_trees — that was the conflicting deploy.
    progress(68);

    // 7. Detail layers — grass + sand overlays (textures for land board)
    this.createDetailLayers();
    progress(72);

    // 7b. Board XY grid + cell labels (A1 / D12 style) for hero placement
    if (this.config.showBoardGrid !== false) {
      this.boardGrid = createBoardGrid3D(this.terrain.terrainMesh, {
        worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
        cellM: HOME_ISLAND_BOARD_CELL_M || BOARD_CELL_M,
        labelEvery: 10,
        showLabels: true,
        showLines: true,
      });
      this.scene.add(this.boardGrid);
    }

    // 8. Baked navmesh + three-pathfinding (dry walkable only — no water cells)
    this.navMesh = new TerrainNavMesh(
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
      HOME_ISLAND_WORLD_SIZE_M,
      HOME_ISLAND_WORLD_SIZE_M,
      {
        cellSize: Math.max(HOME_ISLAND_NAVMESH_CELL_M, HOME_ISLAND_BOARD_CELL_M),
        waterLevel: waterY,
        bakePathfinding: true,
        zoneId: 'home_island',
      },
    );
    const bake = this.navMesh.getBakeSummary();
    if (bake) {
      console.log(
        `[Island3D] Nav bake: pathfinding=${bake.pathfindingReady} walkable=${bake.walkableCells} ` +
          `groups=${bake.groupCount} cell=${bake.cellSize}m`,
      );
    }
    progress(76);

    // 8b. Warlords map landmarks (tower / fortress / jungle rocks) — SI prop scale, not hero-fit
    try {
      this.mapLandmarks = await loadWarlordsMapLandmarks(this.scene, {
        sampleHeight: (x, z) => getTerrainHeightAt(this.terrain!.terrainMesh, x, z),
        enabled: this.config.enableLandmarks !== false,
      });
      // Block nav under landmark footprints
      if (this.navMesh && this.mapLandmarks.colliders.length) {
        this.navMesh.markBlockedBoxes?.(this.mapLandmarks.colliders);
      }
      console.info(
        `[Island3D] Map landmarks: ${this.mapLandmarks.landmarks.length} props, ` +
          `${this.mapLandmarks.colliders.length} colliders (SI scale)`,
      );
    } catch (err) {
      console.warn('[Island3D] Map landmarks skipped', err);
      this.mapLandmarks = null;
    }
    progress(78);

    // 9. Ally manager (+ hand to camp unit system for claim-flag AI)
    this.allyManager = new AllyManager(this.scene, this.navMesh, this.terrain.terrainMesh);
    this.campUnits?.setAllyManager(this.allyManager);
    this.ensureCampSystems(
      PROCEDURAL_WATER_LEVEL,
      (wx, wz) => getTerrainHeightAt(this.terrain!.terrainMesh, wx, wz),
    );

    // 10. Building system — camp plateau constraints + board snap
    this.building = new BuildingSystem(this.scene, this.camera);
    this.building.setBuildConstraints({
      terrainMesh: this.terrain.terrainMesh,
      minHeightM: HOME_ISLAND_BUILDABLE_MIN_HEIGHT_M,
      maxHeightM: Math.min(HOME_ISLAND_BUILDABLE_MAX_HEIGHT_M, foundation.maxElevationM * 0.75),
      maxSlopeRad: HOME_ISLAND_BUILDABLE_MAX_SLOPE_RAD,
      campCenter: campWorld,
      campRadiusM: foundation.campClearRadiusM ?? HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
      // Docks: deck at waterLevel + 0.2 (see DOCK_DECK_Y_OFFSET / BuildAssetDef.placeYOffset)
      waterLevel: noOcean ? PROCEDURAL_WATER_LEVEL : PROCEDURAL_WATER_LEVEL,
      sampleNormal: (x, z) => getTerrainNormalAt(this.terrain!.terrainMesh, x, z),
      sampleHeight: (x, z) => getTerrainHeightAt(this.terrain!.terrainMesh, x, z),
    });
    progress(84);

    // 11. Character — snapped to board XY cell, feet on terrain (after physics)
    if (this.config.enableCharacter !== false) {
      await this.spawnCharacter();
    }

    // 12. Wildlife — land only when ocean disabled (no fish over dry board)
    this.creatures = new CreatureManager(
      this.scene,
      noOcean ? -999 : PROCEDURAL_WATER_LEVEL,
      this.config.seed.length,
    );
    const wildlifeBiome = this.wildlifeBiomeFor(this.config.biome ?? foundation.preferredBiomes[0]);
    const wildlifeRadius = Math.round(HOME_ISLAND_WORLD_SIZE_M * 0.42);
    this.creatures.spawnForBiome(this.terrain.terrainMesh, wildlifeBiome, wildlifeRadius, {
      land: HOME_ISLAND_ANIMAL_TARGET,
      fish: noOcean ? 0 : Math.max(8, Math.floor(HOME_ISLAND_ANIMAL_TARGET * 0.6)),
    });
    progress(90);

    // 13. Event mountain (JJ cave) + dungeon portal triad
    await this.createMountainDungeon();

    // 14. Craftpix mines (≥2) — enter 4s → loot bag miner/engineer/mystic
    this.mineSystem = new MineEntranceSystem({
      scene: this.scene,
      terrainMesh: this.terrain.terrainMesh,
      seed: this.config.seed,
      campX: campWorld.x,
      campZ: campWorld.z,
      campClearRadiusM: foundation.campClearRadiusM ?? HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
      worldSizeM: HOME_ISLAND_WORLD_SIZE_M,
      placeEventMountain: true,
      onLoot: (items, mineId) => {
        // Ground icon piles near camp (E pickup) + host bag callback
        if (this.character && items?.length) {
          const p = this.character.getPosition();
          this.spawnGroundLoot(
            p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)),
            items.map((it) => ({
              itemId: (it as { itemId?: string; id?: string }).itemId ||
                (it as { id?: string }).id ||
                "mine_ore",
              name: (it as { name?: string }).name,
              quantity: (it as { quantity?: number }).quantity ?? 1,
            })),
            `mine:${mineId}`,
          );
        }
        this.config.onMineLoot?.(items, mineId);
      },
    });
    await this.mineSystem.init();

    if (this.navMesh) this.creatures.setNavMesh(this.navMesh);
    progress(100);
    console.log(
      `[Island3D] Home island ready — board ${HOME_ISLAND_BOARD_CELL_M}m cells, battle nature, ` +
        `${this.mineSystem.mines.length} mines, baked nav, ocean=${!noOcean}, wildlife=${wildlifeBiome}`,
      this.spawnBoardCell ? `spawn@${this.spawnBoardCell.label}` : '',
      this.navMesh?.getBakeSummary()?.pathfindingReady ? 'pathfinding=ok' : 'pathfinding=grid-only',
    );
  }

  /** Map home biome → creature spawn palette */
  private wildlifeBiomeFor(biome?: string | null): string {
    const b = (biome ?? 'beach').toLowerCase();
    if (b.includes('beach') || b.includes('tropic') || b.includes('shore') || b.includes('haven')) {
      return 'tropical';
    }
    if (b.includes('winter') || b.includes('frost') || b.includes('snow') || b.includes('frozen')) {
      return 'frozen';
    }
    if (b.includes('volcan') || b.includes('ember')) return 'volcanic';
    if (b.includes('desert') || b.includes('ashen')) return 'desert';
    if (b.includes('abyss')) return 'abyssal';
    return 'forest';
  }

  /** Build a full ocean sector (10–14 km) with islands, NPCs, hazards, docks */
  private async initZone(): Promise<void> {
    this.reportLoad('terrain', 18);
    const sectorId = this.config.sectorId;
    const worldSeed = this.config.worldSeed || 'grudge-world-1';

    if (!sectorId) {
      throw new Error('[Island3DEngine] mode="zone" requires config.sectorId');
    }

    const sector = getSectorById(sectorId);
    if (!sector) {
      throw new Error(`[Island3DEngine] Unknown sector: ${sectorId}`);
    }

    this.zoneSector = sector;
    const cfg = sector.terrain3d;

    // 0. Production content package — textures, seeds, monsters, harvest, landmarks
    const prod = getSectorProductionContent(sectorId);
    this.sectorProduction = prod;
    const seeds = resolveSectorSeeds(sectorId, worldSeed);
    if (prod) {
      console.log(
        `[Island3D] Sector production package "${prod.name}" ` +
          `eco=${prod.ecosystemId} pbr=${prod.harvest.groundPbr} ` +
          `landmarks=${prod.events.landmarks.length} ` +
          `animals=${prod.wildlife.animals.join(',')} ` +
          `terrainSeed=${seeds.terrain}`,
      );
    }

    // 1. Generate deterministic zone population (shared with server)
    // Population uses worldSeed:sectorId:pop — matches sectorProductionContent keys.
    this.zonePopulation = generateZonePopulation(
      sectorId, worldSeed, cfg.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      prod?.harvest.resources ?? sector.resources,
      sector.biome,
    );

    // 1b. Haven Shore PVE trade foundation — inject DB harvest UUIDs into population
    if (isHavenShoreSector(sectorId)) {
      const foundationHarvest = havenHarvestToZoneNodes(HAVEN_SHORE_FOUNDATION.origin);
      for (const node of foundationHarvest) {
        this.zonePopulation.nodes.set(node.id, node as HarvestNode);
      }
      console.log(
        `[Island3D] Haven Shore: injected ${foundationHarvest.length} harvest UUIDs into zone population`,
      );
    }

    // 2. Build the Three.js scene (ocean, islands, markers, lighting)
    // Ocean is the ONLY water surface — Fruzer Water cubes are stripped later.
    this.zoneScene = buildZoneScene(sector, this.zonePopulation);
    this.scene.add(this.zoneScene.root);
    if (this.zoneScene.ocean) {
      this.waterPlane = this.zoneScene.ocean;
      removeDuplicateWaterMeshes(this.scene, this.zoneScene.ocean);
      const wl =
        (this.zoneScene.ocean.userData?.waterLevel as number | undefined)
        ?? this.zoneScene.ocean.position.y
        ?? 0;
      this.setupOceanPolish(wl);
    }
    this.reportLoad('terrain', 32);
    await yieldToBrowser();

    // 2b. Interactive harvest meshes on zone nodes (Warlords era open world)
    await preloadIslandResources().catch(() => undefined);
    const zoneHarvest = spawnZoneHarvestNodes(
      this.scene,
      this.zonePopulation,
      this.zoneScene.islandMeshes,
      this.zoneScene.markers,
      cfg.waterLevel,
    );
    this.trees.push(...zoneHarvest.trees);
    this.rocks.push(...zoneHarvest.rocks);
    this.crystals.push(...zoneHarvest.crystals);
    this.hemps.push(...zoneHarvest.hemps);
    this.flowers.push(...zoneHarvest.flowers);
    this.scraps.push(...zoneHarvest.scraps);
    console.log(
      `[Island3D] Zone harvest nodes: ${zoneHarvest.trees.length} trees,`,
      `${zoneHarvest.rocks.length} rocks, ${zoneHarvest.crystals.length} gems`,
    );

    // 2b2. Biome foliage on each sector island (GroundPBR mesh + battle nature pack)
    // Not F:\\GitHub\\super-terrain (WebGPU editor). Same visual kit as home island.
    const islandFootprintM: Record<string, number> = {
      atoll: 240,
      small: 520,
      medium: 900,
      large: 1500,
      home: HOME_ISLAND_WORLD_SIZE_M,
      fortress: 2800,
    };
    const islandNodes = getNodesByCategory<IslandNode>(this.zonePopulation, 'island');
    for (const island of islandNodes) {
      const mesh = this.zoneScene.islandMeshes.get(island.id);
      if (!mesh) continue;
      const foot = islandFootprintM[island.size] ?? 900;
      const scale = Math.max(0.25, foot / 1024);
      try {
        await scatterBattleNatureOnTerrain(this.scene, mesh, {
          worldSizeM: foot,
          seed: `${worldSeed}:${island.id}`,
          biome: sector.biome,
          originX: island.position[0],
          originZ: island.position[2],
          campX: island.position[0],
          campZ: island.position[2],
          campClearRadiusM: Math.max(24, foot * 0.04),
          layers: foot >= 1200 ? 3 : 2,
          treeCount: Math.round(80 * scale),
          rockCount: Math.round(50 * scale),
          bushCount: Math.round(40 * scale),
          grassCount: Math.round(90 * scale),
        });
      } catch (err) {
        console.warn(`[Island3D] Zone foliage failed on ${island.id}:`, err);
      }
    }

    // 2c. Race capital city (Unity world map — 6 race cities)
    // For haven_shore: Fruzer foundation IS the village (vendors, missions, boats).
    const cityHint =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('city')
        : null;
    const raceCity =
      (cityHint ? getRaceCityById(cityHint) : null) ?? getRaceCityBySector(sectorId);

    const settlementIslands = getNodesByCategory<IslandNode>(this.zonePopulation, 'island')
      .filter((i) => i.hasSettlement || i.size === 'large' || i.size === 'fortress');
    const capitalIsland =
      settlementIslands[0] ??
      getNodesByCategory<IslandNode>(this.zonePopulation, 'island')[0];

    if (isHavenShoreSector(sectorId) && capitalIsland) {
      try {
        const ox = capitalIsland.position[0];
        const oz = capitalIsland.position[2];
        this.havenFoundation = await loadHavenShoreFoundation(this.scene, {
          origin: [ox, cfg.waterLevel, oz],
          scale: HAVEN_SHORE_FOUNDATION.scale,
        });
        // Ensure no Fruzer water survived parenting
        removeDuplicateWaterMeshes(this.scene, this.zoneScene.ocean);
        // Plaza marker for Haven Port without loading medieval_town twice
        if (raceCity) {
          this.zoneCapital = await spawnRaceCapitalInZone(
            this.scene,
            { ...raceCity, modelPath: '' }, // foundation owns 3D village
            ox,
            oz,
            this.zoneScene.islandMeshes.get(capitalIsland.id) ?? null,
          );
        }
        console.log(
          `[Island3D] Haven Shore Fruzer foundation + PVE trade village at (${ox.toFixed(0)}, ${oz.toFixed(0)})`,
        );
      } catch (err) {
        console.warn('[Island3D] Haven Shore foundation failed, falling back to capital GLB:', err);
      }
    }

    // Fabled core — fabledzone.glb + cave doorways → dwarf main city / buildings
    // Sector can still host many procedural islands; this is the capital core.
    if (isFabledZoneSector(sectorId) && capitalIsland && !this.havenFoundation) {
      try {
        const ox = capitalIsland.position[0];
        const oz = capitalIsland.position[2];
        this.fabledFoundation = await loadFabledZoneFoundation(this.scene, {
          sectorId,
          origin: [ox, cfg.waterLevel, oz],
          scale: fabledZoneScaleForSector(sectorId),
          onEnterInterior: (def, session) => {
            // Warp player into interior spawn when character is ready
            if (this.character) {
              this.character.teleportTo(session.spawn);
            }
            console.log(`[Island3D] Fabled portal → ${def.label}`);
          },
        });
        if (raceCity) {
          this.zoneCapital = await spawnRaceCapitalInZone(
            this.scene,
            { ...raceCity, modelPath: '' }, // fabledzone owns core 3D
            ox,
            oz,
            this.zoneScene.islandMeshes.get(capitalIsland.id) ?? null,
          );
        }
        console.log(
          `[Island3D] Fabled zone core (fabledzone.glb) + cave portals at (${ox.toFixed(0)}, ${oz.toFixed(0)})`,
        );
      } catch (err) {
        console.warn('[Island3D] Fabled zone foundation failed, falling back to capital GLB:', err);
      }
    }

    if (raceCity && !this.havenFoundation && !this.fabledFoundation && capitalIsland) {
      const capMesh =
        this.zoneScene.islandMeshes.get(capitalIsland.id) ??
        this.zoneScene.islandMeshes.values().next().value ??
        null;
      try {
        this.zoneCapital = await spawnRaceCapitalInZone(
          this.scene,
          raceCity,
          capitalIsland.position[0],
          capitalIsland.position[2],
          capMesh,
        );
        console.log(
          `[Island3D] Race capital "${raceCity.name}" (${raceCity.raceId}) in ${sectorId}`,
        );
      } catch (err) {
        console.warn('[Island3D] Race capital spawn failed:', err);
      }
    }

    // 2d. Dungeon entrance portals (zone population dungeon_entrance nodes)
    this.zoneDungeonPortals = spawnZoneDungeonPortals(
      this.scene,
      this.zonePopulation,
      this.zoneScene.islandMeshes,
      (dungeonId, dungeonName) => {
        // Biome dungeon portals → Hoth / woods / desert / lava instance maps
        const instance = pickBossRoomInstance({
          sectorId,
          dungeonId,
          dungeonName,
        });
        if (this.character && instance) {
          this.ensureBossRooms();
          const entered = this.bossRooms?.enter(
            this.character.model.position,
            'random_dungeon_portal',
            instance.id,
          );
          if (entered) {
            this.config.onDungeonEnter?.(dungeonId, dungeonName);
            return;
          }
        }
        // Warlords era sectors: dungeon entrance → PvE boss instance chamber
        const entered = this.enterPveBossFromDoorway(
          dungeonId,
          dungeonName,
          'warlords_dungeon_portal',
        );
        if (!entered) this.config.onDungeonEnter?.(dungeonId, dungeonName);
      },
    );
    this.ensurePveBossInstance();

    // 2d2. Cave interior system — dual/lethal-ape caves with access + nav + no water
    this.caveInteriors = new CaveInteriorSystem(this.scene);
    if (this.character) this.caveInteriors.setCharacter(this.character);
    // Seed 1–2 island caves on first meshes (on-island + respawnable dungeon)
    void (async () => {
      try {
        let i = 0;
        for (const [, mesh] of this.zoneScene!.islandMeshes) {
          if (i >= 2) break;
          const box = new THREE.Box3().setFromObject(mesh);
          const c = box.getCenter(new THREE.Vector3());
          const y = box.max.y > box.min.y ? box.min.y + 1 : c.y;
          const prefab = i === 0 ? 'cave_dual' : 'cave_lethal_ape';
          await this.caveInteriors!.placeCaveOnIsland({
            prefabId: prefab,
            position: new THREE.Vector3(c.x + 20 * (i + 1), y, c.z + 15 * (i + 1)),
            islandId: `isle_cave_${i}`,
            respawnable: prefab === 'cave_lethal_ape',
            seed: `${this.zonePopulation?.worldSeed ?? 'w'}-cave-${i}`,
          });
          i++;
        }
      } catch (err) {
        console.warn('[Island3D] Cave seed place failed:', err);
      }
    })();

    // Shared ground sampler for landmarks / mountain city
    const islandMeshes = this.zoneScene.islandMeshes;
    const sampleGround = (x: number, z: number): number | null => {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(x, 900, z),
        new THREE.Vector3(0, -1, 0),
      );
      for (const mesh of islandMeshes.values()) {
        const hits = ray.intersectObject(mesh, true);
        if (hits.length > 0) return hits[0].point.y;
      }
      return null;
    };

    // 2e. Hidden Mountain City — top-right biome (thornwood_wilds)
    // Boss on the island must fall before the under-mountain city door opens.
    if (isHiddenMountainCitySector(sectorId)) {
      try {
        this.hiddenMountainCity = await createHiddenMountainCity({
          scene: this.scene,
          zoneSizeM: cfg.sizeMeters,
          sampleGround,
          onEnterCity: (dungeonId, dungeonName) => {
            // Warlords thornwood: unsealed under-mountain door → PvE boss instance
            const entered = this.enterPveBossFromDoorway(
              dungeonId,
              dungeonName,
              'hidden_mountain_city_door',
            );
            if (!entered) this.config.onDungeonEnter?.(dungeonId, dungeonName);
          },
          onBossDefeated: () => {
            console.info('[Island3D] Hidden Mountain City — Warden defeated, door unsealed');
          },
        });
        this.ensurePveBossInstance();
        if (this.hiddenMountainCity) {
          console.log(
            `[Island3D] Hidden Mountain City loaded in ${sectorId} (defeat boss to open door)`,
          );
        }
      } catch (err) {
        console.warn('[Island3D] Hidden Mountain City failed to load:', err);
      }
    }

    // 2g. Ethereal Falls — diagonal destruction half + Lyoko floating stacks
    if (sectorId === ETHEREAL_FALLS_SECTOR_ID || sectorId === 'ethereal_falls') {
      try {
        this.etherealDestruction?.dispose();
        this.etherealDestruction = new EtherealDestructionSystem(cfg.sizeMeters, {
          onPrompt: (msg) => {
            try {
              window.dispatchEvent(
                new CustomEvent('grudge:ethereal-destruction', { detail: { prompt: msg } }),
              );
            } catch {
              /* non-browser */
            }
          },
          onShipNoReturn: (shipId) => {
            console.warn('[Island3D] Ship no-return in Ethereal destruction field', shipId);
          },
          onVoidDrops: (characterId) => {
            console.info('[Island3D] Void death drops (Cosmic Waterfall)', characterId);
          },
          onAllyPermaDeath: (allyId) => {
            console.info('[Island3D] Ally permanent death in Ethereal Falls', allyId);
          },
        });
        this.etherealDestruction.attachScene(this.scene);
        console.log(
          '[Island3D] Ethereal destruction field active — NW half = Cosmic Waterfall tip; flight exempt',
        );
      } catch (err) {
        console.warn('[Island3D] EtherealDestructionSystem failed:', err);
      }

      try {
        this.etherealFloatIslands?.dispose();
        this.etherealFloatIslands = new EtherealFloatingIslandSystem({
          scene: this.scene,
          zoneSizeM: cfg.sizeMeters,
          waterLevel: cfg.waterLevel,
          onReady: (n) =>
            console.log(`[Island3D] Lyoko floating islands ready: ${n} (2 variants each stack)`),
        });
      } catch (err) {
        console.warn('[Island3D] EtherealFloatingIslandSystem failed:', err);
      }
    }

    // 2h. Spiral mountain event islands (mountain/plains/ethereal) — sink/raise + portal
    // Spiral mountain: mountain (thornwood) + plains (haven, ashen) only
    if (isSpiralEventSector(sectorId)) {
      try {
        this.eventIslands?.dispose();
        const spiralBiome =
          sectorId === 'thornwood_wilds'
            ? 'mountain'
            : sectorId === 'haven_shore' || sectorId === 'ashen_wastes'
              ? 'plains'
              : sector.biome === 'forest'
                ? 'mountain'
                : 'plains';
        this.eventIslands = new EventIslandSystem({
          scene: this.scene,
          sectorId,
          biome: spiralBiome,
          zoneSizeM: cfg.sizeMeters,
          waterLevel: cfg.waterLevel,
          sampleGround,
          cb: {
            onPhase: (phase, id) =>
              console.info(`[EventIsland] ${id} → ${phase}`),
            onBossSpawn: (bossId, id) =>
              console.info(`[EventIsland] boss ${bossId} on ${id}`),
            onPortalReady: (kind, pos) =>
              console.info(`[EventIsland] portal ${kind} @`, pos.x.toFixed(0), pos.z.toFixed(0)),
            onPrompt: (msg) => {
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:event-island', { detail: { prompt: msg } }),
                );
              } catch {
                /* */
              }
            },
          },
        });
      } catch (err) {
        console.warn('[Island3D] EventIslandSystem failed:', err);
      }
    }

    // 2i. Instance maps: Hoth (ice), deep woods, desert island, volcanic arena
    if (isBossInstanceSector(sectorId)) {
      this.ensureBossRooms();
    }

    // 2j. Iceland scene in frozen + near-frozen zones
    if (isIcelandSector(sectorId)) {
      try {
        this.icelandScene?.dispose();
        this.icelandScene = await placeIcelandScene({
          scene: this.scene,
          sectorId,
          zoneSizeM: cfg.sizeMeters,
          waterLevel: cfg.waterLevel,
          sampleGround,
        });
      } catch (err) {
        console.warn('[Island3D] Iceland scene failed:', err);
      }
    }

    // 2k. Volcanic infinite climb (random-boxes platform jumper + summit chest)
    if (isVolcanicClimbSector(sectorId)) {
      try {
        this.volcanicClimb?.dispose();
        this.volcanicClimb = new VolcanicClimbIslandSystem({
          scene: this.scene,
          sectorId,
          zoneSizeM: cfg.sizeMeters,
          waterLevel: cfg.waterLevel,
          fallbackMeshes: islandMeshes.values(),
          cb: {
            onReady: (n) =>
              console.log(`[Island3D] Volcanic climb ready: ${n} platforms`),
            onSummitReached: (floor, pos) =>
              console.info(
                `[Island3D] Summit floor ${floor} @ ${pos.x.toFixed(0)},${pos.y.toFixed(0)},${pos.z.toFixed(0)}`,
              ),
            onChestOpened: (floor, grants) => {
              console.info(
                `[Island3D] Summit chest floor ${floor}:`,
                grants.map((g) => `${g.qty}×${g.itemId}`).join(', '),
              );
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:volcanic-climb', {
                    detail: { type: 'chest', floor, grants },
                  }),
                );
              } catch {
                /* */
              }
            },
            onEventPad: (floor, pos) => {
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:volcanic-climb', {
                    detail: {
                      type: 'event',
                      floor,
                      pos: { x: pos.x, y: pos.y, z: pos.z },
                    },
                  }),
                );
              } catch {
                /* */
              }
            },
            onPrompt: (msg) => {
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:volcanic-climb', {
                    detail: { type: 'prompt', prompt: msg },
                  }),
                );
              } catch {
                /* */
              }
            },
          },
        });
      } catch (err) {
        console.warn('[Island3D] VolcanicClimbIslandSystem failed:', err);
      }
    }

    // E: single priority chain (climb chest → boss exit → event portal → iceland)
    if (this._bossPortalKey) {
      window.removeEventListener('keydown', this._bossPortalKey);
    }
    this._bossPortalKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'e' && e.key !== 'E')) return;
      if (!this.character) return;
      if (this.onClosePlayUi?.()) return;
      // Exit PvE mountain / Warlords boss instance first
      if (this.pveBossInstance?.isInside) {
        if (this.pveBossInstance.tryExit(this.character.model.position)) {
          console.info('[Island3D] left PvE boss instance');
          return;
        }
      }
      const result = resolveZoneInteract({
        playerPos: this.character.model.position,
        volcanicClimb: this.volcanicClimb,
        eventIslands: this.eventIslands,
        bossRooms: this.bossRooms,
        icelandScene: this.icelandScene,
        sectorId,
        isHothEligible: isHothEligibleSector(sectorId),
      });
      if (result.kind !== 'none') {
        console.info('[Island3D] zone interact:', result.kind);
        return;
      }
      const staff = this.pickInnStaffTalk(this.character.model.position);
      if (staff) this.onInnTalk?.(staff);
    };
    window.addEventListener('keydown', this._bossPortalKey);

    // 2f. Sector event landmarks from production package
    // (eventfalls.glb for ethereal_falls, ice kit, etc. — skip dedicated systems)
    if (prod?.events.landmarks.length) {
      try {
        this.sectorEventLandmarks = await createSectorEventLandmarks({
          scene: this.scene,
          zoneSizeM: cfg.sizeMeters,
          landmarks: prod.events.landmarks,
          sampleGround,
          skipIds: [
            'hidden_mountain_city',
            'fabledzone_core',
            // Not on R2 — EtherealFloatingIslandSystem owns this sector look
            'event_falls',
            'starting_falls',
          ],
        });
        if (this.sectorEventLandmarks) {
          console.log(
            `[Island3D] Sector landmarks loaded: ${this.sectorEventLandmarks.loaded.join(', ') || '(none)'} ` +
              (this.sectorEventLandmarks.failed.length
                ? `(fallback: ${this.sectorEventLandmarks.failed.join(', ')})`
                : ''),
          );
        }
      } catch (err) {
        console.warn('[Island3D] Sector event landmarks failed:', err);
      }
    }

    // 3. Apply sector sky + fog
    this.scene.background = new THREE.Color(cfg.skyColor);
    this.scene.fog = new THREE.FogExp2(cfg.fog.color, cfg.fog.density);

    // 4. Replace default lighting with zone lighting
    // (remove the lights setupLighting() created — zone scene has its own)
    if (this.sunLight) { this.scene.remove(this.sunLight); this.sunLight = null; }
    if (this.hemiLight) { this.scene.remove(this.hemiLight); this.hemiLight = null; }

    // 5. Day/night cycle with zone sun
    if (this.config.dayNight !== undefined) {
      this.dayNight = new DayNightCycle(
        this.scene, this.zoneScene.sunLight, this.zoneScene.hemiLight,
        this.config.dayNight,
      );
    }

    // 6. Entry / spawn — raycast onto Haven foundation or zone islands (never waterLevel+N alone)
    const spawns = getNodesByCategory<SpawnPointNode>(this.zonePopulation, 'spawn_point')
      .filter(s => s.spawnType === 'player');
    const docks = getNodesByCategory<DockNode>(this.zonePopulation, 'dock');
    const dockOrSpawn = spawns[0]?.position ?? docks[0]?.position ?? cfg.spawnPoints[0] ?? [0, 20, 0];

    /**
     * Sample solid ground only (Mesh geometry). Never recurse into Sprites —
     * THREE.Sprite.raycast requires ray.camera and some labels have null matrixWorld,
     * which hard-crashed initZone ([Play] Engine init failed: matrixWorld).
     */
    const sampleGroundY = (x: number, z: number, fallbackY: number): number => {
      try {
        const meshes: THREE.Mesh[] = [];
        const collectMeshes = (root: THREE.Object3D | null | undefined) => {
          if (!root) return;
          try {
            root.updateMatrixWorld(true);
          } catch {
            /* ignore incomplete hierarchies */
          }
          root.traverse((o) => {
            const m = o as THREE.Mesh;
            // Skip sprites, lights, empty groups — only real geometry
            if (!(m as THREE.Mesh).isMesh) return;
            if ((o as THREE.Sprite).isSprite) return;
            if (!m.geometry || !m.matrixWorld) return;
            meshes.push(m);
          });
        };
        collectMeshes(this.havenFoundation?.root);
        collectMeshes(this.fabledFoundation?.root);
        for (const m of this.zoneScene.islandMeshes.values()) {
          if (m?.isMesh && m.geometry && m.matrixWorld) meshes.push(m);
        }
        if (meshes.length === 0) return fallbackY;

        const ray = new THREE.Raycaster();
        // Guard sprite path if anything slips through
        ray.camera = this.camera;
        ray.set(new THREE.Vector3(x, cfg.waterLevel + 800, z), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObjects(meshes, false);
        for (const h of hits) {
          const n = (h.object.name || '').toLowerCase();
          if (n.includes('water') || n.includes('ocean')) continue;
          if (Number.isFinite(h.point.y)) return h.point.y;
        }
      } catch (err) {
        console.warn('[Island3D] sampleGroundY failed — using fallback Y', err);
      }
      return fallbackY;
    };

    let entryX = dockOrSpawn[0];
    let entryZ = dockOrSpawn[2];
    let entryY = Math.max(dockOrSpawn[1], cfg.waterLevel + 6);
    if (this.havenFoundation) {
      entryX = this.havenFoundation.root.position.x + 8;
      entryZ = this.havenFoundation.root.position.z + 14;
      entryY = sampleGroundY(entryX, entryZ, cfg.waterLevel + 8) + 1.1;
    } else if (this.fabledFoundation) {
      entryX = this.fabledFoundation.root.position.x + 12;
      entryZ = this.fabledFoundation.root.position.z + 28;
      entryY = sampleGroundY(entryX, entryZ, cfg.waterLevel + 10) + 1.1;
    } else if (this.zoneCapital) {
      entryX = this.zoneCapital.spawn.x;
      entryZ = this.zoneCapital.spawn.z;
      entryY = sampleGroundY(entryX, entryZ, this.zoneCapital.spawn.y) + 0.5;
    } else {
      entryY = sampleGroundY(entryX, entryZ, entryY) + 0.5;
    }
    entryY = Math.max(entryY, cfg.waterLevel + 2.5);
    const entryPoint: [number, number, number] = [entryX, entryY, entryZ];

    const camLift = Math.min(48, Math.max(22, cfg.sizeMeters * 0.0025));
    const camBack = Math.min(56, Math.max(28, cfg.sizeMeters * 0.003));
    this.camera.position.set(entryPoint[0], entryPoint[1] + camLift, entryPoint[2] + camBack);
    this.controls.target.set(entryPoint[0], entryPoint[1] + 1.6, entryPoint[2]);
    this.controls.maxDistance = Math.max(900, cfg.sizeMeters * 0.12);
    this.controls.minDistance = 4;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.update();

    // 7. Ground mesh — prefer Haven foundation deck over distant grey islands
    const capitalMesh = this.zoneCapital
      ? (this.zoneScene.islandMeshes.values().next().value as THREE.Mesh | undefined)
      : undefined;
    const firstIslandId = this.zonePopulation.islandIds[0];
    const zoneIslandMesh =
      (capitalMesh as THREE.Mesh | undefined) ??
      (firstIslandId ? this.zoneScene.islandMeshes.get(firstIslandId) : null) ??
      null;

    let foundationMesh: THREE.Mesh | null = null;
    if (this.havenFoundation) {
      for (const o of this.havenFoundation.groundMeshes) {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          foundationMesh = m;
          break;
        }
      }
      if (!foundationMesh) {
        this.havenFoundation.root.traverse((o) => {
          if (foundationMesh) return;
          const m = o as THREE.Mesh;
          if (m.isMesh) foundationMesh = m;
        });
      }
    }
    const firstIslandMesh = foundationMesh ?? zoneIslandMesh;

    // 8. Physics layer then character — never spawn on the raw zone root
    // (full-sector raycast = hitch + fall-through when groundHeight is null).
    if (this.config.enableCharacter !== false && firstIslandMesh) {
      this.terrain = {
        terrainScene: this.zoneScene.root,
        terrainMesh: firstIslandMesh,
        biomeMap: [],
        elevationMap: new Float32Array(0),
        moistureMap: new Float32Array(0),
        gridW: 0,
        gridH: 0,
      };
      this.ensureFarmSystems();
      const spawnPos = new THREE.Vector3(entryPoint[0], entryPoint[1], entryPoint[2]);
      if (this.volcanicClimb) {
        const f0 = layoutVolcanicClimbFloor(0);
        const origin = volcanicClimbOrigin(sectorId);
        spawnPos.set(
          origin.x + f0.x,
          volcanicClimbSpawnY(cfg.waterLevel),
          origin.z + f0.z,
        );
      }
      const climbGround = this.volcanicClimb
        ? this.volcanicClimb.makeGroundSampler(islandMeshes.values())
        : undefined;
      const walkable = this.collectZoneWalkableMeshes();
      const physicsSampler = await this.armPhysicsLayer({
        meshes: walkable.length ? walkable : [firstIslandMesh],
        spawn: spawnPos,
        waterLevel: cfg.waterLevel,
        existingSampler: climbGround,
        label: sectorId,
      });

      this.zoneGroundSampler = physicsSampler;
      this.character = new CharacterController3D({
        scene: this.scene,
        camera: this.camera,
        terrainMesh: firstIslandMesh,
        groundSampler: physicsSampler,
        startPosition: spawnPos,
        physics: { waterLevel: cfg.waterLevel, characterHeight: 2.0 },
        callbacks: this.config.physicsCallbacks,
      });
      this.character.setEntryLocked(false);
      this.character.setWorldFxBus?.(this.worldFx);
      if (this.physics) this.character.attachRapierCct(this.physics);

      // Hold-to-jump — single sector resolver (volcanic / ethereal)
      const jumpCfg = resolvePlatformerJumpForSector(sectorId);
      if (jumpCfg) {
        this.character.setPlatformerJump(true, jumpCfg);
      }

      this.setCameraMode('play_tps');
      console.log(
        '[Island3DEngine] Zone character ready at (' +
          spawnPos.x.toFixed(1) +
          ', ' +
          spawnPos.y.toFixed(1) +
          ', ' +
          spawnPos.z.toFixed(1) +
          ') haven=' +
          !!this.havenFoundation +
          ' climb=' +
          !!this.volcanicClimb +
          ' physics=' +
          this.physicsReady +
          ' ground=' +
          (firstIslandMesh.name || 'mesh'),
      );
    } else if (this.config.enableCharacter !== false) {
      throw new Error('[Island3DEngine] Zone character blocked — no walkable island mesh');
    }

    // 9. Building system works in zone mode too
    this.building = new BuildingSystem(this.scene, this.camera);

    // 10. Wildlife — production package animals + fish counts (land dry / fish water only)
    // Animals/monsters are enemy or neutral-attackable (never ally)
    const animalSeed = seeds.animals;
    this.creatures = new CreatureManager(this.scene, cfg.waterLevel, animalSeed);
    this.creatures.spawnForBiome(
      firstIslandMesh,
      sector.biome,
      cfg.sizeMeters * 0.28,
      {
        land: prod?.wildlife.landSpawnCount,
        fish: prod?.wildlife.fishSpawnCount,
      },
    );

    // 11. Faction NPC camps — stylized camp GLB; same faction ally, others enemy
    // Seeds + factions from sector production package for client/server parity.
    const islands = getNodesByCategory<IslandNode>(this.zonePopulation, 'island');
    const islandCenters = islands.map((isl) => ({
      x: isl.position[0],
      z: isl.position[2],
      radius: isl.radiusM,
    }));
    const sampleY = firstIslandMesh
      ? (x: number, z: number) => {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x, 800, z),
            new THREE.Vector3(0, -1, 0),
          );
          const hits = ray.intersectObject(firstIslandMesh, true);
          return hits.length > 0 ? hits[0].point.y : null;
        }
      : undefined;
    this.ensureCampSystems(cfg.waterLevel, sampleY);
    void spawnZoneCamps(this.npcCamps!, islandCenters, {
      playerFaction: this.playerFaction,
      seed: seeds.npcCamps,
      campsPerIsland: prod?.npcs.campsPerIsland ?? 1,
      factions: prod?.npcs.factions,
    }).then((n) => {
      console.log(
        `[Island3DEngine] Spawned ${n} faction camps in zone (seed=${seeds.npcCamps})`,
      );
    });

    // Hostile patrol boats: continuous fire + smoke (damaged-boat VFX)
    if (this.worldFx && this.zoneScene) {
      for (const [, marker] of this.zoneScene.markers) {
        if (marker.userData?.burning) {
          this.worldFx.attachBoatDamage(marker, 'damaged');
        }
      }
    }
    this.character?.setWorldFxBus?.(this.worldFx);

    // PvE boss_arena nodes → PIP-style large bosses (open zone)
    try {
      this.arenaBosses.forEach((b) => b.dispose());
      this.arenaBosses = [];
      const { LargeBossFightSystem } = await import('../combat/LargeBossFightSystem');
      type BossArenaNode = import('@shared/definitions/zoneServerNodes').BossArenaNode;
      const arenas = getNodesByCategory<BossArenaNode>(
        this.zonePopulation,
        'boss_arena',
      );
      for (const arena of arenas.slice(0, 3)) {
        const pos = new THREE.Vector3(
          arena.position[0],
          (arena.position[1] ?? 0) + 0.5,
          arena.position[2],
        );
        const boss = new LargeBossFightSystem({
          scene: this.scene,
          position: pos,
          arenaCenter: pos.clone(),
          bossId: arena.id ?? `arena_${this.arenaBosses.length}`,
          worldFx: this.worldFx,
          cb: {
            onPrompt: (msg) => {
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:arena-boss', {
                    detail: { type: 'prompt', prompt: msg, arenaId: arena.id },
                  }),
                );
              } catch {
                /* */
              }
            },
            onDeath: (id) => {
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:arena-boss', {
                    detail: { type: 'death', bossId: id, arenaId: arena.id },
                  }),
                );
              } catch {
                /* */
              }
            },
            onPlayerHit: (hit) => {
              this.applyBossHitToPlayer(hit);
              try {
                window.dispatchEvent(
                  new CustomEvent('grudge:arena-boss', {
                    detail: { type: 'hit', arenaId: arena.id, ...hit },
                  }),
                );
              } catch {
                /* */
              }
            },
          },
        });
        this.arenaBosses.push(boss);
      }
      if (this.arenaBosses.length) {
        console.log(
          `[Island3D] Spawned ${this.arenaBosses.length} PIP-style arena bosses`,
        );
      }
    } catch (err) {
      console.warn('[Island3D] arena boss spawn failed', err);
    }

    console.log(
      `[Island3DEngine] Zone "${sector.name}" loaded:`,
      `${this.zonePopulation.islandIds.length} islands,`,
      `${this.zonePopulation.nodes.size} total nodes,`,
      `${this.creatures.count} creatures`,
      prod ? `| prod v1 eco=${prod.ecosystemId}` : '',
    );
  }

  /** Set player faction so camp banners / AI treat ally vs enemy correctly. */
  setPlayerFaction(faction: CampFaction | string): void {
    this.playerFaction = faction;
    this.npcCamps?.setPlayerFaction(faction);
  }

  /** Wire claim-flag garrison + F1–F5 unit orders. */
  private ensureCampSystems(
    waterLevel: number,
    sampleHeight?: (x: number, z: number) => number | null,
  ): void {
    // AllyManager is created after nav bake on home island; zone/lobby may attach later.
    // Garrison uses Toon RTS race kits; F1–F5 orders target wildlife via CreatureManager.

    if (!this.npcCamps) {
      this.npcCamps = new NpcCampSystem({
        scene: this.scene,
        playerFaction: this.playerFaction,
        waterLevel,
        sampleHeight,
      });
    }
    const getEnemies = () => {
      const pos = this.character?.getPosition() ?? this.camera.position;
      if (!this.creatures) return [];
      return this.creatures.listSoftLockTargets(pos, 80).map((t) => ({
        id: t.id,
        position: t.position,
        hp: t.hp,
        dead: t.hp <= 0,
      }));
    };
    if (!this.campUnits) {
      this.campUnits = new CampUnitSystem({
        scene: this.scene,
        campSystem: this.npcCamps,
        allyManager: this.allyManager,
        playerRaceId: this.config.raceId ?? 'human',
        playerAccountId: this.config.accountId ?? 'guest',
        getPlayerPosition: () =>
          this.character?.getPosition() ?? this.camera.position.clone(),
        getEnemies,
        sampleHeight,
        waterLevel,
      });
    } else {
      this.campUnits.setAllyManager(this.allyManager);
      this.campUnits.setGetEnemies(getEnemies);
    }
    this.npcCamps.setClaimFlagHandler(async (camp) => {
      if (!camp.data.ownerAccountId) {
        camp.data.ownerAccountId = this.config.accountId ?? 'guest';
      }
      await this.campUnits?.onClaimFlagPlaced(camp);
    });
    this.npcCamps.setUpgradeHandler(async (camp, upgradeId) => {
      if (upgradeId === 'camp_flag') return; // claim handler already ran
      this.campUnits?.refreshCampBuffs(camp.data.id);
    });
  }

  /** Place player-owned camp (build mode) at world XZ. */
  async placePlayerCamp(x: number, z: number, faction?: CampFaction): Promise<string | null> {
    this.ensureCampSystems(
      PROCEDURAL_WATER_LEVEL,
      this.terrain
        ? (wx, wz) => getTerrainHeightAt(this.terrain!.terrainMesh, wx, wz)
        : undefined,
    );
    const camp = await this.npcCamps!.spawnCamp({
      defId: 'stylized_enemy_camp',
      faction: (faction ?? this.playerFaction) as CampFaction,
      x,
      z,
      ownerAccountId: this.config.accountId ?? 'guest',
    });
    return camp?.data.id ?? null;
  }

  /**
   * Attach bench / storage / tower / claim flag to nearest camp.
   * Claim Flag spawns unarmed race garrison for the player.
   */
  async upgradeNearestCamp(
    x: number,
    z: number,
    upgradeId: 'camp_bench' | 'camp_storage' | 'camp_tower' | 'camp_flag' | 'camp_fire',
  ): Promise<boolean> {
    const camp = this.npcCamps?.findNearestCamp(x, z, 24);
    if (!camp) return false;
    // Only upgrade ally camps or own camps
    if (camp.relation === 'enemy' && camp.data.ownerAccountId !== (this.config.accountId ?? 'guest')) {
      return false;
    }
    if (upgradeId === 'camp_flag' && !camp.data.ownerAccountId) {
      camp.data.ownerAccountId = this.config.accountId ?? 'guest';
    }
    return this.npcCamps!.addUpgrade(camp.data.id, upgradeId, {
      ownerAccountId: this.config.accountId ?? 'guest',
    });
  }

  /** F1–F5 camp unit orders (owned camp only). */
  issueCampOrder(orderId: CampUnitOrderId): boolean {
    return this.campUnits?.issueOrder(orderId) ?? false;
  }

  /** Craft at nearest owned camp bench → profession XP. */
  craftAtOwnedCamp(profession?: string): {
    ok: boolean;
    xp: number;
    reason?: string;
  } {
    const r = this.campUnits?.craftAtCampBench(profession ?? 'camp');
    return r ?? { ok: false, xp: 0, reason: 'No camp unit system' };
  }

  /** True when player is near a camp they own (show order HUD). */
  isNearOwnedCamp(radius = 40): boolean {
    return this.campUnits?.isNearOwnedCamp(radius) ?? false;
  }

  private campRtsActive = false;
  private campRtsPolar = Math.PI / 2.15;

  isCampRtsBuildMode(): boolean {
    return this.campRtsActive;
  }

  /**
   * Overhead RTS build on the nearest owned (or claimable) camp.
   * Orbit owns the camera; TPS follow is off. Esc / same toggle exits.
   */
  enterCampRtsBuildMode(radius = 80): boolean {
    const pos = this.character?.getPosition() ?? this.camera.position;
    const owned = this.campUnits?.findNearestOwnedCamp(radius);
    const near = this.npcCamps?.findNearestCamp(pos.x, pos.z, radius);
    const camp =
      owned ??
      (near && near.relation !== 'enemy' ? near : null);
    if (!camp) return false;

    this.ensureCampSystems(
      PROCEDURAL_WATER_LEVEL,
      this.terrain
        ? (wx, wz) => getTerrainHeightAt(this.terrain!.terrainMesh, wx, wz)
        : undefined,
    );
    if (!camp.data.ownerAccountId) {
      camp.data.ownerAccountId = this.config.accountId ?? 'guest';
    }

    const [cx, cy, cz] = camp.data.position;
    this.campRtsPolar = this.controls.maxPolarAngle;
    this.controls.maxPolarAngle = Math.PI * 0.38;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 90;
    this.controls.target.set(cx, cy + 0.6, cz);
    this.camera.position.set(cx + 2, cy + 52, cz + 14);
    this.camera.lookAt(cx, cy + 0.4, cz);
    this.setCameraMode('orbit_edit');
    this.controls.update();
    this.campRtsActive = true;
    void this.character?.setControlMode('build');
    return true;
  }

  exitCampRtsBuildMode(): void {
    if (!this.campRtsActive && this.getCameraMode() !== 'orbit_edit') return;
    this.campRtsActive = false;
    this.controls.maxPolarAngle = this.campRtsPolar;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 400;
    this.cancelBuilding();
    this.setCameraMode(this.character ? 'play_tps' : 'orbit_edit');
    void this.character?.setControlMode('harvest');
  }

  toggleCampRtsBuildMode(): boolean {
    if (this.campRtsActive) {
      this.exitCampRtsBuildMode();
      return false;
    }
    return this.enterCampRtsBuildMode();
  }

  /** Snapshot for camp HUD — units + buildings on nearest owned camp. */
  getCampHudSnapshot(): {
    campId: string;
    units: Array<{ id: string; race: string; order: string; t0: boolean }>;
    buildings: Array<{ id: string; label: string; kind: string }>;
    rts: boolean;
  } | null {
    const camp = this.campUnits?.findNearestOwnedCamp(80);
    if (!camp) return null;
    const units = (this.campUnits?.getUnitsForCamp(camp.data.id) ?? []).map((u) => ({
      id: u.unitId,
      race: u.raceId,
      order: u.order,
      t0: u.equipT0,
    }));
    const buildings = camp.data.upgrades.map((u) => ({
      id: u.upgradeId,
      label: CAMP_UPGRADES[u.upgradeId]?.label ?? u.upgradeId,
      kind: u.kind,
    }));
    return { campId: camp.data.id, units, buildings, rts: this.campRtsActive };
  }

  /** Place a catalog upgrade on nearest camp (auto-slot). */
  async placeCampUpgrade(upgradeId: string): Promise<boolean> {
    const pos = this.character?.getPosition() ?? this.camera.position;
    const camp =
      this.campUnits?.findNearestOwnedCamp(80) ??
      this.npcCamps?.findNearestCamp(pos.x, pos.z, 80);
    if (!camp) return false;
    if (camp.relation === 'enemy' && camp.data.ownerAccountId !== (this.config.accountId ?? 'guest')) {
      return false;
    }
    if (!camp.data.ownerAccountId) {
      camp.data.ownerAccountId = this.config.accountId ?? 'guest';
    }
    return this.npcCamps!.addUpgrade(camp.data.id, upgradeId, {
      ownerAccountId: this.config.accountId ?? 'guest',
    });
  }

  /** Collapse submerged terrain so only the ocean shader shows water (not seafloor + ocean). */
  private flattenTerrainBelowWater(mesh: THREE.Mesh, waterLevel: number, seafloorDepth = -14): void {
    flattenTerrainVertsBelowWater(mesh, waterLevel, seafloorDepth);
  }

  /**
   * Single Three.js ocean plane only — no R3F/drei Water, no second mirror surface.
   * Terrain under water is flattened to seafloor so we never double-draw water.
   */
  private createWaterPlane(): void {
    removeDuplicateWaterMeshes(this.scene);

    this.waterPlane = createOceanMesh({
      waterLevel: PROCEDURAL_WATER_LEVEL,
      size: HOME_ISLAND_OCEAN_SIZE_M,
      segments: Math.min(Math.max(HOME_ISLAND_OCEAN_SEGMENTS, 48), 96),
      strength: 1.2,
    });
    this.waterPlane.name = 'ocean';
    this.waterPlane.userData.grudgeKeepOcean = true;
    this.waterPlane.renderOrder = 0;
    this.scene.add(this.waterPlane);
    this.setupOceanPolish(PROCEDURAL_WATER_LEVEL);
  }

  /**
   * Reflection + refraction RTs, procedural foam/caustics/normal, underwater post.
   * Safe to call after any ocean mesh is assigned (procedural or pirate lobby).
   * Honors oceanQuality: off skips all polish; low skips dual-pass RTs.
   */
  private setupOceanPolish(waterLevel: number): void {
    try {
      this.setupOceanPolishInner(waterLevel);
    } catch (e) {
      console.warn('[Island3D] ocean polish skipped:', e);
    }
  }

  private setupOceanPolishInner(waterLevel: number): void {
    this.oceanReflectionRig?.dispose();
    this.oceanReflectionRig = null;
    this.underwaterPost?.dispose();
    this.underwaterPost = null;

    // Infer from post quality if never set: low graphics → low ocean
    if (this.config.quality === 'low' && this.oceanQuality === 'high') {
      this.oceanQuality = 'low';
    }

    if (this.oceanQuality === 'off') return;

    this.underwaterPost = new UnderwaterPost({ waterLevel });
    if (this.config.canvas) {
      this.underwaterPost.attachOverlay(this.config.canvas);
    }

    if (!this.oceanProcTextures) {
      this.oceanProcTextures = createProceduralOceanTextures();
    }

    const wantDualPass = this.oceanQuality === 'high';
    if (wantDualPass) {
      this.oceanReflectionRig = new OceanReflectionRig({
        waterLevel,
        reflectionSize: 512,
        refractionSize: 512,
      });
    }

    const mat = this.waterPlane?.material as THREE.ShaderMaterial | undefined;
    if (mat?.uniforms) {
      bindOceanMaps(mat, {
        reflection: this.oceanReflectionRig?.reflectionMap ?? null,
        refraction: this.oceanReflectionRig?.refractionMap ?? null,
        normal: this.oceanProcTextures?.normal ?? null,
        foam: this.oceanProcTextures?.foam ?? null,
        caustics: this.oceanProcTextures?.caustics ?? null,
      });
      const u = mat.uniforms;
      if (this.oceanReflectionRig) {
        if (u.uReflectionMap) u.uReflectionMap.value = this.oceanReflectionRig.reflectionMap;
        if (u.uRefractionMap) u.uRefractionMap.value = this.oceanReflectionRig.refractionMap;
        if (u.uHasReflection) u.uHasReflection.value = 1;
        if (u.uHasRefraction) u.uHasRefraction.value = 1;
      } else {
        if (u.uHasReflection) u.uHasReflection.value = 0;
        if (u.uHasRefraction) u.uHasRefraction.value = 0;
      }
    }

    if (!this.boatWake) {
      this.boatWake = new BoatWakeSystem(this.scene);
    }
  }

  /** Runtime graphics / ocean quality from play settings UI. */
  setGraphicsQuality(quality: QualityPreset): void {
    this.postProcessing?.setQuality(quality);
    if (this.sunLight) {
      this.sunLight.castShadow = quality !== 'low';
    }
    this.renderer.shadowMap.enabled = quality !== 'low';
  }

  setOceanQuality(q: 'off' | 'low' | 'high'): void {
    if (this.oceanQuality === q) return;
    this.oceanQuality = q;
    const wl =
      this.waterPlane?.position.y
      ?? (this.waterPlane?.userData?.waterLevel as number | undefined)
      ?? 0;
    if (this.waterPlane) this.setupOceanPolish(wl);
  }

  getOceanQuality(): 'off' | 'low' | 'high' {
    return this.oceanQuality;
  }

  private createHarvestables(): void {
    if (!this.terrain) return;

    for (const node of this.placedNodes) {
      switch (node.type) {
        case 'tree': {
          // Always full CDN pack tree (hidden until mounted). No 0.01 hitbox-only poly path.
          const tree = createHarvestableTree(node.position, node.scale);
          tree.nodeId = node.id;
          this.trees.push(tree);
          this.scene.add(tree.group);
          break;
        }
        case 'rock': {
          const rock = createHarvestableRock(node.position, node.scale);
          rock.nodeId = node.id;
          this.rocks.push(rock);
          this.scene.add(rock.group);
          break;
        }
        case 'crystal': {
          const crystal = createCrystalCluster(node.position, node.scale);
          crystal.nodeId = node.id;
          this.crystals.push(crystal);
          this.scene.add(crystal.group);
          break;
        }
        case 'hemp': {
          const hemp = createHempPlant(node.position, node.scale);
          hemp.nodeId = node.id;
          this.hemps.push(hemp);
          this.scene.add(hemp.group);
          break;
        }
        case 'flower': {
          const flower = createFlowerPatch(node.position, node.scale);
          flower.nodeId = node.id;
          this.flowers.push(flower);
          this.scene.add(flower.group);
          break;
        }
        case 'scrap': {
          const scrap = createScrapPile(node.position, node.scale);
          scrap.nodeId = node.id;
          this.scraps.push(scrap);
          this.scene.add(scrap.group);
          break;
        }
        case 'dock': {
          const dock = createDock(node.position);
          this.scene.add(dock);
          break;
        }
        // bush, herb, fish — handled by scatter decorations / creatures
      }
    }
  }

  private async createLobbyMountainDungeon(): Promise<void> {
    if (!this.lobbyResult || !this.lobbyCollider) return;

    const terrainSize = Math.max(this.lobbyResult.size.x, this.lobbyResult.size.z);
    const triadSeed: MountainTriadSeed =
      this.config.mountainTriad ?? generateMountainTriadSeed(this.config.seed, terrainSize);

    const anchorWorld = {
      x: this.lobbyResult.center.x + terrainSize * 0.22,
      z: this.lobbyResult.center.z - terrainSize * 0.28,
    };

    const triadResult = await createEvilMountainTriad(this.scene, {
      seed: this.config.seed,
      mountainTriad: triadSeed,
      terrainMesh: this.lobbyCollider.colliderMesh,
      biomeMap: [],
      gridW: 0,
      gridH: 0,
      terrainSize,
      anchorWorld,
      onEnterDungeon: (_portalId, dungeonId) => {
        const name = this.mountainTriad?.triad.dungeon.name ?? 'Evil Mountain Dungeon';
        // Home-island / lobby: walk into evil mountain doorway → PvE boss instance
        const entered = this.enterPveBossFromDoorway(
          dungeonId,
          name,
          'evil_mountain_door',
        );
        if (!entered) this.config.onDungeonEnter?.(dungeonId, name);
      },
    });
    if (!triadResult) return;

    const facingYaw = Math.atan2(-triadResult.anchor.x, -triadResult.anchor.z);
    this.mountainTriad = new EvilMountainTriadSystem(triadResult, facingYaw);
    this.ensurePveBossInstance();
    console.log(
      `[Island3D] Lobby evil mountain triad — secret peak #${triadResult.secretIndex + 1}, dungeon: ${triadResult.dungeon.name}`,
    );
  }

  private async createMountainDungeon(): Promise<void> {
    if (!this.terrain) return;
    const triadResult = await createEvilMountainTriad(this.scene, {
      seed: this.config.seed,
      mountainTriad: this.config.mountainTriad,
      terrainMesh: this.terrain.terrainMesh,
      biomeMap: this.terrain.biomeMap,
      gridW: this.terrain.gridW,
      gridH: this.terrain.gridH,
      terrainSize: 1024,
      onEnterDungeon: (_portalId, dungeonId) => {
        const name = this.mountainTriad?.triad.dungeon.name ?? 'Evil Mountain Dungeon';
        // Home-island: E at cave mouth → PIP-style PvE boss chamber
        const entered = this.enterPveBossFromDoorway(
          dungeonId,
          name,
          'evil_mountain_door',
        );
        if (!entered) this.config.onDungeonEnter?.(dungeonId, name);
      },
    });
    if (!triadResult) return;

    const facingYaw = Math.atan2(-triadResult.anchor.x, -triadResult.anchor.z);
    this.mountainTriad = new EvilMountainTriadSystem(triadResult, facingYaw);
    this.ensurePveBossInstance();
    console.log(
      `[Island3D] Evil mountain triad — secret peak #${triadResult.secretIndex + 1}, dungeon: ${triadResult.dungeon.name}`,
    );
  }

  private createDecorations(): void {
    if (!this.terrain) return;

    const decoGroup = createScatterDecorations(
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
    );
    this.scene.add(decoGroup);
  }

  private createDetailLayers(): void {
    if (!this.terrain) return;

    const layerConfig = {
      biomeMap: this.terrain.biomeMap,
      terrainMesh: this.terrain.terrainMesh,
      gridW: this.terrain.gridW,
      gridH: this.terrain.gridH,
      terrainSize: 1024,
    };

    // Grass wave overlay (LOD patches)
    this.grassLayer = new DetailLayer({ ...layerConfig, type: 'grass' });
    this.scene.add(this.grassLayer.group);

    // Sand shore overlay (LOD patches)
    this.sandLayer = new DetailLayer({ ...layerConfig, type: 'sand' });
    this.scene.add(this.sandLayer.group);

    // Grass blades disabled — biggest GPU cost, kills mobile/low-end perf
    // this.grassBlades = createGrassBlades(layerConfig);
    // this.scene.add(this.grassBlades.mesh);
  }

  /**
   * Tab soft-lock: creatures (+ optional mountain boss) as cycle targets.
   * Also feeds skill combat hostiles + PlayModeStateManager Q-swap bridge.
   */
  private ensureSoftLockProvider(): void {
    if (!this.character) return;
    this.character.setSoftLockProvider(() => {
      const out: import('../player/SoftLockSystem').SoftLockTarget[] = [];
      const playerPos = this.character!.getPosition();
      if (this.creatures) {
        for (const t of this.creatures.listSoftLockTargets(playerPos, 36)) {
          out.push({
            id: t.id,
            name: t.name,
            kind: 'creature',
            position: t.position,
            hp: t.hp,
            maxHp: t.maxHp,
          });
        }
      }
      // Thornwood / mountain boss if present
      const boss = this.hiddenMountainCity as
        | { bossId?: string; bossName?: string; bossHp?: number; bossMaxHp?: number; bossPosition?: THREE.Vector3 }
        | null;
      if (boss?.bossPosition && (boss.bossHp ?? 1) > 0) {
        out.push({
          id: boss.bossId ?? 'hidden_mountain_boss',
          name: boss.bossName ?? 'Warden',
          kind: 'boss',
          position: boss.bossPosition.clone().add(new THREE.Vector3(0, 1.5, 0)),
          hp: boss.bossHp,
          maxHp: boss.bossMaxHp,
        });
      }
      return out;
    });

    // Skill projectiles / melee hit queries use same hostiles as soft-lock
    this.character.setSkillCombatHostiles(() => {
      const playerPos = this.character!.getPosition();
      const out: Array<{
        id: string;
        position: THREE.Vector3;
        hpFrac?: number;
        stun?: (sec: number) => void;
      }> = [];
      if (this.creatures) {
        for (const t of this.creatures.listSoftLockTargets(playerPos, 48)) {
          out.push({
            id: t.id,
            position: t.position.clone(),
            hpFrac: t.maxHp ? t.hp / t.maxHp : undefined,
            stun: (sec) => this.creatures?.applyStun(t.id, sec),
          });
        }
      }
      return out;
    });
    this.character.setSkillCombatFriendlies(() => {
      const out: Array<{ id: string; name?: string; position: THREE.Vector3; hpFrac?: number }> = [];
      if (this.allyManager) {
        for (const a of this.allyManager.getLiving()) {
          out.push({
            id: a.id,
            name: a.name,
            position: a.model.position.clone(),
            hpFrac: a.stats.maxHp ? a.hp / a.stats.maxHp : 1,
          });
        }
      }
      return out.slice(0, 3);
    });

    void this.connectPlayModeBridge();
  }

  /** Q-tap dual weapon + mode dock → equipment / anims. */
  private async connectPlayModeBridge(): Promise<void> {
    if (!this.character) return;
    try {
      const { getPlayModeStateManager } = await import('../player/PlayModeStateManager');
      const pm = getPlayModeStateManager();
      pm.connect({
        enterCombatMode: () => this.enterCombatMode(),
        enterHarvestMode: () => this.enterHarvestMode(),
        setHarvestRadialTool: (tool) => this.setHarvestRadialTool(tool),
        applyCombatWeapons: async ({ mainHand, secondary, activeSet }) => {
          if (!this.character) return;
          const next = {
            ...this.character.equipment,
            MainHand: mainHand,
            SecondaryWeapon: secondary,
          };
          // Active set is already mirrored into MainHand by PlayModeStateManager
          void activeSet;
          this.character.setEquipment(next);
        },
        getEquipment: () => this.character?.equipment ?? {},
      });
      pm.bindInput(window);
      pm.hydrateWeaponsFromEquipment(this.character.equipment);
    } catch (err) {
      console.warn('[Island3D] PlayModeStateManager bridge failed', err);
    }
  }

  /** Spawn or respawn the playable character on a labeled board cell */
  private async spawnCharacter(): Promise<void> {
    if (!this.terrain) return;

    const campPct = this.config.campPositionPercent ?? HOME_ISLAND_DEFAULT_CAMP_PERCENT;
    const campWorld = campPercentToWorld(campPct, HOME_ISLAND_WORLD_SIZE_M);
    const cellM = HOME_ISLAND_BOARD_CELL_M || BOARD_CELL_M;
    const { position: startPos, cell } = boardSpawnPosition(
      this.terrain.terrainMesh,
      campWorld.x,
      campWorld.z,
      HOME_ISLAND_WORLD_SIZE_M,
      cellM,
    );
    this.spawnBoardCell = cell;

    const noOcean =
      this.config.disableOcean !== false && HOME_ISLAND_DISABLE_OCEAN !== false;
    const waterLevel = noOcean ? -999 : PROCEDURAL_WATER_LEVEL;

    const physicsSampler = await this.armPhysicsLayer({
      meshes: [this.terrain.terrainMesh],
      spawn: startPos,
      waterLevel,
      existingSampler: (x, z) => getTerrainHeightAt(this.terrain!.terrainMesh, x, z),
      label: 'home-island',
    });

    this.character = new CharacterController3D({
      scene: this.scene,
      camera: this.camera,
      terrainMesh: this.terrain.terrainMesh,
      groundSampler: physicsSampler,
      startPosition: startPos,
      physics: {
        // Far below map when dry board so walk never enters swim state
        waterLevel,
        // SI: adult human yardstick (not 100× giant capsule)
        characterHeight: HUMAN_HEIGHT_M,
      },
      callbacks: this.config.physicsCallbacks,
    });
    this.character.setEntryLocked(false);
    this.character.setWorldFxBus?.(this.worldFx);
    if (this.physics) this.character.attachRapierCct(this.physics);

    console.log(
      `[Island3D] Hero on board cell ${cell.label} @ (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)}, ${startPos.z.toFixed(1)})`,
    );

    // Character owns the camera (TPC sole driver)
    this.setCameraMode('play_tps');
  }

  /** Update detail layers (grass/sand animation) */
  private updateDetailLayers(_dt: number): void {
    const time = this.timer.getElapsed();
    const camPos = this.camera.position;

    this.grassLayer?.update(time, camPos);
    this.sandLayer?.update(time, camPos);
    this.grassBlades?.update(time, camPos);
  }

  /** Update Gerstner wave ocean + production tide (2×/game day, gentle amp) */
  private updateWater(_dt: number): void {
    if (!this.waterPlane) return;
    const sunDir = this.dayNight?.getSunDirection();
    const tideH = getTideHeight(Date.now());
    const elapsed = this.timer.getElapsed();
    this.oceanReflectionRig?.setWaterLevel(tideH);
    this.underwaterPost?.setWaterLevel(tideH);

    const size = this.renderer.getSize(this._oceanRes);
    this._oceanRes.set(size.x * this.renderer.getPixelRatio(), size.y * this.renderer.getPixelRatio());

    if (isPirateLobbyOcean(this.waterPlane)) {
      updatePirateLobbyOcean(this.waterPlane, elapsed, sunDir, {
        tideHeight: tideH,
      });
      const pmat = this.waterPlane.material as THREE.ShaderMaterial;
      if (pmat?.uniforms?.uResolution) {
        pmat.uniforms.uResolution.value.copy(this._oceanRes);
      }
      this.creatures?.setWaterLevel?.(tideH);
    } else {
      this.waterPlane.position.y = tideH;
      const mat = this.waterPlane.material;
      if (mat && 'uniforms' in mat) {
        updateOceanMaterial(mat as THREE.ShaderMaterial, elapsed, sunDir, this._oceanRes);
      }
    }

    this.underwaterPost?.update(this.scene, this.camera);
  }

  /** Update harvestable animations, tree fall, growth regrow, debris drops */
  private updateHarvestables(dt: number): void {
    const now = Date.now();

    for (const tree of this.trees) {
      // Growing sapling animation (after stump / deplete)
      if ((tree as any).growthPhase === 'growing') {
        tickGrowth(tree as any, now);
        continue;
      }

      if (
        tree.shaking &&
        (tree.fallPhase === 'live' || tree.fallPhase === 'notching')
      ) {
        tree.shakeTime += dt;
        const shake = Math.sin(tree.shakeTime * 15) * Math.max(0, 0.1 - tree.shakeTime * 0.05);
        // Don't fully overwrite directional lean while notching
        if (tree.fallPhase === 'live') {
          tree.group.rotation.z = shake;
        } else {
          tree.group.rotation.y += shake * 0.15;
        }
        if (tree.shakeTime > 2) {
          tree.shaking = false;
          tree.shakeTime = 0;
          if (tree.fallPhase === 'live') tree.group.rotation.z = 0;
        }
      }

      if (tree.fallPhase === 'falling') {
        const finished = updateTreeFall(tree, dt);
        if (finished && !this.treeFallCompleting.has(tree)) {
          this.treeFallCompleting.add(tree);
          void this.completeTreeFall(tree);
        }
      }

      // Stump → begin visible growth when respawn timer elapses
      if (tree.respawnAt > 0 && now >= tree.respawnAt && tree.fallPhase === 'stump') {
        this.treeFallCompleting.delete(tree);
        resetHarvestableTree(tree, tree.baseScale);
      }
    }

    // Firewood collectibles + pinata fragments
    if (this.firewoodChop) {
      const p = this.character?.model.position;
      const wood = this.firewoodChop.update(dt, p);
      if (wood > 0) {
        this.config.onHarvest?.({
          resourceType: 'forest',
          position: p?.clone() ?? new THREE.Vector3(),
          amount: wood,
        } as any);
      }
    }
    this.pinataHarvest?.update(dt);

    for (const rock of this.rocks) {
      if ((rock as any).growthPhase === 'growing') {
        tickGrowth(rock as any, now);
        continue;
      }
      if (rock.chipping) {
        rock.chipTime += dt;
        if (rock.chipTime > 0.3) {
          rock.chipping = false;
          rock.chipTime = 0;
        }
      }
      if (rock.respawnAt > 0 && now >= rock.respawnAt && !rock.group.visible) {
        resetHarvestableRock(rock);
      }
    }

    for (const crystal of this.crystals) {
      if ((crystal as any).growthPhase === 'growing') {
        tickGrowth(crystal as any, now);
        continue;
      }
      if (crystal.chipping) {
        crystal.chipTime += dt;
        if (crystal.chipTime > 0.3) {
          crystal.chipping = false;
          crystal.chipTime = 0;
        }
      }
      if (crystal.respawnAt > 0 && now >= crystal.respawnAt && !crystal.group.visible) {
        resetHarvestableCrystal(crystal);
      }
    }

    for (const hemp of this.hemps) {
      if ((hemp as any).growthPhase === 'growing') {
        tickGrowth(hemp as any, now);
        continue;
      }
      if (hemp.respawnAt > 0 && now >= hemp.respawnAt && !hemp.group.visible) {
        resetSimpleHarvestNode(hemp, 'hemp');
      }
    }
    for (const flower of this.flowers) {
      if ((flower as any).growthPhase === 'growing') {
        tickGrowth(flower as any, now);
        continue;
      }
      if (flower.respawnAt > 0 && now >= flower.respawnAt && !flower.group.visible) {
        resetSimpleHarvestNode(flower, 'flower');
      }
    }
    for (const scrap of this.scraps) {
      if ((scrap as any).growthPhase === 'growing') {
        tickGrowth(scrap as any, now);
        continue;
      }
      if (scrap.respawnAt > 0 && now >= scrap.respawnAt && !scrap.group.visible) {
        resetSimpleHarvestNode(scrap, 'scrap');
      }
    }

    this.harvestDrops = updateHarvestDrops(this.harvestDrops, dt, this.scene);
  }

  /**
   * Playable lava Caesar lab: ember volcanic room, 50% gravity, explorer mesh,
   * tank/healer/dps allies, combat timer events.
   */
  public async startLavaCaesarLab(): Promise<void> {
    const { LAVA_CAESAR_LOAD, LAVA_CAESAR_KIT } = await import(
      '@shared/definitions/lavaCaesarBossFight'
    );
    const { VOLCANIC_BOSS_ARENA } = await import(
      '@shared/definitions/floatingIslandBossAssets'
    );
    const { LavaCaesarPartyBrain } = await import('../combat/LavaCaesarPartyBrain');
    this.ensureBossRooms();
    for (let i = 0; i < 50 && !this.bossRooms; i++) {
      await new Promise((r) => setTimeout(r, 80));
    }
    const pos = this.character?.model.position;
    if (!pos || !this.bossRooms) {
      console.warn('[LavaLab] no character or boss room');
      return;
    }
    const ok = this.bossRooms.enter(pos, 'event_island_portal', VOLCANIC_BOSS_ARENA.id);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      this.bossRooms.enter(pos, 'event_island_portal', VOLCANIC_BOSS_ARENA.id);
    }
    try {
      await this.character?.loadModel(LAVA_CAESAR_LOAD.explorer[0]);
    } catch (e) {
      console.warn('[LavaLab] explorer load failed — keeping current mesh', e);
    }
    this.lavaParty = new LavaCaesarPartyBrain();
    const labAllies: import('../ai/AllyController').AllyController[] = [];
    await new Promise((r) => setTimeout(r, 700));
    const mesh = this.character?.model;
    if (this.scene && mesh) {
      const { AllyController } = await import('../ai/AllyController');
      const { TerrainNavMesh } = await import('../navigation/TerrainNavMesh');
      let nav = this.navMesh;
      let terrain = this.terrain?.terrainMesh;
      if (!nav || !terrain) {
        const dummy = new THREE.Mesh(new THREE.PlaneGeometry(90, 90));
        dummy.rotation.x = -Math.PI / 2;
        dummy.position.copy(pos);
        dummy.updateMatrixWorld(true);
        terrain = dummy;
        nav = new TerrainNavMesh(dummy, [['plains' as any]], 1, 1, 90, 90, {
          bakePathfinding: false,
          cellSize: 6,
          zoneId: 'lava_caesar_lab',
        });
      }
      if (nav && terrain) {
        const roles = ['tank', 'healer', 'dps'] as const;
        const boss = this.bossRooms.largeBoss;
        for (let i = 0; i < 3; i++) {
          const slot = boss?.loadSlotWorld(i + 1) ?? pos.clone().add(new THREE.Vector3((i - 1) * 3, 0, 2));
          const ally = new AllyController(
            {
              id: `lava_${roles[i]}`,
              name: roles[i]!.toUpperCase(),
              position: slot,
              stats: {
                maxHp: roles[i] === 'tank' ? 220 : roles[i] === 'healer' ? 140 : 160,
                damage: roles[i] === 'dps' ? 28 : 16,
                attackRange: 2.6,
                attackCooldown: 1.4,
                moveSpeed: 4.8,
                aggroRadius: 22,
                followDistance: 3.2,
              },
            },
            nav,
            terrain,
            this.scene,
          );
          ally.onAttack = (t, dmg) => {
            this.bossRooms?.tryHitBoss(t.position, dmg);
          };
          this.lavaParty.attach(ally, roles[i]!);
          labAllies.push(ally);
        }
      }
    }
    this.onUpdate((dt) => {
      const snap = this.bossRooms?.largeBoss?.getLavaSnapshot();
      const p = this.character?.model.position;
      if (snap && p && this.lavaParty) {
        this.lavaParty.tick(dt, p, {
          ...snap,
          minions: snap.minions,
        });
        for (const a of labAllies) a.update(dt, p, snap.minions);
      }
      try {
        window.dispatchEvent(
          new CustomEvent('grudge:lava-caesar-lab', {
            detail: {
              timer: snap?.combatT ?? 0,
              hp: snap?.bossHpRatio ?? 1,
              state: snap?.bossState ?? 'idle',
              gravity: LAVA_CAESAR_KIT.gravityScale,
            },
          }),
        );
      } catch {
        /* */
      }
    });
    void LAVA_CAESAR_KIT;
  }

  /** Dock + atoll raft lab — scene (9), hatchet logs, one-log raft. */
  public async startDockRaftLab(): Promise<void> {
    const { DockRaftLabSystem } = await import('../zone/DockRaftLabSystem');
    const { FIREWOOD_CHOP_ONE_LOG } = await import('@shared/definitions/firewoodChop');
    const { DOCK_RAFT_ITEM } = await import('@shared/definitions/dockRaftTestMap');
    this.ensureFirewoodChop();
    this.firewoodChop?.setConfig(FIREWOOD_CHOP_ONE_LOG);
    for (let i = 0; i < 40 && !this.physics; i++) {
      await new Promise((r) => setTimeout(r, 80));
    }
    this.dockRaftLab = new DockRaftLabSystem({
      scene: this.scene,
      physics: this.physics,
      addTree: (t) => {
        this.trees.push(t);
      },
    });
    const ok = await this.dockRaftLab.boot();
    if (!ok) return;
    const spawn = this.dockRaftLab.spawnPoint();
    if (this.character) {
      this.character.model.position.copy(spawn);
      this.character.setGroundSampler((x, z) => {
        const y = this.dockRaftLab?.play?.sampleHeight(x, z);
        if (y != null) return y;
        return this.zoneGroundSampler?.(x, z) ?? null;
      });
    }
    void this.enterHarvestMode();
    const origHarvest = this.config.onHarvest;
    this.config.onHarvest = (ev) => {
      const amt = (ev as { amount?: number }).amount;
      if (typeof amt === 'number' && amt > 0) {
        this.adjustItem(DOCK_RAFT_ITEM.log, amt);
      }
      origHarvest?.(ev);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.code !== 'KeyE') return;
      const p = this.character?.model.position;
      if (!p || !this.dockRaftLab) return;
      const wood = this.getMergedInventory()[DOCK_RAFT_ITEM.log] ?? 0;
      const r = this.dockRaftLab.tryPlaceLog(p, wood);
      if (r.placed) this.adjustItem(DOCK_RAFT_ITEM.log, -1);
    };
    window.addEventListener('keydown', onKey);
    this.onUpdate(() => {
      const wood = this.getMergedInventory()[DOCK_RAFT_ITEM.log] ?? 0;
      try {
        window.dispatchEvent(
          new CustomEvent('grudge:dock-raft-lab', {
            detail: this.dockRaftLab?.snapshot(wood),
          }),
        );
      } catch {
        /* */
      }
    });
  }

  /** Hoth / woods / desert / lava instance maps (preload sector room). */
  private ensureBossRooms(): void {
    if (this.bossRooms || !this.scene) return;
    const sectorId = this.config.sectorId || '';
    try {
      this.bossRooms = new BossRoomInstanceSystem({
        scene: this.scene,
        sectorId,
        worldFx: this.worldFx,
        physics: this.physics,
        cb: {
          onEnter: (roomId, bossId, play) => {
            console.info(`[BossRoom] enter ${roomId} boss=${bossId}`, play?.layerCounts);
            this.character?.setGroundSampler((x, z) => {
              const y = this.bossRooms?.sampleHeight(x, z);
              if (y != null) return y;
              return this.zoneGroundSampler?.(x, z) ?? null;
            });
            if (roomId === 'volcanic_boss_arena' && this.character) {
              this._savedGravity = this.character.physics.gravity;
              this.character.physics.gravity = this._savedGravity * 0.5;
            }
          },
          onExit: (roomId) => {
            console.info(`[BossRoom] exit ${roomId}`);
            this.character?.setGroundSampler(this.zoneGroundSampler);
            if (this.character && this._savedGravity != null) {
              this.character.physics.gravity = this._savedGravity;
              this._savedGravity = null;
            }
            void roomId;
          },
          onBossDeath: (bossId) => {
            try {
              window.dispatchEvent(
                new CustomEvent('grudge:boss-room', {
                  detail: { type: 'death', bossId },
                }),
              );
            } catch {
              /* */
            }
          },
          onPlayerHit: (hit) => {
            this.applyBossHitToPlayer(hit);
            try {
              window.dispatchEvent(
                new CustomEvent('grudge:boss-room', {
                  detail: { type: 'hit', ...hit },
                }),
              );
            } catch {
              /* */
            }
          },
          onPrompt: (msg) => {
            try {
              window.dispatchEvent(
                new CustomEvent('grudge:boss-room', { detail: { prompt: msg } }),
              );
            } catch {
              /* */
            }
          },
        },
      });
    } catch (err) {
      console.warn('[Island3D] BossRoomInstanceSystem failed:', err);
    }
  }

  /** Ensure shared PvE boss chamber (home mountain door + Warlords doors). */
  private ensurePveBossInstance(): void {
    if (this.pveBossInstance || !this.scene) return;
    this.pveBossInstance = new PveBossInstanceSystem({
      scene: this.scene,
      worldFx: this.worldFx,
      cb: {
        onEnter: (id, name, source) => {
          console.info(`[Island3D] PvE instance enter ${id} (${source})`);
          this.config.onDungeonEnter?.(id, name);
        },
        onExit: (id) => console.info(`[Island3D] PvE instance exit ${id}`),
        onBossDeath: (bossId, dungeonId) => {
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:pve-boss-instance', {
                detail: { type: 'death', bossId, dungeonId },
              }),
            );
          } catch {
            /* */
          }
        },
        onPlayerHit: (hit) => this.applyBossHitToPlayer(hit),
        onPrompt: (msg) => {
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:pve-boss-instance', {
                detail: { type: 'prompt', prompt: msg },
              }),
            );
          } catch {
            /* */
          }
        },
      },
    });
  }

  /**
   * Enter PIP-style PvE boss chamber from mountain / city / dungeon doorway.
   */
  enterPveBossFromDoorway(
    dungeonId: string,
    dungeonName: string,
    source:
      | 'evil_mountain_door'
      | 'hidden_mountain_city_door'
      | 'warlords_dungeon_portal'
      | 'sector_boss_arena'
      | 'home_island_mine',
  ): boolean {
    if (!this.character) return false;
    const sectorId = this.config.sectorId || '';
    const instance = pickBossRoomInstance({ sectorId, dungeonId, dungeonName });
    if (instance) {
      this.ensureBossRooms();
      return (
        this.bossRooms?.enter(
          this.character.model.position,
          'random_dungeon_portal',
          instance.id,
        ) ?? false
      );
    }
    this.ensurePveBossInstance();
    return (
      this.pveBossInstance?.enter(this.character.model.position, {
        dungeonId,
        dungeonName,
        source,
        bossId: `${dungeonId}_colossus`,
      }) ?? false
    );
  }

  /**
   * Boss AoE / shockwave / stun → CharacterController physical knockback.
   * Uses HitResponseSystem.resolveBossHitResponse for consistent feel.
   */
  private applyBossHitToPlayer(hit: LargeBossHitEvent): void {
    if (!this.character) return;
    if (this.character.invincible) return;

    const origin = hit.origin ?? this.character.getPosition();
    const target = hit.targetPos ?? this.character.getPosition();
    const response = resolveBossHitResponse({
      damage: hit.damage,
      kind: hit.kind,
      origin,
      targetPos: target,
      knockdown: hit.knockdown,
      stunSec: hit.stunSec,
      knockbackMps: hit.knockbackMps,
      knockUpMps: hit.knockUpMps,
    });

    const delta = response.dir.clone().multiplyScalar(response.knockback);
    delta.y = response.knockUp;
    this.character.applyCombatHit(delta, response.stunSec, {
      knockdown: hit.knockdown || response.knockUp >= 4,
      anim: response.anim,
    });

    if (hit.damage > 0) {
      this.config.physicsCallbacks?.onFallDamage?.(
        Math.min(40, hit.damage * 0.08),
      );
      this.worldFx?.weaponSkillImpact?.(
        target.clone().add(new THREE.Vector3(0, 1.1, 0)),
        /electric/i.test(hit.kind) ? 'lightning' : 'fire',
        response.impactScale,
      );
      if (/slam|stomp|shockwave|meteor|rock/i.test(hit.kind) || response.impactScale >= 2.0) {
        this.worldFx?.groundSlamBreak(target.clone());
      }
    }
  }

  /** Lazy-init pinata + firewood chop (home island / zones that have trees). */
  private ensureFirewoodChop(): void {
    if (this.firewoodChop) return;
    if (!this.scene) return;
    this.pinataHarvest = new PinataHarvestBreakSystem(this.scene, this.physics);
    this.firewoodChop = new FirewoodChopSystem({
      scene: this.scene,
      pinata: this.pinataHarvest,
      cb: {
        onPrompt: (msg) => {
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:firewood-chop', {
                detail: { type: 'prompt', prompt: msg },
              }),
            );
          } catch {
            /* */
          }
        },
        onFell: (tree, yaw) => {
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:firewood-chop', {
                detail: {
                  type: 'fell',
                  nodeId: tree.nodeId,
                  fallYaw: yaw,
                },
              }),
            );
          } catch {
            /* */
          }
        },
        onSegmentSplit: (tree, segment) => {
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:firewood-chop', {
                detail: {
                  type: 'segment',
                  nodeId: tree.nodeId,
                  segment,
                },
              }),
            );
          } catch {
            /* */
          }
        },
        onWoodCollected: (qty) => {
          try {
            window.dispatchEvent(
              new CustomEvent('grudge:firewood-chop', {
                detail: { type: 'collect', qty },
              }),
            );
          } catch {
            /* */
          }
        },
      },
    });
  }

  /**
   * One harvest swing: pickaxe/hand IK at the ray hit, then pinata chip/shatter.
   * Reuses PinataHarvestBreak + CharacterController3D — not a second harvest world.
   */
  private strikeHarvestImpact(
    nodeClass: HarvestNodeClass,
    target: THREE.Object3D,
    impact: THREE.Vector3,
    opts: { depleted: boolean; scale?: number; nodeId?: string; hitIndex?: number },
  ): void {
    this.ensureFirewoodChop();
    const nodeId =
      opts.nodeId ||
      (typeof target.userData?.harvestNodeId === 'string'
        ? target.userData.harvestNodeId
        : target.uuid);
    this.character?.pulseHarvestHandIk(impact, nodeId);
    this.character?.playHarvestSwing();
    const origin = this.character?.model.position ?? this.camera.position;
    const impactDir = new THREE.Vector3(
      impact.x - origin.x,
      0.12,
      impact.z - origin.z,
    );
    if (impactDir.lengthSq() < 1e-6) impactDir.set(0, 0.2, 1);
    else impactDir.normalize();
    this.pinataHarvest?.breakNode(nodeClass, target, {
      mode: opts.depleted ? 'shatter' : 'chip',
      impactPoint: impact,
      impactDir,
      scale: opts.scale ?? 1,
      nodeId,
      hitIndex: opts.hitIndex ?? 0,
    });
  }

  private async completeTreeFall(tree: HarvestableTree): Promise<void> {
    // Firewood path: keep fallen trunk for ground splitting (do not stump yet)
    if (this.firewoodChop) {
      this.firewoodChop.onFallComplete(tree);
      this.treeFallCompleting.delete(tree);
      // Small log chips on impact
      const pos = tree.group.position.clone();
      const drops = await spawnResourceDrops(this.scene, pos, 'log', 1);
      this.harvestDrops.push(...drops);
      return;
    }
    // Legacy: stump + log drops immediately
    const pos = tree.group.position.clone();
    const scale = tree.baseScale;
    await swapTreeToStump(tree, scale);
    const drops = await spawnResourceDrops(this.scene, pos, 'log', 3);
    this.harvestDrops.push(...drops);
    this.config.onHarvest?.({
      nodeId: tree.nodeId,
      resourceType: 'forest',
      position: pos,
    });
  }

  private async emitHarvestDrops(
    position: THREE.Vector3,
    kind: HarvestDropKind,
    count: number,
    nodeId: string | undefined,
    resourceType: string,
  ): Promise<void> {
    const drops = await spawnResourceDrops(this.scene, position, kind, count);
    this.harvestDrops.push(...drops);
    this.config.onHarvest?.({ nodeId, resourceType, position: position.clone() });
  }

  private async spawnRockDebris(rock: HarvestableRock, count: number): Promise<void> {
    const dropType = rock.oreVariant ? 'gold' : 'debris';
    const drops = await spawnResourceDrops(this.scene, rock.group.position, dropType, count);
    this.harvestDrops.push(...drops);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer.reset();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /** Sim time multiplier — day/night and session tick rate (1 = realtime) */
  public simTickRate = 1;

  private loop = (timestamp?: number): void => {
    if (!this.isRunning) return;

    // Timer: update once per frame, then read delta/elapsed any number of times safely
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const elapsed = this.timer.getElapsed();
    const simDt = dt * this.simTickRate;

    // Rapier fixed 1/60 — after load-gate; harvest fragments + CCT pad
    this.physics?.update(dt);

    // Camera ownership: one mode writes the lens (TPC vs Orbit vs cinematic)
    if (this.cameraMode === 'cinematic') {
      // External cinematic owns camera.position — still tick character anim if present
      if (this.character) {
        this.character.cameraFollowEnabled = false;
        this.character.update(dt);
      }
    } else if (playCameraActive(this.cameraMode) && this.characterActive && this.character) {
      this.character.cameraFollowEnabled = true;
      if (this.lobbyShip) {
        this.lobbyShip.update(dt, this.character.getKeys(), this.character.getCameraYaw());
        // Boat wake when sailing
        if (this.boatWake && this.lobbyShip.isBoarded) {
          const root = this.lobbyShip.dockGroup;
          const pos = root.position;
          let speed = 0;
          if (this._shipHasPrev) {
            speed =
              Math.hypot(pos.x - this._shipPrevPos.x, pos.z - this._shipPrevPos.z) /
              Math.max(dt, 1e-4);
          }
          this._shipPrevPos.copy(pos);
          this._shipHasPrev = true;
          const waterY =
            (this.waterPlane?.userData?.waterLevel as number | undefined)
            ?? this.waterPlane?.position.y
            ?? 0;
          this.boatWake.update(dt, this.lobbyShip.shipGroup, root.rotation.y, waterY, speed);
        } else {
          this._shipHasPrev = false;
          this.boatWake?.clear();
        }
      }
      this.character.update(dt);
      this.ensureSoftLockProvider();
      const cw = this.config.canvas?.clientWidth || window.innerWidth;
      const ch = this.config.canvas?.clientHeight || window.innerHeight;
      this.character.updateSoftLock(cw, ch);
    } else if (orbitEnabledForMode(this.cameraMode)) {
      if (this.character) this.character.cameraFollowEnabled = false;
      this.controls.update();
    }

    if (this.lobbyCapture && this.character) {
      this.lobbyCapture.update(dt, this.character.getPosition(), this.lobbyCapturing);
    }

    if (this.lobbyPlayZone && this.character) {
      this.lobbyPlayZone.npcController.setPlayerPosition(this.character.getPosition());
      this.lobbyPlayZone.update(dt, this.camera.position);
    }

    if (this.factionIslands) {
      this.factionIslands.update(
        dt,
        this.character?.getPosition() ?? undefined,
      );
    }

    this.updateWater(dt);
    this.updateHarvestables(dt);
    this.updateDetailLayers(dt);
    this.zoneScene?.update(dt, elapsed);
    this.lobbyAnimMixer?.update(dt);
    this.multiplayer?.update(dt);

    // Day/night cycle
    this.dayNight?.update(simDt);

    // Ally AI — feed player position + current enemies from multiplayer
    if (this.allyManager && this.character) {
      const enemies: CombatTarget[] = [];
      if (this.multiplayer) {
        for (const [, e] of this.multiplayer.enemies) {
          enemies.push({
            id: e.id,
            position: new THREE.Vector3(e.x, e.y, e.z),
            hp: e.hp,
            dead: e.hp <= 0,
          });
        }
      }
      this.allyManager.update(dt, this.character.getPosition(), enemies);
    }

    // Camp garrison AI orders / follow refresh
    this.campUnits?.setAllyManager(this.allyManager);
    this.campUnits?.update(dt);

    // Wildlife AI
    if (this.creatures && this.character) {
      this.creatures.update(dt, this.character.getPosition());
    } else if (this.creatures) {
      this.creatures.update(dt, this.camera.position);
    }

    // Mountain dungeon portal (revealed when player walks behind secret peak)
    if (this.mountainTriad && this.character) {
      this.mountainTriad.update(dt, this.character.getPosition());
    }

    // Mines — show prompt, 4s run timer
    if (this.mineSystem) {
      const charRoot = this.character?.model ?? null;
      this.mineSystem.update(
        dt,
        this.character ? this.character.getPosition() : null,
        charRoot,
      );
    }

    // Zone race capital + dungeon portals
    if (this.havenFoundation) {
      this.havenFoundation.update(dt, elapsed);
    }
    if (this.fabledFoundation && this.character) {
      this.fabledFoundation.update(dt, this.character.getPosition());
    }
    if (this.zoneCapital) {
      this.zoneCapital.update(dt, elapsed);
    }
    if (this.zoneDungeonPortals && this.character) {
      this.zoneDungeonPortals.update(dt, this.character.getPosition());
    }
    if (this.caveInteriors && this.character) {
      this.caveInteriors.setCharacter(this.character);
      this.caveInteriors.update(dt, this.character.getPosition());
    }
    if (this.hiddenMountainCity && this.character) {
      this.hiddenMountainCity.update(dt, this.character.getPosition(), {
        attacking: this.character.isAttacking,
      });
    }

    // Ethereal Falls destruction field — track player, pull surface entities
    if (this.etherealDestruction) {
      if (this.character) {
        // Mutate model.position so tip-pull actually moves the player
        const pos = this.character.model.position;
        const flying =
          !!(this.character as { isFlying?: boolean }).isFlying ||
          !!(this.character as { flying?: boolean }).flying;
        this.etherealDestruction.track({
          id: 'local_player',
          kind: flying ? 'player_flying' : 'player_surface',
          position: pos,
          flying,
        });
      }
      // Ally permanent death: dead allies last seen in the destruction field
      if (this.allyManager) {
        for (const a of this.allyManager.getAll()) {
          if (a.state !== 'dead') continue;
          this.etherealDestruction.onAllyDeath(a.id, a.model.position);
        }
      }
      this.etherealDestruction.update(dt);
    }

    this.etherealFloatIslands?.update(dt);
    this.eventIslands?.update(dt);
    this.bossRooms?.update(dt, this.character?.model.position);
    this.pveBossInstance?.update(dt, this.character?.model.position);
    // Arena / dungeon PIP bosses (open-zone boss_arena nodes)
    this.arenaBosses?.forEach((b) => b.update(dt, this.character?.model.position));
    if (this.volcanicClimb) {
      const p = this.character?.model.position;
      this.volcanicClimb.update(dt, p);
    }

    if (this.harvestZones && !this.lobbyPlayZone) {
      this.harvestZones.update(dt, this.camera.position);
    }

    // Farm plots — crop growth after watering
    this.farmPlots?.update(dt);

    // Fire / smoke particles + CastingMaster lightweight ribbons
    this.worldFx?.update(dt);
    (this as any)._spellFx?.update?.(dt);

    // Ground loot sprites (rotate + bob + E prompt)
    if (this.groundLoot) {
      const p = this.character?.getPosition() ?? null;
      this.groundLoot.update(dt, p);
    }

    // External update hooks (RemotePlayerManager, TownNPCController, etc.)
    for (const fn of this.externalUpdates) fn(dt);

    // Ocean dual-pass RTs (hide ocean, render reflect/refract) then main frame
    if (this.oceanReflectionRig && this.waterPlane) {
      this.oceanReflectionRig.update(
        this.renderer,
        this.scene,
        this.camera,
        this.waterPlane,
      );
    }

    // Render via post-processing pipeline (or raw fallback)
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing?.resize(width, height);
  }

  /**
   * World prop node / asset id for E-to-learn recipes (ice biome chests, stations, etc.).
   * Set by play layer when player is in range of a learnable multipack prop.
   */
  nearestLearnAssetId: string | null = null;

  /**
   * Lazy-init ground loot system (icon sprites + E pickup).
   * Call after terrain exists; safe to call multiple times.
   */
  ensureGroundLoot(
    onPickup?: (pile: GroundLootPile, items: GroundLootItem[]) => void,
  ): GroundLootSystem {
    if (this.groundLoot) {
      if (onPickup) this.groundLoot.setPickupHandler(onPickup);
      return this.groundLoot;
    }
    const sampleY = (x: number, z: number) => {
      if (this.terrain?.terrainMesh) {
        return getTerrainHeightAt(this.terrain.terrainMesh, x, z);
      }
      const lobby = this.sampleLobbyGroundHeight(x, z);
      return lobby ?? 0;
    };
    this.groundLoot = new GroundLootSystem(this.scene, sampleY, {
      onPickup:
        onPickup ??
        ((_, items) => {
          for (const it of items) {
            const bag = this.getMergedInventory();
            bag[it.itemId] = (bag[it.itemId] ?? 0) + it.quantity;
            this.commitInventory(bag);
          }
        }),
    });
    return this.groundLoot;
  }

  /**
   * Drop world loot pile at position (chest / creature / reward).
   * Icons resolved via shared itemIcons.
   */
  spawnGroundLoot(
    position: THREE.Vector3,
    items: Array<{ itemId: string; name?: string; quantity?: number; iconUrl?: string; rarity?: string }>,
    source = 'drop',
  ): string {
    const sys = this.ensureGroundLoot();
    return sys.spawn(position, items, source);
  }

  /** Press E/F near interactables — loot first, then mine, dungeon portal, ship dock, recipe learn. */
  handleInteractKey(): boolean {
    // Ground loot piles (icon sprites) — highest priority when near
    if (this.character && this.groundLoot?.tryPickup(this.character.getPosition())) {
      return true;
    }
    // Inside PvE boss chamber: E near blue ring exits
    if (this.pveBossInstance?.isInside && this.character) {
      if (this.pveBossInstance.tryExit(this.character.model.position)) return true;
    }
    if (this.mineSystem?.tryInteract()) return true;
    if (this.mountainTriad?.tryInteract()) return true;
    if (this.fabledFoundation?.tryInteract()) return true;
    if (this.zoneDungeonPortals?.tryInteract()) return true;
    if (this.character && this.caveInteriors?.tryInteract(this.character.getPosition())) return true;
    if (this.hiddenMountainCity && this.character) {
      if (this.hiddenMountainCity.tryInteract(this.character.getPosition())) return true;
    }

    // Ice/snow event assets: E once per character to learn craft recipe
    if (this.nearestLearnAssetId) {
      void import('@/lib/recipeLearn').then(({ tryLearnRecipeFromAsset }) => {
        void tryLearnRecipeFromAsset(this.nearestLearnAssetId!);
      });
      return true;
    }

    if (this.character && this.lobbyShip) {
      if (this.lobbyShip.isBoarded) {
        const off = this.lobbyShip.tryDisembark(this.lobbyResult!.scene);
        if (off) {
          this.character.teleportTo(off);
          this.character.stateMachine?.transition('idle');
          return true;
        }
      } else if (this.lobbyShip.isNearDock(this.character.getPosition())) {
        this.dockInteractPending = true;
        return true;
      }
    }

    if (this.lobbyCapture && this.character) {
      const near = this.lobbyCapture.getNearest(this.character.getPosition());
      if (near) {
        this.lobbyCapturing = true;
        return true;
      }
    }
    return false;
  }

  stopCapturing(): void {
    this.lobbyCapturing = false;
  }

  get capturedPointCount(): number {
    return this.lobbyCapture?.points.filter((p) => p.owner === 'player').length ?? 0;
  }

  /**
   * Map equipped weapon / class to supernova impact damage type
   * (original / blue / purple / yellow tints).
   */
  resolvePlayerDamageType(): string {
    const wt = (this.character?.weaponType ?? 'sword').toLowerCase();
    if (wt.includes('staff') || wt.includes('wand') || wt.includes('tome') || wt.includes('grimoire')) {
      return 'arcane';
    }
    if (wt.includes('bow') || wt.includes('crossbow') || wt.includes('gun') || wt.includes('rifle')) {
      return 'physical';
    }
    if (wt.includes('dagger') || wt.includes('knife')) return 'physical';
    // Mage-ish class id
    const cls = (this.character as { classId?: string } | null)?.classId?.toLowerCase?.() ?? '';
    if (cls.includes('mage') || cls.includes('mystic') || cls.includes('sorcer')) return 'arcane';
    if (cls.includes('priest') || cls.includes('paladin') || cls.includes('cleric')) return 'holy';
    if (cls.includes('warlock') || cls.includes('necro') || cls.includes('shadow')) return 'shadow';
    return 'physical';
  }

  /** Is the dungeon portal prompting interaction? */
  get dungeonPortalActive(): boolean {
    if (this.pveBossInstance?.isInside) return true;
    if (
      (this.mountainTriad?.canInteract ?? false) ||
      (this.fabledFoundation?.canInteract ?? false) ||
      (this.zoneDungeonPortals?.canInteract ?? false)
    ) {
      return true;
    }
    // Unsealed under-mountain city door
    if (this.hiddenMountainCity?.bossDefeated && this.character) {
      const prompt = this.hiddenMountainCity.getPrompt(this.character.getPosition());
      return Boolean(prompt && prompt.includes('Press E'));
    }
    return false;
  }

  /** True while player is inside mountain / Warlords PvE boss chamber */
  get inPveBossInstance(): boolean {
    return !!this.pveBossInstance?.isInside;
  }

  get pveBossInstancePrompt(): string | null {
    if (!this.pveBossInstance?.isInside) return null;
    const boss = this.pveBossInstance.largeBoss;
    if (boss?.isAlive) {
      return `Colossus · ${Math.round(boss.hpRatio * 100)}% — dodge telegraphs · E at blue ring to flee`;
    }
    return 'Boss fallen — Press E at blue ring to leave';
  }

  /** HUD hint for the evil mountain triad (approach / discovered / interact). */
  get mountainHintState() {
    return this.mountainTriad?.hintState ?? 'none';
  }

  /** Name of the home-island dungeon behind the secret peak. */
  get mountainDungeonName(): string | null {
    return this.mountainTriad?.triad.dungeon.name ?? null;
  }

  /**
   * Thornwood Wilds hidden city — boss HP / locked door / enter prompt.
   * Null when not in sector or player is out of range.
   */
  get hiddenMountainCityPrompt(): string | null {
    if (!this.hiddenMountainCity || !this.character) return null;
    return this.hiddenMountainCity.getPrompt(this.character.getPosition());
  }

  /** Boss HP fraction 0–1 for HUD bar (null if boss dead or system inactive). */
  get hiddenMountainCityBossHp(): { hp: number; maxHp: number } | null {
    if (!this.hiddenMountainCity || this.hiddenMountainCity.bossDefeated) return null;
    return {
      hp: this.hiddenMountainCity.bossHp,
      maxHp: this.hiddenMountainCity.bossMaxHp,
    };
  }

  /** Active ground tool for harvest mode (HUD override wins over equipment). */
  getActiveGroundTool(): GroundToolId {
    if (this.harvestToolOverride) return this.harvestToolOverride;
    if (this.character) {
      if (hasShovelEquipped(this.character.equipment)) return 'shovel';
      if (hasHoeEquipped(this.character.equipment)) return 'hoe';
      if (hasBucketEquipped(this.character.equipment)) return 'bucket';
      const t = getEquippedToolType(this.character.equipment);
      if (t === 'seed') return 'seed';
    }
    return null;
  }

  /** True when harvest shovel terrain sculpt is active (equip or HUD override). */
  isShovelTerrainActive(): boolean {
    return this.getActiveGroundTool() === 'shovel';
  }

  isHoeActive(): boolean {
    return this.getActiveGroundTool() === 'hoe';
  }

  isSeedPlantActive(): boolean {
    return this.getActiveGroundTool() === 'seed' && !!this.selectedSeedId;
  }

  isBucketActive(): boolean {
    return this.getActiveGroundTool() === 'bucket';
  }

  setHarvestToolOverride(tool: GroundToolId): void {
    this.harvestToolOverride = tool;
    if (tool === 'bucket' && !this.bucketHasWater && (this.farmInventory[ITEM_WATER_BUCKET] ?? 0) > 0) {
      this.bucketHasWater = true;
    }
  }

  /**
   * Select R-radial harvest tool. Hatchet is default; build hammer opens build UI
   * while control stays harvest-shell (character freeMove + hammer mesh via 'build').
   */
  async setHarvestRadialTool(tool: HarvestRadialToolId): Promise<void> {
    this.activeHarvestTool = tool;
    if (tool !== 'toolkit') {
      this.lastHarvestTool = tool;
    }
    this.harvestBuildUiOpen = tool === 'toolkit';

    // Ground-tool override only for farm tools; radial tools clear ground override
    this.harvestToolOverride = null;

    // Reflect as MainHand id for harvest action resolution (fishing rod, axe, etc.)
    if (this.character) {
      const mainHandId =
        tool === 'axe' ? 't0_hatchet'
        : tool === 'pickaxe' ? 't0_pickaxe'
        : tool === 'skinning_knife' ? 't0_knife'
        : tool === 'fishing_rod' ? 't0_fishing_rod'
        : tool === 'toolkit' ? 'build_hammer'
        : null;
      this.character.setEquipment({
        ...this.character.equipment,
        MainHand: mainHandId,
      });
    }

    if (tool === 'toolkit') {
      // Free-move + build hammer mesh; HUD still treats this as harvest sub-state
      await this.character?.setControlMode('build');
      this.ensureSectionalDamage();
      if (this.hammerRepair) this.hammerRepair.enabled = true;
    } else {
      // Stay / return to harvest: sheath weapons, no hammer
      if (this.character?.mode === 'build' || this.character?.hasBuildHammer) {
        this.cancelBuilding();
      }
      await this.character?.setControlMode('harvest');
      if (this.hammerRepair) {
        this.hammerRepair.enabled = false;
        this.hammerRepair.clear();
      }
    }
  }

  /** Re-equip last harvest tool when entering harvest mode (default hatchet). */
  async enterHarvestMode(): Promise<void> {
    const tool =
      this.lastHarvestTool === 'toolkit'
        ? DEFAULT_HARVEST_RADIAL_TOOL
        : (this.lastHarvestTool || DEFAULT_HARVEST_RADIAL_TOOL);
    await this.setHarvestRadialTool(tool);
  }

  /** Leave harvest/build shell → combat. */
  async enterCombatMode(classId?: string, hasWeapon = false): Promise<void> {
    this.harvestBuildUiOpen = false;
    this.cancelBuilding();
    await this.character?.setControlMode('combat', classId, hasWeapon);
  }

  setSelectedSeed(seedId: string | null): void {
    this.selectedSeedId = seedId;
    if (seedId) this.harvestToolOverride = 'seed';
  }

  /** Wire page-level resources bag so farm harvests / crafts update HUD. */
  bindResourceBag(
    getter: () => Record<string, number>,
    setter: (bag: Record<string, number>) => void,
  ): void {
    this.externalResourceGetter = getter;
    this.externalResourceSetter = setter;
  }

  getMergedInventory(): Record<string, number> {
    const ext = this.externalResourceGetter?.() ?? {};
    return { ...this.farmInventory, ...ext };
  }

  private commitInventory(bag: Record<string, number>): void {
    this.farmInventory = { ...bag };
    this.externalResourceSetter?.({ ...bag });
  }

  private adjustItem(itemId: string, delta: number): number {
    const bag = this.getMergedInventory();
    const next = (bag[itemId] ?? 0) + delta;
    if (next <= 0) delete bag[itemId];
    else bag[itemId] = next;
    this.commitInventory(bag);
    return bag[itemId] ?? 0;
  }

  /**
   * Init hide-chunk sectional damage + build-hammer repair (1 wood, RMB→LMB).
   * Safe to call multiple times; reuses existing system instances.
   */
  ensureSectionalDamage(): void {
    if (!this.sectionalDamage) {
      this.sectionalDamage = new SectionalDamageSystem({
        onPrompt: (msg) => {
          this.lastRepairPrompt = msg;
        },
        onImpactFx: (point, scale) => {
          this.worldFx?.weaponSkillImpact(point, 'physical', scale);
        },
        onSectionDestroy: createPinataDestroyHandler({
          scene: this.scene,
          fragmentCount: 10,
          burstSpeed: 3.2,
          despawnSec: 8,
          // Fragments are visual-only unless a host wires PhysicsWorld later
        }),
      });
    }
    if (!this.hammerRepair) {
      this.hammerRepair = new BuildHammerRepair({
        damage: this.sectionalDamage,
        inventory: {
          getCounts: () => this.getMergedInventory(),
          trySpend: (itemId, qty) => {
            const have = this.getMergedInventory()[itemId] ?? 0;
            if (have < qty) return false;
            this.adjustItem(itemId, -qty);
            return true;
          },
          getBoatCounts: () => this.boatCargo,
          trySpendBoat: (itemId, qty) => {
            const have = this.boatCargo[itemId] ?? 0;
            if (have < qty) return false;
            this.boatCargo[itemId] = have - qty;
            if (this.boatCargo[itemId] <= 0) delete this.boatCargo[itemId];
            return true;
          },
        },
        getPlayerPosition: () => this.character?.getPosition() ?? null,
        onPrompt: (msg) => {
          this.lastRepairPrompt = msg;
        },
        onRepaired: (section) => {
          this.worldFx?.weaponSkillImpact(section.center, 'physical', 1.1);
        },
      });
    }
    // Repair path active when build hammer is out
    this.hammerRepair.enabled =
      this.activeHarvestTool === 'toolkit' ||
      this.character?.mode === 'build' ||
      !!this.character?.hasBuildHammer;
  }

  /**
   * Register a watercraft root for sectional damage (hull/deck/mast hide-chunks).
   * Call after ship/boat GLB is parented into the scene.
   */
  registerWatercraftDamage(assetId: string, root: THREE.Object3D): DamageSection[] {
    this.ensureSectionalDamage();
    return registerWatercraftSections(this.sectionalDamage!, assetId, root);
  }

  /**
   * Register a building / prop mesh for sectional damage + hammer repair.
   */
  registerBuildingDamage(assetId: string, root: THREE.Object3D): DamageSection[] {
    this.ensureSectionalDamage();
    return registerBuildingSections(this.sectionalDamage!, assetId, root);
  }

  /**
   * Apply combat / collision impact to the nearest section (hide chunk at 0 HP).
   */
  applySectionImpactAt(
    point: THREE.Vector3,
    damage: number,
    radius = 2.5,
  ): ReturnType<SectionalDamageSystem['applyImpactAtPoint']> {
    this.ensureSectionalDamage();
    return this.sectionalDamage!.applyImpactAtPoint(point, damage, radius);
  }

  /**
   * RMB with toolkit: select damaged section for repair.
   * Returns true if a damage section was targeted (consumes RMB).
   */
  tryHammerRepairSelect(clientX: number, clientY: number): boolean {
    this.ensureSectionalDamage();
    if (!this.hammerRepair?.enabled) return false;

    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const result = this.hammerRepair.selectWithRaycaster(this.raycaster);
    return result.ok;
  }

  /**
   * LMB with toolkit + prior RMB selection: spend 1 wood and restore chunk.
   * Returns true if repair consumed the click.
   */
  tryHammerRepairApply(): boolean {
    this.ensureSectionalDamage();
    if (!this.hammerRepair?.enabled) return false;
    if (!this.hammerRepair.selected) return false;
    const result = this.hammerRepair.applyRepair();
    return result.ok || result.reason === 'no_wood' || result.reason === 'already_intact';
  }

  /** Ensure farm system + square 4×4 brush exist (home / zone after terrain ready). */
  ensureFarmSystems(): void {
    if (!this.farmPlots) {
      this.farmPlots = new FarmPlotSystem();
      this.scene.add(this.farmPlots.group);
      void preloadCropPack();
      this.farmPlots.setHarvestHandler((ev) => {
        this.adjustItem(ev.itemId, ev.qty);
        // Chance to return a seed for replanting
        const seedMap: Record<string, string> = {
          carrot: 'seed_carrot',
          wheat: 'seed_wheat',
          potato: 'seed_potato',
          tomato: 'seed_tomato',
          turnip: 'seed_turnip',
          flax: 'seed_flax',
          berries: 'seed_berry',
        };
        const seedId = seedMap[ev.itemId];
        if (seedId && Math.random() < 0.4) this.adjustItem(seedId, 1);
      });
    }
    if (this.terrain?.terrainMesh) {
      this.farmPlots.setTerrain(this.terrain.terrainMesh);
    }
    if (!this.groundBrush) {
      this.groundBrush = new GroundToolBrush();
      this.scene.add(this.groundBrush.group);
    }
  }

  private rayToTerrain(clientX: number, clientY: number): THREE.Vector3 | null {
    const mesh = this.terrain?.terrainMesh;
    if (!mesh) return null;
    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(mesh, true);
    return hits.length > 0 ? hits[0].point.clone() : null;
  }

  /**
   * Valheim-like shovel: raise (LMB) / lower (Shift+LMB) / level (Ctrl+LMB).
   * Brush is a 2 m wide circle.
   */
  tryShovelSculpt(
    clientX: number,
    clientY: number,
    modifiers: { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {},
  ): boolean {
    if (!this.isShovelTerrainActive()) return false;
    if (this.character && this.character.mode !== 'harvest' && this.character.mode !== 'build') {
      return false;
    }
    const mesh = this.terrain?.terrainMesh;
    if (!mesh) return false;

    const now = performance.now();
    if (now < this.shovelCooldownUntil) return true;

    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const mode = shovelModeFromModifiers(
      !!modifiers.shiftKey,
      !!modifiers.ctrlKey,
      !!modifiers.altKey,
    );
    const cfg = this.zoneSector?.terrain3d;
    // Prefer sand/beach prefab sculpt on lobby (height-adjustable sand)
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    const sandHit = hits.find((h) => {
      const m = h.object as THREE.Mesh;
      return m.isMesh && (m.userData.sculptable || m.userData.prefab?.sculptable);
    });
    if (sandHit) {
      const delta = mode === 'raise' ? 0.35 : mode === 'lower' ? -0.35 : 0;
      const n = sculptSandPrefab(sandHit.object as THREE.Mesh, sandHit.point, delta, 2.0);
      this.shovelCooldownUntil = now + 100;
      this.lastShovelStroke = { mode, ok: n > 0, at: now };
      return true;
    }

    const result = sculptTerrainFromRay(mesh, this.raycaster, mode, {
      ...SHOVEL_BRUSH.standard,
      minHeight: cfg?.minHeight ?? -80,
      maxHeight: cfg?.maxHeight ?? 280,
    });

    this.shovelCooldownUntil = now + 120;
    this.lastShovelStroke = {
      mode,
      ok: !!result?.ok,
      at: now,
    };
    return true;
  }

  /** Hoe — till square 4×4 garden bed. */
  tryHoeCultivate(clientX: number, clientY: number): boolean {
    if (!this.isHoeActive()) return false;
    this.ensureFarmSystems();
    const now = performance.now();
    if (now < this.groundToolCooldownUntil) return true;
    const hit = this.rayToTerrain(clientX, clientY);
    if (!hit || !this.farmPlots) return true;
    this.farmPlots.cultivateAt(hit);
    this.groundToolCooldownUntil = now + 200;
    return true;
  }

  /** Plant selected seed on tilled dirt. */
  tryPlantSeed(clientX: number, clientY: number): boolean {
    if (!this.isSeedPlantActive() || !this.selectedSeedId) return false;
    this.ensureFarmSystems();
    const now = performance.now();
    if (now < this.groundToolCooldownUntil) return true;
    const seed = getSeedById(this.selectedSeedId);
    if (!seed) return true;
    const bag = this.getMergedInventory();
    if ((bag[seed.itemId] ?? 0) < 1) return true;

    const hit = this.rayToTerrain(clientX, clientY);
    if (!hit || !this.farmPlots) return true;
    const ok = this.farmPlots.plantSeedAt(hit, seed.id);
    if (ok) this.adjustItem(seed.itemId, -1);
    this.groundToolCooldownUntil = now + 150;
    return true;
  }

  /**
   * Bucket: fill at water (low terrain / ocean) or water crops with full bucket.
   * Full bucket also supplies water charges for auto-craft recipes.
   */
  tryBucketUse(clientX: number, clientY: number): boolean {
    if (!this.isBucketActive()) return false;
    this.ensureFarmSystems();
    const now = performance.now();
    if (now < this.groundToolCooldownUntil) return true;

    const hit = this.rayToTerrain(clientX, clientY);
    if (!hit) return true;

    // Fill empty bucket near water: low height or configured water level
    const waterY = this.zoneSector?.terrain3d.waterLevel ?? -2;
    const nearWater = hit.y <= waterY + 1.25;

    if (!this.bucketHasWater && nearWater) {
      this.bucketHasWater = true;
      this.waterCharges = Math.min(20, this.waterCharges + 5);
      const bag = this.getMergedInventory();
      if ((bag[ITEM_EMPTY_BUCKET] ?? 0) > 0) {
        this.adjustItem(ITEM_EMPTY_BUCKET, -1);
      }
      this.adjustItem(ITEM_WATER_BUCKET, 1);
      this.groundToolCooldownUntil = now + 400;
      return true;
    }

    if (this.bucketHasWater || hasWaterBucket(this.character?.equipment, this.getMergedInventory())) {
      // Prefer crop water; else dump to dirt for till wet look
      if (this.farmPlots?.waterAt(hit)) {
        this.waterCharges = Math.max(0, this.waterCharges - 1);
        // Empty after several uses or when charges depleted
        if (this.waterCharges <= 0) {
          this.bucketHasWater = false;
          if ((this.getMergedInventory()[ITEM_WATER_BUCKET] ?? 0) > 0) {
            this.adjustItem(ITEM_WATER_BUCKET, -1);
            this.adjustItem(ITEM_EMPTY_BUCKET, 1);
          }
        }
        this.groundToolCooldownUntil = now + 250;
        return true;
      }
    }

    // Ready crop harvest with bucket hand free? Use sickle-style: LMB on ready with any farm tool
    const harvest = this.farmPlots?.harvestAt(hit);
    if (harvest) {
      this.groundToolCooldownUntil = now + 200;
      return true;
    }

    this.groundToolCooldownUntil = now + 150;
    return true;
  }

  /** LMB harvest on ready crop when sickle / bare harvest hits plot (instant if in range). */
  tryFarmHarvest(clientX: number, clientY: number): boolean {
    this.ensureFarmSystems();
    if (!this.farmPlots) return false;

    // Prefer precise mesh raycast on ready plants
    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const ready = this.farmPlots.raycastReadyPlant(this.raycaster)
      ?? (() => {
        const hit = this.rayToTerrain(clientX, clientY);
        return hit ? this.farmPlots!.findReadyPlantAt(hit.x, hit.z) : null;
      })();
    if (!ready) return false;

    const player = this.character?.getPosition();
    if (player) {
      const dist = Math.hypot(player.x - ready.worldPos.x, player.z - ready.worldPos.z);
      if (dist > FARM_HARVEST_RANGE_M) {
        // Out of range: walk to plant then harvest
        this.beginFarmHarvestApproach(ready.plot.id, ready.cell.index, ready.worldPos);
        return true;
      }
    }
    const nodeId = `${ready.plot.id}:${ready.cell.index}`;
    const impact = ready.worldPos.clone();
    if (ready.cell.mesh) {
      this.strikeHarvestImpact('flower', ready.cell.mesh, impact, {
        depleted: true,
        scale: 1,
        nodeId,
        hitIndex: 0,
      });
    } else {
      this.character?.pulseHarvestHandIk(impact, nodeId);
      this.character?.playHarvestSwing();
    }
    const ev = this.farmPlots.harvestCell(ready.plot, ready.cell);
    return !!ev;
  }

  /**
   * RMB on final-form crop: player walks to plant, removes it, adds to inventory.
   * With build hammer: select damaged section for repair (then LMB to apply +1 wood).
   * Returns true if a ready plant or repair target was selected (consumes RMB).
   */
  tryFarmHarvestRmb(clientX: number, clientY: number): boolean {
    // Build hammer: RMB selects sectional damage target first
    if (
      this.activeHarvestTool === 'toolkit' ||
      this.character?.mode === 'build' ||
      this.character?.hasBuildHammer
    ) {
      if (this.tryHammerRepairSelect(clientX, clientY)) return true;
    }

    if (this.character && this.character.mode !== 'harvest' && this.character.mode !== 'build') {
      return false;
    }
    this.ensureFarmSystems();
    if (!this.farmPlots) return false;

    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const ready =
      this.farmPlots.raycastReadyPlant(this.raycaster) ??
      (() => {
        const hit = this.rayToTerrain(clientX, clientY);
        return hit ? this.farmPlots!.findReadyPlantAt(hit.x, hit.z, 0.7) : null;
      })();
    if (!ready) return false;

    this.beginFarmHarvestApproach(ready.plot.id, ready.cell.index, ready.worldPos);
    return true;
  }

  private beginFarmHarvestApproach(
    plotId: string,
    cellIndex: number,
    worldPos: THREE.Vector3,
  ): void {
    if (!this.character || !this.farmPlots) return;
    const plots = this.farmPlots;
    this.character.setApproachTarget(
      worldPos,
      () => {
        const plot = plots.getPlots().find((p) => p.id === plotId);
        const cell = plot?.cells.find((c) => c.index === cellIndex);
        if (plot && cell && cell.state === 'ready') {
          plots.harvestCell(plot, cell);
        }
      },
      FARM_HARVEST_RANGE_M,
    );
  }

  /** Run auto-craft recipes that need water charges (dough, fiber wash, etc.). */
  tryAutoCraftWithWater(): { ok: boolean; message: string } {
    const bag = this.getMergedInventory();
    const result = tryAutoWaterCraft(bag, this.waterCharges);
    if (!result) {
      return { ok: false, message: 'Need ingredients + water charges (fill bucket at shore).' };
    }
    this.waterCharges = Math.max(0, this.waterCharges - result.waterChargesSpent);
    this.commitInventory(result.inventory);
    if (this.waterCharges <= 0 && this.bucketHasWater) {
      this.bucketHasWater = false;
      if ((result.inventory[ITEM_WATER_BUCKET] ?? 0) > 0) {
        const b = { ...result.inventory };
        b[ITEM_WATER_BUCKET] = (b[ITEM_WATER_BUCKET] ?? 1) - 1;
        if (b[ITEM_WATER_BUCKET] <= 0) delete b[ITEM_WATER_BUCKET];
        b[ITEM_EMPTY_BUCKET] = (b[ITEM_EMPTY_BUCKET] ?? 0) + 1;
        this.commitInventory(b);
      }
    }
    return {
      ok: true,
      message: `Crafted ${result.outputQty}× ${result.outputItemId}`,
    };
  }

  /** Update 2 m brush ring under cursor when a ground tool is active. */
  updateGroundBrushPreview(clientX: number, clientY: number): void {
    const tool = this.getActiveGroundTool();
    if (!tool || !this.character || this.character.mode !== 'harvest') {
      this.groundBrush?.hide();
      return;
    }
    this.ensureFarmSystems();
    const hit = this.rayToTerrain(clientX, clientY);
    if (!hit || !this.groundBrush) {
      this.groundBrush?.hide();
      return;
    }
    const kind =
      tool === 'shovel' ? 'shovel'
        : tool === 'hoe' ? 'hoe'
          : tool === 'seed' ? 'seed'
            : tool === 'bucket' ? 'water'
              : 'neutral';
    this.groundBrush.showAt(hit.x, hit.y, hit.z, kind);
  }

  /** Handle mouse click — building placement (LMB) or harvesting / combat / shovel */
  handleClick(
    clientX: number,
    clientY: number,
    modifiers: { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean } = {},
  ): void {
    // Build hammer repair: LMB applies after RMB section select (1 wood)
    // Only when not actively placing a blueprint ghost.
    if (
      !this.building?.isBuilding &&
      (this.activeHarvestTool === 'toolkit' ||
        this.character?.mode === 'build' ||
        this.character?.hasBuildHammer) &&
      this.tryHammerRepairApply()
    ) {
      return;
    }

    // Build mode: LMB places light-blue ghost at cursor
    if (this.building?.isBuilding) {
      if (this.building.isPropPlacing) {
        const selectedId = this.building.selectedPropId;
        const result = this.building.confirmPropPlacement();
        // Register prop for sectional damage / hammer repair + autosave layout
        if (result) {
          const props = this.building.getAllProps();
          const last = props.find((p) => p.id === result.id);
          if (last?.group) {
            this.registerBuildingDamage(`prop_${result.id}`, last.group);
          }
          this.scheduleBuildLayoutSave();
        }
        // Outpost camp base → faction camp system owns the GLB (avoid double mesh)
        if (result && selectedId === 'npc_camp_base') {
          const props = this.building.getAllProps();
          const last = props.find((p) => p.id === result.id);
          if (last) {
            const { x, z } = last.position;
            this.building.removeProp(result.id);
            void this.placePlayerCamp(x, z);
          }
        }
        // Camp upgrades snap to nearest ally camp when possible
        if (
          result &&
          (selectedId === 'camp_bench_upgrade' ||
            selectedId === 'camp_storage_upgrade' ||
            selectedId === 'camp_tower_upgrade' ||
            selectedId === 'camp_flag' ||
            selectedId === 'camp_fire' ||
            selectedId === 'flag_totem' ||
            selectedId === 'bw_campfire')
        ) {
          const props = this.building.getAllProps();
          const last = props.find((p) => p.id === result.id);
          const map: Record<string, string> = {
            camp_bench_upgrade: 'camp_bench',
            camp_storage_upgrade: 'camp_storage',
            camp_tower_upgrade: 'camp_tower',
            camp_flag: 'camp_flag',
            flag_totem: 'camp_flag',
            camp_fire: 'camp_fire',
            bw_campfire: 'camp_fire',
          };
          if (last && selectedId && map[selectedId]) {
            void this.placeCampUpgrade(map[selectedId]);
          }
        }
        return;
      }
      const placed = this.building.confirmPlacement();
      if (placed?.mesh) {
        this.registerBuildingDamage(`piece_${placed.id}`, placed.mesh);
      }
      return;
    }

    // Harvest ground tools — shovel / hoe (4×4 bed) / seed / bucket
    if (this.character?.mode === 'harvest') {
      const ground = this.getActiveGroundTool();
      // Skinning knife: loot nearest dead creature → Skeletons_Free residual
      if (
        this.activeHarvestTool === 'skinning_knife' &&
        this.creatures &&
        this.character
      ) {
        const skinned = this.creatures.trySkinNear(this.character.getPosition(), 3.5);
        if (skinned) {
          this.worldFx?.weaponSkillImpact(skinned.position, 'slash', 1.2);
          return;
        }
      }
      if (ground === 'shovel' && this.tryShovelSculpt(clientX, clientY, modifiers)) return;
      if (ground === 'hoe' && this.tryHoeCultivate(clientX, clientY)) return;
      if (ground === 'seed' && this.tryPlantSeed(clientX, clientY)) return;
      if (ground === 'bucket' && this.tryBucketUse(clientX, clientY)) return;
      // Bare LMB on ready crop still harvests (walk-to if out of range)
      if (!ground && this.tryFarmHarvest(clientX, clientY)) return;
      if (ground === null && this.tryFarmHarvest(clientX, clientY)) return;
    }

    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Combat: large boss (room + PvE mountain instance + arena) hit first
    if (this.character?.mode === 'combat') {
      const hitDmgBoss = 45;
      const hitsBoss = this.raycaster.intersectObjects(
        [
          ...(this.bossRooms?.largeBoss?.getHitObjects() ?? []),
          ...(this.pveBossInstance?.largeBoss?.getHitObjects() ?? []),
          ...this.arenaBosses.flatMap((b) => b.getHitObjects()),
        ],
        true,
      );
      if (hitsBoss.length > 0) {
        const pt = hitsBoss[0]!.point;
        if (this.bossRooms?.tryHitBoss(pt, hitDmgBoss)) return;
        if (this.pveBossInstance?.tryHitBoss(pt, hitDmgBoss)) return;
        for (const b of this.arenaBosses) {
          if (b.tryHitWeakness(pt, hitDmgBoss)) return;
        }
      }
    }

    // In combat mode, prefer soft-lock target then nearest creature
    if (this.character?.mode === 'combat' && this.creatures) {
      const playerPos = this.character.getPosition();
      const lockId = this.character.getSoftLockTargetId();
      const hitDmg = 15;
      if (lockId && this.creatures.isAlive(lockId)) {
        const lockPos = this.creatures.getWorldPosition(lockId);
        if (lockPos && lockPos.distanceTo(playerPos) <= 22) {
          this.creatures.dealDamage(lockId, hitDmg);
          // Weapon skill impact VFX at hit point
          this.worldFx?.weaponSkillImpact(lockPos, this.resolvePlayerDamageType(), 1.8);
          this.config.onCombatHit?.({
            creatureId: lockId,
            damage: hitDmg,
            position: lockPos.clone(),
          });
          return;
        }
      }
      const nearest = this.creatures.findNearest(playerPos, 20);
      if (nearest) {
        this.creatures.dealDamage(nearest.id, hitDmg);
        const hitPos = this.creatures.getWorldPosition(nearest.id);
        if (hitPos) {
          this.worldFx?.weaponSkillImpact(hitPos, this.resolvePlayerDamageType(), 1.8);
          this.config.onCombatHit?.({
            creatureId: nearest.id,
            damage: hitDmg,
            position: hitPos.clone(),
          });
        } else {
          this.config.onCombatHit?.({
            creatureId: nearest.id,
            damage: hitDmg,
            position: playerPos.clone(),
          });
        }
        return;
      }
    }

    // Tree hits — firewood axe (base angle notch → fall → ground split)
    // or legacy HP spam when firewood system unavailable
    this.ensureFirewoodChop();
    for (const tree of this.trees) {
      const phase = tree.fallPhase;
      const standing =
        (phase === 'live' || phase === 'notching') && isHarvestable(tree as any);
      const downed = phase === 'downed' || phase === 'splitting';
      if (!standing && !downed) continue;

      const hits = this.raycaster.intersectObject(tree.group, true);
      if (hits.length === 0) continue;

      const impact = hits[0]!.point;
      const playerPos =
        this.character?.model.position ?? this.camera.position;
      this.character?.pulseHarvestHandIk(impact, tree.nodeId);
      this.character?.playHarvestSwing();

      if (this.firewoodChop && standing) {
        this.character?.pulseHarvestAxeIK(impact);
        this.firewoodChop.strikeStanding(tree, impact, playerPos);
        if (tree.fallPhase === 'falling') {
          markDepleted(tree as any, 'tree', false);
        }
        return;
      }
      if (this.firewoodChop && downed) {
        this.character?.pulseHarvestAxeIK(impact);
        const facing =
          this.character?.model.rotation.y ??
          this.camera.rotation.y ??
          0;
        this.firewoodChop.strikeDowned(tree, impact, facing);
        if (tree.fallPhase === 'stump') {
          void swapTreeToStump(tree, tree.baseScale);
          tree.respawnAt = Date.now() + (HARVEST_RESPAWN_MS || 150_000);
          this.config.onHarvest?.({
            nodeId: tree.nodeId,
            resourceType: 'forest',
            position: tree.group.position.clone(),
          });
        }
        return;
      }

      // Legacy fallback (no firewood)
      if (standing) {
        tree.health--;
        tree.shaking = true;
        tree.shakeTime = 0;
        if (tree.health <= 0) {
          beginTreeFall(tree);
          markDepleted(tree as any, 'tree', false);
        }
      }
      return;
    }

    // Check rock hits — pinata chip at IK point; leftover core stays visible
    for (const rock of this.rocks) {
      if (!isHarvestable(rock as any)) continue;
      const hits = this.raycaster.intersectObject(rock.group, true);
      if (hits.length > 0) {
        rock.health--;
        rock.chipping = true;
        rock.chipTime = 0;
        const depleted = rock.health <= 0;
        const scale = depleted
          ? 0.32
          : Math.max(0.32, rock.health / rock.maxHealth);
        rock.group.scale.setScalar(rock.baseScale * scale);
        const kind: HarvestNodeClass = rock.oreVariant ? 'ore' : 'rock';
        this.strikeHarvestImpact(kind, rock.group, hits[0]!.point, {
          depleted,
          scale: rock.baseScale,
          nodeId: rock.nodeId,
          hitIndex: Math.max(0, rock.maxHealth - rock.health),
        });
        void this.spawnRockDebris(rock, 1);
        if (depleted) {
          markDepleted(rock as any, 'rock', false);
          void this.emitHarvestDrops(
            rock.group.position.clone(),
            rock.oreVariant ? 'gold' : 'debris',
            rock.oreVariant ? 4 : 3,
            rock.nodeId,
            'mining',
          );
        }
        return;
      }
    }

    for (const crystal of this.crystals) {
      if (!isHarvestable(crystal as any)) continue;
      const hits = this.raycaster.intersectObject(crystal.group, true);
      if (hits.length > 0) {
        crystal.health--;
        crystal.chipping = true;
        crystal.chipTime = 0;
        const depleted = crystal.health <= 0;
        const scale = Math.max(0.35, crystal.health / crystal.maxHealth);
        crystal.group.scale.setScalar(crystal.baseScale * scale);
        this.strikeHarvestImpact('crystal', crystal.group, hits[0]!.point, {
          depleted,
          scale: crystal.baseScale,
          nodeId: crystal.nodeId,
          hitIndex: Math.max(0, crystal.maxHealth - crystal.health),
        });
        void spawnResourceDrops(this.scene, crystal.group.position, 'gem', 1).then((d) => {
          this.harvestDrops.push(...d);
        });
        if (depleted) {
          markDepleted(crystal as any, 'crystal', true);
          void this.emitHarvestDrops(
            crystal.group.position.clone(),
            'gem',
            4,
            crystal.nodeId,
            'mining',
          );
        }
        return;
      }
    }

    for (const hemp of this.hemps) {
      if (!isHarvestable(hemp as any)) continue;
      const hits = this.raycaster.intersectObject(hemp.group, true);
      if (hits.length > 0) {
        hemp.health--;
        const depleted = hemp.health <= 0;
        const scale = Math.max(0.4, hemp.health / hemp.maxHealth);
        hemp.group.scale.setScalar(hemp.baseScale * scale);
        this.strikeHarvestImpact('hemp', hemp.group, hits[0]!.point, {
          depleted,
          scale: hemp.baseScale,
          nodeId: hemp.nodeId,
          hitIndex: Math.max(0, hemp.maxHealth - hemp.health),
        });
        if (depleted) {
          markDepleted(hemp as any, 'hemp', true);
          void this.emitHarvestDrops(hemp.group.position.clone(), 'debris', 2, hemp.nodeId, 'herbalism');
        }
        return;
      }
    }

    for (const flower of this.flowers) {
      if (!isHarvestable(flower as any)) continue;
      const hits = this.raycaster.intersectObject(flower.group, true);
      if (hits.length > 0) {
        flower.health--;
        const depleted = flower.health <= 0;
        const scale = Math.max(0.4, flower.health / flower.maxHealth);
        flower.group.scale.setScalar(flower.baseScale * scale);
        this.strikeHarvestImpact('flower', flower.group, hits[0]!.point, {
          depleted,
          scale: flower.baseScale,
          nodeId: flower.nodeId,
          hitIndex: Math.max(0, flower.maxHealth - flower.health),
        });
        if (depleted) {
          markDepleted(flower as any, 'flower', true);
          void this.emitHarvestDrops(flower.group.position.clone(), 'debris', 2, flower.nodeId, 'herbalism');
        }
        return;
      }
    }

    for (const scrap of this.scraps) {
      if (!isHarvestable(scrap as any)) continue;
      const hits = this.raycaster.intersectObject(scrap.group, true);
      if (hits.length > 0) {
        scrap.health--;
        const depleted = scrap.health <= 0;
        const scale = Math.max(0.4, scrap.health / scrap.maxHealth);
        scrap.group.scale.setScalar(scrap.baseScale * scale);
        this.strikeHarvestImpact('scrap', scrap.group, hits[0]!.point, {
          depleted,
          scale: scrap.baseScale,
          nodeId: scrap.nodeId,
          hitIndex: Math.max(0, scrap.maxHealth - scrap.health),
        });
        void spawnResourceDrops(this.scene, scrap.group.position, 'debris', 1).then((d) => {
          this.harvestDrops.push(...d);
        });
        if (depleted) {
          markDepleted(scrap as any, 'scrap', true);
          void this.emitHarvestDrops(scrap.group.position.clone(), 'debris', 3, scrap.nodeId, 'mining');
        }
        return;
      }
    }
  }

  /** Handle mouse move — build ghost + 2 m ground-tool brush */
  handleMouseMove(clientX: number, clientY: number): void {
    if (this.building?.isBuilding) {
      if (this.building.isPropPlacing) {
        this.building.updatePropGhostPosition(clientX, clientY, this.config.canvas);
      } else {
        this.building.updateGhostPosition(clientX, clientY, this.config.canvas);
      }
      this.groundBrush?.hide();
      return;
    }
    this.updateGroundBrushPreview(clientX, clientY);
  }

  /** Enter building mode for a piece type */
  startBuilding(type: PieceType): void {
    this.building?.startPlacement(type);
    void this.character?.setControlMode('build');
  }

  /** Enter prop build mode — light-blue ghost follows mouse until LMB */
  startPropBuilding(assetId: string): void {
    this.building?.startPropPlacement(assetId);
    void this.character?.setControlMode('build');
  }

  /** Cancel building mode */
  cancelBuilding(): void {
    this.building?.cancelPlacement();
    this.building?.cancelPropPlacement();
  }

  /**
   * Island key for build layout persistence (seed / lobby map / sector).
   * Set from page after load; defaults to seed or "default".
   */
  public buildSaveAccountId = 'guest';
  public buildSaveIslandKey = 'default';
  public buildSaveSeed: string | undefined;
  /** Debounce timer for layout autosave */
  private _buildSaveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Configure who/where layouts save (call after auth + island identity known). */
  configureBuildSave(opts: {
    accountId?: string;
    islandKey?: string;
    seed?: string;
  }): void {
    if (opts.accountId) this.buildSaveAccountId = opts.accountId;
    if (opts.islandKey) this.buildSaveIslandKey = opts.islandKey;
    if (opts.seed !== undefined) this.buildSaveSeed = opts.seed;
  }

  /** Snapshot + localStorage + optional remote PATCH. */
  persistBuildLayoutNow(): number {
    if (!this.building) return 0;
    // Lazy import via dynamic then sync path — use pre-imported module when available
    return this._persistBuildLayoutSync();
  }

  private _persistBuildLayoutSync(): number {
    if (!this.building) return 0;
    // Inline minimal persist to avoid require() in ESM browser
    try {
      const props = this.building.exportLayout();
      const doc = {
        version: 1 as const,
        updatedAt: Date.now(),
        accountId: this.buildSaveAccountId || 'guest',
        islandKey: this.buildSaveIslandKey || 'default',
        seed: this.buildSaveSeed ?? this.config.seed,
        props,
      };
      const key = `warlords_build_layout_v1:${doc.accountId}:${doc.islandKey}`;
      localStorage.setItem(key, JSON.stringify(doc));
      const token =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('grudge_auth_token') ||
            localStorage.getItem('grudge_session_token')
          : null;
      void fetch('/api/island/build-layout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(doc),
        keepalive: true,
      }).catch(() => {});
      return props.length;
    } catch (e) {
      console.warn('[Island3D] build layout persist failed', e);
      return 0;
    }
  }

  /** Debounced save after place/remove (800ms). */
  scheduleBuildLayoutSave(): void {
    if (this._buildSaveTimer) clearTimeout(this._buildSaveTimer);
    this._buildSaveTimer = setTimeout(() => {
      this._buildSaveTimer = null;
      try {
        this.persistBuildLayoutNow();
      } catch (e) {
        console.warn('[Island3D] build layout save failed', e);
      }
    }, 800);
  }

  /**
   * Restore saved props for this island (local, then remote if newer).
   * Safe to call after terrain + BuildingSystem exist.
   */
  async loadSavedBuildLayout(): Promise<{ placed: number; skipped: number }> {
    if (!this.building) return { placed: 0, skipped: 0 };
    const {
      resolveBuildLayout,
      applyBuildLayout,
    } = await import('../building/buildLayoutSave');
    const doc = await resolveBuildLayout(
      this.buildSaveAccountId,
      this.buildSaveIslandKey,
    );
    if (!doc) return { placed: 0, skipped: 0 };
    const result = applyBuildLayout(this.building, doc);
    // Register restored props for sectional damage / hammer repair
    for (const p of this.building.getAllProps()) {
      if (p.group) this.registerBuildingDamage(`prop_${p.id}`, p.group);
    }
    return result;
  }

  get isBuildPlacing(): boolean {
    return this.building?.isBuilding ?? false;
  }

  /** Get the Three.js scene (for adding remote player meshes, etc.) */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  /** WebGL renderer (flyby MediaRecorder + snapshot captures). */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /** OrbitControls — only drive when cameraMode is orbit_edit / map. */
  getOrbitControls(): OrbitControls {
    return this.controls;
  }

  /** Engine play mode: procedural | lobby | zone | … */
  getPlayMode(): string {
    return this.config.mode ?? 'procedural';
  }

  /** Register an external update function that runs each frame */
  onUpdate(fn: (dt: number) => void): () => void {
    this.externalUpdates.push(fn);
    return () => {
      this.externalUpdates = this.externalUpdates.filter(f => f !== fn);
    };
  }

  /** Toggle between orbit controls and character controller */
  toggleCharacterControl(enabled: boolean): void {
    this.setCameraMode(enabled ? 'play_tps' : 'orbit_edit');
  }

  /** Current camera ownership mode (WebGL Insights Ch.23). */
  getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  /**
   * Switch sole camera driver. Always call this instead of flipping
   * controls.enabled / characterActive separately.
   */
  setCameraMode(mode: CameraMode): void {
    if (mode === 'cinematic' && this.cameraMode !== 'cinematic') {
      this.cameraModeBeforeCinematic = this.cameraMode;
    }
    this.cameraMode = mode;
    this.characterActive = playCameraActive(mode);
    this.controls.enabled = orbitEnabledForMode(mode);
    if (this.character) {
      this.character.cameraFollowEnabled = playCameraActive(mode);
    }
  }

  /** Enter cinematic (wake / flyby). Pair with endCinematicCamera(). */
  beginCinematicCamera(): void {
    this.setCameraMode('cinematic');
  }

  /** Restore mode from before cinematic (default play_tps if character). */
  endCinematicCamera(): void {
    const restore =
      this.cameraModeBeforeCinematic
      ?? (this.character ? 'play_tps' : 'orbit_edit');
    this.cameraModeBeforeCinematic = null;
    this.setCameraMode(restore);
  }

  /**
   * Capture a top-down orthographic render of the island.
   * Returns a data URL (PNG) showing terrain + water + decorations only.
   * No buildings, no character — pure landscape.
   */
  captureTopDown(resolution = 1024): string {
    const halfSize = 520; // slightly larger than terrain (1024/2) to show water edge
    const ortho = new THREE.OrthographicCamera(
      -halfSize, halfSize, halfSize, -halfSize, 1, 500,
    );
    ortho.position.set(0, 300, 0);
    ortho.lookAt(0, 0, 0);
    ortho.updateProjectionMatrix();

    // Hide character + building ghosts for a clean capture
    const hiddenObjects: THREE.Object3D[] = [];
    if (this.character) {
      const charModel = (this.character as any).model;
      if (charModel && charModel.visible) {
        charModel.visible = false;
        hiddenObjects.push(charModel);
      }
    }
    if (this.building) {
      const ghost = (this.building as any).ghostMesh;
      if (ghost && ghost.visible) {
        ghost.visible = false;
        hiddenObjects.push(ghost);
      }
    }

    // Render to offscreen target
    const rt = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, ortho);
    this.renderer.setRenderTarget(prevTarget);

    // Read pixels into canvas
    const pixels = new Uint8Array(resolution * resolution * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, resolution, resolution, pixels);

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(resolution, resolution);

    // WebGL reads bottom-up, flip vertically
    for (let y = 0; y < resolution; y++) {
      const srcRow = (resolution - 1 - y) * resolution * 4;
      const dstRow = y * resolution * 4;
      for (let x = 0; x < resolution * 4; x++) {
        imageData.data[dstRow + x] = pixels[srcRow + x];
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Cleanup
    rt.dispose();
    for (const obj of hiddenObjects) obj.visible = true;

    return canvas.toDataURL('image/png');
  }

  /** Cleanup — alias for destroy() (pages call dispose()) */
  dispose(): void {
    this.oceanReflectionRig?.dispose();
    this.oceanReflectionRig = null;
    this.underwaterPost?.dispose();
    this.underwaterPost = null;
    this.boatWake?.dispose();
    this.boatWake = null;
    if (this.oceanProcTextures) {
      this.oceanProcTextures.foam.dispose();
      this.oceanProcTextures.caustics.dispose();
      this.oceanProcTextures.normal.dispose();
      this.oceanProcTextures = null;
    }
    this.destroy();
  }

  destroy(): void {
    this.stop();
    this.timer.disconnect();
    this.timer.dispose();
    this.groundLoot?.dispose();
    this.groundLoot = null;
    this.creatures?.dispose();
    this.campUnits?.dispose();
    this.campUnits = null;
    this.npcCamps?.dispose();
    this.npcCamps = null;
    this.character?.destroy();
    this.allyManager?.destroy();
    this.building?.destroy();
    this.multiplayer?.destroy();
    this.lobbyAnimMixer?.stopAllAction();
    this.lobbyCapture?.destroy();
    this.lobbyShip?.destroy();
    if (this.lobbyPlayZone) {
      this.lobbyPlayZone.dispose();
    } else {
      this.harvestZones?.dispose();
    }
    this.factionIslands?.dispose();
    this.factionIslands = null;
    if (this.gmapOverlayRoot) {
      this.scene.remove(this.gmapOverlayRoot);
      this.gmapOverlayRoot = null;
    }
    this.productionGmap = null;
    this.productionHud = null;
    this.lobbyCollider?.dispose();
    if (this.lobbyCollider?.colliderMesh.parent) {
      this.scene.remove(this.lobbyCollider.colliderMesh);
    }
    this.walkCollider?.dispose();
    if (this.walkCollider?.colliderMesh.parent) {
      this.scene.remove(this.walkCollider.colliderMesh);
    }
    this.walkCollider = null;
    try {
      this.physics?.dispose();
    } catch {
      /* wasm */
    }
    this.physics = null;
    this.physicsReady = false;
    this.havenFoundation?.dispose();
    this.havenFoundation = null;
    this.fabledFoundation?.dispose();
    this.fabledFoundation = null;
    this.etherealDestruction?.dispose();
    this.etherealDestruction = null;
    this.etherealFloatIslands?.dispose();
    this.etherealFloatIslands = null;
    this.eventIslands?.dispose();
    this.eventIslands = null;
    this.bossRooms?.dispose();
    this.bossRooms = null;
    this.icelandScene?.dispose();
    this.icelandScene = null;
    this.volcanicClimb?.dispose();
    this.volcanicClimb = null;
    this.arenaBosses.forEach((b) => b.dispose());
    this.arenaBosses = [];
    this.pveBossInstance?.dispose();
    this.pveBossInstance = null;
    if (this._bossPortalKey) {
      window.removeEventListener('keydown', this._bossPortalKey);
      this._bossPortalKey = null;
    }
    this.zoneCapital?.dispose();
    this.zoneCapital = null;
    this.hiddenMountainCity?.dispose();
    this.hiddenMountainCity = null;
    this.sectorEventLandmarks?.dispose();
    this.sectorEventLandmarks = null;
    this.sectorProduction = null;
    this.worldFx?.dispose();
    this.worldFx = null;
    void import('../vfx/WorldFxBus').then(({ setWorldFxBus }) => setWorldFxBus(null));
    this.zoneDungeonPortals?.dispose();
    this.zoneDungeonPortals = null;
    this.zoneScene?.dispose();
    this.grassLayer?.dispose();
    this.sandLayer?.dispose();
    this.postProcessing?.dispose();
    // forceContextLoss — free GPU slot so Chrome won't origin-block after OOM
    try {
      this.renderer.forceContextLoss();
    } catch {
      /* ignore */
    }
    try {
      this.renderer.dispose();
    } catch {
      /* ignore */
    }
    this.controls.dispose();
    // Dispose geometries and materials
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }
}
