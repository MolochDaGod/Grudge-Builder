import Matter from 'matter-js';
import { CameraController, CameraState } from './CameraController';
import { CharacterActor, CharacterState } from '../actors/CharacterActor';
import { ResourceNodeActor } from '../actors/ResourceNodeActor';
import { HarvestController, HarvestEvent } from '../actors/HarvestController';

export interface IslandEngineConfig {
  worldWidth: number;
  worldHeight: number;
  tileSize: number;
}

export interface IslandEngineEvents {
  onHarvest?: (event: HarvestEvent) => void;
  onCharacterStateChange?: (characterId: string, state: CharacterState) => void;
  onStaminaDepleted?: (characterId: string) => void;
}

export class IslandEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private runner: Matter.Runner | null = null;
  
  public camera: CameraController;
  public characters: Map<string, CharacterActor> = new Map();
  public resourceNodes: Map<string, ResourceNodeActor> = new Map();
  public harvestController: HarvestController;
  
  private config: IslandEngineConfig;
  private events: IslandEngineEvents;
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor(config: IslandEngineConfig, events: IslandEngineEvents = {}) {
    this.config = config;
    this.events = events;
    
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0 },
    });
    this.world = this.engine.world;
    
    this.camera = new CameraController({
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      minZoom: 0.5,
      maxZoom: 3,
    });
    
    this.harvestController = new HarvestController({
      onHarvest: (event) => this.events.onHarvest?.(event),
    });
    
    this.setupCollisionEvents();
  }

  private setupCollisionEvents(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        this.handleCollisionStart(pair.bodyA, pair.bodyB);
      }
    });
    
    Matter.Events.on(this.engine, 'collisionEnd', (event) => {
      for (const pair of event.pairs) {
        this.handleCollisionEnd(pair.bodyA, pair.bodyB);
      }
    });
  }

  private handleCollisionStart(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const characterBody = this.findCharacterBody(bodyA, bodyB);
    const nodeBody = this.findNodeBody(bodyA, bodyB);
    
    if (characterBody && nodeBody) {
      const character = this.characters.get(characterBody.label);
      const node = this.resourceNodes.get(nodeBody.label);
      
      if (character && node) {
        this.harvestController.startHarvesting(character, node);
      }
    }
  }

  private handleCollisionEnd(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const characterBody = this.findCharacterBody(bodyA, bodyB);
    const nodeBody = this.findNodeBody(bodyA, bodyB);
    
    if (characterBody && nodeBody) {
      const character = this.characters.get(characterBody.label);
      const node = this.resourceNodes.get(nodeBody.label);
      
      if (character && node) {
        this.harvestController.stopHarvesting(character.id, node.id);
      }
    }
  }

  private findCharacterBody(bodyA: Matter.Body, bodyB: Matter.Body): Matter.Body | null {
    if (bodyA.label && this.characters.has(bodyA.label)) return bodyA;
    if (bodyB.label && this.characters.has(bodyB.label)) return bodyB;
    return null;
  }

  private findNodeBody(bodyA: Matter.Body, bodyB: Matter.Body): Matter.Body | null {
    if (bodyA.label && this.resourceNodes.has(bodyA.label)) return bodyA;
    if (bodyB.label && this.resourceNodes.has(bodyB.label)) return bodyB;
    return null;
  }

  addCharacter(id: string, x: number, y: number, spriteConfig: CharacterActor['spriteConfig']): CharacterActor {
    const character = new CharacterActor(id, x, y, spriteConfig, {
      onStateChange: (state) => this.events.onCharacterStateChange?.(id, state),
    });
    
    Matter.Composite.add(this.world, character.body);
    this.characters.set(id, character);
    
    return character;
  }

  removeCharacter(id: string): void {
    const character = this.characters.get(id);
    if (character) {
      this.harvestController.stopAllHarvesting(id);
      Matter.Composite.remove(this.world, character.body);
      this.characters.delete(id);
    }
  }

  addResourceNode(id: string, x: number, y: number, nodeData: ResourceNodeActor['nodeData']): ResourceNodeActor {
    const node = new ResourceNodeActor(id, x, y, nodeData);
    
    Matter.Composite.add(this.world, node.body);
    this.resourceNodes.set(id, node);
    
    return node;
  }

  removeResourceNode(id: string): void {
    const node = this.resourceNodes.get(id);
    if (node) {
      Matter.Composite.remove(this.world, node.body);
      this.resourceNodes.delete(id);
    }
  }

  moveCharacterTo(characterId: string, targetX: number, targetY: number): void {
    const character = this.characters.get(characterId);
    if (character) {
      character.moveTo(targetX, targetY);
    }
  }

  update(deltaTime: number): void {
    Matter.Engine.update(this.engine, deltaTime);
    
    const characters = Array.from(this.characters.values());
    for (const character of characters) {
      character.update(deltaTime);
      
      if (character.stamina <= 0 && character.state !== 'sleeping') {
        character.sleep();
        this.events.onStaminaDepleted?.(character.id);
      }
    }
    
    this.harvestController.update(deltaTime);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastUpdateTime, 50);
    this.lastUpdateTime = currentTime;
    
    this.update(deltaTime);
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  getCamera(): CameraState {
    return this.camera.getState();
  }

  panCamera(dx: number, dy: number): void {
    this.camera.pan(dx, dy);
  }

  zoomCamera(delta: number, centerX?: number, centerY?: number): void {
    this.camera.zoom(delta, centerX, centerY);
  }

  focusOnCharacter(characterId: string): void {
    const character = this.characters.get(characterId);
    if (character) {
      this.camera.centerOn(character.x, character.y);
    }
  }

  screenToWorld(screenX: number, screenY: number, viewportWidth: number, viewportHeight: number): { x: number; y: number } {
    return this.camera.screenToWorld(screenX, screenY, viewportWidth, viewportHeight);
  }

  worldToScreen(worldX: number, worldY: number, viewportWidth: number, viewportHeight: number): { x: number; y: number; visible: boolean } {
    return this.camera.worldToScreen(worldX, worldY, viewportWidth, viewportHeight);
  }

  destroy(): void {
    this.stop();
    Matter.Engine.clear(this.engine);
    this.characters.clear();
    this.resourceNodes.clear();
  }
}
