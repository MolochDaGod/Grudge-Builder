import Phaser from 'phaser';
import { v4 as uuidv4 } from 'uuid';

class SimplexNoise {
  private seed: number;
  private p: number[];

  constructor(seed: number = Math.random()) {
    this.seed = seed;
    this.p = this.buildPermutation(seed);
  }

  private buildPermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((seed * 12.9898 + i) % 256);
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  noise(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    
    const n00 = Math.sin(this.p[xi + this.p[yi]] * 12.9898) * 43758.5453;
    const n10 = Math.sin(this.p[xi + 1 + this.p[yi]] * 12.9898) * 43758.5453;
    const n01 = Math.sin(this.p[xi + this.p[yi + 1]] * 12.9898) * 43758.5453;
    const n11 = Math.sin(this.p[xi + 1 + this.p[yi + 1]] * 12.9898) * 43758.5453;
    
    const nx0 = n00 + u * (n10 - n00);
    const nx1 = n01 + u * (n11 - n01);
    const nxy = nx0 + v * (nx1 - nx0);
    
    return nxy - Math.floor(nxy);
  }
}

export const TERRAIN_TYPES = {
  WATER: 0,
  SAND: 1,
  GRASS: 2,
  FOREST: 3,
  ROCK: 4,
  CLEARED: 5,
} as const;

export const TERRAIN_COLORS: Record<number, number> = {
  0: 0x1a4d7a, // WATER - deep blue
  1: 0xc2b280, // SAND - beach tan
  2: 0x5fa354, // GRASS - green
  3: 0x2d5016, // FOREST - dark green
  4: 0x666666, // ROCK - gray
  5: 0x90EE90, // CLEARED - light green (buildable)
};

export interface IslandConfig {
  width: number;
  height: number;
  gridSize: number;
  seed: string;
  buildableZone: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface GeneratedIsland {
  terrain: number[][];
  paths: number[][];
  config: IslandConfig;
}

export function generateIslandTerrain(config: IslandConfig): GeneratedIsland {
  const { width, height, seed } = config;
  const numericSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) / 1000;
  const noise = new SimplexNoise(numericSeed);
  
  const terrain: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const paths: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  
  const centerX = width / 2;
  const centerY = height / 2;
  const islandRadius = Math.min(centerX, centerY) * 0.7;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const noiseVal1 = noise.noise(x * 0.1, y * 0.1);
      const noiseVal2 = noise.noise(x * 0.05, y * 0.05);
      const combinedNoise = noiseVal1 * 0.6 + noiseVal2 * 0.4;
      
      const falloff = 1 - (distance / islandRadius);
      const value = falloff + (combinedNoise - 0.5) * 0.4;
      
      if (value < 0) {
        terrain[y][x] = TERRAIN_TYPES.WATER;
      } else if (value < 0.15) {
        terrain[y][x] = TERRAIN_TYPES.SAND;
      } else if (value < 0.4) {
        terrain[y][x] = TERRAIN_TYPES.GRASS;
      } else {
        terrain[y][x] = TERRAIN_TYPES.FOREST;
      }
    }
  }
  
  const { buildableZone } = config;
  for (let y = buildableZone.minY; y < buildableZone.maxY; y++) {
    for (let x = buildableZone.minX; x < buildableZone.maxX; x++) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        terrain[y][x] = TERRAIN_TYPES.CLEARED;
      }
    }
  }
  
  const pathCount = 6 + Math.floor(noise.noise(numericSeed, numericSeed) * 2);
  for (let p = 0; p < pathCount; p++) {
    const angle = (Math.PI * 2 * p) / pathCount;
    const endX = centerX + Math.cos(angle) * (islandRadius * 0.9);
    const endY = centerY + Math.sin(angle) * (islandRadius * 0.9);
    drawPath(terrain, paths, centerX, centerY, endX, endY, width, height);
  }
  
  return { terrain, paths, config };
}

function drawPath(
  terrain: number[][],
  paths: number[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number,
  pathWidth: number = 2
): void {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  
  for (let step = 0; step <= steps; step++) {
    const t = steps > 0 ? step / steps : 0;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    
    for (let dx = -pathWidth; dx <= pathWidth; dx++) {
      for (let dy = -pathWidth; dy <= pathWidth; dy++) {
        const px = x + dx;
        const py = y + dy;
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          if (terrain[py][px] !== TERRAIN_TYPES.WATER && 
              terrain[py][px] !== TERRAIN_TYPES.CLEARED) {
            paths[py][px] = 1;
            terrain[py][px] = TERRAIN_TYPES.GRASS;
          }
        }
      }
    }
  }
}

export interface Building {
  id: string;
  type: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  deployedAt: number;
}

