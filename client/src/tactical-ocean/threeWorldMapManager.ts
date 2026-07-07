import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { IslandGenerator } from './islandGenerator';
import { OceanEnvironment } from '@/game/ocean/OceanEnvironment';
import { ShipPrefabFactory } from '@/game/sailing/ShipPrefabs';
import { getPrefabKeyForSize } from '@shared/definitions/shipCatalog';
import type { ShipSize } from '@shared/definitions/islandAssetManifest';
import { TACTICAL_OCEAN_SIZE_METERS } from '@shared/definitions/zoneLayout';

export type CameraMode = 'third-person' | 'birds-eye';

export interface WindState {
  direction: number;
  speed: number;
  gustFactor: number;
}

export type SailPosition = 0 | 1 | 2 | 3; // 0=furled, 1=partial, 2=deployed, 3=full

export interface Ship3D {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotation: number;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  name: string;
  level: number;
  sailAngle: number;
  sailPosition: SailPosition;
  sailMesh?: THREE.Mesh;
  sailGroup?: THREE.Group;
  windMagicActive?: boolean;
  windMagicTimer?: number;
}

export interface Island3D {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  name: string;
  biome: string;
  discovered: boolean;
}

export interface Cannonball3D {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ownerId: string;
  damage: number;
  lifetime: number;
}

export interface Treasure3D {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  value: number;
  collected: boolean;
}

