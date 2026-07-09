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
import { buildLobbyCollider, type LobbyColliderResult } from '../physics/LobbyColliderSystem';
import { createLobbyPlayZone, type LobbyPlayZoneResult } from './LobbyPlayZone';
import { createOceanMesh, updateOceanMaterial } from '../terrain/WaterMaterial';
import { PostProcessing, type QualityPreset } from '../render/PostProcessing';
import { DayNightCycle, type DayNightConfig } from '../environment/DayNightCycle';
import { CharacterController3D, type CharacterController3DConfig, type PhysicsCallbacks } from '../player/CharacterController3D';
import { WEAPON_SKILL_SLOTS } from '@/lib/hotbarLayout';
import { TerrainNavMesh } from '../navigation/TerrainNavMesh';
import { AllyManager, type CombatTarget } from '../ai/AllyController';
import { BuildingSystem, type PieceType } from '../building/BuildingSystem';
import { getSectorById, type WorldSector } from '@shared/definitions/worldMapSectors';
import {
  generateZonePopulation, getNodesByCategory,
  type ZonePopulation, type IslandNode, type SpawnPointNode, type DockNode,
} from '@shared/definitions/zoneServerNodes';
import { buildZoneScene, type ZoneSceneResult } from './ZoneSceneBuilder';
import { CreatureManager, type CreatureLootEvent } from '../creatures/CreatureManager';
import { NpcCampSystem, spawnZoneCamps } from '../camps/NpcCampSystem';
import type { CampFaction } from '@shared/definitions/npcCamps';
import {
  createEvilMountainTriad,
  EvilMountainTriadSystem,
} from '../objects/EvilMountainTriad';
import { InstancedProceduralForest } from '../objects/InstancedProceduralForest';
import { preloadIslandResources } from '../objects/IslandResourceLoader';
import { scatterGlbTreesFromNodes } from '../objects/GlbForestScatter';
import { scatterRtsNatureInScene } from '../objects/RtsNatureScatter';
import {
  generateRtsNatureScatter,
  islandSeedToNumber,
  type RtsNatureScatterPayload,
} from '@shared/definitions/rtsNatureScatter';
import { placeProceduralHarvestZones } from '../harvest/HarvestZonePlacer';
import { buildHarvestZones, type HarvestZonesResult } from '../harvest/HarvestZoneBuilder';
import { spawnZoneHarvestNodes } from '../harvest/ZoneHarvestSpawner';
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
import {
  generateMountainTriadSeed,
  HOME_ISLAND_WORLD_SIZE_M,
  type MountainTriadSeed,
} from '@shared/definitions/homeIslandSeed';
import {
  campPercentToWorld,
  HOME_ISLAND_BUILDABLE_MAX_HEIGHT_M,
  HOME_ISLAND_BUILDABLE_MAX_SLOPE_RAD,
  HOME_ISLAND_BUILDABLE_MIN_HEIGHT_M,
  HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
  HOME_ISLAND_DEFAULT_CAMP_PERCENT,
  HOME_ISLAND_HARVEST_ZONE_COUNT,
  HOME_ISLAND_HARVEST_ZONE_SPACING_M,
} from '@shared/definitions/homeIslandQuality';

export type Island3DMode = 'procedural' | 'lobby' | 'zone';

/** Canonical water surface for procedural home islands */
export const PROCEDURAL_WATER_LEVEL = -2;

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
  /** Sector ID from WORLD_SECTORS. Only used when mode='zone'. */
  sectorId?: string;
  /** World seed shared across all zone instances for determinism. */
  worldSeed?: string;
  /** Progress callback for lobby map loading (0-100) */
  onLoadProgress?: (pct: number) => void;
  /** Post-processing quality (default 'medium') */
  quality?: QualityPreset;
  /** Day/night cycle config (omit to disable) */
  dayNight?: Partial<DayNightConfig>;
  /** Enable the playable character controller (default true for procedural) */
  enableCharacter?: boolean;
  /** Physics callbacks from the character controller */
  physicsCallbacks?: PhysicsCallbacks;
  /** Fired when player enters a home-island mountain dungeon portal */
  onDungeonEnter?: (dungeonId: string, dungeonName: string) => void;
  /** Persisted mountain triad seed from Railway (Sketchfab 3-peak dungeon layout) */
  mountainTriad?: import('@shared/definitions/homeIslandSeed').MountainTriadSeed;
  /** RTS-Grudge export heightmap — shapes center of 1024m terrain when present */
  rtsHeightmap?: RtsHeightmapPayload;
  /** RTS NatureScatter foliage placements (200m, CDN GLBs) */
  rtsNatureScatter?: RtsNatureScatterPayload;
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
  /** Account + captain for dock ship roster */
  accountId?: string;
  captainId?: string | null;
}

