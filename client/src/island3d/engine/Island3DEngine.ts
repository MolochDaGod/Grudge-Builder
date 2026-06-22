/**
 * Island3DEngine — orchestrates the full 3D island scene.
 *
 * Creates the Three.js renderer, scene, camera, lighting, water plane,
 * terrain, resource nodes, decorations, and runs the game loop.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  generateIslandTerrain,
  getTerrainHeightAt,
  type IslandTerrainConfig,
  type IslandTerrainResult,
} from '../terrain/IslandTerrainGenerator';
import { createTerrainMaterial } from '../terrain/TerrainMaterial';
import { placeResourceNodes, type PlacedNode3D } from '../terrain/NodePlacer';
import { createScatterDecorations } from '../objects/ScatterDecorations';
import { createHarvestableTree, type HarvestableTree } from '../objects/HarvestableTree';
import { createHarvestableRock, type HarvestableRock } from '../objects/HarvestableRock';
import {
  createCrystalCluster, createHempPlant, createFlowerPatch, createDock,
  type HarvestableCrystal, type HarvestableHemp, type HarvestableFlower,
} from '../objects/HomeIslandNodes';
import { DetailLayer, createGrassBlades } from '../terrain/DetailLayers';
import { MultiplayerSync, type MultiplayerConfig } from '../sync/MultiplayerSync';
import { loadLobbyMap, getLobbyMap, type LobbyMapDef, type LobbyLoadResult } from './LobbyIslandLoader';
import { createOceanMesh, updateOceanMaterial } from '../terrain/WaterMaterial';
import { PostProcessing, type QualityPreset } from '../render/PostProcessing';
import { DayNightCycle, type DayNightConfig } from '../environment/DayNightCycle';
import { CharacterController3D, type CharacterController3DConfig, type PhysicsCallbacks } from '../player/CharacterController3D';
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

export type Island3DMode = 'procedural' | 'lobby' | 'zone';

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

  // Raycaster for mouse picking
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

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

  /** Load a pre-built GLTF lobby map */
  private async initLobby(): Promise<void> {
    const mapDef = getLobbyMap(this.config.lobbyMapId);

    this.lobbyResult = await loadLobbyMap(mapDef, this.config.onLoadProgress);
    this.scene.add(this.lobbyResult.scene);

    // Position camera to frame the map
    this.camera.position.copy(mapDef.cameraPosition);
    this.controls.target.copy(mapDef.cameraTarget);
    this.controls.maxDistance = Math.max(mapDef.cameraPosition.length() * 3, 1000);
    this.controls.minDistance = 5;
    this.controls.maxPolarAngle = Math.PI * 0.85; // allow more vertical freedom on lobby
    this.controls.update();

    // Play any embedded animations
    if (this.lobbyResult.animations.length > 0) {
      this.lobbyAnimMixer = new THREE.AnimationMixer(this.lobbyResult.scene);
      for (const clip of this.lobbyResult.animations) {
        this.lobbyAnimMixer.clipAction(clip).play();
      }
    }

    // Adjust fog for the larger map
    const maxDim = Math.max(
      this.lobbyResult.size.x,
      this.lobbyResult.size.y,
      this.lobbyResult.size.z,
    );
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.5 / maxDim);
  }

  /** Generate procedural seed-based terrain with nodes & decorations */
  private async initProcedural(): Promise<void> {
    // 1. Generate terrain
    const terrainMaterial = createTerrainMaterial();
    const terrainConfig: IslandTerrainConfig = {
      seed: this.config.seed,
      xSegments: 63,
      ySegments: 63,
      xSize: 1024,
      ySize: 1024,
      minHeight: -30,
      maxHeight: 80,
    };

    this.terrain = generateIslandTerrain(terrainConfig);
    this.terrain.terrainMesh.material = terrainMaterial;
    this.scene.add(this.terrain.terrainScene);

    // 2. Water plane
    this.createWaterPlane();

    // 3. Place resource nodes
    this.placedNodes = placeResourceNodes(
      this.terrain.biomeMap,
      this.terrain.terrainMesh,
      this.terrain.gridW,
      this.terrain.gridH,
      1024, 1024,
      this.config.seed,
    );

    // 4. Create harvestable objects from placed nodes
    this.createHarvestables();

    // 5. Scatter decorations
    this.createDecorations();

    // 6. Detail layers — animated grass + sand overlays
    this.createDetailLayers();

    // 7. Navigation mesh (needed by AI allies)
    this.navMesh = new TerrainNavMesh(
      this.terrain.terrainMesh,
      this.terrain.biomeMap,
      this.terrain.gridW,
      this.terrain.gridH,
      1024, 1024,
      16, // cell size (doubled for 2x terrain)
    );

    // 8. Ally manager (Gouldstone system)
    this.allyManager = new AllyManager(this.scene, this.navMesh, this.terrain.terrainMesh);

    // 9. Building system
    this.building = new BuildingSystem(this.scene, this.camera);

    // 10. Character controller (over-the-shoulder, replaces orbit)
    if (this.config.enableCharacter !== false) {
      this.spawnCharacter();
    }

    // 11. Wildlife — land animals + fish
    this.creatures = new CreatureManager(this.scene, -2, this.config.seed.length);
    this.creatures.spawnLandCreatures(this.terrain.terrainMesh, 15, 400);
    this.creatures.spawnFish(10, 450);
  }

  /** Build a full 4 km ocean sector with islands, NPCs, hazards, docks */
  private async initZone(): Promise<void> {
    const sectorId = this.config.sectorId;
    const worldSeed = this.config.worldSeed || 'grudge-world-1';

    if (!sectorId) {
      console.error('[Island3DEngine] mode="zone" requires config.sectorId');
      return this.initProcedural(); // fallback
    }

    const sector = getSectorById(sectorId);
    if (!sector) {
      console.error(`[Island3DEngine] Unknown sector: ${sectorId}`);
      return this.initProcedural();
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

    // 6. Camera — zoom out for the 4 km zone, center on first dock or spawn
    const spawns = getNodesByCategory<SpawnPointNode>(this.zonePopulation, 'spawn_point')
      .filter(s => s.spawnType === 'player');
    const docks = getNodesByCategory<DockNode>(this.zonePopulation, 'dock');
    const entryPoint = spawns[0]?.position ?? docks[0]?.position ?? cfg.spawnPoints[0] ?? [0, 20, 0];

    this.camera.position.set(entryPoint[0], entryPoint[1] + 150, entryPoint[2] + 250);
    this.controls.target.set(entryPoint[0], entryPoint[1], entryPoint[2]);
    this.controls.maxDistance = 2000;
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

    // 10. Wildlife — scale to zone size
    this.creatures = new CreatureManager(this.scene, cfg.waterLevel, sectorId.length + 99);
    if (firstIslandMesh) {
      this.creatures.spawnLandCreatures(firstIslandMesh, 12, cfg.sizeMeters * 0.3);
    }
    this.creatures.spawnFish(8, cfg.sizeMeters * 0.4);

    console.log(
      `[Island3DEngine] Zone "${sector.name}" loaded:`,
      `${this.zonePopulation.islandIds.length} islands,`,
      `${this.zonePopulation.nodes.size} total nodes,`,
      `${this.creatures.count} creatures`,
    );
  }

  private createWaterPlane(): void {
    this.waterPlane = createOceanMesh({ waterLevel: -2, size: 1200, segments: 4 });
    this.waterPlane.name = 'ocean';
    this.waterPlane.renderOrder = 1; // draw above submerged seafloor terrain
    this.scene.add(this.waterPlane);
  }

  private createHarvestables(): void {
    if (!this.terrain) return;

    for (const node of this.placedNodes) {
      switch (node.type) {
        case 'tree': {
          const tree = createHarvestableTree(node.position, node.scale);
          this.trees.push(tree);
          this.scene.add(tree.group);
          break;
        }
        case 'rock': {
          const rock = createHarvestableRock(node.position, node.scale);
          this.rocks.push(rock);
          this.scene.add(rock.group);
          break;
        }
        case 'crystal': {
          const crystal = createCrystalCluster(node.position, node.scale);
          this.crystals.push(crystal);
          this.scene.add(crystal.group);
          break;
        }
        case 'hemp': {
          const hemp = createHempPlant(node.position, node.scale);
          this.hemps.push(hemp);
          this.scene.add(hemp.group);
          break;
        }
        case 'flower': {
          const flower = createFlowerPatch(node.position, node.scale);
          this.flowers.push(flower);
          this.scene.add(flower.group);
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

    // Find a walkable spawn point near island center
    const spawnY = getTerrainHeightAt(this.terrain.terrainMesh, 0, 0) ?? 20;
    const startPos = new THREE.Vector3(0, spawnY + 2, 0);

    this.character = new CharacterController3D({
      scene: this.scene,
      camera: this.camera,
      terrainMesh: this.terrain.terrainMesh,
      startPosition: startPos,
      physics: { waterLevel: -2 },
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

  /** Update harvestable animations */
  private updateHarvestables(dt: number): void {
    for (const tree of this.trees) {
      if (tree.shaking) {
        tree.shakeTime += dt;
        const shake = Math.sin(tree.shakeTime * 15) * Math.max(0, 0.1 - tree.shakeTime * 0.05);
        tree.group.rotation.z = shake;
        if (tree.shakeTime > 2) {
          tree.shaking = false;
          tree.shakeTime = 0;
          tree.group.rotation.z = 0;
        }
      }
    }

    for (const rock of this.rocks) {
      if (rock.chipping) {
        rock.chipTime += dt;
        if (rock.chipTime > 0.3) {
          rock.chipping = false;
          rock.chipTime = 0;
        }
      }
    }
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

  private loop = (): void => {
    if (!this.isRunning) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);

    // Camera: either character controller or orbit controls
    if (this.characterActive && this.character) {
      this.character.update(dt);
    } else {
      this.controls.update();
    }

    this.updateWater(dt);
    this.updateHarvestables(dt);
    this.updateDetailLayers(dt);
    this.zoneScene?.update(dt, this.clock.elapsedTime);
    this.lobbyAnimMixer?.update(dt);
    this.multiplayer?.update(dt);

    // Day/night cycle
    this.dayNight?.update(dt);

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

  /** Handle mouse click — building placement or harvesting */
  handleClick(clientX: number, clientY: number): void {
    // If building mode is active, confirm placement
    if (this.building?.isBuilding) {
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

    // Check tree hits
    for (const tree of this.trees) {
      const hits = this.raycaster.intersectObject(tree.group, true);
      if (hits.length > 0) {
        tree.health--;
        tree.shaking = true;
        tree.shakeTime = 0;
        if (tree.health <= 0) {
          tree.group.visible = false;
        }
        return;
      }
    }

    // Check rock hits
    for (const rock of this.rocks) {
      const hits = this.raycaster.intersectObject(rock.group, true);
      if (hits.length > 0) {
        rock.health--;
        rock.chipping = true;
        rock.chipTime = 0;
        const scale = Math.max(0.3, rock.health / rock.maxHealth);
        rock.group.scale.setScalar(rock.baseScale * scale);
        if (rock.health <= 0) {
          rock.group.visible = false;
        }
        return;
      }
    }
  }

  /** Handle mouse move — building ghost snap preview */
  handleMouseMove(clientX: number, clientY: number): void {
    if (this.building?.isBuilding) {
      this.building.updateGhostPosition(clientX, clientY, this.config.canvas);
    }
  }

  /** Enter building mode for a piece type */
  startBuilding(type: PieceType): void {
    this.building?.startPlacement(type);
  }

  /** Cancel building mode */
  cancelBuilding(): void {
    this.building?.cancelPlacement();
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
    this.character?.destroy();
    this.allyManager?.destroy();
    this.building?.destroy();
    this.multiplayer?.destroy();
    this.lobbyAnimMixer?.stopAllAction();
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
