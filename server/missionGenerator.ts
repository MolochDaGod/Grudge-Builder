import OpenAI from "openai";
import { storage } from "./storage";
import type { LoreEntity, InsertMission, InsertStoryArc, InsertCombatChallenge, InsertGeneratedContent } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface LoreContext {
  gods: LoreEntity[];
  factions: LoreEntity[];
  heroes: LoreEntity[];
  locations: LoreEntity[];
}

async function getLoreContext(): Promise<LoreContext> {
  const [gods, factions, heroes, locations] = await Promise.all([
    storage.getLoreEntities('god'),
    storage.getLoreEntities('faction'),
    storage.getLoreEntities('hero'),
    storage.getLoreEntities('location'),
  ]);
  return { gods, factions, heroes, locations };
}

function buildSystemPrompt(loreContext: LoreContext): string {
  const godsInfo = loreContext.gods.map(g => 
    `- ${g.name} (${g.title}): ${g.domain}. ${g.description}`
  ).join('\n');
  
  const factionsInfo = loreContext.factions.map(f => 
    `- ${f.name}: ${f.description}. Patron God: ${loreContext.gods.find(g => g.id === f.patronGodId)?.name || 'Unknown'}`
  ).join('\n');
  
  const heroesInfo = loreContext.heroes.map(h => 
    `- ${h.name} (${h.title}): ${h.description}`
  ).join('\n');
  
  const locationsInfo = loreContext.locations.map(l => 
    `- ${l.name}: ${l.description}`
  ).join('\n');

  return `You are the Lorekeeper of Grudge Warlords, a dark fantasy MMO set in a world of floating islands near the Cosmic Waterfall, where three gods wage eternal war through mortal champions.

WORLD LORE:

GODS:
${godsInfo}

FACTIONS:
${factionsInfo}

LEGENDARY HEROES:
${heroesInfo}

KEY LOCATIONS:
${locationsInfo}

SETTING DETAILS:
- The world consists of floating islands drifting near the Cosmic Waterfall, a divine cascade of celestial energy
- The three factions (Crusade, Legion, Fabled) compete for territory, resources, and divine favor
- Combat involves 8 core attributes: STR, VIT, END, INT, WIS, DEX, AGI, TAC
- Players can explore dungeons solo or form parties for overworld missions
- Each god grants unique blessings to their faction's champions

Your task is to generate engaging RPG content that fits this world. All content should:
1. Reference actual lore entities, locations, and characters when appropriate
2. Feel thematically consistent with dark fantasy and eternal divine conflict
3. Include specific objectives, rewards, and narrative hooks
4. Be balanced for the requested difficulty tier (1-5)
5. Work for both solo dungeon play and party-based missions`;
}

export interface MissionGenerationParams {
  factionId?: string;
  minLevel?: number;
  maxLevel?: number;
  missionType?: 'story' | 'side' | 'daily' | 'dungeon' | 'raid';
  difficultyTier?: 1 | 2 | 3 | 4 | 5;
  count?: number;
}

export interface GeneratedMission {
  title: string;
  description: string;
  objectives: string[];
  dialogueHooks: string[];
  rewards: {
    experience: number;
    gold: number;
    reputationChange: number;
    possibleItems?: string[];
  };
  minLevel: number;
  maxLevel: number;
  estimatedDuration: string;
  combatEncounters: {
    name: string;
    description: string;
    enemyTypes: string[];
    difficultyModifier: number;
  }[];
}