export class ThreeWorldMapManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private mainCamera: THREE.PerspectiveCamera;
  private birdsEyeCamera: THREE.OrthographicCamera;
  private activeCamera: THREE.Camera;
  private cameraMode: CameraMode = 'third-person';
  
  private oceanEnv: OceanEnvironment | null = null;
  private sky: Sky | null = null;
  private sun: THREE.Vector3;
  private shipPrefabFactory: ShipPrefabFactory | null = null;
  
  private playerShip: Ship3D | null = null;
  private npcShips: Map<string, Ship3D> = new Map();
  private islands: Map<string, Island3D> = new Map();
  private cannonballs: Map<string, Cannonball3D> = new Map();
  private treasures: Map<string, Treasure3D> = new Map();
  
  private clock: THREE.Clock;
  private container: HTMLElement | null = null;
  
  private cameraOffset = new THREE.Vector3(0, 15, -30);
  private cameraLookOffset = new THREE.Vector3(0, 0, 20);
  
  private worldSize = TACTICAL_OCEAN_SIZE_METERS;
  
  // Day/night and weather systems
  private timeOfDay = 0.3;  // 0-1, 0.3 = morning
  private daySpeed = 0.01;  // Speed of day/night cycle
  private weatherState: 'clear' | 'cloudy' | 'stormy' | 'foggy' = 'clear';
  private weatherTimer = 300;  // Seconds until next weather change
  
  private wind: WindState = {
    direction: Math.PI / 4,
    speed: 15,
    gustFactor: 1.0
  };
  
  private aimingState: {
    isAiming: boolean;
    arcMesh: THREE.Line | null;
    targetMesh: THREE.Mesh | null;
    aimDirection: THREE.Vector3;
  } = {
    isAiming: false,
    arcMesh: null,
    targetMesh: null,
    aimDirection: new THREE.Vector3(0, 0, 1)
  };
  
  private islandGenerator: IslandGenerator;
  
  constructor() {
    this.islandGenerator = new IslandGenerator();
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false 
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    
    this.scene = new THREE.Scene();
    const viewFar = this.worldSize * 1.5;
    this.scene.fog = new THREE.Fog(0x87ceeb, 200, this.worldSize * 1.2);
    
    this.mainCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      viewFar
    );
    this.mainCamera.position.set(0, 15, 30);
    
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 200;
    this.birdsEyeCamera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      viewFar
    );
    this.birdsEyeCamera.position.set(0, 500, 0);
    this.birdsEyeCamera.lookAt(0, 0, 0);
    
    this.activeCamera = this.mainCamera;
    
    this.sun = new THREE.Vector3();
    this.clock = new THREE.Clock();
    
    this.setupLighting();
    this.setupSkybox();
    this.setupOcean();
  }
  
  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c5c, 0.4);
    this.scene.add(hemisphereLight);
  }
  
  private setupSkybox() {
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);
    
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    
    const phi = THREE.MathUtils.degToRad(88);
    const theta = THREE.MathUtils.degToRad(180);
    this.sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(this.sun);
  }
  
  private setupOcean() {
    this.oceanEnv = new OceanEnvironment(this.scene, this.worldSize, 256);
    this.shipPrefabFactory = new ShipPrefabFactory(this.scene);

    const gridHelper = new THREE.GridHelper(this.worldSize, 180, 0x003366, 0x004488);
    gridHelper.position.y = 0.1;
    (gridHelper.material as THREE.Material).opacity = 0.12;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private updateOceanEnvironment(delta: number) {
    if (!this.oceanEnv) return;
    const storm =
      this.weatherState === 'stormy' ? 0.65 :
      this.weatherState === 'foggy' ? 0.15 : 0;
    this.oceanEnv.update(delta, this.wind, this.sun, storm);
  }
  
  updateDayNightCycle(delta: number) {
    this.timeOfDay = (this.timeOfDay + delta * this.daySpeed) % 1;
    
    if (!this.sky) return;
    
    const skyUniforms = this.sky.material.uniforms;
    
    // Sun position based on time of day (0=midnight, 0.5=noon)
    const sunAngle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const elevation = Math.sin(sunAngle);
    const phi = THREE.MathUtils.degToRad(90 - elevation * 80);
    const theta = THREE.MathUtils.degToRad(180 + this.timeOfDay * 360);
    
    this.sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(this.sun);
    
    // Adjust sky colors based on time
    if (this.timeOfDay < 0.25 || this.timeOfDay > 0.75) {
      // Night
      skyUniforms['turbidity'].value = 2;
      skyUniforms['rayleigh'].value = 0.5;
      this.renderer.toneMappingExposure = 0.3;
      this.scene.fog = new THREE.Fog(0x0a0a20, 100, 2000);
    } else if (this.timeOfDay < 0.35 || this.timeOfDay > 0.65) {
      // Dawn/Dusk
      skyUniforms['turbidity'].value = 15;
      skyUniforms['rayleigh'].value = 4;
      this.renderer.toneMappingExposure = 0.5;
      this.scene.fog = new THREE.Fog(0xff8844, 150, 3000);
    } else {
      // Day
      skyUniforms['turbidity'].value = 10;
      skyUniforms['rayleigh'].value = 2;
      this.renderer.toneMappingExposure = 0.6;
      this.scene.fog = new THREE.Fog(0x87ceeb, 200, 4500);
    }
  }
  
  updateWeather(delta: number) {
    this.weatherTimer -= delta;
    
    if (this.weatherTimer <= 0) {
      // Change weather
      const weathers: Array<'clear' | 'cloudy' | 'stormy' | 'foggy'> = ['clear', 'cloudy', 'stormy', 'foggy'];
      const weights = [0.5, 0.25, 0.15, 0.1];  // Clear is most common
      const rand = Math.random();
      let cumWeight = 0;
      for (let i = 0; i < weathers.length; i++) {
        cumWeight += weights[i];
        if (rand < cumWeight) {
          this.weatherState = weathers[i];
          break;
        }
      }
      this.weatherTimer = 120 + Math.random() * 300;  // 2-7 minutes
    }
    
    // Apply weather effects
    switch (this.weatherState) {
      case 'stormy':
        this.wind.speed = 25 + Math.random() * 10;
        this.wind.gustFactor = 1.2 + Math.random() * 0.5;
        break;
      case 'cloudy':
        this.wind.speed = 12 + Math.random() * 5;
        this.wind.gustFactor = 0.9 + Math.random() * 0.2;
        break;
      case 'foggy':
        this.wind.speed = 5 + Math.random() * 5;
        this.scene.fog = new THREE.Fog(0x888888, 50, 500);
        break;
      default:
        this.wind.speed = 15;
        this.wind.gustFactor = 0.9 + Math.random() * 0.2;
    }
  }
  
  getWeatherState() {
    return this.weatherState;
  }
  
  getTimeOfDay() {
    return this.timeOfDay;
  }
  
  mount(container: HTMLElement) {
    this.container = container;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    
    this.updateCameraAspect(container.clientWidth, container.clientHeight);
    
    window.addEventListener('resize', this.handleResize);
  }
  
  unmount() {
    window.removeEventListener('resize', this.handleResize);
    
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.container = null;
  }
  
  private handleResize = () => {
    if (!this.container) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.updateCameraAspect(width, height);
  };
  
  private updateCameraAspect(width: number, height: number) {
    this.mainCamera.aspect = width / height;
    this.mainCamera.updateProjectionMatrix();
    
    const aspect = width / height;
    const frustumSize = 200;
    this.birdsEyeCamera.left = -frustumSize * aspect / 2;
    this.birdsEyeCamera.right = frustumSize * aspect / 2;
    this.birdsEyeCamera.top = frustumSize / 2;
    this.birdsEyeCamera.bottom = -frustumSize / 2;
    this.birdsEyeCamera.updateProjectionMatrix();
  }
  
  setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    this.activeCamera = mode === 'third-person' ? this.mainCamera : this.birdsEyeCamera;
  }
  
  getCameraMode(): CameraMode {
    return this.cameraMode;
  }
  
  /** Spawn player ship from canonical ship catalog (3D prefab + GLB). */
  createPlayerShipFromCatalog(
    id: string,
    position: THREE.Vector3,
    name: string,
    shipSize: ShipSize = 'rowboat',
  ): Ship3D {
    if (!this.shipPrefabFactory) {
      return this.createPlayerShip(id, position, name);
    }
    const prefabKey = getPrefabKeyForSize(shipSize);
    const prefab = this.shipPrefabFactory.createShipPrefab(prefabKey, position.clone());
    void this.shipPrefabFactory.loadCustomShipModel(prefab);

    const shipGroup = prefab.group;
    shipGroup.position.copy(position);
    this.scene.add(shipGroup);

    const sailMesh = prefab.sailMesh;
    const ship: Ship3D = {
      id,
      mesh: shipGroup,
      position: position.clone(),
      rotation: 0,
      velocity: new THREE.Vector3(),
      health: 100,
      maxHealth: 100,
      isPlayer: true,
      name,
      level: 1,
      sailAngle: 0,
      sailPosition: 0,
      sailMesh,
      windMagicActive: false,
      windMagicTimer: 0,
    };
    this.playerShip = ship;
    return ship;
  }

  createPlayerShip(id: string, position: THREE.Vector3, name: string = 'Captain'): Ship3D {
    const shipGroup = new THREE.Group();
    const innerGroup = new THREE.Group();
    
    const hullGeometry = new THREE.BoxGeometry(4, 2, 10);
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.8,
      metalness: 0.1
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 1;
    innerGroup.add(hull);
    
    const deckGeometry = new THREE.BoxGeometry(3.5, 0.3, 9);
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xdeb887,
      roughness: 0.9
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 2.15;
    innerGroup.add(deck);
    
    const mastGeometry = new THREE.CylinderGeometry(0.2, 0.3, 12, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 8, 0);
    innerGroup.add(mast);
    
    const sailGeometry = new THREE.PlaneGeometry(6, 8);
    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0, 9, 0.5);
    sail.rotation.y = Math.PI / 2;
    innerGroup.add(sail);
    
    const flagGeometry = new THREE.PlaneGeometry(2, 1.5);
    const flagMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      side: THREE.DoubleSide 
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0, 14.5, 0);
    innerGroup.add(flag);
    
    innerGroup.rotation.y = Math.PI;
    shipGroup.add(innerGroup);
    
    shipGroup.position.copy(position);
    this.scene.add(shipGroup);
    
    const ship: Ship3D = {
      id,
      mesh: shipGroup,
      position: position.clone(),
      rotation: 0,
      velocity: new THREE.Vector3(),
      health: 100,
      maxHealth: 100,
      isPlayer: true,
      name,
      level: 1,
      sailAngle: 0,
      sailPosition: 0,
      sailMesh: sail,
      windMagicActive: false,
      windMagicTimer: 0
    };
    
    this.playerShip = ship;
    return ship;
  }
  
  createNPCShip(id: string, position: THREE.Vector3, name: string, level: number): Ship3D {
    const shipGroup = new THREE.Group();
    const innerGroup = new THREE.Group();
    
    const hullGeometry = new THREE.BoxGeometry(3.5, 1.8, 9);
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d1810,
      roughness: 0.8
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.position.y = 0.9;
    innerGroup.add(hull);
    
    const deckGeometry = new THREE.BoxGeometry(3, 0.25, 8);
    const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 1.9;
    innerGroup.add(deck);
    
    const mastGeometry = new THREE.CylinderGeometry(0.15, 0.25, 10, 8);
    const mastMaterial = new THREE.MeshStandardMaterial({ color: 0x2d1810 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.set(0, 6.5, 0);
    innerGroup.add(mast);
    
    const sailGeometry = new THREE.PlaneGeometry(5, 6);
    const sailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0, 7, 0.4);
    sail.rotation.y = Math.PI / 2;
    innerGroup.add(sail);
    
    const skullGeometry = new THREE.SphereGeometry(0.8, 8, 6);
    const skullMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const skull = new THREE.Mesh(skullGeometry, skullMaterial);
    skull.position.set(0, 7, 0.6);
    innerGroup.add(skull);
    
    innerGroup.rotation.y = Math.PI;
    shipGroup.add(innerGroup);
    
    shipGroup.position.copy(position);
    this.scene.add(shipGroup);
    
    const ship: Ship3D = {
      id,
      mesh: shipGroup,
      position: position.clone(),
      rotation: 0,
      velocity: new THREE.Vector3(),
      health: 100,
      maxHealth: 100,
      isPlayer: false,
      name,
      level,
      sailAngle: 0,
      sailPosition: 2,
      sailMesh: sail
    };
    
    this.npcShips.set(id, ship);
    return ship;
  }
  
  createIsland(id: string, position: THREE.Vector3, radius: number, name: string, biome: string): Island3D {
    const seed = Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 12345);
    
    const generated = this.islandGenerator.generateIsland({
      seed,
      radius,
      biome,
      position
    });
    
    const islandGroup = new THREE.Group();
    islandGroup.add(generated.terrainMesh);
    generated.terrainMesh.position.set(0, 0, 0);
    islandGroup.add(generated.propMeshes);
    generated.propMeshes.position.set(0, 0, 0);
    
    islandGroup.position.copy(position);
    this.scene.add(islandGroup);
    
    const island: Island3D = {
      id,
      mesh: islandGroup,
      position: position.clone(),
      radius,
      name,
      biome,
      discovered: false
    };
    
    this.islands.set(id, island);
    if (this.oceanEnv) {
      this.oceanEnv.setIslandPositions(
        [...this.islands.values()].map((i) => i.position),
      );
    }
    return island;
  }
  
  createCannonball(id: string, position: THREE.Vector3, velocity: THREE.Vector3, ownerId: string, damage: number): Cannonball3D {
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);
    
    const cannonball: Cannonball3D = {
      id,
      mesh,
      position: position.clone(),
      velocity: velocity.clone(),
      ownerId,
      damage,
      lifetime: 5
    };
    
    this.cannonballs.set(id, cannonball);
    return cannonball;
  }
  
  createTreasure(id: string, position: THREE.Vector3, value: number): Treasure3D {
    const chestGroup = new THREE.Group();
    
    const baseGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b4513,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.75;
    chestGroup.add(base);
    
    const lidGeometry = new THREE.BoxGeometry(2.1, 0.5, 1.6);
    const lidMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xa0522d,
      roughness: 0.6
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = 1.75;
    chestGroup.add(lid);
    
    const goldGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const goldMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1
    });
    for (let i = 0; i < 5; i++) {
      const gold = new THREE.Mesh(goldGeometry, goldMaterial);
      gold.position.set(
        (Math.random() - 0.5) * 1.2,
        1.8 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.8
      );
      chestGroup.add(gold);
    }
    
    chestGroup.position.copy(position);
    chestGroup.position.y = 1;
    this.scene.add(chestGroup);
    
    const treasure: Treasure3D = {
      id,
      mesh: chestGroup as unknown as THREE.Mesh,
      position: position.clone(),
      value,
      collected: false
    };
    
    this.treasures.set(id, treasure);
    return treasure;
  }
  
  updatePlayerShip(position: THREE.Vector3, rotation: number, velocity: THREE.Vector3, health: number) {
    if (!this.playerShip) return;
    
    this.playerShip.position.copy(position);
    this.playerShip.rotation = rotation;
    this.playerShip.velocity.copy(velocity);
    this.playerShip.health = health;
    
    this.playerShip.mesh.position.set(position.x, 0, position.z);
    this.playerShip.mesh.rotation.y = rotation;
    
    const bobAmount = Math.sin(this.clock.getElapsedTime() * 2) * 0.2;
    const rollAmount = Math.sin(this.clock.getElapsedTime() * 1.5) * 0.02;
    this.playerShip.mesh.position.y = bobAmount;
    this.playerShip.mesh.rotation.z = rollAmount;
  }
  
  updateNPCShip(id: string, position: THREE.Vector3, rotation: number, health: number) {
    const ship = this.npcShips.get(id);
    if (!ship) return;
    
    ship.position.copy(position);
    ship.rotation = rotation;
    ship.health = health;
    
    ship.mesh.position.set(position.x, 0, position.z);
    ship.mesh.rotation.y = rotation;
    
    const timeOffset = parseInt(id, 36) % 100;
    const bobAmount = Math.sin((this.clock.getElapsedTime() + timeOffset * 0.1) * 2) * 0.15;
    ship.mesh.position.y = bobAmount;
  }
  
  removeNPCShip(id: string) {
    const ship = this.npcShips.get(id);
    if (ship) {
      this.scene.remove(ship.mesh);
      this.npcShips.delete(id);
    }
  }
  
  updateCannonballs(delta: number) {
    const gravity = new THREE.Vector3(0, -9.8, 0);
    const toRemove: string[] = [];
    
    this.cannonballs.forEach((ball, id) => {
      ball.velocity.add(gravity.clone().multiplyScalar(delta));
      ball.position.add(ball.velocity.clone().multiplyScalar(delta));
      ball.mesh.position.copy(ball.position);
      
      ball.lifetime -= delta;
      
      if (ball.position.y < -1 || ball.lifetime <= 0) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => {
      const ball = this.cannonballs.get(id);
      if (ball) {
        this.scene.remove(ball.mesh);
        this.cannonballs.delete(id);
      }
    });
  }
  
  updateTreasures(delta: number) {
    const time = this.clock.getElapsedTime();
    
    this.treasures.forEach(treasure => {
      if (!treasure.collected) {
        treasure.mesh.position.y = 1 + Math.sin(time * 2) * 0.3;
        treasure.mesh.rotation.y = time * 0.5;
      }
    });
  }
  
  collectTreasure(id: string) {
    const treasure = this.treasures.get(id);
    if (treasure) {
      treasure.collected = true;
      this.scene.remove(treasure.mesh);
      this.treasures.delete(id);
    }
  }
  
  updateCamera() {
    if (!this.playerShip) return;
    
    if (this.cameraMode === 'third-person') {
      const shipRotation = this.playerShip.rotation;
      const offset = this.cameraOffset.clone();
      
      const rotatedOffset = new THREE.Vector3(
        offset.x * Math.cos(shipRotation) + offset.z * Math.sin(shipRotation),
        offset.y,
        -offset.x * Math.sin(shipRotation) + offset.z * Math.cos(shipRotation)
      );
      
      const targetPosition = this.playerShip.mesh.position.clone().add(rotatedOffset);
      this.mainCamera.position.lerp(targetPosition, 0.05);
      
      const lookTarget = this.playerShip.mesh.position.clone();
      lookTarget.y += 5;
      this.mainCamera.lookAt(lookTarget);
    } else {
      this.birdsEyeCamera.position.x = this.playerShip.mesh.position.x;
      this.birdsEyeCamera.position.z = this.playerShip.mesh.position.z;
      this.birdsEyeCamera.lookAt(this.playerShip.mesh.position);
    }
  }
  
  update(): number {
    const delta = this.clock.getDelta();
    
    this.updateCannonballs(delta);
    this.updateTreasures(delta);
    this.updateCamera();
    this.updateOceanEnvironment(delta);
    this.updateDayNightCycle(delta);
    this.updateWeather(delta);
    
    this.renderer.render(this.scene, this.activeCamera);
    
    return delta;
  }
  
  getPlayerShip(): Ship3D | null {
    return this.playerShip;
  }
  
  getNPCShips(): Map<string, Ship3D> {
    return this.npcShips;
  }
  
  getIslands(): Map<string, Island3D> {
    return this.islands;
  }
  
  checkCollisions(): { shipHits: Array<{targetId: string, damage: number}>, treasureCollects: string[] } {
    const shipHits: Array<{targetId: string, damage: number}> = [];
    const treasureCollects: string[] = [];
    
    if (!this.playerShip) return { shipHits, treasureCollects };
    
    this.cannonballs.forEach((ball, ballId) => {
      this.npcShips.forEach((ship, shipId) => {
        if (ball.ownerId !== shipId) {
          const dist = ball.position.distanceTo(new THREE.Vector3(ship.position.x, 0, ship.position.z));
          if (dist < 6) {
            shipHits.push({ targetId: shipId, damage: ball.damage });
            this.scene.remove(ball.mesh);
            this.cannonballs.delete(ballId);
          }
        }
      });
      
      if (ball.ownerId !== this.playerShip!.id) {
        const dist = ball.position.distanceTo(new THREE.Vector3(
          this.playerShip!.position.x, 0, this.playerShip!.position.z
        ));
        if (dist < 6) {
          shipHits.push({ targetId: this.playerShip!.id, damage: ball.damage });
          this.scene.remove(ball.mesh);
          this.cannonballs.delete(ballId);
        }
      }
    });
    
    this.treasures.forEach((treasure, treasureId) => {
      if (!treasure.collected) {
        const dist = new THREE.Vector2(
          this.playerShip!.position.x - treasure.position.x,
          this.playerShip!.position.z - treasure.position.z
        ).length();
        if (dist < 8) {
          treasureCollects.push(treasureId);
        }
      }
    });
    
    return { shipHits, treasureCollects };
  }
  
  dispose() {
    this.unmount();
    this.oceanEnv?.dispose();
    this.oceanEnv = null;

    this.npcShips.forEach(ship => this.scene.remove(ship.mesh));
    this.islands.forEach(island => this.scene.remove(island.mesh));
    this.cannonballs.forEach(ball => this.scene.remove(ball.mesh));
    this.treasures.forEach(treasure => this.scene.remove(treasure.mesh));
    
    if (this.playerShip) {
      this.scene.remove(this.playerShip.mesh);
    }
    
    if (this.aimingState.arcMesh) this.scene.remove(this.aimingState.arcMesh);
    if (this.aimingState.targetMesh) this.scene.remove(this.aimingState.targetMesh);
    
    this.renderer.dispose();
  }
  
  getWindState(): WindState {
    return { ...this.wind };
  }
  
  updateWind(delta: number) {
    this.wind.gustFactor = 0.8 + Math.sin(Date.now() * 0.001) * 0.2 + Math.random() * 0.1;
    this.wind.direction += (Math.random() - 0.5) * 0.01 * delta;
  }
  
  adjustSailAngle(delta: number) {
    if (!this.playerShip) return;
    
    // Increased sail rotation range to ±120 degrees (was ±60 degrees)
    this.playerShip.sailAngle = Math.max(-Math.PI * 2/3, Math.min(Math.PI * 2/3, this.playerShip.sailAngle + delta));
    
    if (this.playerShip.sailMesh) {
      this.playerShip.sailMesh.rotation.y = Math.PI / 2 + this.playerShip.sailAngle * 0.6;
    }
  }
  
  getSailAngle(): number {
    return this.playerShip?.sailAngle ?? 0;
  }
  
  getSailPosition(): SailPosition {
    return this.playerShip?.sailPosition ?? 0;
  }
  
  setSailPosition(position: SailPosition) {
    if (!this.playerShip) return;
    this.playerShip.sailPosition = position;
    this.updateSailVisuals();
  }
  
  // Update sail mesh scale and billowing based on sail position
  updateSailVisuals() {
    if (!this.playerShip || !this.playerShip.sailMesh) return;
    
    const sail = this.playerShip.sailMesh;
    const position = this.playerShip.sailPosition;
    const windMagic = this.playerShip.windMagicActive;
    
    // Sail scale based on position: 0=furled, 1=partial, 2=deployed, 3=full
    const scaleY = [0.1, 0.5, 1.0, 1.3][position];
    const scaleX = [0.3, 0.7, 1.0, 1.2][position];
    
    // Animate sail scale smoothly
    sail.scale.y = THREE.MathUtils.lerp(sail.scale.y, scaleY, 0.1);
    sail.scale.x = THREE.MathUtils.lerp(sail.scale.x, scaleX, 0.1);
    
    // Wind magic effect - make sail glow
    if (windMagic) {
      (sail.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x4488ff);
      (sail.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
    } else {
      (sail.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x000000);
      (sail.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }
    
    // Add billowing effect based on wind
    const time = Date.now() * 0.003;
    const billowAmount = position === 0 ? 0 : 0.1 + position * 0.05;
    sail.position.z = 0.5 + Math.sin(time) * billowAmount;
  }
  
  // Activate Wind Magic - 100% speed for 5 seconds
  activateWindMagic(): boolean {
    if (!this.playerShip) return false;
    if (this.playerShip.windMagicActive) return false;
    
    this.playerShip.windMagicActive = true;
    this.playerShip.windMagicTimer = 5.0;
    this.playerShip.sailPosition = 3; // Full sail for wind magic
    return true;
  }
  
  isWindMagicActive(): boolean {
    return this.playerShip?.windMagicActive ?? false;
  }
  
  getWindMagicTimer(): number {
    return this.playerShip?.windMagicTimer ?? 0;
  }
  
  updateWindMagic(delta: number) {
    if (!this.playerShip || !this.playerShip.windMagicActive) return;
    
    this.playerShip.windMagicTimer = Math.max(0, (this.playerShip.windMagicTimer ?? 0) - delta);
    
    if (this.playerShip.windMagicTimer <= 0) {
      this.playerShip.windMagicActive = false;
      this.playerShip.sailPosition = 2; // Return to deployed
    }
    
    this.updateSailVisuals();
  }
  
  // Valheim-style wind calculation
  // Returns speed based on wind direction relative to ship heading and sail trim angle
  // Wind from behind = fastest, directly into wind = no movement (no-sail zone)
  calculateWindEffect(shipRotation: number, sailsDeployed: boolean): { 
    speedMultiplier: number; 
    optimalAngle: boolean;
    inNoSailZone: boolean;
    windAngleDegrees: number;
  } {
    // Calculate angle between wind direction and ship heading even when sails are furled
    // This lets the HUD show wind angle information
    const windAngle = this.wind.direction - shipRotation;
    const normalizedAngle = Math.abs(((windAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
    const windAngleDegrees = (normalizedAngle * 180 / Math.PI);
    
    if (!this.playerShip || !sailsDeployed) {
      return { speedMultiplier: 0, optimalAngle: false, inNoSailZone: false, windAngleDegrees };
    }
    
    // Wind Magic override - 100% speed regardless of wind angle
    if (this.playerShip.windMagicActive) {
      return { speedMultiplier: 1.8, optimalAngle: true, inNoSailZone: false, windAngleDegrees };
    }
    
    let speedMultiplier = 0;
    let optimalAngle = false;
    let inNoSailZone = false;
    
    // Valheim-style wind zones:
    // 0-45° from bow (sailing into wind): No-sail zone, can't make progress
    // 45-90° (beam reach / close haul): Good speed, sail angle matters
    // 90-135° (broad reach): Best speed! Optimal sailing
    // 135-180° (running / downwind): Good speed, direct tailwind
    
    if (normalizedAngle < Math.PI / 4) {
      // No-sail zone: sailing directly into wind (0-45°)
      inNoSailZone = true;
      speedMultiplier = 0;  // Cannot sail into the wind
    } else if (normalizedAngle < Math.PI / 2) {
      // Close haul: 45-90° - decent speed
      speedMultiplier = 0.5 + (normalizedAngle - Math.PI/4) / (Math.PI/4) * 0.5;
    } else if (normalizedAngle < 3 * Math.PI / 4) {
      // Broad reach: 90-135° - BEST speed (beam reach is optimal around 50-55° crosswind)
      optimalAngle = true;
      speedMultiplier = 1.5 + Math.sin((normalizedAngle - Math.PI/2) * 2) * 0.3;  // Peak 1.5-1.8x
    } else {
      // Running downwind: 135-180° - good but not optimal
      speedMultiplier = 1.2 - (normalizedAngle - 3*Math.PI/4) / (Math.PI/4) * 0.3;
    }
    
    // Apply sail trim bonus/penalty
    // Optimal sail angle varies by point of sail:
    // - Close haul: sail tight (small angle)
    // - Beam reach: sail at ~45°
    // - Running: sail perpendicular or wing-on-wing
    const sailAngle = this.playerShip.sailAngle;
    const optimalSailAngle = this.calculateOptimalSailAngle(normalizedAngle);
    const sailAngleDiff = Math.abs(sailAngle - optimalSailAngle);
    
    // Sail trim effectiveness: perfect trim = 100%, 60° off = 50%
    const sailTrimEfficiency = Math.max(0.5, 1 - (sailAngleDiff / (Math.PI * 2/3)) * 0.5);
    speedMultiplier *= sailTrimEfficiency;
    
    // Apply wind intensity and gust factor
    speedMultiplier *= this.wind.gustFactor;
    speedMultiplier *= (this.wind.speed / 15);
    
    return { speedMultiplier, optimalAngle, inNoSailZone, windAngleDegrees };
  }
  
  // Calculate optimal sail angle for a given wind angle
  private calculateOptimalSailAngle(windAngleFromBow: number): number {
    // Close haul: tight sail
    if (windAngleFromBow < Math.PI / 2) {
      return windAngleFromBow * 0.3;  // Small angle
    }
    // Beam reach: moderate angle
    else if (windAngleFromBow < 3 * Math.PI / 4) {
      return Math.PI / 4;  // ~45°
    }
    // Running downwind: wide angle
    else {
      return Math.PI / 2;  // Perpendicular
    }
  }
  
  // Calculate ship movement based on wind (Valheim-style)
  calculateWindMovement(shipRotation: number, sailsDeployed: boolean, delta: number): THREE.Vector3 {
    // CRITICAL: No movement when sails are furled
    if (!sailsDeployed) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    const windEffect = this.calculateWindEffect(shipRotation, sailsDeployed);
    
    // No movement in no-sail zone (sailing into wind)
    if (windEffect.inNoSailZone || windEffect.speedMultiplier <= 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    // Base sailing speed
    const baseSpeed = 40 * delta;  // Units per second
    const speed = baseSpeed * windEffect.speedMultiplier;
    
    // Movement is in the direction the ship is facing
    return new THREE.Vector3(
      Math.sin(shipRotation) * speed,
      0,
      Math.cos(shipRotation) * speed
    );
  }
  
  startAiming() {
    if (this.aimingState.isAiming) return;
    
    this.aimingState.isAiming = true;
    
    const arcGeometry = new THREE.BufferGeometry();
    const arcMaterial = new THREE.LineBasicMaterial({ 
      color: 0x4488ff, 
      transparent: true, 
      opacity: 0.7,
      linewidth: 2
    });
    this.aimingState.arcMesh = new THREE.Line(arcGeometry, arcMaterial);
    this.scene.add(this.aimingState.arcMesh);
    
    const targetGeometry = new THREE.RingGeometry(3, 5, 32);
    const targetMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4488ff, 
      transparent: true, 
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.aimingState.targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
    this.aimingState.targetMesh.rotation.x = -Math.PI / 2;
    this.aimingState.targetMesh.position.y = 0.2;
    this.scene.add(this.aimingState.targetMesh);
  }
  
  updateAiming(mouseX: number, mouseY: number, containerWidth: number, containerHeight: number) {
    if (!this.aimingState.isAiming || !this.playerShip) return;
    
    const ndcX = (mouseX / containerWidth) * 2 - 1;
    const ndcY = -(mouseY / containerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.activeCamera);
    
    const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(waterPlane, targetPoint);
    
    if (!targetPoint) return;
    
    const shipPos = this.playerShip.position.clone();
    shipPos.y = 4;
    
    this.aimingState.aimDirection = targetPoint.clone().sub(shipPos).normalize();
    
    const distance = Math.min(80, shipPos.distanceTo(targetPoint));
    const targetPos = shipPos.clone().add(this.aimingState.aimDirection.clone().multiplyScalar(distance));
    targetPos.y = 0.2;
    
    if (this.aimingState.targetMesh) {
      this.aimingState.targetMesh.position.copy(targetPos);
    }
    
    const arcPoints: THREE.Vector3[] = [];
    const steps = 20;
    const gravity = 9.8;
    const initialVelocity = 60;
    const angle = Math.atan2(distance * gravity, initialVelocity * initialVelocity) / 2;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const horizontalDist = distance * t;
      const height = horizontalDist * Math.tan(angle) - (gravity * horizontalDist * horizontalDist) / (2 * initialVelocity * initialVelocity * Math.cos(angle) * Math.cos(angle));
      
      const point = shipPos.clone().add(
        this.aimingState.aimDirection.clone().multiplyScalar(horizontalDist)
      );
      point.y = Math.max(0, 4 + height * 3);
      arcPoints.push(point);
    }
    
    if (this.aimingState.arcMesh) {
      const positions = new Float32Array(arcPoints.length * 3);
      arcPoints.forEach((p, i) => {
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      });
      this.aimingState.arcMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }
  
  stopAiming(fire: boolean): THREE.Vector3 | null {
    if (!this.aimingState.isAiming || !this.playerShip) {
      return null;
    }
    
    let fireVelocity: THREE.Vector3 | null = null;
    
    if (fire) {
      const direction = this.aimingState.aimDirection.clone();
      direction.y = 0.4;
      direction.normalize();
      fireVelocity = direction.multiplyScalar(60);
    }
    
    if (this.aimingState.arcMesh) {
      this.scene.remove(this.aimingState.arcMesh);
      this.aimingState.arcMesh = null;
    }
    if (this.aimingState.targetMesh) {
      this.scene.remove(this.aimingState.targetMesh);
      this.aimingState.targetMesh = null;
    }
    
    this.aimingState.isAiming = false;
    return fireVelocity;
  }
  
  isAiming(): boolean {
    return this.aimingState.isAiming;
  }
}
