/**
 * Island Generation System
 * Deterministic island generation from seed UUID
 * All generation uses seeded RNG to ensure same seed = same island everywhere
 */

import { IslandState, ResourceNode, Animal, TerrainArea, NodeRarity, rollNodeRarity, CRAFTING_RESOURCES, ANIMAL_CONFIGS, NODE_RARITY_CONFIG } from '@shared/schema';

/**
 * Seeded deterministic RNG from UUID
 * Returns a function that generates pseudo-random numbers 0-1
 * Same seed always produces same sequence
 */
export function seededRandom(seed: string): () => number {
  // Use seed string to initialize state
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  let state = Math.abs(hash);
  return function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Generate terrain zones for an island
 * Ensures proper distribution of mountains, forests, fields, shores, water
 */
function generateTerrainZones(rng: () => number): TerrainArea[] {
  const zones: TerrainArea[] = [];

  // Mountain zone (top-left, 20-30% width, 20-30% height)
  zones.push({
    zone: 'mountain',
    x: 5 + rng() * 15,
    y: 5 + rng() * 15,
    width: 25 + rng() * 10,
    height: 20 + rng() * 10,
  });

  // Forest zone (center-left, 25-35% width, 30-40% height)
  zones.push({
    zone: 'forest',
    x: 35 + rng() * 10,
    y: 15 + rng() * 15,
    width: 28 + rng() * 10,
    height: 35 + rng() * 10,
  });

  // Field zone (center-right, 30-40% width, 25-35% height)
  zones.push({
    zone: 'field',
    x: 10 + rng() * 15,
    y: 50 + rng() * 15,
    width: 35 + rng() * 10,
    height: 25 + rng() * 10,
  });

  // Shore zone (bottom, 100% width, 15-20% height)
  zones.push({
    zone: 'shore',
    x: 0,
    y: 75 + rng() * 5,
    width: 100,
    height: 15 + rng() * 5,
  });

  // Water zone (top-right, 20-30% width, 20-25% height)
  zones.push({
    zone: 'water',
    x: 70 + rng() * 15,
    y: 5 + rng() * 10,
    width: 25 + rng() * 10,
    height: 20 + rng() * 5,
  });

  // Clearing for camp (central area, 8-12% width/height)
  zones.push({
    zone: 'clearing',
    x: 45 + rng() * 10,
    y: 45 + rng() * 10,
    width: 10 + rng() * 4,
    height: 10 + rng() * 4,
  });

  return zones;
}

/**
 * Determine which terrain zone a position falls into
 */
function getTerrainZoneAt(x: number, y: number, zones: TerrainArea[]): TerrainArea | null {
  for (const zone of zones) {
    if (x >= zone.x && x < zone.x + zone.width && y >= zone.y && y < zone.y + zone.height) {
      return zone;
    }
  }
  return null;
}

/**
 * Node types that can spawn in each terrain zone
 */
const NODE_TYPES_BY_ZONE: Record<string, string[]> = {
  mountain: ['ore', 'stone', 'gem'],
  forest: ['wood', 'hemp', 'herb'],
  field: ['herb', 'hemp', 'stone'],
  shore: ['fish', 'oil', 'stone'],
  water: ['fish', 'oil'],
  clearing: [], // No nodes in clearing (camp area)
};

/**
 * Pick a node type appropriate for a terrain zone
 */
function pickNodeTypeForZone(zone: TerrainArea, rng: () => number): string {
  const validTypes = NODE_TYPES_BY_ZONE[zone.zone];
  if (!validTypes || validTypes.length === 0) return 'herb'; // Fallback
  return validTypes[Math.floor(rng() * validTypes.length)];
}

/**
 * Generate resource nodes for an island
 * Respects terrain zone rules and rarity distribution
 */
function generateResourceNodes(
  terrainZones: TerrainArea[],
  rng: () => number,
  targetCount: number = 20
): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  const occupiedPositions: Array<{ x: number; y: number; radius: number }> = [];

  for (let i = 0; i < targetCount; i++) {
    // Pick a terrain zone weighted by size
    const zone = terrainZones[Math.floor(rng() * terrainZones.length)];
    if (!zone || zone.zone === 'clearing') continue;

    // Pick node type for this zone
    const nodeType = pickNodeTypeForZone(zone, rng);
    if (!nodeType) continue;

    // Pick rarity
    const rarity = rollNodeRarity(rng);

    // Generate position within zone, avoiding clearing
    let attempts = 0;
    let x = 0, y = 0;
    do {
      x = Math.max(zone.x + 2, Math.min(zone.x + zone.width - 2, zone.x + rng() * zone.width));
      y = Math.max(zone.y + 2, Math.min(zone.y + zone.height - 2, zone.y + rng() * zone.height));
      attempts++;
    } while (attempts < 5 && isInClearing(x, y, terrainZones));

    if (isInClearing(x, y, terrainZones)) continue;

    // Check collision with other nodes (3.0 radius for nodes)
    const nodeRadius = 3.0;
    let hasCollision = false;
    for (const occupied of occupiedPositions) {
      const dx = x - occupied.x;
      const dy = y - occupied.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < nodeRadius + occupied.radius + 1) {
        hasCollision = true;
        break;
      }
    }
    if (hasCollision) continue;

    occupiedPositions.push({ x, y, radius: nodeRadius });

    // Get loot drops
    const drops = CRAFTING_RESOURCES[nodeType] || [];

    // Determine tier and level from rarity
    let tier = 1;
    if (rarity === 'rare') tier = 2;
    else if (rarity === 'epic') tier = 3;
    else if (rarity === 'legendary') tier = 4;

    nodes.push({
      id: `node_${i}_${Date.now()}`,
      name: `${NODE_RARITY_CONFIG[rarity].name} ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
      type: nodeType as any,
      x,
      y,
      tier,
      nodeLevel: 1,
      rarity,
      profession: nodeTypeToProfession(nodeType),
      icon: getNodeIcon(nodeType),
      color: NODE_RARITY_CONFIG[rarity].color,
      isWaterNode: nodeType === 'fish',
      uptime: 100,
      cooldownHours: 1,
      harvestIntervalMinutes: 10,
      drops,
    });
  }

  return nodes;
}

/**
 * Check if position is in a clearing
 */
function isInClearing(x: number, y: number, zones: TerrainArea[]): boolean {
  const clearing = zones.find(z => z.zone === 'clearing');
  if (!clearing) return false;
  return x >= clearing.x && x < clearing.x + clearing.width && y >= clearing.y && y < clearing.y + clearing.height;
}

/**
 * Map node type to profession
 */
function nodeTypeToProfession(nodeType: string): string {
  const map: Record<string, string> = {
    ore: 'mining',
    wood: 'logging',
    hemp: 'herbalism',
    herb: 'herbalism',
    fish: 'fishing',
    oil: 'scavenging',
    gem: 'mining',
    stone: 'mining',
    leather: 'skinning',
  };
  return map[nodeType] || 'gathering';
}

/**
 * Get icon name for node type
 */
function getNodeIcon(nodeType: string): string {
  const icons: Record<string, string> = {
    ore: '⛏️',
    wood: '🪵',
    hemp: '🌾',
    herb: '🌿',
    fish: '🎣',
    oil: '⛽',
    gem: '💎',
    stone: '🪨',
    leather: '🧥',
  };
  return icons[nodeType] || '📦';
}

/**
 * Generate animals for an island
 * Respects terrain zone and rarity rules
 */
function generateAnimals(
  terrainZones: TerrainArea[],
  rng: () => number,
  targetCount: number = 8
): Animal[] {
  const animals: Animal[] = [];
  const animalTypes: Array<{ type: string; weight: number; zones: string[] }> = [
    { type: 'hare', weight: 50, zones: ['forest', 'field', 'clearing'] },
    { type: 'fox', weight: 30, zones: ['forest', 'mountain'] },
    { type: 'deer', weight: 15, zones: ['field', 'forest'] },
    { type: 'boar', weight: 5, zones: ['mountain', 'forest'] },
  ];

  for (let i = 0; i < targetCount; i++) {
    // Pick a random zone
    const zone = terrainZones[Math.floor(rng() * terrainZones.length)];
    if (!zone || zone.zone === 'shore' || zone.zone === 'water') continue;

    // Pick animal type compatible with zone
    const compatible = animalTypes.filter(a => a.zones.includes(zone.zone));
    if (!compatible.length) continue;

    // Weight-based selection
    const totalWeight = compatible.reduce((sum, a) => sum + a.weight, 0);
    let pick = rng() * totalWeight;
    let animalType = 'hare';
    for (const animal of compatible) {
      pick -= animal.weight;
      if (pick <= 0) {
        animalType = animal.type;
        break;
      }
    }

    // Position within zone
    const x = Math.max(zone.x + 2, Math.min(zone.x + zone.width - 2, zone.x + rng() * zone.width));
    const y = Math.max(zone.y + 2, Math.min(zone.y + zone.height - 2, zone.y + rng() * zone.height));
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

    animals.push({
      id: `animal_${i}_${Date.now()}`,
      type: animalType as any,
      x,
      y,
      spawnedAt: Date.now(),
      state: 'alive',
      direction: directions[Math.floor(rng() * directions.length)],
    });
  }

  return animals;
}

/**
 * Main island state generation from seed
 * Fully deterministic - same seed always produces same island
 */
export function generateIslandState(seed: string): IslandState {
  const rng = seededRandom(seed);

  // Generate terrain zones first
  const terrainZones = generateTerrainZones(rng);

  // Find clearing for camp
  const clearing = terrainZones.find(z => z.zone === 'clearing');
  const campPosition = clearing ? { x: clearing.x + clearing.width / 2, y: clearing.y + clearing.height / 2 } : { x: 50, y: 50 };

  // Generate nodes
  const nodes = generateResourceNodes(terrainZones, rng, 20);

  // Generate animals
  const animals = generateAnimals(terrainZones, rng, 8);

  // Pick map style
  const mapStyles: Array<'iron' | 'fantasy' | 'tactical' | 'night'> = ['iron', 'fantasy', 'tactical', 'night'];
  const mapStyle = mapStyles[Math.floor(rng() * mapStyles.length)];

  return {
    id: seed,
    name: 'Home Island',
    mapStyle,
    nodes,
    sheep: animals,
    skinningNodes: [],
    assignedHeroes: {},
    terrainZones,
    campPosition,
    clearings: [clearing!].filter(Boolean),
    isFirstVisit: true,
    createdAt: Date.now(),
    lastUpdate: Date.now(),
  };
}

/**
 * Validate island assets
 * Check all sprites exist (will be implemented when spriteManifest is available)
 */
export function validateIslandAssets(state: IslandState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check nodes
  if (!state.nodes || state.nodes.length === 0) {
    errors.push('Island has no resource nodes');
  }

  // Check animals
  if (!state.sheep || state.sheep.length === 0) {
    errors.push('Island has no animals');
  }

  // Check terrain coverage (simplified check)
  if (!state.terrainZones || state.terrainZones.length === 0) {
    errors.push('Island has no terrain zones');
  }

  // Check camp position is valid
  if (!state.campPosition || state.campPosition.x < 0 || state.campPosition.x > 100 || state.campPosition.y < 0 || state.campPosition.y > 100) {
    errors.push('Invalid camp position');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
