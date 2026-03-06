import { CharacterActor } from './CharacterActor';
import { ResourceNodeActor, LootDrop } from './ResourceNodeActor';

export interface HarvestEvent {
  characterId: string;
  nodeId: string;
  loot: LootDrop[];
  xpGained: number;
  staminaCost: number;
}

export interface HarvestJob {
  characterId: string;
  nodeId: string;
  character: CharacterActor;
  node: ResourceNodeActor;
  lastAttemptTime: number;
}

export interface HarvestControllerEvents {
  onHarvest?: (event: HarvestEvent) => void;
}

const RARITY_STAMINA_COST: Record<string, number> = {
  common: 2,
  rare: 4,
  epic: 6,
  legendary: 10,
};

const RARITY_XP_MULTIPLIER: Record<string, number> = {
  common: 1,
  rare: 1.5,
  epic: 2,
  legendary: 3,
};

export class HarvestController {
  private activeJobs: Map<string, HarvestJob> = new Map();
  private events: HarvestControllerEvents;

  constructor(events: HarvestControllerEvents = {}) {
    this.events = events;
  }

  private getJobKey(characterId: string, nodeId: string): string {
    return `${characterId}:${nodeId}`;
  }

  startHarvesting(character: CharacterActor, node: ResourceNodeActor): void {
    const jobKey = this.getJobKey(character.id, node.id);
    
    if (this.activeJobs.has(jobKey)) {
      return;
    }
    
    if (character.state === 'sleeping' || character.stamina <= 0) {
      return;
    }
    
    character.startHarvesting();
    node.isBeingHarvested = true;
    node.assignedCharacterId = character.id;
    
    this.activeJobs.set(jobKey, {
      characterId: character.id,
      nodeId: node.id,
      character,
      node,
      lastAttemptTime: 0,
    });
  }

  stopHarvesting(characterId: string, nodeId: string): void {
    const jobKey = this.getJobKey(characterId, nodeId);
    const job = this.activeJobs.get(jobKey);
    
    if (job) {
      job.character.stopHarvesting();
      job.node.isBeingHarvested = false;
      job.node.assignedCharacterId = null;
      this.activeJobs.delete(jobKey);
    }
  }

  stopAllHarvesting(characterId: string): void {
    const keysToRemove: string[] = [];
    
    for (const [key, job] of this.activeJobs) {
      if (job.characterId === characterId) {
        job.character.stopHarvesting();
        job.node.isBeingHarvested = false;
        job.node.assignedCharacterId = null;
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.activeJobs.delete(key);
    }
  }

  update(_deltaTime: number): void {
    const currentTime = performance.now();
    const jobsToRemove: string[] = [];
    
    const entries = Array.from(this.activeJobs.entries());
    for (const [key, job] of entries) {
      if (job.character.stamina <= 0) {
        job.character.sleep();
        jobsToRemove.push(key);
        continue;
      }
      
      if (job.node.isExpired(currentTime)) {
        jobsToRemove.push(key);
        continue;
      }
      
      if (job.node.canHarvest(currentTime)) {
        const loot = job.node.harvest(currentTime);
        
        if (loot.length > 0) {
          const staminaCost = RARITY_STAMINA_COST[job.node.nodeData.rarity] || 2;
          const xpMultiplier = RARITY_XP_MULTIPLIER[job.node.nodeData.rarity] || 1;
          const baseXP = job.node.nodeData.tier * 10;
          const xpGained = Math.floor(baseXP * xpMultiplier);
          
          job.character.consumeStamina(staminaCost);
          
          this.events.onHarvest?.({
            characterId: job.characterId,
            nodeId: job.nodeId,
            loot,
            xpGained,
            staminaCost,
          });
        }
        
        job.lastAttemptTime = currentTime;
      }
    }
    
    for (const key of jobsToRemove) {
      const job = this.activeJobs.get(key);
      if (job) {
        job.character.stopHarvesting();
        job.node.isBeingHarvested = false;
        job.node.assignedCharacterId = null;
      }
      this.activeJobs.delete(key);
    }
  }

  getActiveJobsForCharacter(characterId: string): HarvestJob[] {
    const jobs: HarvestJob[] = [];
    const allJobs = Array.from(this.activeJobs.values());
    for (const job of allJobs) {
      if (job.characterId === characterId) {
        jobs.push(job);
      }
    }
    return jobs;
  }

  isCharacterHarvesting(characterId: string): boolean {
    const allJobs = Array.from(this.activeJobs.values());
    for (const job of allJobs) {
      if (job.characterId === characterId) {
        return true;
      }
    }
    return false;
  }
}