export class IslandScene extends Phaser.Scene {
  private config: IslandConfig;
  private generatedIsland: GeneratedIsland | null = null;
  private buildableZoneGraphics: Phaser.GameObjects.Graphics | null = null;
  private gridOverlayGraphics: Phaser.GameObjects.Graphics | null = null;
  private showGrid: boolean = true;
  private buildings: Building[] = [];
  private buildingSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private selectedBuilding: string | null = null;
  private buildingPreview: Phaser.GameObjects.Rectangle | null = null;
  private hudText: Phaser.GameObjects.Text | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasdKeys: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;

  private readonly CAMERA_ZOOM_MIN = 0.3;
  private readonly CAMERA_ZOOM_MAX = 3;
  private readonly CAMERA_ZOOM_SPEED = 0.1;
  private readonly CAMERA_PAN_SPEED = 10;

  constructor() {
    super('IslandScene');
    this.config = {
      width: 100,
      height: 100,
      gridSize: 32,
      seed: uuidv4(),
      buildableZone: {
        minX: 45,
        maxX: 55,
        minY: 45,
        maxY: 55,
      },
    };
  }

  init(data: { config?: Partial<IslandConfig> }) {
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
  }

  preload() {
  }

  create() {
    const worldWidth = this.config.width * this.config.gridSize;
    const worldHeight = this.config.height * this.config.gridSize;
    
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    
    this.generatedIsland = generateIslandTerrain(this.config);
    this.createTerrainTexture();
    this.createBuildableZoneOverlay();
    this.createGridOverlay();
    
    this.setupCamera(worldWidth, worldHeight);
    this.setupInput();
    this.createHUD();
    
    this.input.keyboard?.removeCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);
    