export async function generateMissions(params: MissionGenerationParams): Promise<GeneratedMission[]> {
  const loreContext = await getLoreContext();
  const systemPrompt = buildSystemPrompt(loreContext);
  
  const factionName = params.factionId 
    ? loreContext.factions.find(f => f.id === params.factionId)?.name || 'any faction'
    : 'any faction';
  
  const userPrompt = `Generate ${params.count || 3} unique ${params.missionType || 'side'} missions for ${factionName} players.

Requirements:
- Level range: ${params.minLevel || 1} to ${params.maxLevel || 20}
- Difficulty tier: ${params.difficultyTier || 2} (1=trivial, 5=legendary)
- Include at least one combat encounter per mission
- Each mission should have 2-4 clear objectives
- Include dialogue hooks that reference world lore

Return your response as a JSON object with a "missions" array containing this structure:
{
  "missions": [
    {
      "title": "Mission Title",
      "description": "A compelling mission description that sets the scene",
      "objectives": ["Objective 1", "Objective 2"],
      "dialogueHooks": ["NPC says: 'Quote that references lore'"],
      "rewards": {
        "experience": 500,
        "gold": 100,
        "reputationChange": 25,
        "possibleItems": ["Rare Sword", "Healing Potion"]
      },
      "minLevel": 5,
      "maxLevel": 10,
      "estimatedDuration": "30-45 minutes",
      "combatEncounters": [
        {
          "name": "Encounter Name",
          "description": "Brief description",
          "enemyTypes": ["Skeleton", "Wraith"],
          "difficultyModifier": 1.0
        }
      ]
    }
  ]
}`;

  try {
    console.log("[MissionGenerator] Sending request to OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    console.log("[MissionGenerator] AI response received:", content?.substring(0, 200));
    
    if (!content) {
      console.error("[MissionGenerator] No content in AI response");
      throw new Error("No content in AI response");
    }

    const parsed = JSON.parse(content);
    let rawMissions: any[];
    if (Array.isArray(parsed)) {
      rawMissions = parsed;
    } else if (parsed.missions && Array.isArray(parsed.missions)) {
      rawMissions = parsed.missions;
    } else if (parsed.title && parsed.description) {
      rawMissions = [parsed];
    } else {
      console.warn("[MissionGenerator] Unexpected response format:", Object.keys(parsed));
      rawMissions = [];
    }
    
    const missions: GeneratedMission[] = rawMissions.filter(m => {
      const valid = m.title && m.description && 
        Array.isArray(m.objectives) && m.objectives.length > 0 &&
        Array.isArray(m.dialogueHooks) &&
        m.rewards && typeof m.rewards.experience === 'number';
      if (!valid) {
        console.warn("[MissionGenerator] Invalid mission skipped:", m.title || 'untitled');
      }
      return valid;
    });
    
    console.log("[MissionGenerator] Valid missions count:", missions.length);
    return missions;
  } catch (error) {
    console.error("[MissionGenerator] Error generating missions:", error);
    throw error;
  }
}

export interface CombatChallengeParams {
  difficultyTier?: 1 | 2 | 3 | 4 | 5;
  canSpawnInDungeon?: boolean;
  factionId?: string;
  count?: number;
}

export interface GeneratedCombatChallenge {
  name: string;
  description: string;
  battleCry: string;
  enemyConfig: {
    baseHealth: number;
    baseAttack: number;
    baseDefense: number;
    specialAbilities: string[];
    weaknesses: string[];
    resistances: string[];
  };
  lootTable: {
    itemName: string;
    dropChance: number;
  }[];
  environmentHazards?: string[];
}

export async function generateCombatChallenges(params: CombatChallengeParams): Promise<GeneratedCombatChallenge[]> {
  const loreContext = await getLoreContext();
  const systemPrompt = buildSystemPrompt(loreContext);
  
  const tier = params.difficultyTier || 2;
  const baseStats = {
    1: { health: 50, attack: 10, defense: 5 },
    2: { health: 100, attack: 20, defense: 10 },
    3: { health: 200, attack: 35, defense: 20 },
    4: { health: 400, attack: 50, defense: 35 },
    5: { health: 800, attack: 75, defense: 50 },
  };
  
  const stats = baseStats[tier];
  
  const userPrompt = `Generate ${params.count || 5} unique combat encounters for difficulty tier ${tier} (1=trivial, 5=legendary).

These encounters will ${params.canSpawnInDungeon ? 'appear in dungeons' : 'appear in the overworld'}.

Use these base stats as guidelines:
- Base Health: ${stats.health} (can vary ±30%)
- Base Attack: ${stats.attack} (can vary ±30%)
- Base Defense: ${stats.defense} (can vary ±30%)

Each encounter should include:
- A thematic name fitting the dark fantasy setting
- A vivid description of the enemy or encounter
- A memorable battle cry or taunt
- 2-3 special abilities
- At least one weakness and one resistance
- A loot table with 2-4 possible drops

Return your response as a JSON array with this exact structure:
[
  {
    "name": "Enemy Name",
    "description": "Visual and thematic description",
    "battleCry": "What they shout when engaging combat",
    "enemyConfig": {
      "baseHealth": ${stats.health},
      "baseAttack": ${stats.attack},
      "baseDefense": ${stats.defense},
      "specialAbilities": ["Ability 1", "Ability 2"],
      "weaknesses": ["Fire damage"],
      "resistances": ["Physical damage"]
    },
    "lootTable": [
      {"itemName": "Item Name", "dropChance": 0.25}
    ],
    "environmentHazards": ["Optional hazard during fight"]
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    const parsed = JSON.parse(content);
    const challenges = Array.isArray(parsed) ? parsed : parsed.challenges || parsed.encounters || [];
    
    return challenges as GeneratedCombatChallenge[];
  } catch (error) {
    console.error("Error generating combat challenges:", error);
    throw error;
  }
}

export interface StoryArcParams {
  factionId?: string;
  chapterCount?: number;
  theme?: string;
}

export interface GeneratedStoryArc {
  title: string;
  description: string;
  theme: string;
  totalChapters: number;
  chapterTitles: string[];
  keyNpcs: string[];
  centralConflict: string;
  climaxTeaser: string;
  rewardsTier: string;
}

export async function generateStoryArc(params: StoryArcParams): Promise<GeneratedStoryArc> {
  const loreContext = await getLoreContext();
  const systemPrompt = buildSystemPrompt(loreContext);
  
  const factionName = params.factionId 
    ? loreContext.factions.find(f => f.id === params.factionId)?.name || 'all factions'
    : 'all factions';
  
  const userPrompt = `Create an epic story arc for ${factionName} players.

Requirements:
- ${params.chapterCount || 5} chapters total
- Theme: ${params.theme || 'divine conflict and mortal redemption'}
- Reference actual lore entities, gods, and locations
- Include dramatic conflict that spans multiple sessions
- Feature memorable NPCs and dialogue moments

Return your response as a JSON object with this exact structure:
{
  "title": "Story Arc Title",
  "description": "Overview of the entire arc's narrative",
  "theme": "Central theme",
  "totalChapters": ${params.chapterCount || 5},
  "chapterTitles": ["Chapter 1 Title", "Chapter 2 Title", ...],
  "keyNpcs": ["NPC Name - Role in story"],
  "centralConflict": "What drives the main plot",
  "climaxTeaser": "Hints at the dramatic finale",
  "rewardsTier": "legendary/epic/rare based on arc scope"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    return JSON.parse(content) as GeneratedStoryArc;
  } catch (error) {
    console.error("Error generating story arc:", error);
    throw error;
  }
}

export async function saveMissionToDraft(
  generated: GeneratedMission,
  factionId: string | null,
  userId: string
): Promise<string> {
  const missionId = `mission_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  const objectives = generated.objectives.map((obj, idx) => ({
    id: `obj_${idx}`,
    description: obj,
    type: 'interact' as const,
  }));
  
  const rewards = {
    xp: generated.rewards.experience,
    gold: generated.rewards.gold,
    items: (generated.rewards.possibleItems || []).map(name => ({
      itemId: name.toLowerCase().replace(/\s+/g, '_'),
      quantity: 1,
    })),
    reputationChanges: factionId ? [{
      factionId,
      change: generated.rewards.reputationChange || 0,
    }] : [],
  };
  
  const missionData: InsertMission = {
    title: generated.title,
    description: generated.description,
    missionType: 'side',
    factionId,
    minLevel: generated.minLevel,
    maxLevel: generated.maxLevel,
    objectives,
    rewards,
    status: 'draft',
    isAIGenerated: true,
  };

  const mission = await storage.createMission(missionData);
  
  await storage.createGeneratedContent({
    contentType: 'mission',
    prompt: `Generated mission: ${generated.title} (id: ${mission.id})`,
    generatedData: generated as unknown as Record<string, unknown>,
    status: 'pending',
  });
  
  return mission.id;
}

export async function saveCombatChallengeToDraft(
  generated: GeneratedCombatChallenge,
  difficultyTier: number,
  canSpawnInDungeon: boolean,
  userId: string
): Promise<string> {
  const encounterUnits = [{
    monsterId: generated.name.toLowerCase().replace(/\s+/g, '_'),
    count: 1,
    spawnWave: 1,
    isElite: difficultyTier >= 4,
    isBoss: difficultyTier >= 5,
  }];
  
  const environment = {
    terrainType: 'standard',
    hazards: generated.environmentHazards || [],
  };
  
  const challengeData: InsertCombatChallenge = {
    name: generated.name,
    description: `${generated.description}\n\nBattle Cry: "${generated.battleCry}"`,
    encounterUnits,
    environment,
    baseDifficultyTier: difficultyTier,
    canSpawnInDungeon,
    dungeonFloorMin: canSpawnInDungeon ? 1 : undefined,
    dungeonFloorMax: canSpawnInDungeon ? difficultyTier * 5 : undefined,
    isAIGenerated: true,
    approvalStatus: 'draft',
  };

  const challenge = await storage.createCombatChallenge(challengeData);
  
  await storage.createGeneratedContent({
    contentType: 'combat_challenge',
    prompt: `Generated combat challenge: ${generated.name} (id: ${challenge.id})`,
    generatedData: generated as unknown as Record<string, unknown>,
    status: 'pending',
  });
  
  return challenge.id;
}

export async function saveStoryArcToDraft(
  generated: GeneratedStoryArc,
  factionId: string | null,
  userId: string
): Promise<string> {
  const rewardTierXp = {
    rare: 1000,
    epic: 2500,
    legendary: 5000,
  };
  
  const xpReward = rewardTierXp[generated.rewardsTier as keyof typeof rewardTierXp] || 1000;
  
  const rewards = {
    xp: xpReward,
    gold: xpReward / 2,
    items: [] as Array<{ itemId: string; quantity: number }>,
    reputationChanges: factionId ? [{
      factionId,
      change: Math.floor(xpReward / 10),
    }] : [],
  };
  
  const arcData: InsertStoryArc = {
    title: generated.title,
    description: generated.description,
    factionId,
    minLevel: 1,
    rewards,
    status: 'draft',
    isAIGenerated: true,
  };

  const arc = await storage.createStoryArc(arcData);
  
  await storage.createGeneratedContent({
    contentType: 'story_arc',
    prompt: `Generated story arc: ${generated.title} (id: ${arc.id})`,
    generatedData: generated as unknown as Record<string, unknown>,
    status: 'pending',
  });
  
  return arc.id;
}
