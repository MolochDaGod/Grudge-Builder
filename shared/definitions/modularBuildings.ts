/**
 * Modular Building Catalog — Medieval Village Pack
 *
 * 44 FBX models organized into categories for the player building system.
 * Players unlock these through profession levels and craft them from
 * harvested resources (wood, stone, iron).
 *
 * Model source: D:/Games/Models/MedievalVillagePack/Medieval Village Pack - Dec 2020/
 *
 * Building flow:
 *   1. Player opens Build tab (B key or UI)
 *   2. Selects category → picks a piece
 *   3. Ghost preview follows cursor (snaps to terrain + other pieces)
 *   4. Click to place (deducts resources)
 *   5. Placed pieces persist to server via island state
 */

// ── Model Base Path ──────────────────────────────────────────────────────────

const BUILDINGS_BASE = 'D:/Games/Models/MedievalVillagePack/Medieval Village Pack - Dec 2020/Buildings/FBX';
const PROPS_BASE = 'D:/Games/Models/MedievalVillagePack/Medieval Village Pack - Dec 2020/Props/FBX';

// ── Resource Cost Types ──────────────────────────────────────────────────────

export interface ResourceCost {
  wood?: number;
  stone?: number;
  iron?: number;
  gold?: number;
  /** Special materials (e.g. 'fire_crystals', 'ethereal_crystals') */
  special?: { id: string; amount: number }[];
}

// ── Building Piece Definition ────────────────────────────────────────────────

export type BuildCategory =
  | 'structures'     // Full buildings (houses, inn, mill)
  | 'workshops'      // Crafting stations (blacksmith, sawmill)
  | 'camp'           // Campsite basics (bonfire, benches, gazebo)
  | 'walls_paths'    // Fences, paths, stairs
  | 'doors_windows'  // Modular building components
  | 'decorations'    // Props, barrels, crates, hay
  | 'utilities';     // Well, cart, market stands

export type BuildMaterial = 'wood' | 'stone' | 'mixed';

export interface BuildingPiece {
  id: string;
  name: string;
  category: BuildCategory;
  /** Primary construction material (affects visual style) */
  material: BuildMaterial;
  /** FBX model file path */
  modelPath: string;
  /** Resource cost to build */
  cost: ResourceCost;
  /** Profession level required (0 = no requirement) */
  requiredLevel: number;
  /** Required profession (null = any) */
  requiredProfession?: string;
  /** Size footprint in meters [width, depth, height] */
  footprint: [number, number, number];
  /** Whether this piece can snap to other pieces */
  snappable: boolean;
  /** Snap point offsets [x, y, z] relative to piece origin */
  snapPoints?: [number, number, number][];
  /** Whether this piece provides shelter (blocks rain, temp bonus) */
  providesShelter: boolean;
  /** HP of the structure (0 = indestructible prop) */
  hp: number;
  /** Description for the UI */
  description: string;
  /** Tier 1-5 (higher = more resources, better stats) */
  tier: number;
}

// ── Building Catalog ─────────────────────────────────────────────────────────