export class Island3DEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isRunning = false;
  /** External update callbacks — added via onUpdate(), called each frame */
  private externalUpdates: Array<(dt: number) => void> = [];

  // Terrain
  public terrain: IslandTerrainResult | null = null;
  private waterPlane: THREE.Mesh | null = null;

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
  /** Set when player presses E at south dock — UI shows ShipDockPanel */
  public dockInteractPending = false;
  public lobbyPlayZone: LobbyPlayZoneResult | null = null;
  private lobbyCollider: LobbyColliderResult | null = null;
  private lobbyCapturing = false;

  // Zone mode
  public zoneScene: ZoneSceneResult | null = null;
  public zonePopulation: ZonePopulation | null = null;
  public zoneSector: WorldSector | null = null;

  // Player character
  public character: CharacterController3D | null = null;
  private characterActive = false;

  // Navigation + AI
  public navMesh: TerrainNavMesh | null = null;
  public allyManager: AllyManager | null = null;

  // Building
  public building: BuildingSystem | null = null;

  // Wildlife
  public creatures: CreatureManager | null = null;

  // Faction NPC camps (stylized camp GLB + upgrades)
  public npcCamps: NpcCampSystem | null = null;
  /** Player faction for camp ally/enemy resolution */
  public playerFaction: CampFaction | string = 'crusade';

  // Mountain dungeon triad + instanced forest (procedural home island)
  public mountainTriad: EvilMountainTriadSystem | null = null;
  public proceduralForest: InstancedProceduralForest | null = null;
  public harvestZones: HarvestZonesResult | null = null;

  // Raycaster for mouse picking
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Harvest FX — log/debris drops + tree fall animations
  private harvestDrops: HarvestDrop[] = [];
  private treeFallCompleting = new Set<HarvestableTree>();

  constructor(private config: Island3DEngineConfig) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);

    // Camera — over-the-shoulder perspective
    this.camera = new THREE.PerspectiveCamera(60, config.width / config.height, 0.5, 2000);
    this.camera.position.set(0, 120, 200);

    // Controls (orbit for now — will switch to character controller later)
    this.controls = new OrbitControls(this.camera, config.canvas);
    this.controls.target.set(0, 10, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 500;
    this.controls.update();

    this.clock = new THREE.Clock();

    this.setupLighting();

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

    // Directional sun light with shadows
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sunLight.position.set(150, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.left = -300;
    this.sunLight.shadow.camera.right = 300;
    this.sunLight.shadow.camera.top = 300;
    this.sunLight.shadow.camera.bottom = -300;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 800;
    this.sunLight.shadow.bias = -0.001;
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
    const mode = this.config.mode || 'procedural';

    if (mode === 'lobby') {
      await this.initLobby();
    } else if (mode === 'zone') {
      await this.initZone();
    } else {
      await this.initProcedural();
    }

    // Multiplayer (if configured) — works with both modes
    if (this.config.multiplayer) {
      this.multiplayer = new MultiplayerSync(this.config.multiplayer, this.scene);
      this.multiplayer.connect();
    }
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
      this.config.onLoadProgress?.(35 + Math.round(pct * 0.35));
    });
    this.lobbyCollider = buildLobbyCollider(this.lobbyResult, surface.walkableMeshes);
    this.scene.add(this.lobbyCollider.colliderMesh);
    const sampleGround = this.lobbyCollider.sampleHeight;

    const maxDim = Math.max(
      this.lobbyResult.size.x,
      this.lobbyResult.size.y,
      this.lobbyResult.size.z,
    );

    // Gerstner ocean surrounding the archipelago
    this.waterPlane = createOceanMesh({
      waterLevel: LOBBY_WATER_LEVEL,
      size: Math.max(maxDim * 6, 800),
      segments: 8,
    });
    this.waterPlane.name = 'lobby-ocean';
    this.waterPlane.renderOrder = 1;
    this.scene.add(this.waterPlane);

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
    this.config.onLoadProgress?.(92);

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
    this.character = new CharacterController3D({
      scene: this.scene,
      camera: this.camera,
      terrainMesh: lobbyGround,
      groundObject: this.lobbyResult.scene,
      groundSampler: sampleGround,
      startPosition: startPos,
      physics: { waterLevel: LOBBY_WATER_LEVEL, doubleJump: true },
      callbacks: this.config.physicsCallbacks,
    });

    const { CharacterManager } = await import('@/lib/characterManager');
    const { hotbarFromCharacter } = await import('@/lib/hotbarLayout');
    const activeChar = await CharacterManager.getActiveCharacter?.();
    if (activeChar?.equipment) {
      this.character.setEquipment(activeChar.equipment);
    }
    const hotbar = hotbarFromCharacter(activeChar);
    const hasWeaponSkills = WEAPON_SKILL_SLOTS.some((s) => hotbar.weaponSkills[s]);
    if (hasWeaponSkills) {
      this.character.loadHotbar(hotbar);
    } else {
      this.character.loadHotbar({
        weaponSkills: {
          1: 'warrior_0_strike',
          2: 'grim_dest_blast',
          3: 'grim_prot_ward',
          4: 'grim_conj_minion',
          5: 'grim_conj_lord',
        },
        consumables: hotbar.consumables,
        classAbilities: hotbar.classAbilities,
      });
    }
    this.controls.enabled = false;
    this.characterActive = true;
    this.lobbyShip?.attachBoarding(this.character);

    this.camera.position.set(
      startPos.x - 12,
      startPos.y + 18,
      startPos.z + 22,
    );
    this.controls.target.copy(startPos);
    this.controls.update();
  }

  /** Generate procedural seed-based terrain with nodes & decorations */
  private async initProcedural(): Promise<void> {
    await preloadIslandResources().catch(() => undefined);
    // 1. Generate terrain
    const terrainMaterial = await createTerrainMaterialAsync();
    const terrainConfig: IslandTerrainConfig = {
      seed: this.config.seed,
      xSegments: 63,
      ySegments: 63,
      xSize: 1024,
      ySize: 1024,
      minHeight: -30,
      maxHeight: 80,
      rtsHeightmap: this.config.rtsHeightmap,
    };

    this.terrain = generateIslandTerrainWithBridge(terrainConfig);
    if (this.config.rtsHeightmap) {
      console.log('[Island3D] Terrain from RTS heightmap export (200m → 1024m upsample)');
    }

    const campPct = this.config.campPositionPercent ?? HOME_ISLAND_DEFAULT_CAMP_PERCENT;
    const campWorld = campPercentToWorld(campPct, HOME_ISLAND_WORLD_SIZE_M);
    flattenCampPlateau(this.terrain.terrainMesh, campWorld.x, campWorld.z);

    this.terrain.terrainMesh.material = terrainMaterial;
    this.flattenTerrainBelowWater(this.terrain.terrainMesh, PROCEDURAL_WATER_LEVEL);
    this.scene.add(this.terrain.terrainScene);

    // 2. Single ocean plane (terrain underwater is flattened — no double-water)
    this.createWaterPlane();

    // 3. Small harvest zones (forestoutline-style clusters + interactive nodes)
    const zoneDefs = placeProceduralHarvestZones(
      this.config.seed,
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
      {
        zoneCount: HOME_ISLAND_HARVEST_ZONE_COUNT,
        minSpacing: HOME_ISLAND_HARVEST_ZONE_SPACING_M,
        spawnClearRadius: HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
        terrainSize: HOME_ISLAND_WORLD_SIZE_M,
        regrowRegions: this.config.regrowRegions,
      },
    );
    this.harvestZones = await buildHarvestZones(this.scene, zoneDefs);
    this.trees.push(...this.harvestZones.trees);
    this.rocks.push(...this.harvestZones.rocks);
    this.crystals.push(...this.harvestZones.crystals);
    this.hemps.push(...this.harvestZones.hemps);
    this.flowers.push(...this.harvestZones.flowers);
    this.scraps.push(...this.harvestZones.scraps);
    console.log(
      `[Island3D] Harvest zones: ${zoneDefs.length} patches,`,
      `${this.harvestZones.trees.length} trees,`,
      `${this.harvestZones.forests.length} instanced forests`,
    );

    // 4. Beach/dock nodes only — land harvest lives in zones
    this.placedNodes = placeResourceNodes(
      this.terrain.biomeMap,
      this.terrain.terrainMesh,
      this.terrain.gridW,
      this.terrain.gridH,
      1024, 1024,
      this.config.seed,
      ['tree', 'rock', 'crystal', 'hemp', 'flower', 'bush', 'herb'],
    );

    // 5. Dock + fish harvestables from sparse beach placement
    this.createHarvestables();

    // 6. Scatter decorations
    this.createDecorations();

    // 6b. Nature Megakit foliage — persisted RTS export or deterministic from seed
    const naturePayload =
      this.config.rtsNatureScatter?.instances?.length
        ? this.config.rtsNatureScatter
        : generateRtsNatureScatter(
            islandSeedToNumber(this.config.seed),
            'temperate',
            this.config.rtsHeightmap,
            HOME_ISLAND_WORLD_SIZE_M,
          );
    const foliage = await scatterRtsNatureInScene(naturePayload, this.terrain.terrainMesh);
    if (foliage.children.length > 0) {
      this.scene.add(foliage);
    } else {
      await this.createProceduralForest();
    }

    // 7. Detail layers — animated grass + sand overlays
    this.createDetailLayers();

    // 8. Navigation mesh (needed by AI allies)
    this.navMesh = new TerrainNavMesh(
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
      1024, 1024,
      16, // cell size (doubled for 2x terrain)
    );

    // 9. Ally manager (Gouldstone system)
    this.allyManager = new AllyManager(this.scene, this.navMesh, this.terrain.terrainMesh);

    // 10. Building system — slope/height constraints on camp plateau
    this.building = new BuildingSystem(this.scene, this.camera);
    this.building.setBuildConstraints({
      terrainMesh: this.terrain.terrainMesh,
      minHeightM: HOME_ISLAND_BUILDABLE_MIN_HEIGHT_M,
      maxHeightM: HOME_ISLAND_BUILDABLE_MAX_HEIGHT_M,
      maxSlopeRad: HOME_ISLAND_BUILDABLE_MAX_SLOPE_RAD,
      campCenter: campWorld,
      campRadiusM: HOME_ISLAND_CAMP_CLEAR_RADIUS_M,
      sampleNormal: (x, z) => getTerrainNormalAt(this.terrain!.terrainMesh, x, z),
      sampleHeight: (x, z) => getTerrainHeightAt(this.terrain!.terrainMesh, x, z),
    });

    // 11. Character controller (over-the-shoulder, replaces orbit)
    if (this.config.enableCharacter !== false) {
      this.spawnCharacter();
    }

    // 12. Wildlife — land animals + fish
    this.creatures = new CreatureManager(this.scene, -2, this.config.seed.length);
    // Home island — forest/plains mix, regenerative wildlife 1–5 min respawn
    this.creatures.spawnForBiome(this.terrain.terrainMesh, 'forest', 400);

    // 13. Evil mountain triad — dungeon behind one of three peaks
    await this.createMountainDungeon();

    if (this.navMesh) this.creatures.setNavMesh(this.navMesh);
  }

  /** Build a full ocean sector (10–14 km) with islands, NPCs, hazards, docks */
  private async initZone(): Promise<void> {
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

    // 1. Generate deterministic zone population (shared with server)
    this.zonePopulation = generateZonePopulation(
      sectorId, worldSeed, cfg.sizeMeters,
      sector.difficultyMin, sector.difficultyMax,
      sector.resources, sector.biome,
    );

    // 2. Build the Three.js scene (ocean, islands, markers, lighting)
    this.zoneScene = buildZoneScene(sector, this.zonePopulation);
    this.scene.add(this.zoneScene.root);

    // 2b. Interactive harvest meshes on zone nodes (Warlords era open world)
    await preloadIslandResources().catch(() => undefined);
    const zoneHarvest = spawnZoneHarvestNodes(
      this.scene,
      this.zonePopulation,
      this.zoneScene.islandMeshes,
      this.zoneScene.markers,
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

    // 6. Camera — zoom out for large open-sea zones
    const spawns = getNodesByCategory<SpawnPointNode>(this.zonePopulation, 'spawn_point')
      .filter(s => s.spawnType === 'player');
    const docks = getNodesByCategory<DockNode>(this.zonePopulation, 'dock');
    const entryPoint = spawns[0]?.position ?? docks[0]?.position ?? cfg.spawnPoints[0] ?? [0, 20, 0];
    const camLift = Math.max(180, cfg.sizeMeters * 0.018);
    const camBack = Math.max(280, cfg.sizeMeters * 0.028);

    this.camera.position.set(entryPoint[0], entryPoint[1] + camLift, entryPoint[2] + camBack);
    this.controls.target.set(entryPoint[0], entryPoint[1], entryPoint[2]);
    this.controls.maxDistance = Math.max(2500, cfg.sizeMeters * 0.35);
    this.controls.minDistance = 10;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.update();

    // 7. Grab the first island's terrain mesh for character ground detection
    const firstIslandId = this.zonePopulation.islandIds[0];
    const firstIslandMesh = firstIslandId ? this.zoneScene.islandMeshes.get(firstIslandId) : null;

    // 8. Character controller (spawns at first dock)
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
      const spawnPos = new THREE.Vector3(entryPoint[0], entryPoint[1] + 3, entryPoint[2]);
      this.character = new CharacterController3D({
        scene: this.scene,
        camera: this.camera,
        terrainMesh: firstIslandMesh,
        startPosition: spawnPos,
        physics: { waterLevel: cfg.waterLevel },
        callbacks: this.config.physicsCallbacks,
      });
      this.controls.enabled = false;
      this.characterActive = true;
    }

    // 9. Building system works in zone mode too
    this.building = new BuildingSystem(this.scene, this.camera);

    // 10. Wildlife — biome palette counts (land on dry ground, fish only in water)
    // Animals/monsters are enemy or neutral-attackable (never ally)
    this.creatures = new CreatureManager(this.scene, cfg.waterLevel, sectorId.length + 99);
    this.creatures.spawnForBiome(
      firstIslandMesh,
      sector.biome,
      cfg.sizeMeters * 0.28,
    );

    // 11. Faction NPC camps — stylized camp GLB; same faction ally, others enemy
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
    this.npcCamps = new NpcCampSystem({
      scene: this.scene,
      playerFaction: this.playerFaction,
      waterLevel: cfg.waterLevel,
      sampleHeight: sampleY,
    });
    void spawnZoneCamps(this.npcCamps, islandCenters, {
      playerFaction: this.playerFaction,
      seed: sectorId.length * 9973,
      campsPerIsland: 1,
    }).then((n) => {
      console.log(`[Island3DEngine] Spawned ${n} faction camps in zone`);
    });

    console.log(
      `[Island3DEngine] Zone "${sector.name}" loaded:`,
      `${this.zonePopulation.islandIds.length} islands,`,
      `${this.zonePopulation.nodes.size} total nodes,`,
      `${this.creatures.count} creatures`,
    );
  }

  /** Set player faction so camp banners / AI treat ally vs enemy correctly. */
  setPlayerFaction(faction: CampFaction | string): void {
    this.playerFaction = faction;
    this.npcCamps?.setPlayerFaction(faction);
  }

  /** Place player-owned camp (build mode) at world XZ. */
  async placePlayerCamp(x: number, z: number, faction?: CampFaction): Promise<string | null> {
    if (!this.npcCamps) {
      this.npcCamps = new NpcCampSystem({
        scene: this.scene,
        playerFaction: this.playerFaction,
        waterLevel: PROCEDURAL_WATER_LEVEL,
        sampleHeight: this.terrain
          ? (wx, wz) => getTerrainHeightAt(this.terrain!.terrainMesh, wx, wz)
          : undefined,
      });
    }
    const camp = await this.npcCamps.spawnCamp({
      defId: 'stylized_enemy_camp',
      faction: (faction ?? this.playerFaction) as CampFaction,
      x,
      z,
      ownerAccountId: this.config.accountId ?? 'guest',
    });
    return camp?.data.id ?? null;
  }

  /** Attach bench / storage / tower to nearest camp within radius. */
  async upgradeNearestCamp(
    x: number,
    z: number,
    upgradeId: 'camp_bench' | 'camp_storage' | 'camp_tower' | 'camp_flag' | 'camp_fire',
  ): Promise<boolean> {
    const camp = this.npcCamps?.findNearestCamp(x, z, 24);
    if (!camp) return false;
    // Only upgrade ally camps (or own camps)
    if (camp.relation === 'enemy') return false;
    return this.npcCamps!.addUpgrade(camp.data.id, upgradeId);
  }

  /** Collapse submerged terrain so only the ocean shader shows water (not seafloor + ocean). */
  private flattenTerrainBelowWater(mesh: THREE.Mesh, waterLevel: number, seafloorDepth = -14): void {
    const pos = mesh.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) < waterLevel) pos.setZ(i, seafloorDepth);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  private createWaterPlane(): void {
    this.waterPlane = createOceanMesh({ waterLevel: PROCEDURAL_WATER_LEVEL, size: 1200, segments: 4 });
    this.waterPlane.name = 'ocean';
    this.waterPlane.renderOrder = 1; // draw above submerged seafloor terrain
    this.scene.add(this.waterPlane);
  }

  private createHarvestables(): void {
    if (!this.terrain) return;

    for (const node of this.placedNodes) {
      switch (node.type) {
        case 'tree': {
          // Visual trees come from InstancedProceduralForest; keep harvest hitbox only
          if (this.proceduralForest) {
            const tree = createHarvestableTree(node.position, node.scale * 0.01);
            tree.nodeId = node.id;
            tree.group.visible = false;
            this.trees.push(tree);
            this.scene.add(tree.group);
          } else {
            const tree = createHarvestableTree(node.position, node.scale);
            tree.nodeId = node.id;
            this.trees.push(tree);
            this.scene.add(tree.group);
          }
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

  private async createProceduralForest(): Promise<void> {
    if (!this.terrain) return;

    const glbForest = await scatterGlbTreesFromNodes(this.placedNodes, 90);
    if (glbForest.children.length > 0) {
      this.scene.add(glbForest);
      console.log(`[Island3D] GLB forest: ${glbForest.children.length} trees`);
      return;
    }

    this.proceduralForest = new InstancedProceduralForest();
    const stats = this.proceduralForest.generate(
      this.config.seed,
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
      1024,
      { treeCount: 200, forestRadius: 380, clearRadius: 50 },
    );
    if (stats.trees > 0) {
      this.scene.add(this.proceduralForest.group);
      console.log(`[Island3D] Procedural forest: ${stats.trees} trees, ${stats.branches} branches, ${stats.leaves} leaves`);
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
        const name = this.mountainTriad?.triad.dungeon.name ?? 'Dungeon';
        this.config.onDungeonEnter?.(dungeonId, name);
      },
    });
    if (!triadResult) return;

    const facingYaw = Math.atan2(-triadResult.anchor.x, -triadResult.anchor.z);
    this.mountainTriad = new EvilMountainTriadSystem(triadResult, facingYaw);
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
        const name = this.mountainTriad?.triad.dungeon.name ?? 'Dungeon';
        this.config.onDungeonEnter?.(dungeonId, name);
      },
    });
    if (!triadResult) return;

    const facingYaw = Math.atan2(-triadResult.anchor.x, -triadResult.anchor.z);
    this.mountainTriad = new EvilMountainTriadSystem(triadResult, facingYaw);
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

  /** Spawn or respawn the playable character */
  private spawnCharacter(): void {
    if (!this.terrain) return;

    const campPct = this.config.campPositionPercent ?? HOME_ISLAND_DEFAULT_CAMP_PERCENT;
    const campWorld = campPercentToWorld(campPct, HOME_ISLAND_WORLD_SIZE_M);
    const spawnY = getTerrainHeightAt(this.terrain.terrainMesh, campWorld.x, campWorld.z) ?? 20;
    const startPos = new THREE.Vector3(campWorld.x, spawnY + 2, campWorld.z);

    this.character = new CharacterController3D({
      scene: this.scene,
      camera: this.camera,
      terrainMesh: this.terrain.terrainMesh,
      startPosition: startPos,
      physics: { waterLevel: PROCEDURAL_WATER_LEVEL },
      callbacks: this.config.physicsCallbacks,
    });

    // Disable orbit controls — character owns the camera now
    this.controls.enabled = false;
    this.characterActive = true;
  }

  /** Update detail layers (grass/sand animation) */
  private updateDetailLayers(dt: number): void {
    const time = this.clock.elapsedTime;
    const camPos = this.camera.position;

    this.grassLayer?.update(time, camPos);
    this.sandLayer?.update(time, camPos);
    this.grassBlades?.update(time, camPos);
  }

  /** Update Gerstner wave ocean shader + sync sun direction from day/night */
  private updateWater(dt: number): void {
    if (!this.waterPlane) return;
    const mat = this.waterPlane.material;
    if (mat && 'uniforms' in mat) {
      const sunDir = this.dayNight?.getSunDirection();
      updateOceanMaterial(mat as THREE.ShaderMaterial, this.clock.elapsedTime, sunDir);
    }
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

      if (tree.shaking && tree.fallPhase === 'live') {
        tree.shakeTime += dt;
        const shake = Math.sin(tree.shakeTime * 15) * Math.max(0, 0.1 - tree.shakeTime * 0.05);
        tree.group.rotation.z = shake;
        if (tree.shakeTime > 2) {
          tree.shaking = false;
          tree.shakeTime = 0;
          tree.group.rotation.z = 0;
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

  private async completeTreeFall(tree: HarvestableTree): Promise<void> {
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
    this.clock.start();
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

  private loop = (): void => {
    if (!this.isRunning) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const simDt = dt * this.simTickRate;

    // Camera: Grudge6 on foot/deck/swim, or orbit when no character
    if (this.characterActive && this.character) {
      if (this.lobbyShip) {
        this.lobbyShip.update(dt, this.character.getKeys(), this.character.getCameraYaw());
      }
      this.character.update(dt);
    } else {
      this.controls.update();
    }

    if (this.lobbyCapture && this.character) {
      this.lobbyCapture.update(dt, this.character.getPosition(), this.lobbyCapturing);
    }

    if (this.lobbyPlayZone && this.character) {
      this.lobbyPlayZone.npcController.setPlayerPosition(this.character.getPosition());
      this.lobbyPlayZone.update(dt, this.camera.position);
    }

    this.updateWater(dt);
    this.updateHarvestables(dt);
    this.updateDetailLayers(dt);
    this.zoneScene?.update(dt, this.clock.elapsedTime);
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

    if (this.harvestZones && !this.lobbyPlayZone) {
      this.harvestZones.update(dt, this.camera.position);
    } else if (this.proceduralForest) {
      this.proceduralForest.update(dt, this.camera.position);
    }

    // External update hooks (RemotePlayerManager, TownNPCController, etc.)
    for (const fn of this.externalUpdates) fn(dt);

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

  /** Press E/F near interactables — dungeon portal, capture point, or ship dock. */
  handleInteractKey(): boolean {
    if (this.mountainTriad?.tryInteract()) return true;

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

  /** Is the dungeon portal prompting interaction? */
  get dungeonPortalActive(): boolean {
    return this.mountainTriad?.canInteract ?? false;
  }

  /** HUD hint for the evil mountain triad (approach / discovered / interact). */
  get mountainHintState() {
    return this.mountainTriad?.hintState ?? 'none';
  }

  /** Name of the home-island dungeon behind the secret peak. */
  get mountainDungeonName(): string | null {
    return this.mountainTriad?.triad.dungeon.name ?? null;
  }

  /** Handle mouse click — building placement (LMB) or harvesting / combat */
  handleClick(clientX: number, clientY: number): void {
    // Build mode: LMB places light-blue ghost at cursor
    if (this.building?.isBuilding) {
      if (this.building.isPropPlacing) {
        const selectedId = this.building.selectedPropId;
        const result = this.building.confirmPropPlacement();
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
            selectedId === 'camp_tower_upgrade')
        ) {
          const props = this.building.getAllProps();
          const last = props.find((p) => p.id === result.id);
          const map: Record<string, 'camp_bench' | 'camp_storage' | 'camp_tower'> = {
            camp_bench_upgrade: 'camp_bench',
            camp_storage_upgrade: 'camp_storage',
            camp_tower_upgrade: 'camp_tower',
          };
          if (last && selectedId && map[selectedId]) {
            void this.upgradeNearestCamp(last.position.x, last.position.z, map[selectedId]);
          }
        }
        return;
      }
      this.building.confirmPlacement();
      return;
    }

    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // In combat mode, attack nearest creature
    if (this.character?.mode === 'combat' && this.creatures) {
      const playerPos = this.character.getPosition();
      const nearest = this.creatures.findNearest(playerPos, 20);
      if (nearest) {
        this.creatures.dealDamage(nearest.id, 15);
        return;
      }
    }

    // Check tree hits (only mature / harvestable)
    for (const tree of this.trees) {
      if (tree.fallPhase !== 'live' || !isHarvestable(tree as any)) continue;
      const hits = this.raycaster.intersectObject(tree.group, true);
      if (hits.length > 0) {
        tree.health--;
        tree.shaking = true;
        tree.shakeTime = 0;
        if (tree.health <= 0) {
          beginTreeFall(tree);
          markDepleted(tree as any, 'tree', false);
        }
        return;
      }
    }

    // Check rock hits
    for (const rock of this.rocks) {
      if (!isHarvestable(rock as any)) continue;
      const hits = this.raycaster.intersectObject(rock.group, true);
      if (hits.length > 0) {
        rock.health--;
        rock.chipping = true;
        rock.chipTime = 0;
        const scale = Math.max(0.3, rock.health / rock.maxHealth);
        rock.group.scale.setScalar(rock.baseScale * scale);
        void this.spawnRockDebris(rock, 1);
        if (rock.health <= 0) {
          markDepleted(rock as any, 'rock', true);
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
        const scale = Math.max(0.35, crystal.health / crystal.maxHealth);
        crystal.group.scale.setScalar(crystal.baseScale * scale);
        void spawnResourceDrops(this.scene, crystal.group.position, 'gem', 1).then((d) => {
          this.harvestDrops.push(...d);
        });
        if (crystal.health <= 0) {
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
        const scale = Math.max(0.4, hemp.health / hemp.maxHealth);
        hemp.group.scale.setScalar(hemp.baseScale * scale);
        if (hemp.health <= 0) {
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
        const scale = Math.max(0.4, flower.health / flower.maxHealth);
        flower.group.scale.setScalar(flower.baseScale * scale);
        if (flower.health <= 0) {
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
        const scale = Math.max(0.4, scrap.health / scrap.maxHealth);
        scrap.group.scale.setScalar(scrap.baseScale * scale);
        void spawnResourceDrops(this.scene, scrap.group.position, 'debris', 1).then((d) => {
          this.harvestDrops.push(...d);
        });
        if (scrap.health <= 0) {
          markDepleted(scrap as any, 'scrap', true);
          void this.emitHarvestDrops(scrap.group.position.clone(), 'debris', 3, scrap.nodeId, 'mining');
        }
        return;
      }
    }
  }

  /** Handle mouse move — light-blue build ghost follows cursor */
  handleMouseMove(clientX: number, clientY: number): void {
    if (!this.building?.isBuilding) return;
    if (this.building.isPropPlacing) {
      this.building.updatePropGhostPosition(clientX, clientY, this.config.canvas);
    } else {
      this.building.updateGhostPosition(clientX, clientY, this.config.canvas);
    }
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

  get isBuildPlacing(): boolean {
    return this.building?.isBuilding ?? false;
  }

  /** Get the Three.js scene (for adding remote player meshes, etc.) */
  getScene(): THREE.Scene {
    return this.scene;
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
    this.characterActive = enabled;
    this.controls.enabled = !enabled;
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
    this.destroy();
  }

  destroy(): void {
    this.stop();
    this.creatures?.dispose();
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
    this.lobbyCollider?.dispose();
    if (this.lobbyCollider?.colliderMesh.parent) {
      this.scene.remove(this.lobbyCollider.colliderMesh);
    }
    this.zoneScene?.dispose();
    this.grassLayer?.dispose();
    this.sandLayer?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
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
