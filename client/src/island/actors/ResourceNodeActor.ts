import Matter from 'matter-js';

export type NodeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface LootDrop {
  itemId: string;
  name: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface ResourceNodeData {
  name: string;
  type: string;
  profession: string;
  tier: number;
  rarity: NodeRarity;
  icon: string;
  harvestIntervalMs: number;
  drops: LootDrop[];
  expiresAt?: number;
}

export class ResourceNodeActor {
  public id: string;
  public body: Matter.Body;
  public nodeData: ResourceNodeData;
  
  public lastHarvestTime: number = 0;
  public isBeingHarvested: boolean = false;
  public assignedCharacterId: string | null = null;

  constructor(id: string, x: number, y: number, nodeData: ResourceNodeData) {
    this.id = id;
    this.nodeData = nodeData;
    
    this.body = Matter.Bodies.circle(x, y, 24, {
      label: id,
      isStatic: true,
      isSensor: true,
    });
  }

  get x(): number {
    return this.body.position.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  canHarvest(currentTime: number): boolean {
    if (this.nodeData.expiresAt && currentTime > this.nodeData.expiresAt) {
      return false;
    }
    
    return currentTime - this.lastHarvestTime >= this.nodeData.harvestIntervalMs;
  }

  harvest(currentTime: number): LootDrop[] {
    if (!this.canHarvest(currentTime)) {
      return [];
    }
    
    this.lastHarvestTime = currentTime;
    
    const loot: LootDrop[] = [];
    for (const drop of this.nodeData.drops) {
      if (Math.random() <= drop.chance) {
        const quantity = Math.floor(
          Math.random() * (drop.maxQuantity - drop.minQuantity + 1) + drop.minQuantity
        );
        loot.push({ ...drop, minQuantity: quantity, maxQuantity: quantity });
      }
    }
    
    return loot;
  }

  isExpired(currentTime: number): boolean {
    return this.nodeData.expiresAt !== undefined && currentTime > this.nodeData.expiresAt;
  }

  getTimeUntilNextHarvest(currentTime: number): number {
    const timeSinceLastHarvest = currentTime - this.lastHarvestTime;
    return Math.max(0, this.nodeData.harvestIntervalMs - timeSinceLastHarvest);
  }

  getRarityColor(): string {
    switch (this.nodeData.rarity) {
      case 'common': return '#d4d4d4';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      default: return '#d4d4d4';
    }
  }
}