    console.log('═══════════════════════════════════════');
    console.log('  PHASER ISLAND SCENE INITIALIZED');
    console.log('═══════════════════════════════════════');
    console.log(`World: ${worldWidth}x${worldHeight}px`);
    console.log(`Grid: ${this.config.width}x${this.config.height} cells`);
    console.log(`Build Zone: (${this.config.buildableZone.minX}-${this.config.buildableZone.maxX}, ${this.config.buildableZone.minY}-${this.config.buildableZone.maxY})`);
  }

  private createTerrainTexture() {
    if (!this.generatedIsland) return;
    
    const { terrain, config } = this.generatedIsland;
    const { width, height, gridSize } = config;
    const worldWidth = width * gridSize;
    const worldHeight = height * gridSize;
    
    const graphics = this.add.graphics({ x: 0, y: 0 });
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const terrainType = terrain[y][x];
        const color = TERRAIN_COLORS[terrainType];
        
        const worldX = x * gridSize;
        const worldY = y * gridSize;
        
        graphics.fillStyle(color, 1);
        graphics.fillRect(worldX, worldY, gridSize, gridSize);
      }
    }
    
    graphics.generateTexture('islandTerrain', worldWidth, worldHeight);
    graphics.destroy();
    
    this.add.image(0, 0, 'islandTerrain').setOrigin(0).setDepth(0);
  }

  private createBuildableZoneOverlay() {
    const { buildableZone, gridSize } = this.config;
    
    this.buildableZoneGraphics = this.add.graphics();
    this.buildableZoneGraphics.setDepth(5);
    
    const x1 = buildableZone.minX * gridSize;
    const y1 = buildableZone.minY * gridSize;
    const w = (buildableZone.maxX - buildableZone.minX) * gridSize;
    const h = (buildableZone.maxY - buildableZone.minY) * gridSize;
    
    this.buildableZoneGraphics.lineStyle(3, 0xff6600, 0.8);
    this.buildableZoneGraphics.strokeRect(x1, y1, w, h);
    
    this.buildableZoneGraphics.lineStyle(1, 0xff6600, 0.4);
    for (let gx = buildableZone.minX; gx <= buildableZone.maxX; gx++) {
      this.buildableZoneGraphics.lineBetween(gx * gridSize, y1, gx * gridSize, y1 + h);
    }
    for (let gy = buildableZone.minY; gy <= buildableZone.maxY; gy++) {
      this.buildableZoneGraphics.lineBetween(x1, gy * gridSize, x1 + w, gy * gridSize);
    }
  }

  private createGridOverlay() {
    const { width, height, gridSize } = this.config;
    const worldWidth = width * gridSize;
    const worldHeight = height * gridSize;
    
    this.gridOverlayGraphics = this.add.graphics();
    this.gridOverlayGraphics.setDepth(4);
    this.gridOverlayGraphics.lineStyle(1, 0x000000, 0.15);
    
    for (let x = 0; x <= width; x++) {
      this.gridOverlayGraphics.lineBetween(x * gridSize, 0, x * gridSize, worldHeight);
    }
    for (let y = 0; y <= height; y++) {
      this.gridOverlayGraphics.lineBetween(0, y * gridSize, worldWidth, y * gridSize);
    }
    
    this.gridOverlayGraphics.setVisible(this.showGrid);
  }

  private setupCamera(worldWidth: number, worldHeight: number) {
    const camera = this.cameras.main;
    
    const centerX = (this.config.buildableZone.minX + this.config.buildableZone.maxX) / 2 * this.config.gridSize;
    const centerY = (this.config.buildableZone.minY + this.config.buildableZone.maxY) / 2 * this.config.gridSize;
    
    camera.setBounds(0, 0, worldWidth, worldHeight);
    camera.centerOn(centerX, centerY);
    camera.setZoom(1.5);
  }

  private setupInput() {
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: unknown[], deltaY: number) => {
      const camera = this.cameras.main;
      const direction = deltaY > 0 ? -1 : 1;
      const newZoom = Phaser.Math.Clamp(
        camera.zoom + direction * this.CAMERA_ZOOM_SPEED,
        this.CAMERA_ZOOM_MIN,
        this.CAMERA_ZOOM_MAX
      );
      camera.setZoom(newZoom);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown() || (pointer.isDown && pointer.rightButtonDown())) {
        const camera = this.cameras.main;
        const dx = pointer.prevPosition.x - pointer.position.x;
        const dy = pointer.prevPosition.y - pointer.position.y;
        camera.scrollX += dx / camera.zoom;
        camera.scrollY += dy / camera.zoom;
      }
      
      this.updateBuildingPreview(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.selectedBuilding) {
        this.placeBuildingAtPointer(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.clearBuildingPreview();
      }
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      this.input.keyboard.on('keydown-R', () => this.resetCamera());
      this.input.keyboard.on('keydown-G', () => this.toggleGridOverlay());
      this.input.keyboard.on('keydown-C', () => this.clearAllBuildings());
      this.input.keyboard.on('keydown-ONE', () => this.selectBuildingType('house'));
      this.input.keyboard.on('keydown-TWO', () => this.selectBuildingType('tower'));
      this.input.keyboard.on('keydown-THREE', () => this.selectBuildingType('farm'));
      this.input.keyboard.on('keydown-FOUR', () => this.selectBuildingType('market'));
    }

    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private createHUD() {
    this.hudText = this.add.text(12, 12, '', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000dd',
      padding: { x: 10, y: 8 },
      fontFamily: 'monospace',
    });
    this.hudText.setScrollFactor(0).setDepth(100);
  }

  update(_time: number, _delta: number) {
    const camera = this.cameras.main;
    const panSpeed = this.CAMERA_PAN_SPEED / camera.zoom;
    
    if (this.wasdKeys) {
      if (this.wasdKeys.W.isDown || (this.cursors && this.cursors.up?.isDown)) {
        camera.scrollY -= panSpeed;
      }
      if (this.wasdKeys.S.isDown || (this.cursors && this.cursors.down?.isDown)) {
        camera.scrollY += panSpeed;
      }
      if (this.wasdKeys.A.isDown || (this.cursors && this.cursors.left?.isDown)) {
        camera.scrollX -= panSpeed;
      }
      if (this.wasdKeys.D.isDown || (this.cursors && this.cursors.right?.isDown)) {
        camera.scrollX += panSpeed;
      }
    }
    
    if (this.hudText) {
      const pointer = this.input.activePointer;
      const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
      const gridX = Math.floor(worldPoint.x / this.config.gridSize);
      const gridY = Math.floor(worldPoint.y / this.config.gridSize);
      const inBuildZone = this.isInBuildableZone(gridX, gridY);
      
      this.hudText.setText([
        `═ ISLAND RTS ═`,
        `Zoom: ${camera.zoom.toFixed(2)}x`,
        `Grid: (${gridX}, ${gridY}) ${inBuildZone ? '✓ BUILD' : ''}`,
        `Buildings: ${this.buildings.length}`,
        ``,
        `═ CONTROLS ═`,
        `WASD/Arrows = Pan`,
        `Wheel = Zoom`,
        `Middle/Right Drag = Pan`,
        `1-4 = Select Building`,
        `Click = Place`,
        `G = Grid | R = Reset`,
      ].join('\n'));
    }
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const camera = this.cameras.main;
    const point = camera.getWorldPoint(screenX, screenY);
    return { x: point.x, y: point.y };
  }

  private worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this.config.gridSize),
      y: Math.floor(worldY / this.config.gridSize),
    };
  }

  private gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.config.gridSize + this.config.gridSize / 2,
      y: gridY * this.config.gridSize + this.config.gridSize / 2,
    };
  }

  private isInBuildableZone(gridX: number, gridY: number): boolean {
    const { buildableZone } = this.config;
    return gridX >= buildableZone.minX && gridX < buildableZone.maxX &&
           gridY >= buildableZone.minY && gridY < buildableZone.maxY;
  }

  private updateBuildingPreview(pointer: Phaser.Input.Pointer) {
    if (!this.selectedBuilding) return;
    
    const worldPoint = this.screenToWorld(pointer.x, pointer.y);
    const gridCoords = this.worldToGrid(worldPoint.x, worldPoint.y);
    const snappedWorld = this.gridToWorld(gridCoords.x, gridCoords.y);
    
    if (!this.buildingPreview) {
      this.buildingPreview = this.add.rectangle(
        snappedWorld.x, snappedWorld.y,
        this.config.gridSize - 4, this.config.gridSize - 4,
        0xffff00, 0.4
      ).setDepth(50);
    }
    
    this.buildingPreview.setPosition(snappedWorld.x, snappedWorld.y);
    
    const isValid = this.isValidBuildingPlacement(gridCoords.x, gridCoords.y);
    this.buildingPreview.setFillStyle(isValid ? 0x00ff00 : 0xff0000, 0.4);
    this.buildingPreview.setStrokeStyle(2, isValid ? 0x00ff00 : 0xff0000, 0.8);
  }

  private placeBuildingAtPointer(pointer: Phaser.Input.Pointer) {
    if (!this.selectedBuilding) return;
    
    const worldPoint = this.screenToWorld(pointer.x, pointer.y);
    const gridCoords = this.worldToGrid(worldPoint.x, worldPoint.y);
    const snappedWorld = this.gridToWorld(gridCoords.x, gridCoords.y);
    
    if (this.isValidBuildingPlacement(gridCoords.x, gridCoords.y)) {
      const buildingId = uuidv4();
      
      const building: Building = {
        id: buildingId,
        type: this.selectedBuilding,
        gridX: gridCoords.x,
        gridY: gridCoords.y,
        worldX: snappedWorld.x,
        worldY: snappedWorld.y,
        deployedAt: Date.now(),
      };
      
      this.buildings.push(building);
      
      const sprite = this.add.rectangle(
        snappedWorld.x, snappedWorld.y,
        this.config.gridSize - 6, this.config.gridSize - 6,
        this.getBuildingColor(this.selectedBuilding),
        0.9
      ).setDepth(15);
      
      this.buildingSprites.set(buildingId, sprite);
      
      console.log(`✓ [${this.selectedBuilding.toUpperCase()}] placed at (${gridCoords.x}, ${gridCoords.y})`);
    }
  }

  private isValidBuildingPlacement(gridX: number, gridY: number): boolean {
    if (!this.isInBuildableZone(gridX, gridY)) return false;
    
    for (const building of this.buildings) {
      if (building.gridX === gridX && building.gridY === gridY) {
        return false;
      }
    }
    
    return true;
  }

  private getBuildingColor(type: string): number {
    const colors: Record<string, number> = {
      house: 0x0088ff,
      tower: 0xff3333,
      farm: 0xffdd00,
      market: 0xff8800,
    };
    return colors[type] || 0xffffff;
  }

  private clearBuildingPreview() {
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
      this.buildingPreview = null;
    }
    this.selectedBuilding = null;
  }

  public selectBuildingType(type: string) {
    if (!type || type === '') {
      this.clearBuildingPreview();
      console.log('Building selection cleared');
      return;
    }
    this.selectedBuilding = type;
    console.log(`Selected building: ${type}`);
  }

  public toggleGridOverlay() {
    this.showGrid = !this.showGrid;
    this.gridOverlayGraphics?.setVisible(this.showGrid);
  }

  public resetCamera() {
    const centerX = (this.config.buildableZone.minX + this.config.buildableZone.maxX) / 2 * this.config.gridSize;
    const centerY = (this.config.buildableZone.minY + this.config.buildableZone.maxY) / 2 * this.config.gridSize;
    this.cameras.main.centerOn(centerX, centerY);
    this.cameras.main.setZoom(1.5);
  }

  public clearAllBuildings() {
    this.buildings = [];
    this.buildingSprites.forEach(sprite => sprite.destroy());
    this.buildingSprites.clear();
    console.log('✓ All buildings cleared');
  }

  public getBuildings(): Building[] {
    return [...this.buildings];
  }

  public setConfig(config: Partial<IslandConfig>) {
    this.config = { ...this.config, ...config };
  }
}

export function createPhaserConfig(parentId: string, config?: Partial<IslandConfig>): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: parentId,
    width: '100%',
    height: '100%',
    backgroundColor: '#1a4d7a',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: IslandScene,
    input: {
      keyboard: true,
      mouse: true,
    },
  };
}