export const BUILDING_CATALOG: BuildingPiece[] = [
  // ═══════════════════════════════════════════════════════════
  // STRUCTURES — Full buildings
  // ═══════════════════════════════════════════════════════════
  {
    id: 'house_1',
    name: 'Small Cottage',
    category: 'structures',
    material: 'wood',
    modelPath: `${BUILDINGS_BASE}/House_1.fbx`,
    cost: { wood: 80, stone: 20 },
    requiredLevel: 5,
    footprint: [6, 6, 5],
    snappable: true,
    snapPoints: [[3, 0, 0], [-3, 0, 0], [0, 0, 3], [0, 0, -3]],
    providesShelter: true,
    hp: 1000,
    description: 'A simple wooden cottage. Provides shelter and a respawn point.',
    tier: 1,
  },
  {
    id: 'house_2',
    name: 'Stone House',
    category: 'structures',
    material: 'stone',
    modelPath: `${BUILDINGS_BASE}/House_2.fbx`,
    cost: { wood: 40, stone: 80, iron: 10 },
    requiredLevel: 10,
    footprint: [7, 7, 6],
    snappable: true,
    snapPoints: [[3.5, 0, 0], [-3.5, 0, 0], [0, 0, 3.5], [0, 0, -3.5]],
    providesShelter: true,
    hp: 2000,
    description: 'A sturdy stone house. Better defense against raids.',
    tier: 2,
  },
  {
    id: 'house_3',
    name: 'Manor House',
    category: 'structures',
    material: 'mixed',
    modelPath: `${BUILDINGS_BASE}/House_3.fbx`,
    cost: { wood: 100, stone: 100, iron: 20 },
    requiredLevel: 20,
    footprint: [10, 8, 7],
    snappable: true,
    snapPoints: [[5, 0, 0], [-5, 0, 0], [0, 0, 4], [0, 0, -4]],
    providesShelter: true,
    hp: 3000,
    description: 'A large manor with multiple rooms. Can house NPC vendors.',
    tier: 3,
  },
  {
    id: 'house_4',
    name: 'Tower House',
    category: 'structures',
    material: 'stone',
    modelPath: `${BUILDINGS_BASE}/House_4.fbx`,
    cost: { wood: 60, stone: 150, iron: 30 },
    requiredLevel: 25,
    footprint: [5, 5, 10],
    snappable: true,
    snapPoints: [[2.5, 0, 0], [-2.5, 0, 0], [0, 0, 2.5], [0, 0, -2.5], [0, 10, 0]],
    providesShelter: true,
    hp: 4000,
    description: 'A tall stone tower. Great for lookout and defense.',
    tier: 3,
  },
  {
    id: 'inn',
    name: 'Inn & Tavern',
    category: 'structures',
    material: 'mixed',
    modelPath: `${BUILDINGS_BASE}/Inn.fbx`,
    cost: { wood: 150, stone: 80, iron: 20, gold: 50 },
    requiredLevel: 15,
    footprint: [12, 10, 7],
    snappable: true,
    snapPoints: [[6, 0, 0], [-6, 0, 0], [0, 0, 5], [0, 0, -5]],
    providesShelter: true,
    hp: 2500,
    description: 'Tavern where players can rest, trade, and recruit NPCs.',
    tier: 3,
  },
  {
    id: 'bell_tower',
    name: 'Bell Tower',
    category: 'structures',
    material: 'stone',
    modelPath: `${BUILDINGS_BASE}/Bell_Tower.fbx`,
    cost: { stone: 200, iron: 40 },
    requiredLevel: 30,
    footprint: [4, 4, 15],
    snappable: false,
    providesShelter: false,
    hp: 5000,
    description: 'Ring the bell to alert allies. Visible from far away.',
    tier: 4,
  },
  {
    id: 'mill',
    name: 'Windmill',
    category: 'structures',
    material: 'wood',
    modelPath: `${BUILDINGS_BASE}/Mill.fbx`,
    cost: { wood: 120, stone: 40, iron: 15 },
    requiredLevel: 15,
    requiredProfession: 'chef',
    footprint: [6, 6, 12],
    snappable: false,
    providesShelter: true,
    hp: 1500,
    description: 'Grinds grain into flour. Required for advanced cooking recipes.',
    tier: 2,
  },
  {
    id: 'stable',
    name: 'Stable',
    category: 'structures',
    material: 'wood',
    modelPath: `${BUILDINGS_BASE}/Stable.fbx`,
    cost: { wood: 100, stone: 30 },
    requiredLevel: 10,
    footprint: [10, 6, 5],
    snappable: true,
    snapPoints: [[5, 0, 0], [-5, 0, 0]],
    providesShelter: true,
    hp: 1200,
    description: 'Houses mounts. Unlocks bike mounts at level 10.',
    tier: 2,
  },

  // ═══════════════════════════════════════════════════════════
  // WORKSHOPS — Crafting stations
  // ═══════════════════════════════════════════════════════════
  {
    id: 'blacksmith',
    name: 'Blacksmith Forge',
    category: 'workshops',
    material: 'stone',
    modelPath: `${BUILDINGS_BASE}/Blacksmith.fbx`,
    cost: { wood: 60, stone: 100, iron: 40 },
    requiredLevel: 10,
    requiredProfession: 'engineer',
    footprint: [8, 6, 5],
    snappable: false,
    providesShelter: true,
    hp: 2000,
    description: 'Forge weapons, armor, and tools. Core crafting station.',
    tier: 2,
  },
  {
    id: 'sawmill',
    name: 'Sawmill',
    category: 'workshops',
    material: 'wood',
    modelPath: `${BUILDINGS_BASE}/Sawmill.fbx`,
    cost: { wood: 80, stone: 20, iron: 15 },
    requiredLevel: 5,
    requiredProfession: 'woodcutting',
    footprint: [8, 5, 4],
    snappable: false,
    providesShelter: false,
    hp: 800,
    description: 'Processes raw logs into planks. 2× wood yield from harvesting.',
    tier: 1,
  },

  // ═══════════════════════════════════════════════════════════
  // CAMP — Campsite basics
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bonfire',
    name: 'Campfire',
    category: 'camp',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Bonfire.fbx`,
    cost: { wood: 10 },
    requiredLevel: 0,
    footprint: [2, 2, 2],
    snappable: false,
    providesShelter: false,
    hp: 0,
    description: 'A basic campfire. Provides warmth and cooking.',
    tier: 1,
  },
  {
    id: 'bonfire_lit',
    name: 'Large Bonfire',
    category: 'camp',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Bonfire_Lit.fbx`,
    cost: { wood: 25, stone: 5 },
    requiredLevel: 3,
    footprint: [3, 3, 3],
    snappable: false,
    providesShelter: false,
    hp: 0,
    description: 'A roaring bonfire. Larger warmth radius, better cooking.',
    tier: 1,
  },
  {
    id: 'bench_1',
    name: 'Wooden Bench',
    category: 'camp',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Bench_1.fbx`,
    cost: { wood: 8 },
    requiredLevel: 0,
    footprint: [2, 0.5, 1],
    snappable: true,
    snapPoints: [[1, 0, 0], [-1, 0, 0]],
    providesShelter: false,
    hp: 0,
    description: 'Sit and rest. Speeds up stamina recovery.',
    tier: 1,
  },
  {
    id: 'bench_2',
    name: 'Stone Bench',
    category: 'camp',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Bench_2.fbx`,
    cost: { stone: 15 },
    requiredLevel: 5,
    footprint: [2, 0.5, 1],
    snappable: true,
    snapPoints: [[1, 0, 0], [-1, 0, 0]],
    providesShelter: false,
    hp: 0,
    description: 'Sturdy stone bench. Permanent rest spot.',
    tier: 1,
  },
  {
    id: 'gazebo',
    name: 'Gazebo',
    category: 'camp',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Gazebo.fbx`,
    cost: { wood: 40, stone: 10 },
    requiredLevel: 8,
    footprint: [5, 5, 4],
    snappable: false,
    providesShelter: true,
    hp: 500,
    description: 'Open-air shelter. Great for a gathering spot.',
    tier: 2,
  },
  {
    id: 'cauldron',
    name: 'Cooking Cauldron',
    category: 'camp',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Cauldron.fbx`,
    cost: { iron: 15, wood: 5 },
    requiredLevel: 5,
    requiredProfession: 'chef',
    footprint: [1.5, 1.5, 1.5],
    snappable: false,
    providesShelter: false,
    hp: 0,
    description: 'Cook stews and potions. Place near a fire.',
    tier: 1,
  },

  // ═══════════════════════════════════════════════════════════
  // WALLS & PATHS — Modular connections
  // ═══════════════════════════════════════════════════════════
  {
    id: 'fence',
    name: 'Wooden Fence',
    category: 'walls_paths',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Fence.fbx`,
    cost: { wood: 5 },
    requiredLevel: 0,
    footprint: [3, 0.2, 1.5],
    snappable: true,
    snapPoints: [[1.5, 0, 0], [-1.5, 0, 0]],
    providesShelter: false,
    hp: 200,
    description: 'Simple wooden fence. Snap together for perimeters.',
    tier: 1,
  },
  {
    id: 'path_straight',
    name: 'Stone Path',
    category: 'walls_paths',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Path_Straight.fbx`,
    cost: { stone: 3 },
    requiredLevel: 0,
    footprint: [2, 0.1, 2],
    snappable: true,
    snapPoints: [[0, 0, 1], [0, 0, -1]],
    providesShelter: false,
    hp: 0,
    description: 'Straight cobblestone path segment.',
    tier: 1,
  },
  {
    id: 'path_square',
    name: 'Stone Square',
    category: 'walls_paths',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Path_Square.fbx`,
    cost: { stone: 5 },
    requiredLevel: 0,
    footprint: [3, 0.1, 3],
    snappable: true,
    snapPoints: [[1.5, 0, 0], [-1.5, 0, 0], [0, 0, 1.5], [0, 0, -1.5]],
    providesShelter: false,
    hp: 0,
    description: 'Square cobblestone area. Use for plazas.',
    tier: 1,
  },
  {
    id: 'stairs',
    name: 'Stone Stairs',
    category: 'walls_paths',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Stairs.fbx`,
    cost: { stone: 15 },
    requiredLevel: 5,
    footprint: [2, 3, 1],
    snappable: true,
    snapPoints: [[0, 0, -0.5], [0, 3, 0.5]],
    providesShelter: false,
    hp: 0,
    description: 'Stone stairs. Connect different elevation levels.',
    tier: 1,
  },

  // ═══════════════════════════════════════════════════════════
  // DOORS & WINDOWS — Modular components
  // ═══════════════════════════════════════════════════════════
  {
    id: 'door_round',
    name: 'Arched Door',
    category: 'doors_windows',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Door_Round.fbx`,
    cost: { wood: 10, iron: 2 },
    requiredLevel: 5,
    footprint: [1.5, 0.3, 2.5],
    snappable: true,
    snapPoints: [[0, 0, 0.15], [0, 0, -0.15]],
    providesShelter: false,
    hp: 300,
    description: 'Arched wooden door. Snap to wall openings.',
    tier: 1,
  },
  {
    id: 'door_straight',
    name: 'Flat Door',
    category: 'doors_windows',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Door_Straight.fbx`,
    cost: { wood: 8, iron: 2 },
    requiredLevel: 3,
    footprint: [1.2, 0.3, 2.2],
    snappable: true,
    snapPoints: [[0, 0, 0.15], [0, 0, -0.15]],
    providesShelter: false,
    hp: 250,
    description: 'Simple flat door.',
    tier: 1,
  },
  {
    id: 'window_1', name: 'Window Small', category: 'doors_windows', material: 'wood',
    modelPath: `${PROPS_BASE}/Window_1.fbx`, cost: { wood: 5 }, requiredLevel: 3,
    footprint: [0.8, 0.1, 1], snappable: true, providesShelter: false, hp: 0,
    description: 'Small window frame.', tier: 1,
  },
  {
    id: 'window_2', name: 'Window Medium', category: 'doors_windows', material: 'wood',
    modelPath: `${PROPS_BASE}/Window_2.fbx`, cost: { wood: 8 }, requiredLevel: 5,
    footprint: [1, 0.1, 1.2], snappable: true, providesShelter: false, hp: 0,
    description: 'Medium window with shutters.', tier: 1,
  },
  {
    id: 'window_3', name: 'Window Arched', category: 'doors_windows', material: 'stone',
    modelPath: `${PROPS_BASE}/Window_3.fbx`, cost: { stone: 10 }, requiredLevel: 10,
    footprint: [1, 0.1, 1.5], snappable: true, providesShelter: false, hp: 0,
    description: 'Arched stone window.', tier: 2,
  },
  {
    id: 'window_4', name: 'Window Large', category: 'doors_windows', material: 'mixed',
    modelPath: `${PROPS_BASE}/Window_4.fbx`, cost: { wood: 6, stone: 6 }, requiredLevel: 10,
    footprint: [1.5, 0.1, 1.5], snappable: true, providesShelter: false, hp: 0,
    description: 'Large decorative window.', tier: 2,
  },

  // ═══════════════════════════════════════════════════════════
  // DECORATIONS — Props and storage
  // ═══════════════════════════════════════════════════════════
  {
    id: 'barrel', name: 'Barrel', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Barrel.fbx`, cost: { wood: 6 }, requiredLevel: 0,
    footprint: [0.8, 0.8, 1.2], snappable: false, providesShelter: false, hp: 0,
    description: 'Storage barrel. Holds 20 items.', tier: 1,
  },
  {
    id: 'crate', name: 'Crate', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Crate.fbx`, cost: { wood: 8 }, requiredLevel: 0,
    footprint: [1, 1, 1], snappable: true, snapPoints: [[0, 1, 0]], providesShelter: false, hp: 0,
    description: 'Stackable crate. Holds 30 items.', tier: 1,
  },
  {
    id: 'bag', name: 'Supply Bag', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Bag.fbx`, cost: { wood: 2 }, requiredLevel: 0,
    footprint: [0.5, 0.5, 0.6], snappable: false, providesShelter: false, hp: 0,
    description: 'Small supply bag.', tier: 1,
  },
  {
    id: 'bag_open', name: 'Open Bag', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Bag_Open.fbx`, cost: { wood: 2 }, requiredLevel: 0,
    footprint: [0.5, 0.5, 0.5], snappable: false, providesShelter: false, hp: 0,
    description: 'Open supply bag showing contents.', tier: 1,
  },
  {
    id: 'bags', name: 'Bag Pile', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Bags.fbx`, cost: { wood: 5 }, requiredLevel: 0,
    footprint: [1, 1, 0.8], snappable: false, providesShelter: false, hp: 0,
    description: 'Pile of supply bags.', tier: 1,
  },
  {
    id: 'hay', name: 'Hay Bale', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Hay.fbx`, cost: { wood: 3 }, requiredLevel: 0,
    footprint: [1.5, 1.5, 1], snappable: false, providesShelter: false, hp: 0,
    description: 'Hay bale. Decorative, cushions falls.', tier: 1,
  },
  {
    id: 'package_1', name: 'Small Package', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Package_1.fbx`, cost: { wood: 3 }, requiredLevel: 0,
    footprint: [0.5, 0.5, 0.5], snappable: false, providesShelter: false, hp: 0,
    description: 'Wrapped package.', tier: 1,
  },
  {
    id: 'package_2', name: 'Large Package', category: 'decorations', material: 'wood',
    modelPath: `${PROPS_BASE}/Package_2.fbx`, cost: { wood: 5 }, requiredLevel: 0,
    footprint: [0.8, 0.8, 0.8], snappable: false, providesShelter: false, hp: 0,
    description: 'Large wrapped package.', tier: 1,
  },
  {
    id: 'rock_1', name: 'Boulder Small', category: 'decorations', material: 'stone',
    modelPath: `${PROPS_BASE}/Rock_1.fbx`, cost: { stone: 0 }, requiredLevel: 0,
    footprint: [1, 1, 0.8], snappable: false, providesShelter: false, hp: 0,
    description: 'Decorative boulder.', tier: 1,
  },
  {
    id: 'rock_2', name: 'Boulder Medium', category: 'decorations', material: 'stone',
    modelPath: `${PROPS_BASE}/Rock_2.fbx`, cost: { stone: 0 }, requiredLevel: 0,
    footprint: [1.5, 1.5, 1.2], snappable: false, providesShelter: false, hp: 0,
    description: 'Medium boulder.', tier: 1,
  },
  {
    id: 'rock_3', name: 'Boulder Large', category: 'decorations', material: 'stone',
    modelPath: `${PROPS_BASE}/Rock_3.fbx`, cost: { stone: 0 }, requiredLevel: 0,
    footprint: [2, 2, 1.5], snappable: false, providesShelter: false, hp: 0,
    description: 'Large boulder.', tier: 1,
  },

  // ═══════════════════════════════════════════════════════════
  // UTILITIES — Functional structures
  // ═══════════════════════════════════════════════════════════
  {
    id: 'well',
    name: 'Stone Well',
    category: 'utilities',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Well.fbx`,
    cost: { stone: 40, wood: 10 },
    requiredLevel: 5,
    footprint: [2, 2, 3],
    snappable: false,
    providesShelter: false,
    hp: 1000,
    description: 'Fresh water source. Required for farming and cooking.',
    tier: 2,
  },
  {
    id: 'cart',
    name: 'Transport Cart',
    category: 'utilities',
    material: 'wood',
    modelPath: `${PROPS_BASE}/Cart.fbx`,
    cost: { wood: 30, iron: 5 },
    requiredLevel: 5,
    footprint: [3, 2, 2],
    snappable: false,
    providesShelter: false,
    hp: 300,
    description: 'Haul resources between islands. Mobile storage.',
    tier: 1,
  },
  {
    id: 'market_stand_1',
    name: 'Market Stand',
    category: 'utilities',
    material: 'wood',
    modelPath: `${PROPS_BASE}/MarketStand_1.fbx`,
    cost: { wood: 20, stone: 5 },
    requiredLevel: 8,
    footprint: [3, 2, 3],
    snappable: false,
    providesShelter: true,
    hp: 400,
    description: 'Sell items to visiting players. Generates passive gold.',
    tier: 2,
  },
  {
    id: 'market_stand_2',
    name: 'Market Stand (Large)',
    category: 'utilities',
    material: 'wood',
    modelPath: `${PROPS_BASE}/MarketStand_2.fbx`,
    cost: { wood: 35, stone: 10 },
    requiredLevel: 12,
    footprint: [4, 2.5, 3],
    snappable: false,
    providesShelter: true,
    hp: 500,
    description: 'Large market stand with canopy. Higher trade capacity.',
    tier: 2,
  },
  {
    id: 'bell',
    name: 'Warning Bell',
    category: 'utilities',
    material: 'stone',
    modelPath: `${PROPS_BASE}/Bell.fbx`,
    cost: { iron: 20 },
    requiredLevel: 15,
    footprint: [1, 1, 2],
    snappable: false,
    providesShelter: false,
    hp: 500,
    description: 'Ring to alert nearby allies. 200m sound radius.',
    tier: 2,
  },
];

