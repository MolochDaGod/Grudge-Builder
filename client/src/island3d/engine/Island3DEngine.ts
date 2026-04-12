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

export interface Island3DEngineConfig {
  seed: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export class Island3DEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isRunning = false;

  // Terrain
  public terrain: IslandTerrainResult | null = null;
  private waterPlane: THREE.Mesh | null = null;

  // Interactable objects
  public trees: HarvestableTree[] = [];
  public rocks: HarvestableRock[] = [];
  public placedNodes: PlacedNode3D[] = [];

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
  }

  private setupLighting(): void {
    // Hemisphere light — sky + ground ambient
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.6);
    this.scene.add(hemi);

    // Directional sun light with shadows
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(150, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -300;
    sun.shadow.camera.right = 300;
    sun.shadow.camera.top = 300;
    sun.shadow.camera.bottom = -300;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 800;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    // Subtle fill light from opposite side
    const fill = new THREE.DirectionalLight(0x8ec8e8, 0.3);
    fill.position.set(-100, 80, -100);
    this.scene.add(fill);
  }

  /** Generate terrain, water, nodes, decorations */
  async init(): Promise<void> {
    // 1. Generate terrain
    const terrainMaterial = createTerrainMaterial();
    const terrainConfig: IslandTerrainConfig = {
      seed: this.config.seed,
      xSegments: 127,
      ySegments: 127,
      xSize: 512,
      ySize: 512,
      minHeight: -30,
      maxHeight: 80,
    };

    this.terrain = generateIslandTerrain(terrainConfig);
    // Apply the blended material
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
      512, 512,
      this.config.seed,
    );

    // 4. Create harvestable objects from placed nodes
    this.createHarvestables();

    // 5. Scatter decorations
    this.createDecorations();
  }

  private createWaterPlane(): void {
    const waterGeo = new THREE.PlaneGeometry(800, 800, 1, 1);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x1a6e8e,
      transparent: true,
      opacity: 0.7,
      shininess: 100,
      specular: 0x4488aa,
      side: THREE.DoubleSide,
    });
    this.waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.y = -2; // slightly below terrain water level
    this.waterPlane.receiveShadow = true;
    this.scene.add(this.waterPlane);
  }

  private createHarvestables(): void {
    if (!this.terrain) return;

    for (const node of this.placedNodes) {
      if (node.type === 'tree') {
        const tree = createHarvestableTree(node.position, node.scale);
        this.trees.push(tree);
        this.scene.add(tree.group);
      } else if (node.type === 'rock') {
        const rock = createHarvestableRock(node.position, node.scale);
        this.rocks.push(rock);
        this.scene.add(rock.group);
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

  /** Animate water UV offset for wave effect */
  private updateWater(dt: number): void {
    if (!this.waterPlane) return;
    const mat = this.waterPlane.material as THREE.MeshPhongMaterial;
    if (mat.map) {
      mat.map.offset.x += dt * 0.01;
      mat.map.offset.y += dt * 0.005;
    }
    // Gentle bobbing
    this.waterPlane.position.y = -2 + Math.sin(this.clock.elapsedTime * 0.5) * 0.3;
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
    this.controls.update();
    this.updateWater(dt);
    this.updateHarvestables(dt);

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /** Handle mouse click for harvesting */
  handleClick(clientX: number, clientY: number): void {
    const rect = this.config.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check tree hits
    for (const tree of this.trees) {
      const hits = this.raycaster.intersectObject(tree.group, true);
      if (hits.length > 0) {
        tree.health--;
        tree.shaking = true;
        tree.shakeTime = 0;
        if (tree.health <= 0) {
          tree.group.visible = false;
          // TODO: trigger loot drop, respawn timer
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
        // Scale down to simulate chipping
        const scale = Math.max(0.3, rock.health / rock.maxHealth);
        rock.group.scale.setScalar(rock.baseScale * scale);
        if (rock.health <= 0) {
          rock.group.visible = false;
          // TODO: trigger loot drop, respawn timer
        }
        return;
      }
    }
  }

  destroy(): void {
    this.stop();
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