// ── Lookup Helpers ───────────────────────────────────────────────────────────

/** Get all pieces in a category */
export function getPiecesByCategory(category: BuildCategory): BuildingPiece[] {
  return BUILDING_CATALOG.filter(p => p.category === category);
}

/** Get all categories with piece counts */
export function getCategorySummary(): { category: BuildCategory; count: number; label: string }[] {
  const labels: Record<BuildCategory, string> = {
    structures: 'Structures',
    workshops: 'Workshops',
    camp: 'Camp',
    walls_paths: 'Walls & Paths',
    doors_windows: 'Doors & Windows',
    decorations: 'Decorations',
    utilities: 'Utilities',
  };
  return Object.entries(labels).map(([cat, label]) => ({
    category: cat as BuildCategory,
    count: BUILDING_CATALOG.filter(p => p.category === cat).length,
    label,
  }));
}

/** Get a piece by ID */
export function getPieceById(id: string): BuildingPiece | undefined {
  return BUILDING_CATALOG.find(p => p.id === id);
}

/** Check if player can afford a piece */
export function canAfford(
  piece: BuildingPiece,
  inventory: { wood: number; stone: number; iron: number; gold: number },
): boolean {
  const c = piece.cost;
  if ((c.wood ?? 0) > inventory.wood) return false;
  if ((c.stone ?? 0) > inventory.stone) return false;
  if ((c.iron ?? 0) > inventory.iron) return false;
  if ((c.gold ?? 0) > inventory.gold) return false;
  return true;
}

/** Get pieces available at a given profession level */
export function getAvailablePieces(level: number, profession?: string): BuildingPiece[] {
  return BUILDING_CATALOG.filter(p => {
    if (p.requiredLevel > level) return false;
    if (p.requiredProfession && p.requiredProfession !== profession) return false;
    return true;
  });
}
